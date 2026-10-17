"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");
const { spawn } = require("node:child_process");

async function puertoLibre() {
  const s = net.createServer();
  await new Promise((resolve, reject) => s.listen(0, "127.0.0.1", resolve).once("error", reject));
  const port = s.address().port;
  await new Promise((resolve) => s.close(resolve));
  return port;
}
async function main() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cece-rea-test-"));
  fs.mkdirSync(path.join(root, "proyectos", "demo"), { recursive: true });
  const port = await puertoLibre();
  const token = "test-token-only";
  const child = spawn(process.execPath, [path.join(__dirname, "..", "integraciones", "rea", "servidor.mjs")], {
    env: { ...process.env, PORT: String(port), CECE_REA_TOKEN: token, CECE_REA_WORKSPACE: root, CECE_REA_ORIGIN: "http://127.0.0.1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let logs = "";
  child.stdout.on("data", (b) => { logs += b.toString(); });
  child.stderr.on("data", (b) => { logs += b.toString(); });
  const base = "http://127.0.0.1:" + port;
  async function request(pathname, body, auth = token) {
    const headers = { "content-type": "application/json" };
    if (auth) headers.authorization = "Bearer " + auth;
    const r = await fetch(base + pathname, { method: body === undefined ? "GET" : "POST", headers,
      ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }),
      signal: AbortSignal.timeout(3000) });
    return { status: r.status, data: await r.json().catch(() => ({})) };
  }
  try {
    let healthy = false;
    for (let i = 0; i < 40; i++) {
      if (child.exitCode !== null) throw new Error("El servidor REA terminó pronto: " + logs);
      try {
        const r = await request("/health");
        if (r.status === 200) { healthy = true; break; }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.equal(healthy, true, "el servidor no respondió a /health");
    const health = await request("/health");
    assert.equal(health.data.service, "cece-rea");
    assert.equal(health.data.auth, true);
    assert.equal((await request("/api/rea", {}, "incorrecto")).status, 401);
    const missing = await request("/api/rea", {});
    assert.equal(missing.status, 400);
    assert.match(missing.data.error, /targetPath/);
    assert.equal((await request("/api/rea", { targetPath: "../fuera" })).status, 400);
    assert.equal((await request("/api/rea", { targetPath: "no-existe" })).status, 404);
    assert.equal((await request("/api/rea", "{no-json")).status, 400);
    const privateUrl = await request("/api/rea/clone", { url: "http://127.0.0.1/admin" });
    assert.equal(privateUrl.status, 400);
    console.log("✅ pruebas HTTP REA: health, token, cuerpo, rutas y protección SSRF");
  } finally {
    child.kill("SIGTERM");
    await new Promise((resolve) => {
      if (child.exitCode !== null) return resolve();
      child.once("exit", resolve);
      setTimeout(resolve, 1500);
    });
    fs.rmSync(root, { recursive: true, force: true });
  }
}
main().catch((error) => { console.error("❌ pruebas HTTP REA:", error); process.exitCode = 1; });
