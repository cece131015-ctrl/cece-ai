#!/usr/bin/env node
/* Pruebas de cece-ai.html en un Chromium sin ventana (Playwright), con las IAs simuladas: ninguna petición sale a
   internet ni se gasta nada. Uso: node herramientas/probar.js [archivo.html] [filtro]
   (Necesita Playwright: npm i -D playwright && npx playwright install chromium) */
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");
const { RUTAS, MARCADOR_PY, leerCarga, ponerCarga, leer } = require("./comun");

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
function conClaves(claves, htmlBase = HTML) {
  let h = htmlBase;
  for (const [k, v] of Object.entries(claves)) {
    const re = new RegExp(`(\\n\\s*${k}:\\s*)""`);
    if (!re.test(h)) throw new Error("No encuentro la clave " + k);
    h = h.replace(re, (_, a) => `${a}${JSON.stringify(v)}`);
  }
  const f = path.join(TMP, `cece-${Object.keys(claves).join("-") || "sin"}.html`);
  fs.writeFileSync(f, h);
  return f;
}

// Construye una copia temporal usando la fuente actual, sin modificar cece-ai.html ni ningún archivo del repositorio.
let HTML_FUENTE_REA = null;
async function htmlConFuenteActual() {
  if (HTML_FUENTE_REA) return HTML_FUENTE_REA;
  const { minify } = require("terser");
  const base = leer(RUTAS.html);
  const { semilla } = leerCarga(base);
  const pagina = leer(RUTAS.pagina);
  const python = leer(RUTAS.python);
  let programa = leer(RUTAS.programa);
  if (programa.split(MARCADOR_PY).length !== 2) throw new Error("La fuente debe contener exactamente un marcador CECEHUB_PY.");
  programa = programa.replace(MARCADOR_PY, () => JSON.stringify(python));
  const empaquetado = await minify(programa, {
    ecma: 2022,
    compress: { passes: 2 },
    mangle: true,
    format: { comments: false },
  });
  if (!empaquetado.code) throw new Error("Terser no generó el programa de prueba.");
  const html = ponerCarga(base, pagina, empaquetado.code, semilla);
  HTML_FUENTE_REA = path.join(TMP, "cece-fuente-actual.html");
  fs.writeFileSync(HTML_FUENTE_REA, html);
  return HTML_FUENTE_REA;
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

prueba("comando /rea ejecuta REA y entrega su evidencia a Cece", async (nav) => {
  let cuerpoREA = null, cuerpoIA = null;
  const htmlFuente = await htmlConFuenteActual();
  const { pagina, peticiones, errores, ctx } = await nuevaPagina(nav, conClaves({ turbo: "sk-prueba" }, leer(htmlFuente)), {
    ia: {
      "rea.example": (r) => {
        cuerpoREA = r.cuerpo;
        return { tipo: "application/json", cuerpo: JSON.stringify({ ok: true, engine: "rea-agents", result: { modules: ["index.js"], evidence: ["index.js: import ./lib.js"] } }) };
      },
      "api.deepseek.com": (r) => {
        cuerpoIA = r.cuerpo;
        return { cuerpo: respuestaOpenAI("Cece ha usado la evidencia de REA.") };
      },
    },
  });
  await pagina.evaluate(() => {
    localStorage.setItem("cece_rea_endpoint", "https://rea.example");
    sessionStorage.setItem("cece_rea_token", "token-prueba-no-real");
  });
  await escribirYEnviar(pagina, "/rea proyectos/demo — analiza los módulos");
  const r = await ultimaRespuesta(pagina);
  cierto(/Cece ha usado la evidencia de REA/.test(r.texto), "no respondió Cece después de REA: " + r.texto);
  cierto(cuerpoREA && cuerpoREA.targetPath === "proyectos/demo", "ruta incorrecta: " + JSON.stringify(cuerpoREA));
  const prompt = cuerpoIA && cuerpoIA.messages[cuerpoIA.messages.length - 1].content;
  cierto(/RESULTADO VERIFICADO DEL MOTOR REA/.test(prompt || "") && /index\.js/.test(prompt || "") && /lib\.js/.test(prompt || ""), "Cece no recibió la evidencia real de REA");
  igual(peticiones.length, 2, "se esperaba una petición a REA y otra a Cece");
  igual(errores.length, 0, "errores: " + errores.join(" | "));
  await ctx.close();
});

prueba("/rea clona una URL y entrega la captura a Cece", async (nav) => {
  let cuerpoREA = null, cuerpoIA = null;
  const htmlFuente = await htmlConFuenteActual();
  const { pagina, peticiones, errores, ctx } = await nuevaPagina(nav, conClaves({ turbo: "sk-prueba" }, leer(htmlFuente)), {
    ia: {
      "rea.example": (r) => {
        cuerpoREA = r.cuerpo;
        return { tipo: "application/json", cuerpo: JSON.stringify({ ok: true, mode: "html-snapshot",
          sourceUrl: "https://spotify.com/", outputPath: "clones/spotify-demo", entryFile: "clones/spotify-demo/index.html",
          bytes: 1200, htmlPreview: "<!doctype html><title>Spotify</title><h1>Spotify</h1>", note: "Captura estática." }) };
      },
      "api.deepseek.com": (r) => {
        cuerpoIA = r.cuerpo;
        return { cuerpo: respuestaOpenAI("Cece ha recibido la captura de la web.") };
      },
    },
  });
  await pagina.evaluate(() => {
    localStorage.setItem("cece_rea_endpoint", "https://rea.example");
    sessionStorage.setItem("cece_rea_token", "token-prueba-no-real");
  });
  await escribirYEnviar(pagina, "/rea quiero un clon de <app:Spotify:https://spotify.com>");
  const r = await ultimaRespuesta(pagina);
  cierto(/Cece ha recibido la captura de la web/.test(r.texto), "Cece no respondió con el resultado de captura: " + r.texto);
  cierto(cuerpoREA && cuerpoREA.mode === "clone" && cuerpoREA.url === "https://spotify.com/", "payload de clonación incorrecto: " + JSON.stringify(cuerpoREA));
  const prompt = cuerpoIA && cuerpoIA.messages[cuerpoIA.messages.length - 1].content;
  cierto(/spotify\.com/.test(prompt || "") && /<h1>Spotify<\/h1>/.test(prompt || ""), "la captura HTML no llegó al modelo de Cece");
  cierto(!(await pagina.locator("button").allTextContents()).some((s) => /Configurar REA/.test(s)), "sigue apareciendo el botón flotante de REA");
  igual(peticiones.length, 2, "se esperaba una petición a REA y otra a Cece");
  igual(errores.length, 0, "errores: " + errores.join(" | "));
  await ctx.close();
});

prueba("/rea sin objetivo no llama al servicio ni a la IA", async (nav) => {
  const htmlFuente = await htmlConFuenteActual();
  const { pagina, peticiones, errores, ctx } = await nuevaPagina(nav, conClaves({}, leer(htmlFuente)));
  await escribirYEnviar(pagina, "/rea");
  await pagina.waitForTimeout(150);
  // La ayuda se muestra como notificación accesible; el toast no siempre forma parte de innerText en Chromium.
  igual(peticiones.length, 0, "/rea sin objetivo no debe llamar al servicio ni a la IA");
  igual(await pagina.inputValue("#userInput"), "", "el comando no se limpió tras mostrar la ayuda");
  igual(errores.length, 0, "errores: " + errores.join(" | "));
  await ctx.close();
});

prueba("regresión: un mensaje normal no activa REA y se envía intacto", async (nav) => {
  let cuerpo = null;
  const htmlFuente = await htmlConFuenteActual();
  const { pagina, peticiones, errores, ctx } = await nuevaPagina(nav, conClaves({ turbo: "sk-prueba" }, leer(htmlFuente)), {
    ia: { "api.deepseek.com": (r) => {
      cuerpo = r.cuerpo;
      return { cuerpo: respuestaOpenAI("Respuesta normal.") };
    } },
  });
  await escribirYEnviar(pagina, "hola, esto es una consulta normal");
  const r = await ultimaRespuesta(pagina);
  cierto(/Respuesta normal/.test(r.texto), "no se recibió la respuesta simulada");
  cierto(cuerpo && cuerpo.messages, "no se envió ninguna solicitud a la IA");
  const prompt = cuerpo.messages[cuerpo.messages.length - 1].content;
  igual(prompt, "hola, esto es una consulta normal", "el mensaje normal cambió");
  cierto(!/MODO REA|ingeniería inversa solicitada/.test(prompt), "se activó REA sin /rea");
  igual(peticiones.length, 1, "número de peticiones inesperado");
  igual(errores.length, 0, "errores: " + errores.join(" | "));
  await ctx.close();
});

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
function iaLenta({ trozos = 60, ms = 150 } = {}) {
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
      if (n >= trozos) (clearInterval(t), res.end("data: [DONE]\n\n"));
    }, ms);
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

prueba("CeceHub de verdad: pide el código a Cece abierta como archivo y luego responde a través de él", async (nav) => {
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
    const pedir = (ruta, { metodo = "GET", cabeceras = {}, cuerpo } = {}) =>
      new Promise((ok, mal) => {
        const r = http.request({ host: "127.0.0.1", port: puerto, path: ruta, method: metodo, headers: cabeceras }, (res) => {
          let d = "";
          res.on("data", (x) => (d += x));
          res.on("end", () => ok({ status: res.statusCode, texto: d }));
        });
        r.on("error", mal);
        r.end(cuerpo);
      });
    // «Origin: null» (Cece como archivo, pero también el iframe con sandbox de cualquier web) ya no entra sin código
    const chat = JSON.stringify({ model: "llama-prueba", messages: [{ role: "user", content: "hola" }] });
    const sinCodigo = await pedir("/v1/chat/completions", {
      metodo: "POST",
      cabeceras: { Origin: "null", "Content-Type": "application/json" },
      cuerpo: chat,
    });
    igual(sinCodigo.status, 403, "una página con Origin null usa las IAs sin código");
    // un nombre (cecehub.local) que un impostor de la WiFi puede suplantar no consigue la prueba ligada al Host
    const prueba = JSON.parse((await pedir("/v1/cecehub/proof?nonce=" + "a".repeat(32), { cabeceras: { Host: `cecehub.local:${puerto}` } })).texto);
    igual(prueba.proof_host, null, "da la prueba ligada a un nombre que se puede suplantar");
    // la consola enseña el enlace con código para Cece abierta como archivo
    const enlace = (salida.match(/pégalo una vez\): (http:\/\/127\.0\.0\.1:\d+\/#cecehub=([\w-]+))/) || [])[2];
    cierto(enlace, "la consola no enseña el enlace para este equipo: " + salida.slice(0, 600));
    // sin el código, Cece explica cómo conseguirlo
    const sin = await nuevaPagina(nav, conClaves({}), {
      almacen: {
        cece_ajustes: { modelo: "cece-local", localActivo: true, hubActivo: true },
        cece_hub: { ultima: `http://127.0.0.1:${puerto}` },
      },
    });
    await sin.pagina.waitForFunction(() => CeceHub.estado === "sin", null, { timeout: 15000 });
    cierto(/pide el código.*localhost/.test(await sin.pagina.evaluate(() => CeceHub.mensaje)), await sin.pagina.evaluate(() => CeceHub.mensaje));
    await sin.ctx.close();
    // con el enlace pegado, conecta y responde
    const { pagina, errores, ctx } = await nuevaPagina(nav, conClaves({}), {
      almacen: {
        cece_ajustes: { modelo: "cece-local", localActivo: true, hubActivo: true },
        cece_hub: { ultima: `http://127.0.0.1:${puerto}`, token: enlace },
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

prueba("Cece Sol es una parte de Cece Pro (reparto de 5 y motor propio)", async (nav) => {
  // Con solo la clave de OpenAI, las partes de Cece Pro se quedan en dos motores distintos: Astra (gpt-6-astra) y el
  // nuevo Sol (gpt-6.1). Si Sol no estuviera dentro de Cece Pro, el relevo tendría un solo motor.
  const { pagina, errores, ctx } = await nuevaPagina(nav, conClaves({ astra: "sk-sol" }), {
    almacen: { cece_ajustes: { modelo: "cece-pro", relevo: true } },
    ia: {
      "api.openai.com/v1/responses": ({ cuerpo }) => ({
        cuerpo: sse([
          { type: "response.output_text.delta", delta: /gpt-6\.1/.test(JSON.stringify(cuerpo)) ? "Soy Sol." : "Soy Astra." },
          { type: "response.completed", response: { output: [] } },
        ]),
      }),
    },
  });
  const rep = await pagina.evaluate(() => ({
    filas: document.querySelectorAll("#repartoManual .rep-fila").length,
    repE: !!document.getElementById("repE"),
    sol: /Sol/.test(document.getElementById("repartoManual").textContent),
  }));
  igual(rep.filas, 5, "el reparto de Cece Pro no tiene 5 partes");
  cierto(rep.repE && rep.sol, "falta la fila de reparto de Sol");
  await escribirYEnviar(pagina, "hola equipo");
  const r = await ultimaRespuesta(pagina, 30000);
  cierto(/relevo/.test(r.pie), r.pie);
  cierto(/Motor Sol/.test(r.pie), "Sol no aparece en Cece Pro: " + r.pie);
  cierto(/Motor Astra/.test(r.pie), "Astra debería seguir estando: " + r.pie);
  igual(errores.length, 0, "errores: " + errores.join(" | "));
  await ctx.close();
});

prueba("Cece Pro por relevo: pasa los archivos y ordena según la petición", async (nav) => {
  // Dos partes vivas: Enterprise (Anthropic, sin perfil de código) y Max (Moonshot, nivel de código). El orden del
  // relevo cambia con la petición: en una pregunta normal manda el peso (termina Enterprise), pero si se pide código
  // el más adecuado (Max) pasa a terminar. Y el archivo que crea el primer paso llega al siguiente y a la respuesta.
  const entradasMax = [];
  const TOKEN = "TOKEN_RELEVO_7391";
  const { pagina, errores, ctx } = await nuevaPagina(nav, conClaves({ enterprise: "sk-a", max: "sk-c" }), {
    almacen: { cece_ajustes: { modelo: "cece-pro", relevo: true } },
    ia: {
      "api.anthropic.com": () => ({ cuerpo: respuestaClaude("```js\n// archivo: util.js\nconst " + TOKEN + " = true;\n```") }),
      "api.moonshot.ai/v1/chat/completions": ({ cuerpo }) => (
        entradasMax.push(JSON.stringify(cuerpo.messages)), { cuerpo: respuestaOpenAI("Lo he revisado y está perfecto.") }
      ),
    },
  });
  await escribirYEnviar(pagina, "Cuéntame un cuento corto sobre el mar.");
  const normal = await ultimaRespuesta(pagina, 30000);
  cierto(/Motor Max → Motor Enterprise/.test(normal.pie), "orden normal (termina Enterprise): " + normal.pie);
  await escribirYEnviar(pagina, "Escribe código JavaScript para ordenar una lista de números.");
  const codigo = await ultimaRespuesta(pagina, 30000);
  cierto(/Motor Enterprise → Motor Max/.test(codigo.pie), "con código debería terminar Max: " + codigo.pie);
  cierto(
    entradasMax.some((v) => v.includes(TOKEN) && /Relevo de Cece Pro/.test(v)),
    "el paso siguiente no recibió el archivo del anterior",
  );
  cierto(codigo.texto.includes(TOKEN) && /Archivos del equipo/.test(codigo.texto), "la respuesta final perdió el archivo");
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

// ---------- Gist simulado (para la nube) ----------
function gistSimulado() {
  const g = { gists: new Map(), pedidos: [] };
  g.manejar = ({ url, cuerpo, req }) => {
    const u = new URL(url),
      m = req.method();
    g.pedidos.push(m + " " + u.pathname);
    const json = (o, status = 200) => ({ status, tipo: "application/json", cuerpo: JSON.stringify(o) });
    if (u.pathname === "/gists" && m === "GET")
      return json([...g.gists.values()].map((x) => ({ id: x.id, files: { [Object.keys(x.files)[0]]: {} } })));
    if (u.pathname === "/gists" && m === "POST") {
      const x = { id: "abcdef0123456789abcd", files: cuerpo.files, history: [{ version: "v1" }] };
      g.gists.set(x.id, x);
      return json(x, 201);
    }
    const id = (u.pathname.match(/^\/gists\/([^/]+)/) || [])[1];
    if (id && /\/commits$/.test(u.pathname)) return json([{ version: g.gists.get(id).history[0].version }]);
    if (id && m === "PATCH") {
      const x = g.gists.get(id);
      x.files = cuerpo.files;
      x.history = [{ version: "v" + (Number(x.history[0].version.slice(1)) + 1) }];
      return json(x);
    }
    if (id && m === "GET") {
      const x = g.gists.get(id);
      if (!x) return json({ message: "Not Found" }, 404);
      const [n, f] = Object.entries(x.files)[0];
      return json({ id, files: { [n]: { content: f.content } }, history: x.history });
    }
    return json({}, 404);
  };
  return g;
}

prueba("nube: sube el historial cifrado a un Gist y otro equipo lo recupera", async (nav) => {
  const g = gistSimulado(),
    gists = g.gists,
    gh = g.manejar;
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
  // el foco no sale de la ventana (antes, Shift+Tab llegaba a «Enviar» y Enter mandaba el borrador). Se mira en cada
  // pulsación: al final de la vuelta podía volver a caer dentro por casualidad.
  for (const tecla of ["Shift+Tab", "Tab"])
    for (let i = 0; i < 25; i++) {
      await pagina.keyboard.press(tecla);
      cierto(
        await pagina.evaluate(() => document.getElementById("cece-github-modal").contains(document.activeElement)),
        `el foco salió de la ventana tras ${i + 1} × ${tecla}`,
      );
    }
  await pagina.focus("#cece-gh-filepath");
  const antes = peticiones.length;
  await pagina.keyboard.press("Enter");
  await pagina.waitForTimeout(300);
  igual(peticiones.slice(antes).filter((p) => /deepseek/.test(p.url)).length, 0, "Enter mandó el borrador a la IA");
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

// ZIP mínimo (como los .docx/.xlsx de verdad) a partir de { "ruta": "contenido" }
function zipDe(archivos) {
  const zlib = require("zlib");
  const tabla = Array.from({ length: 256 }, (_, n) => {
    for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
    return n >>> 0;
  });
  const crc = (b) => {
    let c = 0xffffffff;
    for (const x of b) c = tabla[(c ^ x) & 255] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const locales = [];
  const central = [];
  let pos = 0;
  for (const [nombre, contenido] of Object.entries(archivos)) {
    const datos = Buffer.from(contenido);
    const comp = zlib.deflateRawSync(datos, { level: 9 });
    const nom = Buffer.from(nombre);
    const l = Buffer.alloc(30);
    l.writeUInt32LE(0x04034b50, 0);
    l.writeUInt16LE(20, 4);
    l.writeUInt16LE(8, 8);
    l.writeUInt32LE(crc(datos), 14);
    l.writeUInt32LE(comp.length, 18);
    l.writeUInt32LE(datos.length, 22);
    l.writeUInt16LE(nom.length, 26);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE(20, 4);
    c.writeUInt16LE(20, 6);
    c.writeUInt16LE(8, 10);
    c.writeUInt32LE(crc(datos), 16);
    c.writeUInt32LE(comp.length, 20);
    c.writeUInt32LE(datos.length, 24);
    c.writeUInt16LE(nom.length, 28);
    c.writeUInt32LE(pos, 42);
    locales.push(l, nom, comp);
    central.push(c, nom);
    pos += 30 + nom.length + comp.length;
  }
  const cd = Buffer.concat(central);
  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0);
  fin.writeUInt16LE(Object.keys(archivos).length, 8);
  fin.writeUInt16LE(Object.keys(archivos).length, 10);
  fin.writeUInt32LE(cd.length, 12);
  fin.writeUInt32LE(pos, 16);
  return Buffer.concat([...locales, cd, fin]);
}
const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const docx = (cuerpo) => zipDe({ "word/document.xml": `<?xml version="1.0"?><w:document ${W}><w:body>${cuerpo}</w:body></w:document>` });
const parrafo = (...runs) => `<w:p>${runs.join("")}</w:p>`;
const run = (t) => `<w:r><w:t xml:space="preserve">${t}</w:t></w:r>`;

async function adjuntar(pagina, nombre, buffer) {
  await pagina.evaluate(() => Adjuntos.lista.splice(0));
  const t0 = Date.now();
  await pagina.setInputFiles("#adjInput", [{ name: nombre, mimeType: "application/octet-stream", buffer }]);
  await pagina.waitForFunction(() => !Adjuntos.ocupado, null, { timeout: 30000 });
  const r = await pagina.evaluate(() => Adjuntos.lista[0] && { texto: Adjuntos.lista[0].texto, recortado: !!Adjuntos.lista[0].recortado });
  return { ...r, ms: Date.now() - t0 };
}

prueba("Word, Excel y PowerPoint: control de cambios, hojas de gráfico y archivos que congelaban", async (nav) => {
  const { pagina, errores, ctx } = await nuevaPagina(nav, conClaves({}));
  // control de cambios: lo borrado y lo movido de sitio no es parte del documento
  let r = await adjuntar(
    pagina,
    "contrato.docx",
    docx(
      parrafo(run("El precio final es "), `<w:del w:id="1"><w:r><w:delText>100</w:delText></w:r></w:del>`, `<w:ins w:id="2">${run("120")}</w:ins>`, run(" euros.")) +
        parrafo(`<w:moveFrom w:id="3">${run("Cláusula movida.")}</w:moveFrom>`) +
        parrafo(run("A"), "<w:r><w:tab/></w:r>", run("B &amp; C")) +
        `<w:tbl><w:tr><w:tc>${parrafo(run("c1"))}</w:tc><w:tc>${parrafo(run("c2"))}</w:tc></w:tr></w:tbl>` +
        parrafo(`<w:moveTo w:id="4">${run("Cláusula movida.")}</w:moveTo>`) +
        // un cuadro de texto: Word guarda una copia para programas antiguos que no hay que leer dos veces
        parrafo(
          `<w:r><mc:AlternateContent><mc:Choice Requires="wps"><w:drawing><w:txbxContent>${parrafo(run("Recuadro"))}</w:txbxContent></w:drawing></mc:Choice>` +
            `<mc:Fallback><w:pict><v:textbox><w:txbxContent>${parrafo(run("Recuadro"))}</w:txbxContent></v:textbox></w:pict></mc:Fallback></mc:AlternateContent></w:r>`,
        ),
    ),
  );
  igual(r.texto, "El precio final es 120 euros.\n\nA\tB & C\nc1 | c2\nCláusula movida.\nRecuadro", "texto del .docx");
  // emojis de Word 365 (solo están en <mc:Fallback>) y un .docx con otro prefijo (ns0:, como lo deja xml.etree)
  r = await adjuntar(
    pagina,
    "emoji.docx",
    docx(parrafo(run("Hecho "), `<mc:AlternateContent><mc:Choice Requires="w16se"><w16se:symEx w16se:char="2705"/></mc:Choice><mc:Fallback><w:r><w:t>✅</w:t></w:r></mc:Fallback></mc:AlternateContent>`)),
  );
  igual(r.texto, "Hecho ✅", "emoji de Word 365");
  r = await adjuntar(
    pagina,
    "ns0.docx",
    zipDe({ "word/document.xml": `<ns0:document xmlns:ns0="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><ns0:body><ns0:p><ns0:r><ns0:t>Uno</ns0:t></ns0:r></ns0:p><ns0:p><ns0:r><ns0:t>Dos</ns0:t></ns0:r></ns0:p></ns0:body></ns0:document>` }),
  );
  igual(r.texto, "Uno\nDos", "docx con prefijo ns0");
  // una tabla cuyo texto limpio cabe en el máximo (el de trabajo, con « | » y saltos, no): llega entera
  const celda = `<w:tc>${parrafo(run("celda12345"))}</w:tc>`;
  r = await adjuntar(pagina, "tabla.docx", docx(`<w:tbl>${`<w:tr>${celda.repeat(5)}</w:tr>`.repeat(4500)}</w:tbl>` + parrafo(run("FIN"))));
  cierto(r.texto.endsWith("FIN") && !r.recortado, `la tabla se cortó: ${r.texto.length} car., recortado=${r.recortado}`);
  // etiquetas sin cerrar: antes el tiempo crecía con el cuadrado del tamaño (4 KB → 15 s con la página congelada)
  r = await adjuntar(pagina, "raro.docx", docx(`<w:tc>${parrafo(run("a"))}`.repeat(40000)));
  cierto(r.ms < 5000, `el .docx raro tarda ${r.ms} ms`);
  // Excel: los nombres van con su hoja aunque haya una hoja de gráfico en medio
  const rel = (id, tipo, destino) =>
    `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${tipo}" Target="${destino}"/>`;
  const fila = (n, ...v) => `<row r="${n}">${v.map((x, i) => `<c r="${"AB"[i]}${n}" t="inlineStr"><is><t>${x}</t></is></c>`).join("")}</row>`;
  r = await adjuntar(
    pagina,
    "libro.xlsx",
    zipDe({
      "xl/workbook.xml": `<workbook><sheets><sheet name="Ventas" sheetId="1" r:id="rId1"/><sheet name="Gráfico" sheetId="2" r:id="rId2"/><sheet name="Gastos" sheetId="3" r:id="rId3"/></sheets></workbook>`,
      "xl/_rels/workbook.xml.rels": `<Relationships>${rel("rId1", "worksheet", "worksheets/sheet1.xml")}${rel("rId2", "chartsheet", "chartsheets/sheet1.xml")}${rel("rId3", "worksheet", "worksheets/sheet2.xml")}</Relationships>`,
      "xl/worksheets/sheet1.xml": `<worksheet><sheetData>${fila(1, "Mes", "Ventas")}${fila(2, "Enero", "100")}</sheetData></worksheet>`,
      "xl/chartsheets/sheet1.xml": "<chartsheet/>",
      "xl/worksheets/sheet2.xml": `<worksheet><sheetData>${fila(1, "Concepto", "Gasto")}${fila(2, "Alquiler", "900")}</sheetData></worksheet>`,
    }),
  );
  igual(r.texto, "## Hoja: Ventas\nMes,Ventas\nEnero,100\n\n## Hoja: Gastos\nConcepto,Gasto\nAlquiler,900", "texto del .xlsx");
  // una hoja de 114 KB que se convertía en gigas de texto (RangeError y página congelada 40 s)
  r = await adjuntar(
    pagina,
    "bomba.xlsx",
    zipDe({ "xl/worksheets/sheet1.xml": `<worksheet><sheetData>${'<row><c r="ALL1"><v>1</v></c></row>'.repeat(1e6)}</sheetData></worksheet>` }),
  );
  cierto(r.ms < 8000 && r.recortado && r.texto.length === 3e5, `.xlsx enorme: ${r.ms} ms, ${r.texto && r.texto.length} car.`);
  r = await adjuntar(
    pagina,
    "diapos.pptx",
    zipDe({
      "ppt/slides/slide2.xml": "<p:sld><a:p><a:r><a:t>Segunda</a:t></a:r></a:p></p:sld>",
      // (PowerPoint y LibreOffice guardan el salto como <a:br><a:rPr/></a:br>: un salto, no dos)
      "ppt/slides/slide1.xml": "<p:sld><a:p><a:r><a:t>Hola</a:t></a:r><a:br><a:rPr sz=\"3200\"/></a:br><a:r><a:t>mundo</a:t></a:r></a:p><a:p></a:p></p:sld>",
    }),
  );
  igual(r.texto, "## Diapositiva 1\nHola\nmundo\n\n## Diapositiva 2\nSegunda", "texto del .pptx");
  igual(errores.length, 0, "errores: " + errores.join(" | "));
  await ctx.close();
});

prueba("un comando que no usa la IA (/calc) no corta la respuesta que está llegando", async (nav) => {
  const ia = await iaLenta({ trozos: 15, ms: 100 });
  const { pagina, errores, ctx } = await nuevaPagina(nav, conClaves({}), {
    almacen: {
      cece_ajustes: { modelo: "cece-local", localActivo: true, localModelo: "lento", localUrl: `http://127.0.0.1:${ia.puerto}/v1` },
    },
  });
  await escribirYEnviar(pagina, "cuéntame algo largo");
  await pagina.waitForFunction(() => /trozo 3\./.test(document.querySelector(".bot-msg:last-of-type .bubble").innerText), null, {
    timeout: 10000,
  });
  // dos comandos en espera (y un Enter de más con el cuadro vacío, que no debe cortar la respuesta)
  for (const t of ["/calc 2+2 ", "/calc 3+3 ", ""]) {
    await pagina.fill("#userInput", t);
    await pagina.press("#userInput", "Enter");
  }
  cierto(/se hará en cuanto termine/.test(await pagina.textContent("#toast")), "no avisa de que el comando espera");
  await pagina.waitForFunction(() => historial.some((m) => m.local && /= 6/.test(m.content)), null, { timeout: 15000 });
  ia.servidor.close();
  const h = await pagina.evaluate(() => historial.map((m) => m.content));
  cierto(/trozo 15\./.test(h[1]), "la respuesta se cortó: " + h[1]);
  igual(JSON.stringify(h.slice(2)), JSON.stringify(["2+2", "`2+2`\n\n**= 4**", "3+3", "`3+3`\n\n**= 6**"]), "historial desordenado");
  igual(await pagina.inputValue("#userInput"), "");
  igual(errores.length, 0, "errores: " + errores.join(" | "));
  await ctx.close();
});

prueba("Cece Pro: al parar durante la fusión se cuenta lo que ya costaron los borradores", async (nav) => {
  const llamadas = {};
  const ia = (prov, f) => async (r) => {
    if (!r.url.includes("/chat/") && !r.url.includes("/messages")) return null;
    // la segunda llamada a cada uno es la fusión: tarda, para dar tiempo a pararla
    if ((llamadas[prov] = (llamadas[prov] || 0) + 1) === 2) await new Promise((ok) => setTimeout(ok, 8000));
    return { cuerpo: f(`Borrador de ${prov}. ` + "bla ".repeat(200)) };
  };
  const { pagina, ctx } = await nuevaPagina(nav, conClaves({ enterprise: "sk-a", max: "sk-c" }), {
    almacen: { cece_ajustes: { modelo: "cece-pro", relevo: false, fusion: true } },
    ia: { "api.anthropic.com": ia("anthropic", respuestaClaude), "api.moonshot.ai": ia("moonshot", respuestaOpenAI) },
  });
  await escribirYEnviar(pagina, "hola");
  await pagina.waitForFunction(() => /Fusionando/.test(document.querySelector(".bot-msg:last-of-type .bubble").innerText), null, {
    timeout: 20000,
  });
  await pagina.click("#sendBtn");
  const r = await ultimaRespuesta(pagina, 10000);
  cierto(/detenido/.test(r.pie), "pie: " + r.pie);
  const s = await pagina.evaluate(() => ({ tokens: sesion.tokens, coste: sesion.coste }));
  cierto(s.tokens > 50 && s.coste > 0, "no se ha contado lo de los borradores: " + JSON.stringify(s));
  await ctx.close();
});

prueba("«Descargar imagen» descarga aunque la imagen venga de otro sitio", async (nav) => {
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  const { pagina, ctx } = await nuevaPagina(nav, conClaves({}), {
    ia: { "image.pollinations.ai": () => ({ tipo: "image/png", cuerpo: png }) },
  });
  await escribirYEnviar(pagina, "/imagen un gato");
  await pagina.waitForSelector(".bot-msg:last-of-type .img-actions a", { timeout: 20000 });
  const pestanas = [];
  ctx.on("page", (p) => pestanas.push(p.url()));
  const [descarga] = await Promise.all([
    pagina.waitForEvent("download", { timeout: 10000 }),
    pagina.click(".bot-msg:last-of-type .img-actions a"),
  ]);
  cierto(/^cece-imagen-\d{8}_\d{6}\.png$/.test(descarga.suggestedFilename()), descarga.suggestedFilename());
  igual(fs.readFileSync(await descarga.path()).length, png.length, "tamaño de la descarga");
  igual(pestanas.length, 0, "se abrió una pestaña: " + pestanas.join(", "));
  await ctx.close();
});

prueba("/github abre el panel y solo se conecta cuando la usuaria quiere (también con una respuesta en marcha)", async (nav) => {
  const g = githubSimulado();
  const ia = await iaLenta({ trozos: 15, ms: 100 });
  const { pagina, errores, ctx } = await nuevaPagina(nav, conClaves({}), {
    ia: { "api.github.com": g.manejar },
    almacen: {
      cece_ajustes: { modelo: "cece-local", localActivo: true, localModelo: "lento", localUrl: `http://127.0.0.1:${ia.puerto}/v1` },
    },
  });
  const abierto = () => pagina.evaluate(() => getComputedStyle(document.getElementById("cece-github-modal")).display !== "none");
  // escrito y elegido en el menú de «/»
  await pagina.fill("#userInput", "/github");
  await pagina.waitForSelector("#cmdMenu.open .cmd-item.on");
  cierto(/\/github/.test(await pagina.textContent("#cmdMenu .cmd-item.on")), "el menú no propone /github");
  await pagina.press("#userInput", "Enter");
  await pagina.waitForFunction(() => document.activeElement && document.activeElement.id === "cece-gh-token", null, { timeout: 5000 });
  cierto(await abierto(), "no se abrió el panel");
  igual(await pagina.inputValue("#userInput"), "", "el comando se queda en el cuadro");
  igual(g.pedidos.length, 0, "se ha conectado a GitHub sin que lo pida: " + g.pedidos.join(", "));
  // conectar es decisión de la usuaria
  await pagina.fill("#cece-gh-token", "github_pat_prueba");
  await pagina.press("#cece-gh-token", "Enter");
  await esperarGitHub(pagina, /Carpeta cargada/);
  await pagina.keyboard.press("Escape");
  cierto(!(await abierto()), "Escape no cierra el panel");
  igual(await pagina.evaluate(() => document.activeElement.id), "userInput", "el foco no vuelve al chat");
  // con un espacio detrás (sin menú) y por su alias; ya conectado, va a la lista de repositorios
  await pagina.fill("#userInput", "/gh ");
  await pagina.press("#userInput", "Enter");
  await pagina.waitForFunction(() => document.activeElement && document.activeElement.id === "cece-gh-repos", null, { timeout: 5000 });
  await pagina.keyboard.press("Escape");
  // con una respuesta llegando: se abre el panel y la respuesta no se corta
  await escribirYEnviar(pagina, "cuéntame algo largo");
  await pagina.waitForFunction(() => /trozo 3\./.test(document.querySelector(".bot-msg:last-of-type .bubble").innerText), null, {
    timeout: 10000,
  });
  await pagina.fill("#userInput", "/github /calc 2+2");
  await pagina.press("#userInput", "Enter");
  await pagina.waitForFunction(() => document.activeElement && document.activeElement.id === "cece-gh-repos", null, { timeout: 5000 });
  await pagina.keyboard.press("Escape");
  // (cuando termina la respuesta se hace el /calc: la última burbuja ya es la suya)
  await pagina.waitForFunction(() => historial.some((m) => m.local && /= 4/.test(m.content)), null, { timeout: 15000 });
  ia.servidor.close();
  const r = await pagina.evaluate(() => {
    const m = [...document.querySelectorAll(".bot-msg")].find((e) => /trozo 1\./.test(e.innerText));
    return { texto: m.querySelector(".bubble").innerText, pie: m.querySelector(".msg-meta").innerText };
  });
  cierto(/trozo 15\./.test(r.texto) && !/detenido/.test(r.pie), "la respuesta se cortó: " + r.texto.slice(-40) + " | " + r.pie);
  // y sale en la ayuda
  await escribirYEnviar(pagina, "/ayuda ");
  await pagina.waitForFunction(() => /\/github/.test(document.querySelector(".bot-msg:last-of-type .bubble").innerText));
  igual(errores.length, 0, "errores: " + errores.join(" | "));
  await ctx.close();
  // un plugin propio que ya se llamaba /github no se pierde: pasa a /github2 (y se avisa)
  const plugin = { id: "github", nombre: "Mi GitHub", emoji: "🧩", tipo: "plantilla", cuerpo: "Resume {texto}", desc: "", actualizado: "2026-10-01T00:00:00.000Z" };
  const b = await nuevaPagina(nav, conClaves({}), { almacen: { cece_plugins: [plugin] } });
  igual(JSON.stringify(await b.pagina.evaluate(() => [Plugins.propios.map((p) => p.id), JSON.parse(localStorage.cece_plugins).map((p) => p.id)])), '[["github2"],["github2"]]');
  await b.pagina.waitForFunction(() => /github2/.test(document.getElementById("toast").textContent), null, { timeout: 6000 });
  await b.ctx.close();
});

prueba("calculadora y plugins: «;» con decimales, 3x4, redondeos, 1h30m, años cortos, rangos y JSON intacto", async (nav) => {
  const { pagina, errores, ctx } = await nuevaPagina(nav, conClaves({}));
  const casos = [
    ["/calc media(2,5; 3,5)", /= 3$/m],
    ["/calc pow(2,5; 2)", /= 6,25/],
    ["/calc max(1.234,5; 2)", /= 1234,5/],
    ["/calc media(1,2,3)", /= 2$/m],
    ["/calc 3x4", /= 12/],
    ["/calc redondear(-2,5)", /= -3$/m],
    ["/calc redondear(-0,4)", /= 0$/m],
    ["/temporizador 1h30m", /5400 s/],
    ["/temporizador cancelar", /cancelado/],
    ["/dias 15/06/85", /1985/],
    ["/aleatorio 5-10", /entre 5 y 10/],
    ["/convertir 1 ms a h", /e-7 h/],
    ['/json {"id": 12345678901234567890, "p": 1.10, "a": 1, "a": 2}', /"id": 12345678901234567890,\s*"p": 1\.10,\s*"a": 1,\s*"a": 2/],
  ];
  for (const [entrada, esperado] of casos) {
    await escribirYEnviar(pagina, entrada);
    const r = await ultimaRespuesta(pagina);
    cierto(esperado.test(r.texto), `${entrada} → ${r.texto}`);
  }
  // un plugin propio no puede saltarse el máximo de 100.000 caracteres mandando él mismo el mensaje
  const largo = await pagina.evaluate(() =>
    Arena.ejecutar('postMessage({ ok: true, r: "x".repeat(300000), id: 999 }); return "";', "").then((r) => r.length),
  );
  cierto(largo <= 1e5, `el plugin devolvió ${largo} caracteres`);
  // el resultado de un plugin lento no se cuela en el chat nuevo
  await pagina.evaluate(() => {
    Plugins.propios.push({ id: "lento", emoji: "🧩", tipo: "js", cuerpo: 'await new Promise((r) => setTimeout(r, 800)); return "RESULTADO LENTO"', nombre: "lento", desc: "", actualizado: new Date().toISOString() });
    Plugins.registrar();
  });
  await pagina.fill("#userInput", "/lento algo");
  await pagina.press("#userInput", "Enter");
  await pagina.waitForTimeout(200);
  await pagina.evaluate(() => document.getElementById("clearBtn").click());
  await pagina.waitForTimeout(1500);
  cierto(!(await pagina.evaluate(() => historial.some((m) => /RESULTADO LENTO/.test(m.content)))), "el resultado fue al chat nuevo");
  igual(errores.length, 0, "errores: " + errores.join(" | "));
  await ctx.close();
});

prueba("conversaciones: exportar lleva lo último; importar no borra lo nuevo y restaura lo borrado", async (nav) => {
  const m = (r, c) => ({ role: r, content: c });
  const viejos = [m("user", "hola"), m("assistant", "respuesta 1")];
  const nuevos = [...viejos, m("user", "segunda pregunta"), m("assistant", "respuesta 2")];
  const { pagina, errores, ctx } = await nuevaPagina(nav, conClaves({}), {
    almacen: {
      cece_convs: [{ id: "conv-X", titulo: "hola", fecha: "2026-10-12T10:00:00.000Z", mensajes: viejos }],
      cece_actual: { id: "conv-X", mensajes: nuevos },
      cece_borradas: { "conv-Z": "2026-10-11T10:00:00.000Z" },
    },
  });
  const [d] = await Promise.all([pagina.waitForEvent("download"), pagina.evaluate(() => document.getElementById("exportBtn").click())]);
  const exportado = JSON.parse(fs.readFileSync(await d.path(), "utf8")).conversaciones.find((c) => c.id === "conv-X");
  igual(exportado.mensajes.length, 4, "se exportó la versión vieja de la conversación abierta");
  await pagina.evaluate(() => {
    convs[0].mensajes = historial.slice();
    convs[0].fecha = new Date().toISOString();
  });
  const copia = path.join(TMP, "copia-vieja.json");
  fs.writeFileSync(
    copia,
    JSON.stringify({
      app: "Cece AI",
      version: 2,
      conversaciones: [
        { id: "conv-X", titulo: "hola", fecha: "2026-10-01T10:00:00.000Z", mensajes: viejos },
        { id: "conv-Z", titulo: "borrada", fecha: "2026-10-01T10:00:00.000Z", mensajes: [m("user", "la recupero"), m("assistant", "ok")] },
      ],
    }),
  );
  await pagina.setInputFiles("#importFile", copia);
  await pagina.waitForFunction(() => /importada/.test(document.getElementById("convStatus").textContent));
  const r = await pagina.evaluate(() => ({
    x: convs.find((c) => c.id === "conv-X").mensajes.length,
    z: convs.find((c) => c.id === "conv-Z"),
    marca: JSON.parse(localStorage.cece_borradas || "{}")["conv-Z"],
  }));
  igual(r.x, 4, "la copia vieja borró los mensajes nuevos");
  cierto(r.z && Date.parse(r.z.fecha) > Date.parse("2026-10-11T10:00:00.000Z") && !r.marca, "lo restaurado se volvería a borrar: " + JSON.stringify(r));
  igual(errores.length, 0, "errores: " + errores.join(" | "));
  await ctx.close();
});

prueba("nube: con «automático» apagado no sube nada y «Desvincular» deja de sincronizar", async (nav) => {
  const g = gistSimulado();
  const claves = { turbo: "sk", nube_token: "ghp_prueba", nube: "mi frase secreta de la nube 123" };
  const { pagina, errores, ctx } = await nuevaPagina(nav, conClaves(claves), { ia: { "api.github.com": g.manejar } });
  await pagina.click("#settingsBtn");
  await pagina.click("label[for=swNubeAuto]");
  await pagina.waitForFunction(() => /Última vez/.test(document.getElementById("nubeEstado").textContent), null, { timeout: 20000 });
  const guardar = (t) =>
    pagina.evaluate((t) => {
      historial.push({ role: "user", content: t }, { role: "assistant", content: "ok" });
      document.getElementById("saveConvBtn").click();
    }, t);
  // guardar programa una subida a los 3 s; apagar el interruptor la cancela (y ocultar la pestaña no la lanza)
  await guardar("mi diario privado");
  await pagina.click("label[for=swNubeAuto]");
  let antes = g.pedidos.length;
  await pagina.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await pagina.waitForTimeout(4000);
  igual(g.pedidos.slice(antes).join(", "), "", "con «automático» apagado ha subido");
  // «Desvincular este equipo» apaga la sincronización
  await pagina.evaluate(() => Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true }));
  await pagina.click("label[for=swNubeAuto]");
  await pagina.waitForTimeout(1500);
  await pagina.click("#nubeOlvidar");
  antes = g.pedidos.length;
  await guardar("otra cosa privada");
  await pagina.waitForTimeout(4000);
  igual(g.pedidos.slice(antes).join(", "), "", "después de desvincular sigue sincronizando");
  igual(await pagina.evaluate(() => S.nubeAuto), false);
  igual(errores.length, 0, "errores: " + errores.join(" | "));
  await ctx.close();
});

prueba("«Descargar todo el código» lleva la última versión de cada archivo", async (nav) => {
  const resp = [
    "Aquí tienes:\n\n```python app.py\nprint(\"versión 1\")\nx = 1\ny = 2\nz = 3\n```",
    "Corregido:\n\n```python app.py\nprint(\"versión 2\")\nx = 1\ny = 2\nz = 3\n```",
  ];
  let turno = 0;
  const { pagina, ctx } = await nuevaPagina(nav, conClaves({ turbo: "sk" }), {
    ia: { "api.deepseek.com": () => ({ cuerpo: respuestaOpenAI(resp[turno++]) }) },
  });
  for (const t of ["hazme app.py", "arréglalo"]) {
    await escribirYEnviar(pagina, t);
    await ultimaRespuesta(pagina);
  }
  const archivos = await pagina.evaluate(() => Codigo.archivos);
  igual(archivos.length, 1);
  cierto(/versión 2/.test(archivos[0].contenido), "el .zip llevaría: " + archivos[0].contenido.split("\n")[0]);
  await ctx.close();
});

prueba("voz y CeceHub: frases de verdad no se tiran, código de Live al chat, rótulos y enlaces http", async (nav) => {
  const { pagina, errores, ctx } = await nuevaPagina(nav, conClaves({}));
  const r = await pagina.evaluate(() => {
    const tiradas = [
      "Gracias por verificarlo. Ahora dime cuánto cuesta el envío.",
      "Suscripción anual de Spotify, ¿cuánto cuesta?",
      "Subtítulos en inglés: ¿cómo los activo?",
      "www.elpais.com, ¿qué noticias trae hoy?",
      "Gracias por ver.",
      "Subtítulos realizados por la comunidad de Amara.org",
    ].map((t) => ALUCINA.test(t));
    const bases = ["http://mi-casa.example", "mi-casa.example", "192.168.1.5", "http://mipc.local"].map(baseHub);
    codigoLiveAlChat("Claro:\n```python\nprint(1)\n```\nY ya está.", "Cece Live · prueba");
    const ultimo = historial[historial.length - 1];
    S.interrumpir = false;
    Voz.modo = "live";
    Voz.ponerEstado("speaking");
    const rotulo = document.getElementById("liveStatus").textContent;
    Voz.modo = null;
    return { tiradas, bases, codigo: ultimo && ultimo.local && ultimo.content, rotulo };
  });
  igual(JSON.stringify(r.tiradas), "[false,false,false,false,true,true]", "filtro de alucinaciones");
  igual(
    JSON.stringify(r.bases),
    JSON.stringify(["http://mi-casa.example", "https://mi-casa.example", "http://192.168.1.5:9999", "http://mipc.local:9999"]),
    "baseHub",
  );
  cierto(/print\(1\)/.test(r.codigo || ""), "el código de Cece Live no llegó al chat");
  cierto(!/habla para cortarme/.test(r.rotulo), "rótulo: " + r.rotulo);
  const motor = await pagina.evaluate(() => transcribir(new Blob(["x"]), "navegador").then(() => "sin error", (e) => e.corto));
  igual(motor, "motor de transcripción no válido");
  igual(errores.length, 0, "errores: " + errores.join(" | "));
  await ctx.close();
});

prueba("con el teclado: visor de imágenes, editor de plugins y «reducir movimiento»", async (nav) => {
  const { pagina, errores, ctx } = await nuevaPagina(nav, conClaves({}));
  await pagina.emulateMedia({ reducedMotion: "reduce" });
  // visor: Tab no saca el foco (antes, tras un Tab, Escape ya no cerraba y Enter pulsaba lo de debajo)
  const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  await pagina.evaluate((src) => verImagen(src, "foto"), png);
  await pagina.keyboard.press("Tab");
  await pagina.keyboard.press("Tab");
  cierto(await pagina.evaluate(() => document.activeElement.classList.contains("visor-img")), "el foco salió del visor");
  cierto(await pagina.evaluate(() => document.getElementById("clearBtn").closest("[inert]") !== null), "lo de detrás sigue usable");
  await pagina.keyboard.press("Escape");
  cierto(await pagina.evaluate(() => !document.querySelector(".visor-img") && !document.querySelector("body > [inert]")), "el visor no se cerró bien");
  // editor de plugins: Enter en «Texto de prueba» prueba, no guarda y cierra
  await pagina.click("#settingsBtn");
  await pagina.evaluate(() => document.getElementById("pluginNuevo").scrollIntoView());
  await pagina.click("#pluginNuevo");
  await pagina.fill("#plgId", "gritar");
  await pagina.fill("#plgNombre", "Gritar");
  await pagina.check('input[name="plgTipo"][value="js"]');
  await pagina.fill("#plgCuerpo", 'return texto.toUpperCase() + "!!!"');
  await pagina.fill("#plgPrueba", "hola");
  await pagina.press("#plgPrueba", "Enter");
  await pagina.waitForFunction(() => document.getElementById("plgSalida").textContent === "HOLA!!!", null, { timeout: 5000 });
  cierto(await pagina.evaluate(() => document.getElementById("pluginModal").classList.contains("active")), "el editor se cerró");
  igual(await pagina.evaluate(() => localStorage.getItem("cece_plugins")), null, "el plugin se guardó sin querer");
  await pagina.keyboard.press("Escape");
  // con «reducir movimiento», el índice de Configuración salta sin animación
  const pasos = await pagina.evaluate(async () => {
    const panel = document.querySelector(".settings-panel");
    [...document.querySelectorAll("#ajustesNav [data-ir]")].pop().click();
    const a = panel.scrollTop;
    await new Promise((r) => setTimeout(r, 80));
    return [a, panel.scrollTop];
  });
  cierto(pasos[0] > 0 && pasos[0] === pasos[1], "el desplazamiento va animado: " + pasos.join(" → "));
  igual(errores.length, 0, "errores: " + errores.join(" | "));
  await ctx.close();
});

prueba("Cece Sol (modelo nuevo): /sol usa gpt-6.1 por la API Responses y responde", async (nav) => {
  let cuerpo = null;
  const { pagina, errores, ctx } = await nuevaPagina(nav, conClaves({ astra: "sk" }), {
    ia: {
      "api.openai.com/v1/responses": (r) => {
        cuerpo = r.cuerpo;
        return {
          cuerpo: sse([
            { type: "response.output_text.delta", delta: "Hola, soy Cece Sol." },
            { type: "response.completed", response: { usage: { input_tokens: 9, output_tokens: 5 }, output: [] } },
          ]),
        };
      },
    },
  });
  cierto(await pagina.$('#modelDropdown [data-model="cece-sol"]'), "Cece Sol no está en el menú de modelos");
  await escribirYEnviar(pagina, "/sol hola");
  const r = await ultimaRespuesta(pagina);
  cierto(/Hola, soy Cece Sol\./.test(r.texto), r.texto);
  cierto(/Motor Sol/.test(r.pie), r.pie);
  igual(cuerpo && cuerpo.model, "gpt-6.1", "no usó gpt-6.1: " + JSON.stringify(cuerpo && cuerpo.model));
  igual(await pagina.evaluate(() => S.modelo), "cece-sol");
  igual(errores.length, 0, "errores: " + errores.join(" | "));
  await ctx.close();
});

prueba("los motores avisan de un corte por filtro y de un rechazo (y no los dan por completos)", async (nav) => {
  let modo = "filtro";
  const { pagina, errores, ctx } = await nuevaPagina(nav, conClaves({ astra: "sk" }), {
    almacen: { cece_ajustes: { modelo: "cece-astra" } },
    ia: {
      "api.openai.com/v1/responses": () => ({
        cuerpo:
          "filtro" === modo
            ? sse([
                { type: "response.output_text.delta", delta: "La receta lleva 1) harina, 2)" },
                { type: "response.incomplete", response: { incomplete_details: { reason: "content_filter" }, usage: { input_tokens: 20, output_tokens: 9 }, output: [] } },
              ])
            : sse([
                { type: "response.refusal.delta", delta: "No puedo ayudar con eso." },
                { type: "response.completed", response: { usage: { input_tokens: 20, output_tokens: 6 }, output: [] } },
              ]),
      }),
    },
  });
  await escribirYEnviar(pagina, "algo");
  let r = await ultimaRespuesta(pagina);
  cierto(/filtro de contenido/.test(r.pie), "no avisa del corte por filtro: " + r.pie);
  modo = "rechazo";
  await escribirYEnviar(pagina, "otra cosa");
  r = await ultimaRespuesta(pagina);
  cierto(/No puedo ayudar con eso\./.test(r.texto), "se perdió el texto del rechazo: " + r.texto);
  cierto(/prefirió no responder/.test(r.pie), "no avisa del rechazo: " + r.pie);
  igual(errores.length, 0, "errores: " + errores.join(" | "));
  await ctx.close();
});

prueba("/crear programa una app y /crear se puede ver en una ventana aislada; luego se modifica", async (nav) => {
  let cuerpo = null;
  const { pagina, errores, ctx } = await nuevaPagina(nav, conClaves({ turbo: "sk" }), {
    almacen: { cece_ajustes: { modelo: "cece-turbo" } },
    ia: {
      "api.deepseek.com": (r) => {
        cuerpo = r.cuerpo;
        return { cuerpo: respuestaOpenAI("Aquí tienes:\n\n```html\n<!doctype html><title>t</title><h1>Mi calculadora</h1>\n```\n\nListo.") };
      },
    },
  });
  await escribirYEnviar(pagina, "/crear una calculadora");
  const r = await ultimaRespuesta(pagina);
  const prompt = cuerpo.messages[cuerpo.messages.length - 1].content;
  cierto(/aplicaci[oó]n web COMPLETA y ORIGINAL/i.test(prompt) && /una calculadora/.test(prompt), "no se expandió la plantilla: " + prompt.slice(0, 80));
  // el bloque HTML trae botón de vista previa
  const ver = await pagina.$('.bot-msg:last-of-type [data-acc="ver"]');
  cierto(ver, "no hay botón de vista previa en el bloque HTML");
  await ver.click();
  await pagina.waitForSelector(".visor-app iframe[sandbox]", { timeout: 5000 });
  const sandbox = await pagina.getAttribute(".visor-app iframe", "sandbox");
  cierto(!/allow-same-origin/.test(sandbox), "la vista previa comparte origen con Cece: " + sandbox);
  cierto(/Mi calculadora/.test(await pagina.getAttribute(".visor-app iframe", "srcdoc")), "la vista previa no lleva la app");
  cierto(await pagina.evaluate(() => document.getElementById("messages").closest("[inert]") !== null), "lo de detrás no quedó inerte");
  await pagina.keyboard.press("Escape");
  cierto(await pagina.evaluate(() => !document.querySelector(".visor-app") && !document.querySelector("body > [inert]")), "la vista previa no se cerró bien");
  // /modificar manda la orden de cambio a la IA
  await escribirYEnviar(pagina, "/modificar ponla en azul");
  await ultimaRespuesta(pagina);
  const prompt2 = cuerpo.messages[cuerpo.messages.length - 1].content;
  cierto(/Modifica la última aplicaci[oó]n/i.test(prompt2) && /ponla en azul/.test(prompt2), "no se expandió /modificar: " + prompt2.slice(0, 80));
  igual(errores.length, 0, "errores: " + errores.join(" | "));
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
