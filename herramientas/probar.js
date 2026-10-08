#!/usr/bin/env node
/* Pruebas de cece-ai.html en un Chromium sin ventana (Playwright), con las IAs simuladas: ninguna petición sale a
   internet ni se gasta nada. Uso: node herramientas/probar.js [archivo.html] [filtro]
   (Necesita Playwright: npm i -D playwright && npx playwright install chromium) */
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const { RUTAS } = require("./comun");

function cargarPlaywright() {
  try {
    return require("playwright");
  } catch (e) {
    for (const p of ["/opt/node22/lib/node_modules/playwright"]) if (fs.existsSync(p)) return require(p);
    throw new Error("Falta Playwright: npm i -D playwright && npx playwright install chromium");
  }
}

const ORIGEN = path.resolve(process.argv[2] || RUTAS.html);
const FILTRO = new RegExp(process.argv[3] || "", "i");
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "cece-prueba-"));
const HTML = fs.readFileSync(ORIGEN, "utf8");

// Copia con claves de prueba en el bloque de configuración (solo las de los motores que se piden)
function conClaves(claves) {
  let h = HTML;
  for (const [k, v] of Object.entries(claves)) {
    const re = new RegExp(`(\\n\\s*${k}:\\s*)""`);
    if (!re.test(h)) throw new Error("No encuentro la clave " + k);
    h = h.replace(re, (_, a) => `${a}${JSON.stringify(v)}`);
  }
  const f = path.join(TMP, `cece-${Object.keys(claves).join("-") || "sin"}.html`);
  fs.writeFileSync(f, h);
  return f;
}

// ---------- IAs simuladas ----------
const sse = (eventos) => eventos.map((e) => (typeof e === "string" ? e : `data: ${JSON.stringify(e)}\n\n`)).join("");
function respuestaOpenAI(texto, { razon = "" } = {}) {
  const trozos = texto.match(/[\s\S]{1,7}/g) || [""];
  return sse([
    ...(razon ? [{ choices: [{ index: 0, delta: { reasoning_content: razon } }] }] : []),
    ...trozos.map((t) => ({ choices: [{ index: 0, delta: { content: t } }] })),
    { choices: [{ index: 0, delta: {}, finish_reason: "stop" }] },
    { choices: [], usage: { prompt_tokens: 12, completion_tokens: 34 } },
    "data: [DONE]\n\n",
  ]);
}
function respuestaClaude(texto) {
  return sse([
    { type: "message_start", message: { usage: { input_tokens: 11 } } },
    { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
    ...(texto.match(/[\s\S]{1,9}/g) || []).map((t) => ({ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: t } })),
    { type: "content_block_stop", index: 0 },
    { type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 21 } },
    { type: "message_stop" },
  ]);
}

async function nuevaPagina(navegador, archivo, { ia = {}, almacen = null, ancho = 1280 } = {}) {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: 860 }, acceptDownloads: true });
  const pagina = await ctx.newPage();
  const errores = [];
  pagina.on("pageerror", (e) => errores.push("pageerror: " + e.message));
  // (los fallos de red que simulan las pruebas también salen en la consola: esos no cuentan)
  pagina.on("console", (m) => m.type() === "error" && !/^Failed to load resource/.test(m.text()) && errores.push("console: " + m.text()));
  const peticiones = [];
  await ctx.route(/^https?:\/\//, async (ruta) => {
    const req = ruta.request();
    const url = req.url();
    if (/^http:\/\/127\.0\.0\.1:/.test(url)) return ruta.continue(); // servidores de prueba de este equipo
    let cuerpo = null;
    try {
      cuerpo = req.postDataJSON();
    } catch (e) {}
    peticiones.push({ url, metodo: req.method(), cuerpo, t: Date.now() });
    const h = Object.entries(ia).find(([patron]) => url.includes(patron));
    if (!h) return ruta.abort("internetdisconnected");
    const r = await h[1]({ url, cuerpo, req });
    if (!r) return ruta.abort("connectionrefused");
    return ruta.fulfill({
      status: r.status || 200,
      headers: { "content-type": r.tipo || "text/event-stream", "access-control-allow-origin": "*" },
      body: r.cuerpo,
    });
  });
  await pagina.goto("file://" + archivo);
  if (almacen) {
    await pagina.evaluate((a) => {
      localStorage.clear();
      for (const [k, v] of Object.entries(a)) localStorage.setItem(k, JSON.stringify(v));
    }, almacen);
    await pagina.reload();
  }
  await pagina.waitForSelector("#userInput");
  await pagina.waitForTimeout(300);
  return { ctx, pagina, errores, peticiones };
}

// Envía y recuerda cuántas respuestas había: ultimaRespuesta() espera a una nueva
async function escribirYEnviar(p, texto) {
  p._respuestas = await p.locator(".bot-msg").count();
  await p.fill("#userInput", texto);
  await p.press("#userInput", "Enter");
}
// Espera a que haya una respuesta nueva con su pie (hora, vía…) y devuelve su texto/HTML
async function ultimaRespuesta(p, ms = 15000) {
  await p.waitForFunction(
    (antes) => {
      const ms = document.querySelectorAll(".bot-msg"),
        m = ms[ms.length - 1];
      return ms.length > antes && m.querySelector(".msg-meta span") && !m.querySelector(".bubble.thinking") && !m.querySelector(".cursor");
    },
    p._respuestas || 0,
    { timeout: ms },
  );
  return p.evaluate(() => {
    const m = [...document.querySelectorAll(".bot-msg")].pop();
    return {
      texto: m.querySelector(".bubble").innerText,
      html: m.querySelector(".bubble").innerHTML,
      pie: m.querySelector(".msg-meta").innerText,
    };
  });
}

// ---------- pruebas ----------
const PRUEBAS = [];
const prueba = (nombre, f) => PRUEBAS.push({ nombre, f });
const corto = (v) => {
  const t = JSON.stringify(v);
  return t && t.length > 300 ? t.slice(0, 300) + `… (${t.length} caracteres)` : t;
};
const igual = (a, b, msg) => {
  if (a !== b) throw new Error(`${msg || "distinto"}: ${corto(a)} ≠ ${corto(b)}`);
};
const cierto = (v, msg) => {
  if (!v) throw new Error(msg || "falso");
};

prueba("abre sin errores y sin claves", async (nav) => {
  const { pagina, errores, ctx } = await nuevaPagina(nav, conClaves({}));
  cierto(await pagina.isVisible(".bot-msg"), "falta el saludo");
  igual(errores.length, 0, "errores: " + errores.join(" | "));
  await ctx.close();
});

prueba("responde con Cece Turbo (stream, Markdown y pie)", async (nav) => {
  const md = "# Título\n\nHola **mundo** y `código`.\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n```js\nconsole.log(1)\n```";
  const { pagina, errores, peticiones, ctx } = await nuevaPagina(nav, conClaves({ turbo: "sk-prueba" }), {
    ia: { "api.deepseek.com": () => ({ cuerpo: respuestaOpenAI(md, { razon: "pienso…" }) }) },
  });
  await escribirYEnviar(pagina, "hola");
  const r = await ultimaRespuesta(pagina);
  cierto(r.html.includes("<h1>Título</h1>"), "sin título");
  cierto(r.html.includes("<strong>mundo</strong>"), "sin negrita");
  cierto(r.html.includes("<table>"), "sin tabla");
  cierto(r.html.includes('class="code-wrap"'), "sin bloque de código");
  cierto(/vía Motor Turbo/.test(r.pie), "pie sin «vía»: " + r.pie);
  const p = peticiones.find((x) => x.url.includes("/chat/completions"));
  cierto(p && p.cuerpo && p.cuerpo.model === "deepseek-flash", "modelo pedido");
  igual(errores.length, 0, "errores: " + errores.join(" | "));
  await ctx.close();
});

prueba("el Markdown de la IA no puede meter HTML (XSS)", async (nav) => {
  const malo =
    '<img src=x onerror="window.__xss=1"> [clic](javascript:window.__xss=2) <script>window.__xss=3</script> ' +
    '[a](https://x.y/"onmouseover="window.__xss=4) ![i](data:text/html,hola) <https://ok.example/"><b>x</b>';
  const { pagina, ctx } = await nuevaPagina(nav, conClaves({ turbo: "sk-prueba" }), {
    ia: { "api.deepseek.com": () => ({ cuerpo: respuestaOpenAI(malo) }) },
  });
  await escribirYEnviar(pagina, "hola");
  const r = await ultimaRespuesta(pagina);
  await pagina.hover(".bot-msg:last-child .bubble a").catch(() => {});
  igual(await pagina.evaluate(() => window.__xss), undefined, "se ejecutó código");
  cierto(!/<img|<script|<b>|javascript:/i.test(r.html.replace(/&lt;[^&]*&gt;/g, "")), "HTML sin escapar: " + r.html);
  await ctx.close();
});

prueba("plugins integrados (sin IA)", async (nav) => {
  const { pagina, errores, peticiones, ctx } = await nuevaPagina(nav, conClaves({}));
  const casos = [
    ["/calc 2+2*3", /= 8/],
    ["/calc 15% de 80", /= 12/],
    ["/calc raiz(2,25)", /= 1,5/],
    ["/calc round(2,567; 2)", /= 2,57/],
    ["/convertir 10 km a millas", /6,21/],
    ["/convertir 100 c a f", /212/],
    ["/romano 2026", /MMXXVI/],
    ["/romano mmxxvi", /2026/],
    ["/base64 hola", /aG9sYQ==/],
    ["/base64 d aG9sYQ==", /hola/],
    ['/json {"a":1}', /JSON válido/],
    ["/color #ff3f9e", /rgb\(255, 63, 158\)/],
    ["/contar uno dos tres", /Palabras\s*3/],
    ["/hash abc", /ba7816bf/],
    ["/uri a b", /a%20b/],
  ];
  for (const [entrada, esperado] of casos) {
    await escribirYEnviar(pagina, entrada);
    const r = await ultimaRespuesta(pagina);
    cierto(esperado.test(r.texto), `${entrada} → ${r.texto}`);
  }
  igual(peticiones.length, 0, "los plugins no deben salir a internet");
  igual(errores.length, 0, "errores: " + errores.join(" | "));
  await ctx.close();
});

prueba("plugin propio en JS: aislado, sin red y con tiempo máximo", async (nav) => {
  const { pagina, ctx } = await nuevaPagina(nav, conClaves({}), {
    almacen: {
      cece_plugins: [
        { id: "alreves", tipo: "js", cuerpo: 'return texto.split("").reverse().join("")' },
        { id: "espia", tipo: "js", cuerpo: "try { return String(typeof parent.document) } catch (e) { return 'aislado' }" },
        { id: "red", tipo: "js", cuerpo: "return typeof fetch + '/' + typeof XMLHttpRequest" },
        { id: "bucle", tipo: "js", cuerpo: "for(;;){}" },
      ],
    },
  });
  await escribirYEnviar(pagina, "/alreves hola");
  igual((await ultimaRespuesta(pagina)).texto.trim(), "aloh");
  await escribirYEnviar(pagina, "/espia x");
  igual((await ultimaRespuesta(pagina)).texto.trim(), "aislado", "el plugin ve la página");
  await escribirYEnviar(pagina, "/red x");
  igual((await ultimaRespuesta(pagina)).texto.trim(), "undefined/undefined");
  await escribirYEnviar(pagina, "/bucle x");
  cierto(/tardó más/.test((await ultimaRespuesta(pagina, 8000)).texto), "el bucle no se cortó");
  await escribirYEnviar(pagina, "/alreves otra vez");
  igual((await ultimaRespuesta(pagina)).texto.trim(), "zev arto", "tras cortar un bucle, el entorno se rehace");
  await ctx.close();
});

prueba("el tema elegido se mantiene al recargar (también con ajustes antiguos)", async (nav) => {
  const { pagina, ctx } = await nuevaPagina(nav, conClaves({}), { almacen: { cece_ajustes: { tema: "oscuro", versionTema: 1 } } });
  igual(await pagina.evaluate(() => document.documentElement.dataset.tema), "neon", "migración a neón");
  await pagina.click("#settingsBtn");
  await pagina.click('.tema-opt[data-tema="oscuro"]');
  igual(await pagina.evaluate(() => document.documentElement.dataset.tema), "oscuro");
  await pagina.reload();
  await pagina.waitForSelector("#userInput");
  igual(await pagina.evaluate(() => document.documentElement.dataset.tema), "oscuro", "tras recargar");
  await ctx.close();
});

prueba("Cece Pro: varios motores a la vez y fusión", async (nav) => {
  const { pagina, errores, ctx } = await nuevaPagina(nav, conClaves({ enterprise: "sk-a", astra: "sk-b", max: "sk-c", turbo: "sk-d" }), {
    almacen: { cece_ajustes: { modelo: "cece-pro", relevo: false, fusion: true } },
    ia: {
      "api.anthropic.com": () => ({ cuerpo: respuestaClaude("Respuesta de Enterprise.") }),
      "api.moonshot.ai": ({ url }) => (url.includes("/chat/") ? { cuerpo: respuestaOpenAI("Respuesta de Max.") } : null),
      "api.openai.com": () => ({ status: 500, tipo: "application/json", cuerpo: '{"error":{"message":"caído"}}' }),
      "api.deepseek.com": () => ({ cuerpo: respuestaOpenAI("Respuesta de Turbo.") }),
    },
  });
  await escribirYEnviar(pagina, "hola");
  const r = await ultimaRespuesta(pagina, 30000);
  cierto(/Respuesta de/.test(r.texto), "sin respuesta final: " + r.texto);
  cierto(/Cece Pro/.test(r.pie), "pie: " + r.pie);
  igual(errores.length, 0, "errores: " + errores.join(" | "));
  await ctx.close();
});

prueba("si un motor falla, responde el siguiente y se avisa", async (nav) => {
  const { pagina, ctx } = await nuevaPagina(nav, conClaves({ turbo: "sk-a", max: "sk-b" }), {
    ia: {
      "api.deepseek.com": () => ({ status: 401, tipo: "application/json", cuerpo: '{"error":{"message":"Invalid API key"}}' }),
      "api.moonshot.ai": ({ url }) => (url.includes("/chat/") ? { cuerpo: respuestaOpenAI("Te respondo yo.") } : null),
    },
  });
  await escribirYEnviar(pagina, "hola");
  const r = await ultimaRespuesta(pagina);
  cierto(/Te respondo yo/.test(r.texto), r.texto);
  cierto(/clave no válida/.test(r.pie) && /Motor Max/.test(r.pie), "pie: " + r.pie);
  await ctx.close();
});

prueba("guardar, buscar y volver a abrir una conversación", async (nav) => {
  const { pagina, ctx } = await nuevaPagina(nav, conClaves({ turbo: "sk" }), {
    ia: { "api.deepseek.com": () => ({ cuerpo: respuestaOpenAI("Vale, apuntado.") }) },
  });
  await escribirYEnviar(pagina, "receta de tortilla");
  await ultimaRespuesta(pagina);
  await escribirYEnviar(pagina, "/guardar");
  await pagina.click("#clearBtn");
  await pagina.click("#settingsBtn");
  await pagina.fill("#buscarConv", "tortilla");
  await pagina.click("#convList .conv-load");
  await pagina.waitForFunction(() => document.querySelectorAll(".msg").length >= 2);
  cierto(/Vale, apuntado/.test(await pagina.innerText("#messages")), "no se recuperó");
  await ctx.close();
});

prueba("cifrar las claves con contraseña y abrir la copia protegida", async (nav) => {
  const { pagina, ctx } = await nuevaPagina(nav, conClaves({ turbo: "sk-secreta-123" }));
  await pagina.click("#settingsBtn");
  await pagina.click("#segCifrar");
  await pagina.fill("#cifrarPass", "una frase bastante larga 2026");
  await pagina.fill("#cifrarPass2", "una frase bastante larga 2026");
  await pagina.uncheck("#cifrarRecordar");
  const [descarga] = await Promise.all([
    pagina.waitForEvent("download", { timeout: 20000 }).catch(async (e) => {
      const motivo = await pagina.evaluate(() => [
        document.getElementById("cifrarError").textContent,
        document.getElementById("cifrarModal").className,
        document.getElementById("cifrarOk").disabled,
      ]);
      throw new Error("no hubo descarga: " + JSON.stringify(motivo));
    }),
    pagina.click("#cifrarOk"),
  ]);
  const protegido = path.join(TMP, "protegido.html");
  await descarga.saveAs(protegido);
  const texto = fs.readFileSync(protegido, "utf8");
  cierto(!texto.includes("sk-secreta-123"), "la clave sigue a la vista en la copia");
  cierto(/const CECE_BOVEDA = "cecez?1\$/.test(texto), "sin bóveda cifrada");
  const b = await nuevaPagina(nav, protegido, {
    ia: { "api.deepseek.com": () => ({ cuerpo: respuestaOpenAI("Desbloqueado y funcionando.") }) },
  });
  await b.pagina.waitForSelector("#bovedaOverlay:not([hidden])");
  await b.pagina.fill("#bovedaPass", "otra");
  await b.pagina.click("#bovedaEntrar");
  await b.pagina.waitForFunction(() => document.getElementById("bovedaError").textContent.length > 0);
  await b.pagina.fill("#bovedaPass", "una frase bastante larga 2026");
  await b.pagina.click("#bovedaEntrar");
  await b.pagina.waitForSelector("#bovedaOverlay", { state: "hidden", timeout: 20000 });
  await escribirYEnviar(b.pagina, "hola");
  cierto(/Desbloqueado y funcionando/.test((await ultimaRespuesta(b.pagina)).texto));
  await b.ctx.close();
  await ctx.close();
});

prueba("menú de comandos con «/»", async (nav) => {
  const { pagina, ctx } = await nuevaPagina(nav, conClaves({}));
  await pagina.fill("#userInput", "");
  await pagina.type("#userInput", "/cal");
  await pagina.waitForSelector("#cmdMenu.open");
  cierto(/calc/.test(await pagina.innerText("#cmdMenu .cmd-item.on")), "no marca /calc");
  await pagina.keyboard.press("Tab");
  igual(await pagina.inputValue("#userInput"), "/calc ");
  await ctx.close();
});

prueba("sin conexión: el mensaje queda pendiente y sale al volver", async (nav) => {
  let caida = true;
  const { pagina, ctx } = await nuevaPagina(nav, conClaves({ turbo: "sk" }), {
    ia: { "api.deepseek.com": () => (caida ? null : { cuerpo: respuestaOpenAI("Ya hay internet.") }) },
  });
  await ctx.setOffline(true);
  await escribirYEnviar(pagina, "¿llega?");
  await pagina.waitForSelector(".pendiente-badge");
  caida = false;
  await ctx.setOffline(false);
  cierto(/Ya hay internet/.test((await ultimaRespuesta(pagina, 20000)).texto));
  await ctx.close();
});

prueba("adjuntar un archivo de texto y una imagen", async (nav) => {
  let cuerpo = null;
  const { pagina, ctx } = await nuevaPagina(nav, conClaves({ enterprise: "sk" }), {
    almacen: { cece_ajustes: { modelo: "cece-enterprise-plus" } },
    ia: {
      "api.anthropic.com": (r) => {
        cuerpo = r.cuerpo;
        return { cuerpo: respuestaClaude("Visto.") };
      },
    },
  });
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  await pagina.setInputFiles("#adjInput", [
    { name: "notas.txt", mimeType: "text/plain", buffer: Buffer.from("línea secreta 42") },
    { name: "punto.png", mimeType: "image/png", buffer: png },
  ]);
  await pagina.waitForFunction(() => document.querySelectorAll("#adjBandeja .adj-item:not(.adj-cargando)").length === 2);
  await escribirYEnviar(pagina, "mira esto");
  await ultimaRespuesta(pagina);
  const m = cuerpo.messages[cuerpo.messages.length - 1];
  const txt = JSON.stringify(m.content);
  cierto(/línea secreta 42/.test(txt), "no lleva el texto del archivo");
  cierto(
    m.content.some((p) => p.type === "image"),
    "no lleva la imagen",
  );
  await ctx.close();
});

// IA «local» de prueba que contesta despacio (un trozo cada 150 ms), para poder pararla a medias
function iaLenta() {
  const http = require("http");
  const estado = { cerrada: null, servidor: null };
  estado.servidor = http.createServer((req, res) => {
    const cors = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "access-control-allow-private-network": "true",
    };
    if (req.method === "OPTIONS") return res.writeHead(204, cors).end();
    if (req.url.endsWith("/models"))
      return res.writeHead(200, { ...cors, "content-type": "application/json" }).end('{"data":[{"id":"lento"}]}');
    res.writeHead(200, { ...cors, "content-type": "text/event-stream" });
    let n = 0;
    const t = setInterval(() => {
      res.write(`data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: `trozo ${++n}. ` } }] })}\n\n`);
      if (n >= 60) (clearInterval(t), res.end("data: [DONE]\n\n"));
    }, 150);
    res.on("close", () => (clearInterval(t), (estado.cerrada = estado.cerrada || Date.now())));
  });
  return new Promise((ok) =>
    estado.servidor.listen(0, "127.0.0.1", () => ok({ ...estado, puerto: estado.servidor.address().port, estado })),
  );
}

prueba("«Parar» corta la respuesta a medias (y la IA deja de generar)", async (nav) => {
  const ia = await iaLenta();
  const { pagina, errores, ctx } = await nuevaPagina(nav, conClaves({}), {
    almacen: {
      cece_ajustes: { modelo: "cece-local", localActivo: true, localModelo: "lento", localUrl: `http://127.0.0.1:${ia.puerto}/v1` },
    },
  });
  await escribirYEnviar(pagina, "cuéntame algo largo");
  await pagina.waitForFunction(() => /trozo 3\./.test(document.querySelector(".bot-msg:last-of-type .bubble").innerText), null, {
    timeout: 10000,
  });
  const t0 = Date.now();
  await pagina.click("#sendBtn"); // en modo «parar»
  const r = await ultimaRespuesta(pagina, 5000);
  await pagina.waitForTimeout(400);
  ia.servidor.close();
  cierto(ia.estado.cerrada && ia.estado.cerrada - t0 < 1500, "la conexión con la IA no se cortó");
  cierto(/detenido/.test(r.pie), "pie: " + r.pie);
  cierto(/trozo 3\./.test(r.texto) && !/trozo 30\./.test(r.texto), "texto: " + r.texto.slice(0, 80));
  igual(await pagina.getAttribute("#sendBtn", "aria-label"), "Enviar");
  igual(errores.length, 0, "errores: " + errores.join(" | "));
  await ctx.close();
});

prueba("un PDF grande no congela la página al enviarlo", async (nav) => {
  const { pagina, ctx } = await nuevaPagina(nav, conClaves({ enterprise: "sk" }), {
    almacen: { cece_ajustes: { modelo: "cece-enterprise-plus" } },
    ia: { "api.anthropic.com": () => ({ cuerpo: respuestaClaude("Leído.") }) },
  });
  const pdf = Buffer.concat([Buffer.from("%PDF-1.4\n"), require("crypto").randomBytes(12 << 20)]);
  await pagina.setInputFiles("#adjInput", [{ name: "grande.pdf", mimeType: "application/pdf", buffer: pdf }]);
  await pagina.waitForFunction(() => document.querySelectorAll("#adjBandeja .adj-item:not(.adj-cargando)").length === 1, null, {
    timeout: 20000,
  });
  // se mide dentro de la página: de pulsar «Enviar» a que sale la petición (sin lo que tarda el simulador en recibirla)
  await pagina.evaluate(() => {
    const f = window.fetch;
    window.fetch = function (u) {
      String(u).includes("/messages") && !window.__tFetch && (window.__tFetch = performance.now());
      return f.apply(this, arguments);
    };
  });
  await pagina.fill("#userInput", "resúmelo");
  pagina._respuestas = await pagina.locator(".bot-msg").count();
  await pagina.evaluate(() => ((window.__t0 = performance.now()), document.getElementById("sendBtn").click()));
  await ultimaRespuesta(pagina, 60000);
  const ms = Math.round(await pagina.evaluate(() => window.__tFetch - window.__t0));
  console.log(`   (de pulsar «Enviar» a salir la petición: ${ms} ms)`);
  cierto(ms < 1500, `tarda ${ms} ms en preparar la petición`);
  await ctx.close();
});

prueba("tras usar el micrófono, el cuadro de texto vuelve a explicar los comandos", async (nav) => {
  const { pagina, ctx } = await nuevaPagina(nav, conClaves({ turbo: "sk" }));
  const antes = await pagina.getAttribute("#userInput", "placeholder");
  await pagina.click("#micBtn");
  await pagina.waitForFunction(
    () =>
      !document.getElementById("micBtn").classList.contains("mic-on") || /escucho/i.test(document.getElementById("userInput").placeholder),
    null,
    { timeout: 5000 },
  );
  if (await pagina.evaluate(() => document.getElementById("micBtn").classList.contains("mic-on"))) await pagina.click("#micBtn");
  await pagina.waitForFunction(() => !document.getElementById("micBtn").classList.contains("mic-on"));
  igual(await pagina.getAttribute("#userInput", "placeholder"), antes);
  await ctx.close();
});

prueba("«Descargar CeceHub» da el servidor de fuente/cecehub-server.py", async (nav) => {
  const { pagina, ctx } = await nuevaPagina(nav, conClaves({}));
  const [d] = await Promise.all([pagina.waitForEvent("download"), pagina.evaluate(() => CeceHub.descargarPrograma())]);
  const f = path.join(TMP, "cecehub.py");
  await d.saveAs(f);
  igual(d.suggestedFilename(), "cecehub-server.py");
  igual(fs.readFileSync(f, "utf8"), fs.readFileSync(RUTAS.python, "utf8"), "el .py descargado no es el de fuente/");
  await ctx.close();
});

// ---------- ejecución ----------
(async () => {
  const { chromium } = cargarPlaywright();
  // (micrófono falso: el modo micrófono se puede probar sin hardware ni permisos)
  const nav = await chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
  let ok = 0;
  const fallos = [];
  for (const t of PRUEBAS.filter((t) => FILTRO.test(t.nombre))) {
    const t0 = Date.now();
    try {
      await t.f(nav);
      ok++;
      console.log(`✅ ${t.nombre} (${Date.now() - t0} ms)`);
    } catch (e) {
      fallos.push(t.nombre);
      console.log(`❌ ${t.nombre}\n   ${String(e.message).split("\n").slice(0, 4).join("\n   ")}`);
    }
  }
  await nav.close();
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log(`\n${ok} de ${ok + fallos.length} pruebas bien.`);
  process.exit(fallos.length ? 1 : 0);
})();
