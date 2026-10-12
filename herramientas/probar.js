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
  // la pantalla de bienvenida tapa la app ~2 s: los clics de las pruebas esperarían a que se fuera
  await pagina.evaluate(() => {
    const b = document.getElementById("cece-startup");
    b && b.remove();
  });
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
  // (la ventana pone el foco en la contraseña a los 30 ms: si se escribe antes, el texto acaba en otro campo)
  await pagina.waitForFunction(() => document.activeElement && document.activeElement.id === "cifrarPass");
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
  cierto(texto.includes("CECE_GITHUB_PANEL_V1") && texto.includes('id="cece-startup"'), "la copia protegida pierde el panel de GitHub");
  const b = await nuevaPagina(nav, protegido, {
    ia: { "api.deepseek.com": () => ({ cuerpo: respuestaOpenAI("Desbloqueado y funcionando.") }) },
  });
  await b.pagina.waitForSelector("#bovedaOverlay:not([hidden])");
  await b.pagina.waitForFunction(() => document.activeElement && document.activeElement.id === "bovedaPass");
  await b.pagina.fill("#bovedaPass", "otra");
  await b.pagina.click("#bovedaEntrar");
  await b.pagina.waitForFunction(() => document.getElementById("bovedaError").textContent.length > 0);
  await b.pagina.fill("#bovedaPass", "una frase bastante larga 2026");
  await b.pagina.click("#bovedaEntrar");
  await b.pagina.waitForSelector("#bovedaOverlay", { state: "hidden", timeout: 20000 });
  await escribirYEnviar(b.pagina, "hola");
  cierto(/Desbloqueado y funcionando/.test((await ultimaRespuesta(b.pagina)).texto));
  cierto(await b.pagina.$("#settingsBtn + #cece-github-open"), "la copia protegida no tiene el botón de GitHub");
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

prueba("CeceHub de verdad: la app lo encuentra y responde a través de él", async (nav) => {
  const { spawnSync, spawn } = require("child_process");
  if (spawnSync("python3", ["--version"]).status !== 0) return console.log("   (sin python3: no se prueba)");
  const http = require("http");
  // IA local simulada (como Ollama): lista de modelos y respuesta en streaming
  const ia = http.createServer((req, res) => {
    let cuerpo = "";
    req.on("data", (d) => (cuerpo += d));
    req.on("end", () => {
      if (req.url.endsWith("/models"))
        return res.writeHead(200, { "content-type": "application/json" }).end('{"data":[{"id":"llama-prueba"}]}');
      const pedido = JSON.parse(cuerpo || "{}");
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.end(respuestaOpenAI(`Hola desde ${pedido.model} por CeceHub.`));
    });
  });
  await new Promise((ok) => ia.listen(0, "127.0.0.1", ok));
  const libre = () =>
    new Promise((ok) => {
      const s = http.createServer().listen(0, "127.0.0.1", () => {
        const p = s.address().port;
        s.close(() => ok(p));
      });
    });
  const [puerto, puertoInternet] = [await libre(), await libre()];
  const hub = spawn(
    "python3",
    [
      RUTAS.python,
      "--port",
      String(puerto),
      "--internet-port",
      String(puertoInternet),
      "--no-discovery",
      "--config",
      path.join(TMP, "cecehub.json"),
      "--backend",
      `Prueba=http://127.0.0.1:${ia.address().port}/v1`,
    ],
    { stdio: "pipe" },
  );
  let salida = "";
  hub.stdout.on("data", (d) => (salida += d));
  hub.stderr.on("data", (d) => (salida += d));
  try {
    for (let i = 0; i < 50 && !salida.includes("Ctrl+C"); i++) await new Promise((r) => setTimeout(r, 100));
    cierto(salida.includes("Ctrl+C"), "CeceHub no arrancó: " + salida.slice(-300));
    const { pagina, errores, ctx } = await nuevaPagina(nav, conClaves({}), {
      almacen: {
        cece_ajustes: { modelo: "cece-local", localActivo: true, hubActivo: true },
        cece_hub: { ultima: `http://127.0.0.1:${puerto}` },
      },
    });
    await pagina.waitForFunction(() => CeceHub.ruta && CeceHub.ruta.modelos.length, null, { timeout: 15000 });
    await escribirYEnviar(pagina, "hola");
    const r = await ultimaRespuesta(pagina, 20000);
    cierto(/Hola desde llama-prueba por CeceHub/.test(r.texto), r.texto);
    igual(errores.length, 0, "errores: " + errores.join(" | "));
    await ctx.close();
  } finally {
    hub.kill();
    ia.close();
  }
});

prueba("el código con nombre de archivo se apunta con una ruta limpia", async (nav) => {
  const md = "```js\n// archivo: ./src/app.js\nconst a = 1;\nconst b = 2;\nconsole.log(a + b);\n```";
  const { pagina, ctx } = await nuevaPagina(nav, conClaves({ turbo: "sk" }), {
    ia: { "api.deepseek.com": () => ({ cuerpo: respuestaOpenAI(md) }) },
  });
  await escribirYEnviar(pagina, "haz un app.js");
  await ultimaRespuesta(pagina);
  igual(await pagina.evaluate(() => Codigo.archivos.map((a) => a.ruta).join(",")), "javascript/src/app.js");
  cierto(/📁 javascript\/src\/app\.js/.test(await pagina.innerText(".bot-msg:last-of-type .carpeta")), "no lo enseña en el bloque");
  await ctx.close();
});

prueba("Motor Astra (API Responses): texto, fuentes y tokens", async (nav) => {
  const { pagina, errores, ctx } = await nuevaPagina(nav, conClaves({ astra: "sk" }), {
    almacen: { cece_ajustes: { modelo: "cece-astra" } },
    ia: {
      "api.openai.com/v1/responses": () => ({
        cuerpo: sse([
          { type: "response.output_item.added", item: { type: "web_search_call" } },
          { type: "response.output_text.delta", delta: "Según la web, " },
          { type: "response.output_text.delta", delta: "hoy hace sol." },
          { type: "response.output_text.annotation.added", annotation: { url: "https://tiempo.example/hoy", title: "El tiempo" } },
          { type: "response.completed", response: { usage: { input_tokens: 50, output_tokens: 7 }, output: [] } },
        ]),
      }),
    },
  });
  await escribirYEnviar(pagina, "¿qué tiempo hace?");
  const r = await ultimaRespuesta(pagina);
  cierto(/Según la web, hoy hace sol\./.test(r.texto), r.texto);
  cierto(/El tiempo/.test(r.texto) && r.html.includes('href="https://tiempo.example/hoy"'), "sin fuentes");
  cierto(/7 tokens/.test(r.pie) && /Motor Astra/.test(r.pie), r.pie);
  igual(errores.length, 0, "errores: " + errores.join(" | "));
  await ctx.close();
});

prueba("Motor Argon (Gemini): texto, razonamiento y código ejecutado", async (nav) => {
  const { pagina, errores, ctx } = await nuevaPagina(nav, conClaves({ argon: "AIza-prueba" }), {
    almacen: { cece_ajustes: { modelo: "cece-argon" } },
    ia: {
      "/models?pageSize": () => ({ tipo: "application/json", cuerpo: JSON.stringify({ models: [{ name: "models/gemini-4-argon" }] }) }),
      ":streamGenerateContent": () => ({
        cuerpo: sse([
          { candidates: [{ content: { parts: [{ text: "Pienso…", thought: true }] } }] },
          { candidates: [{ content: { parts: [{ executableCode: { language: "PYTHON", code: "print(6*7)" } }] } }] },
          { candidates: [{ content: { parts: [{ codeExecutionResult: { outcome: "OUTCOME_OK", output: "42\n" } }] } }] },
          {
            candidates: [{ content: { parts: [{ text: "El resultado es **42**." }] }, finishReason: "STOP" }],
            usageMetadata: { promptTokenCount: 9, candidatesTokenCount: 5 },
          },
        ]),
      }),
    },
  });
  await escribirYEnviar(pagina, "/codigo 6*7");
  const r = await ultimaRespuesta(pagina);
  cierto(r.html.includes("<strong>42</strong>"), r.texto);
  cierto(/Código ejecutado/.test(r.texto) && r.html.includes("print(6*7)"), "sin bloque de código ejecutado");
  cierto(/Motor Argon/.test(r.pie), r.pie);
  igual(errores.length, 0, "errores: " + errores.join(" | "));
  await ctx.close();
});

prueba("Motor Max busca en internet con sus herramientas (dos vueltas)", async (nav) => {
  let vuelta = 0;
  const { pagina, peticiones, errores, ctx } = await nuevaPagina(nav, conClaves({ max: "sk" }), {
    almacen: { cece_ajustes: { modelo: "cece-max" } },
    ia: {
      "/tools/search": () => ({
        tipo: "application/json",
        cuerpo: JSON.stringify({ search_results: [{ title: "Noticia", url: "https://noticias.example/1", snippet: "Pasó algo." }] }),
      }),
      "api.moonshot.ai/v1/chat/completions": () =>
        ++vuelta === 1
          ? {
              cuerpo: sse([
                {
                  choices: [{ index: 0, delta: { tool_calls: [{ index: 0, id: "c1", function: { name: "buscar_web", arguments: "" } }] } }],
                },
                { choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { arguments: '{"consulta":"noticias"}' } }] } }] },
                { choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }] },
                "data: [DONE]\n\n",
              ]),
            }
          : { cuerpo: respuestaOpenAI("Hoy pasó algo, según Noticia.") },
    },
  });
  await escribirYEnviar(pagina, "/buscar noticias de hoy");
  const r = await ultimaRespuesta(pagina);
  cierto(/Hoy pasó algo/.test(r.texto), r.texto);
  cierto(r.html.includes('href="https://noticias.example/1"'), "sin la fuente");
  const segunda = peticiones.filter((p) => p.url.includes("/chat/completions"))[1];
  cierto(
    segunda && segunda.cuerpo.messages.some((m) => m.role === "tool" && /Pasó algo/.test(m.content)),
    "no devolvió el resultado de la búsqueda",
  );
  igual(errores.length, 0, "errores: " + errores.join(" | "));
  await ctx.close();
});

prueba("Motor Enterprise: sigue tras «pause_turn» (pausa en mitad de una búsqueda)", async (nav) => {
  let vuelta = 0;
  const cuerpos = [];
  const { pagina, ctx } = await nuevaPagina(nav, conClaves({ enterprise: "sk" }), {
    almacen: { cece_ajustes: { modelo: "cece-enterprise-plus" } },
    ia: {
      "api.anthropic.com": ({ cuerpo }) => (
        cuerpos.push(cuerpo),
        ++vuelta === 1
          ? {
              cuerpo: sse([
                { type: "message_start", message: { usage: { input_tokens: 5 } } },
                { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
                { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Lo busco." } },
                { type: "content_block_stop", index: 0 },
                {
                  type: "content_block_start",
                  index: 1,
                  content_block: { type: "server_tool_use", id: "s1", name: "web_search", input: {} },
                },
                { type: "content_block_delta", index: 1, delta: { type: "input_json_delta", partial_json: '{"query":"hoy"}' } },
                { type: "content_block_stop", index: 1 },
                { type: "message_delta", delta: { stop_reason: "pause_turn" }, usage: { output_tokens: 3 } },
              ]),
            }
          : {
              cuerpo: sse([
                { type: "message_start", message: { usage: { input_tokens: 9 } } },
                {
                  type: "content_block_start",
                  index: 0,
                  content_block: {
                    type: "web_search_tool_result",
                    tool_use_id: "s1",
                    content: [{ url: "https://hoy.example/", title: "Hoy" }],
                  },
                },
                { type: "content_block_stop", index: 0 },
                { type: "content_block_start", index: 1, content_block: { type: "text", text: "" } },
                { type: "content_block_delta", index: 1, delta: { type: "text_delta", text: "Encontrado." } },
                { type: "content_block_stop", index: 1 },
                { type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { output_tokens: 4 } },
              ]),
            }
      ),
    },
  });
  await escribirYEnviar(pagina, "/buscar hoy");
  const r = await ultimaRespuesta(pagina);
  cierto(/Lo busco\.\s*\n\s*Encontrado\./.test(r.texto), JSON.stringify(r.texto));
  cierto(r.html.includes('href="https://hoy.example/"'), "sin la fuente");
  const ultimo = cuerpos[1].messages[cuerpos[1].messages.length - 1];
  cierto(
    ultimo.role === "assistant" && ultimo.content.some((b) => b.type === "server_tool_use" && b.input.query === "hoy"),
    "no devolvió el turno pausado",
  );
  await ctx.close();
});

prueba("Cece Pro por relevo: cada paso recibe los archivos del anterior", async (nav) => {
  const vistos = [];
  const { pagina, errores, ctx } = await nuevaPagina(nav, conClaves({ enterprise: "sk-a", astra: "sk-b", max: "sk-c" }), {
    almacen: { cece_ajustes: { modelo: "cece-pro", relevo: true } },
    ia: {
      "api.anthropic.com": ({ cuerpo }) => (
        vistos.push(JSON.stringify(cuerpo.messages)),
        { cuerpo: respuestaClaude("```js\n// archivo: app.js\nconsole.log('v1');\n```") }
      ),
      "api.openai.com/v1/responses": ({ cuerpo }) => (
        vistos.push(JSON.stringify(cuerpo.input)),
        {
          cuerpo: sse([
            { type: "response.output_text.delta", delta: "Revisado: todo bien." },
            { type: "response.completed", response: { output: [] } },
          ]),
        }
      ),
      "api.moonshot.ai/v1/chat/completions": ({ cuerpo }) => (
        vistos.push(JSON.stringify(cuerpo.messages)),
        { cuerpo: respuestaOpenAI("Final del relevo.") }
      ),
    },
  });
  await escribirYEnviar(pagina, "haz un app.js");
  const r = await ultimaRespuesta(pagina, 30000);
  cierto(/relevo/.test(r.pie), r.pie);
  cierto(
    vistos.length >= 2 && vistos.slice(1).some((v) => /app\.js/.test(v) && /Relevo de Cece Pro/.test(v)),
    "el siguiente paso no recibió el archivo",
  );
  cierto(/Archivos del equipo/.test(r.texto) || /app\.js/.test(r.texto), "la respuesta final no lleva el archivo");
  igual(errores.length, 0, "errores: " + errores.join(" | "));
  await ctx.close();
});

prueba("crear una imagen (Cece Imagen) y que no se cuele un enlace raro", async (nav) => {
  const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  let malo = false;
  const { pagina, ctx } = await nuevaPagina(nav, conClaves({ astra: "sk" }), {
    almacen: { cece_ajustes: { imgMotor: "openai" } },
    ia: {
      "/images/generations": () => ({
        tipo: "application/json",
        cuerpo: JSON.stringify({ data: [malo ? { url: "javascript:alert(1)" } : { b64_json: png }] }),
      }),
    },
  });
  await escribirYEnviar(pagina, "/imagen un gato");
  let r = await ultimaRespuesta(pagina);
  cierto(r.html.includes('src="data:image/png;base64,'), "sin imagen: " + r.html.slice(0, 200));
  malo = true;
  await escribirYEnviar(pagina, "/imagen otro gato");
  r = await ultimaRespuesta(pagina);
  cierto(!r.html.includes("javascript:"), "se coló el enlace");
  cierto(/no válido/.test(r.texto), r.texto);
  await ctx.close();
});

prueba("nube: sube el historial cifrado a un Gist y otro equipo lo recupera", async (nav) => {
  const gists = new Map();
  const gh = ({ url, cuerpo, req }) => {
    const u = new URL(url),
      m = req.method();
    const json = (o, status = 200) => ({ status, tipo: "application/json", cuerpo: JSON.stringify(o) });
    if (u.pathname === "/gists" && m === "GET")
      return json([...gists.values()].map((g) => ({ id: g.id, files: { [Object.keys(g.files)[0]]: {} } })));
    if (u.pathname === "/gists" && m === "POST") {
      const g = { id: "abcdef0123456789abcd", files: cuerpo.files, history: [{ version: "v1" }] };
      gists.set(g.id, g);
      return json(g, 201);
    }
    const id = (u.pathname.match(/^\/gists\/([^/]+)/) || [])[1];
    if (id && /\/commits$/.test(u.pathname)) return json([{ version: gists.get(id).history[0].version }]);
    if (id && m === "PATCH") {
      const g = gists.get(id);
      g.files = cuerpo.files;
      g.history = [{ version: "v" + (Number(g.history[0].version.slice(1)) + 1) }];
      return json(g);
    }
    if (id && m === "GET") {
      const g = gists.get(id);
      if (!g) return json({ message: "Not Found" }, 404);
      const [n, f] = Object.entries(g.files)[0];
      return json({ id, files: { [n]: { content: f.content } }, history: g.history });
    }
    return json({}, 404);
  };
  const claves = { turbo: "sk", nube_token: "ghp_prueba", nube: "mi frase secreta de la nube 123" };
  const a = await nuevaPagina(nav, conClaves(claves), {
    ia: { "api.github.com": gh, "api.deepseek.com": () => ({ cuerpo: respuestaOpenAI("Apuntado en la nube.") }) },
  });
  await escribirYEnviar(a.pagina, "receta de gazpacho");
  await ultimaRespuesta(a.pagina);
  await a.pagina.click("#settingsBtn");
  await a.pagina.click("#nubeAhora");
  await a.pagina.waitForFunction(() => /Última vez/.test(document.getElementById("nubeEstado").textContent), null, { timeout: 20000 });
  const subido = Object.values([...gists.values()][0].files)[0].content;
  cierto(!/gazpacho/.test(subido) && /"datos":"cecez?1\$/.test(subido), "el Gist no va cifrado");
  // otro equipo, con la misma frase: recupera la conversación
  const b = await nuevaPagina(nav, conClaves(claves), { ia: { "api.github.com": gh } });
  await b.pagina.click("#settingsBtn");
  await b.pagina.click("#nubeAhora");
  await b.pagina.waitForFunction(() => /Última vez/.test(document.getElementById("nubeEstado").textContent), null, { timeout: 20000 });
  await b.pagina.fill("#buscarConv", "gazpacho");
  cierto(/gazpacho/.test(await b.pagina.innerText("#convList")), "no llegó la conversación");
  await a.ctx.close();
  await b.ctx.close();
});

// ---------- GitHub simulado (para el panel 🐙 GitHub) ----------
function githubSimulado({ nRepos = 2 } = {}) {
  const g = {
    repos: Array.from({ length: nRepos }, (_, i) => ({ full_name: "cece/repo" + i, private: true, default_branch: "main" })),
    archivos: new Map(), // "cece/repo0:ruta" → { buf, sha }
    puts: [],
    pedidos: [],
  };
  let n = 0;
  g.poner = (repo, ruta, contenido) =>
    g.archivos.set(repo + ":" + ruta, {
      buf: Buffer.isBuffer(contenido) ? contenido : Buffer.from(contenido),
      sha: "sha" + ++n + "0000000",
    });
  g.leer = (repo, ruta) => (g.archivos.get(repo + ":" + ruta) || {}).buf?.toString();
  g.manejar = ({ url, cuerpo, req }) => {
    const u = new URL(url),
      m = req.method();
    g.pedidos.push(m + " " + u.pathname + u.search);
    const json = (o, status = 200) => ({ status, tipo: "application/json", cuerpo: JSON.stringify(o) });
    if (u.pathname === "/user") return json({ login: "cece" });
    if (u.pathname === "/user/repos") {
      const pag = Number(u.searchParams.get("page") || 1);
      return json(g.repos.slice((pag - 1) * 100, pag * 100));
    }
    const mm = u.pathname.match(/^\/repos\/([^/]+\/[^/]+)\/contents\/?(.*)$/);
    if (!mm) return json({ message: "Not Found" }, 404);
    const repo = mm[1],
      ruta = mm[2].split("/").map(decodeURIComponent).join("/");
    const f = g.archivos.get(repo + ":" + ruta);
    if (m === "GET") {
      if (f) {
        const grande = f.buf.length > 1048576;
        return json({
          type: "file",
          path: ruta,
          name: ruta.split("/").pop(),
          sha: f.sha,
          size: f.buf.length,
          encoding: grande ? "none" : "base64",
          content: grande ? "" : f.buf.toString("base64"),
        });
      }
      const pre = ruta ? ruta + "/" : "",
        hijos = new Map();
      for (const k of g.archivos.keys())
        if (k.startsWith(repo + ":" + pre)) {
          const [nom, ...mas] = k.slice(repo.length + 1 + pre.length).split("/");
          hijos.set(nom, mas.length ? "dir" : "file");
        }
      if (!hijos.size && ruta) return json({ message: "Not Found" }, 404);
      return json([...hijos].map(([name, type]) => ({ name, path: pre + name, type })));
    }
    if (m === "PUT") {
      g.puts.push({ repo, ruta, cuerpo });
      if (f && cuerpo.sha !== f.sha) return json({ message: ruta + " does not match " + cuerpo.sha }, 409);
      g.poner(repo, ruta, Buffer.from(cuerpo.content, "base64"));
      return json({ content: { sha: g.archivos.get(repo + ":" + ruta).sha }, commit: { sha: "c0ffee0123456789" } }, f ? 200 : 201);
    }
    return json({ message: "Not Found" }, 404);
  };
  return g;
}
async function abrirGitHub(pagina) {
  const dialogos = [];
  pagina.on("dialog", (d) => (dialogos.push(d.message()), d.accept()));
  await pagina.click("#cece-github-open");
  await pagina.fill("#cece-gh-token", "github_pat_prueba");
  await pagina.press("#cece-gh-token", "Enter");
  await esperarGitHub(pagina, /Carpeta cargada/);
  return dialogos;
}
const esperarGitHub = (pagina, re) =>
  pagina.waitForFunction(
    (src) =>
      new RegExp(src).test(document.getElementById("cece-github-status").textContent) && !document.getElementById("cece-gh-save").disabled,
    re.source,
    { timeout: 10000 },
  );

prueba("GitHub: guardar avisa si el archivo ya existe y no pisa otro repositorio", async (nav) => {
  const g = githubSimulado();
  g.poner("cece/repo0", "README.md", "# Documentación importante\n");
  g.poner("cece/repo0", "src/app.js", "console.log('repo0');\n");
  g.poner("cece/repo1", "src/app.js", "console.log('repo1, NO TOCAR');\n");
  const { pagina, errores, ctx } = await nuevaPagina(nav, conClaves({}), { ia: { "api.github.com": g.manejar } });
  const dialogos = await abrirGitHub(pagina);
  // ruta que ya existe, sin abrirla antes
  await pagina.fill("#cece-gh-filepath", "README.md");
  await pagina.fill("#cece-gh-editor", "hola");
  await pagina.click("#cece-gh-save");
  await esperarGitHub(pagina, /Guardado|No se guardó/);
  cierto(/YA EXISTE.*SOBRESCRIBIR/.test(dialogos.pop()), "el aviso no dice que se sobrescribe");
  // abrir src/app.js en repo0 y cambiar a repo1: el editor no se lleva el archivo al otro repositorio
  await pagina.fill("#cece-gh-filepath", "src/app.js");
  await pagina.click("#cece-gh-read");
  await esperarGitHub(pagina, /Archivo leído/);
  await pagina.selectOption("#cece-gh-repos", "cece/repo1");
  await esperarGitHub(pagina, /Carpeta cargada/);
  igual(await pagina.inputValue("#cece-gh-editor"), "", "el editor sigue con el archivo del otro repositorio");
  igual(g.leer("cece/repo1", "src/app.js"), "console.log('repo1, NO TOCAR');\n");
  // guardar el archivo abierto: «Actualizar» y con su SHA
  await pagina.fill("#cece-gh-filepath", "src/app.js");
  await pagina.click("#cece-gh-read");
  await esperarGitHub(pagina, /Archivo leído/);
  await pagina.fill("#cece-gh-editor", "console.log('repo1 v2');\n");
  await pagina.click("#cece-gh-save");
  await esperarGitHub(pagina, /Guardado correctamente/);
  cierto(/Actualizar el archivo que abriste/.test(dialogos.pop()), "aviso al actualizar");
  igual(g.leer("cece/repo1", "src/app.js"), "console.log('repo1 v2');\n");
  igual(errores.length, 0, "errores: " + errores.join(" | "));
  await ctx.close();
});

prueba("GitHub: no abre lo que no puede editar y conserva los saltos de Windows", async (nav) => {
  const g = githubSimulado();
  g.poner("cece/repo0", "datos.csv", Buffer.alloc((2 << 20) + 5, 97));
  g.poner("cece/repo0", "logo.png", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xff, 0xfe]));
  g.poner("cece/repo0", "instalar.bat", "@echo off\r\necho hola\r\n");
  const { pagina, ctx } = await nuevaPagina(nav, conClaves({}), { ia: { "api.github.com": g.manejar } });
  const dialogos = await abrirGitHub(pagina);
  for (const [f, re] of [
    ["datos.csv", /más de 1 MB/],
    ["logo.png", /no es texto UTF-8/],
  ]) {
    await pagina.click(`#cece-gh-files .gh-file >> text=${f}`);
    await esperarGitHub(pagina, /No se pudo leer|Archivo leído/);
    cierto(re.test(await pagina.textContent("#cece-github-status")), f + ": " + (await pagina.textContent("#cece-github-status")));
    igual(await pagina.inputValue("#cece-gh-editor"), "", f + " se abrió vacío o roto en el editor");
  }
  await pagina.click("#cece-gh-files .gh-file >> text=instalar.bat");
  await esperarGitHub(pagina, /Archivo leído/);
  await pagina.click("#cece-gh-save");
  await esperarGitHub(pagina, /Guardado correctamente/);
  igual(g.leer("cece/repo0", "instalar.bat"), "@echo off\r\necho hola\r\n", "cambió los saltos de línea");
  igual(g.leer("cece/repo0", "datos.csv").length, (2 << 20) + 5, "el archivo grande cambió");
  cierto(dialogos.length === 1, "confirmaciones: " + dialogos.length);
  await ctx.close();
});

prueba("GitHub: ventana con Escape y foco dentro; lo que se suelta no va al chat; más de 100 repositorios", async (nav) => {
  const g = githubSimulado({ nRepos: 150 });
  g.poner("cece/repo0", "a.txt", "a");
  const { pagina, peticiones, ctx } = await nuevaPagina(nav, conClaves({ turbo: "sk" }), {
    ia: { "api.github.com": g.manejar, "api.deepseek.com": () => ({ cuerpo: respuestaOpenAI("ok") }) },
  });
  // GitHub cachea 60 s: el panel tiene que pedir sin caché
  await pagina.evaluate(() => {
    const f = window.fetch;
    window.__caches = [];
    window.fetch = function (u, o) {
      String(u).startsWith("https://api.github.com") && window.__caches.push((o && o.cache) || "default");
      return f.apply(this, arguments);
    };
  });
  await pagina.fill("#userInput", "borrador que no quiero enviar");
  await abrirGitHub(pagina);
  igual(await pagina.locator("#cece-gh-repos option").count(), 150, "no salen todos los repositorios");
  cierto(
    (await pagina.evaluate(() => window.__caches)).every((c) => c === "no-store"),
    "pide con caché",
  );
  // el foco no sale de la ventana (antes, Shift+Tab llegaba a «Enviar» y Enter mandaba el borrador)
  for (let i = 0; i < 25; i++) await pagina.keyboard.press("Shift+Tab");
  cierto(
    await pagina.evaluate(() => document.getElementById("cece-github-modal").contains(document.activeElement)),
    "el foco salió de la ventana",
  );
  // soltar un archivo sobre el editor lo carga ahí, no en el chat
  await pagina.evaluate(() => {
    const dt = new DataTransfer();
    dt.items.add(new File(["const SECRETO = 1;\n"], "privado.js", { type: "text/javascript" }));
    for (const t of ["dragenter", "dragover", "drop"])
      document.getElementById("cece-gh-editor").dispatchEvent(new DragEvent(t, { bubbles: true, cancelable: true, dataTransfer: dt }));
  });
  await pagina.waitForFunction(() => /SECRETO/.test(document.getElementById("cece-gh-editor").value));
  igual(await pagina.locator("#adjBandeja .adj-item").count(), 0, "el archivo se adjuntó al chat");
  await pagina.keyboard.press("Escape");
  cierto(!(await pagina.isVisible("#cece-github-modal")), "Escape no cierra");
  igual(await pagina.inputValue("#userInput"), "borrador que no quiero enviar");
  cierto(!peticiones.some((p) => p.url.includes("deepseek")), "se envió algo a la IA");
  await ctx.close();
});

prueba("copia protegida: ninguna clave comentada o fuera de sitio queda a la vista", async (nav) => {
  const vm = require("vm");
  const { pagina, ctx } = await nuevaPagina(nav, conClaves({}));
  const bloque = await pagina.evaluate(() => TEXTO_CLAVES);
  const variantes = [
    bloque.replace('enterprise: ""', 'enterprise: /* mi clave */ "sk-viejo-1234567890"'),
    bloque.replace('  turbo:      "",', '  // turbo: "sk-vieja-pero-valida-999",\n  turbo: "sk-nueva-123",'),
    bloque.replace('  turbo:      "",', "  // antes: sk-proj-AbCdEf0123456789xyzQWERTY\n  turbo: 'sk-nueva-123',"),
  ];
  for (const v of variantes) {
    const salida = await pagina.evaluate((t) => reescribirBloque(t, { enterprise: "", turbo: "" }, "cece1$prueba"), v);
    cierto(!/sk-|AbCdEf/.test(salida), "queda una clave a la vista:\n" + salida.slice(0, 600));
    const c = {};
    vm.createContext(c);
    vm.runInContext(salida + "\nthis.K = CECE_KEYS; this.B = CECE_BOVEDA;", c);
    igual(c.B, "cece1$prueba");
    cierto(
      Object.values(c.K).every((x) => !x),
      "quedan valores activos",
    );
  }
  await ctx.close();
});

prueba("Motor Argon solo usa versiones de su modelo (no las de voz, lite o imagen)", async (nav) => {
  const pedidos = [];
  const lista = ["gemini-4-argon-preview-tts", "gemini-4-argon-lite", "gemini-4-argon-image-preview", "gemini-4-argon-preview-09-2026"];
  const { pagina, ctx } = await nuevaPagina(nav, conClaves({ argon: "AIza" }), {
    almacen: { cece_ajustes: { modelo: "cece-argon" } },
    ia: {
      "/models?pageSize": () => ({
        tipo: "application/json",
        cuerpo: JSON.stringify({ models: lista.map((n) => ({ name: "models/" + n })) }),
      }),
      ":streamGenerateContent": ({ url }) => (
        pedidos.push(url.match(/models\/([^:]+):/)[1]),
        { cuerpo: sse([{ candidates: [{ content: { parts: [{ text: "Hola." }] }, finishReason: "STOP" }] }]) }
      ),
    },
  });
  await escribirYEnviar(pagina, "hola");
  await ultimaRespuesta(pagina);
  igual(pedidos.join(","), "gemini-4-argon-preview-09-2026");
  await ctx.close();
});

prueba("Astra y Argon: el texto de después de ejecutar código va en otro párrafo", async (nav) => {
  const { pagina, ctx } = await nuevaPagina(nav, conClaves({ astra: "sk", argon: "AIza" }), {
    almacen: { cece_ajustes: { modelo: "cece-astra" } },
    ia: {
      "api.openai.com/v1/responses": () => ({
        cuerpo: sse([
          { type: "response.output_text.delta", output_index: 0, delta: "Lo calculo con Python." },
          { type: "response.output_item.added", item: { type: "code_interpreter_call", code: "print(6*7)" } },
          {
            type: "response.output_item.done",
            item: { type: "code_interpreter_call", code: "print(6*7)", outputs: [{ type: "logs", logs: "42" }] },
          },
          { type: "response.output_text.delta", output_index: 2, delta: "El resultado es **42**." },
          { type: "response.completed", response: { output: [] } },
        ]),
      }),
      "/models?pageSize": () => ({ tipo: "application/json", cuerpo: JSON.stringify({ models: [{ name: "models/gemini-4-argon" }] }) }),
      ":streamGenerateContent": () => ({
        cuerpo: sse([
          { candidates: [{ content: { parts: [{ text: "```python\nprint(6*7)\n```" }] } }] },
          { candidates: [{ content: { parts: [{ executableCode: { language: "PYTHON", code: "print(6*7)" } }] } }] },
          { candidates: [{ content: { parts: [{ codeExecutionResult: { outcome: "OUTCOME_OK", output: "42" } }] } }] },
          { candidates: [{ content: { parts: [{ text: "Da **42**." }] }, finishReason: "STOP" }] },
        ]),
      }),
    },
  });
  await escribirYEnviar(pagina, "/codigo 6*7");
  let r = await ultimaRespuesta(pagina);
  cierto(/Python\.\s*\n\s*El resultado/.test(r.texto), JSON.stringify(r.texto));
  await escribirYEnviar(pagina, "/argon");
  await escribirYEnviar(pagina, "/codigo otra vez");
  r = await ultimaRespuesta(pagina);
  cierto(r.html.includes("<strong>42</strong>"), "el texto quedó dentro del bloque de código: " + r.texto);
  await ctx.close();
});

prueba("si se corta la conexión a mitad de respuesta, se avisa en español", async (nav) => {
  const http = require("http");
  const srv = http.createServer((req, res) => {
    const cors = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "access-control-allow-private-network": "true",
    };
    if (req.method === "OPTIONS") return res.writeHead(204, cors).end();
    if (req.url.endsWith("/models"))
      return res.writeHead(200, { ...cors, "content-type": "application/json" }).end('{"data":[{"id":"m"}]}');
    res.writeHead(200, { ...cors, "content-type": "text/event-stream" });
    res.write(`data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: "Empiezo a responder y" } }] })}\n\n`);
    setTimeout(() => req.socket.destroy(), 200);
  });
  await new Promise((ok) => srv.listen(0, "127.0.0.1", ok));
  const { pagina, ctx } = await nuevaPagina(nav, conClaves({}), {
    almacen: {
      cece_ajustes: { modelo: "cece-local", localActivo: true, localModelo: "m", localUrl: `http://127.0.0.1:${srv.address().port}/v1` },
    },
  });
  await escribirYEnviar(pagina, "hola");
  const r = await ultimaRespuesta(pagina);
  srv.close();
  cierto(/Empiezo a responder y/.test(r.texto) && /Se cortó la conexión/.test(r.texto), r.texto);
  cierto(!/network error/i.test(r.texto), "sale el error en inglés");
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
