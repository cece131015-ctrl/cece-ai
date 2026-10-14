#!/usr/bin/env node
/* Saca el programa de cece-ai.html a fuente/ para poder leerlo y editarlo:
     fuente/pagina.html        el HTML de la interfaz (se inserta al abrir el archivo)
     fuente/programa.js        el JavaScript, formateado (con el marcador "@@CECEHUB_PY@@")
     fuente/cecehub-server.py  el servidor CeceHub que Cece ofrece para descargar
   Uso: node herramientas/desempaquetar.js [cece-ai.html]
   ⚠️ Sobrescribe lo que haya en fuente/. */
"use strict";
const path = require("path");
const { RUTAS, MARCADOR_PY, leerCarga, sacarPython, leer, escribir } = require("./comun");

async function main() {
  const origen = path.resolve(process.argv[2] || RUTAS.html);
  const { pagina, programa } = leerCarga(leer(origen));

  const { python, inicio, fin } = sacarPython(programa);
  const sinPython = programa.slice(0, inicio) + `const CECEHUB_PY = ${MARCADOR_PY}` + programa.slice(fin);

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
