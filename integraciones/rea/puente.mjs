#!/usr/bin/env node
"use strict";

/**
 * Puente local Cece AI ↔ REA MCP.
 *
 * Uso:
 *   node integraciones/rea/puente.mjs
 *   node integraciones/rea/puente.mjs --port 4317
 *
 * Requisitos: Node.js compatible con REA y npm/npx disponibles.
 * El proceso REA solo se inicia al solicitar /tools o /call.
 * Este archivo no instala paquetes ni cambia configuraciones.
 */

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

const HOST = "127.0.0.1";
const PORT_ARG = process.argv.findIndex((arg) => arg === "--port");
const PORT = PORT_ARG >= 0 ? Number(process.argv[PORT_ARG + 1]) : 4317;
const MAX_BODY = 1024 * 1024;
const STARTUP_TIMEOUT_MS = 45_000;
const REQUEST_TIMEOUT_MS = 120_000;
const TOKEN = randomBytes(32).toString("hex");

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  console.error("Puerto inválido. Usa --port entre 1 y 65535.");
  process.exit(2);
}

let child = null;
let buffer = "";
let nextId = 1;
let initialized = false;
let starting = null;
let closing = false;
const pending = new Map();
let lastStderr = "";

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length === right.length && timingSafeEqual(left, right);
}

function mcpError(message, code = "REA_MCP_ERROR") {
  const error = new Error(message);
  error.code = code;
  return error;
}

function rejectPending(error) {
  for (const [, item] of pending) {
    clearTimeout(item.timer);
    item.reject(error);
  }
  pending.clear();
}

function rpc(method, params = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  if (!child || child.killed || !child.stdin.writable) {
    return Promise.reject(mcpError("El proceso MCP de REA no está disponible.", "REA_NOT_RUNNING"));
  }
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(mcpError("Tiempo de espera agotado en REA: " + method, "REA_TIMEOUT"));
    }, timeoutMs);
    pending.set(id, { resolve, reject, timer });
    const message = JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n";
    child.stdin.write(message, (error) => {
      if (!error) return;
      const item = pending.get(id);
      if (!item) return;
      pending.delete(id);
      clearTimeout(item.timer);
      reject(error);
    });
  });
}

function handleLine(line) {
  if (!line.trim()) return;
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    lastStderr = "REA envió una línea que no era JSON-RPC válido.";
    return;
  }
  if (message.id === undefined || message.id === null) return;
  const item = pending.get(message.id);
  if (!item) return;
  pending.delete(message.id);
  clearTimeout(item.timer);
  if (message.error) {
    const error = mcpError(message.error.message || "Error JSON-RPC de REA", "REA_RPC_ERROR");
    error.data = message.error.data;
    item.reject(error);
  } else {
    item.resolve(message.result);
  }
}

function startMcp() {
  if (initialized && child && !child.killed) return Promise.resolve();
  if (starting) return starting;
  starting = (async () => {
    const command = process.platform === "win32" ? "npx.cmd" : "npx";
    child = spawn(command, ["--yes", "rea-agents@latest", "mcp"], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
      env: { ...process.env, NO_COLOR: "1" },
      shell: process.platform === "win32",
    });
    buffer = "";
    lastStderr = "";
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      buffer += chunk;
      if (buffer.length > 12 * 1024 * 1024) {
        const error = mcpError("La salida de REA superó el límite de seguridad.", "REA_BUFFER_LIMIT");
        rejectPending(error);
        child?.kill();
        return;
      }
      let newline;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 1);
        handleLine(line);
      }
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      lastStderr = (lastStderr + chunk).slice(-4000);
      // La salida diagnóstica se conserva acotada y nunca se mezcla con el canal JSON-RPC.
    });
    child.on("error", (error) => {
      initialized = false;
      rejectPending(mcpError("No se pudo iniciar REA. Comprueba Node.js, npm y npx: " + error.message, "REA_SPAWN_FAILED"));
    });
    child.on("exit", (code, signal) => {
      initialized = false;
      const error = mcpError("El proceso REA terminó (código " + code + ", señal " + signal + ")." +
        (lastStderr ? " Diagnóstico: " + lastStderr.trim().slice(-1500) : ""), "REA_EXITED");
      rejectPending(error);
      child = null;
    });

    const deadline = Date.now() + STARTUP_TIMEOUT_MS;
    while (!child || child.exitCode !== null) {
      if (Date.now() > deadline) throw mcpError("No se pudo iniciar REA.", "REA_START_FAILED");
      await delay(100);
    }
    await rpc("initialize", {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "cece-ai-rea-bridge", version: "1.0.0" },
    }, STARTUP_TIMEOUT_MS);
    // MCP requiere esta notificación después de completar initialize.
    child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
    initialized = true;
  })().catch((error) => {
    initialized = false;
    throw error;
  }).finally(() => {
    starting = null;
  });
  return starting;
}

function sendJson(res, status, data, extraHeaders = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...extraHeaders,
  });
  res.end(body);
}

function corsHeaders(req) {
  const origin = req.headers.origin;
  // No se permiten orígenes web remotos. El token sigue siendo obligatorio.
  if (origin && origin !== "null" && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
    return null;
  }
  return {
    "access-control-allow-origin": origin || "null",
    "vary": "Origin",
    "access-control-allow-headers": "Authorization, Content-Type",
    "access-control-allow-methods": "GET, POST, OPTIONS",
  };
}

function authorized(req) {
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || "");
  return !!match && safeEqual(match[1], TOKEN);
}

async function readJson(req) {
  const chunks = [];
  let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > MAX_BODY) throw mcpError("La solicitud supera 1 MiB.", "BODY_TOO_LARGE");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw mcpError("El cuerpo debe ser JSON válido.", "INVALID_JSON");
  }
}

async function ensureReady() {
  await startMcp();
}

const server = createServer(async (req, res) => {
  const headers = corsHeaders(req);
  if (!headers) return sendJson(res, 403, { ok: false, error: "Origen no permitido." });
  if (req.method === "OPTIONS") {
    res.writeHead(204, headers);
    return res.end();
  }
  const url = new URL(req.url || "/", "http://" + HOST + ":" + PORT);
  if (!["/health", "/tools", "/call"].includes(url.pathname)) {
    return sendJson(res, 404, { ok: false, error: "Ruta no encontrada." }, headers);
  }
  if (url.pathname !== "/health" && !authorized(req)) {
    return sendJson(res, 401, { ok: false, error: "Token local ausente o inválido." }, headers);
  }

  try {
    if (url.pathname === "/health" && req.method === "GET") {
      return sendJson(res, 200, {
        ok: true,
        bridge: "cece-ai-rea",
        version: "1.0.0",
        mcpConnected: !!initialized && !!child && !child.killed,
        authRequired: true,
      }, headers);
    }
    if (url.pathname === "/tools" && req.method === "GET") {
      await ensureReady();
      const result = await rpc("tools/list", {});
      return sendJson(res, 200, { ok: true, tools: result.tools || [], nextCursor: result.nextCursor || null }, headers);
    }
    if (url.pathname === "/call" && req.method === "POST") {
      const body = await readJson(req);
      if (!body || typeof body.name !== "string" || !/^[A-Za-z0-9_.:-]{1,160}$/.test(body.name)) {
        return sendJson(res, 400, { ok: false, error: "Falta un nombre de herramienta válido en name." }, headers);
      }
      if (body.arguments !== undefined && (!body.arguments || typeof body.arguments !== "object" || Array.isArray(body.arguments))) {
        return sendJson(res, 400, { ok: false, error: "arguments debe ser un objeto JSON." }, headers);
      }
      await ensureReady();
      const catalog = await rpc("tools/list", {});
      const tool = (catalog.tools || []).find((entry) => entry.name === body.name);
      if (!tool) return sendJson(res, 404, { ok: false, error: "REA no anuncia esa herramienta.", availableTools: (catalog.tools || []).map((entry) => entry.name) }, headers);
      const result = await rpc("tools/call", { name: body.name, arguments: body.arguments || {} });
      return sendJson(res, result?.isError ? 502 : 200, { ok: !result?.isError, result }, headers);
    }
    return sendJson(res, 405, { ok: false, error: "Método HTTP no permitido." }, headers);
  } catch (error) {
    const status = error.code === "INVALID_JSON" || error.code === "BODY_TOO_LARGE" ? 400 : 502;
    return sendJson(res, status, {
      ok: false,
      error: error.message || "Fallo inesperado del puente.",
      code: error.code || "BRIDGE_ERROR",
    }, headers);
  }
});

server.on("error", (error) => {
  console.error("No se pudo iniciar el puente:", error.message);
  process.exitCode = 1;
});

server.listen(PORT, HOST, () => {
  console.log("Cece AI ↔ REA: puente local listo en http://" + HOST + ":" + PORT);
  console.log("Token de esta sesión (no lo publiques): " + TOKEN);
  console.log("Comprobación: GET /health | herramientas: GET /tools | ejecución: POST /call");
  console.log("Usa Authorization: Bearer <token> en /tools y /call.");
  console.log("El servidor MCP de REA se iniciará solo al solicitar herramientas o ejecutar una.");
});

function shutdown() {
  if (closing) return;
  closing = true;
  server.close();
  rejectPending(mcpError("El puente se está cerrando.", "BRIDGE_CLOSED"));
  if (child && !child.killed) child.kill();
  setTimeout(() => process.exit(0), 250).unref();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
