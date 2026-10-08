"use strict";
const CECEHUB_PY = "@@CECEHUB_PY@@";
const CECEHUB_VERSION = "2.1.0";
const HTML_INICIAL = (() => {
    try {
      const e = window.__ceceArchivo instanceof Element ? window.__ceceArchivo : null;
      try {
        delete window.__ceceArchivo;
      } catch (e) {}
      const t = e || document.documentElement.cloneNode(!0);
      (t.querySelectorAll("style.darkreader, link.darkreader, script.darkreader").forEach((e) => e.remove()),
        t.querySelectorAll("*").forEach((e) => {
          e.tagName.includes("-") && e.remove();
        }));
      for (const e of [t, t.querySelector("head"), t.querySelector("body")])
        if (e)
          for (const t of [...e.attributes])
            /^data-(darkreader|gr-|new-gr-|gramm|lt-)/i.test(t.name) && e.removeAttribute(t.name);
      t.removeAttribute("data-tema");
      const o = document.doctype;
      return (
        (o
          ? `<!DOCTYPE ${o.name}${o.publicId ? ` PUBLIC "${o.publicId}"` : ""}${o.systemId ? ` "${o.systemId}"` : ""}>`
          : "<!DOCTYPE html>") +
        "\n" +
        t.outerHTML +
        "\n"
      );
    } catch (e) {
      return "";
    }
  })(),
  TEXTO_CLAVES = (() => {
    try {
      const e = document.getElementById("cece-claves");
      return e ? e.textContent : "";
    } catch (e) {
      return "";
    }
  })(),
  $ = (e) => document.getElementById(e),
  esc = (e) =>
    String(e ?? "").replace(
      /[&<>"']/g,
      (e) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[e],
    ),
  sleep = (e) => new Promise((t) => setTimeout(t, e)),
  uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
  estimarTokens = (e) => Math.max(1, Math.ceil(String(e || "").length / 4)),
  norm = (e) =>
    String(e || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
function cerrarAlPulsarFuera(e, t) {
  let o = !1;
  (e.addEventListener("pointerdown", (t) => {
    o = t.target === e;
  }),
    e.addEventListener("click", (a) => {
      (a.target === e && o && t(), (o = !1));
    }));
}
const almacen = {
  ok: (() => {
    try {
      return (localStorage.setItem("__cece", "1"), localStorage.removeItem("__cece"), !0);
    } catch (e) {
      return !1;
    }
  })(),
  get(e, t) {
    try {
      const o = localStorage.getItem(e);
      return null == o ? t : JSON.parse(o);
    } catch (e) {
      return t;
    }
  },
  set(e, t) {
    try {
      return (localStorage.setItem(e, JSON.stringify(t)), !0);
    } catch (e) {
      return !1;
    }
  },
  del(e) {
    try {
      localStorage.removeItem(e);
    } catch (e) {}
  },
};
let _toastT = null;
function toast(e, t = "", o = 3800) {
  const a = $("toast");
  a &&
    ((a.textContent = e),
    (a.className = "toast ver" + (t ? " " + t : "")),
    clearTimeout(_toastT),
    (_toastT = setTimeout(() => {
      a.className = "toast";
    }, o)));
}
function descargar(e, t, o = "text/plain") {
  const a = t instanceof Blob ? t : new Blob([t], { type: o + ";charset=utf-8" }),
    n = document.createElement("a");
  ((n.href = URL.createObjectURL(a)),
    (n.download = e),
    document.body.appendChild(n),
    n.click(),
    n.remove(),
    setTimeout(() => URL.revokeObjectURL(n.href), 4e3));
}
function sello() {
  const e = new Date(),
    p = (e) => String(e).padStart(2, "0");
  return `${e.getFullYear()}${p(e.getMonth() + 1)}${p(e.getDate())}_${p(e.getHours())}${p(e.getMinutes())}${p(e.getSeconds())}`;
}
const PROVEEDORES = {
  anthropic: {
    nombre: "Motor Enterprise",
    tipo: "chat",
    fmt: "anthropic",
    base: "https://api.anthropic.com/v1",
    modelos: ["claude-fable-5-1"],
    h: ["buscar", "leer", "codigo", "asesor"],
    vista: !0,
    pdf: !0,
  },
  openai: {
    nombre: "Motor Astra",
    tipo: "chat",
    fmt: "responses",
    base: "https://api.openai.com/v1",
    modelos: ["gpt-6-astra"],
    h: ["buscar", "leer", "codigo"],
    vista: !0,
    pdf: !0,
  },
  moonshot: {
    nombre: "Motor Max",
    tipo: "chat",
    fmt: "openai",
    base: "https://api.moonshot.ai/v1",
    modelos: ["kimi-k3", "kimi-k2.7-code"],
    sinTemp: !0,
    razona: (e) => /k3/i.test(e),
    esfuerzos: { bajo: "low", medio: "low", alto: "high", extra: "max", max: "max", ultracode: "max" },
    piensa: () => !0,
    usage: "stream_options",
    webKimi: !0,
    margenPensar: 32768,
    razonPrevia: !0,
    veloz: (e) => ("kimi-k2.7-code" === e ? "kimi-k2.7-code-highspeed" : e),
    vista: (e) => /k3/i.test(e),
  },
  deepseek: {
    nombre: "Motor Turbo",
    tipo: "chat",
    fmt: "openai",
    base: "https://api.deepseek.com",
    modelos: ["deepseek-flash"],
    usage: "stream_options",
    razona: () => !0,
    esfuerzos: { bajo: "none", medio: "none", alto: "high", extra: "high", max: "max", ultracode: "high" },
    piensa: (e, t, o) => "none" !== o,
    interruptor: () => !0,
    webKimi: !0,
    margenPensar: 32768,
    razonPrevia: !0,
  },
  gemini: {
    nombre: "Motor Argon",
    tipo: "chat",
    fmt: "gemini",
    base: "https://generativelanguage.googleapis.com/v1beta",
    modelos: ["gemini-4-argon"],
    porAbrir: ["gemini-4-argon"],
    h: ["buscar", "leer", "codigo"],
    vista: !0,
    pdf: !0,
  },
  groq: {
    nombre: "Motor Reserva",
    tipo: "chat",
    fmt: "openai",
    base: "https://api.groq.com/openai/v1",
    modelos: ["openai/gpt-oss-120b"],
    razona: (e) => /gpt-oss/.test(e),
    esfuerzos: { bajo: "low", medio: "medium", alto: "high", extra: "high", max: "high", ultracode: "high" },
    h: (e) => (/gpt-oss/.test(e) ? ["buscar", "codigo"] : []),
  },
  local: {
    nombre: "Cece Local",
    tipo: "chat",
    fmt: "openai",
    base: "http://localhost:11434/v1",
    modelos: [],
    sinClave: !0,
    local: !0,
    vista: () => !!S.localVista,
  },
  elevenlabs: { nombre: "Voz Cece Natural", tipo: "voz", base: "https://api.elevenlabs.io/v1" },
  github: { nombre: "GitHub", tipo: "nube", base: "https://api.github.com" },
};
function herramientasDe(e) {
  const t = e && PROVEEDORES[e.prov];
  if (!t || "chat" !== t.tipo) return new Set();
  const o = new Set("function" == typeof t.h ? t.h(e.modelo) : t.h || []);
  return (t.webKimi && disponible("moonshot") && (o.add("buscar"), o.add("leer")), o);
}
const capacidad = (e, t) => {
    const o = e && PROVEEDORES[e.prov],
      a = o && o[t];
    return "function" == typeof a ? !!a(e.modelo) : !!a;
  },
  PROV_CHAT = Object.keys(PROVEEDORES).filter((e) => "chat" === PROVEEDORES[e].tipo),
  nombreProv = (e) => (PROVEEDORES[e] && PROVEEDORES[e].nombre) || e,
  NOMBRE_MODELO = {
    "claude-fable-5-1": "Motor Enterprise",
    "gpt-6-astra": "Motor Astra",
    "kimi-k3": "Motor Max",
    "kimi-k2.7-code": "Motor Ultra Code",
    "deepseek-flash": "Motor Turbo",
    "kimi-k2.7-code-highspeed": "Motor Ultra Code Rápido",
    "gemini-4-argon": "Motor Argon",
    "openai/gpt-oss-120b": "Motor Reserva",
  },
  esHoraPuntaTurbo = (e) => {
    const t = e.getUTCHours(),
      o = e.getUTCDay();
    return o >= 1 && o <= 5 && ((t >= 1 && t < 4) || (t >= 6 && t < 10));
  },
  PRECIOS_MODELO = {
    "claude-fable-5-1": [10, 50],
    "gpt-6-astra": [10, 50],
    "kimi-k3": [3, 15],
    "kimi-k2.7-code": [0.95, 4],
    "kimi-k2.7-code-highspeed": [1.9, 8],
    "deepseek-flash": (e) => (esHoraPuntaTurbo(e) ? [0.3, 1.2] : [0.15, 0.6]),
    "gemini-4-argon": [2, 10],
    "openai/gpt-oss-120b": [0.15, 0.6],
  },
  CECE = [
    {
      id: "cece-pro",
      label: "CECE PRO",
      nombre: "Cece Pro",
      color: "#c9a0ff",
      neon: "#c44dff",
      code: !0,
      pro: !0,
      motores: ["anthropic:claude-fable-5-1", "gemini:gemini-4-argon", "openai:gpt-6-astra", "moonshot:kimi-k3"],
    },
    {
      id: "cece-enterprise-plus",
      label: "CECE ENTERPRISE PLUS",
      nombre: "Cece Enterprise Plus",
      color: "#ffc46b",
      neon: "#ffb000",
      motores: [
        "anthropic:claude-fable-5-1",
        "moonshot:kimi-k3",
        "openai:gpt-6-astra",
        "deepseek:deepseek-flash",
        "groq:openai/gpt-oss-120b",
      ],
    },
    {
      id: "cece-argon",
      label: "CECE ARGON",
      nombre: "Cece Argon",
      color: "#ff7b54",
      neon: "#ff5f1f",
      code: !0,
      insignia: ["badge-argon", "⚛️ Argon"],
      motores: [
        "gemini:gemini-4-argon",
        "anthropic:claude-fable-5-1",
        "openai:gpt-6-astra",
        "moonshot:kimi-k3",
        "deepseek:deepseek-flash",
        "groq:openai/gpt-oss-120b",
      ],
    },
    {
      id: "cece-astra",
      label: "CECE ASTRA",
      nombre: "Cece Astra",
      color: "#a8c4ff",
      neon: "#3d8bff",
      motores: [
        "openai:gpt-6-astra",
        "anthropic:claude-fable-5-1",
        "moonshot:kimi-k3",
        "deepseek:deepseek-flash",
        "groq:openai/gpt-oss-120b",
      ],
    },
    {
      id: "cece-max",
      label: "CECE MAX",
      nombre: "Cece Max",
      color: "#ff3f9e",
      neon: "#ff1f8e",
      code: !0,
      motores: [
        "moonshot:kimi-k3",
        "anthropic:claude-fable-5-1",
        "openai:gpt-6-astra",
        "deepseek:deepseek-flash",
        "groq:openai/gpt-oss-120b",
      ],
    },
    {
      id: "cece-ultra-code",
      label: "CECE ULTRA CODE",
      nombre: "Cece Ultra Code",
      color: "#7fd0ff",
      neon: "#00e5ff",
      code: !0,
      codePrompt: !0,
      motores: [
        "moonshot:kimi-k2.7-code",
        "anthropic:claude-fable-5-1",
        "openai:gpt-6-astra",
        "moonshot:kimi-k3",
        "deepseek:deepseek-flash",
        "groq:openai/gpt-oss-120b",
      ],
    },
    {
      id: "cece-turbo",
      label: "CECE TURBO",
      nombre: "Cece Turbo",
      color: "#7fffb0",
      neon: "#00ff9c",
      motores: [
        "deepseek:deepseek-flash",
        "moonshot:kimi-k3",
        "openai:gpt-6-astra",
        "anthropic:claude-fable-5-1",
        "groq:openai/gpt-oss-120b",
      ],
    },
    {
      id: "cece-local",
      label: "CECE LOCAL",
      nombre: "Cece Local",
      color: "#b9c3d1",
      neon: "#c8d0e0",
      code: !0,
      local: !0,
      motores: ["local:"],
    },
  ],
  CECE_MAP = Object.fromEntries(CECE.map((e) => [e.id, e])),
  colorDe = (e) => (e ? (e.neon && "neon" === temaEfectivo() ? e.neon : e.color) : ""),
  REPARTO = ["A", "B", "C", "D"];
function repartoEntero(e, t) {
  const o = t.reduce((e, t) => e + Math.max(0, t), 0),
    a = o > 0 ? t.map((e) => Math.max(0, e)) : t.map(() => 1),
    n = o > 0 ? o : a.length,
    r = a.map((t) => (e * t) / n),
    i = r.map(Math.floor),
    s = e - i.reduce((e, t) => e + t, 0);
  return (
    r
      .map((e, t) => [e - i[t], t])
      .sort((e, t) => t[0] - e[0] || e[1] - t[1])
      .slice(0, s)
      .forEach(([, e]) => i[e]++),
    i
  );
}
const DEF = {
    modelo: "cece-turbo",
    esf: "medio",
    repA: 25,
    repB: 25,
    repC: 25,
    repD: 25,
    fusion: !0,
    maxi: !1,
    relevo: !0,
    vel: 80,
    emoji: "sistema",
    pantalla: !1,
    autoZip: !0,
    stream: !0,
    codeMode: !1,
    imgMode: !1,
    web: !0,
    bases: {},
    defModelo: {},
    stt: "auto",
    voz: "auto",
    vozSel: {},
    idioma: "es-ES",
    liveModelo: "cece-turbo",
    autoEscucha: !0,
    interrumpir: !0,
    vozChat: !0,
    silencio: 900,
    largo: "normal",
    tono: "cercano",
    idiomaResp: "auto",
    instrucciones: "",
    enviarCon: "enter",
    razon: "plegado",
    sonido: !1,
    imgMotor: "auto",
    imgModeloOpenai: "gpt-image-2.5-flare",
    carpetas: {},
    tema: "neon",
    versionTema: 2,
    acento: "",
    letra: "normal",
    densidad: "normal",
    ancho: "normal",
    animaciones: !0,
    localActivo: !1,
    localUrl: "http://localhost:11434/v1",
    localModelo: "",
    localRespaldo: !0,
    localVista: !1,
    hubActivo: !1,
    nubeAuto: !1,
    nubeGist: "",
    pluginsOff: [],
  },
  VALIDOS = {
    esf: ["bajo", "medio", "alto", "extra", "max", "ultracode"],
    emoji: ["sistema", "windows", "plano"],
    stt: ["auto", "groq", "groq-hq", "openai", "navegador"],
    voz: ["auto", "elevenlabs", "openai", "gemini", "groq", "navegador"],
    idioma: ["es-ES", "es-MX", "es-US", "en-US", "en-GB", "fr-FR", "de-DE", "it-IT", "pt-BR", "ca-ES"],
    imgMotor: ["auto", "openai", "gratis"],
    tema: [
      "auto",
      "neon",
      "oscuro",
      "medianoche",
      "nord",
      "dracula",
      "oceano",
      "bosque",
      "claro",
      "sepia",
      "contraste",
    ],
    letra: ["pequena", "normal", "grande", "enorme"],
    densidad: ["compacta", "normal", "amplia"],
    ancho: ["estrecho", "normal", "ancho", "completo"],
    largo: ["corta", "normal", "detallada"],
    tono: ["cercano", "profesional", "directo", "divertido"],
    idiomaResp: ["auto", "es", "en", "fr", "de", "it", "pt", "ca"],
    enviarCon: ["enter", "ctrl"],
    razon: ["plegado", "abierto", "oculto"],
  },
  FORMAS = {
    acento: /^(#[0-9a-f]{6})?$/i,
    localUrl: /^https?:\/\/[^\s"'<>\\]{1,200}$/i,
    localModelo: /^[\w.:\/@+\-]{0,120}$/,
    nubeGist: /^([0-9a-f]{20,40})?$/i,
    instrucciones: /^[\s\S]{0,1500}$/,
  },
  RANGOS = { vel: [5, 500], repA: [0, 100], repB: [0, 100], repC: [0, 100], repD: [0, 100], silencio: [400, 2500] };
function leerAjustes(e) {
  const t = { ...DEF, bases: {}, defModelo: {}, vozSel: {}, carpetas: {}, pluginsOff: [] };
  if (!e || "object" != typeof e || Array.isArray(e)) return t;
  for (const o of Object.keys(DEF)) {
    if (!Object.hasOwn(e, o)) continue;
    const a = e[o],
      n = DEF[o];
    "bases" !== o &&
      "defModelo" !== o &&
      (Array.isArray(n)
        ? Array.isArray(a) &&
          (t[o] = [...new Set(a.filter((e) => "string" == typeof e && e.length <= 40))].slice(0, 200))
        : n && "object" == typeof n
          ? a &&
            "object" == typeof a &&
            !Array.isArray(a) &&
            (t[o] = Object.fromEntries(Object.entries(a).filter(([, e]) => "string" == typeof e)))
          : typeof a != typeof n ||
            ("number" == typeof a && !Number.isFinite(a)) ||
            (VALIDOS[o] && !VALIDOS[o].includes(a)) ||
            (FORMAS[o] && !FORMAS[o].test(a)) ||
            (t[o] = RANGOS[o] ? Math.round(Math.min(RANGOS[o][1], Math.max(RANGOS[o][0], a))) : a));
  }
  (Object.hasOwn(CECE_MAP, t.modelo) || (t.modelo = DEF.modelo),
    2 !== e.versionTema && "oscuro" === e.tema && (t.tema = "neon"),
    // la migración del tema ya está hecha: si no se apunta, el «Oscuro» que elija después se pierde al recargar
    (t.versionTema = DEF.versionTema),
    Object.hasOwn(e, "repD") ||
      Object.hasOwn(e, "repE") ||
      34 !== e.repA ||
      33 !== e.repB ||
      33 !== e.repC ||
      REPARTO.forEach((e) => {
        t["rep" + e] = DEF["rep" + e];
      }));
  const o = repartoEntero(
    100,
    REPARTO.map((e) => t["rep" + e]),
  );
  return (
    REPARTO.forEach((e, a) => {
      t["rep" + e] = o[a];
    }),
    "igual" === t.liveModelo ||
      (Object.hasOwn(CECE_MAP, t.liveModelo) && !CECE_MAP[t.liveModelo].pro) ||
      (t.liveModelo = DEF.liveModelo),
    t
  );
}
const S = leerAjustes(almacen.get("cece_ajustes", {})),
  guardarAjustes = () => almacen.set("cece_ajustes", S),
  HUB = { base: "", token: "", internet: !1, extra: {} },
  claveDe = (e) => ("local" === e && HUB.base ? HUB.token : Boveda.clave(e)),
  baseDe = (e) =>
    "local" === e && HUB.base
      ? HUB.base
      : "local" === e
        ? (FORMAS.localUrl.test(S.localUrl) ? S.localUrl : DEF.localUrl).trim().replace(/\/+$/, "")
        : (String(S.bases[e] || "").trim() || (PROVEEDORES[e] && PROVEEDORES[e].base) || "").replace(/\/+$/, ""),
  sinInternetVale = (e) => !(!PROVEEDORES[e] || !PROVEEDORES[e].local || ("local" === e && HUB.internet)),
  disponible = (e) => {
    const t = PROVEEDORES[e];
    return !!t && (t.local ? !(!S.localActivo || !S.localModelo) : !!claveDe(e));
  },
  modeloDef = (e) =>
    "local" === e ? S.localModelo : String(S.defModelo[e] || "").trim() || PROVEEDORES[e].modelos[0] || "";
function motoresDe(e) {
  const t = CECE_MAP[e],
    o = [],
    a = new Set(),
    add = (e, t, n) => {
      if (((t = String(t || "").trim() || modeloDef(e)), !PROVEEDORES[e] || !t || !disponible(e))) return;
      if (!Familias.abierto(e, t)) return;
      const r = e + "|" + t;
      a.has(r) || (a.add(r), o.push({ prov: e, modelo: t, fijo: !!n }));
    };
  for (const e of (t && t.motores) || []) {
    const t = e.indexOf(":");
    add(e.slice(0, t), e.slice(t + 1));
  }
  return (t && !t.pro && !t.solo && S.localRespaldo && add("local", ""), o);
}
const etiquetaMotor = (e) => (e ? NOMBRE_MODELO[e.modelo] || nombreProv(e.prov) : ""),
  motorDeTabla = (e) => {
    const t = String(e || ""),
      o = t.indexOf(":");
    return { prov: t.slice(0, o), modelo: t.slice(o + 1) };
  },
  hayAlgunaClave = () => PROV_CHAT.some(disponible);
function tamLegible(e) {
  if ((e = Math.max(0, +e || 0)) < 1024) return e + " B";
  const t = ["KB", "MB", "GB"];
  let o = -1;
  do {
    ((e /= 1024), o++);
  } while (e >= 1024 && o < t.length - 1);
  return (e >= 100 ? Math.round(e) : Math.round(10 * e) / 10).toLocaleString("es-ES") + " " + t[o];
}
function aBase64(e) {
  let t = "";
  for (let o = 0; o < e.length; o += 32768) t += String.fromCharCode.apply(null, e.subarray(o, o + 32768));
  return btoa(t);
}
const deBase64 = (e) => Uint8Array.from(atob(String(e || "")), (e) => e.charCodeAt(0)),
  Cifra = {
    VUELTAS: 6e5,
    async derivar(e, t, o = Cifra.VUELTAS) {
      const a = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(String(e).normalize("NFC")),
        "PBKDF2",
        !1,
        ["deriveKey"],
      );
      return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: t, iterations: o, hash: "SHA-256" },
        a,
        { name: "AES-GCM", length: 256 },
        !1,
        ["encrypt", "decrypt"],
      );
    },
    partes(e) {
      const t = String(e || "")
        .trim()
        .split("$");
      if (5 !== t.length || ("cece1" !== t[0] && "cecez1" !== t[0])) return null;
      const o = Number(t[1]);
      if (!Number.isInteger(o) || o < 1e5 || o > 1e7) return null;
      try {
        const e = deBase64(t[2]),
          a = deBase64(t[3]),
          n = deBase64(t[4]);
        return e.length < 16 || 12 !== a.length || n.length < 17
          ? null
          : { gzip: "cecez1" === t[0], vueltas: o, sal: e, iv: a, ct: n, id: t[2] };
      } catch (e) {
        return null;
      }
    },
    _flujo: async (e, t) => new Uint8Array(await new Response(new Blob([e]).stream().pipeThrough(t)).arrayBuffer()),
    async cifrar(e, t, o, { comprimir: a = !1, llave: n = null, sal: r = null, vueltas: i = Cifra.VUELTAS } = {}) {
      r = r || crypto.getRandomValues(new Uint8Array(16));
      const s = crypto.getRandomValues(new Uint8Array(12));
      n = n || (await Cifra.derivar(t, r, i));
      let c = new TextEncoder().encode(String(e));
      const l = a && "undefined" != typeof CompressionStream;
      l && (c = await Cifra._flujo(c, new CompressionStream("gzip")));
      const d = new Uint8Array(
        await crypto.subtle.encrypt({ name: "AES-GCM", iv: s, additionalData: new TextEncoder().encode(o) }, n, c),
      );
      return {
        texto: [l ? "cecez1" : "cece1", i, aBase64(r), aBase64(s), aBase64(d)].join("$"),
        llave: n,
        id: aBase64(r),
      };
    },
    async descifrar(e, t, o) {
      const a = Cifra.partes(e);
      if (!a) throw new Error("El texto cifrado está dañado.");
      const n = "string" == typeof t ? await Cifra.derivar(t, a.sal, a.vueltas) : t;
      let r = new Uint8Array(
        await crypto.subtle.decrypt(
          { name: "AES-GCM", iv: a.iv, additionalData: new TextEncoder().encode(o) },
          n,
          a.ct,
        ),
      );
      return (a.gzip && (r = await Cifra._flujo(r, new DecompressionStream("gzip"))), new TextDecoder().decode(r));
    },
  };
function fuerzaContrasena(e) {
  e = String(e || "");
  let t = 0;
  (/[a-zñç]/.test(e) && (t += 27),
    /[A-ZÑÇ]/.test(e) && (t += 27),
    /\d/.test(e) && (t += 10),
    /[^\w\sñçÑÇ]/.test(e) && (t += 33),
    /\s/.test(e) && (t += 1),
    /[^\x00-\x7fñçÑÇ]/.test(e) && (t += 60));
  let o = e.length ? e.length * Math.log2(Math.max(t, 2)) : 0;
  const a = new Set(e.toLowerCase()).size;
  (a <= 2 ? (o = Math.min(o, 8)) : a < e.length / 3 && (o *= 0.6),
    /(0123|1234|2345|3456|4567|5678|6789|abcd|bcde|qwer|asdf|zxcv)/i.test(e) && (o *= 0.75),
    /^(contrase[ñn]a|password|passw0rd|qwerty|123456|cece|admin|letmein|iloveyou)/i.test(e) && (o *= 0.4),
    (o = Math.round(o)));
  const n = o < 36 ? 0 : o < 50 ? 1 : o < 64 ? 2 : o < 80 ? 3 : 4;
  return {
    bits: o,
    nivel: n,
    texto: ["Muy débil", "Débil", "Aceptable", "Fuerte", "Muy fuerte"][n],
    vale: e.length >= 10 && o >= 50,
  };
}
const literalJs = (e) =>
  JSON.stringify(String(e))
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
function _finCadena(e, t) {
  const o = e[t];
  for (let a = t + 1; a < e.length; a++)
    if ("\\" !== e[a]) {
      if (e[a] === o) return a;
    } else a++;
  return -1;
}
function _saltar(e, t) {
  for (;;) {
    for (; t < e.length && /\s/.test(e[t]);) t++;
    if (e.startsWith("//", t)) {
      const o = e.indexOf("\n", t);
      t = o < 0 ? e.length : o + 1;
      continue;
    }
    if (e.startsWith("/*", t)) {
      const o = e.indexOf("*/", t + 2);
      t = o < 0 ? e.length : o + 2;
      continue;
    }
    return t;
  }
}
function _buscarConst(e, t) {
  const o = new RegExp("\\bconst\\s+" + t + "\\s*=\\s*", "g");
  let a;
  for (; (a = o.exec(e));) {
    const t = e.slice(0, a.index);
    if (t.slice(t.lastIndexOf("\n") + 1).includes("//") || t.lastIndexOf("/*") > t.lastIndexOf("*/")) continue;
    const n = a.index + a[0].length;
    if ("{" === e[n]) {
      let t = 0;
      for (let o = n; o < e.length; o++) {
        const a = e[o];
        if ('"' !== a && "'" !== a && "`" !== a) {
          if (e.startsWith("//", o) || e.startsWith("/*", o)) o = _saltar(e, o) - 1;
          else if ("{" === a) t++;
          else if ("}" === a && 0 === --t) return [n, o + 1];
        } else if (((o = _finCadena(e, o)), o < 0)) return null;
      }
      return null;
    }
    if ('"' === e[n] || "'" === e[n] || "`" === e[n]) {
      const t = _finCadena(e, n);
      return t < 0 ? null : [n, t + 1];
    }
  }
  return null;
}
function reescribirBloque(e, t, o) {
  const a = _buscarConst((e = String(e || "")), "CECE_KEYS");
  if (!a) throw new Error("No encuentro el bloque de configuración al principio del archivo.");
  const [n, r] = a,
    i = e.slice(n + 1, r - 1);
  let s = "",
    c = 0;
  const l = new Set();
  for (;;) {
    const e = _saltar(i, c);
    if (((s += i.slice(c, e)), e >= i.length)) break;
    const o = /^([A-Za-z_$][\w$]*|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')\s*:\s*/.exec(i.slice(e));
    if (!o) {
      ((s += i[e]), (c = e + 1));
      continue;
    }
    const a = o[1].replace(/^["']|["']$/g, "");
    s += o[0];
    let n = e + o[0].length;
    if ('"' === i[n] || "'" === i[n] || "`" === i[n]) {
      const e = _finCadena(i, n);
      if (e < 0) throw new Error("El bloque de claves tiene una cadena sin cerrar.");
      ((s += literalJs(Object.hasOwn(t, a) ? t[a] : "")), l.add(a), (n = e + 1));
    }
    c = n;
  }
  const d = Object.keys(t).filter((e) => t[e] && !l.has(e) && /^[a-z][a-z0-9_]{0,30}$/.test(e));
  d.length && (s = d.map((e) => `\n  ${e}: ${literalJs(t[e])},`).join("") + (s.startsWith("\n") ? "" : "\n") + s);
  let u = e.slice(0, n) + "{" + s + "}" + e.slice(r);
  const m = _buscarConst(u, "CECE_BOVEDA");
  if (m) u = u.slice(0, m[0]) + literalJs(o) + u.slice(m[1]);
  else {
    let t = _buscarConst(u, "CECE_KEYS")[1];
    (";" === u[t] && t++,
      (u =
        u.slice(0, t) +
        "\n/* 🔐 Claves cifradas: las escribe Cece (Configuración → Seguridad). Sin la contraseña no se pueden leer. */\nconst CECE_BOVEDA = " +
        literalJs(o) +
        ";" +
        u.slice(t)));
  }
  return u;
}
function htmlConClaves(e, t) {
  if (!HTML_INICIAL || !TEXTO_CLAVES) throw new Error("Este navegador no deja copiar el archivo abierto.");
  const o = HTML_INICIAL.indexOf(TEXTO_CLAVES);
  if (o < 0) throw new Error("No encuentro el bloque de claves dentro del archivo.");
  return HTML_INICIAL.slice(0, o) + reescribirBloque(TEXTO_CLAVES, e, t) + HTML_INICIAL.slice(o + TEXTO_CLAVES.length);
}
const Boveda = (() => {
    const e = "cece-ai-boveda-v1",
      limpiar = (e) => {
        const t = Object.create(null);
        if (!e || "object" != typeof e) return t;
        for (const o of Object.keys(e)) {
          const a = e[o];
          "string" == typeof a && a.trim() && /^[a-z][a-z0-9_]{0,30}$/.test(o) && (t[o] = a.trim());
        }
        return t;
      };
    let t = Object.create(null),
      o = Object.create(null),
      a = "",
      n = !1,
      r = !1,
      i = !1;
    const s = "cece_boveda_fallos";
    function iniciar() {
      if (
        ((t = clavesDeBloque(limpiar("undefined" != typeof CECE_KEYS ? CECE_KEYS : null))),
        "undefined" != typeof CECE_KEYS && CECE_KEYS && "object" == typeof CECE_KEYS)
      )
        for (const e of Object.keys(CECE_KEYS))
          try {
            CECE_KEYS[e] = "";
          } catch (e) {}
      ((a = "string" == typeof CECE_BOVEDA ? CECE_BOVEDA.trim() : ""),
        (r = !!a && !Cifra.partes(a)),
        r && (a = ""),
        (o = Object.assign(Object.create(null), t)),
        taparBloque());
    }
    const hayCifrada = () => !!a,
      necesitaDesbloqueo = () => hayCifrada() && !n,
      idLlave = () => {
        const e = Cifra.partes(a);
        return e ? "boveda:" + e.id : "";
      };
    async function abrirCon(r) {
      const i = await Cifra.descifrar(a, r, e),
        s = JSON.parse(i);
      if (!s || 1 !== s.v || !s.claves || "object" != typeof s.claves) throw new Error("formato");
      ((o = Object.assign(Object.create(null), clavesDeBloque(limpiar(s.claves)), t)), (n = !0));
    }
    async function probarRecordada() {
      if (!necesitaDesbloqueo()) return n;
      try {
        const e = await idb("get", idLlave());
        return e instanceof CryptoKey && (await abrirCon(e), !0);
      } catch (e) {
        return (idb("del", idLlave()).catch(() => {}), !1);
      }
    }
    function esperaRestante() {
      const e = almacen.get(s, null);
      return e && "number" == typeof e.hasta ? Math.min(3e5, Math.max(0, e.hasta - Date.now())) : 0;
    }
    async function desbloquear(e, t) {
      const o = esperaRestante();
      if (o > 0) throw new Error(`Demasiados intentos. Espera ${Math.ceil(o / 1e3)} s.`);
      const n = Cifra.partes(a);
      if (!n) throw new Error("No hay claves cifradas en este archivo.");
      if (!window.crypto || !crypto.subtle)
        throw new Error(
          "Este navegador no deja descifrar aquí: abre el archivo con doble clic (file://) o desde una dirección https://.",
        );
      let r;
      try {
        ((r = await Cifra.derivar(e, n.sal, n.vueltas)), await abrirCon(r));
      } catch (e) {
        if (!e || "OperationError" !== e.name)
          throw new Error(
            e && "formato" === e.message
              ? "El bloque cifrado de este archivo está dañado."
              : "No se pudo descifrar en este navegador.",
          );
        const t = almacen.get(s, null),
          o = (t && Number.isInteger(t.n) ? t.n : 0) + 1,
          a = o >= 5 ? Date.now() + Math.min(3e5, 3e4 * 2 ** (o - 5)) : 0;
        throw (
          almacen.set(s, { n: o, hasta: a }),
          new Error(
            o >= 5
              ? `Contraseña incorrecta. Espera ${Math.round((a - Date.now()) / 1e3)} s para volver a probar.`
              : "Contraseña incorrecta.",
          )
        );
      }
      return (almacen.del(s), t && (await idb("set", idLlave(), r).catch(() => {})), !0);
    }
    async function bloquear() {
      (hayCifrada() && (await idb("del", idLlave()).catch(() => {})),
        (o = Object.assign(Object.create(null), t)),
        (n = !1),
        void 0 !== Nube && (Nube._llave = null));
    }
    async function protegerYDescargar(t, a) {
      if (!fuerzaContrasena(t).vale)
        throw new Error("La contraseña es demasiado débil: usa al menos 10 caracteres (mejor una frase).");
      const r = Object.assign({}, o);
      if (!Object.keys(r).length)
        throw new Error(
          "No hay nada que cifrar: rellena primero el bloque de configuración del principio del archivo.",
        );
      const s = await Cifra.cifrar(JSON.stringify({ v: 1, claves: r }), t, e),
        l = htmlConClaves(
          Object.fromEntries(Object.keys(Object.assign({}, CLAVES_CONOCIDAS, clavesParaBloque(r))).map((e) => [e, ""])),
          s.texto,
        );
      return (
        a && (await idb("set", "boveda:" + s.id, s.llave).catch(() => {})),
        descargar("cece-ai.html", l, "text/html"),
        (i = !0),
        s.texto
      );
    }
    function descargarSinCifrar() {
      descargar(
        "cece-ai-sin-cifrar.html",
        htmlConClaves(Object.assign({}, CLAVES_CONOCIDAS, clavesParaBloque(o)), ""),
        "text/html",
      );
    }
    function estado() {
      return {
        cifrada: hayCifrada(),
        abierta: n,
        rota: r,
        descargada: i,
        enClaro: Object.keys(t).length,
        total: Object.keys(o).length,
      };
    }
    function taparBloque() {
      const e = document.getElementById("cece-claves");
      if (!e) return;
      const t = estado();
      e.textContent =
        t.cifrada && !t.enClaro
          ? "\n/* 🔐 Bloque de configuración — oculto por seguridad.\n   Las claves van cifradas (AES-256-GCM) y sin tu contraseña no se pueden leer. */\n"
          : t.enClaro
            ? "\n/* ⚠️ Bloque de configuración — oculto en esta vista, PERO en el archivo están SIN cifrar\n   (se ven con el Bloc de notas o en F12 → Sources). Cífralas: Configuración → 🔐 Seguridad. */\n"
            : "\n/* Bloque de configuración: vacío. */\n";
    }
    return {
      iniciar: iniciar,
      clave: (e) => o[e] || "",
      hayCifrada: hayCifrada,
      necesitaDesbloqueo: necesitaDesbloqueo,
      probarRecordada: probarRecordada,
      desbloquear: desbloquear,
      bloquear: bloquear,
      protegerYDescargar: protegerYDescargar,
      descargarSinCifrar: descargarSinCifrar,
      estado: estado,
      esperaRestante: esperaRestante,
      _poner(e) {
        Object.assign(o, clavesDeBloque(limpiar(e)));
      },
      _quitar(e) {
        delete o[e];
      },
    };
  })(),
  CLAVE_BLOQUE = {
    enterprise: "anthropic",
    astra: "openai",
    max: "moonshot",
    turbo: "deepseek",
    argon: "gemini",
    reserva: "groq",
    voz: "elevenlabs",
    nube_token: "github",
    nube: "nube",
  },
  BLOQUE_DE_SERVICIO = Object.fromEntries(Object.entries(CLAVE_BLOQUE).map(([e, t]) => [t, e])),
  nombreEnBloque = (e) => (Object.hasOwn(BLOQUE_DE_SERVICIO, e) ? BLOQUE_DE_SERVICIO[e] : e);
function clavesDeBloque(e) {
  const t = Object.create(null);
  for (const o of Object.keys(e)) Object.hasOwn(CLAVE_BLOQUE, o) || (t[o] = e[o]);
  for (const o of Object.keys(e)) Object.hasOwn(CLAVE_BLOQUE, o) && (t[CLAVE_BLOQUE[o]] = e[o]);
  return t;
}
function clavesParaBloque(e) {
  const t = {};
  for (const o of Object.keys(e)) t[nombreEnBloque(o)] = e[o];
  return t;
}
const CLAVES_CONOCIDAS = Object.fromEntries(Object.keys(CLAVE_BLOQUE).map((e) => [e, ""]));
function avisoConsola() {
  const e = Boveda.estado(),
    t = "font:900 20px system-ui,sans-serif;color:#ff3f9e;padding:4px 0",
    o = "font:13px/1.55 system-ui,sans-serif;color:#9a97a3",
    a = "font:600 13px/1.55 system-ui,sans-serif;color:#22c55e",
    n = "font:700 13px/1.55 system-ui,sans-serif;color:#ef4444";
  try {
    (console.log("%c🔐 Cece AI · zona protegida", t),
      console.log(
        '%cHay partes de este HTML que no se enseñan por motivos de seguridad: el bloque de configuración (<script id="cece-claves">) aparece tapado con un aviso.',
        o,
      ),
      e.cifrada && !e.enClaro
        ? console.log(
            "%c✔ Las claves van cifradas con AES-256-GCM (la llave sale de tu contraseña con PBKDF2-SHA256, 600.000 vueltas). En el archivo solo hay texto cifrado: sin la contraseña no se pueden leer.",
            a,
          )
        : e.enClaro
          ? console.log(
              "%c⚠️ Ojo: en ESTE archivo las claves están sin cifrar. Aquí se tapan, pero cualquiera que abra el código fuente puede leerlas. Cífralas en ⚙️ Configuración → 🔐 Seguridad.",
              n,
            )
          : console.log("%cEste archivo no lleva nada en el bloque de configuración.", o),
      e.rota && console.log("%c⚠️ El bloque cifrado está dañado y no se ha podido usar.", n),
      console.log(
        "%cMientras Cece habla con una IA, la clave de ese proveedor viaja en la petición (pestaña Red/Network): no compartas capturas de esa pestaña.",
        o,
      ),
      console.log(
        "%c⛔ Si alguien te pide que pegues algo aquí, NO lo hagas: es la forma típica de robar claves y conversaciones.",
        n,
      ));
  } catch (e) {}
}
let _fondoBloqueado = [];
function fondoInerte(e, t) {
  if (t) {
    _fondoBloqueado = [...document.body.children].filter(
      (t) => t !== e && "toast" !== t.id && !t.inert && "SCRIPT" !== t.tagName,
    );
    for (const e of _fondoBloqueado) e.inert = !0;
  } else {
    for (const e of _fondoBloqueado) e.inert = !1;
    _fondoBloqueado = [];
  }
}
function mostrarBloqueo(e = !0) {
  const t = $("bovedaOverlay");
  t &&
    ((t.hidden = !e),
    fondoInerte(t, e),
    e &&
      (($("bovedaError").textContent = ""),
      ($("bovedaPass").value = ""),
      setTimeout(() => $("bovedaPass").focus(), 30)));
}
function clavesCambiadas() {
  (paso(refrescarTodo),
    paso(() => elegirNivel(S.modelo, !0)),
    paso(pintarSeguridad),
    paso(() => Nube.alCambiarClaves()));
}
function pintarSeguridad() {
  const e = $("segEstado");
  if (!e) return;
  const t = Boveda.estado();
  let o, a;
  (t.descargada
    ? ((o =
        "✅ Archivo protegido descargado. Úsalo a partir de ahora y borra el antiguo: ese todavía tiene las claves a la vista."),
      (a = "verde"))
    : t.rota
      ? ((o =
          "⚠️ El bloque cifrado de este archivo está dañado. Vuelve a rellenar el bloque de configuración del principio del archivo y cífralo otra vez."),
        (a = "naranja"))
      : t.cifrada && !t.abierta
        ? ((o = "🔒 Claves cifradas y bloqueadas. Desbloquéalas para usar las IAs."), (a = "morado"))
        : t.cifrada && t.enClaro
          ? ((o = `⚠️ Hay ${t.enClaro} clave(s) sin cifrar además de las cifradas. Vuelve a cifrar para protegerlas todas.`),
            (a = "naranja"))
          : t.cifrada
            ? ((o = `🔐 ${t.total} clave(s) cifradas con AES-256-GCM y desbloqueadas en esta sesión. En el archivo solo hay texto cifrado.`),
              (a = "verde"))
            : t.enClaro
              ? ((o = `⚠️ ${t.enClaro} clave(s) SIN cifrar: cualquiera que abra este archivo (o pulse F12 → Sources) puede leerlas.`),
                (a = "naranja"))
              : ((o =
                  "Este archivo no tiene nada que proteger. Rellena el bloque de configuración del principio del archivo y vuelve aquí para cifrarlo."),
                (a = "")),
    (e.className = "aviso" + (a ? " aviso-" + a : "")),
    (e.textContent = o),
    ($("segCifrar").style.display = !t.total || (t.cifrada && !t.abierta) ? "none" : ""),
    ($("segCifrar").textContent =
      t.cifrada && !t.enClaro ? "🔑 Cambiar la contraseña" : "🔐 Cifrar mis claves con contraseña"),
    ($("segDesbloquear").style.display = t.cifrada && !t.abierta ? "" : "none"),
    ($("segBloquear").style.display = t.cifrada && t.abierta ? "" : "none"),
    ($("segPlano").style.display = t.cifrada && t.abierta ? "" : "none"));
}
function abrirCifrar() {
  const e = $("cifrarModal");
  (e.classList.add("active"),
    e.setAttribute("aria-hidden", "false"),
    ($("cifrarPass").value = ""),
    ($("cifrarPass2").value = ""),
    ($("cifrarError").textContent = ""),
    pintarFuerza(),
    setTimeout(() => $("cifrarPass").focus(), 30));
}
function cerrarCifrar() {
  const e = $("cifrarModal");
  (e.classList.remove("active"), e.setAttribute("aria-hidden", "true"));
  const t = $("segCifrar");
  t && t.getClientRects().length && t.focus();
}
function pintarFuerza() {
  const e = fuerzaContrasena($("cifrarPass").value),
    t = $("cifrarFuerzaBarra");
  ((t.style.width = Math.min(100, e.bits) + "%"),
    (t.dataset.nivel = e.nivel),
    ($("cifrarFuerzaTxt").textContent = $("cifrarPass").value
      ? `${e.texto} · ~${e.bits} bits${e.vale ? "" : " · necesita 10+ caracteres y ser al menos «Aceptable»"}`
      : ""));
}
function conectarBoveda() {
  ($("bovedaForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const t = $("bovedaEntrar");
    ((t.disabled = !0), ($("bovedaError").textContent = ""));
    try {
      (await Boveda.desbloquear($("bovedaPass").value, $("bovedaRecordar").checked),
        mostrarBloqueo(!1),
        clavesCambiadas(),
        toast("🔓 Claves desbloqueadas."));
    } catch (e) {
      (($("bovedaError").textContent = e.message), $("bovedaPass").select());
    } finally {
      t.disabled = !1;
    }
  }),
    $("bovedaSin").addEventListener("click", () => {
      (mostrarBloqueo(!1), toast("Sin claves: las IAs en la nube no responderán hasta que desbloquees.", "", 5e3));
    }),
    $("segDesbloquear").addEventListener("click", () => {
      (cerrarAjustes(), mostrarBloqueo(!0));
    }),
    $("segBloquear").addEventListener("click", async () => {
      (await Boveda.bloquear(), clavesCambiadas(), cerrarAjustes(), mostrarBloqueo(!0));
    }),
    $("segPlano").addEventListener("click", () => {
      if (
        confirm(
          "Se descargará una copia con las claves SIN cifrar, para que puedas cambiarlas con el Bloc de notas.\n\nCuando termines, ábrela y vuelve a cifrarlas, y borra esa copia. ¿Seguir?",
        )
      )
        try {
          Boveda.descargarSinCifrar();
        } catch (e) {
          toast(e.message, "mal", 6e3);
        }
    }),
    $("segCifrar").addEventListener("click", abrirCifrar),
    $("cifrarCerrar").addEventListener("click", cerrarCifrar),
    cerrarAlPulsarFuera($("cifrarModal"), cerrarCifrar),
    $("cifrarModal").addEventListener("keydown", (e) => {
      "Escape" === e.key
        ? (e.stopPropagation(), cerrarCifrar())
        : atraparFoco($("cifrarModal").querySelector(".modal-content"), e);
    }),
    $("cifrarPass").addEventListener("input", pintarFuerza),
    $("cifrarForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      const t = $("cifrarPass").value,
        o = $("cifrarPass2").value,
        a = $("cifrarError");
      if (!fuerzaContrasena(t).vale)
        return void (a.textContent = "Contraseña demasiado débil: al menos 10 caracteres y nivel «Aceptable».");
      if (t !== o) return void (a.textContent = "Las dos contraseñas no coinciden.");
      const n = $("cifrarOk");
      ((n.disabled = !0), (a.textContent = ""));
      try {
        (await Boveda.protegerYDescargar(t, $("cifrarRecordar").checked),
          cerrarCifrar(),
          pintarSeguridad(),
          toast("🔐 Descargado «cece-ai.html» con las claves cifradas. Úsalo y borra el antiguo.", "ok", 8e3));
      } catch (e) {
        a.textContent = e.message;
      } finally {
        n.disabled = !1;
      }
    }));
}
const RE_MARCAS =
    /\b(?:anthropic|claude[\w.\-]*|openai|chatgpt|gpt[\w.\-]*|kimi[\w.\-]*|moonshot(?:\.ai)?|deepseek[\w.\-]*|gemini[\w.\-]*|google(?:apis)?|groq|elevenlabs|whisper[\w.\-]*|orpheus[\w.\-]*|pollinations)\b/gi,
  sinMarcas = (e) => String(null == e ? "" : e).replace(RE_MARCAS, "Cece"),
  VIA_ANTES = [
    [/Claude Fable 5\.1|\bClaude\b/g, "Motor Enterprise"],
    [/GPT-6 Astra/g, "Motor Astra"],
    [/ChatGPT · [^+]*|Pollinations \(gratis\)/g, (e) => (/^Poll/.test(e) ? "Cece Imagen (gratis)" : "Cece Imagen")],
    [/\bChatGPT\b/g, "Motor Astra"],
    [/Kimi K2\.7 Code Highspeed/g, "Motor Ultra Code Rápido"],
    [/Kimi K2\.7 Code/g, "Motor Ultra Code"],
    [/Kimi K2\.6/g, "Motor Mini"],
    [/Kimi K3|\bKimi\b/g, "Motor Max"],
    [/DeepSeek V4\.1 Flash|\bDeepSeek\b/g, "Motor Turbo"],
    [/Gemini 3\.8 Flash|\bGemini\b/g, "Motor Mega"],
    [/GPT-OSS 20B \(Groq\)/g, "Motor Reserva Mini"],
    [/GPT-OSS 120B \(Groq\)|\bGroq\b/g, "Motor Reserva"],
    [/IA local · \S+|IA local/g, "Cece Local"],
  ],
  viaCece = (e) =>
    /^🧩/.test(String(e || ""))
      ? String(e)
      : sinMarcas(VIA_ANTES.reduce((e, [t, o]) => e.replace(t, o), String(e || ""))).trim();
class ErrorApi extends Error {
  constructor(e, t = {}) {
    (super(t && "local" === t.prov ? String(e) : sinMarcas(e)), (this.name = "ErrorApi"), Object.assign(this, t));
  }
}
const esAbort = (e) => e && ("AbortError" === e.name || 20 === e.code);
function errorRed(e) {
  return new ErrorApi(
    `No se pudo conectar con ${nombreProv(e)}. Revisa tu conexión a internet (o si un antivirus/cortafuegos bloquea la página).`,
    { prov: e, red: !0, corto: "sin conexión" },
  );
}
async function leerDetalle(e) {
  let t = "";
  try {
    t = await e.text();
  } catch (e) {}
  try {
    const e = JSON.parse(t),
      o = Array.isArray(e) ? e[0] && e[0].error : e.error;
    if (o) {
      if ("string" == typeof o) return o;
      const e = [o.code, o.type, o.status].find((e) => "string" == typeof e && e);
      return (o.message || JSON.stringify(o)) + (e ? ` [${e}]` : "");
    }
    return e.message || (e.detail && ("string" == typeof e.detail ? e.detail : JSON.stringify(e.detail))) || t;
  } catch (e) {
    return t.slice(0, 300);
  }
}
const RE_CLAVE =
    /api[ _-]?key not valid|api_key_invalid|invalid[ _-]?(api[ _-]?)?key|invalid x-api-key|incorrect api key|invalid_api_key|authentication_error|unauthorized/i,
  RE_ES_PARAM =
    /\b(temperature|top_p|top_k|max_tokens|max_output_tokens|reasoning_effort|thinking|param(eter)?s?|field|argument|option)\b/i,
  RE_SALDO =
    /credit balance|insufficient_quota|insufficient[ _](balance|funds|credit)|balance is too low|billing|payment required|exceeded_current_quota|suspended/i;
function errorHttp(e, t, o, a) {
  const n = nombreProv(e),
    r = String(o || "").slice(0, 260);
  if ("local" === e && HUB.base && (401 === t || 403 === t || 429 === t)) {
    return new ErrorApi(
      (401 === t
        ? "CeceHub no acepta el código: pega otra vez su enlace en Configuración → 📴 Sin conexión (¿se cambió con --new-token?)."
        : 429 === t
          ? "CeceHub ha bloqueado esta conexión un rato por códigos incorrectos. Espera unos minutos."
          : "CeceHub no deja pasar esta petición.") + (r ? `\n${r}` : ""),
      { prov: e, status: t, corto: 429 === t ? "límite de uso" : "clave no válida" },
    );
  }
  let i, s;
  return (
    401 === t || RE_CLAVE.test(r) || (403 === t && /key|auth|credential|invalid/i.test(r))
      ? ((i = "La configuración no es válida o no tiene permisos suficientes."), (s = "clave no válida"))
      : 402 === t ||
          (RE_SALDO.test(r) && "gemini" !== e) ||
          (429 === t && "openai" === e && /exceeded your current quota/i.test(r))
        ? ((i = `${n}: sin saldo o sin cuota en la cuenta.`), (s = "sin saldo"))
        : 404 === t ||
            (!RE_ES_PARAM.test(r) &&
              /model.*(not|no).*(found|exist|access)|decommission|deprecat|retired|does not exist|unknown model|invalid model/i.test(
                r,
              ))
          ? ((i = `${n}: el modelo no existe, fue retirado o tu cuenta no tiene acceso.`), (s = "modelo no disponible"))
          : 429 === t
            ? ((i = `${n}: límite de uso alcanzado. Espera un poco o usa otro nivel.`), (s = "límite de uso"))
            : t >= 500
              ? ((i = `${n} tiene problemas ahora mismo (error ${t}).`), (s = "caído"))
              : ((i = `${n} devolvió un error ${t}.`), (s = "error " + t)),
    "clave no válida" === s &&
      "gemini" === e &&
      (i += " Si tu clave es antigua, crea una nueva: las de antes dejan de funcionar en septiembre de 2026."),
    r && (i += `\n${r}`),
    new ErrorApi(i, { prov: e, status: t, corto: s })
  );
}
const errorDeCuenta = (e) => e && ("clave no válida" === e.corto || "sin saldo" === e.corto),
  LIMITE = { conectar: 6e4, silencio: 9e4 },
  errorTiempo = (e) =>
    new ErrorApi(`${nombreProv(e)} no responde (tiempo agotado).`, { prov: e, corto: "tiempo agotado" });
async function fetchConTiempo(e, t, o, a, n = LIMITE.conectar) {
  const r = new AbortController();
  if (a) {
    if (a.aborted) throw new DOMException("stop", "AbortError");
    // (no se quita al llegar las cabeceras: el cuerpo sigue llegando por r y «Parar» tiene que cortarlo)
    a.addEventListener("abort", () => r.abort(), { once: !0 });
  }
  let i;
  const s = new Promise((t, o) => {
    i = setTimeout(() => {
      const t = errorTiempo(e);
      (o(t), r.abort(t));
    }, n);
  });
  try {
    return await Promise.race([fetch(t, { ...o, signal: r.signal }), s]);
  } finally {
    clearTimeout(i);
  }
}
const nivelQueFunciona = {},
  formaCuerpo = (e) => {
    const {
      messages: t,
      input: o,
      contents: a,
      system: n,
      instructions: r,
      systemInstruction: i,
      container: s,
      ...c
    } = e;
    return c;
  },
  RE_ADJUNTO =
    /\b(image|images|img|file|document|pdf|media|base64|inline_?data|attachment)s?\b[^.]{0,80}\b(too large|exceeds?|size|invalid|unsupported|not supported|could not|corrupt|dimensions?|decode)|\b(too large|exceeds?)[^.]{0,40}\b(image|file|document|pdf)/i,
  RE_PARAM =
    /unknown|unsupported|not supported|unrecognized|unexpected|extra (field|input)|invalid.*(param|field|value|type|tool|argument)|not (allowed|permitted|enabled|available)|does not support|additional properties|no such|beta|deprecat/i;
async function postJSON(e, t, o, a, n, r, i = {}) {
  // Cada cuerpo se pasa a JSON una sola vez (con imágenes o PDF pesa megas): sirve para quitar los repetidos y para enviarlo
  const s = [],
    j = [];
  for (const e of o) {
    if (!e) continue;
    const t = JSON.stringify(e);
    j.includes(t) || (s.push(e), j.push(t));
  }
  const c = e + "|" + t + "|" + r + "|" + JSON.stringify(s.map(formaCuerpo));
  let l,
    d = !0;
  for (let o = Math.min(nivelQueFunciona[c] || 0, s.length - 1); o < s.length; o++) {
    let u;
    try {
      u = await fetchConTiempo(e, t, { method: "POST", headers: a, body: j[o] }, n, i.tiempo);
    } catch (t) {
      if (esAbort(t) || t instanceof ErrorApi) throw t;
      throw errorRed(e);
    }
    if (u.ok) return (s.length > 1 && d && !1 !== i.recordar && (nivelQueFunciona[c] = o), (u.cuerpo = s[o]), u);
    const m = await leerDetalle(u);
    if (((l = errorHttp(e, u.status, m, r)), 429 === u.status && i.saltarSiLimite && s[o].tools)) {
      const e = s.findIndex((e, t) => t > o && !e.tools);
      if (e > o) {
        ((o = e - 1), (d = !1));
        continue;
      }
    }
    if ((400 !== u.status && 422 !== u.status) || "modelo no disponible" === l.corto || errorDeCuenta(l)) throw l;
    if (RE_ADJUNTO.test(m)) throw ((l.corto = "adjunto no válido"), l);
    RE_PARAM.test(m) || (d = !1);
  }
  throw l;
}
async function leerSSE(e, t, o) {
  if (/application\/json/.test(e.headers.get("content-type") || "")) {
    const a = await e.text();
    let n = null;
    try {
      n = JSON.parse(a);
    } catch (e) {}
    const r = n && (Array.isArray(n) ? n[0] && n[0].error : n.error);
    if (r)
      throw new ErrorApi(`${nombreProv(o)}: ${"string" == typeof r ? r : r.message || "error"}`, {
        prov: o,
        corto: "error",
      });
    return void t(null, a);
  }
  const a = e.body.getReader(),
    n = new TextDecoder();
  let r = "",
    i = null,
    s = [];
  const despachar = () => {
      (s.length && t(i, s.join("\n")), (i = null), (s = []));
    },
    linea = (e) => {
      if ("" === e) return despachar();
      if (":" === e[0]) return;
      const t = e.indexOf(":"),
        o = t < 0 ? e : e.slice(0, t);
      let a = t < 0 ? "" : e.slice(t + 1);
      (" " === a[0] && (a = a.slice(1)), "event" === o ? (i = a) : "data" === o && s.push(a));
    };
  try {
    for (;;) {
      let e;
      const t = new Promise((t, a) => {
        e = setTimeout(() => a(errorTiempo(o)), LIMITE.silencio);
      });
      let i, s;
      try {
        i = await Promise.race([a.read(), t]);
      } finally {
        clearTimeout(e);
      }
      if (i.done) break;
      for (r += n.decode(i.value, { stream: !0 }); (s = r.indexOf("\n")) >= 0;)
        (linea(r.slice(0, s).replace(/\r$/, "")), (r = r.slice(s + 1)));
    }
    ((r += n.decode()), r && linea(r.replace(/\r$/, "")), despachar());
  } catch (e) {
    try {
      a.cancel().catch(() => {});
    } catch (e) {}
    throw e;
  }
}
const ESF = {
  bajo: { tok: 1024, razon: "low", gpt: "low", claude: "low", pensar: !1, temp: 0.6 },
  medio: { tok: 2048, razon: "medium", gpt: "medium", claude: "medium", pensar: !1, temp: 0.7 },
  alto: { tok: 4096, razon: "high", gpt: "high", claude: "high", pensar: !0, temp: 0.7 },
  extra: { tok: 8192, razon: "high", gpt: "xhigh", claude: "xhigh", pensar: !0, temp: 0.7 },
  max: { tok: 16384, razon: "high", gpt: "max", claude: "max", pensar: !0, temp: 0.7 },
  ultracode: { tok: 16384, razon: "high", gpt: "xhigh", claude: "xhigh", pensar: !0, temp: 0.3 },
};
function herramientasDelCuerpo(e) {
  const t = new Set();
  for (const o of (e && e.tools) || []) {
    const a = String((o.function && o.function.name) || o.name || o.type || Object.keys(o)[0] || "");
    (/search|buscar_web/.test(a) && (t.add("buscar"), e.input && t.add("leer")),
      /fetch|leer_web|url_context/.test(a) && t.add("leer"),
      /code/.test(a) && t.add("codigo"),
      /advisor/.test(a) && t.add("asesor"));
  }
  return t;
}
function ponerSistema(e, t) {
  if (!t.sis) return e;
  const o = t.sis(herramientasDelCuerpo(e));
  return "system" in e
    ? { ...e, system: o }
    : "instructions" in e
      ? { ...e, instructions: o }
      : e.systemInstruction
        ? { ...e, systemInstruction: { parts: [{ text: o }] } }
        : e.messages && e.messages[0] && "system" === e.messages[0].role
          ? { ...e, messages: [{ role: "system", content: o }, ...e.messages.slice(1)] }
          : e;
}
function alternar(e) {
  const t = [];
  for (const o of e) {
    const e = Array.isArray(o.adjuntos) && o.adjuntos.length ? o.adjuntos : null;
    if (!o.content && !e) continue;
    const a = "assistant" === o.role ? "assistant" : "user",
      n = t[t.length - 1];
    n && n.role === a
      ? ((n.content = [n.content, o.content].filter(Boolean).join("\n\n")),
        e && (n.adjuntos = (n.adjuntos || []).concat(e)))
      : t.push(e ? { role: a, content: o.content || "", adjuntos: e } : { role: a, content: o.content });
  }
  for (; t.length && "user" !== t[0].role;) t.shift();
  return t;
}
const conAdj = (e) => e.adjuntos && e.adjuntos.length,
  nuevasFuentes = () => {
    const e = [],
      t = new Set();
    return {
      lista: e,
      add(o, a) {
        o && !t.has(o) && /^https?:/i.test(o) && (t.add(o), e.push({ url: o, titulo: a || o }));
      },
    };
  },
  COSTE_WEB_KIMI = 0.002,
  FUNC_WEB = {
    buscar: {
      type: "function",
      function: {
        name: "buscar_web",
        description:
          "Busca en internet. Devuelve resultados actuales con título, enlace, fecha y extracto. Úsala para noticias, precios, datos recientes o lo que no sepas seguro.",
        parameters: {
          type: "object",
          properties: { consulta: { type: "string", description: "Qué buscar, en pocas palabras" } },
          required: ["consulta"],
        },
      },
    },
    leer: {
      type: "function",
      function: {
        name: "leer_web",
        description:
          "Abre una página web y devuelve su texto (Markdown). Úsala cuando te pasen un enlace o necesites leer un resultado entero.",
        parameters: {
          type: "object",
          properties: { url: { type: "string", description: "Enlace completo que empieza por http:// o https://" } },
          required: ["url"],
        },
      },
    },
  },
  URL_RE = /https?:\/\/[^\s<>"'`\)\]]+/gi,
  normUrl = (e) =>
    String(e || "")
      .trim()
      .replace(/[.,;:!?»”]+$/, "")
      .replace(/\/+$/, "")
      .toLowerCase(),
  enlacesDe = (e) => (String(e || "").match(URL_RE) || []).map(normUrl);
async function herramientaKimi(e, t, o, a, n) {
  const r = { "Content-Type": "application/json", Authorization: "Bearer " + claveDe("moonshot") },
    pedir = async (e, t) => {
      let a;
      try {
        a = await fetchConTiempo(
          "moonshot",
          baseDe("moonshot") + e,
          { method: "POST", headers: r, body: JSON.stringify(t) },
          o.signal,
        );
      } catch (e) {
        if (esAbort(e)) throw e;
        return { error: e instanceof ErrorApi && "tiempo agotado" === e.corto ? "tiempo agotado" : "sin conexión" };
      }
      if (!a.ok) return { error: `error ${a.status}: ${String(await leerDetalle(a)).slice(0, 160)}` };
      try {
        return await a.json();
      } catch (e) {
        return { error: "respuesta no válida" };
      }
    };
  if ("buscar_web" === e) {
    const e = String(t.consulta || t.query || "").trim();
    if (!e) return { texto: "Error: falta la consulta." };
    o.onActividad && o.onActividad(`🔎 Buscando «${e.slice(0, 80)}»`);
    const r = await pedir("/tools/search", { text_query: e, limit: 6 });
    if (r.error) return { texto: "No se pudo buscar (" + r.error + ")." };
    const i = (r.search_results || []).slice(0, 6);
    return (
      i.forEach((e) => {
        (a.add(e.url, e.title), n.add(normUrl(e.url)));
      }),
      {
        cobra: i.length > 0,
        texto: i.length
          ? JSON.stringify(
              i.map((e) => ({
                titulo: e.title,
                url: e.url,
                fecha: e.date || void 0,
                extracto: String(e.snippet || e.text || "").slice(0, 600),
              })),
            )
          : "Sin resultados.",
      }
    );
  }
  if ("leer_web" === e) {
    const e = String(t.url || "").trim();
    if (!/^https?:\/\//i.test(e)) return { texto: "Error: el enlace debe empezar por http:// o https://" };
    if (!n.has(normUrl(e)))
      return {
        texto:
          "Error: solo puedes abrir enlaces que haya escrito el usuario o que hayan salido en una búsqueda o en una página ya leída. Búscalo primero con buscar_web.",
      };
    o.onActividad && o.onActividad(`🌐 Leyendo ${e.slice(0, 90)}`);
    const r = await pedir("/tools/fetch", { url: e });
    if (r.error) return { texto: "No se pudo abrir la página (" + r.error + ")." };
    const i = String(r.markdown || "");
    return (
      a.add(r.url || e, r.title),
      enlacesDe(i).forEach((e) => n.add(e)),
      {
        cobra: !!i.trim(),
        texto: i.trim()
          ? `# ${r.title || e}\n${i.slice(0, 16e3)}${i.length > 16e3 ? "\n[… recortado]" : ""}`
          : "La página no tiene texto legible.",
      }
    );
  }
  return { texto: `Error: la herramienta «${e}» no existe.` };
}
async function chatOpenAI(e, t) {
  const o = PROVEEDORES[e],
    a = t.h || new Set(),
    n = ESF[t.esf] || ESF.medio,
    r = t.rapido ? "bajo" : t.esf,
    i = o.razona && o.razona(t.modelo) ? (o.esfuerzos && o.esfuerzos[r]) || n.razon : null,
    s = o.piensa ? o.piensa(t.modelo, r, i) : !!i,
    c = {
      "Content-Type": "application/json",
      ...(claveDe(e) ? { Authorization: "Bearer " + claveDe(e) } : {}),
      ...("local" === e && HUB.base ? HUB.extra : {}),
    },
    l = [],
    d = [];
  o.webKimi
    ? (a.has("buscar") && d.push(FUNC_WEB.buscar), a.has("leer") && d.push(FUNC_WEB.leer))
    : (a.has("buscar") && l.push({ type: "browser_search" }),
      (a.has("codigo") || a.has("buscar")) && l.push({ type: "code_interpreter" }));
  const u = [
      { role: "system", content: t.sistema },
      ...alternar(t.mensajes).map((e) => (conAdj(e) ? { role: e.role, content: partesOpenAI(e) } : e)),
    ],
    m = new Set(t.mensajes.filter((e) => "user" === e.role).flatMap((e) => enlacesDe(e.content))),
    h = !(!o.interruptor || !o.interruptor(t.modelo)),
    conRazonPrevia = (e) =>
      o.razonPrevia && s
        ? e.map((e) => ("assistant" === e.role && null == e.reasoning_content ? { ...e, reasoning_content: "" } : e))
        : e,
    cuerpos = (e) => {
      const a = {
          model: t.modelo,
          messages: u,
          stream: !0,
          max_tokens: s
            ? o.margenPensar
              ? Math.max(2 * t.maxTok, o.margenPensar)
              : Math.max(2 * t.maxTok, 8192)
            : t.maxTok,
        },
        r = { ...a };
      (o.sinTemp || (r.temperature = t.temp ?? n.temp),
        !i || (h && !s) || (r.reasoning_effort = i),
        h && (r.thinking = { type: s ? "enabled" : "disabled" }),
        "stream_options" === o.usage && (r.stream_options = { include_usage: !0 }));
      const c = h ? { ...a, thinking: r.thinking } : null;
      if (d.length)
        return [{ ...r, messages: conRazonPrevia(u), tools: d, tool_choice: e ? "none" : "auto" }, r, c, a].filter(
          Boolean,
        );
      const m = [r, c, a].filter(Boolean);
      if (l.length) {
        const e = { ...r, tools: l, tool_choice: "auto" };
        "high" === r.reasoning_effort && (e.reasoning_effort = "medium");
        const t = { ...e, tools: l.slice(0, 1) };
        m.unshift(e, t, { ...e, stream: !1 }, { ...t, stream: !1 });
        for (const e of m) !1 === e.stream && delete e.stream_options;
      }
      return m;
    };
  let g = "",
    v = "",
    E = null,
    y = null,
    A = null,
    w = !1;
  const C = nuevasFuentes(),
    j = new Map(),
    ejecutadas = (e) => {
      for (const [o, a] of (e || []).entries()) {
        const e = String(a.index ?? o) + "|" + (a.name || a.type || ""),
          n = j.get(e) || { act: !1, sal: !1, fuentes: !1 };
        j.set(e, n);
        const r = String(a.type || "") + " " + String(a.name || ""),
          i = a.search_results && (a.search_results.results || a.search_results);
        if (/search/.test(r) || (Array.isArray(i) && i.length))
          (n.act ||
            ((n.act = !0),
            t.onActividad &&
              t.onActividad(
                "🔎 Buscando en internet" +
                  (a.arguments
                    ? ": " +
                      String(a.arguments)
                        .replace(/[{}"]/g, "")
                        .replace(/^\s*query\s*:\s*/, "")
                        .slice(0, 80)
                    : "…"),
              )),
            Array.isArray(i) && i.length && !n.fuentes && ((n.fuentes = !0), i.forEach((e) => C.add(e.url, e.title))));
        else if (/code|python/.test(r) || a.code_results) {
          if (!n.act) {
            ((n.act = !0), t.onActividad && t.onActividad("🧮 Ejecutando código…"));
            let e = String(a.arguments || "");
            try {
              const t = JSON.parse(e);
              t && "string" == typeof t.code && (e = t.code);
            } catch (e) {}
            t.onEjec && t.onEjec({ nuevo: !0, lenguaje: "python", codigo: e });
          }
          const e =
            (a.code_results || [])
              .map((e) => e.text || e.output || "")
              .filter(Boolean)
              .join("\n") || ("string" == typeof a.output ? a.output : "");
          e && !n.sal && ((n.sal = !0), t.onEjec && t.onEjec({ fin: !0, salida: e }));
        }
      }
    },
    uso = (e) => {
      e &&
        (e.completion_tokens || e.prompt_tokens) &&
        ((E = E || { in: 0, out: 0 }), (E.in += e.prompt_tokens || 0), (E.out += e.completion_tokens || 0));
    };
  for (let o = 0; o < 5; o++) {
    const a = await postJSON(
      e,
      baseDe(e) + "/chat/completions",
      cuerpos(4 === o).map((e) => ponerSistema(e, t)),
      c,
      t.signal,
      t.modelo,
      { recordar: !o },
    );
    o || (A = herramientasDelCuerpo(a.cuerpo));
    let n = "",
      r = "",
      i = [];
    if (((y = null), (w = !1), /event-stream/.test(a.headers.get("content-type") || ""))) {
      let o = null;
      (await leerSSE(
        a,
        (a, s) => {
          if ("[DONE]" === s) return void (w = !0);
          let c;
          try {
            c = JSON.parse(s);
          } catch (a) {
            return;
          }
          if (c.error)
            throw new ErrorApi(`${nombreProv(e)}: ${c.error.message || JSON.stringify(c.error)}`, {
              prov: e,
              corto: "error",
            });
          const l = c.choices && c.choices[0];
          if (l) {
            const e = l.delta || l.message || {},
              o = e.reasoning_content || e.reasoning;
            ("string" == typeof o && o && ((r += o), t.onRazon && t.onRazon(o)),
              "string" == typeof e.content && e.content && ((n += e.content), t.onTexto && t.onTexto(e.content)),
              ejecutadas(e.executed_tools));
            for (const t of e.tool_calls || []) {
              const e = t.index ?? i.length,
                o = i[e] || (i[e] = { id: "", type: "function", function: { name: "", arguments: "" } });
              (t.id && (o.id = t.id),
                t.function && t.function.name && !o.function.name && (o.function.name = t.function.name),
                t.function && t.function.arguments && (o.function.arguments += t.function.arguments));
            }
            l.finish_reason && ((y = l.finish_reason), (w = !0));
          }
          const d = c.usage || (c.choices && c.choices[0] && c.choices[0].usage) || (c.x_groq && c.x_groq.usage);
          d && (d.completion_tokens || d.prompt_tokens) && (o = d);
        },
        e,
      ),
        uso(o));
    } else {
      const o = await a.json();
      if (o.error)
        throw new ErrorApi(`${nombreProv(e)}: ${o.error.message || JSON.stringify(o.error)}`, {
          prov: e,
          corto: "error",
        });
      w = !0;
      const s = (o.choices && o.choices[0] && o.choices[0].message) || {};
      (ejecutadas(s.executed_tools),
        (r = s.reasoning_content || s.reasoning || ""),
        r && t.onRazon && t.onRazon(r),
        (n = s.content || ""),
        n && t.onTexto && t.onTexto(n),
        (i = Array.isArray(s.tool_calls) ? s.tool_calls : []),
        (y = o.choices && o.choices[0] && o.choices[0].finish_reason),
        uso(o.usage));
    }
    if (
      ((g += n), (v += r), (i = i.filter((e) => e && e.function && e.function.name)), !d.length || !i.length || 4 === o)
    )
      break;
    const l = {
      role: "assistant",
      content: n,
      tool_calls: i.map((e, t) => ({ id: e.id || "call_" + o + "_" + t, type: "function", function: e.function })),
    };
    ((r || s) && (l.reasoning_content = r), u.push(l));
    for (const [e, o] of l.tool_calls.entries()) {
      let a = {};
      try {
        a = JSON.parse(o.function.arguments || "{}");
      } catch (e) {}
      const n =
        e < 5
          ? await herramientaKimi(o.function.name, a, t, C, m)
          : { texto: "Error: demasiadas llamadas a la vez; usa como mucho 5." };
      (n.cobra && (sesion.coste += COSTE_WEB_KIMI),
        u.push({ role: "tool", tool_call_id: o.id, name: o.function.name, content: n.texto }));
    }
    n && !/\s$/.test(n) && ((g += "\n\n"), t.onTexto && t.onTexto("\n\n"));
  }
  return {
    texto: g,
    razon: v,
    usage: E,
    fin: y,
    fuentes: C.lista,
    usadas: A,
    cortado: /length/.test(y || "") ? "tokens" : w ? null : "red",
  };
}
async function chatResponses(e, t) {
  const o = t.h || new Set(),
    a = ESF[t.esf] || ESF.medio,
    n = { "Content-Type": "application/json", Authorization: "Bearer " + claveDe(e) },
    r = t.rapido ? "low" : a.gpt || a.razon,
    i = {
      model: t.modelo,
      instructions: t.sistema,
      input: alternar(t.mensajes).map((e) => ({ role: e.role, content: conAdj(e) ? partesResponses(e) : e.content })),
      stream: !0,
      store: !1,
      max_output_tokens: Math.max(2 * t.maxTok, { xhigh: 64e3, max: 1e5 }[r] || 25e3),
    },
    s = { ...i, reasoning: { effort: r, summary: "auto" } },
    c = { ...i, reasoning: { effort: r } },
    l = "xhigh" === r || "max" === r ? { ...i, reasoning: { effort: "high" } } : null,
    d = (String(S.idioma || "").split("-")[1] || "").toUpperCase(),
    u = o.has("buscar") || o.has("leer") ? [{ type: "web_search" }] : [],
    m =
      u.length && /^[A-Z]{2}$/.test(d)
        ? [{ type: "web_search", user_location: { type: "approximate", country: d } }]
        : u,
    h = o.has("codigo") ? [{ type: "code_interpreter", container: { type: "auto" } }] : [],
    g = u.length || h.length ? { tools: [...u, ...h] } : null;
  h.length && (g.include = ["code_interpreter_call.outputs"]);
  const v = (
      g
        ? [
            { ...s, ...g, tools: [...m, ...h] },
            { ...s, ...g },
            { ...c, ...g },
            l && { ...l, ...g },
            { ...i, ...g },
            ...(u.length && h.length ? [{ ...c, tools: u }] : []),
            s,
            c,
            l,
            i,
          ]
        : [s, c, l, i]
    ).filter(Boolean),
    E = await postJSON(
      e,
      baseDe(e) + "/responses",
      v.map((e) => ponerSistema(e, t)),
      n,
      t.signal,
      t.modelo,
    );
  let y = "",
    A = "",
    w = null,
    C = null,
    j = !1;
  const x = nuevasFuentes(),
    salidasCodigo = (e) => {
      const o = [],
        a = [];
      for (const t of e.outputs || [])
        "logs" === t.type && t.logs ? o.push(t.logs) : "image" === t.type && t.url && a.push(t.url);
      t.onEjec && t.onEjec({ fin: !0, codigo: e.code, salida: o.join("\n"), imagenes: a });
    };
  return (
    await leerSSE(
      E,
      (o, a) => {
        let n;
        try {
          n = JSON.parse(a);
        } catch (e) {
          return;
        }
        const r = n.type || o || "",
          i = n.item || {};
        if ("response.output_text.delta" === r && n.delta) ((y += n.delta), t.onTexto && t.onTexto(n.delta));
        else if (/^response\.reasoning(_summary)?_text\.delta$/.test(r) && n.delta)
          ((A += n.delta), t.onRazon && t.onRazon(n.delta));
        else if ("response.output_text.annotation.added" === r && n.annotation)
          x.add(n.annotation.url, n.annotation.title);
        else if ("response.code_interpreter_call_code.delta" === r && n.delta) t.onEjec && t.onEjec({ mas: n.delta });
        else if ("response.output_item.added" === r && "web_search_call" === i.type)
          t.onActividad && t.onActividad("🔎 Buscando en internet…");
        else if ("response.output_item.added" === r && "code_interpreter_call" === i.type)
          (t.onActividad && t.onActividad("🧮 Ejecutando código…"),
            t.onEjec && t.onEjec({ nuevo: !0, lenguaje: "python", codigo: i.code || "" }));
        else if ("response.output_item.done" === r && "code_interpreter_call" === i.type) salidasCodigo(i);
        else if ("response.output_item.done" === r && "web_search_call" === i.type && i.action) {
          const e = i.action,
            o = (Array.isArray(e.queries) && e.queries[0]) || e.query;
          o
            ? t.onActividad && t.onActividad(`🔎 Buscando «${o}»`)
            : e.url && t.onActividad && t.onActividad(`🌐 Leyendo ${e.url}`);
        } else if ("response.completed" === r || "response.incomplete" === r) {
          j = !0;
          const e = n.response || {};
          (e.usage && (w = { in: e.usage.input_tokens || 0, out: e.usage.output_tokens || 0 }),
            "response.incomplete" === r && (C = (e.incomplete_details && e.incomplete_details.reason) || "incomplete"));
          for (const o of e.output || []) {
            for (const e of o.content || []) for (const t of e.annotations || []) x.add(t.url, t.title);
            if (!y && "message" === o.type)
              for (const e of o.content || [])
                "output_text" === e.type && e.text && ((y += e.text), t.onTexto && t.onTexto(e.text));
          }
        } else if ("response.failed" === r || "error" === r) {
          const t = (n.response && n.response.error) || n.error || n;
          throw new ErrorApi(`${nombreProv(e)}: ${t.message || "error"}`, { prov: e, corto: "error" });
        }
      },
      e,
    ),
    {
      texto: y,
      razon: A,
      usage: w,
      fin: C,
      fuentes: x.lista,
      usadas: herramientasDelCuerpo(E.cuerpo),
      cortado: /max_output_tokens|max_tokens|length/.test(C || "") ? "tokens" : j ? null : "red",
    }
  );
}
function headersClaude(e) {
  const t = {
    "Content-Type": "application/json",
    "x-api-key": claveDe("anthropic"),
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true",
  };
  return (e && (t["anthropic-beta"] = e), t);
}
const CLAUDE_H = {
    buscar: [
      { type: "web_search_20260318", name: "web_search", max_uses: 5, allowed_callers: ["direct"] },
      { type: "web_search_20250305", name: "web_search", max_uses: 5 },
    ],
    leer: [
      {
        type: "web_fetch_20260318",
        name: "web_fetch",
        max_uses: 5,
        max_content_tokens: 4e4,
        allowed_callers: ["direct"],
      },
    ],
    codigo: [{ type: "code_execution_20260521", name: "code_execution" }],
    asesor: [{ type: "advisor_20260301", name: "advisor", model: "claude-fable-5-1", max_uses: 2 }],
  },
  BETA_ASESOR = "advisor-tool-2026-03-01";
async function chatClaude(e, t) {
  const o = t.h || new Set(),
    a = ESF[t.esf] || ESF.medio,
    n = a.pensar && !t.rapido,
    r = alternar(t.mensajes).map((e) => (conAdj(e) ? { role: e.role, content: partesClaude(e) } : e)),
    i = ["buscar", "leer", "codigo", "asesor"].filter((e) => o.has(e)),
    juego = (e) => i.map((t) => CLAUDE_H[t][Math.min(e, CLAUDE_H[t].length - 1)]),
    s = t.rapido
      ? 8192
      : { bajo: 16e3, medio: 16e3, alto: 32e3, extra: 64e3, max: 64e3, ultracode: 64e3 }[t.esf] || 16e3,
    cuerpos = () => {
      const e = { model: t.modelo, max_tokens: Math.max(t.maxTok, s), system: t.sistema, messages: r, stream: !0 },
        c = { ...e, output_config: { effort: t.rapido ? "low" : a.claude } };
      if ((n && (c.thinking = { type: "adaptive", display: "summarized" }), !i.length))
        return n ? [c, { ...c, thinking: { type: "adaptive" } }, e] : [c, e];
      const l = [
          { ...c, tools: juego(0) },
          { ...c, tools: juego(1) },
        ],
        d = juego(1).filter((e) => "advisor" !== e.name);
      (d.length && l.push({ ...c, tools: d }),
        o.has("buscar") && l.push({ ...c, tools: [CLAUDE_H.buscar[1]] }, { ...e, tools: [CLAUDE_H.buscar[1]] }));
      const u = [...l, c, e];
      return h
        ? u.map((e) => ((e.tools || []).some((e) => "code_execution" === e.name) ? { ...e, container: h } : e))
        : u;
    };
  let c = "",
    l = "",
    d = { in: 0, out: 0 },
    u = null,
    m = null,
    h = null,
    g = "";
  const v = nuevasFuentes(),
    act = (e) => t.onActividad && t.onActividad(e);
  for (let a = 0; a < 5; a++) {
    const n = await postJSON(
      e,
      baseDe("anthropic") + "/messages",
      cuerpos().map((e) => ponerSistema(e, t)),
      headersClaude(o.has("asesor") ? BETA_ASESOR : ""),
      t.signal,
      t.modelo,
      { recordar: !a },
    );
    a || (m = herramientasDelCuerpo(n.cuerpo));
    const i = [];
    u = null;
    let s = 0;
    if (
      (await leerSSE(
        n,
        (o, a) => {
          let n;
          try {
            n = JSON.parse(a);
          } catch (e) {
            return;
          }
          const r = n.type || o;
          if ("error" === r)
            throw new ErrorApi(`${nombreProv(e)}: ${(n.error && n.error.message) || "error"}`, {
              prov: e,
              corto: (n.error && n.error.type) || "error",
            });
          const m = (n.message && n.message.container) || (n.delta && n.delta.container) || n.container;
          if ((m && m.id && (h = m.id), "message_start" === r && n.message && n.message.usage))
            s = n.message.usage.input_tokens || 0;
          else if ("content_block_start" === r && n.content_block) {
            const e = JSON.parse(JSON.stringify(n.content_block));
            if (
              ("text" === e.type &&
                c &&
                "text" !== g &&
                !/\s$/.test(c) &&
                ((c += "\n\n"), t.onTexto && t.onTexto("\n\n")),
              (g = e.type),
              (i[n.index] = e),
              /_tool_result$/.test(e.type))
            ) {
              const o = e.content;
              (Array.isArray(o)
                ? o.forEach((e) => v.add(e.url, e.title))
                : o && o.url && v.add(o.url, o.title || (o.content && o.content.title)),
                /code_execution/.test(e.type) && o
                  ? "text_editor_code_execution_view_result" === o.type
                    ? t.onEjec && t.onEjec({ fin: !0, salida: o.content || "" })
                    : null != o.stdout || null != o.stderr || null != o.return_code
                      ? t.onEjec &&
                        t.onEjec({
                          fin: !0,
                          salida: o.stdout || "",
                          error: o.stderr || (o.return_code ? "código de salida " + o.return_code : ""),
                        })
                      : /error/.test(o.type || "")
                        ? t.onEjec && t.onEjec({ fin: !0, error: o.error_code || "error" })
                        : t.onEjec && t.onEjec({ fin: !0 })
                  : "advisor_tool_result" === e.type &&
                    o &&
                    ("advisor_tool_result_error" === o.type
                      ? act(`🎓 El asesor no pudo responder (${o.error_code || "error"})`)
                      : "advisor_result" === o.type && o.text
                        ? ((l += "\n[Asesor] " + o.text), t.onRazon && t.onRazon("\n[Asesor] " + o.text))
                        : act("🎓 El asesor ha respondido")));
            }
          } else if ("content_block_delta" === r && n.delta) {
            const e = i[n.index] || (i[n.index] = { type: "text", text: "" }),
              o = n.delta;
            "text_delta" === o.type && o.text
              ? ((e.text = (e.text || "") + o.text), (c += o.text), t.onTexto && t.onTexto(o.text))
              : "thinking_delta" === o.type && o.thinking
                ? ((e.thinking = (e.thinking || "") + o.thinking),
                  (l += o.thinking),
                  t.onRazon && t.onRazon(o.thinking))
                : "signature_delta" === o.type
                  ? (e.signature = o.signature)
                  : "input_json_delta" === o.type
                    ? (e._json = (e._json || "") + (o.partial_json || ""))
                    : "citations_delta" === o.type &&
                      o.citation &&
                      ((e.citations = e.citations || []).push(o.citation), v.add(o.citation.url, o.citation.title));
          } else if ("content_block_stop" === r) {
            const e = i[n.index];
            if (e && null != e._json) {
              try {
                e.input = JSON.parse(e._json || "{}");
              } catch (t) {
                e.input = {};
              }
              delete e._json;
            }
            if (e && "server_tool_use" === e.type) {
              const o = e.input || {};
              if ("web_search" === e.name) act(`🔎 Buscando «${o.query || "…"}»`);
              else if ("web_fetch" === e.name) act(`🌐 Leyendo ${o.url || "una página"}`);
              else if ("advisor" === e.name) act("🎓 Consultando al asesor…");
              else if (/code_execution/.test(e.name || "")) {
                act("🧮 Ejecutando código…");
                const a = /text_editor/.test(e.name),
                  n = a ? (o.file_text ?? o.new_str ?? "") : (o.command ?? o.code ?? "");
                t.onEjec &&
                  t.onEjec({
                    nuevo: !0,
                    lenguaje: /bash/.test(e.name) ? "bash" : a ? String(o.command || "archivo") : "python",
                    codigo: String(n),
                    archivo: o.path || "",
                  });
              }
            }
          } else
            "message_delta" === r &&
              (n.usage && n.usage.output_tokens && (d.out += n.usage.output_tokens),
              n.usage && n.usage.input_tokens && (s = Math.max(s, n.usage.input_tokens)),
              n.delta && n.delta.stop_reason && (u = n.delta.stop_reason));
        },
        e,
      ),
      (d.in += s),
      "pause_turn" !== u)
    )
      break;
    r.push({ role: "assistant", content: i.filter(Boolean) });
  }
  return {
    texto: c,
    razon: l,
    usage: d.out ? d : null,
    fin: u,
    fuentes: v.lista,
    usadas: m,
    cortado:
      "max_tokens" === u || "model_context_window_exceeded" === u
        ? "tokens"
        : "pause_turn" === u
          ? "pausa"
          : "refusal" === u
            ? "rechazo"
            : u
              ? null
              : "red",
  };
}
async function chatGemini(e, t) {
  const o = t.h || new Set(),
    a = ESF[t.esf] || ESF.medio,
    n = `${baseDe("gemini")}/models/${encodeURIComponent(String(t.modelo).replace(/^models\//, ""))}:streamGenerateContent?alt=sse`,
    r = { "Content-Type": "application/json", "x-goog-api-key": claveDe("gemini") },
    i = { maxOutputTokens: Math.min(65536, Math.max(4 * t.maxTok, 16384)) };
  +((/gemini-(\d+)/i.exec(t.modelo) || [])[1] || 0) < 3 && (i.temperature = t.temp ?? a.temp);
  const c = {
      contents: alternar(t.mensajes).map((e) => ({
        role: "assistant" === e.role ? "model" : "user",
        parts: conAdj(e) ? partesGemini(e) : [{ text: e.content }],
      })),
      systemInstruction: { parts: [{ text: t.sistema }] },
      generationConfig: i,
    },
    l = {
      ...c,
      generationConfig: {
        ...i,
        thinkingConfig: { includeThoughts: !0, ...(t.rapido ? { thinkingLevel: "low" } : {}) },
      },
    },
    d = { buscar: { google_search: {} }, leer: { url_context: {} }, codigo: { code_execution: {} } },
    u = ["buscar", "leer", "codigo"].filter((e) => o.has(e)).map((e) => d[e]),
    m = u.length
      ? [
          { ...l, tools: u },
          { ...c, tools: u },
        ]
      : [];
  (u.length > 1 &&
    (o.has("codigo") && m.push({ ...c, tools: [d.codigo] }), o.has("buscar") && m.push({ ...c, tools: [d.buscar] })),
    m.push(l, c));
  const h = await postJSON(
    e,
    n,
    m.map((e) => ponerSistema(e, t)),
    r,
    t.signal,
    t.modelo,
    { saltarSiLimite: !0 },
  );
  let g = "",
    v = "",
    E = null,
    y = null;
  const A = nuevasFuentes();
  return (
    await leerSSE(
      h,
      (o, a) => {
        let n;
        try {
          n = JSON.parse(a);
        } catch (o) {
          return;
        }
        if (n.error) throw new ErrorApi(`${nombreProv(e)}: ${n.error.message || "error"}`, { prov: e, corto: "error" });
        if (n.promptFeedback && n.promptFeedback.blockReason)
          throw new ErrorApi(`${nombreProv(e)} bloqueó la petición (${n.promptFeedback.blockReason}).`, {
            prov: e,
            corto: "bloqueado",
          });
        const r = n.candidates && n.candidates[0];
        if (r) {
          for (const e of (r.content && r.content.parts) || []) {
            const o = e.executableCode || e.executable_code,
              a = e.codeExecutionResult || e.code_execution_result,
              n = e.inlineData || e.inline_data;
            if (o)
              (t.onActividad && t.onActividad("🧮 Ejecutando código…"),
                t.onEjec &&
                  t.onEjec({
                    nuevo: !0,
                    lenguaje: String(o.language || "python").toLowerCase(),
                    codigo: o.code || "",
                  }));
            else if (a) {
              const e = !a.outcome || "OUTCOME_OK" === a.outcome;
              t.onEjec && t.onEjec({ fin: !0, salida: (e && a.output) || "", error: e ? "" : a.output || a.outcome });
            } else
              n && /^image\//.test(n.mimeType || n.mime_type || "") && n.data
                ? t.onEjec && t.onEjec({ imagenes: [`data:${n.mimeType || n.mime_type};base64,${n.data}`] })
                : "string" == typeof e.text &&
                  e.text &&
                  (e.thought
                    ? ((v += e.text), t.onRazon && t.onRazon(e.text))
                    : ((g += e.text), t.onTexto && t.onTexto(e.text)));
          }
          const e = r.groundingMetadata;
          if (e) {
            e.webSearchQueries &&
              e.webSearchQueries.length &&
              t.onActividad &&
              t.onActividad(`🔎 Buscando «${e.webSearchQueries[0]}»`);
            for (const t of e.groundingChunks || []) t.web && A.add(t.web.uri, t.web.title);
          }
          for (const e of (r.urlContextMetadata && r.urlContextMetadata.urlMetadata) || [])
            /SUCCESS/.test(e.urlRetrievalStatus || "") && A.add(e.retrievedUrl);
          r.finishReason && (y = r.finishReason);
        }
        const i = n.usageMetadata;
        i && (E = { in: i.promptTokenCount || 0, out: (i.candidatesTokenCount || 0) + (i.thoughtsTokenCount || 0) });
      },
      e,
    ),
    {
      texto: g,
      razon: v,
      usage: E,
      fin: y,
      fuentes: A.lista,
      usadas: herramientasDelCuerpo(h.cuerpo),
      cortado: "MAX_TOKENS" === y ? "tokens" : y ? null : "red",
    }
  );
}
const motorBusca = (e) => herramientasDe(e).has("buscar"),
  AVISO_WEB = {
    si: "Puedes buscar en internet y leer páginas web cuando haga falta información actual o el usuario te pase un enlace. Cita las fuentes que uses.",
    no: "En esta respuesta no tienes acceso a internet: no digas que has buscado ni inventes fuentes o enlaces. Si te piden datos de actualidad o abrir un enlace, dilo con claridad y responde con lo que sabes.",
  },
  NOTA_H = {
    buscar: [
      "El usuario ha pedido expresamente que BUSQUES EN INTERNET: busca antes de responder y cita las fuentes.",
      "El usuario pidió buscar en internet, pero ahora no puedes: díselo claramente y responde con lo que sabes, sin inventar fuentes.",
    ],
    leer: [
      "El usuario ha pedido que LEAS el enlace que te pasa: ábrelo con tu herramienta y responde según lo que diga.",
      "El usuario pidió leer un enlace, pero ahora no puedes abrir páginas: díselo claramente y no inventes lo que dice.",
    ],
    codigo: [
      "El usuario ha pedido que EJECUTES CÓDIGO: usa tu entorno de ejecución de Python para calcularlo o comprobarlo de verdad y explica el resultado.",
      "El usuario pidió ejecutar código, pero ahora no tienes dónde ejecutarlo: dilo claramente, da el código listo para usar y no inventes su salida.",
    ],
    asesor: [
      "El usuario ha pedido que consultes a tu asesor antes de responder: usa la herramienta advisor y aprovecha su consejo.",
      "El usuario pidió consultar al asesor, pero ahora no está disponible: responde tú lo mejor que puedas.",
    ],
  },
  HERR_IA = ["buscar", "leer", "codigo", "asesor"];
async function chatMotor(e, t) {
  const o = PROVEEDORES[e.prov];
  if (!o || "chat" !== o.tipo) throw new ErrorApi("Proveedor desconocido: " + e.prov, { prov: e.prov });
  const a = herramientasDe(e),
    n = new Set(t.pide || []),
    r = !!(t.web ?? S.web),
    i = new Set();
  for (const e of ["buscar", "leer"]) (r || n.has(e)) && a.has(e) && i.add(e);
  for (const e of ["codigo", "asesor"]) n.has(e) && a.has(e) && i.add(e);
  const s = t.avisoWeb || AVISO_WEB,
    notas = (e) => {
      const t = [];
      e.has("buscar") ? t.push(s.si) : r && !n.has("buscar") && t.push(s.no);
      for (const o of HERR_IA) n.has(o) && t.push(NOTA_H[o][e.has(o) ? 0 : 1]);
      return t.length ? "\n" + t.join("\n") : "";
    },
    c = adaptarAdjuntos(t.mensajes || [], e),
    l = {
      ...t,
      mensajes: c.mensajes,
      modelo: e.modelo,
      h: i,
      web: i.has("buscar"),
      sistema: t.sistema + notas(i),
      sis: (e) => t.sistema + notas(e),
    },
    llamar = (t) =>
      "anthropic" === o.fmt
        ? chatClaude(e.prov, t)
        : "responses" === o.fmt
          ? chatResponses(e.prov, t)
          : "gemini" === o.fmt
            ? chatGemini(e.prov, t)
            : chatOpenAI(e.prov, t),
    conAviso = (e) => (c.omitidos.length ? { ...e, sinVer: c.omitidos } : e);
  if (Familias.es(e.prov, e.modelo)) {
    await Familias.asegurar(e.prov);
    const t = Familias.real(e.prov, e.modelo);
    if (!t || !Familias.abierto(e.prov, e.modelo))
      throw new ErrorApi(`${etiquetaMotor(e)} aún no está abierto para tu cuenta.`, {
        prov: e.prov,
        corto: "modelo no disponible",
      });
    try {
      return conAviso(await llamar({ ...l, modelo: t }));
    } catch (t) {
      throw (t && "modelo no disponible" === t.corto && Familias.cerrar(e.prov, e.modelo), t);
    }
  }
  const d = t.veloz && o.veloz ? o.veloz(e.modelo) : e.modelo;
  if (d !== e.modelo) {
    let e = !1;
    try {
      return conAviso({
        ...(await llamar({
          ...l,
          modelo: d,
          onTexto: (o) => {
            ((e = !0), t.onTexto && t.onTexto(o));
          },
        })),
        modelo: d,
      });
    } catch (o) {
      if (esAbort(o) || e || errorDeCuenta(o)) throw o;
      (t.onReinicio && t.onReinicio(),
        t.onActividad && t.onActividad(`⚡ ${NOMBRE_MODELO[d] || d} no disponible: uso el normal`));
    }
  }
  return conAviso(await llamar(l));
}
function separarThink(e) {
  let t = "";

  return {
    texto: String(e || "")
      .replace(/^\s*<think>([\s\S]*?)(<\/think>|$)/i, (e, o) => ((t += o), ""))
      .replace(/【\d+(?:[:†‡][^】\n]{0,60})?】/g, "")
      .replace(/^\s+/, ""),
    razon: t.trim(),
  };
}
async function llamarCece(e, t) {
  t.motores || (await Familias.prepararPara([e]));
  let o = t.motores || motoresDe(e);
  const a = (t.pide || []).filter((e) => HERR_IA.includes(e)),
    n = necesidades(t.mensajes),
    puntos = (e) =>
      4 * a.filter((t) => herramientasDe(e).has(t)).length +
      (n.vista && capacidad(e, "vista") ? 2 : 0) +
      (n.pdf && capacidad(e, "pdf") ? 1 : 0);
  if (
    ((a.length || n.vista || n.pdf) &&
      !t.mantenerOrden &&
      (o = o
        .map((e, t) => [e, t, puntos(e)])
        .sort((e, t) => t[2] - e[2] || e[1] - t[1])
        .map((e) => e[0])),
    Red.sinRed())
  ) {
    const e = o.filter((e) => sinInternetVale(e.prov));
    if (!e.length)
      throw new ErrorApi(
        "Sin conexión a internet. Tu mensaje se enviará solo cuando vuelva (o activa una IA local en Configuración → Sin conexión).",
        { red: !0, sinRed: !0, corto: "sin conexión" },
      );
    o = e;
  }
  if (!o.length) {
    const t = CECE_MAP[e];
    throw new ErrorApi(
      t && t.local
        ? "Cece Local necesita una IA en tu ordenador: actívala en Configuración → 📴 Sin conexión (Ollama o LM Studio)."
        : Boveda.necesitaDesbloqueo()
          ? "Las claves están cifradas y bloqueadas: desbloquéalas con tu contraseña (Configuración → 🔐 Seguridad)."
          : hayAlgunaClave() && t && t.solo
            ? `${t.nombre} usa solo el ${etiquetaMotor(motorDeTabla(t.motores[0]))} (sin respaldo) y falta su clave (${nombreEnBloque(motorDeTabla(t.motores[0]).prov)}) en el bloque de configuración.`
            : hayAlgunaClave()
              ? `${t ? t.nombre : e} no tiene configuración disponible.`
              : "Falta rellenar el bloque de configuración del principio del archivo.",
      { sinClave: !0, corto: "sin clave" },
    );
  }
  const r = [],
    i = new Set();
  let s = null;
  for (const e of o) {
    if (i.has(e.prov)) continue;
    let o = !1;
    t.onMotor && t.onMotor(e);
    const n = "local" === e.prov && S.hubActivo && void 0 !== CeceHub;
    for (let c = 0; ; c++) {
      try {
        if (n && (await CeceHub.asegurar(), !CeceHub.ruta)) throw CeceHub.errorSinRuta();
        if (t.signal && t.signal.aborted) throw new DOMException("stop", "AbortError");
        const i = await chatMotor(e, {
            ...t,
            onTexto: (e) => {
              ((o = !0), t.onTexto && t.onTexto(e));
            },
          }),
          { texto: s, razon: c } = separarThink(i.texto);
        if (!s.trim()) {
          const t = /length|max_tokens|max_output_tokens|incomplete/i.test(i.fin || "");
          throw new ErrorApi(
            t
              ? `${etiquetaMotor(e)} se quedó sin tokens pensando y no llegó a responder. Sube el esfuerzo.`
              : `${etiquetaMotor(e)} devolvió una respuesta vacía.`,
            { prov: e.prov, corto: "respuesta vacía" },
          );
        }
        const l = i.modelo && i.modelo !== e.modelo ? { ...e, modelo: i.modelo } : e,
          d = a.filter((t) => !(i.usadas || herramientasDe(e)).has(t));
        return (
          n && CeceHub.vivo(),
          { ...i, texto: s, razon: (i.razon + (c ? "\n" + c : "")).trim(), motor: l, saltos: r, faltan: d }
        );
      } catch (a) {
        if (esAbort(a)) throw a;
        if (n && !o && 0 === c && (await CeceHub.otraRuta(a))) {
          (t.onReinicio && t.onReinicio(),
            t.onActividad && t.onActividad(`🔗 CeceHub: cambio de ruta (${CeceHub.descripcion()})`));
          continue;
        }
        if (((a.motor = e), o)) throw ((a.parcial = !0), (a.saltos = r), a);
        (r.push({ motor: e, error: a }), errorDeCuenta(a) && i.add(e.prov), (s = a), t.onSalto && t.onSalto(e, a));
      }
      break;
    }
  }
  s.saltos = r;
  const c = r.filter((e) => !sinInternetVale(e.motor.prov));
  if (
    c.length &&
    c.every((e) => e.error && e.error.red) &&
    (!t.signal || !t.signal.aborted) &&
    !(await Red.hayInternet())
  ) {
    Red.marcarCaida();
    const e = new ErrorApi(
      "Sin conexión a internet. Tu mensaje se enviará solo cuando vuelva (o activa una IA local en Configuración → Sin conexión).",
      { red: !0, sinRed: !0, corto: "sin conexión" },
    );
    throw ((e.saltos = r), e);
  }
  throw s;
}
const Familias = {
  CADA_MS: 216e5,
  ESPERA_MS: 18e5,
  REINTENTO_MS: 3e5,
  listas: Object.create(null),
  cerrados: Object.create(null),
  _fallo: Object.create(null),
  _pidiendo: Object.create(null),
  es(e, t) {
    const o = PROVEEDORES[e];
    return !!(o && o.porAbrir && o.porAbrir.includes(t));
  },
  real(e, t) {
    if (!this.es(e, t)) return t;
    const o = this.listas[e];
    if (!o || o.ids.has(t)) return t;
    const a = [...o.ids].filter((e) => e.startsWith(t + "-"));
    return (
      a.sort((e, t) => /preview|exp/i.test(e) - /preview|exp/i.test(t) || t.localeCompare(e, "en", { numeric: !0 })),
      a[0] || ""
    );
  },
  abierto(e, t) {
    if (!this.es(e, t)) return !0;
    const o = this.cerrados[e + "|" + t];
    return !(o && Date.now() - o < this.ESPERA_MS) && "" !== this.real(e, t);
  },
  guardar(e, t) {
    this.listas[e] = { ids: new Set(t), hora: Date.now() };
    for (const t of Object.keys(this.cerrados)) t.startsWith(e + "|") && delete this.cerrados[t];
    try {
      actualizarTitulosNivel();
    } catch (e) {}
  },
  cerrar(e, t) {
    this.cerrados[e + "|" + t] = Date.now();
  },
  async asegurar(e) {
    const t = PROVEEDORES[e];
    if (!t || !t.porAbrir || !disponible(e) || !PRUEBA_CONEXION[e] || Red.sinRed()) return;
    const o = this.listas[e];
    (o && Date.now() - o.hora < this.CADA_MS) ||
      (this._fallo[e] && Date.now() - this._fallo[e] < this.REINTENTO_MS) ||
      (this._pidiendo[e] ||
        (this._pidiendo[e] = (async () => {
          try {
            const { url: t, headers: o } = PRUEBA_CONEXION[e](),
              a = await fetchConTiempo(e, t, { method: "GET", headers: o }, null, 6e3),
              n = a.ok ? idsDeModelos(await a.json()) : new Set();
            n.size ? (this.guardar(e, n), delete this._fallo[e]) : (this._fallo[e] = Date.now());
          } catch (t) {
            this._fallo[e] = Date.now();
          } finally {
            delete this._pidiendo[e];
          }
        })()),
      await this._pidiendo[e]);
  },
  async prepararPara(e) {
    const t = new Set();
    for (const o of e)
      for (const e of (CECE_MAP[o] && CECE_MAP[o].motores) || []) {
        const o = motorDeTabla(e);
        this.es(o.prov, o.modelo) && t.add(o.prov);
      }
    await Promise.all([...t].map((e) => this.asegurar(e)));
  },
};
function urlSegura(e) {
  const t = String(e)
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .trim();
  return /^(https?:|mailto:)/i.test(t) ? t : null;
}
function recortarUrl(e) {
  let t = "";
  for (;;) {
    const o = e.slice(-1),
      a = (e.match(/\(/g) || []).length,
      n = (e.match(/\)/g) || []).length;
    if (!(/[.,;:!?"'\]*~]/.test(o) || (")" === o && n > a) || /&(quot|#39);$/.test(e))) return [e, t];
    {
      const o = /&(quot|#39);$/.test(e) ? e.match(/&(quot|#39);$/)[0].length : 1;
      ((t = e.slice(-o) + t), (e = e.slice(0, -o)));
    }
  }
}
function enfasis(e) {
  return (e = (e = (e = (e = (e = e.replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, "<strong>$1</strong>")).replace(
    /__(?=\S)([\s\S]*?\S)__/g,
    "<strong>$1</strong>",
  )).replace(/(^|[^*\w])\*(?=[^\s*])([^*\n]*?[^\s*])\*(?!\*)/g, "$1<em>$2</em>")).replace(
    /(^|[^_\w])_(?=\S)([^_\n]*?\S)_(?![_\w])/g,
    "$1<em>$2</em>",
  )).replace(/~~(?=\S)([^~\n]*?\S)~~/g, "<del>$1</del>"));
}
function mdInline(e) {
  const t = [],
    guardar = (e) => "" + (t.push(e) - 1) + "";
  ((e = (e = e.replace(/(`+)(?!`)([^\n]*?[^`\n])\1(?!`)/g, (e, t, o) =>
    guardar(`<code class="inline">${t.length > 1 ? o.replace(/^ ([\s\S]*\S[\s\S]*) $/, "$1") : o}</code>`),
  )).replace(/!?\[([^\]\n]+)\]\(((?:[^()\s]|\([^()\s]*\))+)(?:\s+&quot;[^\n]*?&quot;)?\)/g, (e, t, o) => {
    const a = /[\u0001\u0002]/.test(o) ? null : urlSegura(o);
    return a
      ? guardar(`<a href="${esc(a)}" target="_blank" rel="noopener noreferrer">${enfasis(t)}</a>`)
      : /[\u0001\u0002]/.test(o)
        ? e
        : t;
  })),
    (e = enfasis(
      (e = (e = e.replace(/&lt;(https?:\/\/[^\s<>\u0001\u0002]+?)&gt;/g, (e, t) => {
        const o = urlSegura(t);
        return o ? guardar(`<a href="${esc(o)}" target="_blank" rel="noopener noreferrer">${t}</a>`) : e;
      })).replace(/(^|[\s(])(https?:\/\/[^\s<\u0001\u0002]+)/g, (e, t, o) => {
        const [a, n] = recortarUrl(o),
          r = a.length > 8 && urlSegura(a);
        return r ? t + guardar(`<a href="${esc(r)}" target="_blank" rel="noopener noreferrer">${a}</a>`) + n : e;
      })),
    )));
  for (let o = 0; o < 4 && /\u0001\d+\u0002/.test(e); o++) e = e.replace(/\u0001(\d+)\u0002/g, (e, o) => t[+o] ?? "");
  return e;
}
function bloqueCodigo(e, t, o, a) {
  const n = String(e || "").toLowerCase(),
    r = (t || "").trim().split(/\s+/)[1] || "";
  return `<div class="code-wrap" data-lang="${esc(n)}" data-n="${a}"${r ? ` data-nombre="${esc(r)}"` : ""}><div class="code-head"><span class="lang">${esc(n || "código")}</span><span class="carpeta"></span><span class="acciones"><button class="copy-btn" data-acc="guardar" title="Guardar como archivo">💾</button><button class="copy-btn" data-acc="copiar">Copiar</button></span></div><pre class="code-block"><code>${esc(o)}</code></pre></div>`;
}
function vallas(e) {
  const t = e.split("\n"),
    o = [],
    a = [];
  for (let e = 0; e < t.length; e++) {
    const n = t[e].match(/^[ \t]*(`{3,}|~{3,})[ \t]*([^`\n]*)$/);
    if (!n) {
      a.push(t[e]);
      continue;
    }
    const r = new RegExp("^[ \\t]*" + ("`" === n[1][0] ? "`" : "~") + "{" + n[1].length + ",}[ \\t]*$");
    let i = e + 1;
    for (; i < t.length && !r.test(t[i]);) i++;
    const s = t[e].match(/^[ \t]*/)[0].length,
      quitar = (e) => (s ? e.replace(new RegExp("^[ \\t]{0," + s + "}"), "") : e);
    (o.push({
      info: n[2].trim(),
      codigo: t
        .slice(e + 1, i)
        .map(quitar)
        .join("\n"),
      cerrado: i < t.length,
    }),
      a.push("\0" + (o.length - 1) + "\0"),
      (e = i));
  }
  return { texto: a.join("\n"), bloques: o };
}
const normalizarTexto = (e) => String(e || "").replace(/\r\n?|[\u2028\u2029]/g, "\n");
function md(e) {
  const o = vallas(normalizarTexto(e).replace(/[\u0000-\u0003]/g, "")),
    a = o.bloques.map((e, t) => bloqueCodigo(e.info.split(/\s+/)[0] || "", e.info, e.codigo, t)),
    n = o.texto,
    r = esc(n).split("\n"),
    i = [];
  let s = 0;
  const esLista = (e) => /^(\s*)([-*+]|\d{1,3}[.)])\s+/.test(e),
    esTabla = (e, t) =>
      /^\s*\|.*\|\s*$/.test(e || "") && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(t || ""),
    celdas = (e) =>
      e
        .trim()
        .replace(/\\\|/g, "")
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((e) => e.trim().replace(/\u0003/g, "|"));
  function lista(e) {
    const ind = (e) => e.match(/^(\s*)/)[1].length,
      t = ind(r[e]),
      o = /^\s*\d/.test(r[e]),
      a = o ? parseInt(r[e].trim(), 10) : 1;
    let n = o ? (1 !== a ? `<ol start="${a}">` : "<ol>") : "<ul>",
      i = e;
    for (; i < r.length;) {
      const a = r[i];
      if (!a.trim()) {
        if (i + 1 < r.length && esLista(r[i + 1]) && (ind(r[i + 1]) > t || /^\s*\d/.test(r[i + 1]) === o)) {
          i++;
          continue;
        }
        break;
      }
      if (!esLista(a)) {
        if (ind(a) > t && i > e) {
          ((n = n.replace(/<\/li>$/, "") + "<br>" + mdInline(a.trim()) + "</li>"), i++);
          continue;
        }
        break;
      }
      const s = ind(a);
      if (s < t) break;
      if (s === t && /^\s*\d/.test(a) !== o) break;
      if (s > t) {
        const [e, t] = lista(i);
        ((n = n.replace(/<\/li>$/, "") + e + "</li>"), (i = t));
        continue;
      }

      let l = a.match(/^\s*(?:[-*+]|\d{1,3}[.)])\s+(.*)$/)[1];
      const d = l.match(/^\[([ xX])\]\s+(.*)$/);
      (d && (l = (d[1].trim() ? "☑ " : "☐ ") + d[2]), (n += "<li>" + mdInline(l) + "</li>"), i++);
    }
    return [n + (o ? "</ol>" : "</ul>"), i];
  }
  for (; s < r.length;) {
    const e = r[s],
      t = e.trim().match(/^\u0000(\d+)\u0000$/);
    if (t) {
      (i.push(a[+t[1]]), s++);
      continue;
    }
    if (!e.trim()) {
      s++;
      continue;
    }
    const o = e.match(/^\s{0,3}(#{1,6})\s+(.*)$/);
    if (o) {
      const e = Math.min(o[1].length, 3);
      (i.push(`<h${e}>${mdInline(o[2].replace(/(^|\s)#+\s*$/, "").trim())}</h${e}>`), s++);
      continue;
    }
    if (/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(e)) {
      (i.push("<hr>"), s++);
      continue;
    }
    if (/^\s*&gt;/.test(e)) {
      const e = [];
      for (; s < r.length && /^\s*&gt;/.test(r[s]);) (e.push(r[s].replace(/^\s*&gt;\s?/, "")), s++);
      i.push("<blockquote>" + e.map(mdInline).join("<br>") + "</blockquote>");
      continue;
    }
    if (esTabla(e, r[s + 1])) {
      const t = celdas(e),
        o = celdas(r[s + 1]).map((e) => (/^:-+:$/.test(e) ? "center" : /-:$/.test(e) ? "right" : ""));
      s += 2;
      let a =
        "<table><thead><tr>" +
        t.map((e, t) => `<th${o[t] ? ` style="text-align:${o[t]}"` : ""}>${mdInline(e)}</th>`).join("") +
        "</tr></thead><tbody>";
      for (; s < r.length && /^\s*\|/.test(r[s]);)
        ((a +=
          "<tr>" +
          celdas(r[s])
            .map((e, t) => `<td${o[t] ? ` style="text-align:${o[t]}"` : ""}>${mdInline(e)}</td>`)
            .join("") +
          "</tr>"),
          s++);
      i.push(a + "</tbody></table>");
      continue;
    }
    if (esLista(e)) {
      const [e, t] = lista(s);
      (i.push(e), (s = t));
      continue;
    }
    const n = [];
    for (
      ;
      s < r.length &&
      r[s].trim() &&
      !esLista(r[s]) &&
      !/^\s{0,3}#{1,6}\s/.test(r[s]) &&
      !/^\s*&gt;/.test(r[s]) &&
      !/^\s*\u0000\d+\u0000\s*$/.test(r[s]) &&
      !esTabla(r[s], r[s + 1]) &&
      !/^\s{0,3}([-*_])(\s*\1){2,}\s*$/.test(r[s]);
    )
      (n.push(r[s]), s++);
    n.length
      ? i.push("<p>" + n.map((e) => mdInline(e.trim())).join("<br>") + "</p>")
      : (i.push("<p>" + mdInline(e) + "</p>"), s++);
  }
  return i.join("\n");
}
function extraerCodigo(e) {
  return vallas(normalizarTexto(e))
    .bloques.filter((e) => e.cerrado)
    .map((e) => {
      const t = e.info.split(/\s+/);
      return { lang: (t[0] || "").toLowerCase(), nombre: t[1] || "", codigo: e.codigo };
    });
}
function textoParaVoz(e) {
  return String(e || "")
    .replace(/<think>[\s\S]*?(<\/think>|$)/gi, " ")
    .replace(/【[^】\n]{0,80}(】|$)/g, "")
    .replace(/```[\s\S]*?(```|$)/g, " (te dejo el código en el chat) ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!?\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, " enlace ")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/\|/g, ", ")
    .replace(/[*_~#]+/g, "")
    .replace(/\p{Extended_Pictographic}️?/gu, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}
let historial = [],
  convId = uid(),
  generando = null,
  burbujaActiva = null,
  envioActual = null,
  parado = !1;
const anotar = (e, t) => {
    e === convId && (historial.push(t), guardarActual());
  },
  sesion = { tokens: 0, coste: 0, sinPrecio: new Set() },
  mensajesEl = () => $("messages");
function cercaDelFinal() {
  const e = $("chatArea");
  return e.scrollHeight - e.scrollTop - e.clientHeight < 140;
}
function bajar(e) {
  const t = $("chatArea");
  (e || cercaDelFinal()) && (t.scrollTop = t.scrollHeight);
}
const horaCorta = () => new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
function emo(e) {
  return `<span class="emo-w" data-e="${e}">${e}</span>`;
}
function crearMensaje(e) {
  const t = "assistant" === e,
    o = document.createElement("div");
  ((o.className = "msg " + (t ? "bot-msg" : "user-msg")),
    (o.innerHTML = `<div class="avatar">${emo(t ? "🤖" : "🧑")}</div><div class="msg-body"><div class="bubble"></div><div class="msg-meta${t ? "" : " user-meta"}"></div></div>`));
  const a = cercaDelFinal();
  return (
    mensajesEl().appendChild(o),
    aplicarEmojis(o),
    bajar(a || !t),
    { wrap: o, bubble: o.querySelector(".bubble"), meta: o.querySelector(".msg-meta") }
  );
}
function pintarUsuario(e, t) {
  const o = "string" == typeof e ? { content: e, cmds: t } : e || { content: "" },
    a = Array.isArray(o.cmds) ? o.cmds : null,
    n = "string" == typeof o.mostrar ? o.mostrar : String(o.content || ""),
    r = crearMensaje("user");
  if (((r.bubble.textContent = n), n || r.bubble.classList.add("solo-adjuntos"), a && a.length)) {
    const e = document.createElement("div");
    e.className = "cmd-chips";
    for (const t of a) {
      const o = "string" == typeof t && COMANDO[t];
      if (!o) continue;
      const a = document.createElement("span");
      ((a.className = "cmd-chip"), (a.textContent = `${o.emoji} /${o.id}`), (a.title = o.nombre), e.appendChild(a));
    }
    (r.bubble.prepend(e), aplicarEmojis(e));
  }
  try {
    pintarAdjuntosEn(r.bubble, o.adjuntos);
  } catch (e) {
    console.error(e);
  }
  return (
    (r.meta.innerHTML =
      `<span>${horaCorta()}</span>` +
      (o.pendiente ? '<span class="pendiente-badge">⏳ se enviará al volver internet</span>' : "")),
    bajar(!0),
    r
  );
}
class Burbuja {
  constructor(e = "Pensando") {
    const t = crearMensaje("assistant");
    (Object.assign(this, t),
      (this.texto = ""),
      (this.razon = ""),
      (this.actividad = []),
      (this.ejec = []),
      (this.vis = 0),
      (this.fin = !1),
      (this.t = null),
      (this.razonAbierta = "abierto" === S.razon),
      (this.ejecAbierta = !1),
      this.pensando(e));
  }
  pensando(e) {
    ((this.bubble.className = "bubble thinking"),
      (this.bubble.innerHTML = `<span class="pensando">${esc(e)}</span><span class="dot"></span><span class="dot"></span><span class="dot"></span>`));
  }
  meter(e) {
    ((this.texto += e), S.stream && this._arrancar());
  }
  meterRazon(e) {
    ((this.razon += e), this.texto || this.ejec.length || this.pensando("Razonando"));
  }
  reiniciar() {
    ((this.ejec = []), (this.actividad = []), (this.razon = ""), (this.imgsEl = null));
  }
  meterActividad(e) {
    this.actividad[this.actividad.length - 1] !== e &&
      (this.actividad.push(e),
      (this.texto || this.ejec.length) && S.stream ? this._pintar(!0) : this.pensando(e.replace(/^\S+\s/, "")));
  }
  meterEjec(e) {
    let t = this.ejec[this.ejec.length - 1];
    ((e.nuevo || !t || (t.fin && !e.imagenes)) &&
      this.ejec.push(
        (t = {
          lenguaje: e.lenguaje || "python",
          codigo: "",
          archivo: e.archivo || "",
          salida: "",
          error: "",
          imagenes: [],
        }),
      ),
      !e.codigo || (!e.nuevo && t.codigo) || (t.codigo = e.codigo),
      e.mas && (t.codigo += e.mas),
      e.salida && (t.salida += (t.salida ? "\n" : "") + e.salida),
      e.error && (t.error += (t.error ? "\n" : "") + e.error));
    for (const o of e.imagenes || []) {
      if (!/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=\s]+$/.test(o)) continue;
      (t.imagenes.push(o),
        this.imgsEl || ((this.imgsEl = document.createElement("div")), (this.imgsEl.className = "ejec-imgs")));
      const e = new Image();
      ((e.className = "gen-img ejec-img"), (e.alt = "Gráfico generado"), (e.src = o), this.imgsEl.appendChild(e));
    }
    (e.fin && (t.fin = !0), S.stream && this._pintar(!0));
  }
  _htmlEjec() {
    if (!this.ejec.length) return "";
    const e = this.ejec.length,
      t = this.ejec.flatMap((e) => e.imagenes);
    return (
      `<details class="ejec"${this.ejecAbierta ? " open" : ""}><summary>🧮 Código ejecutado${e > 1 ? ` (${e})` : ""}</summary>` +
      this.ejec
        .map(
          (e) =>
            `<div class="ejec-run"><div class="ejec-cab">${esc(e.archivo ? "📄 " + e.archivo : e.lenguaje)}${e.fin ? (e.error ? " · ⚠️ con errores" : " · ✓") : " · ⏳"}</div>` +
            (e.codigo ? `<pre class="ejec-cod">${esc(e.codigo)}</pre>` : "") +
            (e.salida || e.error
              ? `<pre class="ejec-sal">${esc(e.salida)}${e.error ? `<span class="ejec-err">${esc((e.salida ? "\n" : "") + e.error)}</span>` : ""}</pre>`
              : "") +
            "</div>",
        )
        .join("") +
      "</details>" +
      (t.length ? '<div class="ejec-imgs"></div>' : "")
    );
  }
  _arrancar() {
    this.t || (this.t = setInterval(() => this._tick(), 40));
  }
  _tick() {
    const e = this.texto.length;
    S.vel >= 500 ? (this.vis = e) : (this.vis = Math.min(e, this.vis + Math.max(1, Math.round(4 * S.vel * 0.04))));
    const t = this.vis < e,
      o = t || !this.fin,
      a = [this.vis, o, this.razon.length, this.actividad.length].join("|");
    (a !== this._pintado && ((this._pintado = a), this._pintar(o)),
      this.fin && !t && (clearInterval(this.t), (this.t = null), this._avisarListo()));
  }
  _avisarListo() {
    const e = this._listo;
    ((this._listo = null), e && e());
  }
  _pintar(e) {
    try {
      this._pintarHtml(e);
    } catch (e) {
      (console.error(e),
        (this.bubble.className = "bubble"),
        (this.bubble.textContent = separarThink(this.texto).texto));
    }
  }
  _pintarHtml(e) {
    const t = cercaDelFinal(),
      { texto: o, razon: a } = separarThink(this.texto.slice(0, this.vis)),
      n = (this.razon + (a ? "\n" + a : "")).trim();
    let r = "";
    n &&
      "oculto" !== S.razon &&
      (r += `<details class="razonamiento"${this.razonAbierta ? " open" : ""}><summary>🧠 Razonamiento</summary><div class="razon-txt">${esc(n)}</div></details>`);
    const i = this.ejec.length ? this.actividad.filter((e) => !e.startsWith("🧮")) : this.actividad;
    (i.length && (r += `<p class="aviso-msg" style="font-size:12.5px">${i.map(esc).join(" · ")}</p>`),
      (r += this._htmlEjec()),
      (r += md(o)),
      e && (r += '<span class="cursor"></span>'),
      (this.bubble.className = "bubble"),
      (this.bubble.innerHTML = r));
    const s = this.bubble.querySelector(".razonamiento");
    s &&
      s.addEventListener("toggle", () => {
        this.razonAbierta = s.open;
      });
    const c = this.bubble.querySelector(".ejec");
    c &&
      c.addEventListener("toggle", () => {
        this.ejecAbierta = c.open;
      });
    const l = this.bubble.querySelector("div.ejec-imgs");
    (l && this.imgsEl && l !== this.imgsEl && l.replaceWith(this.imgsEl), bajar(t));
  }
  terminar() {
    this.fin = !0;
    for (const e of this.ejec) e.fin = !0;
    return !S.stream || !this.texto || S.vel >= 500
      ? (clearInterval(this.t),
        (this.t = null),
        (this.vis = this.texto.length),
        (this.texto || this.razon || this.ejec.length) && this._pintar(!1),
        Promise.resolve())
      : new Promise((e) => {
          ((this._listo = e), this._arrancar());
        });
  }
  terminarYa() {
    this.fin = !0;
    for (const e of this.ejec) e.fin = !0;
    (clearInterval(this.t),
      (this.t = null),
      (this.vis = this.texto.length),
      (this.texto || this.ejec.length) && this._pintar(!1),
      this._avisarListo());
  }
  error(e) {
    if ((this.terminarYa(), this.texto.trim() || this.ejec.length)) {
      const t = document.createElement("p");
      ((t.className = "aviso-msg"),
        (t.style.cssText = "margin-top:9px;white-space:pre-wrap"),
        (t.textContent = "⚠️ " + e),
        this.bubble.appendChild(t));
    } else ((this.bubble.className = "bubble err"), (this.bubble.textContent = "❌ " + e));
    bajar();
  }
  fuentes(e) {
    if (!e || !e.length) return;
    const t = document.createElement("div");
    ((t.style.cssText = "margin-top:10px;font-size:12.5px;color:var(--text-dim)"),
      (t.innerHTML =
        '<b style="color:var(--text)">🔗 Fuentes</b><br>' +
        e
          .slice(0, 8)
          .map(
            (e, t) =>
              `${t + 1}. <a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">${esc(String(e.titulo).slice(0, 90))}</a>`,
          )
          .join("<br>")),
      this.bubble.appendChild(t));
  }
  pieDePagina({ via: e, tokens: t, tps: o, avisos: a, texto: n }) {
    const r = [`<span>${horaCorta()}</span>`];
    (e && r.push(`<span class="via">vía ${esc(e)}</span>`),
      t && r.push(`<span>${t} tokens</span>`),
      o && r.push(`<span>${o} t/s</span>`));
    for (const e of a || [])
      r.push(`<span class="aviso-msg" title="${esc(e)}">⚠️ ${esc(e.length > 110 ? e.slice(0, 110) + "…" : e)}</span>`);
    if (
      ((this.meta.innerHTML = r.join("")),
      (a || []).includes("detenido") || (Voz.activo && "live" === Voz.modo) || sonidoFin(),
      n)
    ) {
      const e = document.createElement("button");
      ((e.className = "mini-btn"), (e.textContent = "📋 Copiar"), (e.onclick = () => copiar(n, e)));
      const t = document.createElement("button");
      ((t.className = "mini-btn"),
        (t.textContent = "🔊 Leer"),
        (t.onclick = () => leerEnVoz(n, t)),
        this.meta.append(e, t));
    }
  }
}
async function copiar(e, t) {
  let o = !1;
  try {
    (await navigator.clipboard.writeText(e), (o = !0));
  } catch (t) {
    const a = document.createElement("textarea");
    ((a.value = e), (a.style.cssText = "position:fixed;opacity:0"), document.body.appendChild(a), a.select());
    try {
      o = document.execCommand("copy");
    } catch (e) {}
    a.remove();
  }
  if (t) {
    const e = t.textContent;
    ((t.textContent = o ? "✅ Copiado" : "❌"),
      t.classList.add("ok"),
      setTimeout(() => {
        ((t.textContent = e), t.classList.remove("ok"));
      }, 1400));
  }
}
function pulso(e, t) {
  const o = $(e);
  o && ((o.textContent = t), o.classList.remove("pulso"), o.offsetWidth, o.classList.add("pulso"));
}
function sumarCoste(e, t, o) {
  if (!e) return;
  let a = PRECIOS_MODELO[e.modelo];
  ("function" == typeof a && (a = a(new Date())),
    a ? (sesion.coste += (t * a[0] + o * a[1]) / 1e6) : sesion.sinPrecio.add(etiquetaMotor(e)));
}
function contar(e, t, o, a) {
  const n = (e.usage && e.usage.out) || estimarTokens(t + (e.razon || "")),
    r = (e.usage && e.usage.in) || 0,
    i = o > 0.05 ? Math.round(n / o) : 0;
  (a || sumarCoste(e.motor, r, n),
    (sesion.tokens += n + r),
    pulso("lastTokens", n),
    pulso("lastSpeed", i),
    pulso("totalTokens", sesion.tokens),
    pulso("costeTotal", "$" + sesion.coste.toFixed(4) + (sesion.sinPrecio.size ? "+" : "")));
  const s = $("costeTotal");
  return (
    s &&
      (s.title = sesion.sinPrecio.size ? `No incluye ${[...sesion.sinPrecio].join(", ")}: no tiene precio puesto` : ""),
    { tokens: n, tps: i }
  );
}
function sistemaPara(e, t, o = S.esf) {
  const a = CECE_MAP[e] || CECE_MAP["cece-turbo"],
    n = new Date().toLocaleString("es-ES", { dateStyle: "full", timeStyle: "short" });
  let r = `Eres Cece AI (${a.nombre}), la inteligencia artificial de Cece Company. Eres cercana, clara y muy útil. No digas qué modelo, empresa o proveedor hay detrás de ti: si te lo preguntan, eres Cece AI, creada por Cece Company. Responde en el idioma del usuario (normalmente español). Usa Markdown cuando ayude: títulos cortos, listas, tablas y bloques de código con su lenguaje.\nFecha y hora actuales: ${n}.`;
  ("bajo" === o
    ? (r += "\nSé breve y ve al grano.")
    : "alto" === o
      ? (r += "\nPiensa con cuidado antes de responder.")
      : "extra" === o
        ? (r += "\nRazona paso a paso y revisa tu respuesta antes de darla.")
        : "max" === o &&
          (r += "\nDa la mejor respuesta posible: razona a fondo, comprueba cada dato y cubre los casos importantes."),
    ("ultracode" === o || S.codeMode || a.codePrompt) &&
      (r +=
        "\nModo programación: escribe código completo, correcto y listo para usar, sin partes a medias. Pon cada archivo en su propio bloque de código con el lenguaje, y en la primera línea un comentario con el nombre del archivo (por ejemplo: // archivo: app.js o # archivo: main.py). Explica brevemente qué hace y cómo ejecutarlo."));
  const i = ajustesDeRespuesta();
  return (i && (r += "\n" + i), t && (r += "\n" + t), r);
}
const maxTokens = (e = S.esf) => Math.max((ESF[e] || ESF.medio).tok, S.codeMode ? 8192 : 0),
  TOPE_BINARIOS = 14680064,
  TOPE_TEXTO_ARCHIVOS = 4e5;
function historialApi(e = 30, t = 6e4) {
  const o = [];
  let a = 0,
    n = 0,
    r = 0;
  for (let i = historial.length - 1; i >= 0 && o.length < e; i--) {
    const e = historial[i];
    if (e.error || e.local) continue;
    const s = !o.length,
      c = ("user" === e.role ? adjBinarios(e) : []).map((e) => {
        const t = e.datos ? e.datos.length : 0;
        return t ? (!s && n + t > TOPE_BINARIOS ? { ...e, datos: void 0, grande: !0 } : ((n += t), e)) : e;
      }),
      l = new Set();
    if ("user" === e.role)
      for (const t of e.adjuntos || [])
        t &&
          "texto" === t.tipo &&
          "string" == typeof t.texto &&
          (!s && r + t.texto.length > TOPE_TEXTO_ARCHIVOS ? l.add(t.id) : (r += t.texto.length));
    const d = "user" === e.role ? contenidoApi(e, l) : String(e.content || "");
    if (!d && !c.length) continue;

    if (((a += "user" === e.role ? String(e.content || "").length : d.length), a > t && o.length)) break;
    o.unshift(c.length ? { role: e.role, content: d, adjuntos: c } : { role: e.role, content: d });
  }
  return o;
}
function modoParar(e) {
  const t = $("sendBtn");
  (t.classList.toggle("parar", e),
    (t.innerHTML = e ? "⏹" : "➤"),
    t.setAttribute("aria-label", e ? "Parar" : "Enviar"),
    (t.title = e ? "Parar la respuesta" : "Enviar"));
}
function detener() {
  generando && ((parado = !0), generando.abort(), burbujaActiva && burbujaActiva.terminarYa());
}
async function enviar(e, t = {}) {
  if (generando) {
    const t = String(e ?? $("userInput").value).trim();
    if ((detener(), !t)) return null;
    if ((await envioActual, generando)) return null;
  }
  const o = enviarYa(e, t);
  return ((envioActual = o.catch(() => null)), o);
}
async function enviarYa(e, t) {
  Menu.cerrar();
  const o = $("userInput"),
    a = null == e;
  let n = String(e ?? o.value).trim();
  const r = a && !t.voz && Adjuntos.lista.length > 0;
  if (a && Adjuntos.ocupado) return (toast("📎 Espera a que terminen de leerse los archivos."), null);
  if (!n && !r) return null;
  let i = [],
    s = null;
  if (!t.voz) {
    const e = leerComandos(n);
    if (e.cmds.length) {
      const r = aplicarComandos(e.cmds, e.resto);
      if (!r.seguir) return (a && ((o.value = r.dejar), autoAlto(), r.dejar && o.focus()), null);
      ((i = e.cmds.filter((e) => "ia" === e.grupo || "plugin" === e.grupo).map((e) => e.id)),
        (n = e.resto),
        (t = { ...t, ...r.opc }),
        (s = r.opc.plugin || null));
    }
  }
  if (s && s.plugin.local) return (a && ((o.value = ""), autoAlto()), await ejecutarPluginLocal(s, n), null);
  const c = { role: "user", content: n };
  (i.length && (c.cmds = i),
    s && s.plugin.plantilla && ((c.mostrar = n), (c.content = expandirPlantilla(s.plugin.plantilla, n))),
    r && ((c.adjuntos = Adjuntos.sacar()), Adjuntos.guardar(c.adjuntos)),
    a && ((o.value = ""), autoAlto()));
  const l = Red.sinRed() && !t.imagen && !Red.hayLocalPara(S.modelo);
  return (
    l && (c.pendiente = !0),
    pintarUsuario(c),
    historial.push(c),
    guardarActual(),
    l
      ? (Red.pintar(), toast("📴 Sin conexión: tu mensaje se enviará en cuanto vuelva internet.", "", 5e3), null)
      : responder(t, c)
  );
}
async function responder(e, t) {
  if (((generando = new AbortController()), (parado = !1), historial.some((e) => e.pendiente))) {
    for (const e of historial) delete e.pendiente;
    (document.querySelectorAll(".pendiente-badge").forEach((e) => e.remove()), Red.pintar());
  }
  ((e = { ...e, conv: convId }), modoParar(!0));
  try {
    let o;
    const a = (t.cmds && t.cmds.length) || (t.adjuntos && t.adjuntos.length);
    return (
      (o =
        e.imagen || (S.imgMode && !e.voz && !a)
          ? await generarImagen(t.content, generando.signal, e)
          : "cece-pro" === S.modelo
            ? await ejecutarPro(generando.signal, e)
            : await ejecutarSimple(S.modelo, generando.signal, e)),
      parado ? null : o
    );
  } finally {
    ((generando = null), (burbujaActiva = null), modoParar(!1), guardarActual(), Nube.programar());
  }
}
function enviarPendiente() {
  if (generando || !historial.length) return null;
  const e = [...historial].reverse().find((e) => "user" === e.role && e.pendiente);
  if (!e) return null;
  if (Red.sinRed() && !Red.hayLocalPara(S.modelo)) return null;
  const t = responder(opcionesDeCmds(e.cmds), e);
  return ((envioActual = t.catch(() => null)), t);
}
const esfuerzoDe = (e) => (e.rapido ? "bajo" : e.esf || S.esf),
  extrasDe = (e) => ({ pide: e.pide || [], rapido: !!e.rapido, veloz: !!e.veloz }),
  avisosFaltan = (e) => ((e && e.faltan) || []).map((e) => `/${COMANDO_H[e].id}: ${quienTiene(e)}`);
async function ejecutarSimple(e, t, o = {}) {
  const a = (burbujaActiva = new Burbuja()),
    n = performance.now();
  let r = null,
    i = null;
  const s = [],
    c = esfuerzoDe(o);
  await Adjuntos.hidratar(historial);
  const l = historialApi(),
    d = sistemaPara(e, "", c);
  let u;
  try {
    u = await llamarCece(e, {
      mensajes: l,
      sistema: d,
      maxTok: maxTokens(c),
      esf: c,
      signal: t,
      ...extrasDe(o),
      onMotor: (e) => {
        i = e;
      },
      onTexto: (e) => {
        (r || (r = performance.now()), a.meter(e));
      },
      onRazon: (e) => a.meterRazon(e),
      onActividad: (e) => a.meterActividad(e),
      onEjec: (e) => a.meterEjec(e),
      onReinicio: () => a.reiniciar(),
      onSalto: (e, t) => {
        (s.push(`${etiquetaMotor(e)}: ${t.corto || "error"}`),
          a.reiniciar(),
          a.pensando(`${etiquetaMotor(e)} falló, probando otro`));
      },
    });
  } catch (e) {
    return finalizarConError(a, e, s, {
      conv: o.conv,
      motor: e.motor || i,
      entrada: d + l.map((e) => e.content).join("\n"),
      segundos: (performance.now() - (r || n)) / 1e3,
    });
  }
  const m = (performance.now() - (r || n)) / 1e3;
  ((a.texto = u.texto + ""),
    (a.razon = u.razon),
    anotar(o.conv, { role: "assistant", content: u.texto, via: etiquetaMotor(u.motor) }),
    await a.terminar());
  try {
    a.fuentes(u.fuentes);
    const e = contar(u, u.texto, m);
    (a.pieDePagina({
      via: etiquetaMotor(u.motor),
      tokens: e.tokens,
      tps: e.tps,
      avisos: s.concat(avisosFaltan(u), avisoCorte(u), avisoSinVer(u)),
      texto: u.texto,
    }),
      Codigo.procesar(u.texto, a.bubble));
  } catch (e) {
    console.error(e);
  }
  return u.texto;
}
const avisoCorte = (e) =>
    "tokens" === e.cortado
      ? ["✂️ cortada: llegó al límite de tokens (sube el esfuerzo)"]
      : "red" === e.cortado
        ? ["✂️ la conexión se cortó antes de terminar"]
        : "pausa" === e.cortado
          ? ["✂️ se quedó a medias usando herramientas: pídele que siga"]
          : "rechazo" === e.cortado
            ? ["🚫 el modelo prefirió no responder a esto"]
            : [],
  avisoSinVer = (e) =>
    e && e.sinVer && e.sinVer.length ? [`📎 ${etiquetaMotor(e.motor)} no pudo abrir: ${e.sinVer.join(", ")}`] : [];
function marcarPendiente() {
  const e = [...historial].reverse().find((e) => "user" === e.role && !e.local);
  if (!e || e.pendiente) return;
  e.pendiente = !0;
  const t = document.querySelectorAll(".user-msg .msg-meta"),
    o = t[t.length - 1];
  (o &&
    !o.querySelector(".pendiente-badge") &&
    o.insertAdjacentHTML("beforeend", '<span class="pendiente-badge">⏳ se enviará al volver internet</span>'),
    guardarActual(),
    Red.pintar());
}
function finalizarConError(e, t, o, a = {}) {
  const n = separarThink(e.texto).texto;
  if (
    (t && t.sinRed && !n.trim() && !esAbort(t) && marcarPendiente(),
    esAbort(t)
      ? (e.terminarYa(), n || e.error("Detenido."), e.pieDePagina({ avisos: ["detenido"], texto: n }))
      : (e.error(t.message || String(t)),
        e.pieDePagina({ via: t.motor ? etiquetaMotor(t.motor) : "", avisos: o, texto: n })),
    a.motor && (n || e.razon))
  )
    try {
      contar(
        { motor: a.motor, usage: { in: estimarTokens(a.entrada || ""), out: estimarTokens(n + e.razon) } },
        n,
        a.segundos || 0,
      );
    } catch (e) {}
  return (
    n && anotar(a.conv ?? convId, { role: "assistant", content: n, via: t.motor ? etiquetaMotor(t.motor) : "" }),
    n || null
  );
}
const PRO_PARTES = [
  { k: "A", id: "cece-enterprise-plus", nom: "Ent. Plus" },
  { k: "D", id: "cece-argon", nom: "Argon" },
  { k: "B", id: "cece-astra", nom: "Astra" },
  { k: "C", id: "cece-max", nom: "Max" },
].map((e) => ({
  ...e,
  get color() {
    return colorDe(CECE_MAP[e.id]);
  },
  w: () => S["rep" + e.k],
}));
function partesPro(e = "⏳ trabajando…") {
  const t = new Set(),
    o = PRO_PARTES.map((t, o) => ({ ...t, i: o, peso: S.maxi ? 100 : t.w(), texto: "", estado: e })).filter(
      (e) => e.peso > 0,
    ),
    a = o.filter((e) => motoresDe(e.id).length);
  return (a.length ? a : o).filter((e) => {
    const o = motoresDe(e.id)[0],
      a = o ? o.prov + "|" + o.modelo : e.id;
    return !t.has(a) && (t.add(a), !0);
  });
}
function montarBorradores(e, t, o, a) {
  const n = document.createElement("details");
  ((n.className = "borradores"),
    (n.open = !0),
    (n.innerHTML =
      `<summary>${esc(o)} (${t.length})</summary>` +
      t
        .map(
          (e, t) =>
            `<div class="borrador" data-k="${e.k}" style="border-left-color:${e.color};--c:${e.color}"><div class="borrador-cab" style="color:${e.color}">${a ? t + 1 + " · " : ""}${esc(e.nom)}<span class="est">${esc(e.estado)}</span></div><div class="borrador-archivos" hidden></div><div class="borrador-txt"></div></div>`,
        )
        .join("")),
    e.wrap.querySelector(".msg-body").insertBefore(n, e.meta));
  let r = !1;
  const repintar = () => {
    r ||
      ((r = !0),
      requestAnimationFrame(() => {
        r = !1;
        for (const e of t) {
          const t = n.querySelector(`[data-k="${e.k}"]`);
          ((t.querySelector(".est").textContent = e.estado), t.classList.toggle("turno", !!e.turno));
          const o = t.querySelector(".borrador-archivos");
          ((o.hidden = !(e.archivos && e.archivos.length)),
            o.hidden || (o.textContent = "📄 " + e.archivos.join(", ")),
            (t.querySelector(".borrador-txt").innerHTML = md(separarThink(e.texto).texto)));
        }
        bajar();
      }));
  };
  return { det: n, repintar: repintar };
}
const TOPE_MESA = 3e5;
function nombreDeBloque(e) {
  const t = String(e.info || "")
      .trim()
      .split(/\s+/),
    o =
      t[1] && /\.\w+$/.test(t[1])
        ? t[1]
        : (String(e.codigo || "")
            .split("\n")[0]
            .match(RE_NOMBRE) || [])[1];
  return o ? limpiarNombre(o) : "";
}
function archivosDe(e) {
  return vallas(normalizarTexto(separarThink(e).texto))
    .bloques.filter((e) => e.cerrado)
    .map((e) => {
      const t = nombreDeBloque(e);
      return t
        ? { nombre: t, lang: (String(e.info).trim().split(/\s+/)[0] || "").toLowerCase(), codigo: e.codigo }
        : null;
    })
    .filter(Boolean);
}
const vallaPara = (e) => "`".repeat(Math.max(3, ...(String(e).match(/`+/g) || []).map((e) => e.length + 1)));
function bloqueArchivo(e) {
  const t = vallaPara(e.codigo);
  return `${t}${e.lang || (e.nombre.includes(".") ? e.nombre.split(".").pop().toLowerCase() : "texto")} ${e.nombre}\n${e.codigo}\n${t}`;
}
function notasDe(e, t = 6e4) {
  const o = vallas(normalizarTexto(separarThink(e).texto)),
    a = o.texto
      .replace(/\u0000(\d+)\u0000/g, (e, t) => {
        const a = o.bloques[+t],
          n = a.cerrado && nombreDeBloque(a);
        if (n) return `[📄 ${n}]`;
        const r = vallaPara(a.codigo);
        return r + a.info + "\n" + a.codigo + "\n" + r;
      })
      .trim();
  return a.length > t ? a.slice(0, t) + "…" : a;
}
const INSTR_RELEVO =
  "Trabajas en equipo con otros modelos de Cece por relevo: todos tenéis el mismo objetivo (lo que pide el usuario) y os vais pasando los archivos que creáis. Si el objetivo pide código u otros archivos, escribe cada archivo COMPLETO en su propio bloque de código con el lenguaje y, en la primera línea, un comentario con su nombre (por ejemplo: // archivo: app.js o # archivo: main.py). Responde siempre al usuario directamente: no hables del equipo, del relevo ni de los pasos.";
function contextoRelevo(e, t, o, a) {
  const n = [`🤝 Relevo de Cece Pro — paso ${e + 1} de ${t}.`],
    r = [...o.values()];
  if (r.length) {
    let e = 0;
    const t = [],
      o = [];
    for (const a of r) {
      const n = bloqueArchivo(a);
      e + n.length > TOPE_MESA && t.length ? o.push(a.nombre) : ((e += n.length), t.push(`De ${a.autor}:\n${n}`));
    }
    n.push(
      "Archivos que ha creado el equipo hasta ahora (la última versión de cada uno):\n\n" +
        t.join("\n\n") +
        (o.length ? `\n\n(No caben aquí, pero existen y pasan tal cual: ${o.join(", ")}.)` : ""),
    );
  }
  const i = a ? notasDe(a.texto) : "";
  return (
    i && n.push(`Lo que respondió el paso anterior (${a.nom}):\n${i}`),
    n.push(
      e === t - 1
        ? "Eres el último del relevo: da la respuesta final para el usuario, completa y clara, con el mismo objetivo. Corrige lo que esté mal y mejóralo. Escribe completo cada archivo que cambies o crees (con su nombre en la primera línea); los que no cambies se entregarán tal cual junto a tu respuesta."
        : "Tu turno: con el mismo objetivo, revisa ese trabajo, corrige los errores y mejóralo. Escribe completo cada archivo que cambies o crees (con su nombre en la primera línea); los que no cambies no hace falta repetirlos: pasan tal cual al siguiente.",
    ),
    n.join("\n\n")
  );
}
function conContexto(e, t) {
  const o = e.slice();
  let a = o.length - 1;
  for (; a >= 0 && "user" !== o[a].role;) a--;
  if (a < 0) return [...o, { role: "user", content: t }];
  const n = o[a];
  return (
    (o[a] = { ...n, content: ("string" == typeof n.content && n.content ? n.content + "\n\n---\n" : "") + t }),
    o
  );
}
function finalRelevo(e, t) {
  let o = separarThink(e.texto).texto.trim();
  const a = new Set(archivosDe(o).map((e) => e.nombre)),
    n = [...t.values()].filter((e) => !a.has(e.nombre));
  return (n.length && (o += "\n\n### 📁 Archivos del equipo\n\n" + n.map(bloqueArchivo).join("\n\n")), o);
}
function cerrarPro(e, t, o, a, n, r, i, s) {
  const uso = (e) => ({ in: (e.usage && e.usage.in) || 0, out: (e.usage && e.usage.out) || estimarTokens(e.texto) });
  let c = 0,
    l = 0;
  for (const e of o) {
    const t = uso(e);
    (sumarCoste(e.motor, t.in, t.out), (c += t.in), (l += t.out));
  }
  const d = contar({ ...a, usage: { in: c, out: l } }, t, (performance.now() - n) / 1e3, !0);
  e.pieDePagina({ via: r, tokens: d.tokens, tps: d.tps, avisos: i, texto: t });
  try {
    Codigo.procesar(t, e.bubble);
  } catch (e) {
    console.error(e);
  }
}
async function ejecutarRelevo(e, t = {}) {
  const o = esfuerzoDe(t);
  await Familias.prepararPara(PRO_PARTES.map((e) => e.id));
  const a = partesPro("⏳ espera su turno").sort((e, t) => e.peso - t.peso || t.i - e.i),
    n = (burbujaActiva = new Burbuja(`Relevo de ${a.length} modelos`));
  await Adjuntos.hidratar(historial);
  const r = historialApi(),
    i = performance.now(),
    { det: s, repintar: c } = montarBorradores(n, a, "🤝 Relevo", !0),
    l = new Map(),
    d = [],
    u = [];
  let m = null;
  for (let i = 0; i < a.length && !e.aborted; i++) {
    const s = a[i];
    ((s.turno = !0),
      (s.estado = "✍️ trabajando…"),
      n.pensando(
        `Paso ${i + 1} de ${a.length} · ${s.nom}` + (l.size ? ` · ${l.size} archivo${l.size > 1 ? "s" : ""}` : ""),
      ),
      c());
    try {
      const n = await llamarCece(s.id, {
        mensajes: i ? conContexto(r, contextoRelevo(i, a.length, l, m)) : r,
        sistema: sistemaPara(s.id, INSTR_RELEVO, o),
        maxTok: Math.max(maxTokens(o), 8192),
        esf: o,
        signal: e,
        ...extrasDe(t),
        mantenerOrden: !0,
        onTexto: (e) => {
          ((s.texto += e), c());
        },
        onActividad: (e) => {
          ((s.estado = e), c());
        },
        onSalto: (e) => {
          ((s.texto = ""), (s.estado = `${etiquetaMotor(e)} falló, probando otro…`), c());
        },
      });
      ((s.r = n), (s.texto = n.texto));
      const u = archivosDe(n.texto);
      for (const e of u) l.set(e.nombre, { ...e, autor: s.nom });
      ((s.archivos = u.map((e) => e.nombre)),
        (s.estado =
          `✓ ${etiquetaMotor(n.motor)}` + (u.length ? ` · pasa ${u.length} archivo${u.length > 1 ? "s" : ""}` : "")),
        d.push(s),
        (m = s));
    } catch (e) {
      if (esAbort(e)) {
        ((s.estado = "⏹ detenido"), (s.turno = !1));
        break;
      }
      ((s.error = e),
        (s.estado = `❌ ${e.corto || "error"}` + (i < a.length - 1 ? " · sigue el siguiente" : "")),
        u.push(`${s.nom}: ${e.corto || "error"}`));
    }
    ((s.turno = !1), c());
  }
  if (e.aborted) {
    for (const e of a) e.r || e.error || !e.estado.startsWith("⏳") || (e.estado = "⏹ no llegó a su turno");
    return (
      c(),
      m && (n.texto = finalRelevo(m, l)),
      finalizarConError(n, new DOMException("stop", "AbortError"), [], { conv: t.conv, motor: m && m.r.motor })
    );
  }
  if (!d.length) {
    return finalizarConError(n, (a.find((e) => e.error) || {}).error || new Error("Ningún modelo respondió."), [], {
      conv: t.conv,
    });
  }
  const h = finalRelevo(m, l),
    g = [].concat(...d.map((e) => e.r.fuentes || [])).filter((e, t, o) => o.findIndex((t) => t.url === e.url) === t);
  return (
    (n.texto = h),
    anotar(t.conv, { role: "assistant", content: h, via: "Cece Pro" }),
    await n.terminar(),
    n.fuentes(g),
    (s.open = !1),
    cerrarPro(
      n,
      h,
      d.map((e) => e.r),
      m.r,
      i,
      "Cece Pro · relevo · " + d.map((e) => etiquetaMotor(e.r.motor)).join(" → "),
      u.concat(...d.map((e) => avisoSinVer(e.r))),
      g,
    ),
    h
  );
}
async function ejecutarPro(e, t = {}) {
  if (S.relevo) return ejecutarRelevo(e, t);
  const o = esfuerzoDe(t);
  await Familias.prepararPara(PRO_PARTES.map((e) => e.id));
  const a = partesPro(),
    n = (burbujaActiva = new Burbuja(`${a.length} modelos trabajando`));
  await Adjuntos.hidratar(historial);
  const r = historialApi(),
    i = performance.now(),
    { det: s, repintar: c } = montarBorradores(n, a, "🧪 Borradores"),
    l = await Promise.allSettled(
      a.map((a) =>
        llamarCece(a.id, {
          mensajes: r,
          sistema: sistemaPara(a.id, "", o),
          maxTok: maxTokens(o),
          esf: o,
          signal: e,
          ...extrasDe(t),
          mantenerOrden: !0,
          onTexto: (e) => {
            ((a.texto += e), c());
          },
          onActividad: (e) => {
            ((a.estado = e), c());
          },
          onSalto: (e) => {
            ((a.estado = `${etiquetaMotor(e)} falló, probando otro…`), c());
          },
        }).then(
          (e) => ((a.r = e), (a.texto = e.texto), (a.estado = `✓ ${etiquetaMotor(e.motor)}`), c(), e),
          (e) => {
            throw ((a.error = e), (a.estado = esAbort(e) ? "⏹ detenido" : `❌ ${e.corto || "error"}`), c(), e);
          },
        ),
      ),
    ),
    d = a.filter((e) => e.r).sort((e, t) => t.peso - e.peso);
  if (e.aborted)
    return (
      d.length && (n.texto = d[0].texto),
      finalizarConError(n, new DOMException("stop", "AbortError"), [], { conv: t.conv, motor: d[0] && d[0].r.motor })
    );
  if (!d.length) {
    const e = (l.find((e) => "rejected" === e.status) || {}).reason || new Error("Ningún modelo respondió.");
    return finalizarConError(n, e, [], { conv: t.conv });
  }
  const u = a
    .filter((e) => e.error && !esAbort(e.error))
    .map((e) => `${e.nom}: ${e.error.corto || "error"}`)
    .concat(...d.map((e) => avisoSinVer(e.r)));
  let m, h;
  const g = []
    .concat(...d.map((e) => e.r.fuentes || []))
    .filter((e, t, o) => o.findIndex((t) => t.url === e.url) === t);
  if (S.fusion && d.length > 1) {
    n.pensando("Fusionando las respuestas");
    const a = S.maxi ? d.slice().sort((e, t) => e.i - t.i)[0].id : d[0].id,
      i = d
        .map((e, t) => `### Borrador ${t + 1} — ${e.nom}${S.maxi ? "" : ` (peso ${e.peso}%)`}\n${e.texto}`)
        .join("\n\n"),
      s = [...r].reverse().find((e) => "user" === e.role),
      c = `Pregunta del usuario:\n${s ? s.content : ""}\n\n${i}\n\nEscribe UNA sola respuesta final para el usuario que combine lo mejor de los borradores${S.maxi ? "" : ", dando más importancia a los de más peso"}. Corrige errores y contradicciones. Si hay código, unifícalo en una sola versión completa y funcional. No menciones los borradores ni este proceso.`;
    try {
      let i = null;
      ((h = await llamarCece(a, {
        mensajes: [...r.slice(0, -1), { role: "user", content: c }],
        sistema: sistemaPara(a, "", o),
        maxTok: maxTokens(o),
        esf: o,
        signal: e,
        web: !1,
        rapido: !!t.rapido,
        onTexto: (e) => {
          (i || (i = performance.now()), n.meter(e));
        },
      })),
        (m = h.texto));
    } catch (e) {
      if (esAbort(e))
        return (
          separarThink(n.texto).texto.trim() || (n.texto = d[0].texto),
          finalizarConError(n, e, u, { conv: t.conv })
        );
      (u.push("fusión: " + (e.corto || "error")), (n.texto = ""));
    }
  }
  return (
    m ||
      ((m = S.maxi && d.length > 1 ? d.map((e) => `### ${e.nom}\n\n${e.texto}`).join("\n\n---\n\n") : d[0].texto),
      (h = d[0].r)),
    (n.texto = m),
    anotar(t.conv, { role: "assistant", content: m, via: "Cece Pro" }),
    await n.terminar(),
    n.fuentes(g),
    (s.open = !1),
    cerrarPro(
      n,
      m,
      d.map((e) => e.r).concat(h !== d[0].r ? [h] : []),
      h,
      i,
      "Cece Pro · " + d.map((e) => etiquetaMotor(e.r.motor)).join(" + "),
      u,
      g,
    ),
    m
  );
}
async function generarImagen(e, t, o = {}) {
  const a = (burbujaActiva = new Burbuja("Dibujando")),
    n = "auto" === S.imgMotor ? ["openai", "gratis"] : [S.imgMotor],
    r = [];
  for (const i of n)
    try {
      let n, s;
      if ("openai" === i) {
        if (!claveDe("openai")) {
          if ("auto" !== S.imgMotor)
            throw new ErrorApi("Falta la configuración de Cece Imagen.", { corto: "sin clave" });
          continue;
        }
        const o = await postJSON(
            "openai",
            baseDe("openai") + "/images/generations",
            [{ model: S.imgModeloOpenai, prompt: e, n: 1, size: "1024x1024" }],
            { "Content-Type": "application/json", Authorization: "Bearer " + claveDe("openai") },
            t,
            S.imgModeloOpenai,
            { tiempo: 18e4 },
          ),
          a = await o.json(),
          r = a.data && a.data[0];
        if (!r) throw new ErrorApi("Cece Imagen no devolvió imagen.", { corto: "sin imagen" });
        if (
          ((n = r.b64_json ? "data:image/png;base64," + r.b64_json : r.url),
          !/^(https:\/\/|data:image\/(png|jpe?g|webp|gif);base64,)/i.test(String(n || "")))
        )
          throw new ErrorApi("Cece Imagen devolvió una imagen con un enlace no válido.", { corto: "imagen no válida" });
        s = "Cece Imagen";
      } else
        ((n = `https://image.pollinations.ai/prompt/${encodeURIComponent(e)}?width=1024&height=1024&nologo=true&seed=${Math.floor(1e9 * Math.random())}`),
          await new Promise((e, o) => {
            const a = new Image(),
              r = setTimeout(
                () => o(new ErrorApi("El servicio gratuito de imágenes tardó demasiado.", { corto: "tiempo agotado" })),
                9e4,
              );
            ((a.onload = () => {
              (clearTimeout(r), e());
            }),
              (a.onerror = () => {
                (clearTimeout(r),
                  o(new ErrorApi("El servicio gratuito de imágenes no respondió.", { corto: "sin respuesta" })));
              }),
              t.addEventListener("abort", () => {
                (clearTimeout(r), o(new DOMException("stop", "AbortError")));
              }),
              (a.src = n));
          }),
          (s = "Cece Imagen (gratis)"));
      return (
        (a.bubble.className = "bubble"),
        (a.bubble.innerHTML = `<img class="gen-img" alt="${esc(e)}" src="${esc(n)}"><div class="img-actions"><a href="${esc(n)}" download="cece-imagen-${sello()}.png" target="_blank" rel="noopener">⬇️ Descargar imagen</a></div>`),
        a.bubble.querySelector("img").addEventListener("load", () => bajar(!0)),
        anotar(o.conv ?? convId, { role: "assistant", content: `(Imagen generada: «${e}»)`, imagen: !0, via: s }),
        a.pieDePagina({ via: s, avisos: r }),
        null
      );
    } catch (e) {
      if (esAbort(e)) return finalizarConError(a, e, r, { conv: o.conv });
      (r.push(`${"openai" === i ? "Cece Imagen" : "Cece Imagen (gratis)"}: ${e.corto || "error"}`),
        i === n[n.length - 1] && (a.error(e.message), a.pieDePagina({ avisos: r })));
    }
  return null;
}
function bienvenida() {
  const e = crearMensaje("assistant"),
    t = new Date().getHours(),
    a = `**${t < 7 ? "Buenas noches" : t < 13 ? "Buenos días" : t < 21 ? "Buenas tardes" : "Buenas noches"}, soy Cece AI** 👋 ¿En qué te ayudo? Pulsa **LIVE** para hablar conmigo.`;
  ((e.bubble.innerHTML = md(a)), (e.meta.innerHTML = `<span>${horaCorta()}</span>`), aplicarEmojis(e.wrap));
}
function pintarHistorial() {
  if (((mensajesEl().innerHTML = ""), !historial.length)) return bienvenida();
  for (const e of historial)
    if ("user" === e.role) pintarUsuario(e);
    else {
      const t = crearMensaje("assistant");
      try {
        t.bubble.innerHTML = md(e.content);
      } catch (o) {
        (console.error(o), (t.bubble.textContent = e.content));
      }
      (e.local && /^❌/.test(e.content) && t.bubble.classList.add("err"),
        (t.meta.innerHTML = `<span>${e.via ? (e.local ? "" : "vía ") + esc(e.via) : ""}</span>`));
      const o = document.createElement("button");
      ((o.className = "mini-btn"),
        (o.textContent = "📋 Copiar"),
        (o.onclick = () => copiar(e.content, o)),
        t.meta.appendChild(o),
        aplicarEmojis(t.meta));
    }
  bajar(!0);
}
function mensajeParaGuardar(e) {
  const t = { ...e };
  if (e.adjuntos) {
    const o = adjuntosParaGuardar(e.adjuntos);
    o.length ? (t.adjuntos = o) : delete t.adjuntos;
  }
  return t;
}
function guardarActual() {
  almacen.set("cece_actual", { id: convId, mensajes: historial.filter((e) => !e.error).map(mensajeParaGuardar) }) ||
    !almacen.ok ||
    guardarActual._avisado ||
    ((guardarActual._avisado = !0),
    toast(
      "⚠️ El navegador está lleno: la conversación no se guarda. Exporta o borra conversaciones antiguas.",
      "mal",
      8e3,
    ));
}
const EXT_TEXTO = new Set(
    "txt md markdown csv tsv json jsonl js mjs cjs ts tsx jsx py pyw rb php java kt kts swift go rs c h cc cpp hpp cs fs vb m mm r jl lua pl pm sh bash zsh fish ps1 bat cmd sql html htm css scss sass less xml svg yml yaml toml ini cfg conf env properties log srt vtt tex bib rst adoc org ipynb vue svelte astro dart scala clj ex exs erl hs elm nim zig sol graphql gql proto gradle makefile dockerfile gitignore editorconfig rtf".split(
      " ",
    ),
  ),
  EXT_IMAGEN = new Set(["png", "jpg", "jpeg", "jfif", "webp", "gif", "bmp", "avif", "ico"]),
  EXT_OFFICE = { docx: "docx", xlsx: "xlsx", pptx: "pptx" },
  LIM_ADJ = {
    max: 10,
    ladoImg: 2048,
    img: 25 << 20,
    pdf: 20 << 20,
    texto: 5 << 20,
    office: 20 << 20,
    chars: 3e5,
    total: 30 << 20,
  },
  SIN_EXTENSION =
    /^(makefile|dockerfile|readme|license|licence|changelog|authors|contributing|copying|notice|todo|procfile|gemfile|rakefile|vagrantfile|jenkinsfile|caddyfile)$/,
  extension = (e) => {
    const t = String(e || "").toLowerCase();
    if (/^\.env(\.[\w-]+)?$/.test(t)) return "env";
    const o = t.lastIndexOf(".");
    return o > 0
      ? t.slice(o + 1)
      : 0 === o
        ? t.slice(1)
        : SIN_EXTENSION.test(t)
          ? /^(makefile|dockerfile)$/.test(t)
            ? t
            : "txt"
          : "";
  };
function tipoDeArchivo(e, t) {
  const o = extension(e),
    a = String(t || "").toLowerCase();
  return "svg" === o || "image/svg+xml" === a
    ? "texto"
    : a.startsWith("image/") || EXT_IMAGEN.has(o)
      ? /heic|heif/.test(a + o)
        ? null
        : "imagen"
      : "application/pdf" === a || "pdf" === o
        ? "pdf"
        : EXT_OFFICE[o]
          ? EXT_OFFICE[o]
          : a.startsWith("text/") || EXT_TEXTO.has(o) || /json|xml|javascript|x-sh|x-python|yaml|toml|csv/.test(a)
            ? "texto"
            : null;
}
class ErrorAdjunto extends Error {}
function indiceZip(e) {
  const t = e instanceof Uint8Array ? e : new Uint8Array(e),
    o = new DataView(t.buffer, t.byteOffset, t.byteLength);
  let a = -1;
  for (let e = t.length - 22; e >= Math.max(0, t.length - 65557); e--)
    if (101010256 === o.getUint32(e, !0)) {
      a = e;
      break;
    }
  if (a < 0) throw new ErrorAdjunto("no es un archivo ZIP válido");
  const n = o.getUint16(a + 10, !0);
  let r = o.getUint32(a + 16, !0);
  const i = new Map(),
    s = new TextDecoder();
  for (let e = 0; e < n; e++) {
    if (r + 46 > t.length || 33639248 !== o.getUint32(r, !0)) throw new ErrorAdjunto("el índice del ZIP está dañado");
    const e = o.getUint16(r + 10, !0),
      a = o.getUint32(r + 20, !0),
      n = o.getUint32(r + 24, !0),
      c = o.getUint16(r + 28, !0),
      l = o.getUint16(r + 30, !0),
      d = o.getUint16(r + 32, !0),
      u = o.getUint32(r + 42, !0);
    (i.set(s.decode(t.subarray(r + 46, r + 46 + c)), { metodo: e, comp: a, tam: n, local: u }), (r += 46 + c + l + d));
  }
  return { u8: t, dv: o, mapa: i };
}
async function inflar(e, t) {
  const o = new Blob([e]).stream().pipeThrough(new DecompressionStream("deflate-raw")).getReader(),
    a = [];
  let n = 0;
  for (;;) {
    const { done: e, value: r } = await o.read();
    if (e) break;
    if (((n += r.length), n > t))
      throw (o.cancel().catch(() => {}), new ErrorAdjunto("el archivo descomprimido es demasiado grande"));
    a.push(r);
  }
  const r = new Uint8Array(n);
  let i = 0;
  for (const e of a) (r.set(e, i), (i += e.length));
  return r;
}
async function sacarDeZip(e, t, o = 40 << 20) {
  const a = e.mapa.get(t);
  if (!a) return null;
  if (67324752 !== e.dv.getUint32(a.local, !0)) throw new ErrorAdjunto("el ZIP está dañado");
  const n = a.local + 30 + e.dv.getUint16(a.local + 26, !0) + e.dv.getUint16(a.local + 28, !0),
    r = e.u8.subarray(n, n + a.comp);
  if (0 === a.metodo) return r.slice();
  if (8 === a.metodo) return inflar(r, Math.min(o, 2 * Math.max(a.tam, 1) + 1024));
  throw new ErrorAdjunto("compresión no soportada");
}
const xmlTexto = (e) =>
  String(e)
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (e, t) => {
      try {
        return String.fromCodePoint(+t);
      } catch (t) {
        return e;
      }
    })
    .replace(/&#x([0-9a-f]+);/gi, (e, t) => {
      try {
        return String.fromCodePoint(parseInt(t, 16));
      } catch (t) {
        return e;
      }
    })
    .replace(/&amp;/g, "&");
function docxXmlATexto(e) {
  return xmlTexto(
    String(e)
      .replace(/<w:instrText[\s\S]*?<\/w:instrText>/g, "")
      .replace(/<w:tc\b[\s\S]*?<\/w:tc>/g, (e) =>
        e
          .replace(/<\/w:p>/g, " ")
          .replace(/<w:tab\/>/g, " ")
          .replace(/<w:(br|cr)\b[^>]*\/>/g, " "),
      )
      .replace(/<w:tab\/>/g, "\t")
      .replace(/<w:(br|cr)\b[^>]*\/>/g, "\n")
      .replace(/<\/w:tc>/g, " | ")
      .replace(/<\/w:tr>/g, "\n")
      .replace(/<\/w:p>/g, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/ +\| /g, " | ")
    .replace(/ \| \n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
const colExcel = (e) => [...String(e).toUpperCase()].reduce((e, t) => 26 * e + t.charCodeAt(0) - 64, 0) - 1;
function xlsxHojaATexto(e, t) {
  const o = [];
  for (const a of String(e).match(/<row\b[\s\S]*?<\/row>/g) || []) {
    const e = [];
    for (const o of a.match(/<c\b[^>]*?(?:\/>|>[\s\S]*?<\/c>)/g) || []) {
      const a = /\br="([A-Z]+)\d+"/.exec(o),
        n = /\bt="(\w+)"/.exec(o),
        r = /<v>([\s\S]*?)<\/v>/.exec(o),
        i = /<is>([\s\S]*?)<\/is>/.exec(o);
      let s = "";
      n && "s" === n[1] && r
        ? (s = t[+r[1]] ?? "")
        : n && "inlineStr" === n[1] && i
          ? (s = xmlTexto(i[1].replace(/<[^>]+>/g, "")))
          : r && (s = xmlTexto(r[1]));
      const c = a ? colExcel(a[1]) : e.length;
      if (c >= 0 && c < 1e3) {
        for (; e.length < c;) e.push("");
        e[c] = s;
      }
    }
    o.push(e.map((e) => (/[",\n]/.test(e) ? '"' + e.replace(/"/g, '""') + '"' : e)).join(","));
  }
  return o.join("\n").replace(/\n+$/, "");
}
async function officeATexto(e, t) {
  const o = indiceZip(e),
    leer = async (e) => {
      const t = await sacarDeZip(o, e);
      return t ? new TextDecoder().decode(t) : null;
    },
    orden = (e, t) => +(/(\d+)\.xml$/.exec(e) || [0, 0])[1] - +(/(\d+)\.xml$/.exec(t) || [0, 0])[1];
  if ("docx" === t) {
    const e = await leer("word/document.xml");
    if (null == e) throw new ErrorAdjunto("no parece un documento de Word (.docx)");
    return docxXmlATexto(e);
  }
  if ("pptx" === t) {
    const e = [...o.mapa.keys()].filter((e) => /^ppt\/slides\/slide\d+\.xml$/.test(e)).sort(orden);
    if (!e.length) throw new ErrorAdjunto("no parece una presentación de PowerPoint (.pptx)");
    const t = [];
    for (const [o, a] of e.entries()) {
      const n = ((await leer(a)).match(/<a:p(?:\s[^>]*)?>[\s\S]*?<\/a:p>/g) || [])
        .map((e) => xmlTexto([...e.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g)].map((e) => e[1]).join("")))
        .filter((e) => e.trim());
      t.push(`## Diapositiva ${o + 1}\n` + n.join("\n"));
    }
    return t.join("\n\n");
  }
  if ("xlsx" === t) {
    const e = await leer("xl/sharedStrings.xml"),
      t = e
        ? (e.match(/<si>[\s\S]*?<\/si>/g) || []).map((e) =>
            xmlTexto((e.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || []).map((e) => e.replace(/<[^>]+>/g, "")).join("")),
          )
        : [],
      n = (((await leer("xl/workbook.xml")) || "").match(/<sheet\b[^>]*>/g) || []).map((e) =>
        xmlTexto((/name="([^"]*)"/.exec(e) || [0, ""])[1]),
      ),
      r = [...o.mapa.keys()].filter((e) => /^xl\/worksheets\/sheet\d+\.xml$/.test(e)).sort(orden);
    if (!r.length) throw new ErrorAdjunto("no parece una hoja de Excel (.xlsx)");
    const i = [];
    for (const [e, o] of r.entries())
      i.push(`## Hoja: ${n[e] || "Hoja " + (e + 1)}\n` + xlsxHojaATexto(await leer(o), t));
    return i.join("\n\n");
  }
  throw new ErrorAdjunto("tipo no soportado");
}
async function abrirImagen(e) {
  if ("function" == typeof createImageBitmap)
    try {
      return await createImageBitmap(e);
    } catch (e) {}
  const t = URL.createObjectURL(e);
  try {
    return await new Promise((e, o) => {
      const a = new Image();
      ((a.onload = () => e(a)), (a.onerror = () => o(new ErrorAdjunto("no se puede abrir la imagen"))), (a.src = t));
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(t), 0);
  }
}
async function leerImagen(e) {
  const t = await abrirImagen(e).catch(() => {
      throw new ErrorAdjunto("este navegador no sabe abrir esa imagen (prueba con JPG o PNG)");
    }),
    o = t.width || t.naturalWidth,
    a = t.height || t.naturalHeight;
  if (!o || !a) throw new ErrorAdjunto("la imagen está vacía o dañada");
  const n = Math.min(1, LIM_ADJ.ladoImg / Math.max(o, a));
  if (1 === n && e.size <= 3670016 && /^image\/(png|jpeg|webp)$/.test(e.type))
    return (
      t.close && t.close(),
      { datos: aBase64(new Uint8Array(await e.arrayBuffer())), mime: e.type, ancho: o, alto: a }
    );
  const r = Math.max(1, Math.round(o * n)),
    i = Math.max(1, Math.round(a * n)),
    s = document.createElement("canvas");
  ((s.width = r), (s.height = i));
  const c = s.getContext("2d"),
    l = /png|webp|gif|avif|ico/.test(e.type + extension(e.name));
  (l || ((c.fillStyle = "#fff"), c.fillRect(0, 0, r, i)), c.drawImage(t, 0, 0, r, i), t.close && t.close());
  let d = 0.88,
    u;
  for (let e = 0; e < 4; e++) {
    if (((u = await new Promise((e) => s.toBlob(e, l ? "image/webp" : "image/jpeg", d))), !u))
      throw new ErrorAdjunto("no se pudo preparar la imagen");
    if (u.size <= 4718592) break;
    d -= 0.15;
  }
  return { datos: aBase64(new Uint8Array(await u.arrayBuffer())), mime: u.type || "image/png", ancho: r, alto: i };
}
function decodificarTexto(e) {
  const dec = (e, t) => new TextDecoder(e).decode(t);
  if (239 === e[0] && 187 === e[1] && 191 === e[2]) return dec("utf-8", e.subarray(3));
  if (255 === e[0] && 254 === e[1]) return dec("utf-16le", e.subarray(2));
  if (254 === e[0] && 255 === e[1]) return dec("utf-16be", e.subarray(2));
  const t = e.subarray(0, 4096);
  if (t.length >= 4) {
    let o = 0,
      a = 0;
    for (let e = 0; e + 1 < t.length; e += 2) (0 === t[e] && o++, 0 === t[e + 1] && a++);
    const n = Math.floor(t.length / 2);
    if (a > 0.6 * n && o < 0.1 * n) return dec("utf-16le", e);
    if (o > 0.6 * n && a < 0.1 * n) return dec("utf-16be", e);
  }
  if (t.includes(0)) throw new ErrorAdjunto("parece un archivo binario, no de texto");
  try {
    return new TextDecoder("utf-8", { fatal: !0 }).decode(e);
  } catch (t) {
    return dec("windows-1252", e);
  }
}
async function procesarArchivo(e) {
  const t = String(e.name || "archivo").slice(0, 180),
    o = tipoDeArchivo(t, e.type);
  if (!o)
    throw new ErrorAdjunto(
      /heic|heif/i.test(t + e.type)
        ? "las fotos HEIC no se pueden abrir en el navegador: conviértelas a JPG"
        : "ese tipo de archivo no se puede leer",
    );
  const a = { id: uid(), nombre: t, tam: e.size };
  if ("imagen" === o) {
    if (e.size > LIM_ADJ.img) throw new ErrorAdjunto(`la imagen pasa de ${tamLegible(LIM_ADJ.img)}`);
    return { ...a, tipo: o, ...(await leerImagen(e)) };
  }
  if ("pdf" === o) {
    if (e.size > LIM_ADJ.pdf) throw new ErrorAdjunto(`el PDF pasa de ${tamLegible(LIM_ADJ.pdf)}`);
    const t = new Uint8Array(await e.arrayBuffer());
    if (37 !== t[0] || 80 !== t[1] || 68 !== t[2] || 70 !== t[3]) throw new ErrorAdjunto("no es un PDF válido");
    return { ...a, tipo: o, mime: "application/pdf", datos: aBase64(t) };
  }
  let n;
  if ("texto" === o) {
    if (e.size > LIM_ADJ.texto) throw new ErrorAdjunto(`el archivo de texto pasa de ${tamLegible(LIM_ADJ.texto)}`);
    n = decodificarTexto(new Uint8Array(await e.arrayBuffer()));
  } else {
    if (e.size > LIM_ADJ.office) throw new ErrorAdjunto(`el archivo pasa de ${tamLegible(LIM_ADJ.office)}`);
    n = await officeATexto(await e.arrayBuffer(), o);
  }
  const r = n.length > LIM_ADJ.chars;
  return {
    ...a,
    tipo: "texto",
    origen: o,
    mime: e.type || "text/plain",
    texto: r ? n.slice(0, LIM_ADJ.chars) : n,
    ...(r ? { recortado: !0 } : {}),
  };
}
function contenidoApi(e, t = null) {
  const o = (e.adjuntos || []).filter((e) => e && "texto" === e.tipo && "string" == typeof e.texto);
  if (!o.length) return e.content || "";
  const nom = (e) => String(e.nombre).replace(/["<>]/g, "'");
  return [
    e.content,
    ...o.map((e) =>
      t && t.has(e.id)
        ? `[Archivo «${nom(e)}»: se envió antes en esta conversación; no se reenvía para no pasarse de tamaño. Si lo necesitas entero, pide al usuario que lo adjunte otra vez]`
        : `<archivo nombre="${nom(e)}"${e.recortado ? ' recortado="sí"' : ""}>\n${e.texto.replace(/<\/archivo>/gi, "</ archivo>")}\n</archivo>`,
    ),
  ]
    .filter(Boolean)
    .join("\n\n");
}
const copiaMensajes = (e) =>
    (e || []).map((e) => (e && e.adjuntos ? { ...e, adjuntos: e.adjuntos.map((e) => ({ ...e })) } : { ...e })),
  adjBinarios = (e) => (e.adjuntos || []).filter((e) => e && ("imagen" === e.tipo || "pdf" === e.tipo));
function necesidades(e) {
  const t = { vista: !1, pdf: !1 };
  for (const o of e || [])
    for (const e of o.adjuntos || [])
      ("imagen" === e.tipo && e.datos && (t.vista = !0), "pdf" === e.tipo && e.datos && (t.pdf = !0));
  return t;
}
function adaptarAdjuntos(e, t) {
  const o = [],
    a = capacidad(t, "vista"),
    n = capacidad(t, "pdf");
  return {
    mensajes: (e || []).map((e) => {
      if (!e.adjuntos || !e.adjuntos.length) return e;
      const t = [],
        r = [];
      for (const i of e.adjuntos)
        !i ||
          ("imagen" !== i.tipo && "pdf" !== i.tipo) ||
          (i.datos
            ? ("imagen" === i.tipo && a) || ("pdf" === i.tipo && n)
              ? t.push(i)
              : (o.push(i.nombre),
                r.push(
                  "imagen" === i.tipo
                    ? `[Imagen adjunta «${i.nombre}»: este modelo no puede ver imágenes; díselo al usuario si la necesitas]`
                    : `[PDF adjunto «${i.nombre}»: este modelo no puede leer PDF; díselo al usuario si lo necesitas]`,
                ))
            : r.push(
                i.grande
                  ? `[Adjunto «${i.nombre}»: se envió antes en esta conversación; no se reenvía para no pasarse de tamaño]`
                  : `[Adjunto «${i.nombre}»: ya no está disponible]`,
              ));
      const i = [e.content, ...r].filter(Boolean).join("\n\n");
      return t.length ? { ...e, content: i, adjuntos: t } : { role: e.role, content: i };
    }),
    omitidos: o,
  };
}
const partesClaude = (e) => [
    ...e.adjuntos.map((e) =>
      "imagen" === e.tipo
        ? { type: "image", source: { type: "base64", media_type: e.mime, data: e.datos } }
        : {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: e.datos },
            title: e.nombre,
          },
    ),
    ...(e.content ? [{ type: "text", text: e.content }] : []),
  ],
  partesResponses = (e) => [
    ...(e.content ? [{ type: "input_text", text: e.content }] : []),
    ...e.adjuntos.map((e) =>
      "imagen" === e.tipo
        ? { type: "input_image", image_url: `data:${e.mime};base64,${e.datos}` }
        : { type: "input_file", filename: e.nombre, file_data: `data:application/pdf;base64,${e.datos}` },
    ),
  ],
  partesGemini = (e) => [
    ...e.adjuntos.map((e) => ({ inlineData: { mimeType: e.mime, data: e.datos } })),
    { text: e.content || "(archivo adjunto)" },
  ],
  partesOpenAI = (e) => [
    ...(e.content ? [{ type: "text", text: e.content }] : []),
    ...e.adjuntos
      .filter((e) => "imagen" === e.tipo)
      .map((e) => ({ type: "image_url", image_url: { url: `data:${e.mime};base64,${e.datos}` } })),
  ],
  MAX_TXT_GUARDADO = 2e4;
function adjuntosParaGuardar(e) {
  return (e || [])
    .filter((e) => e && "object" == typeof e && "string" == typeof e.nombre)
    .slice(0, LIM_ADJ.max)
    .map((e) => {
      const t = {
        id: String(e.id || uid()).slice(0, 40),
        nombre: e.nombre.slice(0, 180),
        tipo: "imagen" === e.tipo || "pdf" === e.tipo ? e.tipo : "texto",
        mime: String(e.mime || "").slice(0, 80),
        tam: +e.tam || 0,
      };
      if ("texto" === t.tipo) {
        const o = "string" == typeof e.texto ? e.texto : "";
        ((t.texto = o.slice(0, MAX_TXT_GUARDADO)),
          (e.recortado || o.length > MAX_TXT_GUARDADO) && (t.recortado = !0),
          "string" == typeof e.origen && (t.origen = e.origen.slice(0, 10)));
      } else e.perdido || (!e.datos && !e.idb) ? (t.perdido = !0) : (t.idb = !0);
      return t;
    });
}
function adjuntosValidos(e) {
  if (!Array.isArray(e)) return null;
  const t = adjuntosParaGuardar(
    e.filter(
      (e) => e && "object" == typeof e && "string" == typeof e.nombre && ["imagen", "pdf", "texto"].includes(e.tipo),
    ),
  );
  return t.length ? t : null;
}
const Adjuntos = {
  lista: [],
  ocupado: 0,
  async agregar(e) {
    if (!(e = [...(e || [])]).length) return;
    const t = LIM_ADJ.max - this.lista.length - this.ocupado;
    if (t <= 0) return void toast(`Como mucho ${LIM_ADJ.max} archivos por mensaje.`, "mal");
    e.length > t && toast(`Solo caben ${t} archivo(s) más en este mensaje.`, "mal");
    const o = e.slice(0, t);
    ((this.ocupado += o.length), this.pintar());
    for (const e of o)
      try {
        const t = await procesarArchivo(e);
        if (
          this.lista.reduce((e, t) => e + (t.datos ? 0.75 * t.datos.length : 0), 0) +
            (t.datos ? 0.75 * t.datos.length : 0) >
          LIM_ADJ.total
        )
          throw new ErrorAdjunto(`entre todos pasan de ${tamLegible(LIM_ADJ.total)}`);
        this.lista.push(t);
      } catch (t) {
        (toast(
          `📎 «${String(e.name).slice(0, 40)}»: ${t instanceof ErrorAdjunto ? t.message : "no se pudo leer"}`,
          "mal",
          6e3,
        ),
          t instanceof ErrorAdjunto || console.error(t));
      } finally {
        (this.ocupado--, this.pintar());
      }
  },
  quitar(e) {
    ((this.lista = this.lista.filter((t) => t.id !== e)), this.pintar());
  },
  sacar() {
    const e = this.lista;
    return ((this.lista = []), this.pintar(), e);
  },
  pintar() {
    const e = $("adjBandeja");
    e &&
      ((e.hidden = !this.lista.length && !this.ocupado),
      (e.innerHTML =
        this.lista
          .map(
            (e) =>
              `<span class="adj-item" data-id="${esc(e.id)}">` +
              ("imagen" === e.tipo
                ? `<img class="adj-mini-img" alt="" src="data:${esc(e.mime)};base64,${e.datos}">`
                : `<span class="adj-ico">${"pdf" === e.tipo ? "📕" : "xlsx" === e.origen ? "📊" : "pptx" === e.origen ? "📽️" : "📄"}</span>`) +
              `<span class="adj-nom" title="${esc(e.nombre)}">${esc(e.nombre)}</span><span class="adj-tam">${tamLegible(e.tam)}${e.recortado ? " · recortado" : ""}</span>` +
              `<button type="button" class="adj-x" aria-label="Quitar ${esc(e.nombre)}" title="Quitar">✕</button></span>`,
          )
          .join("") +
        (this.ocupado
          ? `<span class="adj-item adj-cargando"><span class="adj-ico">⏳</span><span class="adj-nom">Leyendo ${this.ocupado} archivo(s)…</span></span>`
          : "")),
      aplicarEmojis(e));
  },
  guardar(e) {
    for (const t of e || [])
      !t.datos ||
        ("imagen" !== t.tipo && "pdf" !== t.tipo) ||
        idb("set", "adj:" + t.id, { datos: t.datos, mime: t.mime }).then(
          () => {
            t.idb = !0;
          },
          () => {},
        );
  },
  async hidratar(e) {
    for (const t of e || [])
      for (const e of t.adjuntos || [])
        if (!e.datos && e.idb && !e.perdido)
          try {
            const t = await idb("get", "adj:" + e.id);
            t && "string" == typeof t.datos ? (e.datos = t.datos) : (e.perdido = !0);
          } catch (t) {
            e.perdido = !0;
          }
  },
  async limpiarHuerfanos(e) {
    try {
      const t = await idb("keys");
      for (const o of t || [])
        "string" == typeof o && o.startsWith("adj:") && !e.has(o.slice(4)) && (await idb("del", o));
    } catch (e) {}
  },
};
function adjuntosEnUso() {
  const e = new Set(),
    ver = (t) => {
      for (const o of t || []) for (const t of o.adjuntos || []) t && t.id && e.add(t.id);
    };
  ver(historial);
  for (const e of convs) ver(e.mensajes);
  return e;
}
function pintarAdjuntosEn(e, t) {
  if (!t || !t.length) return;
  const o = document.createElement("div");
  o.className = "adj-lista";
  for (const e of t)
    if ("imagen" !== e.tipo || e.perdido) o.appendChild(fichaAdjunto(e));
    else {
      const t = document.createElement("button");
      ((t.type = "button"),
        (t.className = "adj-foto"),
        (t.title = e.nombre),
        t.setAttribute("aria-label", "Ver " + e.nombre));
      const a = document.createElement("img");
      a.alt = e.nombre;
      const poner = (t) => {
        a.src = `data:${e.mime};base64,${t}`;
      };
      (e.datos
        ? poner(e.datos)
        : idb("get", "adj:" + e.id).then(
            (o) => {
              o && o.datos ? poner(o.datos) : t.replaceWith(fichaAdjunto({ ...e, perdido: !0 }));
            },
            () => {},
          ),
        t.appendChild(a),
        t.addEventListener("click", () => verImagen(a.src, e.nombre)),
        o.appendChild(t));
    }
  (e.appendChild(o), aplicarEmojis(o));
}
function fichaAdjunto(e) {
  const t = document.createElement("span");
  t.className = "adj-chip" + (e.perdido ? " perdido" : "");
  const o =
    "imagen" === e.tipo
      ? "🖼️"
      : "pdf" === e.tipo
        ? "📕"
        : "xlsx" === e.origen
          ? "📊"
          : "pptx" === e.origen
            ? "📽️"
            : "📄";
  return (
    (t.textContent =
      `${o} ${e.nombre}` + (e.tam ? ` · ${tamLegible(e.tam)}` : "") + (e.perdido ? " · ya no disponible" : "")),
    (t.title = e.nombre),
    t
  );
}
function verImagen(e, t) {
  if (!e) return;
  const o = document.createElement("div");
  ((o.className = "visor-img"),
    o.setAttribute("role", "dialog"),
    o.setAttribute("aria-label", t || "Imagen"),
    (o.tabIndex = -1));
  const a = document.createElement("img");
  ((a.src = e), (a.alt = t || ""), o.appendChild(a));
  const n = document.activeElement,
    cerrar = () => {
      (o.remove(), n && n.focus && n.focus());
    };
  (o.addEventListener("click", cerrar),
    o.addEventListener("keydown", (e) => {
      ("Escape" !== e.key && "Enter" !== e.key && " " !== e.key) || (e.preventDefault(), e.stopPropagation(), cerrar());
    }),
    document.body.appendChild(o),
    o.focus());
}
function conectarAdjuntos() {
  const e = $("adjInput");
  ($("adjBtn").addEventListener("click", () => e.click()),
    e.addEventListener("change", () => {
      (Adjuntos.agregar(e.files), (e.value = ""));
    }),
    $("adjBandeja").addEventListener("click", (e) => {
      const t = e.target.closest(".adj-x");
      if (t) return (Adjuntos.quitar(t.closest(".adj-item").dataset.id), void $("userInput").focus());
      const o = e.target.closest(".adj-mini-img");
      o && verImagen(o.src, o.closest(".adj-item").querySelector(".adj-nom").textContent);
    }),
    $("userInput").addEventListener("paste", (e) => {
      const t = e.clipboardData;
      t && t.files && t.files.length && (t.getData("text/plain") || (e.preventDefault(), Adjuntos.agregar(t.files)));
    }));
  let t = 0;
  const conArchivos = (e) => e.dataTransfer && [...(e.dataTransfer.types || [])].includes("Files"),
    aviso = (e) => document.body.classList.toggle("soltando", e);
  (document.addEventListener("dragenter", (e) => {
    conArchivos(e) && (e.preventDefault(), t++, aviso(!0));
  }),
    document.addEventListener("dragover", (e) => {
      conArchivos(e) && (e.preventDefault(), (e.dataTransfer.dropEffect = "copy"));
    }),
    document.addEventListener("dragleave", (e) => {
      conArchivos(e) && ((t = Math.max(0, t - 1)), t || aviso(!1));
    }),
    document.addEventListener("drop", (e) => {
      conArchivos(e) &&
        (e.preventDefault(),
        (t = 0),
        aviso(!1),
        (Voz.activo && "live" === Voz.modo) || (e.dataTransfer.files.length && Adjuntos.agregar(e.dataTransfer.files)));
    }));
}
const COMANDOS = [
    {
      id: "buscar",
      alias: ["search", "web", "google"],
      emoji: "🔎",
      h: "buscar",
      arg: "qué buscar",
      nombre: "Buscar en internet",
      desc: "Busca antes de responder y cita las fuentes",
    },
    {
      id: "leer",
      alias: ["fetch", "url", "abrir", "enlace"],
      emoji: "🌐",
      h: "leer",
      arg: "enlace y pregunta",
      nombre: "Leer una página",
      desc: "Abre el enlace y responde con lo que dice",
    },
    {
      id: "codigo",
      alias: ["code", "python", "ejecutar", "run", "calcular"],
      emoji: "🧮",
      h: "codigo",
      arg: "tarea",
      nombre: "Ejecutar código",
      desc: "Escribe y ejecuta Python de verdad: cálculos, datos y gráficos",
    },
    {
      id: "asesor",
      alias: ["advisor", "consejo"],
      emoji: "🎓",
      h: "asesor",
      arg: "pregunta",
      nombre: "Consultar al asesor",
      desc: "Cece consulta a un segundo experto antes de responder (cuesta más)",
    },
    {
      id: "rapido",
      alias: ["fast", "veloz"],
      emoji: "⚡",
      modo: "rapido",
      arg: "mensaje",
      nombre: "Respuesta rápida",
      desc: "Sin pensar; en Ultra Code usa su motor más rápido",
    },
    {
      id: "pensar",
      alias: ["think", "profundo"],
      emoji: "🧠",
      modo: "pensar",
      arg: "mensaje",
      nombre: "Pensar a fondo",
      desc: "Esfuerzo máximo solo para este mensaje",
    },
    {
      id: "imagen",
      alias: ["image", "img", "dibuja", "dibujar"],
      emoji: "🎨",
      accion: "imagen",
      arg: "descripción",
      nombre: "Crear una imagen",
      desc: "Dibuja lo que describas",
    },
    ...[
      ["cece-pro", "pro", []],
      ["cece-enterprise-plus", "enterprise", ["plus", "ent"]],
      ["cece-argon", "argon", []],
      ["cece-astra", "astra", []],
      ["cece-max", "max", []],
      ["cece-ultra-code", "ultracode", ["uc"]],
      ["cece-turbo", "turbo", []],
    ].map(([e, t, o]) => ({ id: t, alias: o, nivel: e, grupo: "nivel", nombre: CECE_MAP[e].nombre })),
    {
      id: "nuevo",
      alias: ["new", "limpiar", "clear", "borrar"],
      emoji: "🗑️",
      accion: "nuevo",
      nombre: "Chat nuevo",
      desc: "Borra la conversación y empieza otra",
    },
    {
      id: "guardar",
      alias: ["save"],
      emoji: "💾",
      accion: "guardar",
      nombre: "Guardar conversación",
      desc: "La guarda en este navegador",
    },
    {
      id: "exportar",
      alias: ["export", "md"],
      emoji: "📝",
      accion: "exportar",
      nombre: "Exportar como texto",
      desc: "Descarga la conversación en .md",
    },
    {
      id: "live",
      alias: ["voz", "hablar"],
      emoji: "🎙️",
      accion: "live",
      nombre: "Cece Live",
      desc: "Conversación por voz",
    },
    {
      id: "ajustes",
      alias: ["config", "settings", "configuracion"],
      emoji: "⚙️",
      accion: "ajustes",
      nombre: "Configuración",
      desc: "Abre los ajustes",
    },
    {
      id: "ayuda",
      alias: ["help", "comandos", "?"],
      emoji: "❓",
      accion: "ayuda",
      nombre: "Ayuda",
      desc: "Todos los comandos y qué modelo hace cada uno",
    },
  ].map((e) => ({ ...e, grupo: e.grupo || (e.h || e.modo || "imagen" === e.accion ? "ia" : "app") })),
  GRUPOS_CMD = { ia: "Herramientas de la IA", plugin: "Plugins", nivel: "Niveles", app: "Cece" },
  COMANDO = Object.create(null);
for (const e of COMANDOS) for (const t of [e.id, ...e.alias]) COMANDO[norm(t)] = COMANDO[norm(t)] || e;
const COMANDO_H = Object.fromEntries(COMANDOS.filter((e) => e.h).map((e) => [e.h, e])),
  lista_o = (e) => (e.length > 1 ? e.slice(0, -1).join(", ") + " o " + e[e.length - 1] : e[0] || "");
function provsCon(e, t) {
  return PROV_CHAT.filter(
    (o) =>
      (!t || disponible(o)) &&
      PROVEEDORES[o].modelos.some((t) => {
        const a = PROVEEDORES[o];
        return (
          ("function" == typeof a.h ? a.h(t) : a.h || []).includes(e) ||
          (a.webKimi && "moonshot" === o && ("buscar" === e || "leer" === e))
        );
      }),
  ).map(nombreProv);
}
function quienTiene(e) {
  return PROV_CHAT.some(
    (t) => disponible(t) && PROVEEDORES[t].modelos.some((o) => herramientasDe({ prov: t, modelo: o }).has(e)),
  )
    ? "no se pudo usar esta vez"
    : "necesita clave de " + lista_o(provsCon(e));
}
function estadoCmd(e) {
  if (e.plugin) return { ok: !0, nota: e.plugin.local ? "sin IA" : "con la IA" };
  if (e.h) {
    const t = PROV_CHAT.filter(
      (t) => disponible(t) && PROVEEDORES[t].modelos.some((o) => herramientasDe({ prov: t, modelo: o }).has(e.h)),
    ).map(nombreProv);
    return t.length ? { ok: !0, nota: t.join(", ") } : { ok: !1, nota: "necesita clave de " + lista_o(provsCon(e.h)) };
  }
  if (e.nivel) {
    const t = "cece-pro" === e.nivel ? null : motoresDe(e.nivel)[0];
    return "cece-pro" === e.nivel
      ? {
          ok: PRO_PARTES.some((e) => motoresDe(e.id).length),
          nota: `${PRO_PARTES.length} niveles ${S.relevo ? "por relevo" : "a la vez"}`,
        }
      : t
        ? { ok: !0, nota: etiquetaMotor(t) }
        : { ok: !1, nota: "sin clave" };
  }
  return "imagen" === e.accion
    ? { ok: !0, nota: claveDe("openai") && "gratis" !== S.imgMotor ? "Cece Imagen" : "Cece Imagen (gratis)" }
    : { ok: !0, nota: "" };
}
function leerComandos(e) {
  const t = [];
  let o = String(e || "");
  for (;;) {
    const e = o.match(/^\/([^\s/]+)(?=\s|$)\s*/),
      a = e && COMANDO[norm(e[1])];
    if (!a) break;
    (t.includes(a) || t.push(a), (o = o.slice(e[0].length)));
  }
  return { cmds: t, resto: o.trim() };
}
function cambiarNivel(e) {
  (S.codeMode && !CECE_MAP[e].code && ((S.codeMode = !1), aplicarModoCode()),
    elegirNivel(e),
    toast(`Nivel: ${CECE_MAP[e].nombre}`));
}
function accionApp(e) {
  const t = !historial.some((e) => e.content && !e.local);
  "nuevo" === e
    ? $("clearBtn").click()
    : "guardar" === e
      ? t
        ? toast("Todavía no hay nada que guardar.")
        : (guardarConversacion(), toast("💾 Conversación guardada."))
      : "exportar" === e
        ? t
          ? toast("La conversación está vacía.")
          : exportarMd()
        : "live" === e
          ? $("liveBtn").click()
          : "ajustes" === e
            ? $("settingsBtn").click()
            : "ayuda" === e && mostrarAyuda();
}
function aplicarComandos(e, t) {
  const o = { pide: [] };
  let a = null;
  for (const t of e)
    if (t.plugin) ((o.plugin = o.plugin || t), t.opcional || (a = a || t));
    else {
      if (t.h) o.pide.push(t.h);
      else if ("rapido" === t.modo) ((o.rapido = !0), (o.veloz = !0));
      else if ("pensar" === t.modo) o.esf = "max";
      else {
        if ("imagen" !== t.accion) {
          if (t.nivel) {
            cambiarNivel(t.nivel);
            continue;
          }
          accionApp(t.accion);
          continue;
        }
        o.imagen = !0;
      }
      a = a || t;
    }
  return t || (o.plugin && o.plugin.opcional)
    ? { seguir: !0, opc: o }
    : a
      ? (toast(`${a.emoji} Escribe ${a.arg} después de /${a.id}`),
        {
          seguir: !1,
          dejar:
            e
              .filter((e) => "ia" === e.grupo || "plugin" === e.grupo)
              .map((e) => "/" + e.id)
              .join(" ") + " ",
        })
      : { seguir: !1, dejar: "" };
}
function opcionesDeCmds(e) {
  const t = (Array.isArray(e) ? e : [])
    .map((e) => ("string" == typeof e && Object.hasOwn(COMANDO, e) ? COMANDO[e] : null))
    .filter((e) => e && ("ia" === e.grupo || "plugin" === e.grupo));
  return t.length ? aplicarComandos(t, "x").opc : {};
}
function mostrarAyuda() {
  const e = COMANDOS.filter((e) => "ia" === e.grupo),
    hace = (e) => {
      const t = estadoCmd(e);
      return e.modo ? "todos" : (t.ok ? "✅ " : "❌ ") + t.nota;
    },
    t =
      "**Comandos de Cece** — escríbelos al principio del mensaje. Se pueden juntar: `/buscar /codigo precio del oro este año en una gráfica`\n\n| Comando | Qué hace | Quién lo hace ahora |\n|---|---|---|\n" +
      e.map((e) => `| \`/${e.id}\` | ${e.desc} | ${hace(e)} |`).join("\n") +
      (COMANDOS.some((e) => "plugin" === e.grupo)
        ? "\n\n**Plugins** (se hacen aquí mismo, sin gastar tokens; los tuyos se crean en Configuración → 🧩 Plugins):\n\n" +
          COMANDOS.filter((e) => "plugin" === e.grupo)
            .map((e) => `\`/${e.id}\` ${e.nombre}${e.plugin.local ? "" : " _(con la IA)_"}`)
            .join(" · ")
        : "") +
      "\n\n**Niveles** (cambian el nivel; si escribes algo detrás, lo envía con él): " +
      COMANDOS.filter((e) => e.nivel)
        .map((e) => `\`/${e.id}\``)
        .join(" · ") +
      "\n\n**Cece:** " +
      COMANDOS.filter((e) => "app" === e.grupo)
        .map((e) => `\`/${e.id}\` ${e.nombre}`)
        .join(" · "),
    o = crearMensaje("assistant");
  ((o.bubble.innerHTML = md(t)),
    (o.meta.innerHTML = `<span>${horaCorta()}</span><span>solo para ti · no se envía a la IA</span>`),
    aplicarEmojis(o.wrap),
    bajar(!0));
}
const Menu = {
  el: null,
  items: [],
  i: 0,
  abierto: !1,
  crear() {
    const e = document.createElement("div");
    ((e.className = "cmd-menu"),
      (e.id = "cmdMenu"),
      e.setAttribute("role", "listbox"),
      e.setAttribute("aria-label", "Comandos"),
      document.querySelector(".input-row").appendChild(e),
      e.addEventListener("mousedown", (e) => e.preventDefault()),
      e.addEventListener("click", (e) => {
        const t = e.target.closest(".cmd-item");
        t && this.elegir(+t.dataset.i);
      }),
      e.addEventListener("mousemove", (e) => {
        const t = e.target.closest(".cmd-item");
        t && +t.dataset.i !== this.i && this.marcar(+t.dataset.i, !0);
      }),
      (this.el = e));
  },
  parcial() {
    const e = $("userInput");
    if (e.selectionStart !== e.selectionEnd) return null;
    const t = e.value.slice(0, e.selectionEnd),
      o = t.match(/^((?:\/[^\s/]+\s+)*)\/([^\s/]*)$/);
    if (!o || !/^(\s|$)/.test(e.value.slice(t.length))) return null;
    const a = o[1].trim() ? o[1].trim().split(/\s+/).length : 0;
    return leerComandos(o[1]).cmds.length === a ? { prefijo: o[1], q: o[2] } : null;
  },
  actualizar() {
    const e = this.parcial();
    if (!e) return this.cerrar();
    const t = norm(e.q),
      o = new Set(leerComandos(e.prefijo).cmds),
      nota = (e) => {
        const o = [e.id, ...e.alias].map(norm);
        return t
          ? o.includes(t)
            ? 0
            : o[0].startsWith(t)
              ? 1
              : o.some((e) => e.startsWith(t))
                ? 2
                : norm(e.nombre).includes(t)
                  ? 3
                  : 9
          : 1;
      },
      a = COMANDOS.map((e, t) => ({ c: e, i: t, n: nota(e) })).filter((e) => e.n < 9 && !o.has(e.c));
    if ((t ? a.sort((e, t) => e.n - t.n || e.i - t.i) : a.sort((e, t) => e.i - t.i), !a.length)) return this.cerrar();
    ((this.items = a.map((e) => e.c)),
      (this.i = 0),
      this.pintar(),
      this.abierto ||
        ((this.abierto = !0), this.el.classList.add("open"), $("userInput").setAttribute("aria-expanded", "true")));
  },
  pintar() {
    let e = "",
      t = "";
    const o = this.items.length > 5;
    (this.items.forEach((a, n) => {
      o && a.grupo !== t && ((t = a.grupo), (e += `<div class="cmd-grupo">${GRUPOS_CMD[t]}</div>`));
      const r = estadoCmd(a),
        i = a.nivel ? `<span class="dot-color" style="background:${colorDe(CECE_MAP[a.nivel])}"></span>` : emo(a.emoji),
        s = a.nivel ? r.nota : a.desc + (r.nota ? " · " + r.nota : "");
      e += `<div class="cmd-item${n === this.i ? " on" : ""}${r.ok ? "" : " apagado"}" role="option" id="cmd-op-${n}" data-i="${n}" aria-selected="${n === this.i}"><span class="cmd-ico">${i}</span><span class="cmd-txt"><span class="cmd-nom">/${esc(a.id)}${a.arg ? ` <i>${esc(a.arg)}</i>` : a.nivel ? ` <i>${esc(a.nombre)}</i>` : ""}</span><span class="cmd-desc">${esc(s)}</span></span></div>`;
    }),
      (this.el.innerHTML = e),
      aplicarEmojis(this.el),
      $("userInput").setAttribute("aria-activedescendant", "cmd-op-" + this.i));
  },
  marcar(e, t) {
    const o = this.el.querySelector(".cmd-item.on");
    (o && (o.classList.remove("on"), o.setAttribute("aria-selected", "false")), (this.i = e));
    const a = this.el.querySelector(`.cmd-item[data-i="${e}"]`);
    a &&
      (a.classList.add("on"),
      a.setAttribute("aria-selected", "true"),
      t || a.scrollIntoView({ block: "nearest" }),
      $("userInput").setAttribute("aria-activedescendant", a.id));
  },
  mover(e) {
    this.items.length && this.marcar((this.i + e + this.items.length) % this.items.length);
  },
  elegir(e, t) {
    const o = this.items[e],
      a = this.parcial();
    if ((this.cerrar(), !o || !a)) return;
    const n = $("userInput"),
      r = n.value.slice(n.selectionEnd).replace(/^\s+/, "");
    if (t && o.plugin && o.opcional && !r) return ((n.value = a.prefijo + "/" + o.id), void enviar());
    if (o.nivel || (o.accion && "imagen" !== o.accion))
      return (
        (n.value = a.prefijo + r),
        autoAlto(),
        o.nivel ? cambiarNivel(o.nivel) : accionApp(o.accion),
        void ("live" !== o.accion && "ajustes" !== o.accion && n.focus())
      );
    const i = a.prefijo + "/" + o.id + " ";
    ((n.value = i + r), n.setSelectionRange(i.length, i.length), autoAlto(), n.focus());
  },
  cerrar() {
    if (!this.abierto) return;
    ((this.abierto = !1), this.el.classList.remove("open"));
    const e = $("userInput");
    (e.setAttribute("aria-expanded", "false"), e.removeAttribute("aria-activedescendant"));
  },
};
function conectarComandos() {
  Menu.crear();
  const e = $("userInput");
  (e.setAttribute("aria-autocomplete", "list"),
    e.setAttribute("aria-controls", "cmdMenu"),
    e.setAttribute("aria-expanded", "false"),
    e.addEventListener("input", () => Menu.actualizar()),
    e.addEventListener("click", () => Menu.actualizar()),
    e.addEventListener("blur", () => Menu.cerrar()),
    e.addEventListener("keyup", (e) => {
      /^(ArrowLeft|ArrowRight|Home|End)$/.test(e.key) && Menu.actualizar();
    }),
    e.addEventListener("keydown", (e) => {
      if (!Menu.abierto) return;
      const t = e.key;
      if ("ArrowDown" === t || "ArrowUp" === t) Menu.mover("ArrowDown" === t ? 1 : -1);
      else if (("Enter" === t && !e.shiftKey && !e.isComposing) || "Tab" === t) {
        if (!Menu.parcial()) return void Menu.cerrar();
        Menu.elegir(Menu.i, "Enter" === t);
      } else {
        if ("Escape" !== t) return;
        Menu.cerrar();
      }
      (e.preventDefault(), e.stopImmediatePropagation());
    }));
}
const Calc = (() => {
  const e = {
      sqrt: Math.sqrt,
      raiz: Math.sqrt,
      cbrt: Math.cbrt,
      abs: Math.abs,
      round: (e, t) => redondear(e, t),
      redondear: (e, t) => redondear(e, t),
      floor: Math.floor,
      suelo: Math.floor,
      ceil: Math.ceil,
      techo: Math.ceil,
      exp: Math.exp,
      ln: Math.log,
      log: Math.log10,
      log10: Math.log10,
      log2: Math.log2,
      sign: Math.sign,
      signo: Math.sign,
      sin: (e) => redondeoTrig(Math.sin((e * Math.PI) / 180)),
      sen: (e) => redondeoTrig(Math.sin((e * Math.PI) / 180)),
      cos: (e) => redondeoTrig(Math.cos((e * Math.PI) / 180)),
      tan: (e) => {
        if (0 === redondeoTrig(Math.cos((e * Math.PI) / 180))) throw new Error("la tangente de " + e + "° no existe");
        return redondeoTrig(Math.tan((e * Math.PI) / 180));
      },
      asin: (e) => (180 * Math.asin(e)) / Math.PI,
      asen: (e) => (180 * Math.asin(e)) / Math.PI,
      acos: (e) => (180 * Math.acos(e)) / Math.PI,
      atan: (e) => (180 * Math.atan(e)) / Math.PI,
      min: (...e) => Math.min(...e),
      max: (...e) => Math.max(...e),
      pow: (e, t) => e ** t,
      hypot: (...e) => Math.hypot(...e),
      fact: (e) => factorial(e),
      factorial: (e) => factorial(e),
      media: (...e) => e.reduce((e, t) => e + t, 0) / e.length,
      promedio: (...e) => e.reduce((e, t) => e + t, 0) / e.length,
      suma: (...e) => e.reduce((e, t) => e + t, 0),
    },
    t = new Set(
      Object.keys(e)
        .filter((t) => 1 === e[t].length)
        .concat("redondear", "round"),
    ),
    MAX_ARGS = (t) => ("redondear" === t || "round" === t ? 2 : 1 === e[t].length ? 1 : 1 / 0),
    o = { pi: Math.PI, e: Math.E, tau: 2 * Math.PI, phi: (1 + Math.sqrt(5)) / 2 };
  function redondear(e, t) {
    if (void 0 === t) return Math.round(e);
    if (!Number.isInteger(t) || t < 0 || t > 15) throw new Error("los decimales de redondear van de 0 a 15");
    const o = 10 ** t;
    return Math.round((e + Math.sign(e) * Number.EPSILON) * o) / o;
  }
  const redondeoTrig = (e) => (Math.abs(e) < 1e-12 ? 0 : Math.abs(e - Math.round(e)) < 1e-12 ? Math.round(e) : e);
  function factorial(e) {
    if (!Number.isInteger(e) || e < 0) throw new Error("el factorial solo existe para enteros ≥ 0");
    if (e > 170) throw new Error("factorial demasiado grande");
    let t = 1;
    for (let o = 2; o <= e; o++) t *= o;
    return t;
  }
  function tokens(o) {
    const a = String(o)
        .replace(
          /(^|[^\d.,])(\d{1,3}(?:\.\d{3}){2,}|\d{1,3}(?:\.\d{3})+(?=,\d))(?![\d.])/g,
          (e, t, o) => t + o.replace(/\./g, ""),
        )
        .replace(/(^|[^\d.,\s])(\s*)(\d{1,3}(?: \d{3})+)(?![\d.,]?\d)/g, (e, t, o, a) => t + o + a.replace(/ /g, ""))
        .replace(/[×✕✖]/g, "*")
        .replace(/[÷]/g, "/")
        .replace(/[−–—]/g, "-")
        .replace(/\*\*/g, "^")
        .replace(/²/g, "^2")
        .replace(/³/g, "^3")
        .replace(/√/g, " sqrt ")
        .replace(/π/g, " pi ")
        .replace(/φ/g, " phi ")
        .replace(/°/g, " "),
      n = [],
      r = [];
    let i = 0;
    for (; i < a.length;) {
      const o = a[i];
      if (!/\s/.test(o)) {
        if (/\d/.test(o) || ("." === o && /\d/.test(a[i + 1] || ""))) {
          let e = i;
          for (; e < a.length && /\d/.test(a[e]);) e++;
          const t = "f" === r[r.length - 1];
          if (("." === a[e] || ("," === a[e] && !t)) && /\d/.test(a[e + 1] || ""))
            for (e++; e < a.length && /\d/.test(a[e]);) e++;
          let o = a.slice(i, e).replace(",", ".");
          const s = /^[eE][+-]?\d+/.exec(a.slice(e));
          (s && ((o += s[0]), (e += s[0].length)), n.push({ t: "num", v: parseFloat(o) }), (i = e));
          continue;
        }
        if (/[a-záéíóúñü_]/i.test(o)) {
          let e = i;
          for (; e < a.length && /[a-záéíóúñü_0-9]/i.test(a[e]);) e++;
          const t = norm(a.slice(i, e)),
            o = n[n.length - 1];
          ("x" !== t || !o || ("num" !== o.t && ")" !== o.v) ? n.push({ t: "id", v: t }) : n.push({ t: "op", v: "*" }),
            (i = e));
          continue;
        }
        if ("+-*/^%!(),;:".includes(o)) {
          let a = ":" === o ? "/" : ";" === o ? "," : o;
          if ("(" === a) {
            const o = n[n.length - 1];
            r.push(o && "id" === o.t && Object.hasOwn(e, o.v) ? (t.has(o.v) ? "f1" : "f") : "p");
          }
          (")" === a && r.pop(), n.push({ t: "op", v: a }), i++);
          continue;
        }
        throw new Error(`no entiendo «${o}»`);
      }
      i++;
    }
    return n;
  }
  function evaluar(t) {
    if (String(t).length > 500) throw new Error("la operación es demasiado larga");
    const a = tokens(t);
    if (!a.length) throw new Error("escribe una operación, por ejemplo 2+2");
    let n = 0,
      r = 0;
    const ver = () => a[n],
      es = (e, t) => a[n] && a[n].t === e && (void 0 === t || a[n].v === t),
      tomar = (e, t) => {
        if (!es(e, t)) throw new Error(t ? `falta «${t}»` : "operación incompleta");
        return a[n++];
      },
      hondo = (e) => {
        if (++r > 60) throw new Error("demasiados paréntesis");
        try {
          return e();
        } finally {
          r--;
        }
      },
      empiezaFactor = () => es("num") || es("op", "(") || (es("id") && !["mod", "de", "of"].includes(ver().v));
    function expr() {
      let e = term();
      for (; es("op", "+") || es("op", "-");) {
        const t = a[n++].v,
          o = term(),
          r = o.pct ? e.v * o.v : o.v;
        e = { v: "+" === t ? e.v + r : e.v - r };
      }
      return e;
    }
    function term() {
      let e = pot();
      for (;;)
        if (es("op", "*") || es("op", "/")) {
          const t = a[n++].v,
            o = pot();
          if ("/" === t && 0 === o.v) throw new Error("no se puede dividir entre cero");
          e = { v: "*" === t ? e.v * o.v : e.v / o.v };
        } else if (es("id", "mod")) {
          n++;
          const t = pot();
          if (0 === t.v) throw new Error("módulo entre cero");
          e = { v: ((e.v % t.v) + t.v) % t.v };
        } else if (e.pct && (es("id", "de") || es("id", "of"))) (n++, (e = { v: e.v * pot().v }));
        else {
          if (es("num") && a[n - 1] && "num" === a[n - 1].t)
            throw new Error(`falta un signo entre ${numBonito(a[n - 1].v)} y ${numBonito(a[n].v)}`);
          if (!empiezaFactor()) return e;
          e = { v: e.v * pot().v };
        }
    }
    function pot() {
      const e = unario();
      if (es("op", "^")) {
        n++;
        const t = hondo(() => unarioPot());
        return { v: e.v ** t.v };
      }
      return e;
    }
    function unarioPot() {
      if (es("op", "-")) return (n++, { v: -unarioPot().v });
      if (es("op", "+")) return (n++, unarioPot());
      const e = sufijo();
      return es("op", "^") ? (n++, { v: e.v ** hondo(() => unarioPot()).v }) : e;
    }
    function unario() {
      if (es("op", "-")) {
        n++;
        const e = hondo(() => pot());
        return { v: -e.v, pct: e.pct };
      }
      return es("op", "+") ? (n++, hondo(() => pot())) : sufijo();
    }
    function sufijo() {
      let e = prim();
      for (;;)
        if (es("op", "!")) (n++, (e = { v: factorial(e.v) }));
        else {
          if (!es("op", "%")) return e;
          (n++, (e = { v: e.v / 100, pct: !0 }));
        }
    }
    function prim() {
      const t = ver();
      if (!t) throw new Error("operación incompleta");
      if ("num" === t.t) return (n++, { v: t.v });
      if (es("op", "(")) {
        n++;
        const e = hondo(() => expr());
        return (tomar("op", ")"), { v: e.v });
      }
      if ("id" === t.t) {
        if ((n++, Object.hasOwn(o, t.v))) return { v: o[t.v] };
        if (Object.hasOwn(e, t.v)) {
          const o = [];
          if (es("op", "(")) {
            if ((n++, !es("op", ")")))
              for (o.push(hondo(() => expr()).v); es("op", ",");) (n++, o.push(hondo(() => expr()).v));
            tomar("op", ")");
          } else o.push(hondo(() => pot()).v);
          if (!o.length) throw new Error(`${t.v}() necesita un número`);
          if (o.length > MAX_ARGS(t.v))
            throw new Error(
              1 === MAX_ARGS(t.v)
                ? `${t.v}() lleva un solo número (los decimales, con coma o punto: 2,25)`
                : `${t.v}() lleva el número y, si quieres, los decimales: ${t.v}(2,567; 2)`,
            );
          return { v: e[t.v](...o) };
        }
        throw new Error(`no conozco «${t.v}»`);
      }
      throw new Error(`sobra «${t.v}»`);
    }
    const i = expr();
    if (n < a.length) throw new Error(`sobra «${a[n].v}»`);
    if ("number" != typeof i.v || Number.isNaN(i.v)) throw new Error("el resultado no es un número");
    if (!Number.isFinite(i.v)) throw new Error("el resultado es infinito");
    return i.v;
  }
  return { evaluar: evaluar, tokens: tokens };
})();
function numBonito(e, t = 10) {
  if (!Number.isFinite(e)) return String(e);
  if (0 !== e && (Math.abs(e) >= 1e15 || Math.abs(e) < 1e-9)) return e.toExponential(8).replace(/\.?0+e/, "e");
  const o = parseFloat(e.toPrecision(12));
  return o.toLocaleString("es-ES", { maximumFractionDigits: t, useGrouping: Math.abs(o) >= 1e4 });
}
const numPlano = (e) => {
    const t = parseFloat(e.toPrecision(12));
    return Math.abs(t) >= 1e15 || (0 !== t && Math.abs(t) < 1e-9)
      ? t.toExponential(8).replace(/\.?0+e/, "e")
      : String(t);
  },
  UNIDADES = (() => {
    const e = {},
      def = (t, o, ...a) => {
        for (const n of a) e[n] = { cat: t, f: o };
      };
    (def("longitud", 1e-9, "nanometro", "nanometros"),
      def("longitud", 1e-6, "um", "µm", "micra", "micras", "micrometro", "micrometros"),
      def("longitud", 0.001, "mm", "milimetro", "milimetros"),
      def("longitud", 0.01, "cm", "centimetro", "centimetros"),
      def("longitud", 0.1, "dm", "decimetro", "decimetros"),
      def("longitud", 1, "m", "metro", "metros", "meter", "meters"),
      def("longitud", 1e3, "km", "kilometro", "kilometros", "kilometer", "kilometers"),
      def("longitud", 0.0254, "in", "pulgada", "pulgadas", "inch", "inches", '"'),
      def("longitud", 0.3048, "ft", "pie", "pies", "foot", "feet", "'"),
      def("longitud", 0.9144, "yd", "yarda", "yardas", "yard", "yards"),
      def("longitud", 1609.344, "mi", "milla", "millas", "mile", "miles"),
      def("longitud", 1852, "nmi", "milla nautica", "millas nauticas", "nautical mile", "nautical miles"),
      def("masa", 1e-6, "mg", "miligramo", "miligramos"),
      def("masa", 0.001, "g", "gr", "gramo", "gramos", "gram", "grams"),
      def("masa", 1, "kg", "kilo", "kilos", "kilogramo", "kilogramos", "kilogram", "kilograms"),
      def("masa", 1e3, "t", "tonelada", "toneladas", "tonne", "tonnes"),
      def("masa", 0.028349523125, "oz", "onza", "onzas", "ounce", "ounces"),
      def("masa", 0.45359237, "lb", "lbs", "libra", "libras", "pound", "pounds"),
      def("masa", 6.35029318, "st", "stone", "stones"),
      def("volumen", 0.001, "ml", "mililitro", "mililitros", "cm3", "cc"),
      def("volumen", 0.01, "cl", "centilitro", "centilitros"),
      def("volumen", 0.1, "dl", "decilitro", "decilitros"),
      def("volumen", 1, "l", "litro", "litros", "liter", "liters", "litre", "litres"),
      def("volumen", 1e3, "m3", "metro cubico", "metros cubicos"),
      def("volumen", 3.785411784, "gal", "galon", "galones", "gallon", "gallons"),
      def("volumen", 0.946352946, "qt", "cuarto de galon", "quart", "quarts"),
      def("volumen", 0.473176473, "pt", "pinta", "pintas", "pint", "pints"),
      def("volumen", 0.2365882365, "taza", "tazas", "cup", "cups"),
      def("volumen", 0.0295735295625, "fl oz", "floz", "onza liquida", "onzas liquidas"),
      def("volumen", 0.01478676478125, "cucharada", "cucharadas", "tbsp"),
      def("volumen", 0.00492892159375, "cucharadita", "cucharaditas", "tsp"),
      def("tiempo", 0.001, "ms", "milisegundo", "milisegundos"),
      def("tiempo", 1, "s", "seg", "segundo", "segundos", "second", "seconds"),
      def("tiempo", 60, "min", "minuto", "minutos", "minute", "minutes"),
      def("tiempo", 3600, "h", "hora", "horas", "hour", "hours"),
      def("tiempo", 86400, "dia", "dias", "day", "days"),
      def("tiempo", 604800, "semana", "semanas", "week", "weeks"),
      def("tiempo", 2629746, "mes", "meses", "month", "months"),
      def("tiempo", 31556952, "ano", "anos", "año", "años", "year", "years"),
      def("velocidad", 1, "m/s", "mps"),
      def("velocidad", 1 / 3.6, "km/h", "kmh", "kph"),
      def("velocidad", 0.44704, "mph", "mi/h"),
      def("velocidad", 1852 / 3600, "nudo", "nudos", "kn", "knot", "knots"),
      def("velocidad", 0.3048, "ft/s", "fps"),
      def("datos", 0.125, "bit", "bits"),
      def("datos", 125, "kbit", "kilobit", "kilobits"),
      def("datos", 125e3, "mbit", "megabit", "megabits"),
      def("datos", 125e6, "gbit", "gigabit", "gigabits"),
      def("datos", 1, "byte", "bytes", "octeto", "octetos"),
      def("datos", 1e3, "kb", "kilobyte", "kilobytes"),
      def("datos", 1e6, "mb", "megabyte", "megabytes"),
      def("datos", 1e9, "gb", "gigabyte", "gigabytes"),
      def("datos", 1e12, "tb", "terabyte", "terabytes"),
      def("datos", 1024, "kib"),
      def("datos", 1048576, "mib"),
      def("datos", 1073741824, "gib"),
      def("datos", 1099511627776, "tib"),
      def("superficie", 1e-4, "cm2"),
      def("superficie", 1, "m2", "metro cuadrado", "metros cuadrados"),
      def("superficie", 1e6, "km2", "kilometro cuadrado", "kilometros cuadrados"),
      def("superficie", 1e4, "ha", "hectarea", "hectareas"),
      def("superficie", 4046.8564224, "acre", "acres"),
      def("superficie", 0.09290304, "ft2", "pie cuadrado", "pies cuadrados"),
      def("superficie", 64516e-8, "in2"),
      def("energia", 1, "j", "julio", "julios", "joule", "joules"),
      def("energia", 1e3, "kj", "kilojulio", "kilojulios"),
      def("energia", 4.184, "cal", "caloria", "calorias"),
      def("energia", 4184, "kcal", "kilocaloria", "kilocalorias"),
      def("energia", 3600, "wh"),
      def("energia", 36e5, "kwh"),
      def("presion", 1, "pa", "pascal", "pascales"),
      def("presion", 1e3, "kpa"),
      def("presion", 1e5, "bar", "bares"),
      def("presion", 101325, "atm", "atmosfera", "atmosferas"),
      def("presion", 6894.757293168, "psi"),
      def("presion", 133.322387415, "mmhg"));
    for (const t of ["c", "°c", "ºc", "celsius", "centigrado", "centigrados", "grado celsius", "grados celsius"])
      e[t] = { cat: "temperatura", t: "c" };
    for (const t of ["f", "°f", "ºf", "fahrenheit", "grado fahrenheit", "grados fahrenheit"])
      e[t] = { cat: "temperatura", t: "f" };
    for (const t of ["k", "kelvin", "kelvins"]) e[t] = { cat: "temperatura", t: "k" };
    return e;
  })(),
  aKelvin = (e, t) => ("c" === t ? e + 273.15 : "f" === t ? (5 * (e - 32)) / 9 + 273.15 : e),
  deKelvin = (e, t) => ("c" === t ? e - 273.15 : "f" === t ? (9 * (e - 273.15)) / 5 + 32 : e);
function buscarUnidad(e) {
  const t = String(e || "").trim(),
    o = norm(t).replace(/\s+/g, " ").replace(/²/g, "2").replace(/³/g, "3").replace(/^°\s*/, "°");
  return /^[KMGT]b$/.test(t)
    ? { cat: "datos", f: { k: 1e3, m: 1e6, g: 1e9, t: 1e12 }[o[0]] / 8 }
    : UNIDADES[o] || UNIDADES[o.replace(/s$/, "")] || UNIDADES[o.replace(/es$/, "")] || null;
}
function numeroEscrito(e) {
  let t = String(e || "").trim();
  return (
    /^-?\d{1,3}(\.\d{3}){2,}(,\d+)?$/.test(t) || /^-?\d{1,3}(\.\d{3})+,\d+$/.test(t)
      ? (t = t.replace(/\./g, "").replace(",", "."))
      : /^-?\d{1,3}(,\d{3}){2,}(\.\d+)?$/.test(t)
        ? (t = t.replace(/,/g, ""))
        : /^-?\d*,\d+(e[+-]?\d+)?$/i.test(t) && (t = t.replace(",", ".")),
    /^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(t) ? parseFloat(t) : NaN
  );
}
function convertirUnidades(e) {
  const t = /^\s*(-?[\d.,]+(?:e[+-]?\d+)?)\s*(.+?)\s+(?:a|en|to|in|->|→|=)\s+(.+?)\s*$/i.exec(String(e || ""));
  if (!t) throw new Error("escribe algo como: 10 km a millas");
  const o = numeroEscrito(t[1]);
  if (!Number.isFinite(o)) throw new Error("el número no es válido");
  const a = buscarUnidad(t[2]),
    n = buscarUnidad(t[3]);
  if (!a) throw new Error(`no conozco la unidad «${t[2]}»`);
  if (!n) throw new Error(`no conozco la unidad «${t[3]}»`);
  if (a.cat !== n.cat) throw new Error(`no se puede pasar de ${a.cat} a ${n.cat}`);
  const r = "temperatura" === a.cat ? deKelvin(aKelvin(o, a.t), n.t) : (o * a.f) / n.f;
  return { valor: o, de: t[2].trim(), a: t[3].trim(), resultado: r, cat: a.cat };
}
const CIUDADES = {
  madrid: "Europe/Madrid",
  barcelona: "Europe/Madrid",
  espana: "Europe/Madrid",
  canarias: "Atlantic/Canary",
  "las palmas": "Atlantic/Canary",
  tenerife: "Atlantic/Canary",
  londres: "Europe/London",
  london: "Europe/London",
  lisboa: "Europe/Lisbon",
  paris: "Europe/Paris",
  berlin: "Europe/Berlin",
  roma: "Europe/Rome",
  amsterdam: "Europe/Amsterdam",
  bruselas: "Europe/Brussels",
  atenas: "Europe/Athens",
  moscu: "Europe/Moscow",
  estambul: "Europe/Istanbul",
  kiev: "Europe/Kyiv",
  "nueva york": "America/New_York",
  "new york": "America/New_York",
  nyc: "America/New_York",
  miami: "America/New_York",
  washington: "America/New_York",
  chicago: "America/Chicago",
  denver: "America/Denver",
  "los angeles": "America/Los_Angeles",
  "san francisco": "America/Los_Angeles",
  seattle: "America/Los_Angeles",
  mexico: "America/Mexico_City",
  "ciudad de mexico": "America/Mexico_City",
  cdmx: "America/Mexico_City",
  guadalajara: "America/Mexico_City",
  monterrey: "America/Monterrey",
  cancun: "America/Cancun",
  tijuana: "America/Tijuana",
  bogota: "America/Bogota",
  lima: "America/Lima",
  quito: "America/Guayaquil",
  caracas: "America/Caracas",
  santiago: "America/Santiago",
  "buenos aires": "America/Argentina/Buenos_Aires",
  argentina: "America/Argentina/Buenos_Aires",
  montevideo: "America/Montevideo",
  asuncion: "America/Asuncion",
  "la paz": "America/La_Paz",
  "sao paulo": "America/Sao_Paulo",
  "rio de janeiro": "America/Sao_Paulo",
  "la habana": "America/Havana",
  "santo domingo": "America/Santo_Domingo",
  "san juan": "America/Puerto_Rico",
  panama: "America/Panama",
  "san jose": "America/Costa_Rica",
  guatemala: "America/Guatemala",
  toronto: "America/Toronto",
  vancouver: "America/Vancouver",
  tokio: "Asia/Tokyo",
  tokyo: "Asia/Tokyo",
  pekin: "Asia/Shanghai",
  beijing: "Asia/Shanghai",
  shanghai: "Asia/Shanghai",
  "hong kong": "Asia/Hong_Kong",
  seul: "Asia/Seoul",
  singapur: "Asia/Singapore",
  bangkok: "Asia/Bangkok",
  dubai: "Asia/Dubai",
  delhi: "Asia/Kolkata",
  "nueva delhi": "Asia/Kolkata",
  bombay: "Asia/Kolkata",
  mumbai: "Asia/Kolkata",
  manila: "Asia/Manila",
  yakarta: "Asia/Jakarta",
  sidney: "Australia/Sydney",
  sydney: "Australia/Sydney",
  melbourne: "Australia/Melbourne",
  auckland: "Pacific/Auckland",
  "el cairo": "Africa/Cairo",
  cairo: "Africa/Cairo",
  johannesburgo: "Africa/Johannesburg",
  lagos: "Africa/Lagos",
  nairobi: "Africa/Nairobi",
  casablanca: "Africa/Casablanca",
  marrakech: "Africa/Casablanca",
  utc: "UTC",
  gmt: "UTC",
};
function zonaDe(e) {
  const t = norm(String(e || "").trim()).replace(/\s+/g, " ");
  if (!t) return null;
  if (Object.hasOwn(CIUDADES, t)) return CIUDADES[t];
  if (/^[a-z_]+\/[a-z_\/-]+$/i.test(String(e).trim()))
    try {
      return (new Intl.DateTimeFormat("es-ES", { timeZone: String(e).trim() }), String(e).trim());
    } catch (e) {}
  return null;
}
const horaEn = (e, t = new Date()) =>
  new Intl.DateTimeFormat("es-ES", {
    timeZone: e,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  }).format(t);
function leerFecha(e) {
  if (
    !(e = String(e || "")
      .trim()
      .toLowerCase()) ||
    "hoy" === e ||
    "today" === e
  ) {
    const e = new Date();
    return new Date(e.getFullYear(), e.getMonth(), e.getDate());
  }
  let t = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(e),
    o,
    a,
    n;
  if (t) [o, a, n] = [+t[1], +t[2], +t[3]];
  else {
    if (!(t = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/.exec(e))) return null;
    [n, a, o] = [+t[1], +t[2], +t[3] < 100 ? +t[3] + 2e3 : +t[3]];
  }
  const r = new Date(o, a - 1, n);
  return r.getFullYear() === o && r.getMonth() === a - 1 && r.getDate() === n ? r : null;
}
const diasEntre = (e, t) =>
  Math.round(
    (Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) - Date.UTC(e.getFullYear(), e.getMonth(), e.getDate())) /
      864e5,
  );
function azarEntero(e) {
  if (!(e >= 1) || e > 2 ** 32) throw new Error("rango no válido");
  const t = Math.floor(2 ** 32 / e) * e,
    o = new Uint32Array(1);
  do {
    crypto.getRandomValues(o);
  } while (o[0] >= t);
  return o[0] % e;
}
function generarContrasena(e = 20, t = !0) {
  const o = "abcdefghijkmnopqrstuvwxyz",
    a = "ABCDEFGHJKLMNPQRSTUVWXYZ",
    n = "23456789",
    i = t ? [o, a, n, "!@#$%&*-_=+?"] : [o, a, n],
    s = i.join("");
  e = Math.max(8, Math.min(128, 0 | e));
  const c = i.map((e) => e[azarEntero(e.length)]);
  for (; c.length < e;) c.push(s[azarEntero(s.length)]);
  for (let e = c.length - 1; e > 0; e--) {
    const t = azarEntero(e + 1);
    [c[e], c[t]] = [c[t], c[e]];
  }
  return { clave: c.join(""), bits: Math.round(e * Math.log2(s.length)) };
}
const NOMBRES_COLOR = {
  rojo: "#ff0000",
  verde: "#008000",
  azul: "#0000ff",
  amarillo: "#ffff00",
  naranja: "#ffa500",
  morado: "#800080",
  violeta: "#8a2be2",
  rosa: "#ffc0cb",
  negro: "#000000",
  blanco: "#ffffff",
  gris: "#808080",
  marron: "#8b4513",
  cian: "#00ffff",
  magenta: "#ff00ff",
  dorado: "#ffd700",
  plateado: "#c0c0c0",
};
function leerColor(e) {
  const t = norm(String(e || "").trim());
  if (Object.hasOwn(NOMBRES_COLOR, t)) return leerColor(NOMBRES_COLOR[t]);
  let o = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(t);
  if (o) {
    let e = o[1];
    3 === e.length && (e = [...e].map((e) => e + e).join(""));
    const t = parseInt(e, 16);
    return [t >> 16, (t >> 8) & 255, 255 & t];
  }
  if (((o = /^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/i.exec(t)), o)) {
    const e = [+o[1], +o[2], +o[3]];
    return e.every((e) => e <= 255) ? e : null;
  }
  return (
    (o = /^hsla?\(\s*(-?[\d.]+)\s*[, ]\s*([\d.]+)%\s*[, ]\s*([\d.]+)%/i.exec(t)),
    o ? hslARgb(+o[1], +o[2], +o[3]) : null
  );
}
function hslARgb(e, t, o) {
  ((e = (((e % 360) + 360) % 360) / 360), (t = Math.min(100, t) / 100), (o = Math.min(100, o) / 100));
  const f = (a) => {
    const n = (a + 12 * e) % 12,
      r = t * Math.min(o, 1 - o);
    return Math.round(255 * (o - r * Math.max(-1, Math.min(n - 3, 9 - n, 1))));
  };
  return [f(0), f(8), f(4)];
}
function rgbAHsl([e, t, o]) {
  ((e /= 255), (t /= 255), (o /= 255));
  const a = Math.max(e, t, o),
    n = Math.min(e, t, o),
    r = (a + n) / 2;
  let i = 0,
    s = 0;
  if (a !== n) {
    const c = a - n;
    ((s = r > 0.5 ? c / (2 - a - n) : c / (a + n)),
      (i = a === e ? (t - o) / c + (t < o ? 6 : 0) : a === t ? (o - e) / c + 2 : (e - t) / c + 4),
      (i *= 60));
  }
  return [Math.round(i), Math.round(100 * s), Math.round(100 * r)];
}
const rgbAHex = (e) => "#" + e.map((e) => e.toString(16).padStart(2, "0")).join(""),
  ROMANOS = [
    [1e3, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
function aRomano(e) {
  if (!Number.isInteger(e) || e < 1 || e > 3999) throw new Error("los romanos van del 1 al 3999");
  let t = "";
  for (const [o, a] of ROMANOS) for (; e >= o;) ((t += a), (e -= o));
  return t;
}
function deRomano(e) {
  const t = String(e || "")
    .toUpperCase()
    .trim();
  if (!/^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/.test(t) || !t)
    throw new Error("no es un número romano válido");
  let o = 0,
    a = 0;
  for (const [e, n] of ROMANOS) for (; t.startsWith(n, a);) ((o += e), (a += n.length));
  return o;
}
const Temporizadores = {
    lista: [],
    leer(e) {
      const t = norm(String(e || "")).replace(/,/g, ".");
      let o = /^(\d+):(\d{1,2})(?::(\d{1,2}))?$/.exec(t.trim());
      if (o) return null != o[3] ? 1e3 * (60 * (60 * +o[1] + +o[2]) + +o[3]) : 1e3 * (60 * +o[1] + +o[2]);
      let a = 0,
        n = !1;
      const r = /(\d+(?:\.\d+)?)\s*(h|horas?|m|min|minutos?|s|seg|segundos?)?\b/g;
      for (; (o = r.exec(t));) {
        n = !0;
        const e = o[2] || "min";
        a += +o[1] * ("h" === e[0] ? 36e5 : e.startsWith("s") ? 1e3 : 6e4);
      }
      return n ? Math.round(a) : null;
    },
    poner(e, t) {
      if (!(e >= 1e3) || e > 864e5) throw new Error("el temporizador va de 1 segundo a 24 horas");
      const o = { id: uid(), nombre: t || "", fin: Date.now() + e };
      return ((o.h = setTimeout(() => this.sonar(o), e)), this.lista.push(o), o);
    },
    cancelar() {
      const e = this.lista.length;
      for (const e of this.lista) clearTimeout(e.h);
      return ((this.lista = []), e);
    },
    sonar(e) {
      ((this.lista = this.lista.filter((t) => t !== e)),
        toast("⏲️ ¡Tiempo!" + (e.nombre ? " " + e.nombre : ""), "ok", 1e4));
      try {
        const e = new (window.AudioContext || window.webkitAudioContext)();
        ([0, 0.35, 0.7].forEach((t) => {
          const o = e.createOscillator(),
            a = e.createGain();
          ((o.frequency.value = 880),
            (a.gain.value = 0.18),
            o.connect(a),
            a.connect(e.destination),
            o.start(e.currentTime + t),
            o.stop(e.currentTime + t + 0.22));
        }),
          setTimeout(() => e.close(), 1500));
      } catch (e) {}
    },
  },
  cod = (e) => "`" + String(e).replace(/`/g, "ˋ") + "`",
  PLUGINS_INTEGRADOS = [
    {
      id: "calc",
      alias: ["calculadora", "cuenta", "cuentas"],
      emoji: "🧮",
      arg: "operación",
      nombre: "Calculadora",
      desc: "Cuentas al momento y sin IA: 2^10, raiz(2), 15% de 80, sen(30)…",
      f(e) {
        const t = Calc.evaluar(e);
        return { md: `${cod(e)}\n\n**= ${numBonito(t)}**`, valor: t, copiar: numPlano(t) };
      },
    },
    {
      id: "convertir",
      alias: ["conversor", "unidades"],
      emoji: "📐",
      arg: "cantidad y unidades",
      nombre: "Conversor de unidades",
      desc: "Longitud, peso, volumen, temperatura, datos, velocidad… (10 km a millas)",
      f(e) {
        const t = convertirUnidades(e);
        return {
          md: `**${numBonito(t.valor)} ${t.de} = ${numBonito(t.resultado, 6)} ${t.a}**\n\n_${t.cat}_`,
          valor: t.resultado,
          copiar: numPlano(t.resultado),
        };
      },
    },
    {
      id: "hora",
      alias: ["horas", "reloj", "zona"],
      emoji: "🕐",
      arg: "ciudad (opcional)",
      opcional: !0,
      nombre: "Hora en el mundo",
      desc: "La hora aquí o en cualquier ciudad (Tokio, Nueva York…)",
      f(e) {
        if (e.trim()) {
          const t = zonaDe(e);
          if (!t) throw new Error(`no conozco «${e.trim()}». Prueba con una capital o con una zona como Europe/Paris`);
          return { md: `🕐 **${e.trim()}**: ${horaEn(t)}\n\n_Zona ${t}_` };
        }

        return {
          md:
            "| Lugar | Hora |\n|---|---|\n" +
            [
              ["Aquí", Intl.DateTimeFormat().resolvedOptions().timeZone || "local"],
              ["UTC", "UTC"],
              ["Madrid", "Europe/Madrid"],
              ["Ciudad de México", "America/Mexico_City"],
              ["Buenos Aires", "America/Argentina/Buenos_Aires"],
              ["Nueva York", "America/New_York"],
              ["Tokio", "Asia/Tokyo"],
            ]
              .map(([e, t]) => {
                try {
                  return `| ${e} | ${horaEn("local" === t ? void 0 : t)} |`;
                } catch (t) {
                  return `| ${e} | — |`;
                }
              })
              .join("\n"),
        };
      },
    },
    {
      id: "dias",
      alias: ["fecha", "fechas", "cuentaatras"],
      emoji: "📅",
      arg: "fecha (y otra opcional)",
      nombre: "Días entre fechas",
      desc: "Cuánto falta o cuánto pasó: 25/12/2026 · 2026-01-01 2026-12-31",
      f(e) {
        const t = e
          .trim()
          .split(/\s+(?:y|a|hasta|-|→)?\s*/)
          .filter(Boolean);
        if (!t.length || t.length > 2) throw new Error("escribe una fecha (25/12/2026) o dos (01/01/2026 31/12/2026)");
        const o = 2 === t.length ? leerFecha(t[0]) : leerFecha("hoy"),
          a = leerFecha(t[t.length - 1]);
        if (!o || !a) throw new Error("fecha no válida (usa 25/12/2026 o 2026-12-25)");
        const n = diasEntre(o, a),
          r = a.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
          dias = (e) => `**${e.toLocaleString("es-ES")} ${1 === e ? "día" : "días"}**`;
        return {
          md: `${1 === t.length ? (n > 0 ? `Falta${1 === n ? "" : "n"} ${dias(n)} para el ${r}` : n < 0 ? `Pas${-1 === n ? "ó" : "aron"} ${dias(-n)} desde el ${r}` : `¡Es **hoy**! (${r})`) : `Entre las dos fechas hay ${dias(Math.abs(n))}`}\n\n≈ ${numBonito(Math.abs(n) / 7, 1)} semanas · ${numBonito(Math.abs(n) / 30.436875, 1)} meses`,
          valor: n,
          copiar: String(n),
        };
      },
    },
    {
      id: "contrasena",
      alias: ["password", "pass", "contrasenas"],
      emoji: "🔑",
      arg: "largo (opcional)",
      opcional: !0,
      nombre: "Generar contraseña",
      desc: "Contraseña fuerte y aleatoria (/contrasena 32 sin simbolos)",
      f(e) {
        const a = generarContrasena(parseInt((e.match(/\d+/) || ["20"])[0], 10), !/sin\s*s[ií]mbolos|nosym/i.test(e));
        return {
          md: `${cod(a.clave)}\n\n_${a.clave.length} caracteres · ~${a.bits} bits · generada en tu dispositivo, no sale de aquí_`,
          copiar: a.clave,
        };
      },
    },
    {
      id: "contar",
      alias: ["palabras", "caracteres", "estadisticas"],
      emoji: "🔢",
      arg: "texto",
      nombre: "Contar palabras",
      desc: "Palabras, caracteres, líneas, tokens y tiempo de lectura",
      f(e) {
        const t = (e.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) || []).length,
          o = e.replace(/\s/g, "").length,
          a = e.split("\n").length,
          n = (e.match(/[^.!?¡¿\n]+[.!?]+/g) || []).length || (e.trim() ? 1 : 0),
          min = (e) => (e < 1 ? "menos de 1 min" : `${Math.round(e)} min`);
        return {
          md: `| | |\n|---|---|\n| Palabras | ${t.toLocaleString("es-ES")} |\n| Caracteres | ${[...e].length.toLocaleString("es-ES")} (${o.toLocaleString("es-ES")} sin espacios) |\n| Líneas | ${a} |\n| Frases | ${n} |\n| Tokens (aprox.) | ${estimarTokens(e).toLocaleString("es-ES")} |\n| Lectura | ${min(t / 220)} |\n| En voz alta | ${min(t / 140)} |`,
          valor: t,
        };
      },
    },
    {
      id: "base64",
      alias: ["b64"],
      emoji: "🔣",
      arg: "texto (o «d» y el código)",
      nombre: "Base64",
      desc: "Codifica en Base64; con «d» delante, decodifica",
      f(e) {
        const t = /^(?:-d|d|decodificar|decode)\s+([\s\S]+)$/i.exec(e.trim());
        if (t) {
          const e = t[1].replace(/\s+/g, "");
          if (!/^[A-Za-z0-9+/_-]*={0,2}$/.test(e)) throw new Error("eso no es Base64");
          let o, a;
          try {
            o = deBase64(e.replace(/-/g, "+").replace(/_/g, "/"));
          } catch (e) {
            throw new Error("eso no es Base64 válido");
          }
          try {
            a = new TextDecoder("utf-8", { fatal: !0 }).decode(o);
          } catch (e) {
            throw new Error("se decodifica, pero no es texto (son datos binarios)");
          }
          return { md: "```\n" + a.replace(/```/g, "ˋˋˋ") + "\n```", copiar: a };
        }
        const o = aBase64(new TextEncoder().encode(e));
        return { md: "```\n" + o + "\n```", copiar: o };
      },
    },
    {
      id: "uri",
      alias: ["urlencode", "urldecode", "porciento"],
      emoji: "🔗",
      arg: "texto (o «d» y el código)",
      nombre: "Codificar para URL",
      desc: "Pasa un texto a formato de enlace (%20…); con «d», al revés",
      f(e) {
        const t = /^(?:-d|d|decodificar|decode)\s+([\s\S]+)$/i.exec(e.trim());
        let o;
        if (t)
          try {
            o = decodeURIComponent(t[1].trim().replace(/\+/g, " "));
          } catch (e) {
            throw new Error("eso no está bien codificado");
          }
        else o = encodeURIComponent(e);
        return { md: "```\n" + o.replace(/```/g, "ˋˋˋ") + "\n```", copiar: o };
      },
    },
    {
      id: "hash",
      alias: ["sha256", "sha", "huella"],
      emoji: "#️⃣",
      arg: "texto",
      nombre: "Huella (hash)",
      desc: "SHA-256 de un texto (o sha1 / sha512 delante)",
      async f(e) {
        const t = /^(sha-?1|sha-?256|sha-?384|sha-?512)\s+([\s\S]+)$/i.exec(e.trim()),
          o = t ? "SHA-" + t[1].replace(/sha-?/i, "") : "SHA-256",
          a = t ? t[2] : e,
          r = [...new Uint8Array(await crypto.subtle.digest(o, new TextEncoder().encode(a)))]
            .map((e) => e.toString(16).padStart(2, "0"))
            .join("");
        return { md: `**${o}**\n\n\`\`\`\n${r}\n\`\`\``, copiar: r };
      },
    },
    {
      id: "uuid",
      alias: ["guid", "uuids"],
      emoji: "🆔",
      arg: "cuántos (opcional)",
      opcional: !0,
      nombre: "Generar UUID",
      desc: "Identificadores únicos aleatorios (v4)",
      f(e) {
        const t = Math.max(1, Math.min(50, parseInt(e, 10) || 1)),
          uno = () =>
            crypto.randomUUID
              ? crypto.randomUUID()
              : ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (e) =>
                  (e ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (e / 4)))).toString(16),
                ),
          o = Array.from({ length: t }, uno);
        return { md: "```\n" + o.join("\n") + "\n```", copiar: o.join("\n") };
      },
    },
    {
      id: "json",
      alias: ["formatear", "validar"],
      emoji: "🧾",
      arg: "JSON",
      nombre: "Validar y ordenar JSON",
      desc: "Lo formatea bonito o te dice dónde está el error",
      f(e) {
        try {
          const t = JSON.stringify(JSON.parse(e), null, 2);
          return { md: "✅ JSON válido\n\n```json\n" + t.replace(/```/g, "ˋˋˋ") + "\n```", copiar: t };
        } catch (t) {
          const o = /position (\d+)/i.exec(t.message);
          let a = "";
          if (o) {
            const t = e.slice(0, +o[1]);
            a = ` (línea ${t.split("\n").length}, columna ${t.length - t.lastIndexOf("\n")})`;
          }
          throw new Error("JSON no válido" + a + ": " + t.message.replace(/^JSON\.parse: /, ""));
        }
      },
    },
    {
      id: "color",
      alias: ["colores", "hex", "rgb"],
      emoji: "🎨",
      arg: "#hex, rgb() o nombre",
      nombre: "Colores",
      desc: "Convierte entre HEX, RGB y HSL y te dice qué texto se lee encima",
      f(e) {
        const t = leerColor(e);
        if (!t) throw new Error("escribe un color: #ff3f9e, rgb(255,63,158), hsl(330,100%,62%) o «azul»");
        const o = rgbAHex(t),
          a = rgbAHsl(t),
          n = contraste(o, "#ffffff"),
          r = contraste(o, "#000000");
        return {
          md: `| | |\n|---|---|\n| HEX | ${cod(o)} |\n| RGB | ${cod(`rgb(${t.join(", ")})`)} |\n| HSL | ${cod(`hsl(${a[0]}, ${a[1]}%, ${a[2]}%)`)} |\n| Texto encima | ${r >= n ? "negro" : "blanco"} (contraste ${numBonito(Math.max(n, r), 2)}:1) |`,
          html: `<span class="muestra-color" style="background:${o}" aria-hidden="true"></span>`,
          copiar: o,
        };
      },
    },
    {
      id: "dado",
      alias: ["dados", "moneda", "azar"],
      emoji: "🎲",
      arg: "2d6, d20 o «moneda» (opcional)",
      opcional: !0,
      nombre: "Tirar dados",
      desc: "Dados de cualquier tamaño o cara/cruz",
      f(e) {
        const t = norm(e.trim());
        if (/moneda|cara|cruz|coin/.test(t)) return { md: `🪙 **${azarEntero(2) ? "Cara" : "Cruz"}**` };
        const o = /^(\d*)\s*d\s*(\d+)$/.exec(t) || (t ? null : [0, "1", "6"]);
        if (!o) throw new Error("escribe algo como 2d6, d20 o moneda");
        const a = Math.max(1, Math.min(100, +(o[1] || 1))),
          n = +o[2];
        if (n < 2 || n > 1e6) throw new Error("los dados van de 2 a 1.000.000 caras");
        const r = Array.from({ length: a }, () => azarEntero(n) + 1);
        return {
          md: `🎲 ${a}d${n}: **${r.join(" + ")}**${a > 1 ? ` = **${r.reduce((e, t) => e + t, 0)}**` : ""}`,
          valor: r.reduce((e, t) => e + t, 0),
        };
      },
    },
    {
      id: "aleatorio",
      alias: ["random", "numero", "sorteo"],
      emoji: "🎰",
      arg: "mín máx o lista",
      opcional: !0,
      nombre: "Número al azar",
      desc: "Entre dos números (1 100) o elige uno de una lista (a, b, c)",
      f(e) {
        const t = e.trim();
        if (t.includes(",")) {
          const e = t
            .split(",")
            .map((e) => e.trim())
            .filter(Boolean);
          if (e.length < 2) throw new Error("pon al menos dos opciones separadas por comas");
          return { md: `🎯 **${e[azarEntero(e.length)].replace(/[*_`|]/g, "")}**\n\n_de ${e.length} opciones_` };
        }
        const o = (t.match(/-?\d+/g) || []).map(Number),
          [a, n] =
            o.length >= 2
              ? [Math.min(o[0], o[1]), Math.max(o[0], o[1])]
              : 1 === o.length
                ? [Math.min(1, o[0]), Math.max(1, o[0])]
                : [1, 100];
        if (n - a >= 2 ** 32 - 1) throw new Error("rango demasiado grande");
        const r = a + azarEntero(n - a + 1);
        return { md: `🎰 **${r.toLocaleString("es-ES")}**\n\n_entre ${a} y ${n}_`, valor: r, copiar: String(r) };
      },
    },
    {
      id: "temporizador",
      alias: ["timer", "alarma", "cronometro"],
      emoji: "⏲️",
      arg: "tiempo (5 min, 1h 30m) o «cancelar»",
      opcional: !0,
      nombre: "Temporizador",
      desc: "Te avisa con un sonido cuando pase el tiempo",
      f(e) {
        const t = norm(e.trim());
        if (/^(cancelar|parar|stop|quitar)/.test(t)) {
          const e = Temporizadores.cancelar();
          return { md: e ? `⏹ ${e} temporizador(es) cancelado(s).` : "No había ningún temporizador." };
        }
        if (!t)
          return Temporizadores.lista.length
            ? {
                md: Temporizadores.lista
                  .map(
                    (e) =>
                      `⏲️ quedan **${Math.ceil((e.fin - Date.now()) / 1e3)} s**${e.nombre ? " · " + e.nombre : ""}`,
                  )
                  .join("\n"),
              }
            : { md: "No hay temporizadores. Pon uno: `/temporizador 5 min`" };
        const o = Temporizadores.leer(e);
        if (!o) throw new Error("escribe el tiempo: 5 min, 90 s, 1h 30m o 2:30");
        const a = Temporizadores.poner(o),
          n = new Date(a.fin).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        return {
          md: `⏲️ Temporizador de **${Math.round(o / 1e3)} s**: sonará a las ${n}.\n\n_Deja esta pestaña abierta._`,
        };
      },
    },
    {
      id: "romano",
      alias: ["romanos"],
      emoji: "🏛️",
      arg: "número o romano",
      nombre: "Números romanos",
      desc: "2026 → MMXXVI y al revés",
      f(e) {
        const t = e.trim();
        if (/^\d+$/.test(t)) {
          const e = aRomano(+t);
          return { md: `**${t} = ${e}**`, copiar: e };
        }
        const o = deRomano(t);
        return { md: `**${t.toUpperCase()} = ${o}**`, valor: o, copiar: String(o) };
      },
    },
  ],
  TIPOS_PLUGIN = ["plantilla", "js"],
  FuncionAsincrona = Object.getPrototypeOf(async function () {}).constructor,
  RE_ID_PLUGIN = /^[a-z0-9][a-z0-9_-]{1,19}$/;
function comandoLibre(e, t) {
  const o = norm(e);
  if (PLUGINS_INTEGRADOS.some((e) => [e.id, ...e.alias].map(norm).includes(o))) return !1;
  if (void 0 !== Plugins && Plugins.propios.some((e) => e.id === o && e.id !== t)) return !1;
  const a = COMANDO[o];
  return !a || !!(t && a.plugin && a.plugin.propio && a.id === t);
}
function primerGrafema(e) {
  if (!(e = String(e || "").trim())) return "";
  try {
    if ("function" == typeof Intl.Segmenter)
      for (const t of new Intl.Segmenter("es", { granularity: "grapheme" }).segment(e)) return t.segment;
  } catch (e) {}
  return [...e][0];
}
function validarPlugin(e, t) {
  if (!e || "object" != typeof e) return { ok: !1, error: "plugin no válido" };
  const o = norm(String(e.id || "").trim()).replace(/^\//, "");
  if (!RE_ID_PLUGIN.test(o))
    return { ok: !1, error: "El comando debe tener de 2 a 20 letras minúsculas, números, - o _ (sin espacios)." };
  if (!comandoLibre(o, !0 === t ? o : t)) return { ok: !1, error: `/${o} ya existe en Cece: elige otro nombre.` };
  const a = TIPOS_PLUGIN.includes(e.tipo) ? e.tipo : null;
  if (!a) return { ok: !1, error: "Tipo de plugin no válido." };
  const n = String(e.cuerpo || "");
  if (!n.trim()) return { ok: !1, error: "js" === a ? "Falta el código." : "Falta la plantilla." };
  if (n.length > 2e4) return { ok: !1, error: "El plugin es demasiado largo (máximo 20.000 caracteres)." };
  if ("js" === a)
    try {
      new FuncionAsincrona("texto", n);
    } catch (e) {
      return { ok: !1, error: "El código tiene un error: " + e.message };
    }
  const r = primerGrafema(e.emoji) || "🧩";
  return {
    ok: !0,
    plugin: {
      id: o,
      emoji: /\p{Extended_Pictographic}/u.test(r) && r.length <= 16 ? r : "🧩",
      tipo: a,
      cuerpo: n,
      nombre:
        String(e.nombre || o)
          .trim()
          .slice(0, 40) || o,
      desc: String(e.desc || "")
        .trim()
        .slice(0, 120),
      actualizado: "string" == typeof e.actualizado ? e.actualizado : new Date().toISOString(),
    },
  };
}
function expandirPlantilla(e, t) {
  const o = new Date();
  let a = String(e)
    .replace(/\{fecha\}/g, o.toLocaleDateString("es-ES", { dateStyle: "full" }))
    .replace(/\{hora\}/g, o.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }));
  return /\{texto\}/.test(a) ? a.replace(/\{texto\}/g, () => t) : t ? a.replace(/\s*$/, "") + "\n\n" + t : a;
}
const Arena = {
  f: null,
  listo: null,
  n: 0,
  espera: new Map(),
  CSP: "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; worker-src blob:; connect-src 'none'; img-src 'none'",
  crear() {
    const e = (this.f = document.createElement("iframe"));
    ((e.sandbox = "allow-scripts"),
      e.setAttribute("aria-hidden", "true"),
      (e.tabIndex = -1),
      (e.style.cssText = "position:absolute;width:0;height:0;border:0;visibility:hidden"));
    const t =
      "'use strict';for(const k of ['fetch','XMLHttpRequest','WebSocket','EventSource','importScripts','indexedDB','caches','BroadcastChannel','Worker','SharedWorker'])try{self[k]=undefined}catch(_){}\n";
    ((e.srcdoc = `<!DOCTYPE html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${this.CSP}"><script>\n      const PRO = ${JSON.stringify(t)};\n      onmessage = e => {\n        const { id, codigo, texto } = e.data || {};\n        const src = PRO + 'const FA = Object.getPrototypeOf(async function () {}).constructor; onmessage = async ev => { try { const f = new FA("texto", ev.data.codigo); let r = await f(ev.data.texto); ' +\n          'if (r === undefined || r === null) r = ""; if (typeof r !== "string") { try { r = JSON.stringify(r, null, 2); } catch (_) { r = String(r); } } postMessage({ ok: true, r: String(r).slice(0, 100000) }); } ' +\n          'catch (x) { postMessage({ ok: false, e: String((x && x.message) || x) }); } };';\n        let w;\n        try { w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' }))); }\n        catch (x) { parent.postMessage({ id, ok: false, e: 'no se pudo crear el entorno aislado' }, '*'); return; }\n        w.onmessage = ev => { parent.postMessage({ id, ...ev.data }, '*'); w.terminate(); };\n        w.onerror = ev => { ev.preventDefault(); parent.postMessage({ id, ok: false, e: ev.message || 'error' }, '*'); w.terminate(); };\n        w.postMessage({ codigo, texto });\n      };\n    <\/script>`),
      (this.listo = new Promise((t) => {
        e.onload = () => t();
      })),
      document.body.appendChild(e));
  },
  destruir() {
    (this.f && this.f.remove(), (this.f = null), (this.listo = null));
    for (const [, e] of this.espera) (clearTimeout(e.t), e.rej(new Error("Se detuvo el entorno de los plugins.")));
    this.espera.clear();
  },
  async ejecutar(e, t, o = 3e3) {
    (this.f || this.crear(), await this.listo);
    const a = ++this.n;
    return new Promise((n, r) => {
      const i = setTimeout(() => {
        (this.espera.delete(a), r(new Error(`El plugin tardó más de ${o / 1e3} s y se ha parado.`)), this.destruir());
      }, o);
      (this.espera.set(a, { res: n, rej: r, t: i }),
        this.f.contentWindow.postMessage({ id: a, codigo: String(e), texto: String(t) }, "*"));
    });
  },
};
window.addEventListener("message", (e) => {
  if (!Arena.f || e.source !== Arena.f.contentWindow || !e.data || !Arena.espera.has(e.data.id)) return;
  const t = Arena.espera.get(e.data.id);
  (Arena.espera.delete(e.data.id),
    clearTimeout(t.t),
    e.data.ok
      ? t.res("string" == typeof e.data.r ? e.data.r : "")
      : t.rej(new Error(String(e.data.e || "error").slice(0, 300))));
});
const Plugins = {
  propios: [],
  cargar() {
    const e = almacen.get("cece_plugins", []);
    this.propios = [];
    for (const t of Array.isArray(e) ? e : []) {
      const e = validarPlugin(t);
      e.ok && !this.propios.some((t) => t.id === e.plugin.id) && this.propios.push(e.plugin);
    }
  },
  guardar() {
    (almacen.set("cece_plugins", this.propios), void 0 !== Nube && Nube.marcar("plugins"));
  },
  activo: (e) => !S.pluginsOff.includes(e),
  registrar() {
    for (let e = COMANDOS.length - 1; e >= 0; e--) "plugin" === COMANDOS[e].grupo && COMANDOS.splice(e, 1);
    for (const e of Object.keys(COMANDO)) "plugin" === COMANDO[e].grupo && delete COMANDO[e];
    const poner = (e) => {
      COMANDOS.push(e);
      for (const t of [e.id, ...e.alias]) {
        const o = norm(t);
        COMANDO[o] || (COMANDO[o] = e);
      }
    };
    for (const e of PLUGINS_INTEGRADOS)
      this.activo(e.id) &&
        poner({
          id: e.id,
          alias: e.alias,
          emoji: e.emoji,
          arg: e.arg,
          opcional: !!e.opcional,
          nombre: e.nombre,
          desc: e.desc,
          grupo: "plugin",
          plugin: { local: !0, integrado: !0, f: e.f },
        });
    for (const e of this.propios)
      this.activo("propio:" + e.id) &&
        poner({
          id: e.id,
          alias: [],
          emoji: e.emoji,
          arg: "js" === e.tipo ? "texto" : "texto para la IA",
          opcional: !0,
          nombre: e.nombre,
          desc: e.desc || ("js" === e.tipo ? "Plugin propio (código)" : "Plugin propio (plantilla para la IA)"),
          grupo: "plugin",
          plugin: "js" === e.tipo ? { local: !0, propio: !0, codigo: e.cuerpo } : { plantilla: e.cuerpo, propio: !0 },
        });
  },
  async ejecutar(e, t) {
    const o = e.plugin;
    if (o.integrado) {
      if (!t.trim() && !e.opcional) throw new Error(`escribe ${e.arg} después de /${e.id}`);
      return await o.f(t);
    }
    const a = await Arena.ejecutar(o.codigo, t);
    return { md: a || "_(el plugin no devolvió nada)_", copiar: a };
  },
};
async function ejecutarPluginLocal(e, t) {
  const o = { role: "user", content: t, cmds: [e.id], local: !0 };
  (pintarUsuario(o), historial.push(o));
  const a = crearMensaje("assistant");
  ((a.bubble.className = "bubble thinking"),
    (a.bubble.innerHTML = `<span class="pensando">${esc(e.emoji + " " + e.nombre)}</span><span class="dot"></span><span class="dot"></span><span class="dot"></span>`));
  let n,
    r = null;
  try {
    n = await Plugins.ejecutar(e, t);
  } catch (e) {
    r = (e && e.message) || String(e);
  }
  ((a.bubble.className = "bubble" + (r ? " err" : "")),
    r
      ? (a.bubble.textContent = `❌ /${e.id}: ${r}`)
      : (a.bubble.innerHTML = (e.plugin.integrado && n.html ? n.html : "") + md(String(n.md || ""))),
    aplicarEmojis(a.wrap));
  const i = r ? `❌ /${e.id}: ${r}` : String(n.md || "");
  a.meta.innerHTML = `<span>${horaCorta()}</span><span class="via">🧩 ${esc(e.nombre)} · sin IA</span>`;
  const s = document.createElement("button");
  return (
    (s.className = "mini-btn"),
    (s.textContent = "📋 Copiar"),
    (s.onclick = () => copiar(r ? i : (n.copiar ?? i), s)),
    a.meta.appendChild(s),
    historial.push({ role: "assistant", content: i, local: !0, via: "🧩 " + e.nombre }),
    bajar(!0),
    guardarActual(),
    r ? null : n
  );
}
function pintarPlugins() {
  const e = $("pluginLista");
  if (!e) return;
  const fila = (e, t, o, a, n, r) =>
    `<div class="plg-fila${n ? "" : " apagado"}" data-id="${esc(e)}"><span class="plg-ico">${esc(t)}</span><span class="plg-txt"><b>/${esc(r ? e.slice(7) : e)}</b> ${esc(o)}<small>${esc(a)}</small></span>` +
    (r ? `<button type="button" class="mini-btn plg-editar" aria-label="Editar ${esc(o)}">✏️</button>` : "") +
    `<span class="sw"><input type="checkbox" class="plg-on" aria-label="Activar ${esc(o)}"${n ? " checked" : ""}><span class="sw-pista"></span></span></div>`;
  ((e.innerHTML =
    '<div class="plg-grupo">Integrados · sin IA y sin internet</div>' +
    PLUGINS_INTEGRADOS.map((e) => fila(e.id, e.emoji, e.nombre, e.desc, Plugins.activo(e.id), !1)).join("") +
    '<div class="plg-grupo">Tuyos</div>' +
    (Plugins.propios.length
      ? Plugins.propios
          .map((e) =>
            fila(
              "propio:" + e.id,
              e.emoji,
              e.nombre,
              "js" === e.tipo ? "código aislado" : "plantilla para la IA",
              Plugins.activo("propio:" + e.id),
              !0,
            ),
          )
          .join("")
      : '<div class="conv-vacio">Aún no has creado ninguno. Por ejemplo: /traducir con la plantilla «Traduce al inglés: {texto}».</div>')),
    aplicarEmojis(e));
}
(Plugins.cargar(), Plugins.registrar());
let _plgEditando = null;
function abrirEditorPlugin(e) {
  ((_plgEditando = e ? e.id : null),
    ($("pluginTitulo").textContent = e ? `🧩 Editar /${e.id}` : "🧩 Nuevo plugin"),
    ($("plgEmoji").value = e ? e.emoji : "🧩"),
    ($("plgId").value = e ? e.id : ""),
    ($("plgNombre").value = e ? e.nombre : ""),
    ($("plgDesc").value = e ? e.desc : ""));
  for (const t of document.querySelectorAll('input[name="plgTipo"]'))
    t.checked = t.value === (e ? e.tipo : "plantilla");
  (($("plgCuerpo").value = e ? e.cuerpo : ""),
    ($("plgError").textContent = ""),
    ($("plgSalida").hidden = !0),
    ($("plgBorrar").style.display = e ? "" : "none"),
    ayudaTipoPlugin());
  const t = $("pluginModal");
  (t.classList.add("active"),
    t.setAttribute("aria-hidden", "false"),
    setTimeout(() => $(e ? "plgCuerpo" : "plgId").focus(), 30));
}
function cerrarEditorPlugin() {
  const e = $("pluginModal");
  (e.classList.remove("active"), e.setAttribute("aria-hidden", "true"), (_plgEditando = null));
  const t = $("pluginNuevo");
  t && t.getClientRects().length && t.focus();
}
const tipoElegido = () => (document.querySelector('input[name="plgTipo"]:checked') || {}).value || "plantilla";
function ayudaTipoPlugin() {
  const e = "js" === tipoElegido();
  (($("plgCuerpo").placeholder = e
    ? '// «texto» es lo que escribes detrás del comando\nreturn texto.split("").reverse().join("");'
    : "Traduce al inglés, solo la traducción:\n\n{texto}"),
    ($("plgAyuda").textContent = e
      ? "JavaScript que devuelve un texto (se muestra con Markdown). Se ejecuta aislado: no ve la página, ni tus claves, ni tus conversaciones, ni puede conectarse a internet. Tiene 3 segundos."
      : "Lo que se envía a la IA. {texto} es lo que escribas detrás del comando; también puedes usar {fecha} y {hora}."));
}
function datosEditorPlugin() {
  return {
    id: $("plgId").value,
    emoji: $("plgEmoji").value,
    nombre: $("plgNombre").value,
    desc: $("plgDesc").value,
    tipo: tipoElegido(),
    cuerpo: $("plgCuerpo").value,
    actualizado: new Date().toISOString(),
  };
}
function importarPlugins(e) {
  if (e.size > 2097152) return void toast("Ese archivo es demasiado grande.", "mal");
  const t = new FileReader();
  ((t.onload = () => {
    let e;
    try {
      const o = JSON.parse(t.result);
      e = Array.isArray(o) ? o : Array.isArray(o.plugins) ? o.plugins : null;
    } catch (e) {}
    if (!e) return void toast("Ese archivo no tiene plugins de Cece.", "mal");
    const o = e.filter((e) => e && "js" === e.tipo).length;
    if (
      o &&
      !confirm(
        `Hay ${o} plugin(s) con código. Se ejecutan aislados (sin ver tus claves ni conversaciones y sin internet), pero importa solo lo que venga de alguien de confianza. ¿Seguir?`,
      )
    )
      return;
    let a = 0;
    const n = [];
    for (const t of e) {
      const e = Plugins.propios.find((e) => t && e.id === norm(String(t.id || ""))),
        o = validarPlugin(t, e ? e.id : void 0);
      o.ok
        ? (e ? Object.assign(e, o.plugin) : Plugins.propios.push(o.plugin), a++)
        : n.push(String((t && t.id) || "?"));
    }
    (Plugins.guardar(),
      Plugins.registrar(),
      pintarPlugins(),
      toast(
        `🧩 ${a} plugin(s) importado(s)${n.length ? ` · ${n.length} no válido(s): ${n.slice(0, 3).join(", ")}` : ""}.`,
        n.length ? "mal" : "ok",
        6e3,
      ));
  }),
    t.readAsText(e));
}
function conectarPlugins() {
  ($("pluginLista").addEventListener("change", (e) => {
    const t = e.target.closest(".plg-on");
    if (!t) return;
    const o = t.closest(".plg-fila").dataset.id;
    ((S.pluginsOff = t.checked ? S.pluginsOff.filter((e) => e !== o) : [...new Set([...S.pluginsOff, o])]),
      guardarAjustes(),
      Plugins.registrar());
    const a = document.activeElement === t;
    if ((pintarPlugins(), a)) {
      const e = [...$("pluginLista").querySelectorAll(".plg-fila")].find((e) => e.dataset.id === o);
      e && e.querySelector(".plg-on") && e.querySelector(".plg-on").focus();
    }
    void 0 !== Nube && Nube.marcar("plugins");
  }),
    $("pluginLista").addEventListener("click", (e) => {
      const t = e.target.closest(".plg-editar");
      if (!t) return;
      const o = Plugins.propios.find((e) => "propio:" + e.id === t.closest(".plg-fila").dataset.id);
      o && abrirEditorPlugin(o);
    }),
    $("pluginNuevo").addEventListener("click", () => abrirEditorPlugin(null)),
    $("pluginCerrar").addEventListener("click", cerrarEditorPlugin),
    cerrarAlPulsarFuera($("pluginModal"), cerrarEditorPlugin),
    $("pluginModal").addEventListener("keydown", (e) => {
      "Escape" === e.key
        ? (e.stopPropagation(), cerrarEditorPlugin())
        : atraparFoco($("pluginModal").querySelector(".modal-content"), e);
    }));
  for (const e of document.querySelectorAll('input[name="plgTipo"]')) e.addEventListener("change", ayudaTipoPlugin);
  ($("plgProbar").addEventListener("click", async () => {
    const e = datosEditorPlugin(),
      t = $("plgSalida");
    if ((($("plgError").textContent = ""), (t.hidden = !1), "plantilla" !== e.tipo)) {
      t.textContent = "⏳ Ejecutando…";
      try {
        t.textContent = (await Arena.ejecutar(e.cuerpo, $("plgPrueba").value)) || "(no devolvió nada)";
      } catch (e) {
        t.textContent = "❌ " + e.message;
      }
    } else t.textContent = expandirPlantilla(e.cuerpo, $("plgPrueba").value);
  }),
    $("pluginForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const t = validarPlugin(datosEditorPlugin(), _plgEditando);
      if (!t.ok) return void ($("plgError").textContent = t.error);
      const o = Plugins.propios.findIndex((e) => e.id === _plgEditando);
      if (o >= 0) {
        if (_plgEditando !== t.plugin.id) {
          const e = S.pluginsOff.includes("propio:" + _plgEditando);
          ((S.pluginsOff = S.pluginsOff.filter((e) => e !== "propio:" + _plgEditando)),
            e && S.pluginsOff.push("propio:" + t.plugin.id));
        }
        Plugins.propios[o] = t.plugin;
      } else Plugins.propios.push(t.plugin);
      (guardarAjustes(),
        Plugins.guardar(),
        Plugins.registrar(),
        pintarPlugins(),
        cerrarEditorPlugin(),
        toast(`🧩 /${t.plugin.id} guardado. Escríbelo al principio de un mensaje.`, "ok"));
    }),
    $("plgBorrar").addEventListener("click", () => {
      const e = Plugins.propios.find((e) => e.id === _plgEditando);
      e &&
        confirm(`¿Borrar el plugin /${e.id}?`) &&
        ((Plugins.propios = Plugins.propios.filter((t) => t !== e)),
        (S.pluginsOff = S.pluginsOff.filter((t) => t !== "propio:" + e.id)),
        guardarAjustes(),
        Plugins.guardar(),
        Plugins.registrar(),
        pintarPlugins(),
        cerrarEditorPlugin());
    }),
    $("pluginExportar").addEventListener("click", () => {
      Plugins.propios.length
        ? descargar(
            `cece-plugins-${sello()}.json`,
            JSON.stringify({ app: "Cece AI", tipo: "plugins", version: 1, plugins: Plugins.propios }, null, 2),
            "application/json",
          )
        : toast("Todavía no has creado plugins.");
    }),
    $("pluginImportar").addEventListener("click", () => $("pluginArchivo").click()),
    $("pluginArchivo").addEventListener("change", (e) => {
      (e.target.files[0] && importarPlugins(e.target.files[0]), (e.target.value = ""));
    }));
}
function pintarMarca() {
  let e = 0;
  $("brand").innerHTML = [..."CECE AI"]
    .map((t) => (" " === t ? '<span class="ltr esp"> </span>' : `<span class="ltr" style="--i:${e++}">${t}</span>`))
    .join("");
}
function reloj() {
  const e = new Date(),
    p = (e) => String(e).padStart(2, "0");
  $("clock").textContent = `${p(e.getHours())}:${p(e.getMinutes())}:${p(e.getSeconds())}`;
}
function ondas() {
  const e = ".icon-btn,.mode-btn,.send-btn,.esf-btn,.preset-btn,.btn-secondary,.dropdown-item,.btn-live";
  document.addEventListener("pointerdown", (t) => {
    const o = t.target.closest(e);
    if (!o || o.disabled) return;
    const a = o.getBoundingClientRect(),
      n = Math.max(a.width, a.height),
      r = document.createElement("span");
    ((r.className = "onda"),
      (r.style.cssText = `width:${n}px;height:${n}px;left:${t.clientX - a.left - n / 2}px;top:${t.clientY - a.top - n / 2}px`),
      o.appendChild(r),
      r.addEventListener("animationend", () => r.remove()),
      setTimeout(() => r.remove(), 900));
  });
}
function animarBoton(e) {
  (e.classList.remove("cambiando"),
    e.offsetWidth,
    e.classList.add("cambiando"),
    setTimeout(() => e.classList.remove("cambiando"), 600));
}
const itemsNivel = () => [...document.querySelectorAll("#modelDropdown .dropdown-item[data-model]")];
function montarMenuNiveles() {
  const e = document.querySelector("#modelDropdown .model-options");
  if (!e) return;
  for (const t of e.querySelectorAll("[data-model]")) Object.hasOwn(CECE_MAP, t.dataset.model) || t.remove();
  for (const t of CECE) {
    if (t.local) continue;
    let o = e.querySelector(`[data-model="${t.id}"]`);
    if (!o) {
      ((o = document.createElement("button")),
        (o.className = "dropdown-item"),
        (o.dataset.model = t.id),
        (o.dataset.label = t.label),
        o.setAttribute("role", "option"),
        o.setAttribute("aria-selected", "false"));
      const [e, a] = t.insignia || ["badge-new", "✨ Nuevo"];
      o.innerHTML = `<span class="item-row"><span class="dot-color"></span><span class="item-text"><span class="item-name">${esc(t.nombre)}</span><span class="item-sub">Cece Company</span></span></span><span class="badge ${esc(e)}">${esc(a)}</span>`;
    }
    const a = o.querySelector(".dot-color");
    (a && (a.style.background = colorDe(t)), o.style.setProperty("--c", colorDe(t)), e.appendChild(o));
  }
  const t = e.querySelector('[data-model="cece-local"]');
  if (t) {
    e.appendChild(t);
    const o = t.querySelector(".dot-color");
    o && (o.style.background = colorDe(CECE_MAP["cece-local"]));
  }
}
function refrescarColoresNivel() {
  (montarMenuNiveles(), CECE_MAP[S.modelo] && elegirNivel(S.modelo, !0), pintarPro());
}
function elegirNivel(e, t) {
  const o = CECE_MAP[e],
    a = itemsNivel().find((t) => t.dataset.model === e);
  if (!o || !a) return;
  ((S.modelo = e), guardarAjustes(), ($("currentModelLabel").textContent = a.dataset.label || o.label));
  const n = a.querySelector(".badge"),
    r = $("pillBadge");
  (n && ((r.className = n.className), (r.innerHTML = n.innerHTML)),
    r.classList.remove("late"),
    r.offsetWidth,
    r.classList.add("late"),
    document.documentElement.style.setProperty("--modelo", colorDe(o)));
  for (const t of itemsNivel()) {
    const o = t.dataset.model === e,
      a = CECE_MAP[t.dataset.model];
    if (a && a.color) {
      t.style.setProperty("--c", colorDe(a));
      const e = t.querySelector(".dot-color");
      e && (e.style.background = colorDe(a));
    }
    (t.classList.toggle("sel", o), t.setAttribute("aria-selected", o ? "true" : "false"));
  }
  (($("bloquePro").style.display = "cece-pro" === e ? "" : "none"),
    $("maxiBtn").classList.toggle("maxi-on", "cece-pro" === e && S.maxi),
    aplicarEmojis($("modelPillBtn")),
    actualizarTitulosNivel(),
    Voz.refrescarEtiquetas());
}
function actualizarTitulosNivel() {
  for (const e of itemsNivel()) {
    const t = e.dataset.model;
    if ("cece-pro" === t) {
      e.title = PRO_PARTES.map((e) => e.nom).join(" + ") + (S.relevo ? " por relevo" : " a la vez");
      continue;
    }
    const o = motoresDe(t)[0];
    e.title = o ? etiquetaMotor(o) : "";
  }
}
function abrirMenu(e) {
  const t = $("modelDropdown"),
    o = e ?? !t.classList.contains("open");
  (t.classList.toggle("open", o), $("modelPillBtn").setAttribute("aria-expanded", o ? "true" : "false"));
}
function aplicarModoCode() {
  ($("codeModeBtn").classList.toggle("code-on", S.codeMode), ($("avisoCode").style.display = S.codeMode ? "" : "none"));
  for (const e of itemsNivel()) e.classList.toggle("oculto", S.codeMode && !CECE_MAP[e.dataset.model].code);
  S.codeMode && !CECE_MAP[S.modelo].code && elegirNivel("cece-ultra-code", !0);
}
function pintarEsfuerzo() {
  document.querySelectorAll("#esfuerzoRow .esf-btn").forEach((e) => e.classList.toggle("on", e.dataset.esf === S.esf));
}
function pintarPro() {
  const e = PRO_PARTES.length;
  (($("swFusion").checked = S.fusion),
    ($("swMaxi").checked = S.maxi),
    $("swRelevo") && ($("swRelevo").checked = S.relevo),
    ($("swFusion").closest(".switch-fila").style.display = S.relevo ? "none" : ""),
    ($("hintFusion").style.display = S.relevo ? "none" : ""),
    ($("hintFusion").textContent =
      `Los ${e} modelos trabajan a la vez y después uno de ellos funde los borradores en una sola respuesta, quedándose con lo mejor de cada uno. Si hay código, lo unifica en una sola versión. Cuesta una llamada más por mensaje.`),
    ($("avisoMaxi").style.display = S.maxi ? "" : "none"),
    ($("avisoMaxi").textContent =
      (S.relevo
        ? `Los ${e} modelos trabajan todos, por relevo, y termina el más potente.`
        : `Los ${e} modelos van al 100% y cuentan por igual.`) +
      ` Es el modo más potente y también el más caro: cada mensaje se paga ${e} veces.`),
    ($("repartoManual").style.display = S.maxi ? "none" : ""),
    ($("tituloPro").textContent = S.maxi ? "Cece Pro — MaxFull" : "Cece Pro — reparto"),
    ($("hintPro").textContent = S.relevo
      ? S.maxi
        ? `Los ${e} modelos trabajan por relevo al 100%, y termina el más potente.`
        : `Los ${e} modelos trabajan por relevo, del de menos peso al de más: el de mayor peso termina y da la respuesta.`
      : S.maxi
        ? `Los ${e} modelos van al 100% y cuentan por igual.`
        : `Los ${e} modelos responden a la vez. El de mayor peso marca la respuesta principal, la que se usa como contexto.`));
  for (const e of REPARTO) (($("rep" + e).value = S["rep" + e]), ($("pct" + e).value = S["rep" + e]));
  for (const e of PRO_PARTES) {
    const t = $("rep" + e.k)
      .closest(".rep-fila")
      .querySelector(".rep-nom");
    t && (t.style.color = e.color);
  }
  ($("maxiBtn").classList.toggle("maxi-on", "cece-pro" === S.modelo && S.maxi), actualizarTitulosNivel());
}
function repartir(e, t) {
  t = Math.max(0, Math.min(100, Math.round(+t || 0)));
  const o = REPARTO.filter((t) => t !== e),
    a = repartoEntero(
      100 - t,
      o.map((e) => S["rep" + e]),
    );
  ((S["rep" + e] = t),
    o.forEach((e, t) => {
      S["rep" + e] = a[t];
    }),
    guardarAjustes(),
    pintarPro());
}
function pintarVelocidad() {
  (($("speedSlider").value = S.vel),
    ($("speedValue").value = S.vel),
    document
      .querySelectorAll("#presetVel .preset-btn")
      .forEach((e) => e.classList.toggle("on", +e.dataset.vel === S.vel)));
}
function ponerVelocidad(e) {
  ((S.vel = Math.max(5, Math.min(500, 5 * Math.round((+e || 80) / 5)))), guardarAjustes(), pintarVelocidad());
}
function pantallaCompleta(e) {
  const t = !!document.fullscreenElement,
    o = e ?? !t;
  try {
    o && !t
      ? document.documentElement.requestFullscreen().catch(() => {})
      : !o && t && document.exitFullscreen().catch(() => {});
  } catch (e) {}
}
const RE_EMOJI = /\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*️?/gu,
  clavesEmoji = (e) => [e, e.replace(/️/g, ""), e.replace(/️/g, "") + "️"],
  PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  _celdas = {};
function hojaEmoji(e) {
  const t = "undefined" != typeof EMOJI_SETS && EMOJI_SETS[e];
  return t && t.img && !t.roto ? (_celdas[e] || (_celdas[e] = new Map(t.lista.map((e, t) => [e, t]))), t) : null;
}
function celdaEmoji(e, t) {
  if (!hojaEmoji(e)) return -1;
  for (const o of clavesEmoji(t)) if (_celdas[e].has(o)) return _celdas[e].get(o);
  return -1;
}
function imgEmoji(e, t, o = t) {
  const a = celdaEmoji(e, t);
  if (a < 0) return null;
  const { cols: n, filas: r } = EMOJI_SETS[e],
    i = n > 1 ? ((a % n) / (n - 1)) * 100 : 0,
    s = r > 1 ? (Math.floor(a / n) / (r - 1)) * 100 : 0;
  return `<img class="emo emo-${e}" alt="${esc(o)}" src="${PIXEL}" style="background-position:${+i.toFixed(3)}% ${+s.toFixed(3)}%">`;
}
function prepararHojasEmoji() {
  if ("undefined" == typeof EMOJI_SETS) return;
  let e = "";
  for (const [t, o] of Object.entries(EMOJI_SETS)) {
    if (!o || !o.img) continue;
    e += `img.emo-${t}{background-image:url("${o.img}");background-repeat:no-repeat;background-size:${100 * o.cols}% ${100 * o.filas}%;}`;
    const a = new Image();
    ((a.onerror = () => {
      ((o.roto = !0), aplicarEmojis(), pintarEmojiOpciones());
    }),
      (a.src = o.img));
  }
  const t = document.createElement("style");
  ((t.id = "cece-hojas-emoji"), (t.textContent = e), document.head.appendChild(t));
}
function envolverEmojis(e) {
  if ("undefined" == typeof EMOJI_SETS) return;
  const t = document.createTreeWalker(e, NodeFilter.SHOW_TEXT, {
      acceptNode(e) {
        const t = e.parentElement;
        return !t ||
          t.closest(
            ".bubble, textarea, input, select, option, script, style, code, pre, .emo-w, [data-fijo], .live-ia, .live-user, .api-test",
          )
          ? NodeFilter.FILTER_REJECT
          : ((RE_EMOJI.lastIndex = 0),
            RE_EMOJI.test(e.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT);
      },
    }),
    o = [];
  for (; t.nextNode();) o.push(t.currentNode);
  for (const e of o) {
    const t = document.createDocumentFragment();
    let o = 0;
    const a = e.nodeValue;
    (a.replace(RE_EMOJI, (e, n) => {
      if (celdaEmoji("windows", e) < 0 && celdaEmoji("plano", e) < 0) return e;
      t.append(a.slice(o, n));
      const r = document.createElement("span");
      return ((r.className = "emo-w"), (r.dataset.e = e), (r.textContent = e), t.append(r), (o = n + e.length), e);
    }),
      0 !== o && (t.append(a.slice(o)), e.replaceWith(t)));
  }
}
function aplicarEmojis(e = document.body) {
  (envolverEmojis(e),
    e.querySelectorAll(".emo-w").forEach((e) => {
      const t = "sistema" !== S.emoji ? imgEmoji(S.emoji, e.dataset.e) : null;
      t
        ? (e.firstElementChild && e.dataset.estilo === S.emoji) || ((e.innerHTML = t), (e.dataset.estilo = S.emoji))
        : (e.textContent !== e.dataset.e || e.firstElementChild) &&
          ((e.textContent = e.dataset.e), delete e.dataset.estilo);
    }));
}
function pintarEmojiOpciones() {
  document.querySelectorAll(".emo-opt").forEach((e) => {
    const t = e.dataset.estilo === S.emoji;
    (e.classList.toggle("on", t), e.setAttribute("aria-pressed", t ? "true" : "false"));
  });
  for (const e of ["windows", "plano"]) {
    const t = document.querySelector(`.emo-prev[data-prev="${e}"]`);
    if (!t) continue;
    const o = ["🚀", "💬", "🎨", "⚙️"].map((t) => imgEmoji(e, t, "")).filter(Boolean);
    t.innerHTML = o.length ? o.join("") : "🚀💬🎨⚙️";
  }
}
const LENGUAJES = {
    python: ["python", "py"],
    py: ["python", "py"],
    javascript: ["javascript", "js"],
    js: ["javascript", "js"],
    mjs: ["javascript", "mjs"],
    jsx: ["javascript", "jsx"],
    typescript: ["typescript", "ts"],
    ts: ["typescript", "ts"],
    tsx: ["typescript", "tsx"],
    html: ["html", "html"],
    htm: ["html", "html"],
    css: ["css", "css"],
    scss: ["css", "scss"],
    json: ["json", "json"],
    bash: ["bash", "sh"],
    sh: ["bash", "sh"],
    shell: ["bash", "sh"],
    zsh: ["bash", "sh"],
    console: ["bash", "sh"],
    powershell: ["powershell", "ps1"],
    ps1: ["powershell", "ps1"],
    bat: ["batch", "bat"],
    batch: ["batch", "bat"],
    cmd: ["batch", "bat"],
    c: ["c", "c"],
    cpp: ["cpp", "cpp"],
    "c++": ["cpp", "cpp"],
    h: ["c", "h"],
    csharp: ["csharp", "cs"],
    cs: ["csharp", "cs"],
    java: ["java", "java"],
    kotlin: ["kotlin", "kt"],
    kt: ["kotlin", "kt"],
    swift: ["swift", "swift"],
    go: ["go", "go"],
    rust: ["rust", "rs"],
    rs: ["rust", "rs"],
    php: ["php", "php"],
    ruby: ["ruby", "rb"],
    rb: ["ruby", "rb"],
    sql: ["sql", "sql"],
    yaml: ["yaml", "yml"],
    yml: ["yaml", "yml"],
    xml: ["xml", "xml"],
    svg: ["svg", "svg"],
    markdown: ["markdown", "md"],
    md: ["markdown", "md"],
    lua: ["lua", "lua"],
    dart: ["dart", "dart"],
    r: ["r", "r"],
    vue: ["vue", "vue"],
    svelte: ["svelte", "svelte"],
    arduino: ["arduino", "ino"],
    ino: ["arduino", "ino"],
    ini: ["config", "ini"],
    toml: ["config", "toml"],
    dockerfile: ["docker", "Dockerfile"],
  },
  limpiarNombre = (e) =>
    String(e)
      .replace(/[\u0000-\u001f\u007f\u200e\u200f\u202a-\u202e\u2066-\u2069\\:*?"<>|]/g, "")
      .replace(/^\/+/, "")
      .replace(/\.\.+/g, ".")
      .replace(/\/{2,}/g, "/")
      .slice(0, 120) || "archivo.txt",
  RE_NOMBRE =
    /^\s*(?:\/\/|#|--|;|<!--|\/\*|rem\s|')\s*(?:archivo|fichero|file(?:name)?|nombre)?\s*:?\s*([\w.\-\/]+\.[a-z0-9]{1,8})\s*(?:-->|\*\/)?\s*$/i,
  Codigo = {
    raiz: null,
    archivos: [],
    cont: 0,
    soporta: "function" == typeof window.showDirectoryPicker,
    destino(e) {
      const t = String(e || "").toLowerCase(),
        [o, a] = Object.hasOwn(LENGUAJES, t)
          ? LENGUAJES[t]
          : [t.replace(/[^\w+-]/g, "").slice(0, 30) || "texto", "txt"],
        n = Object.hasOwn(S.carpetas, o) && "string" == typeof S.carpetas[o] ? S.carpetas[o] : o;
      return (
        Object.hasOwn(S.carpetas, o) || ((S.carpetas[o] = n), guardarAjustes(), pintarCarpetas()),
        { carpeta: n, ext: a }
      );
    },
    nombrePara(e) {
      if (e.nombre && /\.\w+$/.test(e.nombre)) return limpiarNombre(e.nombre);
      const o = String(e.codigo).split("\n")[0].match(RE_NOMBRE);
      if (o) return limpiarNombre(o[1]);
      const { ext: a } = this.destino(e.lang);
      return `cece_${sello()}_${++this.cont}.${a}`;
    },
    async guardarEn(e, t, o) {
      let a = await this.raiz.getDirectoryHandle(e, { create: !0 });
      const n = t.split("/").filter(Boolean),
        r = n.pop();
      for (const e of n) a = await a.getDirectoryHandle(e, { create: !0 });
      const i = await a.getFileHandle(r, { create: !0 }),
        s = await i.createWritable();
      (await s.write(o), await s.close());
    },
    ruta(e, t) {
      if (t && t.dataset.ruta) return t.dataset.ruta;
      const o = `${this.destino(e.lang).carpeta}/${this.nombrePara(e)}`;
      return (t && (t.dataset.ruta = o), o);
    },
    async guardarBloque(e, t, o) {
      const a = this.ruta(e, t),
        [n, ...r] = a.split("/"),
        i = r.join("/"),
        s = this.archivos.findIndex((e) => e.ruta === a);
      (s >= 0 ? (this.archivos[s].contenido = e.codigo) : this.archivos.push({ ruta: a, contenido: e.codigo }),
        ($("zipBtn").style.display = ""));
      let c = !1;
      if (this.raiz)
        try {
          (await this.guardarEn(n, i, e.codigo), (c = !0));
        } catch (e) {
          toast("No se pudo guardar en la carpeta: " + e.message, "mal");
        }
      !c && o && (descargar(i.split("/").pop(), e.codigo), (c = !0));
      const l = t && t.querySelector(".carpeta");
      l && (l.textContent = c ? `📁 ${a} ✓` : `📁 ${a}`);
    },
    procesar(e, t) {
      const o = extraerCodigo(e);
      if (!o.length) return;
      const a = t.querySelectorAll(".code-wrap");
      o.forEach((e, t) => {
        const o = a[t],
          n = e.nombre || RE_NOMBRE.test(String(e.codigo).split("\n")[0]),
          r = String(e.codigo).split("\n").length;
        if (n || r >= 4)
          if (S.autoZip && this.raiz) this.guardarBloque(e, o, !1);
          else {
            const t = this.ruta(e, o);
            (this.archivos.some((e) => e.ruta === t) || this.archivos.push({ ruta: t, contenido: e.codigo }),
              ($("zipBtn").style.display = ""),
              o && (o.querySelector(".carpeta").textContent = `📁 ${t}`));
          }
      });
    },
    async cargar() {
      if (!this.soporta)
        return (
          estadoCarpeta(
            "Tu navegador no deja elegir carpetas (hace falta Chrome o Edge). Puedes descargar el código en .zip.",
            "naranja",
          ),
          void ($("elegirCarpeta").style.display = "none")
        );
      const e = await idb("get", "raiz").catch(() => null);
      if (e)
        try {
          "granted" === (await e.queryPermission({ mode: "readwrite" }))
            ? ((this.raiz = e), estadoCarpeta(`Guardando en «${e.name}».`, "verde"))
            : ((this._pendiente = e),
              ($("reconectarCarpeta").style.display = ""),
              estadoCarpeta(`Carpeta guardada: «${e.name}». Pulsa reconectar para seguir usándola.`, "naranja"));
        } catch (e) {}
    },
    async elegir() {
      try {
        const e = await window.showDirectoryPicker({ id: "cece-codigo", mode: "readwrite" });
        ((this.raiz = e),
          await idb("set", "raiz", e).catch(() => {}),
          ($("reconectarCarpeta").style.display = "none"),
          estadoCarpeta(`Guardando en «${e.name}».`, "verde"));
        for (const e of this.archivos) {
          const [t, ...o] = e.ruta.split("/");
          await this.guardarEn(t, o.join("/"), e.contenido).catch(() => {});
        }
      } catch (e) {
        "AbortError" !== e.name && toast("No se pudo abrir la carpeta: " + e.message, "mal");
      }
    },
    async reconectar() {
      const e = this._pendiente;
      if (e)
        try {
          "granted" === (await e.requestPermission({ mode: "readwrite" })) &&
            ((this.raiz = e),
            ($("reconectarCarpeta").style.display = "none"),
            estadoCarpeta(`Guardando en «${e.name}».`, "verde"));
        } catch (e) {
          toast(e.message, "mal");
        }
    },
  };
function estadoCarpeta(e, t) {
  const o = $("estadoCarpeta");
  ((o.style.display = e ? "" : "none"), (o.className = "aviso" + (t ? " aviso-" + t : "")), (o.textContent = e));
}
function pintarCarpetas() {
  const e = $("carpetaLista"),
    t = Object.keys(S.carpetas);
  e.innerHTML = t.map((e) => `<span class="carpeta-chip"><b>${esc(e)}</b> → ${esc(S.carpetas[e])}/</span>`).join("");
}
function idb(e, t, o) {
  return new Promise((a, n) => {
    let r;
    try {
      r = indexedDB.open("cece-ai", 1);
    } catch (e) {
      return n(e);
    }
    ((r.onupgradeneeded = () => r.result.createObjectStore("kv")),
      (r.onerror = () => n(r.error)),
      (r.onblocked = () => n(new Error("IndexedDB bloqueada"))),
      (r.onsuccess = () => {
        const i = r.result;
        try {
          const r = i.transaction("kv", "get" === e || "keys" === e ? "readonly" : "readwrite"),
            s = r.objectStore("kv"),
            c = "get" === e ? s.get(t) : "set" === e ? s.put(o, t) : "keys" === e ? s.getAllKeys() : s.delete(t);
          ((c.onsuccess = () => a(c.result)),
            (c.onerror = () => n(c.error)),
            (r.oncomplete = () => i.close()),
            (r.onabort = () => {
              (i.close(), n(r.error || new Error("IndexedDB: transacción cancelada")));
            }));
        } catch (e) {
          (i.close(), n(e));
        }
      }));
  });
}
const CRC_T = (() => {
  const e = new Uint32Array(256);
  for (let t = 0; t < 256; t++) {
    let o = t;
    for (let e = 0; e < 8; e++) o = 1 & o ? 3988292384 ^ (o >>> 1) : o >>> 1;
    e[t] = o >>> 0;
  }
  return e;
})();
function crc32(e) {
  let t = 4294967295;
  for (let o = 0; o < e.length; o++) t = CRC_T[255 & (t ^ e[o])] ^ (t >>> 8);
  return (4294967295 ^ t) >>> 0;
}
function crearZip(e) {
  const t = new TextEncoder(),
    o = [],
    a = [];
  let n = 0;
  const r = new Date(),
    i = (r.getHours() << 11) | (r.getMinutes() << 5) | (r.getSeconds() >> 1),
    s = ((r.getFullYear() - 1980) << 9) | ((r.getMonth() + 1) << 5) | r.getDate();
  for (const r of e) {
    const e = t.encode(r.ruta),
      c = t.encode(r.contenido),
      l = crc32(c),
      d = new DataView(new ArrayBuffer(30));
    (d.setUint32(0, 67324752, !0),
      d.setUint16(4, 20, !0),
      d.setUint16(6, 2048, !0),
      d.setUint16(10, i, !0),
      d.setUint16(12, s, !0),
      d.setUint32(14, l, !0),
      d.setUint32(18, c.length, !0),
      d.setUint32(22, c.length, !0),
      d.setUint16(26, e.length, !0),
      o.push(d.buffer, e, c));
    const u = new DataView(new ArrayBuffer(46));
    (u.setUint32(0, 33639248, !0),
      u.setUint16(4, 20, !0),
      u.setUint16(6, 20, !0),
      u.setUint16(8, 2048, !0),
      u.setUint16(12, i, !0),
      u.setUint16(14, s, !0),
      u.setUint32(16, l, !0),
      u.setUint32(20, c.length, !0),
      u.setUint32(24, c.length, !0),
      u.setUint16(28, e.length, !0),
      u.setUint32(42, n, !0),
      a.push(u.buffer, e),
      (n += 30 + e.length + c.length));
  }
  const c = a.reduce((e, t) => e + (t.byteLength ?? t.length), 0),
    l = new DataView(new ArrayBuffer(22));
  return (
    l.setUint32(0, 101010256, !0),
    l.setUint16(8, e.length, !0),
    l.setUint16(10, e.length, !0),
    l.setUint32(12, c, !0),
    l.setUint32(16, n, !0),
    new Blob([...o, ...a, l.buffer], { type: "application/zip" })
  );
}
function normalizarConvs(e) {
  const t = new Set();
  return (Array.isArray(e) ? e : [])
    .filter((e) => e && "object" == typeof e && "string" == typeof e.id && e.id && Array.isArray(e.mensajes))
    .filter((e) => !t.has(e.id) && t.add(e.id))
    .map((e) => ({
      id: e.id.slice(0, 60),
      titulo: String(e.titulo || "Conversación").slice(0, 200),
      fecha: String(e.fecha || ""),
      ...("string" == typeof e.modelo ? { modelo: e.modelo } : {}),
      mensajes: e.mensajes
        .map((e) => {
          try {
            return mensajeValido(e);
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean),
    }));
}
let convs = normalizarConvs(almacen.get("cece_convs", []));
function convsBorradas() {
  const e = almacen.get("cece_borradas", {});
  return e && "object" == typeof e && !Array.isArray(e)
    ? Object.fromEntries(Object.entries(e).filter(([e, t]) => "string" == typeof e && "string" == typeof t))
    : {};
}
function estadoConv(e, t) {
  const o = $("convStatus");
  ((o.style.color = t ? "var(--color-mal, #ff9a9a)" : ""),
    (o.textContent = e),
    clearTimeout(o._t),
    (o._t = setTimeout(() => {
      o.textContent = "";
    }, 3500)));
}
function tituloConv(e) {
  const t =
    e.find((e) => "user" === e.role && !e.local && (e.mostrar || e.content)) || e.find((e) => "user" === e.role);
  if (!t) return "Conversación";

  return (
    String(t.mostrar || t.content || "")
      .replace(/\s+/g, " ")
      .trim() || (t.adjuntos && t.adjuntos[0] ? "📎 " + t.adjuntos[0].nombre : "Conversación")
  ).slice(0, 60);
}
const tieneAlgo = (e) => !!(e.content || (e.adjuntos && e.adjuntos.length) || (e.cmds && e.cmds.length));
function guardarConversacion(e = {}) {
  const t = historial.filter((e) => tieneAlgo(e) && !e.error).map(mensajeParaGuardar);
  if (!t.length) return (e.silencio || estadoConv("No hay nada que guardar todavía.", !0), !1);
  const o = convs.findIndex((e) => e.id === convId);
  if (e.siCambio && firmaConv(t) === Nube.firma) {
    if (o >= 0) return !1;
    if (convsBorradas()[convId]) return !1;
  }
  const a = { id: convId, titulo: tituloConv(t), fecha: new Date().toISOString(), modelo: S.modelo, mensajes: t };
  (o >= 0 ? (convs[o] = a) : convs.unshift(a), (Nube.firma = firmaConv(t)));
  const n = almacen.set("cece_convs", convs);
  return (
    e.silencio ||
      (n && almacen.ok
        ? estadoConv("✓ Conversación guardada.")
        : (descargar(
            `cece-conversacion-${sello()}.json`,
            JSON.stringify({ app: "Cece AI", version: 2, conversaciones: [a] }, null, 2),
            "application/json",
          ),
          estadoConv("Guardada y descargada como archivo.")),
      Nube.programar(3e3)),
    pintarConvs(),
    !0
  );
}
function pintarConvs() {
  const e = norm($("buscarConv").value.trim()),
    t = convs.filter((t) => !e || norm(t.titulo).includes(e) || t.mensajes.some((t) => norm(t.content).includes(e))),
    o = $("convList");
  t.length
    ? (o.innerHTML = t
        .map((e) => {
          const t = new Date(e.fecha);
          return `<div class="conv-row" data-id="${esc(e.id)}"><button class="conv-load" title="${esc(e.titulo)}">${esc(e.titulo)} · <span style="color:var(--text-dim)">${t.toLocaleDateString("es-ES")}</span></button><button class="conv-del" title="Borrar" aria-label="Borrar">✕</button></div>`;
        })
        .join(""))
    : (o.innerHTML = `<div class="conv-vacio">${convs.length ? "Nada coincide con la búsqueda." : "Aún no hay conversaciones guardadas."}</div>`);
}
function cargarConversacion(e) {
  const t = convs.find((t) => t.id === e);
  t &&
    (detener(),
    (Voz.liveHist = []),
    (historial = copiaMensajes(t.mensajes)),
    (convId = t.id),
    (Nube.firma = firmaConv(historial)),
    t.modelo && Object.hasOwn(CECE_MAP, t.modelo) && (elegirNivel(t.modelo, !0), aplicarModoCode()),
    pintarHistorial(),
    guardarActual(),
    cerrarAjustes());
}
function importar(e) {
  if (e.size > 20971520) return void estadoConv("Ese archivo es demasiado grande (más de 20 MB).", !0);
  const t = new FileReader();
  ((t.onload = () => {
    try {
      const e = JSON.parse(t.result);
      let o = [];
      if (
        (Array.isArray(e)
          ? (o = e)
          : Array.isArray(e.conversaciones)
            ? (o = e.conversaciones)
            : Array.isArray(e.chatHistory)
              ? (o = [
                  {
                    id: uid(),
                    titulo: tituloConv(e.chatHistory),
                    fecha: new Date().toISOString(),
                    mensajes: e.chatHistory,
                  },
                ])
              : Array.isArray(e.mensajes) && (o = [e]),
        (o = normalizarConvs(
          o
            .filter((e) => e && "object" == typeof e && Array.isArray(e.mensajes))
            .map((e) => ({
              ...e,
              id: String(e.id || uid()),
              titulo: String(e.titulo || tituloConv(e.mensajes.filter((e) => e && "string" == typeof e.content))),
              fecha:
                "string" != typeof e.fecha || Number.isNaN(Date.parse(e.fecha)) ? new Date().toISOString() : e.fecha,
            })),
        )),
        (o = o.filter((e) => e.mensajes.length)),
        !o.length)
      )
        throw new Error("sin conversaciones");
      for (const e of o) {
        const t = convs.findIndex((t) => t.id === e.id);
        t >= 0 ? (convs[t] = e) : convs.unshift(e);
      }
      Nube.programar(3e3);
      const a = almacen.set("cece_convs", convs);
      (pintarConvs(),
        a
          ? estadoConv(`✓ ${o.length} conversación(es) importada(s).`)
          : estadoConv(
              `${o.length} importada(s) solo para esta sesión: no caben en el navegador. Borra o exporta conversaciones antiguas.`,
              !0,
            ));
    } catch (e) {
      estadoConv("Ese archivo no es una exportación de Cece AI.", !0);
    }
  }),
    t.readAsText(e));
}
function exportarMd() {
  const e = historial.filter(tieneAlgo);
  if (!e.length) return void estadoConv("La conversación está vacía.", !0);
  const adj = (e) => ((e.adjuntos || []).length ? "\n\n" + e.adjuntos.map((e) => `📎 _${e.nombre}_`).join(" · ") : ""),
    t =
      `# ${tituloConv(e)}\n\n_Cece AI · ${new Date().toLocaleString("es-ES")}_\n\n` +
      e
        .map(
          (e) =>
            `## ${"user" === e.role ? "🧑 Tú" : "🤖 Cece AI" + (e.via ? ` (${e.via})` : "")}\n\n${"user" === e.role && "string" == typeof e.mostrar ? e.mostrar : e.content}${adj(e)}`,
        )
        .join("\n\n");
  descargar(`cece-conversacion-${sello()}.md`, t, "text/markdown");
}
function atraparFoco(e, t) {
  if ("Tab" !== t.key) return;
  const o = [...e.querySelectorAll('button, select, input, textarea, a[href], [tabindex]:not([tabindex="-1"])')].filter(
    (e) => !e.disabled && e.getClientRects().length,
  );
  if (!o.length) return;
  const a = o[0],
    n = o[o.length - 1];
  !t.shiftKey || (document.activeElement !== a && e.contains(document.activeElement))
    ? t.shiftKey ||
      (document.activeElement !== n && e.contains(document.activeElement)) ||
      (t.preventDefault(), a.focus())
    : (t.preventDefault(), n.focus());
}
let _focoAjustes = null;
const ajustesAbiertos = () => $("settingsOverlay").classList.contains("open");
function abrirAjustes() {
  (ajustesAbiertos() || (_focoAjustes = document.activeElement),
    $("settingsOverlay").classList.add("open"),
    pintarConvs(),
    $("closeSettings").focus());
}
function cerrarAjustes() {
  if (!ajustesAbiertos()) return;
  $("settingsOverlay").classList.remove("open");
  const e = _focoAjustes && document.contains(_focoAjustes) ? _focoAjustes : $("settingsBtn");
  ((_focoAjustes = null), e.focus());
}
function conectarNavAjustes() {
  const e = $("ajustesNav");
  if (!e) return;
  const t = [...document.querySelectorAll(".settings-body h3")].find((e) =>
    /^Conversaciones/.test(e.textContent.trim()),
  );
  (t && !t.id && (t.id = "secConvs"),
    e.addEventListener("click", (e) => {
      const t = e.target.closest("[data-ir]"),
        o = t && $(t.dataset.ir);
      o &&
        (o.scrollIntoView({ behavior: S.animaciones ? "smooth" : "auto", block: "start" }),
        (o.tabIndex = -1),
        o.focus({ preventScroll: !0 }));
    }));
}
function refrescarTodo() {
  (actualizarTitulosNivel(), Voz.refrescarEtiquetas(), pintarVoces());
}
function autoAlto() {
  const e = $("userInput");
  ((e.style.height = "auto"), (e.style.height = Math.min(e.scrollHeight, 180) + "px"));
}
function conectarAjustes() {
  ($("modelPillBtn").addEventListener("click", (e) => {
    (e.stopPropagation(),
      abrirMenu(),
      0 === e.detail &&
        $("modelDropdown").classList.contains("open") &&
        (itemsNivel().find((e) => e.dataset.model === S.modelo) || itemsNivel()[0]).focus());
  }),
    $("modelDropdown").addEventListener("click", (e) => {
      const t = e.target.closest(".dropdown-item[data-model]");
      t && (elegirNivel(t.dataset.model), abrirMenu(!1), 0 === e.detail && $("modelPillBtn").focus());
    }),
    document.addEventListener("click", (e) => {
      e.target.closest(".model-selector-wrap") || abrirMenu(!1);
    }),
    $("settingsBtn").addEventListener("click", abrirAjustes),
    $("closeSettings").addEventListener("click", cerrarAjustes),
    cerrarAlPulsarFuera($("settingsOverlay"), cerrarAjustes),
    $("settingsOverlay").addEventListener("keydown", (e) =>
      atraparFoco($("settingsOverlay").querySelector(".settings-panel"), e),
    ),
    $("modelDropdown").addEventListener("keydown", (e) => {
      const t = itemsNivel().filter((e) => e.getClientRects().length),
        o = t.indexOf(document.activeElement);
      "ArrowDown" === e.key || "ArrowUp" === e.key
        ? (e.preventDefault(), t[(o + ("ArrowDown" === e.key ? 1 : -1) + t.length) % t.length].focus())
        : "Escape" === e.key && (e.preventDefault(), e.stopPropagation(), abrirMenu(!1), $("modelPillBtn").focus());
    }),
    document.querySelector(".model-selector-wrap").addEventListener("focusout", (e) => {
      (e.relatedTarget && e.currentTarget.contains(e.relatedTarget)) || abrirMenu(!1);
    }),
    $("clearBtn").addEventListener("click", () => {
      (detener(),
        Voz.detener(),
        (Voz.liveHist = []),
        (historial = []),
        (convId = uid()),
        (Nube.firma = "[]"),
        guardarActual(),
        pintarHistorial(),
        Red.pintar(),
        $("userInput").focus());
    }),
    $("swWeb").addEventListener("change", (e) => {
      ((S.web = e.target.checked), guardarAjustes(), Voz.refrescarEtiquetas());
    }),
    $("esfuerzoRow").addEventListener("click", (e) => {
      const t = e.target.closest(".esf-btn");
      t && ((S.esf = t.dataset.esf), guardarAjustes(), pintarEsfuerzo());
    }),
    $("swFusion").addEventListener("change", (e) => {
      ((S.fusion = e.target.checked), guardarAjustes());
    }),
    $("swMaxi").addEventListener("change", (e) => {
      ((S.maxi = e.target.checked), guardarAjustes(), pintarPro());
    }),
    $("swRelevo").addEventListener("change", (e) => {
      ((S.relevo = e.target.checked), guardarAjustes(), pintarPro());
    }));
  for (const e of REPARTO)
    ($("rep" + e).addEventListener("input", (t) => repartir(e, t.target.value)),
      $("pct" + e).addEventListener("change", (t) => repartir(e, t.target.value)));
  ($("presetVel").addEventListener("click", (e) => {
    const t = e.target.closest(".preset-btn");
    t && ponerVelocidad(t.dataset.vel);
  }),
    $("speedSlider").addEventListener("input", (e) => ponerVelocidad(e.target.value)),
    $("speedValue").addEventListener("change", (e) => ponerVelocidad(e.target.value)),
    document.querySelector(".emoji-estilos").addEventListener("click", (e) => {
      const t = e.target.closest(".emo-opt");
      t && ((S.emoji = t.dataset.estilo), guardarAjustes(), pintarEmojiOpciones(), aplicarEmojis());
    }),
    $("swPantalla").addEventListener("change", (e) => {
      ((S.pantalla = e.target.checked), guardarAjustes(), S.pantalla && pantallaCompleta(!0));
    }),
    $("elegirCarpeta").addEventListener("click", () => Codigo.elegir()),
    $("reconectarCarpeta").addEventListener("click", () => Codigo.reconectar()),
    $("zipBtn").addEventListener("click", () => {
      Codigo.archivos.length
        ? descargar(`cece-codigo-${sello()}.zip`, crearZip(Codigo.archivos))
        : toast("Todavía no hay código en esta sesión.");
    }),
    $("autoZipChk").addEventListener("change", (e) => {
      ((S.autoZip = e.target.checked), guardarAjustes());
    }),
    $("resetCarpetas").addEventListener("click", async () => {
      ((S.carpetas = {}),
        guardarAjustes(),
        pintarCarpetas(),
        (Codigo.raiz = null),
        (Codigo._pendiente = null),
        await idb("del", "raiz").catch(() => {}),
        ($("reconectarCarpeta").style.display = "none"),
        estadoCarpeta("", ""),
        Codigo.soporta || Codigo.cargar(),
        toast("Carpetas olvidadas."));
    }),
    $("swStream").addEventListener("change", (e) => {
      ((S.stream = e.target.checked), guardarAjustes());
    }),
    $("saveConvBtn").addEventListener("click", guardarConversacion),
    $("buscarConv").addEventListener("input", pintarConvs),
    $("convList").addEventListener("click", (e) => {
      const t = e.target.closest(".conv-row");
      if (t)
        if (e.target.closest(".conv-del")) {
          const e = convs.find((e) => e.id === t.dataset.id);
          e &&
            confirm(`¿Borrar «${e.titulo}»?`) &&
            ((convs = convs.filter((t) => t.id !== e.id)),
            almacen.set("cece_convs", convs),
            almacen.set("cece_borradas", {
              ...convsBorradas(),
              [e.id]: new Date(Math.max(Date.now(), (Date.parse(e.fecha) || 0) + 1)).toISOString(),
            }),
            e.id === convId && (Nube.firma = firmaConv(historial)),
            pintarConvs(),
            Nube.programar(3e3));
        } else cargarConversacion(t.dataset.id);
    }),
    $("exportBtn").addEventListener("click", () => {
      const e = historial.filter((e) => tieneAlgo(e) && !e.error).map(mensajeParaGuardar),
        t = [...convs];
      (e.length &&
        !t.some((e) => e.id === convId) &&
        t.unshift({
          id: convId,
          titulo: tituloConv(e),
          fecha: new Date().toISOString(),
          modelo: S.modelo,
          mensajes: e,
        }),
        t.length
          ? descargar(
              `cece-conversaciones-${sello()}.json`,
              JSON.stringify(
                { app: "Cece AI", version: 2, exportado: new Date().toISOString(), conversaciones: t },
                null,
                2,
              ),
              "application/json",
            )
          : estadoConv("No hay conversaciones que exportar.", !0));
    }),
    $("exportarMd").addEventListener("click", exportarMd),
    $("importBtn").addEventListener("click", () => $("importFile").click()),
    $("importFile").addEventListener("change", (e) => {
      (e.target.files[0] && importar(e.target.files[0]), (e.target.value = ""));
    }),
    $("imgMotor").addEventListener("change", (e) => {
      ((S.imgMotor = e.target.value), guardarAjustes());
    }),
    $("imgModeloOpenai").addEventListener("change", (e) => {
      ((S.imgModeloOpenai = e.target.value.trim() || DEF.imgModeloOpenai), guardarAjustes());
    }),
    $("imgModeBtn").addEventListener("click", (e) => {
      ((S.imgMode = !S.imgMode), guardarAjustes(), pintarModoImagen(), animarBoton(e.currentTarget));
    }),
    $("codeModeBtn").addEventListener("click", (e) => {
      ((S.codeMode = !S.codeMode),
        guardarAjustes(),
        aplicarModoCode(),
        animarBoton(e.currentTarget),
        toast(S.codeMode ? "</> Modo code: solo niveles de programación." : "Modo code desactivado."));
    }),
    $("maxiBtn").addEventListener("click", (e) => {
      ("cece-pro" !== S.modelo ? ((S.maxi = !0), elegirNivel("cece-pro", !0)) : (S.maxi = !S.maxi),
        guardarAjustes(),
        pintarPro(),
        animarBoton(e.currentTarget),
        toast(
          S.maxi ? `100%: Cece Pro con los ${PRO_PARTES.length} modelos al máximo.` : "Cece Pro con reparto normal.",
        ));
    }));
  const e = $("userInput");
  if (
    (e.addEventListener("input", autoAlto),
    e.addEventListener("keydown", (e) => {
      "Enter" !== e.key ||
        e.isComposing ||
        (("ctrl" === S.enviarCon ? e.ctrlKey || e.metaKey : !e.shiftKey) && (e.preventDefault(), enviar()));
    }),
    $("sendBtn").addEventListener("click", () => (generando ? detener() : enviar())),
    $("messages").addEventListener("click", (e) => {
      const t = e.target.closest(".copy-btn[data-acc]");
      if (!t) return;
      const o = t.closest(".code-wrap"),
        a = o.querySelector("pre").textContent;
      "copiar" === t.dataset.acc
        ? copiar(a, t)
        : Codigo.guardarBloque({ lang: o.dataset.lang, nombre: o.dataset.nombre || "", codigo: a }, o, !0);
    }),
    document.addEventListener("keydown", (e) => {
      (!e.ctrlKey ||
        e.shiftKey ||
        e.altKey ||
        ("i" !== e.key && "I" !== e.key) ||
        (e.preventDefault(), pantallaCompleta()),
        "Escape" === e.key &&
          ($("pluginModal") && $("pluginModal").classList.contains("active")
            ? cerrarEditorPlugin()
            : $("cifrarModal") && $("cifrarModal").classList.contains("active")
              ? cerrarCifrar()
              : ajustesLiveAbiertos()
                ? cerrarAjustesLive()
                : Voz.activo && "live" === Voz.modo
                  ? Voz.detener()
                  : ajustesAbiertos()
                    ? cerrarAjustes()
                    : abrirMenu(!1)));
    }),
    S.pantalla)
  ) {
    const entrar = (e) => {
      (e && e.ctrlKey && ("i" === e.key || "I" === e.key)) ||
        (pantallaCompleta(!0),
        document.removeEventListener("click", entrar, !0),
        document.removeEventListener("keydown", entrar, !0));
    };
    (document.addEventListener("click", entrar, !0), document.addEventListener("keydown", entrar, !0));
  }
}
function pintarModoImagen() {
  const e = $("imgModeBtn");
  (e.classList.toggle("img-on", S.imgMode),
    (e.innerHTML = emo(S.imgMode ? "🎨" : "💬")),
    aplicarEmojis(e),
    ($("userInput").placeholder = textoEntrada()));
}
// Lo que se lee en el cuadro de texto cuando está vacío (también al salir del modo micrófono)
const textoEntrada = () =>
  S.imgMode
    ? "Describe la imagen que quieres..."
    : matchMedia("(max-width: 400px)").matches
      ? "Escribe… (/ comandos)"
      : "Escribe tu mensaje... (/ para comandos)";
const TONOS = {
    profesional: "Usa un tono profesional y formal.",
    directo: "Ve al grano: sin rodeos, sin frases de cortesía ni resúmenes al final.",
    divertido: "Usa un tono desenfadado y con humor, sin que eso le quite claridad a la respuesta.",
  },
  IDIOMAS_RESP = {
    es: "español",
    en: "inglés",
    fr: "francés",
    de: "alemán",
    it: "italiano",
    pt: "portugués",
    ca: "catalán",
  };
function ajustesDeRespuesta() {
  const e = [];
  ("corta" === S.largo
    ? e.push("Responde de forma breve: lo esencial en pocas frases, salvo que te pidan más detalle.")
    : "detallada" === S.largo &&
      e.push("Responde de forma completa y detallada, con explicaciones y ejemplos cuando ayuden."),
    Object.hasOwn(TONOS, S.tono) && e.push(TONOS[S.tono]),
    Object.hasOwn(IDIOMAS_RESP, S.idiomaResp) &&
      e.push(`Responde siempre en ${IDIOMAS_RESP[S.idiomaResp]}, aunque te escriban en otro idioma.`));
  const t = String(S.instrucciones || "").trim();
  return (
    t &&
      e.push(
        "Lo que el usuario quiere que sepas de él o de cómo prefiere las respuestas (tenlo en cuenta siempre que no vaya contra lo anterior):\n" +
          t,
      ),
    e.join("\n")
  );
}
let _ctxSonido = null;
function sonidoFin(e) {
  if (S.sonido || e)
    try {
      const e = window.AudioContext || window.webkitAudioContext;
      if (!e) return;
      const t = _ctxSonido || (_ctxSonido = new e());
      "suspended" === t.state && t.resume().catch(() => {});
      const o = t.currentTime,
        a = t.createOscillator(),
        n = t.createGain();
      ((a.type = "sine"),
        a.frequency.setValueAtTime(880, o),
        a.frequency.setValueAtTime(1175, o + 0.09),
        n.gain.setValueAtTime(1e-4, o),
        n.gain.exponentialRampToValueAtTime(0.12, o + 0.02),
        n.gain.exponentialRampToValueAtTime(1e-4, o + 0.32),
        a.connect(n),
        n.connect(t.destination),
        a.start(o),
        a.stop(o + 0.35),
        (sonidoFin.veces = (sonidoFin.veces || 0) + 1));
    } catch (e) {}
}
function ordenarAjustes() {
  const e = [...document.querySelectorAll(".settings-body h3")].find((e) =>
      /^Conversaciones/.test(e.textContent.trim()),
    ),
    t = $("convStatus"),
    o = $("bloquePro");
  if (!e || !t || !o || e.parentNode !== t.parentNode || o.parentNode !== e.parentNode) return;
  let a = e;
  for (let t = e.previousSibling; t; t = t.previousSibling)
    if (1 === t.nodeType) {
      t.matches("hr.divider") && (a = t);
      break;
    }
  const n = document.createDocumentFragment();
  for (let e = a; e;) {
    const o = e.nextSibling;
    if ((n.appendChild(e), e === t)) break;
    e = o;
  }
  o.after(n);
}
function pintarRespuestas() {
  $("optLargo") &&
    (($("optLargo").value = S.largo),
    ($("optTono").value = S.tono),
    ($("optIdioma").value = S.idiomaResp),
    ($("optInstrucciones").value = S.instrucciones),
    ($("optEnviar").value = S.enviarCon),
    ($("optRazon").value = S.razon),
    ($("swSonido").checked = S.sonido),
    $("userInput").setAttribute("aria-keyshortcuts", "ctrl" === S.enviarCon ? "Control+Enter" : "Enter"));
}
function conectarRespuestas() {
  if (!$("optLargo")) return;
  const e = { optLargo: "largo", optTono: "tono", optIdioma: "idiomaResp", optEnviar: "enviarCon", optRazon: "razon" };
  for (const [t, o] of Object.entries(e))
    $(t).addEventListener("change", (e) => {
      (VALIDOS[o].includes(e.target.value) && ((S[o] = e.target.value), guardarAjustes()), pintarRespuestas());
    });
  let t = null;
  const o = $("optInstrucciones");
  (o.addEventListener("input", () => {
    ((S.instrucciones = o.value.slice(0, 1500)), clearTimeout(t), (t = setTimeout(guardarAjustes, 400)));
  }),
    o.addEventListener("change", () => {
      (clearTimeout(t), guardarAjustes());
    }),
    $("swSonido").addEventListener("change", (e) => {
      ((S.sonido = e.target.checked), guardarAjustes(), S.sonido && sonidoFin(!0));
    }));
}
const TEMAS = {
    auto: { nombre: "Automático", claro: null, muestra: ["#000000", "#f6f5fa", "#ff3f9e"] },
    neon: { nombre: "Neón", claro: !1, muestra: ["#040008", "#1d0b33", "#ff2bd6"] },
    oscuro: { nombre: "Oscuro", claro: !1, muestra: ["#000000", "#17151b", "#ff3f9e"] },
    medianoche: { nombre: "Medianoche", claro: !1, muestra: ["#000000", "#0d0d12", "#5b8cff"] },
    nord: { nombre: "Nord", claro: !1, muestra: ["#2e3440", "#434c5e", "#88c0d0"] },
    dracula: { nombre: "Drácula", claro: !1, muestra: ["#21222c", "#343746", "#ff79c6"] },
    oceano: { nombre: "Océano", claro: !1, muestra: ["#06131f", "#10263b", "#2ec4b6"] },
    bosque: { nombre: "Bosque", claro: !1, muestra: ["#0b140e", "#182a1f", "#7ed957"] },
    claro: { nombre: "Claro", claro: !0, muestra: ["#f6f5fa", "#ffffff", "#d6246e"] },
    sepia: { nombre: "Sepia", claro: !0, muestra: ["#f4ecd8", "#fbf6e9", "#b5651d"] },
    contraste: { nombre: "Alto contraste", claro: !1, muestra: ["#000000", "#111111", "#ffff00"] },
  },
  ZOOM_LETRA = { pequena: 0.92, normal: 1, grande: 1.12, enorme: 1.28 },
  _mqClaro = (() => {
    try {
      return matchMedia("(prefers-color-scheme: light)");
    } catch (e) {
      return null;
    }
  })(),
  temaEfectivo = (e = S.tema) =>
    "auto" === e ? (_mqClaro && _mqClaro.matches ? "claro" : "oscuro") : Object.hasOwn(TEMAS, e) ? e : "oscuro";
function luminancia(e) {
  const t = /^#?([0-9a-f]{6})$/i.exec(String(e || ""));
  if (!t) return 0;
  const o = parseInt(t[1], 16),
    a = [o >> 16, (o >> 8) & 255, 255 & o].map((e) =>
      (e /= 255) <= 0.03928 ? e / 12.92 : ((e + 0.055) / 1.055) ** 2.4,
    );
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
const contraste = (e, t) => {
  const o = luminancia(e),
    a = luminancia(t);
  return (Math.max(o, a) + 0.05) / (Math.min(o, a) + 0.05);
};
function aplicarApariencia() {
  const e = document.documentElement,
    t = temaEfectivo();
  ((e.dataset.tema = t),
    (e.dataset.densidad = S.densidad),
    (e.dataset.ancho = S.ancho),
    e.style.setProperty("--zoom-chat", String(ZOOM_LETRA[S.letra] || 1)),
    S.acento
      ? (e.style.setProperty("--accent", S.acento), e.style.setProperty("--pink", S.acento))
      : (e.style.removeProperty("--accent"), e.style.removeProperty("--pink")));
  const o = getComputedStyle(e),
    sobre = (e) => (
      (e = String(e || "").trim()),
      /^#[0-9a-f]{6}$/i.test(e) && contraste(e, "#0a090c") >= contraste(e, "#ffffff") ? "#0a090c" : "#ffffff"
    );
  (e.style.setProperty("--sobre-acento", sobre(S.acento || o.getPropertyValue("--accent"))),
    e.style.setProperty("--sobre-morado", sobre(o.getPropertyValue("--purple"))),
    e.classList.toggle("sin-animaciones", !S.animaciones));
  let a = document.querySelector('meta[name="theme-color"]');
  (a || ((a = document.createElement("meta")), (a.name = "theme-color"), document.head.appendChild(a)),
    (a.content = (TEMAS[t] || TEMAS.oscuro).muestra[0]),
    document.querySelector("#modelDropdown .dropdown-item.sel") && refrescarColoresNivel());
}
function pintarApariencia() {
  const e = $("temasGrid");
  if (!e) return;
  e.children.length ||
    (e.innerHTML = Object.entries(TEMAS)
      .map(
        ([e, t]) =>
          `<button type="button" class="tema-opt" role="radio" data-tema="${e}" aria-checked="false" title="${esc(t.nombre)}"><span class="tema-prev" style="background:${t.muestra[0]}"><span style="background:${t.muestra[1]}"></span><i style="background:${t.muestra[2]}"></i></span><span class="tema-nom">${esc(t.nombre)}</span></button>`,
      )
      .join(""));
  for (const t of e.querySelectorAll(".tema-opt")) {
    const e = t.dataset.tema === S.tema;
    (t.classList.toggle("on", e), t.setAttribute("aria-checked", e ? "true" : "false"), (t.tabIndex = e ? 0 : -1));
  }
  const t = TEMAS[temaEfectivo()] || TEMAS.oscuro;
  (($("acentoColor").value = S.acento || t.muestra[2]),
    ($("acentoReset").disabled = !S.acento),
    ($("letraSel").value = S.letra),
    ($("densidadSel").value = S.densidad),
    ($("anchoSel").value = S.ancho),
    ($("swAnim").checked = S.animaciones));
}
function cambiarApariencia(e, t) {
  ((S[e] = t), guardarAjustes(), aplicarApariencia(), pintarApariencia(), void 0 !== Nube && Nube.marcar("apariencia"));
}
function conectarApariencia() {
  const e = $("temasGrid");
  if (
    (e.addEventListener("click", (e) => {
      const t = e.target.closest(".tema-opt");
      t && cambiarApariencia("tema", t.dataset.tema);
    }),
    e.addEventListener("keydown", (t) => {
      const o = [...e.querySelectorAll(".tema-opt")],
        a = o.indexOf(document.activeElement);
      if (a < 0) return;
      const n =
        "ArrowRight" === t.key || "ArrowDown" === t.key ? 1 : "ArrowLeft" === t.key || "ArrowUp" === t.key ? -1 : 0;
      if (!n) return;
      t.preventDefault();
      const r = o[(a + n + o.length) % o.length];
      (cambiarApariencia("tema", r.dataset.tema), r.focus());
    }),
    $("acentoColor").addEventListener("input", (e) => {
      FORMAS.acento.test(e.target.value) && cambiarApariencia("acento", e.target.value.toLowerCase());
    }),
    $("acentoReset").addEventListener("click", () => cambiarApariencia("acento", "")),
    $("letraSel").addEventListener("change", (e) => {
      VALIDOS.letra.includes(e.target.value) && cambiarApariencia("letra", e.target.value);
    }),
    $("densidadSel").addEventListener("change", (e) => {
      VALIDOS.densidad.includes(e.target.value) && cambiarApariencia("densidad", e.target.value);
    }),
    $("anchoSel").addEventListener("change", (e) => {
      VALIDOS.ancho.includes(e.target.value) && cambiarApariencia("ancho", e.target.value);
    }),
    $("swAnim").addEventListener("change", (e) => cambiarApariencia("animaciones", e.target.checked)),
    _mqClaro)
  )
    try {
      _mqClaro.addEventListener("change", () => {
        "auto" === S.tema && (aplicarApariencia(), pintarApariencia());
      });
    } catch (e) {}
}
const AJUSTES_APARIENCIA = ["tema", "acento", "letra", "densidad", "ancho", "animaciones"],
  tiempoConv = (e) => Date.parse(e && e.fecha) || 0,
  huellasConv = (e) => (e.mensajes || []).filter((e) => e && !e.error).map((e) => JSON.stringify([e.role, e.content])),
  esPrefijo = (e, t) => e.length <= t.length && e.every((e, o) => e === t[o]),
  hash36 = (e) => {
    let t = 2166136261;
    for (let o = 0; o < e.length; o++) ((t ^= e.charCodeAt(o)), (t = Math.imul(t, 16777619)));
    return (t >>> 0).toString(36);
  },
  masReciente = (e, t) => (e ? (t && (Date.parse(t.t) || 0) > (Date.parse(e.t) || 0) ? t : e) : t || null);
function fusionarNube(e, t, o = Date.now()) {
  ((e = e || {}), (t = t || {}));
  const a = {};
  for (const o of [t.borradas, e.borradas])
    if (o && "object" == typeof o)
      for (const [e, t] of Object.entries(o))
        "string" != typeof t ||
          Number.isNaN(Date.parse(t)) ||
          (a[e] && !(Date.parse(t) > Date.parse(a[e]))) ||
          (a[e] = t);
  for (const e of Object.keys(a)) o - Date.parse(a[e]) > 15552e6 && delete a[e];
  const n = new Map(),
    r = [];
  for (const o of [...(Array.isArray(t.convs) ? t.convs : []), ...(Array.isArray(e.convs) ? e.convs : [])]) {
    if (!o || "string" != typeof o.id || !Array.isArray(o.mensajes)) continue;
    const e = n.get(o.id);
    if (!e) {
      n.set(o.id, o);
      continue;
    }
    const t = huellasConv(e),
      a = huellasConv(o);
    if (esPrefijo(t, a) || esPrefijo(a, t)) {
      (a.length > t.length || (a.length === t.length && tiempoConv(o) >= tiempoConv(e))) && n.set(o.id, o);
      continue;
    }
    const [i, s] = tiempoConv(o) >= tiempoConv(e) ? [o, e] : [e, o];
    (n.set(o.id, i),
      r.push({
        ...s,
        id: o.id.slice(0, 50) + "~" + hash36(JSON.stringify(huellasConv(s))),
        titulo:
          String(s.titulo || "Conversación").replace(/ \(copia de otro equipo\)$/, "") + " (copia de otro equipo)",
      }));
  }
  for (const e of r) n.has(e.id) || n.set(e.id, e);

  return {
    v: 1,
    convs: [...n.values()]
      .filter((e) => !(a[e.id] && Date.parse(a[e.id]) >= tiempoConv(e)))
      .sort((e, t) => tiempoConv(t) - tiempoConv(e)),
    borradas: a,
    plugins: masReciente(e.plugins, t.plugins),
    apariencia: masReciente(e.apariencia, t.apariencia),
  };
}
const firmaConv = (e) =>
    JSON.stringify(
      (e || [])
        .filter((e) => e && !e.error)
        .map((e) => [e.role, e.content, e.local ? 1 : 0, (e.adjuntos || []).map((e) => e && e.id)]),
    ),
  Nube = {
    ARCHIVO: "cece-ai-nube.json",
    AAD: "cece-ai-nube-v1",
    LIMITE: 9961472,
    ocupada: !1,
    _t: null,
    _llave: null,
    firma: "[]",
    lista: () => !(!claveDe("github") || !claveDe("nube")),
    meta() {
      const e = almacen.get("cece_nube_meta", {});
      return e && "object" == typeof e && !Array.isArray(e) ? e : {};
    },
    ponerMeta(e) {
      almacen.set("cece_nube_meta", { ...this.meta(), ...e });
    },
    marcar(e) {
      (("plugins" !== e && "apariencia" !== e) || this.ponerMeta({ [e]: new Date().toISOString() }), this.programar());
    },
    programar(e = 2e4) {
      S.nubeAuto &&
        this.lista() &&
        !Boveda.necesitaDesbloqueo() &&
        (clearTimeout(this._t), (this._t = setTimeout(() => this.sincronizar({ silencio: !0 }), e)));
    },
    alCambiarClaves() {
      (pintarNube(), S.nubeAuto && this.lista() && this.programar(2500));
    },
    async gh(e, t = {}) {
      const o = {
        method: t.method || "GET",
        cache: "no-store",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: "Bearer " + claveDe("github"),
          "X-GitHub-Api-Version": "2022-11-28",
          ...(t.body ? { "Content-Type": "application/json" } : {}),
        },
        ...(t.body ? { body: JSON.stringify(t.body) } : {}),
      };
      let a;
      try {
        a = await fetchConTiempo("github", (t.base || "https://api.github.com") + e, o, null, 3e4);
      } catch (e) {
        if (e instanceof ErrorApi) throw e;
        throw new ErrorApi("No se pudo conectar con GitHub.", { prov: "github", red: !0, corto: "sin conexión" });
      }
      if (401 === a.status)
        throw new ErrorApi("El token de GitHub no es válido o caducó.", {
          prov: "github",
          status: 401,
          corto: "clave no válida",
        });
      if (
        403 === a.status &&
        /rate limit/i.test(
          await a
            .clone()
            .text()
            .catch(() => ""),
        )
      )
        throw new ErrorApi("GitHub: límite de peticiones alcanzado; prueba en un rato.", {
          prov: "github",
          status: 403,
          corto: "límite de uso",
        });
      return a;
    },
    async buscarGist() {
      const leer = async (e) => {
        const t = await this.gh("/gists/" + encodeURIComponent(e));
        if (404 === t.status) return null;
        if (!t.ok) throw new ErrorApi(`GitHub devolvió un error ${t.status}.`, { prov: "github", status: t.status });
        const o = await t.json(),
          a = o.files && o.files[this.ARCHIVO];
        if (!a) return null;
        let n = a.content;
        if (a.truncated && a.raw_url && /^https:\/\/gist\.githubusercontent\.com\//.test(a.raw_url)) {
          const e = await fetchConTiempo("github", a.raw_url, { method: "GET" }, null, 6e4);
          if (!e.ok)
            throw new ErrorApi("No se pudo descargar el historial completo de GitHub.", {
              prov: "github",
              status: e.status,
            });
          n = await e.text();
        }
        return {
          id: o.id,
          contenido: n,
          version:
            Array.isArray(o.history) && o.history[0] && "string" == typeof o.history[0].version
              ? o.history[0].version
              : "",
        };
      };
      if (S.nubeGist) {
        const e = await leer(S.nubeGist);
        if (e) return e;
      }
      for (let e = 1; e <= 3; e++) {
        const t = await this.gh(`/gists?per_page=100&page=${e}`);
        if (!t.ok)
          throw new ErrorApi(
            403 === t.status || 404 === t.status
              ? "El token de GitHub no tiene el permiso «gist»."
              : `GitHub devolvió un error ${t.status}.`,
            { prov: "github", status: t.status },
          );
        const o = await t.json(),
          a = Array.isArray(o) && o.find((e) => e && e.files && e.files[this.ARCHIVO]);
        if (a) return leer(a.id);
        if (!Array.isArray(o) || o.length < 100) break;
      }
      return null;
    },
    async versionGist(e) {
      try {
        const t = await this.gh(`/gists/${encodeURIComponent(e)}/commits?per_page=1`);
        if (!t.ok) return "";
        const o = await t.json();
        return Array.isArray(o) && o[0] && "string" == typeof o[0].version ? o[0].version : "";
      } catch (e) {
        return "";
      }
    },
    huella: async (e) =>
      aBase64(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("cece-nube|" + e)))),
    async descifrar(e) {
      let t;
      try {
        t = JSON.parse(e);
      } catch (e) {
        throw new ErrorApi("El archivo de la nube está dañado.", { prov: "github", corto: "dañado" });
      }
      const o = Cifra.partes(t && t.datos);
      if (!o) throw new ErrorApi("El archivo de la nube está dañado.", { prov: "github", corto: "dañado" });
      const a = claveDe("nube"),
        n = await this.huella(a);
      let r;
      (this._llave && this._llave.id === o.id && this._llave.huella === n && this._llave.vueltas === o.vueltas) ||
        (this._llave = {
          id: o.id,
          sal: o.sal,
          vueltas: o.vueltas,
          huella: n,
          llave: await Cifra.derivar(a, o.sal, o.vueltas),
        });
      try {
        r = await Cifra.descifrar(t.datos, this._llave.llave, this.AAD);
      } catch (e) {
        throw (
          (this._llave = null),
          new ErrorApi("Tu frase de la nube no es la misma con la que se cifró el historial.", {
            prov: "github",
            corto: "frase distinta",
          })
        );
      }
      return JSON.parse(r);
    },
    async cifrar(e) {
      const t = claveDe("nube"),
        o = await this.huella(t);
      if (!this._llave || this._llave.huella !== o) {
        const e = crypto.getRandomValues(new Uint8Array(16));
        this._llave = { id: aBase64(e), sal: e, vueltas: Cifra.VUELTAS, huella: o, llave: await Cifra.derivar(t, e) };
      }
      return (
        await Cifra.cifrar(JSON.stringify(e), t, this.AAD, {
          comprimir: !0,
          llave: this._llave.llave,
          sal: this._llave.sal,
          vueltas: this._llave.vueltas,
        })
      ).texto;
    },
    datosLocales() {
      const e = this.meta(),
        t = Object.fromEntries(AJUSTES_APARIENCIA.map((e) => [e, S[e]]));
      return {
        convs: convs.map((e) => ({ ...e, mensajes: e.mensajes.map(mensajeParaGuardar) })),
        borradas: convsBorradas(),
        plugins: { lista: Plugins.propios, off: S.pluginsOff, t: e.plugins || "1970-01-01T00:00:00.000Z" },
        apariencia: { ...t, t: e.apariencia || "1970-01-01T00:00:00.000Z" },
      };
    },
    aplicar(e) {
      const t = this.meta(),
        o = JSON.stringify(e);
      ((e = fusionarNube(this.datosLocales(), e)),
        JSON.stringify(e) !== o && this.programar(3e3),
        (convs = normalizarConvs(e.convs)),
        almacen.set("cece_convs", convs),
        almacen.set("cece_borradas", e.borradas || {}),
        ajustesAbiertos() && pintarConvs());
      const a = convs.find((e) => e.id === convId);
      a &&
        !generando &&
        firmaConv(historial) === this.firma &&
        firmaConv(a.mensajes) !== this.firma &&
        ((historial = copiaMensajes(a.mensajes)),
        (this.firma = firmaConv(historial)),
        pintarHistorial(),
        guardarActual(),
        toast("☁️ Esta conversación se actualizó desde otro equipo.", "", 4e3));
      const n = e.plugins && Date.parse(e.plugins.t),
        r = e.apariencia && Date.parse(e.apariencia.t);
      if (n && n > (Date.parse(t.plugins) || 0)) {
        const o = new Set();
        ((Plugins.propios = (Array.isArray(e.plugins.lista) ? e.plugins.lista : [])
          .map((e) => validarPlugin(e, !0))
          .filter((e) => e.ok && !o.has(e.plugin.id) && o.add(e.plugin.id))
          .map((e) => e.plugin)),
          (S.pluginsOff = Array.isArray(e.plugins.off)
            ? e.plugins.off.filter((e) => "string" == typeof e && e.length <= 40).slice(0, 200)
            : []),
          almacen.set("cece_plugins", Plugins.propios),
          guardarAjustes(),
          Plugins.registrar(),
          pintarPlugins(),
          (t.plugins = e.plugins.t));
      }
      if (r && r > (Date.parse(t.apariencia) || 0)) {
        const o = leerAjustes({
          ...S,
          ...Object.fromEntries(
            AJUSTES_APARIENCIA.filter((t) => Object.hasOwn(e.apariencia, t)).map((t) => [t, e.apariencia[t]]),
          ),
        });
        for (const e of AJUSTES_APARIENCIA) S[e] = o[e];
        (guardarAjustes(), aplicarApariencia(), pintarApariencia(), (t.apariencia = e.apariencia.t));
      }
      this.ponerMeta({ plugins: t.plugins, apariencia: t.apariencia });
    },
    async ronda(e) {
      const t = await this.buscarGist(),
        o = t && t.contenido ? await this.descifrar(t.contenido) : null,
        a = fusionarNube(this.datosLocales(), o),
        n = JSON.stringify({
          app: "Cece AI",
          v: 1,
          aviso: "Historial cifrado de Cece AI. Sin la frase secreta no se puede leer.",
          datos: await this.cifrar(a),
        });
      if (n.length > this.LIMITE)
        throw new ErrorApi("El historial cifrado pasa de 9,5 MB: exporta y borra conversaciones antiguas.", {
          prov: "github",
          corto: "demasiado grande",
        });
      if (o && JSON.stringify(fusionarNube({}, o)) === JSON.stringify(a))
        t && S.nubeGist !== t.id && FORMAS.nubeGist.test(t.id) && ((S.nubeGist = t.id), guardarAjustes());
      else {
        if (e && t && t.version && (await this.versionGist(t.id)) !== t.version) return null;
        const o = { files: { [this.ARCHIVO]: { content: n } } },
          a = t
            ? await this.gh("/gists/" + encodeURIComponent(t.id), { method: "PATCH", body: o })
            : await this.gh("/gists", {
                method: "POST",
                body: {
                  ...o,
                  public: !1,
                  description: "Cece AI — historial cifrado (sin la frase secreta no se puede leer)",
                },
              });
        if (!a.ok)
          throw new ErrorApi(
            403 === a.status || 404 === a.status
              ? "El token de GitHub no tiene el permiso «gist»."
              : `GitHub no guardó el historial (error ${a.status}).`,
            { prov: "github", status: a.status },
          );
        const r = await a.json().catch(() => ({}));
        r && "string" == typeof r.id && FORMAS.nubeGist.test(r.id) && ((S.nubeGist = r.id), guardarAjustes());
      }
      return a;
    },
    async sincronizar({ silencio: e = !1 } = {}) {
      if (this.ocupada) return !1;
      const fallo = (t) => (this.ponerMeta({ error: t }), pintarNube(), e || toast("☁️ " + t, "mal", 7e3), !1);
      if (Boveda.necesitaDesbloqueo()) return fallo("Desbloquea primero tus claves (🔐 Seguridad).");
      if (!this.lista())
        return fallo("Falta el token de GitHub (nube_token) o la frase secreta (nube) en el bloque de configuración.");
      if (Red.sinRed()) return fallo("Sin conexión a internet.");
      if (claveDe("nube").length < 12)
        return fallo("Tu frase de la nube es demasiado corta: usa al menos 12 caracteres.");
      ((this.ocupada = !0), pintarNube());
      try {
        guardarConversacion({ silencio: !0, siCambio: !0 });
        let t = null;
        for (let e = 0; !t; e++) t = await this.ronda(e < 2);
        return (
          this.aplicar(t),
          this.ponerMeta({ ultima: new Date().toISOString(), error: "" }),
          e || toast(`☁️ Sincronizado: ${convs.length} conversación(es).`, "ok"),
          !0
        );
      } catch (e) {
        return (e instanceof ErrorApi || console.error(e), fallo(e.message || String(e)));
      } finally {
        ((this.ocupada = !1), pintarNube());
      }
    },
  };
function pintarNube() {
  const e = $("nubeEstado");
  if (!e) return;
  const t = Nube.meta();
  $("swNubeAuto").checked = S.nubeAuto;
  let o,
    a = "";
  (Nube.ocupada
    ? (o = "⏳ Sincronizando…")
    : Boveda.necesitaDesbloqueo()
      ? ((o = "🔒 Desbloquea tus claves para usar la nube."), (a = "morado"))
      : Nube.lista()
        ? t.error
          ? ((o = "⚠️ " + t.error), (a = "naranja"))
          : t.ultima
            ? ((o = `✓ Última vez: ${new Date(t.ultima).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })} · cifrado de extremo a extremo`),
              (a = "verde"))
            : (o = "Lista para sincronizar. La primera vez crea un Gist privado en tu cuenta.")
        : (o =
            "Sin configurar: pon un token de GitHub con permiso «gist» (nube_token) y una frase secreta larga (nube) en el bloque de configuración del principio del archivo."),
    (e.className = "aviso" + (a ? " aviso-" + a : "")),
    (e.textContent = o),
    ($("nubeAhora").disabled = Nube.ocupada),
    ($("nubeOlvidar").style.display = S.nubeGist ? "" : "none"));
}
function conectarNube() {
  ($("swNubeAuto").addEventListener("change", (e) => {
    ((S.nubeAuto = e.target.checked), guardarAjustes(), pintarNube(), S.nubeAuto && Nube.programar(500));
  }),
    $("nubeAhora").addEventListener("click", () => Nube.sincronizar()),
    $("nubeOlvidar").addEventListener("click", () => {
      ((S.nubeGist = ""),
        guardarAjustes(),
        Nube.ponerMeta({ ultima: "", error: "" }),
        pintarNube(),
        toast("Este equipo ya no recuerda el Gist (lo que hay en GitHub sigue ahí)."));
    }),
    document.addEventListener("visibilitychange", () => {
      "hidden" === document.visibilityState &&
        Nube._t &&
        (clearTimeout(Nube._t), (Nube._t = null), Nube.sincronizar({ silencio: !0 }));
    }));
}
const PRUEBA_CONEXION = (() => {
    const bearer = (e) => () => ({ url: baseDe(e) + "/models", headers: { Authorization: "Bearer " + claveDe(e) } });
    return {
      anthropic: () => ({
        url: baseDe("anthropic") + "/models?limit=1000",
        headers: {
          "x-api-key": claveDe("anthropic"),
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
      }),
      openai: bearer("openai"),
      moonshot: bearer("moonshot"),
      deepseek: bearer("deepseek"),
      gemini: () => ({
        url: baseDe("gemini") + "/models?pageSize=1000",
        headers: { "x-goog-api-key": claveDe("gemini") },
      }),
      groq: bearer("groq"),
      elevenlabs: () => ({ url: baseDe("elevenlabs") + "/models", headers: { "xi-api-key": claveDe("elevenlabs") } }),
      github: () => ({
        url: baseDe("github") + "/user",
        headers: { Authorization: "Bearer " + claveDe("github"), Accept: "application/vnd.github+json" },
      }),
    };
  })(),
  NOMBRE_CONEXION = {
    anthropic: "Motor Enterprise",
    openai: "Motor Astra",
    moonshot: "Motor Max y Ultra Code",
    deepseek: "Motor Turbo",
    gemini: "Motor Argon",
    groq: "Motor Reserva",
    elevenlabs: "Voz Cece Natural",
    github: "☁️ Nube",
  };
function modelosQueUsa(e) {
  const t = new Map();
  for (const o of CECE)
    for (const a of o.motores || []) {
      const o = motorDeTabla(a);
      o.prov === e && o.modelo && t.set(o.modelo, etiquetaMotor(o));
    }
  return (
    "openai" === e && S.imgModeloOpenai && t.set(S.imgModeloOpenai, "Cece Imagen"),
    "elevenlabs" === e && t.set("eleven_multilingual_v2", "Voz Cece Natural"),
    t
  );
}
function idsDeModelos(e) {
  const t = Array.isArray(e) ? e : Array.isArray(e && e.data) ? e.data : Array.isArray(e && e.models) ? e.models : [];
  return new Set(
    t
      .map((e) => ("string" == typeof e ? e : e && (e.id || e.model_id || e.name)))
      .filter(Boolean)
      .map((e) => String(e).replace(/^models\//, "")),
  );
}
async function probarConexion(e) {
  const t = NOMBRE_CONEXION[e] || nombreProv(e);
  if (!claveDe(e))
    return {
      prov: e,
      nombre: t,
      estado: "sin",
      texto: `sin clave (${nombreEnBloque(e)}) en el bloque de configuración`,
    };
  const { url: o, headers: a } = PRUEBA_CONEXION[e]();
  let n;
  try {
    n = await fetchConTiempo(e, o, { method: "GET", headers: a }, null, 15e3);
  } catch (o) {
    return o instanceof ErrorApi && "tiempo agotado" === o.corto
      ? { prov: e, nombre: t, estado: "red", texto: "no responde (tiempo agotado)" }
      : { prov: e, nombre: t, estado: "red", texto: "no conecta" };
  }
  if (!n.ok) {
    const o = errorHttp(e, n.status, await leerDetalle(n), ""),
      a = {
        "clave no válida":
          `la clave (${nombreEnBloque(e)}) no es válida: revísala en el bloque de configuración` +
          ("gemini" === e
            ? " (si es antigua, crea una nueva: las de antes dejan de funcionar en septiembre de 2026)"
            : ""),
        "sin saldo": "la clave vale, pero la cuenta no tiene saldo o cuota",
        "límite de uso": "la clave vale, pero ahora mismo tiene el límite de uso alcanzado",
      }[o.corto];
    return {
      prov: e,
      nombre: t,
      estado: "límite de uso" === o.corto ? "aviso" : "mal",
      texto: a || o.message.split("\n")[0],
    };
  }
  let r = null;
  try {
    r = await n.json();
  } catch (e) {}
  if ("github" === e) return { prov: e, nombre: t, estado: "ok", texto: "conecta y el token vale" };
  const i = idsDeModelos(r),
    s = modelosQueUsa(e);
  i.size && Familias.guardar(e, i);
  const hay = (t) => i.has(t) || (Familias.es(e, t) && "" !== Familias.real(e, t)),
    c = [...s].filter(([t]) => i.size && Familias.es(e, t) && !hay(t)).map(([, e]) => e),
    l = [...s].filter(([t]) => i.size && !Familias.es(e, t) && !hay(t)).map(([, e]) => e),
    d = [...s].filter(([e]) => hay(e)).map(([, e]) => e),
    u = c.length
      ? ` · ${[...new Set(c)].join(", ")} aún no está abierto para tu cuenta: mientras tanto responde el siguiente motor`
      : "";
  return l.length
    ? {
        prov: e,
        nombre: t,
        estado: "aviso",
        texto:
          `conecta y la clave vale, pero en la lista de tu cuenta no aparece: ${[...new Set(l)].join(", ")}` +
          (d.length ? ` (sí: ${[...new Set(d)].join(", ")})` : "") +
          ". Puede que tu cuenta aún no tenga acceso a ese modelo." +
          u,
      }
    : {
        prov: e,
        nombre: t,
        estado: "ok",
        texto: "conecta y la clave vale" + (d.length ? " · modelos disponibles" : "") + u,
      };
}
async function probarConexiones() {
  const e = $("conexLista"),
    t = $("probarConexiones");
  if (e && !t.disabled)
    if (Boveda.necesitaDesbloqueo())
      e.innerHTML =
        '<div class="conex-fila mal">🔐 Las claves están cifradas: desbloquéalas primero (Configuración → 🔐 Seguridad).</div>';
    else {
      ((t.disabled = !0), (e.innerHTML = '<div class="conex-fila">⏳ Comprobando…</div>'));
      try {
        const t = Object.keys(PRUEBA_CONEXION),
          o = await Promise.all(
            t.map((e) =>
              probarConexion(e).catch((t) => ({
                prov: e,
                nombre: NOMBRE_CONEXION[e],
                estado: "mal",
                texto: t.message || "error",
              })),
            ),
          );
        if (S.localActivo)
          try {
            const e = await modelosLocales(),
              t = HUB.base && void 0 !== CeceHub ? ` (CeceHub ${CeceHub.descripcion()})` : "";
            o.push({
              prov: "local",
              nombre: "Cece Local",
              estado: e.includes(S.localModelo) ? "ok" : "aviso",
              texto:
                (e.includes(S.localModelo)
                  ? `conecta · usando ${S.localModelo}`
                  : `conecta, pero no tiene «${S.localModelo || "—"}»: pulsa «Buscar modelos» en Sin conexión`) + t,
            });
          } catch (e) {
            o.push({ prov: "local", nombre: "Cece Local", estado: "mal", texto: e.message });
          }
        const a = o.filter((e) => "sin" !== e.estado && "local" !== e.prov),
          n = a.length && a.every((e) => "red" === e.estado);
        for (const e of o)
          "red" === e.estado &&
            "local" !== e.prov &&
            (e.texto += n
              ? ": parece que no hay internet"
              : ": algo lo bloquea (antivirus, cortafuegos, red del colegio o del trabajo) o el servicio está caído");
        const r = { ok: "✅", aviso: "⚠️", mal: "❌", red: "📡", sin: "➖" };
        e.innerHTML = o
          .map(
            (e) =>
              `<div class="conex-fila ${e.estado}" data-prov="${esc(e.prov)}"><span class="conex-ico">${r[e.estado]}</span><span><b>${esc(e.nombre)}</b> <span class="det">${esc(e.texto)}</span></span></div>`,
          )
          .join("");
        const i = o.filter((e) => "ok" === e.estado).length,
          s = o.filter((e) => "sin" !== e.estado).length;
        return (
          s
            ? e.insertAdjacentHTML(
                "afterbegin",
                `<div class="conex-fila resumen"><b>${i} de ${s}</b> <span class="det">funcionan del todo.</span></div>`,
              )
            : e.insertAdjacentHTML(
                "afterbegin",
                '<div class="conex-fila mal">❌ No hay ninguna clave: rellena el bloque de configuración del principio del archivo.</div>',
              ),
          aplicarEmojis(e),
          o
        );
      } finally {
        t.disabled = !1;
      }
    }
}
function conectarConexiones() {
  const e = $("probarConexiones");
  e && e.addEventListener("click", () => probarConexiones());
}
const Red = {
  caida: !1,
  cadaMs: 15e3,
  sinRed() {
    return ("undefined" != typeof navigator && !1 === navigator.onLine) || this.caida;
  },
  async hayInternet(e = 6e3) {
    const t = [
        "https://api.github.com/",
        ...PROV_CHAT.filter((e) => !PROVEEDORES[e].local && claveDe(e)).map((e) => baseDe(e) + "/"),
      ].slice(0, 5),
      intento = (t) =>
        new Promise((o, a) => {
          const n = new AbortController(),
            r = setTimeout(() => {
              (n.abort(), a(new Error("tiempo")));
            }, e);
          fetch(t, { mode: "no-cors", cache: "no-store", credentials: "omit", signal: n.signal }).then(
            () => {
              (clearTimeout(r), o(!0));
            },
            (e) => {
              (clearTimeout(r), a(e));
            },
          );
        });
    try {
      return await Promise.any(t.map(intento));
    } catch (e) {
      return !1;
    }
  },
  marcarCaida() {
    this.caida ||
      ((this.caida = !0),
      this.pintar(),
      toast("📴 No llega nada a internet. Lo que pidas a la IA esperará y se enviará solo al volver.", "", 6e3),
      clearInterval(this._vigia),
      (this._vigia = setInterval(async () => {
        if (this.caida && !this._mirando) {
          this._mirando = !0;
          try {
            (await this.hayInternet()) && this.volvio();
          } finally {
            this._mirando = !1;
          }
        }
      }, this.cadaMs)));
  },
  volvio() {
    const e = this.caida;
    ((this.caida = !1),
      clearInterval(this._vigia),
      this.pintar(),
      this.pendientes()
        ? (toast("🌐 Conexión recuperada: enviando lo que estaba pendiente…", "ok"), enviarPendiente())
        : e && toast("🌐 Conexión recuperada.", "ok"));
  },
  hayLocalPara(e) {
    return ("cece-pro" === e ? PRO_PARTES.map((e) => e.id) : [e]).some((e) =>
      motoresDe(e).some((e) => sinInternetVale(e.prov)),
    );
  },
  pendientes: () => historial.filter((e) => "user" === e.role && e.pendiente).length,
  iniciar() {
    (window.addEventListener("offline", () => {
      (this.pintar(),
        toast("📴 Sin conexión. Cece sigue funcionando: tus mensajes esperarán a que vuelva internet.", "", 6e3));
    }),
      window.addEventListener("online", () => {
        ((this.caida = !1),
          clearInterval(this._vigia),
          this.pintar(),
          this.pendientes()
            ? (toast("🌐 Conexión recuperada: enviando lo que estaba pendiente…", "ok"), enviarPendiente())
            : toast("🌐 Conexión recuperada.", "ok"),
          Nube.programar(1500));
      }),
      this.pintar());
  },
  pintar() {
    let e = $("avisoRed");
    e ||
      ((e = document.createElement("div")),
      (e.id = "avisoRed"),
      (e.className = "aviso-red"),
      e.setAttribute("role", "status"),
      $("chatArea").prepend(e),
      e.addEventListener("click", (e) => {
        e.target.closest("#enviarPendiente") &&
          ((this.caida = !1), clearInterval(this._vigia), this.pintar(), enviarPendiente());
      }));
    const t = this.sinRed(),
      o = this.pendientes(),
      a = this.hayLocalPara(S.modelo);
    let n = "";
    (t
      ? (n =
          `📴 <b>Sin conexión${this.caida && !1 !== navigator.onLine ? " a internet" : ""}.</b> ${a ? `Respondo con ${HUB.base ? "CeceHub" : "la IA de tu ordenador"} (${esc(S.localModelo)}).` : "Funcionan los plugins (escribe <code>/</code>) y tus conversaciones; lo que pidas a la IA se enviará al volver internet."}${o ? ` · ⏳ ${o} pendiente(s)` : ""}` +
          (this.caida && !1 !== navigator.onLine
            ? ' <button type="button" class="mini-btn" id="enviarPendiente">↻ Probar ya</button>'
            : ""))
      : o &&
        (n = `⏳ Tienes ${o} mensaje(s) sin enviar. <button type="button" class="mini-btn" id="enviarPendiente">➤ Enviar ahora</button>`),
      (e.hidden = !n),
      (e.innerHTML = n));
  },
};
function ponerNivelLocal() {
  const e = document.querySelector("#modelDropdown .model-options");
  if (!e || e.querySelector('[data-model="cece-local"]')) return;
  const t = document.createElement("button");
  ((t.className = "dropdown-item"),
    (t.dataset.model = "cece-local"),
    (t.dataset.label = "CECE LOCAL"),
    t.setAttribute("role", "option"),
    t.setAttribute("aria-selected", "false"),
    (t.innerHTML =
      '<span class="item-row"><span class="dot-color" style="background:#b9c3d1"></span><span class="item-text"><span class="item-name">Cece Local</span><span class="item-sub">En tu ordenador · sin internet</span></span></span><span class="badge badge-local">📴 Offline</span>'),
    e.appendChild(t),
    aplicarEmojis(t));
}
async function modelosLocales(e) {
  if (
    void 0 === e &&
    S.hubActivo &&
    void 0 !== CeceHub &&
    !HUB.base &&
    (await CeceHub.buscar({ silencioso: !0 }), !HUB.base)
  )
    throw CeceHub.errorSinRuta();
  let t;
  void 0 === e && (e = baseDe("local"));
  const o = !!HUB.base && e === HUB.base,
    a = o ? { ...(HUB.token ? { Authorization: "Bearer " + HUB.token } : {}), ...HUB.extra } : {};
  try {
    t = await fetchConTiempo(
      "local",
      e + "/models",
      { method: "GET", headers: a },
      null,
      o && HUB.internet ? 15e3 : 6e3,
    );
  } catch (t) {
    if ((o && void 0 !== CeceHub && CeceHub.revisarPronto(), t instanceof ErrorApi)) throw t;
    if (o)
      throw new ErrorApi(`No conecto con CeceHub (${e}). ¿Sigue encendido? Cece lo vuelve a buscar sola.`, {
        prov: "local",
        red: !0,
        corto: "sin conexión",
      });
    throw new ErrorApi(
      `No conecto con ${e}. ¿Está abierto Ollama o LM Studio? Si lo está, falta permitir el navegador: en Ollama arráncalo con OLLAMA_ORIGINS=* y en LM Studio activa «Enable CORS».`,
      { prov: "local", red: !0, corto: "sin conexión" },
    );
  }
  if (!t.ok) throw errorHttp("local", t.status, await leerDetalle(t), "");
  let n;
  try {
    n = await t.json();
  } catch (e) {
    throw new ErrorApi("El servidor local no respondió con una lista de modelos.", {
      prov: "local",
      corto: "respuesta no válida",
    });
  }
  const r = (Array.isArray(n.data) ? n.data : Array.isArray(n.models) ? n.models : [])
    .map((e) => ("string" == typeof e ? e : e && (e.id || e.name || e.model)))
    .filter((e) => "string" == typeof e && FORMAS.localModelo.test(e) && e);
  return [...new Set(r)].sort();
}
function pintarOffline() {
  $("swLocal") &&
    (($("swLocal").checked = S.localActivo),
    ($("localAjustes").hidden = !S.localActivo),
    ($("localUrl").value = S.localUrl),
    ($("localModelo").value = S.localModelo),
    ($("swLocalRespaldo").checked = S.localRespaldo),
    ($("swLocalVista").checked = S.localVista),
    void 0 !== CeceHub && CeceHub.pintar());
}
function cambioLocal() {
  (guardarAjustes(), refrescarTodo(), elegirNivel(S.modelo, !0), Red.pintar());
}
function conectarOffline() {
  ($("swLocal").addEventListener("change", (e) => {
    ((S.localActivo = e.target.checked), pintarOffline(), cambioLocal());
  }),
    $("localUrl").addEventListener("change", (e) => {
      const t = e.target.value.trim().replace(/\/+$/, "");
      if (!FORMAS.localUrl.test(t))
        return (
          (e.target.value = S.localUrl),
          void toast("Dirección no válida: tiene que empezar por http:// o https://", "mal")
        );
      ((S.localUrl = t), cambioLocal());
    }),
    $("localModelo").addEventListener("change", (e) => {
      const t = e.target.value.trim();
      if (!FORMAS.localModelo.test(t))
        return ((e.target.value = S.localModelo), void toast("Nombre de modelo no válido.", "mal"));
      ((S.localModelo = t), cambioLocal());
    }),
    $("swLocalRespaldo").addEventListener("change", (e) => {
      ((S.localRespaldo = e.target.checked), cambioLocal());
    }),
    $("swLocalVista").addEventListener("change", (e) => {
      ((S.localVista = e.target.checked), cambioLocal());
    }),
    $("localBuscar").addEventListener("click", async () => {
      const e = $("localEstado"),
        t = $("localBuscar");
      ((t.disabled = !0), (e.className = "api-test"), (e.textContent = "⏳ Buscando modelos…"));
      try {
        const t = await modelosLocales();
        if ((($("localModelos").innerHTML = t.map((e) => `<option value="${esc(e)}"></option>`).join("")), !t.length))
          return (
            (e.className = "api-test mal"),
            void (e.textContent = "Conecta, pero no tiene modelos. Descarga uno en tu programa de IA local.")
          );
        (t.includes(S.localModelo) || ((S.localModelo = t[0]), ($("localModelo").value = t[0]), cambioLocal()),
          (e.className = "api-test ok"),
          (e.textContent = `✓ Conectado: ${t.length} modelo(s). Usando ${S.localModelo}.`));
      } catch (t) {
        ((e.className = "api-test mal"), (e.textContent = t.message));
      } finally {
        t.disabled = !1;
      }
    }));
}
const RE_TOKEN_HUB = /^[A-Za-z0-9_-]{24,128}$/,
  RE_ID_HUB = /^[0-9a-f]{8}$/;
function baseHub(e) {
  let t = String(null == e ? "" : e).trim();
  if (!t || t.length > 300 || /\s/.test(t)) return "";
  const o = !/^[a-z][a-z0-9+.-]*:\/\//i.test(t);
  let a;
  o && (t = "http://" + t);
  try {
    a = new URL(t);
  } catch (e) {
    return "";
  }
  if (!/^https?:$/.test(a.protocol) || !a.hostname || a.username || a.password) return "";
  if ("http:" === a.protocol && !/^[a-z]+:\/\/(\[[^\]]*\]|[^/:?#]+):\d+/i.test(t)) {
    const e = /^\d{1,3}(\.\d{1,3}){3}$/.test(a.hostname) || a.hostname.startsWith("[");
    o && !e && "internet" === tipoRuta(a.origin) ? (a.protocol = "https:") : (a.port = String(CeceHub.PUERTO));
  }
  const n = a.pathname.replace(/\/+$/, "").replace(/\/v1$/i, "");
  return a.origin + n;
}
function tipoRuta(e) {
  let t;
  try {
    t = new URL(e).hostname.replace(/^\[|\]$/g, "").toLowerCase();
  } catch (e) {
    return "internet";
  }
  if ("localhost" === t || t.endsWith(".localhost") || "::1" === t || /^127\./.test(t)) return "equipo";
  if (/\.(local|lan|home|internal|home\.arpa)$/.test(t)) return "wifi";
  if (!t.includes(".") && !t.includes(":")) return "wifi";
  const o = t.split(".");
  if (4 === o.length && o.every((e) => /^\d{1,3}$/.test(e) && +e <= 255)) {
    const [e, t] = o.map(Number);
    return 10 === e || (172 === e && t >= 16 && t <= 31) || (192 === e && 168 === t) || (169 === e && 254 === t)
      ? "wifi"
      : "internet";
  }
  return /^f[cd][0-9a-f]{2}:/.test(t) || /^fe[89ab][0-9a-f]:/.test(t) ? "wifi" : "internet";
}
const esTailscale = (e) => /^http:\/\/100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d+\.\d+(:\d+)?$/.test(e);
function leerEnlaceHub(e) {
  let t = String(null == e ? "" : e).trim();
  if (/[\s<>]/.test(t) || /.https?:\/\//i.test(t)) {
    const e = t
        .split(/[\s<>"'()]+/)
        .map((e) => {
          const t = e.search(/https?:\/\//i);
          return (t > 0 ? e.slice(t) : e).replace(/[.,;:!?]+$/, "");
        })
        .filter(Boolean),
      o = e.find((e) => /[#&?]cecehub=/.test(e)) || e.find((e) => /^https?:\/\//i.test(e));
    o && (t = o);
  }
  if (RE_TOKEN_HUB.test(t)) return { base: "", token: t };
  const o = t.match(/[#&?]cecehub=([A-Za-z0-9_-]{24,128})(?![A-Za-z0-9_-])/);
  return { base: baseHub(t.replace(/[?#][\s\S]*$/, "")), token: o ? o[1] : "" };
}
function extraHub(e) {
  try {
    return /\.ngrok(-free)?\.(app|dev|io)$/i.test(new URL(e).hostname) ? { "ngrok-skip-browser-warning": "1" } : {};
  } catch (e) {
    return {};
  }
}
const hostDe = (e) => {
  try {
    return new URL(e).host;
  } catch (t) {
    return String(e || "");
  }
};
function versionHubMenor(e, t) {
  const p = (e) =>
      String(e || "")
        .split(".")
        .slice(0, 3)
        .map((e) => parseInt(e, 10) || 0),
    o = p(e),
    a = p(t);
  for (let e = 0; e < 3; e++) if ((o[e] || 0) !== (a[e] || 0)) return (o[e] || 0) < (a[e] || 0);
  return !1;
}
function comoAbrirHub() {
  const e = String(
    (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent || "",
  ).toLowerCase();
  return /mac|iphone|ipad/.test(e)
    ? "En el Mac con la IA, en Terminal: python3 ~/Downloads/cecehub-server.py (añade --internet para usarlo también fuera de casa)."
    : /win/.test(e)
      ? "En el ordenador con la IA: doble clic en cecehub-server.py o, en una consola, py cecehub-server.py (añade --internet para usarlo también fuera de casa). Necesita Python, de python.org; si el navegador pregunta, elige «Conservar»."
      : "En el ordenador con la IA, en una terminal: python3 cecehub-server.py (añade --internet para usarlo también fuera de casa).";
}
async function pedirHub(e, t, { token: o = "", ms: a = 4e3, signal: n } = {}) {
  const r = new AbortController(),
    i = setTimeout(() => r.abort(), a),
    fuera = () => r.abort();
  n && (n.aborted ? r.abort() : n.addEventListener("abort", fuera, { once: !0 }));
  try {
    const a = { ...extraHub(e), ...(o ? { Authorization: "Bearer " + o } : {}) },
      n = await fetch(e + t, {
        headers: a,
        cache: "no-store",
        credentials: "omit",
        redirect: "error",
        signal: r.signal,
      });
    let i = null;
    try {
      i = await n.json();
    } catch (e) {}
    return { status: n.status, j: i };
  } finally {
    (clearTimeout(i), n && n.removeEventListener("abort", fuera));
  }
}
const hexDe = (e) => [...e].map((e) => e.toString(16).padStart(2, "0")).join("");
async function pruebaHub(e, t, o, a, n = !0) {
  if (!window.crypto || !crypto.subtle) return null;
  const r = hexDe(crypto.getRandomValues(new Uint8Array(16))),
    { status: i, j: s } = await pedirHub(e, "/v1/cecehub/proof?nonce=" + r, { ms: o, signal: a }),
    c = n ? "proof_host" : "proof";
  if (200 !== i || !s || "string" != typeof s[c]) return !1;
  const l = new TextEncoder(),
    d = await crypto.subtle.importKey("raw", l.encode(t), { name: "HMAC", hash: "SHA-256" }, !1, ["sign"]),
    u = n ? `cecehub-proof:${r}:${new URL(e).host.toLowerCase()}` : "cecehub-proof:" + r;
  return hexDe(new Uint8Array(await crypto.subtle.sign("HMAC", d, l.encode(u)))) === s[c].toLowerCase();
}
class ErrorHub extends Error {
  constructor(e, t = {}) {
    (super(e), (this.name = "ErrorHub"), (this.motivo = e), Object.assign(this, t));
  }
}
const CeceHub = {
  PUERTO: 9999,
  REDES: [
    "192.168.1",
    "192.168.0",
    "192.168.2",
    "192.168.178",
    "192.168.100",
    "192.168.8",
    "192.168.68",
    "192.168.86",
    "192.168.50",
    "192.168.31",
    "192.168.10",
    "192.168.88",
    "192.168.3",
    "192.168.11",
    "192.168.15",
    "10.0.0",
    "10.0.1",
    "10.1.1",
    "192.168.43",
    "172.20.10",
    "192.168.137",
  ],
  datos: null,
  ruta: null,
  estado: "apagado",
  mensaje: "",
  aviso: "",
  ultimoOk: 0,
  _ultimaBusqueda: 0,
  _enlaces: 0,
  _gen: 0,
  _buscando: null,
  _conectando: null,
  _prueba: null,
  _pegando: null,
  _escaneo: null,
  vacio: () => ({ id: "", nombre: "", token: "", internet: "", tailnet: [], lan: [], ultima: "" }),
  cargar() {
    const e = almacen.get("cece_hub", null),
      t = this.vacio();
    if (e && "object" == typeof e && !Array.isArray(e)) {
      (RE_ID_HUB.test(e.id) && (t.id = e.id),
        "string" == typeof e.nombre && (t.nombre = e.nombre.slice(0, 40)),
        RE_TOKEN_HUB.test(e.token) && (t.token = e.token));
      const b = (e) => ("string" == typeof e ? baseHub(e) : ""),
        lista = (e, t) => (Array.isArray(e) ? [...new Set(e.map(b).filter(Boolean))].slice(0, t) : []);
      ((t.internet = b(e.internet)),
        (t.ultima = b(e.ultima)),
        (t.lan = lista(e.lan, 6)),
        (t.tailnet = lista(e.tailnet, 3)));
    }
    return ((this.datos = t), t);
  },
  guardar() {
    almacen.set("cece_hub", this.datos);
  },
  candidatos(e = this.datos.token) {
    const t = this.datos,
      o = [],
      add = (e) => {
        const t = baseHub(e);
        t && !o.some((e) => e.base === t) && o.push({ base: t, tipo: tipoRuta(t) });
      },
      a = new Set([this.PUERTO]);
    for (const e of [t.ultima, ...t.lan])
      try {
        const t = +new URL(e).port;
        t && a.add(t);
      } catch (e) {}
    for (const e of a) add(`http://127.0.0.1:${e}`);
    return (
      t.ultima && "internet" !== tipoRuta(t.ultima) && add(t.ultima),
      t.lan.forEach(add),
      t.id && add(`http://cecehub-${t.id.slice(0, 4)}.local:${this.PUERTO}`),
      add(`http://cecehub.local:${this.PUERTO}`),
      e && (t.tailnet.forEach(add), t.internet && add(t.internet)),
      o.sort((e, t) => ({ equipo: 0, wifi: 1, internet: 2 })[e.tipo] - { equipo: 0, wifi: 1, internet: 2 }[t.tipo])
    );
  },
  async probar(e, { token: t = "", id: o = "", confiar: a = !1, delEnlace: n = !1, signal: r } = {}) {
    const i = tipoRuta(e),
      s = "internet" === i ? 9e3 : "equipo" === i ? 2500 : 3500;
    let c;
    try {
      c = await pedirHub(e, "/health", { ms: s, signal: r });
    } catch (t) {
      throw new ErrorHub(r && r.aborted ? "cancelado" : "no responde", { base: e, tipo: i });
    }
    const l = c.j;
    if (200 !== c.status || !l || "cecehub" !== l.service || !RE_ID_HUB.test(l.id))
      throw new ErrorHub("no es CeceHub", { base: e, tipo: i, status: c.status });
    if (o && l.id !== o && !a) throw new ErrorHub("otro", { base: e, tipo: i, nombre: l.name || "" });
    let d = !1;
    if (t) {
      let c = !1;
      try {
        c = await pruebaHub(e, t, s, r, "internet" !== i);
      } catch (e) {
        c = !1;
      }
      if (!0 === c) d = !0;
      else if (null === c) d = (a || "internet" === i) && (n || (!!o && l.id === o));
      else if (!a) throw new ErrorHub("no demuestra", { base: e, tipo: i, nombre: l.name || "" });
    }
    if ("token" === l.auth && !d) throw new ErrorHub(t ? "código no vale" : "pide código", { base: e, tipo: i });
    const u = d ? t : "";
    let m;
    try {
      m = await pedirHub(e, "/v1/models", { token: u, ms: s + 4e3, signal: r });
    } catch (t) {
      throw new ErrorHub(r && r.aborted ? "cancelado" : "no responde", { base: e, tipo: i });
    }
    if (401 === m.status) throw new ErrorHub("código no vale", { base: e, tipo: i });
    if (429 === m.status) throw new ErrorHub("bloqueado", { base: e, tipo: i });
    if (403 === m.status)
      throw new ErrorHub("permiso", { base: e, tipo: i, detalle: m.j && m.j.error && m.j.error.message });
    if (200 !== m.status || !m.j || !Array.isArray(m.j.data))
      throw new ErrorHub("no es CeceHub", { base: e, tipo: i, status: m.status });
    const h = [
      ...new Set(m.j.data.map((e) => e && e.id).filter((e) => "string" == typeof e && e && FORMAS.localModelo.test(e))),
    ];
    let g = null;
    if (u)
      try {
        const t = await pedirHub(e, "/v1/cecehub/status", { token: u, ms: s, signal: r });
        200 === t.status && t.j && (g = t.j);
      } catch (e) {}
    return {
      base: e,
      tipo: i,
      id: RE_ID_HUB.test(l.id) ? l.id : "",
      nombre: String((g && g.name) || l.name || "").slice(0, 40),
      conToken: !!u,
      token: u,
      modelos: h,
      version: String(l.version || ""),
      activo: g && "string" == typeof g.active_model ? g.active_model : "",
      links: g && g.links && "object" == typeof g.links ? g.links : null,
      internetActivo: g && g.internet ? !!g.internet.enabled : null,
    };
  },
  buscar({ silencioso: e = !1, token: t, signal: o } = {}) {
    if (!S.hubActivo) return Promise.resolve(null);
    if ("string" == typeof t) return this.probarCodigo(t, o);
    if (this._conectando) return this.trasConectar(e);
    if (this._buscando)
      return (
        e ||
          "buscando" === this.estado ||
          ((this.estado = "buscando"), (this.mensaje = "Buscando CeceHub…"), this.pintar()),
        this._buscando
      );
    const a = ++this._gen;
    return (
      (this._buscando = (async () => {
        const t = new AbortController();
        ((this._ctl = t),
          (this._ultimaBusqueda = Date.now()),
          (e && this.ruta) || ((this.estado = "buscando"), (this.mensaje = "Buscando CeceHub…"), this.pintar()));
        const { mejor: o, fallos: n } = await this.mejorRuta(this.datos.token, t.signal);
        return (
          t.abort(),
          a === this._gen && S.hubActivo
            ? o
              ? (this.usar(o), o)
              : ((this.ruta = null),
                (this.aviso = ""),
                HUB.base && (this.quitarBase(), "function" == typeof cambioLocal && cambioLocal()),
                (this.estado = "sin"),
                (this.mensaje = this.explicar(n)),
                this.pintar(),
                null)
            : this._conectando
              ? this.trasConectar(e)
              : this.ruta
        );
      })().finally(() => {
        a === this._gen && (this._buscando = null);
      })),
      this._buscando
    );
  },
  trasConectar(e) {
    return this._conectando.then((t) => t || this.ruta || (S.hubActivo ? this.buscar({ silencioso: e }) : null));
  },
  async mejorRuta(e, t, o = !1) {
    const a = this.datos,
      n = this.candidatos(e).map((o) =>
        this.probar(o.base, { token: e, id: a.id, signal: t }).then(
          (e) => ({ r: e }),
          (e) => ({ e: e }),
        ),
      ),
      r = [];
    for (const e of n) {
      const t = await e;
      if (t.r && (!o || t.r.conToken)) return { mejor: t.r, fallos: r };
      r.push(t.e);
    }
    return { mejor: null, fallos: r };
  },
  async probarCodigo(e, t) {
    const o = this.datos,
      a = new AbortController(),
      fuera = () => a.abort();
    (t && (t.aborted ? a.abort() : t.addEventListener("abort", fuera, { once: !0 })),
      (this.estado = "buscando"),
      (this.mensaje = "Probando el código…"),
      this.pintar());
    let n = null;
    try {
      ({ mejor: n } = await this.mejorRuta(e, a.signal, !0));
    } finally {
      t && t.removeEventListener("abort", fuera);
    }
    const r = a.signal.aborted;
    return (
      a.abort(),
      n && !r && S.hubActivo && this.datos === o
        ? (this._gen++, this._ctl && this._ctl.abort(), (this._buscando = null), (o.token = e), this.usar(n), n)
        : ("buscando" !== this.estado ||
            this._buscando ||
            this._conectando ||
            ((this.estado = this.ruta ? "conectado" : "sin"), this.pintar()),
          null)
    );
  },
  firma: () => [HUB.base, HUB.token, HUB.internet, S.localModelo, S.localActivo].join("|"),
  usar(e) {
    const t = this.datos,
      o = this.firma();
    ((this.ruta = e),
      (this.ultimoOk = Date.now()),
      (this.estado = "conectado"),
      (this.mensaje = ""),
      (this.aviso = ""),
      e.id && (t.id = e.id),
      e.nombre && (t.nombre = e.nombre),
      "wifi" === e.tipo && (t.lan = [e.base, ...t.lan.filter((t) => t !== e.base)].slice(0, 6)),
      e.links && ((this._enlaces = Date.now()), this.aprenderEnlaces(e.links, e.internetActivo, e.base)),
      (t.ultima = e.base),
      this.guardar(),
      this.ponerBase(e.base, e.conToken ? e.token : ""));
    let a = !1;
    const n = $("localModelos");
    (n && (n.innerHTML = e.modelos.map((e) => `<option value="${esc(e)}"></option>`).join("")),
      e.modelos.length &&
        !e.modelos.includes(S.localModelo) &&
        ((S.localModelo = e.modelos.includes(e.activo) ? e.activo : e.modelos[0]), (a = !0)),
      S.localActivo || ((S.localActivo = !0), (a = !0)),
      a && "function" == typeof pintarOffline && pintarOffline(),
      this.firma() !== o && "function" == typeof cambioLocal && cambioLocal(),
      this.pintar());
  },
  ponerBase(e, t) {
    ((HUB.base = e + "/v1"),
      (HUB.token = t || ""),
      (HUB.internet = "internet" === tipoRuta(e)),
      (HUB.extra = extraHub(e)));
  },
  quitarBase() {
    ((HUB.base = ""), (HUB.token = ""), (HUB.internet = !1), (HUB.extra = {}));
  },
  aprenderEnlaces(e, t, o) {
    const a = this.datos,
      lista = (e) => (Array.isArray(e) ? e.map(baseHub).filter(Boolean) : []),
      n = "string" == typeof e.internet ? baseHub(e.internet) : "";
    n ? (a.internet = n) : !1 === t && a.internet !== o && (a.internet = "");
    const r = lista(e.lan).filter((e) => "wifi" === tipoRuta(e));
    (r.length && (a.lan = [...new Set([...r, ...a.lan])].slice(0, 6)),
      (a.tailnet = lista(e.tailscale).filter(esTailscale).slice(0, 3)));
  },
  explicar(e) {
    const t = this.datos,
      o = e.filter(Boolean),
      hay = (e) => o.find((t) => t.motivo === e);
    return hay("código no vale")
      ? "CeceHub contesta, pero tu código ya no vale (¿se cambió con --new-token?). Pega otra vez su enlace."
      : hay("no demuestra")
        ? `En ${hostDe(hay("no demuestra").base)} contesta un CeceHub que no demuestra conocer tu código: o lo cambiaste (--new-token: pega su enlace nuevo) o no es el tuyo. Por seguridad, Cece no le manda nada.`
        : hay("pide código")
          ? `CeceHub (${hostDe(hay("pide código").base)}) pide el código: pega el enlace con código que enseña al arrancar.`
          : hay("bloqueado")
            ? "CeceHub ha bloqueado esta conexión un rato por demasiados códigos incorrectos. Espera unos minutos."
            : hay("permiso")
              ? "CeceHub no deja pasar: " + (hay("permiso").detalle || "sin permiso.")
              : hay("otro")
                ? `En esta red hay otro CeceHub${hay("otro").nombre ? " («" + hay("otro").nombre + "»)" : ""}, pero no es el tuyo. Para usarlo, pega su enlace o pulsa «Buscar en mi WiFi».`
                : t.internet || t.tailnet.length
                  ? "No llego a tu CeceHub ni en esta red ni por internet. ¿Está encendido? Si lo reiniciaste, su enlace de internet ha cambiado: pega el nuevo (o conéctate una vez en casa y Cece lo aprende sola)."
                  : "No encuentro CeceHub en este equipo ni en esta WiFi. Ábrelo en el ordenador con la IA («⬇️ Descargar CeceHub», aquí abajo, y python3 cecehub-server.py) y pulsa «Conectar»; si no aparece, «Buscar en mi WiFi». Desde otro sitio, pega su enlace de internet.";
  },
  descargarPrograma: () =>
    "string" == typeof CECEHUB_PY && CECEHUB_PY
      ? (descargar("cecehub-server.py", CECEHUB_PY, "text/x-python"),
        toast("⬇️ cecehub-server.py descargado. " + comoAbrirHub(), "ok", 12e3),
        !0)
      : (toast("Esta copia de Cece no lleva CeceHub dentro.", "mal"), !1),
  conectarEnlace(e) {
    const t = String(null == e ? "" : e).trim();
    if (this._pegando && this._pegando.clave === t) return this._pegando.p;
    const o = this.pegar(t).finally(() => {
      this._pegando && this._pegando.p === o && (this._pegando = null);
    });
    return ((this._pegando = { clave: t, p: o }), o);
  },
  async pegar(e) {
    const { base: t, token: o } = leerEnlaceHub(e);
    if (!t && !o)
      return (
        toast("Eso no parece un enlace de CeceHub: cópialo entero (empieza por https:// o http://).", "mal", 6e3),
        null
      );
    (S.hubActivo || this.encender(!1), this._prueba && this._prueba.abort());
    const a = this.datos;
    if (!t) {
      const e = new AbortController();
      this._prueba = e;
      let t = null;
      try {
        t = await this.buscar({ token: o, signal: e.signal });
      } finally {
        this._prueba === e && (this._prueba = null);
      }
      if (e.signal.aborted || !S.hubActivo) return null;
      if (t)
        return (this.limpiarEnlace(), toast(`🔗 Código aceptado: conectado a CeceHub ${this.descripcion()}.`, "ok"), t);
      if (
        (this.ruta || (await this.buscar({ silencioso: !0 })),
        !S.hubActivo || this.datos !== a || this._prueba || this._conectando)
      )
        return null;
      const n = "Ningún CeceHub a tu alcance reconoce ese código: no se ha guardado.";
      return (
        this.ruta
          ? (this.aviso = n)
          : ((this.estado = "sin"), (this.mensaje = n + " Pega el enlace entero (con su dirección).")),
        this.pintar(),
        null
      );
    }
    return this.conectarA(t, { token: o || a.token, modo: "pegado", nuevo: !!o && o !== a.token, delEnlace: !!o });
  },
  conectarA(e, t) {
    const o = this.conectarYa(e, t).finally(() => {
      this._conectando === o && (this._conectando = null);
    });
    return ((this._conectando = o), o);
  },
  async conectarYa(e, { token: t = this.datos.token, modo: o = "elegido", nuevo: a = !1, delEnlace: n = !1 } = {}) {
    S.hubActivo || this.encender(!1);
    const r = ++this._gen;
    (this._ctl && this._ctl.abort(),
      this._prueba && this._prueba.abort(),
      (this._buscando = null),
      (this._pegando = null));
    const i = this.ruta;
    let s;
    ((this.estado = "buscando"), (this.mensaje = `Conectando con ${hostDe(e)}…`), (this.aviso = ""), this.pintar());
    try {
      s = await this.probar(e, { token: t, id: this.datos.id, confiar: "auto" !== o, delEnlace: "pegado" === o && n });
    } catch (t) {
      if (r !== this._gen) return null;
      const o =
        "no responde" === t.motivo
          ? "internet" === tipoRuta(e)
            ? `${hostDe(e)} no contesta. ¿Sigue CeceHub abierto con --internet? Si se reinició, su enlace ha cambiado: copia el nuevo.`
            : `${hostDe(e)} no contesta. ¿Está CeceHub encendido y en la misma WiFi? (En Windows, deja pasar a Python en el cortafuegos.)`
          : "no es CeceHub" === t.motivo
            ? `En ${hostDe(e)} hay algo, pero no es CeceHub.`
            : "código no vale" === t.motivo
              ? "Ese código no vale para este CeceHub: copia otra vez el enlace que enseña (¿se cambió con --new-token?)."
              : this.explicar([t]);
      return (
        i && this.ruta === i
          ? ((this.estado = "conectado"), (this.aviso = o))
          : ((this.estado = "sin"),
            (this.ruta = null),
            (this.mensaje = o),
            HUB.base && (this.quitarBase(), "function" == typeof cambioLocal && cambioLocal())),
        this.pintar(),
        null
      );
    }
    if (r !== this._gen || !S.hubActivo) return null;
    const c = this.datos,
      quedarse = (e) => (
        (this.ruta = i),
        (this.estado = i ? "conectado" : "sin"),
        i ? (this.aviso = e) : (this.mensaje = e),
        this.pintar(),
        null
      );
    if (a && !s.conToken)
      return quedarse(
        "Ese código no vale para este CeceHub: copia otra vez el enlace que enseña (¿se cambió con --new-token?).",
      );
    if (c.id && s.id !== c.id) {
      if (
        "pegado" !== o &&
        c.token &&
        !confirm(
          `Este es otro CeceHub («${s.nombre || hostDe(s.base)}»), no el tuyo${c.nombre ? " («" + c.nombre + "»)" : ""}. ¿Cambiar a este? Se olvidará el código del tuyo.`,
        )
      )
        return quedarse("No se ha cambiado de CeceHub.");
      this.datos = Object.assign(this.vacio(), { id: s.id });
    } else if (t && !s.conToken) {
      if (
        !confirm(
          "Este CeceHub no reconoce tu código guardado (¿lo cambiaste con --new-token?, ¿o no es el tuyo?). ¿Olvidar ese código y conectar sin él? Para usarlo por internet tendrás que pegar su enlace nuevo.",
        )
      )
        return quedarse("No se ha conectado: no reconoce tu código guardado.");
      this.datos.token = "";
    }
    return (
      s.conToken && t && (this.datos.token = t),
      "internet" === s.tipo &&
        (esTailscale(s.base)
          ? (this.datos.tailnet = [s.base, ...this.datos.tailnet.filter((e) => e !== s.base)].slice(0, 3))
          : (this.datos.internet = s.base)),
      this.usar(s),
      this.limpiarEnlace(),
      this.pararEscaneo(!0),
      $("hubLista") && ($("hubLista").hidden = !0),
      toast(`🔗 Conectado a CeceHub ${this.descripcion()}.`, "ok"),
      s
    );
  },
  limpiarEnlace() {
    const e = $("hubEnlace");
    e && (e.value = "");
  },
  async sigue() {
    const e = this.ruta;
    if (!e) return !1;
    const t = "internet" === e.tipo ? 8e3 : 2500,
      o = e.id || this.datos.id;
    let a = !1;
    try {
      const n = await pedirHub(e.base, "/health", { ms: t });
      ((a = !(200 !== n.status || !n.j || "cecehub" !== n.j.service || (o && n.j.id !== o))),
        a && e.conToken && (a = !1 !== (await pruebaHub(e.base, e.token, t, void 0, "internet" !== e.tipo))));
    } catch (e) {
      a = !1;
    }
    return this.ruta !== e ? !!this.ruta : (a && (this.ultimoOk = Date.now()), a);
  },
  vivo() {
    this.ultimoOk = Date.now();
  },
  async asegurar() {
    S.hubActivo &&
      ((this.ruta && (Date.now() - this.ultimoOk < 3e4 || (await this.sigue()))) ||
        (await this.buscar({ silencioso: !0 })));
  },
  errorSinRuta() {
    return new ErrorApi(
      "🔗 " + (this.mensaje || "No encuentro tu CeceHub.") + " (Configuración → 📴 Sin conexión → CeceHub)",
      { prov: "local", red: !0, corto: "sin conexión" },
    );
  },
  async otraRuta(e) {
    if (!S.hubActivo || !HUB.base || !e || (!e.red && "tiempo agotado" !== e.corto && "sin conexión" !== e.corto))
      return !1;
    const t = HUB.base + "|" + HUB.token;
    return (await this.buscar({ silencioso: !0 }), !!this.ruta && HUB.base + "|" + HUB.token !== t);
  },
  revisarPronto(e = 300) {
    S.hubActivo && (clearTimeout(this._pronto), (this._pronto = setTimeout(() => this.buscar({ silencioso: !0 }), e)));
  },
  async latido() {
    if (!S.hubActivo || document.hidden || this._buscando || this._conectando || this._escaneo) return;
    const e = Date.now(),
      t = this.ruta;
    if (t)
      if ("internet" === t.tipo && e - this._ultimaBusqueda > 6e4) this.buscar({ silencioso: !0 });
      else {
        if (e - this.ultimoOk > 25e3) {
          const e = await this.sigue();
          if (this.ruta !== t) return;
          if (!e) return void this.buscar({ silencioso: !0 });
        }
        if (t.conToken && e - this._enlaces > 3e5) {
          this._enlaces = e;
          try {
            const e = await pedirHub(t.base, "/v1/cecehub/status", { token: t.token, ms: 8e3 });
            if (this.ruta !== t || this.datos.id !== t.id) return;
            200 === e.status &&
              e.j &&
              e.j.links &&
              (this.aprenderEnlaces(e.j.links, e.j.internet ? !!e.j.internet.enabled : null, t.base),
              this.guardar(),
              this.pintar());
          } catch (e) {}
        }
      }
    else e - this._ultimaBusqueda > 6e4 && this.buscar({ silencioso: !0 });
  },
  vigilar() {
    (clearInterval(this._reloj), (this._reloj = setInterval(() => this.latido(), 2e4)));
    const cambio = () => this.revisarPronto(1200);
    (window.addEventListener("online", cambio),
      navigator.connection &&
        navigator.connection.addEventListener &&
        navigator.connection.addEventListener("change", cambio),
      document.addEventListener("visibilitychange", () => {
        !document.hidden && Date.now() - this.ultimoOk > 25e3 && this.revisarPronto(400);
      }));
  },
  pararEscaneo(e = !1) {
    const t = this._escaneo;
    t && ((t.callado = t.callado || e), t.abort());
  },
  async buscarEnWifi() {
    if (this._escaneo) return void this.pararEscaneo();
    S.hubActivo || this.encender(!1);
    const e = new AbortController();
    this._escaneo = e;
    const t = new Map(),
      o = $("hubBuscar");
    o && (o.textContent = "⏹ Parar");
    let a = ["nombres", 0, 0];
    const pintar = (o, n = 0, r = 0) => {
        ((a = [o, n, r]),
          e.callado ||
            this.pintarLista([...t.values()], {
              fase: o,
              hechas: n,
              total: r,
              buscando: !e.signal.aborted && "fin" !== o,
            }));
      },
      uno = async (o, n) => {
        const r = performance.now();
        try {
          const r = await pedirHub(o, "/health", { ms: n, signal: e.signal });
          if (200 === r.status && r.j && "cecehub" === r.j.service) {
            const e = r.j.id || o;
            return (
              t.has(e) ||
                (t.set(e, { base: o, id: r.j.id || "", nombre: r.j.name || "", auth: r.j.auth, tipo: tipoRuta(o) }),
                pintar(...a)),
              "hub"
            );
          }
          return "vivo";
        } catch (t) {
          return !e.signal.aborted && performance.now() - r < 0.6 * n ? "vivo" : "nada";
        }
      },
      tanda = async (t, o, a, n) => {
        let r = 0,
          i = 0;
        const s = new Array(t.length),
          obrero = async () => {
            for (; r < t.length && !e.signal.aborted;) {
              const e = r++;
              ((s[e] = await uno(t[e], o)), i++, n && n(i, t.length));
            }
          };
        return (await Promise.all(Array.from({ length: Math.min(a, t.length) }, obrero)), s);
      };
    try {
      (pintar("nombres"),
        await tanda(
          this.candidatos()
            .filter((e) => "internet" !== e.tipo)
            .map((e) => e.base),
          3e3,
          8,
        ));
      const o = [...new Set([this.PUERTO, ...this.datos.lan.map((e) => +new URL(e).port || 80)])],
        a = [
          ...new Set(
            this.datos.lan
              .map((e) => new URL(e).hostname)
              .filter((e) => /^\d+\.\d+\.\d+\.\d+$/.test(e))
              .map((e) => e.replace(/\.\d+$/, "")),
          ),
        ];
      let n = [...new Set([...a, ...this.REDES])];
      if (!e.signal.aborted && !t.size) {
        pintar("redes");
        const e = n.flatMap((e) => [`${e}.1`, `${e}.254`]),
          t = await tanda(
            e.map((e) => `http://${e}:${this.PUERTO}`),
            1500,
            48,
          ),
          o = n.filter((e, o) => a.includes(e) || "nada" !== t[2 * o] || "nada" !== t[2 * o + 1]);
        n = (o.length ? o : this.REDES.slice(0, 2)).slice(0, 4);
      }
      for (const a of n) {
        if (e.signal.aborted || t.size) break;
        const r = Array.from({ length: 254 }, (e, t) => `${a}.${t + 1}`).flatMap((e) =>
          o.map((t) => `http://${e}:${t}`),
        );
        (pintar(a, 0, r.length),
          await tanda(r, 1800, 64, (e, t) => {
            (e % 16 != 0 && e !== t) || pintar(a, e, t);
          }));
      }
    } finally {
      const a = e.signal.aborted;
      (this._escaneo === e && (this._escaneo = null), o && (o.textContent = "📶 Buscar en mi WiFi"));
      const n = [...t.values()];
      (e.callado || this.pintarLista(n, { fase: "fin", parado: a }),
        a ||
          1 !== n.length ||
          this.ruta ||
          this._conectando ||
          this._prueba ||
          !S.hubActivo ||
          (this.datos.id && n[0].id !== this.datos.id) ||
          this.conectarA(n[0].base, { modo: "auto" }));
    }
  },
  encender(e = !0) {
    if (
      ((S.hubActivo = !0),
      S.localActivo || (S.localActivo = !0),
      guardarAjustes(),
      "function" == typeof pintarOffline && pintarOffline(),
      "function" == typeof cambioLocal && cambioLocal(),
      this.pintar(),
      e)
    )
      return this.buscar();
  },
  cancelarTodo() {
    (this._gen++,
      this._ctl && this._ctl.abort(),
      this._prueba && this._prueba.abort(),
      (this._buscando = null),
      (this._conectando = null),
      (this._pegando = null));
  },
  apagar() {
    ((S.hubActivo = !1),
      this.cancelarTodo(),
      this.pararEscaneo(),
      (this.ruta = null),
      (this.aviso = ""),
      (this.estado = "apagado"),
      this.quitarBase(),
      guardarAjustes(),
      "function" == typeof cambioLocal && cambioLocal(),
      this.pintar());
  },
  olvidar() {
    (this.cancelarTodo(),
      this.pararEscaneo(!0),
      (this.datos = this.vacio()),
      almacen.del("cece_hub"),
      (this.ruta = null),
      (this.aviso = ""),
      this.quitarBase(),
      (this.estado = S.hubActivo ? "sin" : "apagado"),
      (this.mensaje = "Olvidado. Pulsa «Conectar» para buscar otra vez, o pega un enlace."));
    const e = $("hubLista");
    (e && ((e.hidden = !0), (e.innerHTML = "")), "function" == typeof cambioLocal && cambioLocal(), this.pintar());
  },
  iniciar() {
    (this.cargar(),
      this.vigilar(),
      S.hubActivo && ((this.estado = "buscando"), setTimeout(() => this.buscar({ silencioso: !0 }), 150)),
      this.pintar());
  },
  descripcion() {
    const e = this.ruta;
    if (!e) return HUB.base ? `(${hostDe(HUB.base)}, sin respuesta ahora)` : "sin conectar";

    return (
      (this.datos.nombre ? `«${this.datos.nombre}» ` : "") +
      {
        equipo: "en este equipo",
        wifi: "por la WiFi",
        internet: esTailscale(e.base) ? "por Tailscale" : "por internet",
      }[e.tipo]
    );
  },
  pintar() {
    const e = $("swHub");
    if (!e) return;
    ((e.checked = !!S.hubActivo), ($("hubAjustes").hidden = !S.hubActivo));
    const t = this.datos || this.vacio(),
      o = this.ruta,
      a = $("hubEstado");
    let n = "",
      r = "➖",
      i = "";
    ("buscando" === this.estado
      ? ((r = "⏳"), (i = `<b>${esc(this.mensaje || "Buscando CeceHub…")}</b>`))
      : o
        ? ((n = "ok"),
          (r = "✅"),
          (i = `<b>Conectado ${esc(this.descripcion())}</b> <span class="det">${esc(hostDe(o.base))} · ${o.modelos.length ? o.modelos.length + " modelo(s)" : "sin modelos: abre Ollama o LM Studio en ese equipo"}</span>`))
        : "sin" === this.estado
          ? ((n = "mal"), (r = "❌"), (i = `<span>${esc(this.mensaje)}</span>`))
          : (i = '<span class="det">Pulsa «Conectar».</span>'),
      this.aviso && "buscando" !== this.estado && (i += `<br><span class="hub-aviso">⚠️ ${esc(this.aviso)}</span>`));
    const s = [];
    (!t.internet || (o && o.base === t.internet) || s.push("🌍 enlace de internet: " + esc(hostDe(t.internet))),
      t.tailnet.length && s.push("🔒 Tailscale"),
      t.token && s.push("🔑 código guardado"),
      o &&
        o.version &&
        "string" == typeof CECEHUB_VERSION &&
        versionHubMenor(o.version, CECEHUB_VERSION) &&
        s.push(
          `⬆️ ese CeceHub es el ${esc(o.version)}; dentro de Cece va el ${esc(CECEHUB_VERSION)}: «⬇️ Descargar CeceHub» y ábrelo en su lugar`,
        ),
      (a.className = "conex-fila hub-estado" + (n ? " " + n : "")),
      (a.innerHTML = `<span class="conex-ico">${r}</span><span>${i}${s.length ? `<br><span class="det">${s.join(" · ")}</span>` : ""}</span>`),
      ($("hubOlvidar").hidden = !(t.id || t.token || t.lan.length || t.internet)),
      ($("hubManda").hidden = !HUB.base),
      "function" == typeof aplicarEmojis && aplicarEmojis(a));
  },
  pintarLista(e, { fase: t, hechas: o = 0, total: a = 0, buscando: n = !1, parado: r = !1 } = {}) {
    const i = $("hubLista");
    if (!i) return;
    i.hidden = !1;
    const s = e
      .map(
        (e) =>
          `<div class="hub-item"><span><b>${esc(e.nombre || "CeceHub")}</b>${"token" === e.auth ? " 🔑" : ""}<br><span class="det">${esc(hostDe(e.base))}${this.datos.id && e.id === this.datos.id ? " · el tuyo" : ""}</span></span><button type="button" class="btn-mini" data-hub="${esc(e.base)}">🔗 Conectar</button></div>`,
      )
      .join("");
    let c = "";
    if (n) {
      const e = a ? Math.round((100 * o) / a) : 0;
      c = `<div class="det">📶 Buscando ${esc("nombres" === t ? "en este equipo y en cecehub.local" : "redes" === t ? "qué redes hay" : `en ${t}.x`)}… ${a ? e + " %" : ""}</div><div class="hub-progreso"><i style="width:${e}%"></i></div>`;
    } else
      e.length ||
        (c = `<div class="det">${r ? "Búsqueda parada." : "No he encontrado ningún CeceHub en esta WiFi. ¿Está abierto? ¿Es una WiFi de invitados (aísla a los equipos)? Escribe su dirección (la que enseña al arrancar, http://…:9999) en el cuadro de abajo."}</div>`);
    ((i.innerHTML = c + s), "function" == typeof aplicarEmojis && aplicarEmojis(i));
  },
};
function conectarHub() {
  if (!$("swHub")) return;
  ($("swHub").addEventListener("change", (e) => {
    e.target.checked ? CeceHub.encender() : CeceHub.apagar();
  }),
    $("hubConectar").addEventListener("click", () => CeceHub.buscar()),
    $("hubBuscar").addEventListener("click", () => CeceHub.buscarEnWifi()),
    $("hubOlvidar").addEventListener("click", () => {
      confirm("¿Olvidar este CeceHub en este navegador (su código y sus direcciones)?") && CeceHub.olvidar();
    }));
  const pegar = () => {
    const e = $("hubEnlace").value;
    e.trim() && CeceHub.conectarEnlace(e);
  };
  ($("hubEnlaceBtn").addEventListener("click", pegar),
    $("hubDescargar").addEventListener("click", () => CeceHub.descargarPrograma()),
    ($("hubComo").textContent = "Va dentro de Cece. " + comoAbrirHub()),
    $("hubEnlace").addEventListener("keydown", (e) => {
      "Enter" === e.key && (e.preventDefault(), e.stopPropagation(), pegar());
    }),
    $("hubLista").addEventListener("click", (e) => {
      const t = e.target.closest("[data-hub]");
      t && CeceHub.conectarA(t.dataset.hub);
    }),
    $("swLocal").addEventListener("change", (e) => {
      !e.target.checked && S.hubActivo && CeceHub.apagar();
    }));
}
const IDIOMAS = {
    es: "español",
    en: "inglés",
    fr: "francés",
    de: "alemán",
    it: "italiano",
    pt: "portugués",
    ca: "catalán",
  },
  idiomaCorto = () => S.idioma.slice(0, 2),
  VOCES = {
    elevenlabs: [
      { id: "EXAVITQu4vr4xnSDxMaL", nombre: "Sarah (mujer)" },
      { id: "XrExE9yKIg1WjnnlVkGX", nombre: "Matilda (mujer)" },
      { id: "JBFqnCBsd6RMkjVDRZzb", nombre: "George (hombre)" },
      { id: "pNInz6obpgDQGcFmaJgB", nombre: "Adam (hombre)" },
    ],
    openai: [
      "marin",
      "cedar",
      "coral",
      "nova",
      "shimmer",
      "sage",
      "alloy",
      "ash",
      "ballad",
      "echo",
      "fable",
      "onyx",
      "verse",
    ].map((e) => ({ id: e, nombre: e })),
    groq: ["hannah", "diana", "autumn", "austin", "daniel", "troy"].map((e) => ({ id: e, nombre: e })),
    groqAr: ["lulwa", "noura", "aisha", "abdullah", "fahad", "sultan"].map((e) => ({ id: e, nombre: e })),
    gemini: [
      "Kore",
      "Aoede",
      "Leda",
      "Zephyr",
      "Callirrhoe",
      "Despina",
      "Puck",
      "Charon",
      "Fenrir",
      "Orus",
      "Iapetus",
      "Algieba",
    ].map((e) => ({ id: e, nombre: e })),
  },
  NOMBRE_TTS = {
    elevenlabs: "Voz Cece Natural",
    openai: "Voz Cece Clara",
    gemini: "Voz Cece Viva",
    groq: "Voz Cece Inglés",
    navegador: "Navegador",
  },
  NOMBRE_STT = {
    groq: "Oído Cece Rápido",
    "groq-hq": "Oído Cece Preciso",
    openai: "Oído Cece Plus",
    navegador: "Navegador",
  };
class Microfono {
  constructor(e) {
    ((this.cb = e), (this.modo = "pausa"));
  }
  async abrir() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)
      throw new Error("Este navegador no permite usar el micrófono aquí.");
    const e = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: !0, noiseSuppression: !0, autoGainControl: !0 },
    });
    if (this.cerrado) return void e.getTracks().forEach((e) => e.stop());
    ((this.stream = e),
      e.getAudioTracks().forEach((e) =>
        e.addEventListener("ended", () => {
          !this.cerrado && this.cb.onPerdido && this.cb.onPerdido();
        }),
      ));
    const t = window.AudioContext || window.webkitAudioContext;
    ((this.ctx = new t()), "suspended" === this.ctx.state && (await this.ctx.resume().catch(() => {})));
    const o = this.ctx.createMediaStreamSource(this.stream);
    ((this.an = this.ctx.createAnalyser()),
      (this.an.fftSize = 1024),
      o.connect(this.an),
      (this.buf = new Float32Array(this.an.fftSize)),
      (this.suelo = 0.008),
      (this.nivel = 0),
      (this.mime =
        ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"].find(
          (e) => window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(e),
        ) || ""),
      (this.timer = setInterval(() => this.tick(), 30)));
  }
  cerrar() {
    ((this.cerrado = !0),
      clearInterval(this.timer),
      this._parar(),
      this.stream && this.stream.getTracks().forEach((e) => e.stop()),
      this.ctx && this.ctx.close().catch(() => {}),
      (this.stream = this.ctx = null),
      (this.modo = "pausa"));
  }
  get umbral() {
    return Math.max(0.014, 3.2 * this.suelo);
  }
  tick() {
    if (!this.an) return;
    this.an.getFloatTimeDomainData(this.buf);
    let e = 0;
    for (let t = 0; t < this.buf.length; t++) e += this.buf[t] * this.buf[t];
    const t = Math.sqrt(e / this.buf.length);
    this.nivel = 0.6 * this.nivel + 0.4 * t;
    const o = performance.now(),
      a = Math.min(250, Math.max(10, o - (this.tPrev || o - 30)));
    this.tPrev = o;
    const n = this.umbral;
    (this.cb.onNivel && this.cb.onNivel("pausa" === this.modo ? 0 : Math.min(1, this.nivel / (5 * n))),
      "escuchar" === this.modo
        ? (!this.hablando && t < n && (this.suelo = Math.min(0.05, 0.985 * this.suelo + 0.015 * t)),
          t > n
            ? ((this.voz += a),
              (this.silencio = 0),
              (this.tUltimaVoz = Date.now()),
              !this.hablando &&
                this.voz >= 180 &&
                ((this.hablando = !0), (this.tInicio = Date.now()), this.cb.onInicio && this.cb.onInicio()))
            : ((this.voz = Math.max(0, this.voz - a / 2)),
              this.hablando && ((this.silencio += a), this.silencio >= S.silencio && this.terminar())),
          this.hablando && Date.now() - this.tInicio > 6e4 && this.terminar(),
          !this.hablando && this.rec && Date.now() - this.tRec > 2e4 && this._grabar())
        : "vigilar" === this.modo &&
          (t > Math.max(2.6 * n, 0.05)
            ? ((this.vozB += a), this.vozB >= 320 && ((this.vozB = 0), this.cb.onInterrumpe && this.cb.onInterrumpe()))
            : (this.vozB = Math.max(0, this.vozB - a))));
  }
  escuchar() {
    ((this.modo = "escuchar"), (this.hablando = !1), (this.voz = 0), (this.silencio = 0), this._grabar());
  }
  nivelSolo() {
    (this._parar(), (this.modo = "nivel"));
  }
  vigilar() {
    (this._parar(), (this.modo = "vigilar"), (this.vozB = 0));
  }
  pausar() {
    (this._parar(), (this.modo = "pausa"));
  }
  terminar() {
    if ("escuchar" !== this.modo) return;
    const e = this.hablando ? Math.max(0, (this.tUltimaVoz || Date.now()) - this.tInicio) + 180 : 0,
      t = this.rec;
    if (((this.rec = null), (this.modo = "pausa"), t && this.hablando)) {
      t.onstop = () =>
        this.cb.onFrase && this.cb.onFrase(new Blob(t._trozos, { type: t.mimeType || this.mime || "audio/webm" }), e);
      try {
        t.stop();
      } catch (e) {
        this.cb.onNada && this.cb.onNada();
      }
    } else {
      if (t) {
        t.ondataavailable = null;
        try {
          t.stop();
        } catch (e) {}
      }
      this.cb.onNada && this.cb.onNada();
    }
  }
  _grabar() {
    if ((this._parar(), !window.MediaRecorder)) return;
    const e = new MediaRecorder(this.stream, this.mime ? { mimeType: this.mime } : void 0);
    ((e._trozos = []),
      (e.ondataavailable = (t) => {
        t.data && t.data.size && e._trozos.push(t.data);
      }));
    try {
      e.start(250);
    } catch (e) {
      return void (this.cb.onPerdido && this.cb.onPerdido());
    }
    ((this.rec = e), (this.tRec = Date.now()), (this.tUltimaVoz = 0));
  }
  _parar() {
    const e = this.rec;
    if (((this.rec = null), e)) {
      ((e.ondataavailable = null), (e.onstop = null));
      try {
        e.stop();
      } catch (e) {}
    }
  }
}
const ALUCINA =
    /^\s*(subt[ií]tulos|amara\.org|gracias por ver|suscr[ií]bete|thanks? (you )?for watching|www\.|¡?suscr)/i,
  MODELOS_OIDO_PLUS = ["gpt-transcribe", "gpt-4o-mini-transcribe"];
let oidoPlus = 0;
async function transcribir(e, t, o) {
  const a = /mp4|m4a|aac/.test(e.type) ? "m4a" : /ogg/.test(e.type) ? "ogg" : /wav/.test(e.type) ? "wav" : "webm",
    n = "openai" === t ? "openai" : "groq",
    r = baseDe(n) + "/audio/transcriptions",
    formulario = (t) => {
      const o = new FormData();
      return (
        o.append("file", e, "voz." + a),
        o.append("model", t),
        "openai" === n
          ? o.append("response_format", "json")
          : (o.append("response_format", "verbose_json"), o.append("temperature", "0")),
        o.append("language", idiomaCorto()),
        o
      );
    },
    i =
      "openai" === n
        ? MODELOS_OIDO_PLUS.slice(oidoPlus)
        : ["groq-hq" === t ? "whisper-large-v3" : "whisper-large-v3-turbo"];
  let s;
  for (const [e, t] of i.entries()) {
    try {
      s = await fetchConTiempo(
        n,
        r,
        { method: "POST", headers: { Authorization: "Bearer " + claveDe(n) }, body: formulario(t) },
        o,
      );
    } catch (e) {
      if (esAbort(e) || e instanceof ErrorApi) throw e;
      throw errorRed(n);
    }
    if (s.ok || (400 !== s.status && 404 !== s.status) || !(e < i.length - 1)) break;
    oidoPlus++;
  }
  if (!s.ok) throw errorHttp(n, s.status, await leerDetalle(s), "whisper");
  const c = await s.json(),
    l = String(c.text || "").trim(),
    d = Array.isArray(c.segments) ? c.segments : [];
  if (d.length) {
    if (d.reduce((e, t) => e + (t.no_speech_prob || 0), 0) / d.length > 0.65) return "";
  }
  return !l || ALUCINA.test(l) || /^[\s.,;:¡!¿?…\-]*$/.test(l) ? "" : l;
}
function vozElegida(e) {
  const t = S.vozSel[e];
  return t || ("groq" === e ? ("ar" === idiomaCorto() ? "lulwa" : "hannah") : (VOCES[e] && VOCES[e][0].id) || "");
}
async function sintetizar(e, t, o) {
  let a;
  if ("elevenlabs" === t) {
    const t = vozElegida("elevenlabs");
    a = await postJSON(
      "elevenlabs",
      `${baseDe("elevenlabs")}/text-to-speech/${encodeURIComponent(t)}?output_format=mp3_44100_128`,
      [
        {
          text: e,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.2, use_speaker_boost: !0 },
        },
        { text: e, model_id: "eleven_flash_v2_5" },
      ],
      { "Content-Type": "application/json", "xi-api-key": claveDe("elevenlabs"), Accept: "audio/mpeg" },
      o,
      "voz",
    );
  } else if ("openai" === t) {
    const t = IDIOMAS[idiomaCorto()] || "el idioma del texto";
    a = await postJSON(
      "openai",
      baseDe("openai") + "/audio/speech",
      [
        {
          model: "gpt-4o-mini-tts",
          voice: vozElegida("openai"),
          input: e,
          response_format: "mp3",
          instructions: `Habla en ${t}${"es-ES" === S.idioma ? " con acento de España" : ""}, con voz cálida, natural y expresiva, como una persona real en una conversación. Ritmo ágil.`,
        },
        { model: "gpt-4o-mini-tts", voice: "coral", input: e },
      ],
      { "Content-Type": "application/json", Authorization: "Bearer " + claveDe("openai") },
      o,
      "gpt-4o-mini-tts",
    );
  } else {
    if ("gemini" === t) {
      const t = {
          contents: [{ parts: [{ text: e }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: vozElegida("gemini") } } },
          },
        },
        a = await postJSON(
          "gemini",
          `${baseDe("gemini")}/models/gemini-3.8-flash-tts:generateContent`,
          [t],
          { "Content-Type": "application/json", "x-goog-api-key": claveDe("gemini") },
          o,
          "gemini-3.8-flash-tts",
        ),
        n = await a.json(),
        r = ((n.candidates && n.candidates[0] && n.candidates[0].content && n.candidates[0].content.parts) || []).find(
          (e) => e.inlineData,
        );
      if (!r) throw new ErrorApi(`${NOMBRE_TTS.gemini} no devolvió audio.`, { corto: "sin audio" });
      const i = Uint8Array.from(atob(r.inlineData.data), (e) => e.charCodeAt(0)),
        s = r.inlineData.mimeType || "";
      return i.length > 12 && "RIFF" === String.fromCharCode(i[0], i[1], i[2], i[3])
        ? new Blob([i], { type: "audio/wav" })
        : /wav|mpeg|mp3|ogg/.test(s)
          ? new Blob([i], { type: s })
          : pcmAWav(i, +((s.match(/rate=(\d+)/) || [])[1] || 24e3));
    }
    if ("groq" !== t) throw new ErrorApi("Motor de voz desconocido: " + t);
    {
      const t = "ar" === idiomaCorto();
      a = await postJSON(
        "groq",
        baseDe("groq") + "/audio/speech",
        [
          {
            model: t ? "canopylabs/orpheus-arabic-saudi" : "canopylabs/orpheus-v1-english",
            voice: vozElegida("groq"),
            input: e.slice(0, 200),
            response_format: "wav",
          },
        ],
        { "Content-Type": "application/json", Authorization: "Bearer " + claveDe("groq") },
        o,
        "orpheus",
      );
    }
  }
  const n = await a.blob();
  if (!n.size || /json|text/.test(n.type))
    throw new ErrorApi(`${NOMBRE_TTS[t]} no devolvió audio.`, { corto: "sin audio" });
  return n;
}
function pcmAWav(e, t) {
  const o = new DataView(new ArrayBuffer(44)),
    txt = (e, t) => [...t].forEach((t, a) => o.setUint8(e + a, t.charCodeAt(0)));
  return (
    txt(0, "RIFF"),
    o.setUint32(4, 36 + e.length, !0),
    txt(8, "WAVE"),
    txt(12, "fmt "),
    o.setUint32(16, 16, !0),
    o.setUint16(20, 1, !0),
    o.setUint16(22, 1, !0),
    o.setUint32(24, t, !0),
    o.setUint32(28, 2 * t, !0),
    o.setUint16(32, 2, !0),
    o.setUint16(34, 16, !0),
    txt(36, "data"),
    o.setUint32(40, e.length, !0),
    new Blob([o.buffer, e], { type: "audio/wav" })
  );
}
function vocesNavegador() {
  if (!("speechSynthesis" in window)) return [];
  const e = idiomaCorto(),
    t = speechSynthesis.getVoices(),
    puntos = (t) =>
      (t.lang.replace("_", "-") === S.idioma ? 4 : 0) +
      (t.lang.toLowerCase().startsWith(e) ? 10 : 0) +
      (/natural|neural|online/i.test(t.name) ? 3 : 0) +
      (/google/i.test(t.name) ? 2 : 0) +
      (t.localService ? 0 : 1);
  return t.filter((t) => t.lang.toLowerCase().startsWith(e)).sort((e, t) => puntos(t) - puntos(e));
}
let _uttActual = null,
  _avisoSinVoz = !1;
function hablarNavegador(e) {
  return new Promise((t) => {
    if (!("speechSynthesis" in window)) return t();
    const o = new SpeechSynthesisUtterance(e),
      a = vocesNavegador(),
      n =
        S.vozSel.navegador &&
        speechSynthesis
          .getVoices()
          .find((e) => e.name === S.vozSel.navegador && e.lang.toLowerCase().startsWith(idiomaCorto()));
    ((o.voice = n || a[0] || null), (o.lang = S.idioma), (o.rate = 1.04));
    let r = !1;
    const fin = () => {
        r || ((r = !0), clearTimeout(i), t());
      },
      i = setTimeout(
        () => {
          (speechSynthesis.cancel(), fin());
        },
        Math.max(6e3, 110 * e.length),
      );
    ((o.onend = fin),
      (o.onerror = (e) => {
        (!e ||
          /interrupted|canceled/.test(e.error) ||
          _avisoSinVoz ||
          ((_avisoSinVoz = !0),
          toast(
            "Este navegador no tiene ninguna voz para leer en voz alta. Configura una de las voces de Cece en el bloque de configuración del principio del archivo.",
            "mal",
            7e3,
          )),
          fin());
      }),
      (_uttActual = { fin: fin }),
      speechSynthesis.speak(o));
  });
}
function partirTexto(e, t) {
  const o = [];
  let a = String(e).trim();
  for (; a.length > t;) {
    let e = Math.max(a.lastIndexOf(". ", t), a.lastIndexOf(", ", t), a.lastIndexOf("; ", t));
    (e < 0.4 * t && (e = a.lastIndexOf(" ", t)),
      e <= 0 && (e = t),
      o.push(a.slice(0, e + 1).trim()),
      (a = a.slice(e + 1).trim()));
  }
  return (a && o.push(a), o);
}
class Altavoz {
  constructor(e = {}) {
    ((this.cb = e),
      (this.cola = []),
      (this.cerrado = !1),
      (this.parado = !1),
      (this.hablando = !1),
      (this.ctrl = new AbortController()),
      (this.audio = new Audio()));
  }
  decir(e) {
    if (this.parado) return;
    const t = "groq" === Voz.ttsCadena()[0] ? 190 : 700;
    for (const o of partirTexto(e, t)) o.trim() && this.cola.push({ texto: o });
    (this._prefetch(), this._despierta(), this._bucle());
  }
  cerrar() {
    ((this.cerrado = !0), this._despierta(), this._bucle());
  }
  _despierta() {
    if (this._wake) {
      const e = this._wake;
      ((this._wake = null), e());
    }
  }
  _prefetch() {
    let e = 0;
    for (const t of this.cola) {
      if (e++ >= 2) break;
      t.p || (t.p = this._sintetizar(t.texto));
    }
  }
  async _sintetizar(e) {
    for (const t of Voz.ttsCadena()) {
      if ("navegador" === t) break;
      if (!Voz.fallidos.has(t))
        try {
          const o = "groq" === t ? partirTexto(e, 190) : [e],
            a = [];
          for (const e of o) a.push(await sintetizar(e, t, this.ctrl.signal));
          return { blobs: a, motor: t, texto: e };
        } catch (e) {
          if (esAbort(e)) throw e;
          (errorDeCuenta(e) || "modelo no disponible" === e.corto || 404 === e.status) &&
            (Voz.fallidos.add(t),
            toast(`La voz de ${NOMBRE_TTS[t]} falló (${e.corto || "error"}). Uso otra.`, "mal", 5e3),
            Voz.refrescarEtiquetas());
        }
    }
    return { nav: !0, texto: e };
  }
  async _bucle() {
    if (!this.corriendo) {
      this.corriendo = !0;
      try {
        for (; !this.parado;) {
          if (!this.cola.length) {
            if (this.cerrado) break;
            await new Promise((e) => {
              this._wake = e;
            });
            continue;
          }
          const e = this.cola.shift();
          let t;
          (e.p || (e.p = this._sintetizar(e.texto)), this._prefetch());
          try {
            t = await e.p;
          } catch (e) {
            if (this.parado) break;
            continue;
          }
          if (this.parado) break;
          if ((this.hablando || ((this.hablando = !0), this.cb.onEmpieza && this.cb.onEmpieza()), t.nav))
            await hablarNavegador(t.texto);
          else
            for (const [e, o] of t.blobs.entries()) {
              if (this.parado) break;
              if (!(await this._reproducir(o)) && !this.parado) {
                0 === e && (await hablarNavegador(t.texto));
                break;
              }
            }
        }
      } finally {
        this.corriendo = !1;
        const e = this.hablando;
        ((this.hablando = !1), !this.parado && this.cb.onTermina && this.cb.onTermina(e));
      }
    }
  }
  _reproducir(e) {
    return new Promise((t) => {
      const o = URL.createObjectURL(e);
      let a = !1;
      const fin = (e) => {
        a || ((a = !0), (this._fin = null), URL.revokeObjectURL(o), t(!1 !== e));
      };
      ((this._fin = fin),
        (this.audio.onended = () => fin(!0)),
        (this.audio.onerror = () => fin(!1)),
        (this.audio.src = o));
      const n = this.audio.play();
      n && n.catch && n.catch(() => fin(!1));
    });
  }
  parar() {
    ((this.parado = !0), this.ctrl.abort());
    try {
      this.audio.pause();
    } catch (e) {}
    (this._fin && this._fin(),
      "speechSynthesis" in window && speechSynthesis.cancel(),
      _uttActual && _uttActual.fin(),
      this._despierta());
  }
}
class Troceador {
  constructor(e) {
    ((this.cb = e), (this.raw = ""), (this.hecho = 0), (this.n = 0));
  }
  meter(e) {
    ((this.raw += e), this._cortar(!1));
  }
  final() {
    this._cortar(!0);
  }
  _corte(e, t, o) {
    let a = !1;
    for (let n = 0; n < e.length; n++) {
      if (e.startsWith("```", n)) {
        if (((a = !a), (n += 2), !a && n + 1 >= t)) return n + 1;
        continue;
      }
      if (a) continue;
      const r = e[n],
        i = e[n + 1];
      if (("\n" === r || (".!?…:;".includes(r) && (void 0 === i ? o : /\s/.test(i)))) && n + 1 >= t) return n + 1;
    }
    if (!a && e.length > 260) {
      const t = Math.max(e.lastIndexOf(", ", 240), e.lastIndexOf(" ", 240));
      return t > 0 ? t + 1 : 240;
    }
    return -1;
  }
  _cortar(e) {
    let o = separarThink(this.raw).texto.slice(this.hecho);
    for (;;) {
      const t = this._corte(o, 0 === this.n ? 4 : 36, e);
      if (t <= 0) break;
      const a = o.slice(0, t);
      ((this.hecho += t), (o = o.slice(t)));
      const n = textoParaVoz(a);
      n && (this.n++, this.cb(n));
    }
    if (e && o.trim()) {
      this.hecho += o.length;
      const e = textoParaVoz(o);
      e && this.cb(e);
    }
  }
}
let lectorActual = null;
function pararLectura() {
  if (!lectorActual) return null;
  const e = lectorActual.boton;
  return (lectorActual.altavoz.parar(), (lectorActual = null), e && (e.textContent = "🔊 Leer"), e);
}
function leerEnVoz(e, t) {
  if (lectorActual && pararLectura() === t && t) return;
  const o = new Altavoz({
    onTermina: () => {
      lectorActual && lectorActual.altavoz === o && ((lectorActual = null), t && (t.textContent = "🔊 Leer"));
    },
  });
  ((lectorActual = { altavoz: o, boton: t }), t && (t.textContent = "⏹ Parar"));
  const a = new Troceador((e) => o.decir(e));
  (a.meter(e), a.final(), o.cerrar());
}
const ICONOS = {
    idle: "🎤",
    listening: "👂",
    hearing: "🗣️",
    transcribing: "✍️",
    thinking: "💭",
    speaking: "🔊",
    error: "⚠️",
    mute: "🔇",
  },
  TEXTOS = {
    idle: "Toca el círculo para hablar",
    listening: "Te escucho…",
    hearing: "Te escucho…",
    transcribing: "Entendiendo…",
    thinking: "Pensando…",
    speaking: "Hablando… (habla para cortarme)",
    error: "Algo falló — toca para reintentar",
    mute: "Micrófono en pausa — toca para seguir",
  },
  Voz = {
    activo: !1,
    modo: null,
    estado: "idle",
    mic: null,
    altavoz: null,
    ctrl: null,
    sr: null,
    mute: !1,
    liveHist: [],
    fallidos: new Set(),
    turno: 0,
    sttMotor() {
      const e = !!claveDe("groq"),
        t = !!claveDe("openai"),
        o = S.stt;
      return "navegador" === o
        ? "navegador"
        : ("groq" !== o && "groq-hq" !== o) || !e
          ? "openai" === o && t
            ? "openai"
            : e
              ? "groq"
              : t
                ? "openai"
                : "navegador"
          : o;
    },
    sttCadena() {
      const e = this.sttMotor();
      if ("navegador" === e) return ["navegador"];
      const t = /^groq/.test(e) ? (claveDe("openai") ? "openai" : null) : claveDe("groq") ? "groq" : null;
      return t ? [e, t] : [e];
    },
    ttsCadena() {
      const ok = (e) => "navegador" === e || (!!claveDe(e) && ("groq" !== e || ["en", "ar"].includes(idiomaCorto())));
      return [
        ...("auto" === S.voz ? ["elevenlabs", "openai", "gemini", "groq"] : [S.voz]).filter(
          (e) => "navegador" !== e && ok(e),
        ),
        "navegador",
      ];
    },
    nivelLive: () =>
      "igual" === S.liveModelo
        ? CECE_MAP[S.modelo] && !CECE_MAP[S.modelo].pro
          ? S.modelo
          : "cece-turbo"
        : CECE_MAP[S.liveModelo] && !CECE_MAP[S.liveModelo].pro
          ? S.liveModelo
          : "cece-turbo",
    refrescarEtiquetas() {
      const e = this.nivelLive(),
        t = CECE_MAP[e],
        o = motoresDe(e)[0],
        a = this.ttsCadena().find((e) => !this.fallidos.has(e)) || "navegador",
        n = $("liveTag");
      n && (n.textContent = t.label + (o ? " · " + etiquetaMotor(o) : ""));
      const r = $("liveMotores");
      r &&
        (r.textContent = `Oído: ${NOMBRE_STT[this.sttMotor()]} · Cerebro: ${o ? etiquetaMotor(o) : "sin clave"} · Voz: ${NOMBRE_TTS[a]}${S.web && motorBusca(o) ? " · 🌐 internet" : ""}`);
      const i = $("vozEstado");
      if (i) {
        let e = `Ahora: oído ${NOMBRE_STT[this.sttMotor()]}, voz ${NOMBRE_TTS[a]}.`;
        ("groq" !== S.voz || ["en", "ar"].includes(idiomaCorto()) || (e += " Esta voz solo habla inglés y árabe."),
          (i.className = "api-test"),
          (i.textContent = e));
      }
    },
    ponerEstado(e, t) {
      if (((this.estado = e), "live" === this.modo)) {
        (($("liveOverlay").dataset.st = e),
          ($("liveOrbIcon").textContent = ICONOS[e] || "🎤"),
          ($("liveStatus").textContent = t || TEXTOS[e] || ""),
          ($("liveMute").textContent = this.mute ? "🔇 Micro en pausa" : "🎙️ Micro activo"),
          $("liveMute").classList.toggle("on", this.mute),
          aplicarEmojis($("liveOverlay")));
      } else if ("mic" === this.modo) {
        if ("error" === e && this.activo) return (toast(t || TEXTOS.error, "mal", 7e3), void this.detener());
        const o = $("micBtn");
        (o.classList.toggle("mic-on", this.activo),
          o.classList.toggle("mic-escucha", "listening" === e || "hearing" === e));
        const a = {
          listening: "🎤 Te escucho… (pulsa 🎤 para salir)",
          hearing: "🗣️ Te escucho…",
          transcribing: "✍️ Entendiendo…",
          thinking: "💭 Pensando…",
          speaking: "🔊 Hablando… (habla para cortar)",
        };
        $("userInput").placeholder = (this.activo && a[e]) || textoEntrada();
      }
    },
    nivelOrbe(e) {
      "live" === this.modo &&
        $("liveOrb").style.setProperty(
          "--lvl",
          "listening" === this.estado || "hearing" === this.estado ? e.toFixed(3) : 0,
        );
    },
    async iniciar(e) {
      if (this.activo) {
        if (this.modo === e) return;
        this.detener();
      }
      const t = "live" === e ? this.nivelLive() : S.modelo;
      if (!("cece-pro" === t ? hayAlgunaClave() : motoresDe(t).length))
        return void toast(
          hayAlgunaClave()
            ? `${CECE_MAP[t].nombre} no tiene configuración disponible.`
            : "Falta rellenar el bloque de configuración del principio del archivo.",
          "mal",
          5e3,
        );
      if (
        (generando && detener(),
        pararLectura(),
        this.fallidos.clear(),
        (this.modo = e),
        (this.activo = !0),
        (this.mute = !1),
        this.turno++,
        "live" === e)
      ) {
        ($("liveOverlay").classList.add("active"),
          ($("liveUser").textContent = ""),
          ($("liveIa").textContent = ""),
          $("liveBtn").classList.add("active-live"),
          (this._foco = document.activeElement));
        for (const e of fondoLive()) e.inert = !0;
        $("liveOrb").focus();
      }
      (this.refrescarEtiquetas(), this.ponerEstado("idle", "Abriendo el micrófono…"));
      const o = (this.mic = new Microfono({
          onNivel: (e) => this.nivelOrbe(e),
          onInicio: () => {
            "listening" === this.estado && this.ponerEstado("hearing");
          },
          onFrase: (e, t) => this.alTerminarFrase(e, t),
          onNada: () => this.escuchar(),
          onInterrumpe: () => {
            !S.interrumpir ||
              this.mute ||
              ("speaking" !== this.estado && "thinking" !== this.estado) ||
              this.interrumpir();
          },
          onPerdido: () => {
            this.mic === o &&
              this.activo &&
              (o.cerrar(),
              (this.mic = null),
              this.turno++,
              this.ctrl && (this.ctrl.abort(), (this.ctrl = null)),
              "mic" === this.modo && generando && detener(),
              this.altavoz && (this.altavoz.parar(), (this.altavoz = null)),
              toast("Se ha perdido el micrófono.", "mal", 6e3),
              this.ponerEstado("error", "Se perdió el micrófono — toca para reintentar"));
          },
        })),
        caducado = () => this.mic !== o || !this.activo;
      try {
        await o.abrir();
      } catch (t) {
        if ((o.cerrar(), caducado())) return;
        const n =
          t && ("NotAllowedError" === t.name || "SecurityError" === t.name)
            ? "No hay permiso para el micrófono. Permítelo en el candado de la barra de direcciones."
            : t && "NotFoundError" === t.name
              ? "No se encuentra ningún micrófono."
              : "No se pudo abrir el micrófono: " + (t.message || t);
        return (
          (this.mic = null),
          "mic" === e
            ? (toast(n, "mal", 7e3), void this.detener())
            : (toast(n, "mal", 7e3), void this.ponerEstado("error", n))
        );
      }
      caducado() ? o.cerrar() : this.escuchar();
    },
    detener() {
      (this.turno++,
        this.ctrl && this.ctrl.abort(),
        (this.ctrl = null),
        this.altavoz && this.altavoz.parar(),
        (this.altavoz = null),
        this._pararSR(),
        this.mic && this.mic.cerrar(),
        (this.mic = null));
      const e = this.modo;
      if (((this.activo = !1), "live" === e)) {
        ($("liveOverlay").classList.remove("active"), $("liveBtn").classList.remove("active-live"));
        for (const e of fondoLive()) e.inert = !1;
        const e = this._foco && document.contains(this._foco) ? this._foco : $("liveBtn");
        ((this._foco = null), e && e.focus && e.focus());
      }
      (this.ponerEstado("idle"),
        "mic" === e && ($("micBtn").classList.remove("mic-on", "mic-escucha"), generando && detener()),
        (this.modo = null));
    },
    escuchar() {
      if (this.activo && this.mic) {
        if ((this.altavoz && (this.altavoz.parar(), (this.altavoz = null)), this.mute))
          return (this.mic.pausar(), void this.ponerEstado("mute"));
        (this.ponerEstado("listening"),
          "navegador" === this.sttMotor() ? this._escucharNavegador() : this.mic.escuchar());
      }
    },
    interrumpir() {
      (this.turno++,
        this.ctrl && this.ctrl.abort(),
        (this.ctrl = null),
        "mic" === this.modo && generando && detener(),
        this.altavoz && (this.altavoz.parar(), (this.altavoz = null)),
        this.escuchar());
    },
    tocarOrbe() {
      if (!this.activo) return this.iniciar("live");
      if (!this.mic) {
        const e = this.modo;
        return (this.detener(), this.iniciar(e));
      }
      const e = this.estado;
      "mute" === e || "idle" === e || "error" === e
        ? ((this.mute = !1), this.escuchar())
        : "hearing" === e
          ? this.sr
            ? this.sr.stop()
            : this.mic.terminar()
          : "listening" === e
            ? ((this.mute = !0), this._pararSR(), this.mic.pausar(), this.ponerEstado("mute"))
            : this.interrumpir();
    },
    _escucharNavegador() {
      const e = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!e)
        return void this.ponerEstado(
          "error",
          "Este navegador no reconoce voz. Configura el Oído Cece en el bloque de configuración del principio del archivo.",
        );
      (this._pararSR(), this.mic.nivelSolo());
      const t = new e();
      ((t.lang = S.idioma), (t.interimResults = !0), (t.continuous = !1));
      let o = "";
      ((t.onresult = (e) => {
        let t = "";
        for (let a = e.resultIndex; a < e.results.length; a++)
          e.results[a].isFinal ? (o += e.results[a][0].transcript) : (t += e.results[a][0].transcript);
        ("listening" === this.estado && this.ponerEstado("hearing"),
          "live" === this.modo && ($("liveUser").textContent = (o + " " + t).trim() + "…"));
      }),
        (t.onerror = (e) => {
          if ("no-speech" === e.error || "aborted" === e.error) return;
          this.sr = null;
          const t =
            "not-allowed" === e.error
              ? "El navegador no deja usar su reconocimiento de voz aquí. Configura el Oído Cece en el bloque de configuración del principio del archivo."
              : "Error de reconocimiento: " + e.error;
          this.ponerEstado("error", t);
        }),
        (t.onend = () => {
          this.sr === t &&
            ((this.sr = null),
            this.activo &&
              (o.trim()
                ? this.responder(o.trim())
                : ("listening" !== this.estado && "hearing" !== this.estado) || this._escucharNavegador()));
        }),
        (this.sr = t));
      try {
        t.start();
      } catch (e) {}
    },
    _pararSR() {
      const e = this.sr;
      if (((this.sr = null), e)) {
        e.onend = null;
        try {
          e.abort();
        } catch (e) {}
      }
    },
    async alTerminarFrase(e, t) {
      if (!this.activo) return;
      if (t < 300 || e.size < 1500) return this.escuchar();
      const o = ++this.turno;
      (this.ponerEstado("transcribing"), this.mic && this.mic.pausar());
      let a = "";
      this.ctrl = new AbortController();
      const n = this.sttCadena();
      for (const [t, r] of n.entries())
        try {
          a = await transcribir(e, r, this.ctrl.signal);
          break;
        } catch (e) {
          if (esAbort(e) || o !== this.turno) return;
          if (t < n.length - 1) continue;
          return (
            toast("No pude entenderte: " + (e.corto || e.message), "mal", 5e3),
            "clave no válida" === e.corto ? void this.ponerEstado("error", e.message) : this.escuchar()
          );
        }
      return o === this.turno && this.activo ? (a ? void this.responder(a) : this.escuchar()) : void 0;
    },
    async responder(e) {
      const t = ++this.turno;
      (pararLectura(),
        this.ponerEstado("thinking"),
        this.mic && (S.interrumpir ? this.mic.vigilar() : this.mic.pausar()));
      const o = (this.altavoz = new Altavoz({
          onEmpieza: () => {
            t === this.turno && this.ponerEstado("speaking");
          },
          onTermina: () => {
            t === this.turno &&
              this.activo &&
              ((this.altavoz = null),
              S.autoEscucha
                ? this.escuchar()
                : "mic" === this.modo
                  ? this.detener()
                  : (this.mic && this.mic.pausar(), this.ponerEstado("idle")));
          },
        })),
        a = new Troceador((e) => o.decir(e));
      if ("mic" === this.modo) {
        if (generando) {
          detener();
          for (let e = 0; generando && e < 100; e++) await sleep(20);
        }
        if (t !== this.turno || !this.activo) return;
        const n = await enviar(e, { voz: !0 });
        if (t !== this.turno || !this.activo) return;
        return (n && (a.meter(n), a.final()), void o.cerrar());
      }
      if (S.vozChat && (await Adjuntos.hidratar(historial), t !== this.turno || !this.activo)) return;
      (($("liveUser").textContent = "«" + e + "»"), ($("liveIa").textContent = ""));
      const n = this.nivelLive();
      let r = null;
      S.vozChat
        ? (pintarUsuario(e), historial.push({ role: "user", content: e }), (r = new Burbuja()))
        : this.liveHist.push({ role: "user", content: e });
      const i = S.vozChat ? historialApi(20, 3e4) : this.liveHist.slice(-16);
      this.ctrl = new AbortController();
      const s = performance.now();
      let c = "";
      try {
        const e = await llamarCece(n, {
          mensajes: i,
          sistema: sistemaLive(n),
          avisoWeb: AVISO_WEB_LIVE,
          maxTok: 900,
          esf: "bajo",
          rapido: !0,
          signal: this.ctrl.signal,
          onTexto: (e) => {
            if (t !== this.turno) return;
            ((c += e), ($("liveIa").textContent = textoParaVoz(separarThink(c).texto)));
            const o = $("liveIa").parentElement;
            ((o.scrollTop = o.scrollHeight), a.meter(e), r && r.meter(e));
          },
          onActividad: (e) => {
            t === this.turno && (($("liveStatus").textContent = e), r && r.meterActividad(e));
          },
          onSalto: (e) => {
            t === this.turno && ($("liveStatus").textContent = `${etiquetaMotor(e)} falló, probando otro…`);
          },
        });
        if (t !== this.turno) return;
        (a.final(), o.cerrar());
        const l = contar(e, e.texto, (performance.now() - s) / 1e3),
          d = "Cece Live · " + etiquetaMotor(e.motor);
        r
          ? (historial.push({ role: "assistant", content: e.texto, via: d }),
            guardarActual(),
            (r.texto = e.texto),
            await r.terminar(),
            r.fuentes(e.fuentes),
            r.pieDePagina({ via: d, tokens: l.tokens, tps: l.tps, texto: e.texto }),
            Codigo.procesar(e.texto, r.bubble))
          : this.liveHist.push({ role: "assistant", content: e.texto });
      } catch (e) {
        if ((r && finalizarConError(r, e, []), esAbort(e) || t !== this.turno)) return;
        (o.parar(),
          (this.altavoz = null),
          ($("liveIa").textContent = "❌ " + e.message),
          this.ponerEstado("error", e.corto ? "Error: " + e.corto + " — toca para reintentar" : void 0),
          this.mic && this.mic.pausar());
      }
    },
  },
  fondoLive = () =>
    [
      document.querySelector(".topbar"),
      $("chatArea"),
      document.querySelector(".inputbar"),
      $("settingsOverlay"),
    ].filter(Boolean);
function sistemaLive(e) {
  const t = CECE_MAP[e],
    o = IDIOMAS[idiomaCorto()] || "el idioma del usuario",
    a = new Date().toLocaleString("es-ES", { dateStyle: "full", timeStyle: "short" });
  return `Eres Cece AI (${t.nombre}) de Cece Company, en modo Cece Live: una conversación por voz en tiempo real, como una llamada. Lo que escribas se leerá en voz alta. Habla en ${o}, de forma natural, cálida y cercana, con frases cortas. Normalmente responde en 1 a 3 frases; alarga solo si te lo piden. No uses Markdown, listas, tablas, emojis ni símbolos raros. Si el usuario pide código, ponlo en un bloque de código (lo verá en el chat) y por voz explica solo lo esencial. El texto viene de un reconocedor de voz y puede tener errores: si algo no tiene sentido, pide que lo repita. Fecha y hora: ${a}.`;
}
const AVISO_WEB_LIVE = {
  si: "Si hace falta información actual, búscala en internet y di el dato sin leer enlaces.",
  no: "Ahora no puedes buscar en internet: si te preguntan algo de actualidad, dilo con naturalidad y responde con lo que sabes, sin inventar.",
};
function pintarVoces() {
  const e = $("vozSel");
  if (!e) return;
  const t = "auto" === S.voz ? Voz.ttsCadena()[0] : S.voz;
  let o;
  o =
    "elevenlabs" === t
      ? VOCES.elevenlabs
      : "gemini" === t
        ? VOCES.gemini
        : "groq" === t
          ? "ar" === idiomaCorto()
            ? VOCES.groqAr
            : VOCES.groq
          : "openai" === t
            ? VOCES.openai
            : vocesNavegador().map((e) => ({
                id: e.name,
                nombre: `${e.name.replace(/^(Google|Microsoft|Apple)\s+/i, "").replace(/\s*-\s*.*$/, "") || e.name} (${e.lang})`,
              }));
  const a = S.vozSel[t] || (o[0] && o[0].id) || "";
  ((e.innerHTML =
    `<optgroup label="${esc(NOMBRE_TTS[t])}">` +
    (o.length
      ? o.map((e) => `<option value="${esc(e.id)}"${e.id === a ? " selected" : ""}>${esc(e.nombre)}</option>`).join("")
      : '<option value="">(sin voces para este idioma)</option>') +
    "</optgroup>"),
    (e.dataset.motor = t),
    Voz.refrescarEtiquetas());
}
function pintarAjustesVoz() {
  (($("sttMotor").value = S.stt),
    ($("vozMotor").value = S.voz),
    ($("vozIdioma").value = S.idioma),
    ($("swAutoEscucha").checked = S.autoEscucha),
    ($("swInterrumpir").checked = S.interrumpir),
    ($("swVozChat").checked = S.vozChat),
    ($("silencioMs").value = S.silencio),
    ($("silencioVal").textContent = S.silencio),
    ($("liveModelo").innerHTML =
      '<option value="igual">Igual que el chat (Pro → Turbo)</option>' +
      CECE.filter((e) => !e.pro)
        .map((e) => `<option value="${e.id}">${esc(e.nombre)}${"cece-turbo" === e.id ? " (rápido)" : ""}</option>`)
        .join("")),
    ($("liveModelo").value = S.liveModelo),
    pintarVoces());
}
let _volverFoco = null;
function ajustesLiveAbiertos() {
  const e = $("liveSettingsModal");
  return !!e && e.classList.contains("active");
}
function abrirAjustesLive() {
  const e = $("liveSettingsModal");
  e &&
    ((_volverFoco = document.activeElement),
    pintarAjustesVoz(),
    e.classList.add("active"),
    e.removeAttribute("aria-hidden"),
    $("liveSettingsClose").focus());
}
function cerrarAjustesLive() {
  const e = $("liveSettingsModal");
  e &&
    e.classList.contains("active") &&
    (e.classList.remove("active"),
    e.setAttribute("aria-hidden", "true"),
    _volverFoco && document.contains(_volverFoco) && _volverFoco.focus(),
    (_volverFoco = null));
}
function conectarAjustesLive() {
  const e = $("liveSettingsModal");
  e &&
    ($("liveSettingsBtn").addEventListener("click", abrirAjustesLive),
    $("liveSettingsClose").addEventListener("click", cerrarAjustesLive),
    $("liveSettingsApply").addEventListener("click", cerrarAjustesLive),
    cerrarAlPulsarFuera(e, cerrarAjustesLive),
    e.addEventListener("keydown", (t) => {
      if ("Tab" !== t.key) return;
      const o = [...e.querySelectorAll('button, select, input, [tabindex]:not([tabindex="-1"])')].filter(
        (e) => !e.disabled && e.getClientRects().length,
      );
      if (!o.length) return;
      const a = o[0],
        n = o[o.length - 1];
      !t.shiftKey || (document.activeElement !== a && e.contains(document.activeElement))
        ? t.shiftKey || document.activeElement !== n || (t.preventDefault(), a.focus())
        : (t.preventDefault(), n.focus());
    }));
}
function conectarVoz() {
  ($("liveBtn").addEventListener("click", () =>
    Voz.activo && "live" === Voz.modo ? Voz.detener() : Voz.iniciar("live"),
  ),
    $("liveOrb").addEventListener("click", () => Voz.tocarOrbe()),
    $("liveSalir").addEventListener("click", () => Voz.detener()),
    $("liveCortar").addEventListener("click", () => {
      Voz.activo && ((Voz.mute = !1), Voz.interrumpir());
    }),
    $("liveMute").addEventListener("click", () => {
      Voz.activo &&
        Voz.mic &&
        ((Voz.mute = !Voz.mute),
        Voz.mute
          ? (Voz._pararSR(),
            "listening" === Voz.estado || "hearing" === Voz.estado
              ? (Voz.mic.pausar(), Voz.ponerEstado("mute"))
              : Voz.ponerEstado(Voz.estado))
          : "mute" === Voz.estado
            ? Voz.escuchar()
            : Voz.ponerEstado(Voz.estado));
    }),
    $("micBtn").addEventListener("click", (e) => {
      (animarBoton(e.currentTarget), Voz.activo && "mic" === Voz.modo ? Voz.detener() : Voz.iniciar("mic"));
    }),
    conectarAjustesLive(),
    $("sttMotor").addEventListener("change", (e) => {
      ((S.stt = e.target.value), guardarAjustes(), Voz.refrescarEtiquetas());
    }),
    $("vozMotor").addEventListener("change", (e) => {
      ((S.voz = e.target.value), Voz.fallidos.clear(), guardarAjustes(), pintarVoces());
    }),
    $("vozSel").addEventListener("change", (e) => {
      ((S.vozSel[e.target.dataset.motor] = e.target.value), guardarAjustes());
    }),
    $("vozIdioma").addEventListener("change", (e) => {
      ((S.idioma = e.target.value), guardarAjustes(), pintarVoces());
    }),
    $("liveModelo").addEventListener("change", (e) => {
      ((S.liveModelo = e.target.value), guardarAjustes(), Voz.refrescarEtiquetas());
    }),
    $("swAutoEscucha").addEventListener("change", (e) => {
      ((S.autoEscucha = e.target.checked), guardarAjustes());
    }),
    $("swInterrumpir").addEventListener("change", (e) => {
      ((S.interrumpir = e.target.checked), guardarAjustes());
    }),
    $("swVozChat").addEventListener("change", (e) => {
      ((S.vozChat = e.target.checked), guardarAjustes());
    }),
    $("silencioMs").addEventListener("input", (e) => {
      ((S.silencio = +e.target.value), ($("silencioVal").textContent = S.silencio), guardarAjustes());
    }),
    $("vozProbar").addEventListener("click", (e) => {
      Voz.fallidos.clear();
      const t = {
        es: "Hola, soy Cece. Así sueno cuando hablamos en Cece Live.",
        en: "Hi, I'm Cece. This is how I sound in Cece Live.",
        fr: "Bonjour, je suis Cece.",
        de: "Hallo, ich bin Cece.",
        it: "Ciao, sono Cece.",
        pt: "Olá, eu sou a Cece.",
        ca: "Hola, sóc la Cece.",
      };
      (leerEnVoz(t[idiomaCorto()] || t.es, null), Voz.refrescarEtiquetas());
    }),
    "speechSynthesis" in window &&
      speechSynthesis.addEventListener("voiceschanged", () => {
        "navegador" === $("vozSel").dataset.motor && pintarVoces();
      }));
}
function paso(e) {
  try {
    const t = e();
    t && t.catch && t.catch((e) => console.error(e));
  } catch (e) {
    console.error(e);
  }
}
function mensajeValido(e) {
  if (!e || "object" != typeof e || "string" != typeof e.content || ("user" !== e.role && "assistant" !== e.role))
    return null;
  const t = { role: e.role, content: e.content };
  ("string" == typeof e.via && (t.via = viaCece(e.via)),
    !0 === e.imagen && (t.imagen = !0),
    !0 === e.local && (t.local = !0),
    !0 === e.pendiente && "user" === e.role && (t.pendiente = !0),
    "string" == typeof e.mostrar && (t.mostrar = e.mostrar),
    Array.isArray(e.cmds) && (t.cmds = e.cmds.filter((e) => "string" == typeof e)));
  const o = adjuntosValidos(e.adjuntos);
  return (o && (t.adjuntos = o), t.content || t.adjuntos || (t.cmds && t.cmds.length) ? t : null);
}
function iniciarCece() {
  (paso(() => Boveda.iniciar()),
    paso(avisoConsola),
    paso(aplicarApariencia),
    paso(conectarComandos),
    paso(conectarAjustes),
    paso(conectarVoz),
    paso(conectarAdjuntos),
    paso(conectarBoveda),
    paso(conectarApariencia),
    paso(conectarPlugins),
    paso(conectarOffline),
    paso(conectarHub),
    paso(conectarNube),
    paso(conectarConexiones),
    paso(ordenarAjustes),
    paso(conectarRespuestas),
    paso(conectarNavAjustes),
    paso(prepararHojasEmoji),
    paso(pintarMarca),
    paso(() => {
      (reloj(), setInterval(reloj, 1e3));
    }),
    paso(ondas),
    paso(() => {
      $("swWeb").checked = S.web;
    }),
    paso(pintarEsfuerzo),
    paso(pintarPro),
    paso(pintarVelocidad),
    paso(pintarEmojiOpciones),
    paso(() => {
      (($("swPantalla").checked = S.pantalla),
        ($("autoZipChk").checked = S.autoZip),
        ($("swStream").checked = S.stream),
        ($("imgMotor").value = S.imgMotor),
        ($("imgModeloOpenai").value = S.imgModeloOpenai));
    }),
    paso(pintarCarpetas),
    paso(pintarAjustesVoz),
    paso(pintarApariencia),
    paso(pintarPlugins),
    paso(pintarOffline),
    paso(() => CeceHub.iniciar()),
    paso(pintarNube),
    paso(pintarSeguridad),
    paso(pintarRespuestas),
    paso(() => {
      almacen.ok || ($("avisoAlmacen").style.display = "");
    }),
    paso(montarMenuNiveles),
    paso(ponerNivelLocal),
    paso(() => elegirNivel(S.modelo, !0)),
    paso(aplicarModoCode),
    paso(pintarModoImagen),
    paso(() => {
      const e = almacen.get("cece_actual", null);
      e &&
        Array.isArray(e.mensajes) &&
        e.mensajes.length &&
        ((historial = e.mensajes.map(mensajeValido).filter(Boolean)),
        (convId = "string" == typeof e.id ? e.id : uid()));
      const t = convs.find((e) => e.id === convId);
      Nube.firma = t ? firmaConv(t.mensajes) : convsBorradas()[convId] ? firmaConv(historial) : "[]";
    }),
    paso(pintarHistorial),
    paso(() => Codigo.cargar()),
    paso(() => aplicarEmojis()),
    paso(() => Red.iniciar()),
    paso(() => $("userInput").focus()),
    paso(() => setTimeout(() => Adjuntos.limpiarHuerfanos(adjuntosEnUso()), 4e3)),
    paso(async () => {
      Boveda.necesitaDesbloqueo()
        ? (await Boveda.probarRecordada())
          ? clavesCambiadas()
          : mostrarBloqueo(!0)
        : Nube.alCambiarClaves();
    }));
}
(window.addEventListener("error", (e) => {
  e.message &&
    !/ResizeObserver/.test(e.message) &&
    (console.error(e.error || e.message), toast("Error interno: " + e.message, "mal", 6e3));
}),
  window.addEventListener("unhandledrejection", (e) => {
    const t = e.reason;
    esAbort(t) || (console.error(t), toast("Error: " + ((t && t.message) || t), "mal", 6e3));
  }),
  "loading" === document.readyState ? document.addEventListener("DOMContentLoaded", iniciarCece) : iniciarCece());
