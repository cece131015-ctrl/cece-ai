import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
"use strict";

// Servicio HTTP para Cece AI: puente autenticado hacia REA rea-agents 6.5.0 (última versión publicada verificada el 17-10-2026).
// Ejecutar en un servidor Node.js 22.19+, con npm y un workspace de análisis preparado.
// No expone un shell ni acepta comandos arbitrarios.
const http = require("node:http");
const path = require("node:path");
const dns = require("node:dns/promises");
const net = require("node:net");
const crypto = require("node:crypto");
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

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const a = ip.split(".").map(Number), x = a[0], y = a[1];
    return x === 0 || x === 10 || x === 127 || x >= 224 || (x === 169 && y === 254) ||
      (x === 172 && y >= 16 && y <= 31) || (x === 192 && y === 168) ||
      (x === 100 && y >= 64 && y <= 127) || (x === 198 && (y === 18 || y === 19));
  }
  const x = ip.toLowerCase();
  return !net.isIPv6(ip) || x === "::" || x === "::1" || x.startsWith("fc") ||
    x.startsWith("fd") || /^fe[89ab]/.test(x) || x.startsWith("ff");
}
async function validatePublicUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { throw Object.assign(new Error("URL no válida."), { status: 400 }); }
  if (!["http:", "https:"].includes(u.protocol) || u.username || u.password ||
      !u.hostname || u.hostname === "localhost" || u.hostname.endsWith(".localhost") || u.hostname.endsWith(".local"))
    throw Object.assign(new Error("Usa una URL HTTP/HTTPS pública sin credenciales."), { status: 400 });
  const ips = net.isIP(u.hostname) ? [{ address: u.hostname }] : await dns.lookup(u.hostname, { all: true }).catch(() => []);
  if (!ips.length || ips.some(x => isPrivateIp(x.address)))
    throw Object.assign(new Error("El dominio no resuelve a una dirección pública segura."), { status: 400 });
  return u;
}
async function clonePublicWebsite(raw) {
  let current = raw, page;
  for (let i = 0; i < 4; i++) {
    const u = await validatePublicUrl(current);
    const r = await fetch(u, { redirect: "manual", signal: AbortSignal.timeout(20000),
      headers: { "user-agent": "CeceAI-REA-WebClone/1.0", accept: "text/html,application/xhtml+xml" } });
    if ([301,302,303,307,308].includes(r.status)) {
      const loc = r.headers.get("location");
      if (!loc) throw Object.assign(new Error("Redirección sin destino."), { status: 502 });
      current = new URL(loc, u).href; continue;
    }
    if (!r.ok) throw Object.assign(new Error("La web respondió HTTP " + r.status), { status: 502 });
    const type = (r.headers.get("content-type") || "").toLowerCase();
    if (!type.includes("text/html") && !type.includes("application/xhtml+xml"))
      throw Object.assign(new Error("La URL no devolvió HTML."), { status: 415 });
    const data = Buffer.from(await r.arrayBuffer());
    if (data.length > 3 * 1024 * 1024) throw Object.assign(new Error("La página supera 3 MB."), { status: 413 });
    page = { url: u.href, html: data.toString("utf8"), bytes: data.length }; break;
  }
  if (!page) throw Object.assign(new Error("Demasiadas redirecciones."), { status: 502 });
  const host = new URL(page.url).hostname.toLowerCase().replace(/[^a-z0-9.-]/g, "-").slice(0, 80);
  const folder = host + "-" + new Date().toISOString().replace(/[:.]/g, "-") + "-" + crypto.randomBytes(3).toString("hex");
  const dir = path.join(ROOT, "clones", folder);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "index.html"), page.html.replace(/<base\b[^>]*>/gi, ""), "utf8");
  await fs.writeFile(path.join(dir, "README.txt"),
    "Captura HTML de Cece AI / REA\nURL: " + page.url + "\nCreada: " + new Date().toISOString() +
    "\nBytes HTML: " + page.bytes + "\n\nConserva referencias a recursos remotos. No copia APIs, autenticación ni backend. Comprueba los derechos antes de publicar.\n", "utf8");
  return { ok: true, mode: "html-snapshot", sourceUrl: page.url,
    outputPath: path.relative(ROOT, dir).split(path.sep).join("/"),
    entryFile: path.relative(ROOT, path.join(dir, "index.html")).split(path.sep).join("/"),
    bytes: page.bytes, note: "Captura HTML guardada. No es un clon funcional completo y puede depender de recursos remotos." };
}

function runRea(target) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.platform === "win32" ? "npx.cmd" : "npx", [
      "--yes", "rea-agents@6.5.0", "analyze-javascript-application", target, "--json",
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
    return json(res, 200, { ok: true, service: "cece-rea", engine: "rea-agents", webClone: true, auth: Boolean(TOKEN) });
  }
  if (req.method !== "POST" || !["/api/rea", "/api/rea/clone"].includes(url.pathname)) {
    return json(res, 404, { error: "Ruta no encontrada." });
  }
  if (!TOKEN) return json(res, 503, { error: "Configura CECE_REA_TOKEN en el servidor antes de usar REA." });
  const auth = String(req.headers.authorization || "");
  if (auth !== "Bearer " + TOKEN) return json(res, 401, { error: "Token REA no válido." });
  try {
    const input = await readBody(req);
    if (url.pathname === "/api/rea/clone" || input.mode === "clone") {
      if (typeof input.url !== "string" || !input.url.trim()) return json(res, 400, { error: "Indica la URL pública en el campo url." });
      return json(res, 200, await clonePublicWebsite(input.url.trim()));
    }
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
