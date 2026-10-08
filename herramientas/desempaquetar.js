#!/usr/bin/env node
/* Saca el programa de cece-ai.html a fuente/ para poder leerlo y editarlo:
     fuente/pagina.html        el HTML de la interfaz (se inserta al abrir el archivo)
     fuente/programa.js        el JavaScript, formateado (con el marcador "@@CECEHUB_PY@@")
     fuente/cecehub-server.py  el servidor CeceHub que Cece ofrece para descargar
   Uso: node herramientas/desempaquetar.js [cece-ai.html]
   ⚠️ Sobrescribe lo que haya en fuente/. */
"use strict";
const path = require("path");
const { RUTAS, MARCADOR_PY, leerCarga, leer, escribir } = require("./comun");

async function main() {
  const origen = path.resolve(process.argv[2] || RUTAS.html);
  const { pagina, programa } = leerCarga(leer(origen));

  const m = /\bconst CECEHUB_PY\s*=\s*("(?:[^"\\\n]|\\.)*")/.exec(programa);
  if (!m) throw new Error("No encuentro CECEHUB_PY en el programa.");
  const python = Function(`"use strict"; return ${m[1]};`)(); // (es un literal de cadena: no ejecuta nada más)
  const sinPython = programa.slice(0, m.index) + `const CECEHUB_PY = ${MARCADOR_PY}` + programa.slice(m.index + m[0].length);

  const prettier = require("prettier");
  const formateado = await prettier.format(sinPython, { parser: "babel", printWidth: 120 });

  escribir(RUTAS.pagina, pagina);
  escribir(RUTAS.programa, formateado);
  escribir(RUTAS.python, python);
  console.log(`✅ ${path.basename(origen)} → fuente/ (página ${pagina.length} B, programa ${formateado.length} B, CeceHub ${python.length} B)`);
}

main().catch((e) => {
  console.error("❌ " + e.message);
  process.exit(1);
});
