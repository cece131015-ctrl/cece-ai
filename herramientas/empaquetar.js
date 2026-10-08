#!/usr/bin/env node
/* Mete fuente/ dentro de cece-ai.html: minimiza fuente/programa.js (con el servidor de fuente/cecehub-server.py
   dentro) y sustituye el programa empaquetado del HTML. El resto del HTML (estilos, bloque de claves, emojis) se
   edita directamente en cece-ai.html.
   Uso: node herramientas/empaquetar.js [destino.html]   (de fábrica, cece-ai.html) */
"use strict";
const path = require("path");
const { RUTAS, MARCADOR_PY, leerCarga, ponerCarga, leer, escribir } = require("./comun");

async function main() {
  const destino = path.resolve(process.argv[2] || RUTAS.html);
  const html = leer(RUTAS.html);
  const { semilla } = leerCarga(html);
  const pagina = leer(RUTAS.pagina);
  const python = leer(RUTAS.python);
  let fuente = leer(RUTAS.programa);

  // La versión que Cece dice llevar dentro tiene que ser la del servidor que lleva dentro
  const vJs = (/\bCECEHUB_VERSION\s*=\s*"([^"]+)"/.exec(fuente) || [])[1];
  const vPy = (/^VERSION\s*=\s*'([^']+)'/m.exec(python) || [])[1];
  if (!vJs || vJs !== vPy) throw new Error(`CECEHUB_VERSION (${vJs}) no coincide con VERSION de cecehub-server.py (${vPy}).`);

  if (fuente.split(MARCADOR_PY).length !== 2) throw new Error(`El marcador ${MARCADOR_PY} tiene que aparecer una vez.`);
  fuente = fuente.replace(MARCADOR_PY, () => JSON.stringify(python));

  const { minify } = require("terser");
  const r = await minify(fuente, {
    ecma: 2022,
    compress: { passes: 2 }, // (keep_fargs sigue activo: la calculadora usa la aridad de sus funciones)
    mangle: true, // solo nombres locales: los globales del programa se quedan como están
    format: { comments: false },
  });
  const programa = r.code;

  escribir(destino, ponerCarga(html, pagina, programa, semilla));
  // comprobación: lo empaquetado se lee igual
  const vuelta = leerCarga(leer(destino));
  if (vuelta.pagina !== pagina || vuelta.programa !== programa) throw new Error("El empaquetado no se lee igual.");
  console.log(`✅ fuente/ → ${path.basename(destino)} (programa ${programa.length} B)`);
}

main().catch((e) => {
  console.error("❌ " + e.message);
  process.exit(1);
});
