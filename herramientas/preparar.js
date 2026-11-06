#!/usr/bin/env node
/* Prepara Cece AI para quien lo va a usar: dist/Cece-AI.zip con la carpeta «Cece-AI/» y dentro
     cece-ai.html               la aplicación (se comprueba que NO lleve ninguna clave ni copia cifrada)
     abrir-cece.bat             Windows: lo abre a pantalla completa
     crear-acceso-directo.bat   Windows: crea «Cece AI» en el escritorio con Ctrl+Alt+C
     LEEME.txt                  la guía de uso (GUIA.md)
   El zip sale siempre igual con los mismos archivos (fechas fijas), así se puede comprobar.
   Uso: npm run preparar */
"use strict";
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const RAIZ = path.resolve(__dirname, "..");
const DIST = path.join(RAIZ, "dist");
const SALIDA = path.join(DIST, "Cece-AI.zip");
const CARPETA = "Cece-AI/";

function fallar(m) {
  console.error("❌ " + m);
  process.exit(1);
}

// ---------- comprobaciones ----------
const html = fs.readFileSync(path.join(RAIZ, "cece-ai.html"), "utf8");
const bloque = /const CECE_KEYS = \{([\s\S]*?)\};/.exec(html);
if (!bloque) fallar("no encuentro el bloque de configuración (CECE_KEYS) en cece-ai.html");
const valores = [...bloque[1].matchAll(/^\s*([a-z_]+)\s*:\s*(["'`])([\s\S]*?)\2/gm)];
if (!valores.length) fallar("el bloque de configuración no tiene huecos");
const llenos = valores.filter((m) => m[3].trim()).map((m) => m[1]);
if (llenos.length) fallar(`cece-ai.html lleva claves puestas (${llenos.join(", ")}): no se reparte. Vacíalas y vuelve a probar.`);
const boveda = /const CECE_BOVEDA = (["'`])([\s\S]*?)\1/.exec(html);
if (boveda && boveda[2].trim()) fallar("cece-ai.html lleva claves cifradas (CECE_BOVEDA): no se reparte.");
const version = (/VERSION_CECE\s*=\s*"([^"]+)"/.exec(fs.readFileSync(path.join(RAIZ, "fuente", "programa.js"), "utf8")) || [])[1];
if (!version) fallar("no encuentro VERSION_CECE en fuente/programa.js");

// La guía como texto para el Bloc de notas: saltos de línea de Windows y marca UTF-8 para que salgan bien las tildes
const guia = "﻿" + fs.readFileSync(path.join(RAIZ, "GUIA.md"), "utf8").replace(/\r?\n/g, "\r\n");

const archivos = [
  ["cece-ai.html", Buffer.from(html, "utf8")],
  ["abrir-cece.bat", fs.readFileSync(path.join(RAIZ, "windows", "abrir-cece.bat"))],
  ["crear-acceso-directo.bat", fs.readFileSync(path.join(RAIZ, "windows", "crear-acceso-directo.bat"))],
  ["LEEME.txt", Buffer.from(guia, "utf8")],
];

// ---------- zip (deflate, fechas fijas) ----------
const crc32 =
  zlib.crc32 ||
  ((b) => {
    let c = ~0;
    for (const v of b) {
      c ^= v;
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    return ~c >>> 0;
  });
// fecha y hora DOS de la versión (año.mes.día a mediodía)
const [an, me, di] = version.split(".").map(Number);
const fechaDos = ((an - 1980) << 9) | (me << 5) | di,
  horaDos = 12 << 11;

const locales = [],
  centrales = [];
let desplazamiento = 0;
for (const [nombre, datos] of archivos) {
  const n = Buffer.from(CARPETA + nombre, "utf8"),
    comprimido = zlib.deflateRawSync(datos, { level: 9 }),
    crc = crc32(datos);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4); // versión necesaria
  local.writeUInt16LE(0x0800, 6); // nombres en UTF-8
  local.writeUInt16LE(8, 8); // deflate
  local.writeUInt16LE(horaDos, 10);
  local.writeUInt16LE(fechaDos, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(comprimido.length, 18);
  local.writeUInt32LE(datos.length, 22);
  local.writeUInt16LE(n.length, 26);
  local.writeUInt16LE(0, 28);
  locales.push(local, n, comprimido);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0x0800, 8);
  central.writeUInt16LE(8, 10);
  central.writeUInt16LE(horaDos, 12);
  central.writeUInt16LE(fechaDos, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(comprimido.length, 20);
  central.writeUInt32LE(datos.length, 24);
  central.writeUInt16LE(n.length, 28);
  central.writeUInt32LE(0, 38); // atributos externos
  central.writeUInt32LE(desplazamiento, 42);
  centrales.push(central, n);
  desplazamiento += local.length + n.length + comprimido.length;
}
const dir = Buffer.concat(centrales),
  fin = Buffer.alloc(22);
fin.writeUInt32LE(0x06054b50, 0);
fin.writeUInt16LE(archivos.length, 8);
fin.writeUInt16LE(archivos.length, 10);
fin.writeUInt32LE(dir.length, 12);
fin.writeUInt32LE(desplazamiento, 16);

fs.mkdirSync(DIST, { recursive: true });
fs.writeFileSync(SALIDA, Buffer.concat([...locales, dir, fin]));
const kb = (b) => (b / 1024).toFixed(0) + " KB";
console.log(`✅ ${path.relative(RAIZ, SALIDA)} (Cece AI ${version}, ${kb(fs.statSync(SALIDA).size)})`);
for (const [nombre, datos] of archivos) console.log(`   ${CARPETA}${nombre}  ${kb(datos.length)}`);
console.log("   Sin claves dentro: listo para repartir.");
