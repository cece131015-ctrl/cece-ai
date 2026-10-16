"use strict";

// Servicio HTTP para Cece AI: puente autenticado hacia el analizador estático de REA.
// Ejecutar en un servidor Node.js 22.19+, con npm y un workspace de análisis preparado.
// No expone un shell ni acepta comandos arbitrarios.
const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs/promises");
const { spawn } = require("node:child_process");

const PORT = Number(process.env.PORT || 4317);
const TOKEN = String(process.env.CECE_REA_TOKEN || "");
const ROOT = path.resolve(process.env.CECE_REA_WORKSPACE || path.join(process.cwd(), "rea-workspace"));
const ORIGIN = String(process.env.CECE_REA_ORIGIN || "*");
const MAX_BODY = 64 * 1024;
const TIMEOUT_MS = Math.min(300_000, Math.max(10_000, Number(process.env.CECE_REA_TIMEOUT_MS || 120_000)));

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": ORIGIN,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "Authorization, Content-Type",
    "vary": "Origin",
  });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body, "utf8") > MAX_BODY) {
        reject(Object.assign(new Error("Solicitud demasiado grande."), { status: 413 }));
        req.destroy();
      }
    });
    req.on("end", () => {
      try { resolve(JSON.parse(body || "{}")); }
      catch { reject(Object.assign(new Error("JSON no válido."), { status: 400 })); }
    });
    req.on("error", reject);
  });
}
function runRea(target) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.platform === "win32" ? "npx.cmd" : "npx", [
      "--yes", "rea-agents@latest", "analyze-javascript-application", target, "--json",
    ], { cwd: ROOT, shell: false, windowsHide: true, env: { ...process.env, CI: "1" } });
    let stdout = "", stderr = "";
    const timer = setTimeout(() => child.kill("SIGTERM"), TIMEOUT_MS);
    child.stdout.setEncoding("utf8").on("data", (s) => { stdout += s; if (stdout.length > 4_000_000) child.kill("SIGTERM"); });
    child.stderr.setEncoding("utf8").on("data", (s) => { stderr += s; if (stderr.length > 250_000) stderr = stderr.slice(-250_000); });
    child.on("error", (e) => { clearTimeout(timer); reject(e); });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (signal) return reject(Object.assign(new Error("REA superó el tiempo límite."), { status: 504 }));
      if (code !== 0) return reject(Object.assign(new Error(stderr.slice(-5000) || "REA terminó con error."), { status: 502 }));
      let result;
      try { result = JSON.parse(stdout); }
      catch { return reject(Object.assign(new Error("REA no devolvió JSON válido."), { status: 502 })); }
      resolve(result);
    });
  });
}
const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return json(res, 204, {});
  const url = new URL(req.url || "/", "http://localhost");
  if (req.method === "GET" && url.pathname === "/health") {
    return json(res, 200, { ok: true, service: "cece-rea", engine: "rea-agents", auth: Boolean(TOKEN) });
  }
  if (req.method !== "POST" || url.pathname !== "/api/rea") {
    return json(res, 404, { error: "Ruta no encontrada." });
  }
  if (!TOKEN) return json(res, 503, { error: "Configura CECE_REA_TOKEN en el servidor antes de usar REA." });
  const auth = String(req.headers.authorization || "");
  if (auth !== "Bearer " + TOKEN) return json(res, 401, { error: "Token REA no válido." });
  try {
    const input = await readBody(req);
    if (typeof input.targetPath !== "string" || !input.targetPath.trim()) {
      return json(res, 400, { error: "Indica targetPath: una ruta relativa dentro del workspace del servidor." });
    }
    if (input.targetPath.includes("\\") || path.isAbsolute(input.targetPath) || input.targetPath.split("/").includes("..")) {
      return json(res, 400, { error: "La ruta debe ser relativa y no puede salir del workspace." });
    }
    const rootReal = await fs.realpath(ROOT).catch(() => null);
    if (!rootReal) return json(res, 503, { error: "El workspace configurado no existe en el servidor." });
    const target = path.resolve(rootReal, input.targetPath);
    if (target !== rootReal && !target.startsWith(rootReal + path.sep)) {
      return json(res, 400, { error: "Ruta fuera del workspace permitido." });
    }
    const targetReal = await fs.realpath(target).catch(() => null);
    if (!targetReal || (targetReal !== rootReal && !targetReal.startsWith(rootReal + path.sep))) {
      return json(res, 404, { error: "La carpeta no existe dentro del workspace autorizado o intenta salir de él mediante un enlace." });
    }
    const stat = await fs.stat(targetReal).catch(() => null);
    if (!stat || !stat.isDirectory()) {
      return json(res, 404, { error: "No existe una carpeta de aplicación con esa ruta en el workspace del servidor." });
    }
    const result = await runRea(targetReal);
    return json(res, 200, { ok: true, engine: "rea-agents", targetPath: input.targetPath, result });
  } catch (e) {
    return json(res, e.status || 500, { error: e.message || "Error ejecutando REA." });
  }
});
server.listen(PORT, "0.0.0.0", () => {
  if (!TOKEN) console.error("ERROR: define CECE_REA_TOKEN antes de exponer el servicio.");
  console.log("Cece REA escuchando en :" + PORT + " | workspace=" + ROOT);
});
