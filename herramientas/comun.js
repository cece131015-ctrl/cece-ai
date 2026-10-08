/* Piezas comunes de desempaquetar.js y empaquetar.js.
   El programa va dentro de cece-ai.html como texto Base64 mezclado (XOR) con una secuencia xorshift32;
   la «semilla» es el número que va justo detrás. Es lo mismo que hace el cargador del propio archivo. */
"use strict";
const fs = require("fs");
const path = require("path");

const RAIZ = path.resolve(__dirname, "..");
const RUTAS = {
  html: path.join(RAIZ, "cece-ai.html"),
  pagina: path.join(RAIZ, "fuente", "pagina.html"),
  programa: path.join(RAIZ, "fuente", "programa.js"),
  python: path.join(RAIZ, "fuente", "cecehub-server.py"),
};
// En fuente/programa.js el servidor de Python va como marcador: se mete al empaquetar
const MARCADOR_PY = '"@@CECEHUB_PY@@"';

// '...})(\n"BASE64", SEMILLA);' al final del cargador
const RE_CARGA = /(\}\)\(\s*")([A-Za-z0-9+/=]+)(",\s*)(-?\d+)(\);)/;

function mezclar(bytes, semilla) {
  const out = Buffer.alloc(bytes.length);
  let x = semilla | 0;
  for (let i = 0; i < bytes.length; i++) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    out[i] = (bytes[i] ^ x) & 255;
  }
  return out;
}

function leerCarga(html) {
  const m = RE_CARGA.exec(html);
  if (!m) throw new Error("No encuentro el programa empaquetado en el HTML.");
  const semilla = Number(m[4]);
  const json = mezclar(Buffer.from(m[2], "base64"), semilla).toString("utf8");
  const [pagina, programa] = JSON.parse(json);
  return { pagina, programa, semilla };
}

function ponerCarga(html, pagina, programa, semilla) {
  if (!RE_CARGA.test(html)) throw new Error("No encuentro el programa empaquetado en el HTML.");
  const b64 = mezclar(Buffer.from(JSON.stringify([pagina, programa]), "utf8"), semilla).toString("base64");
  return html.replace(RE_CARGA, (_, a, _b, c, d, e) => a + b64 + c + d + e);
}

const leer = (r) => fs.readFileSync(r, "utf8");
const escribir = (r, t) => fs.writeFileSync(r, t);

module.exports = { RAIZ, RUTAS, MARCADOR_PY, leerCarga, ponerCarga, leer, escribir };
