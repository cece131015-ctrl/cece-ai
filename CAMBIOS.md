# Informe de depuración — 8 de octubre de 2026

Se ha revisado entero el archivo `cece-ai.html`: las ~10.500 líneas del programa (desempaquetado), la interfaz,
los estilos y el servidor CeceHub (2.440 líneas de Python). Cada fallo de la lista de abajo se ha **reproducido
primero** con una prueba automática sobre el archivo original y se ha comprobado que el arreglo lo resuelve.

## Fallos corregidos

| # | Fallo | Qué pasaba | Arreglo |
|---|---|---|---|
| 1 | **El tema «Oscuro» no se guardaba** | Con ajustes de una versión anterior, cada recarga volvía a «Neón», aunque se eligiera «Oscuro» otra vez. | La migración del tema se apunta como hecha. |
| 2 | **La página se congelaba al enviar un adjunto grande** | Antes de enviar una imagen o un PDF, cada variante de la petición se convertía a texto decenas de veces. Con un PDF de 12 MB: **3,7 s** sin responder. | Cada variante se convierte una vez y se reutiliza: **0,5 s**. |
| 3 | **CeceHub dejaba salir de `/v1`** (seguridad) | Una petición a `/v1/../api/pull` (o `%2e%2e`…) llegaba tal cual a la IA local: desde la WiFi, sin código, se podía usar la API nativa de Ollama (descargar, crear o copiar modelos). | Esas rutas se rechazan. CeceHub pasa a **2.1.1**: Cece avisa a quien tenga uno anterior de que descargue el nuevo. |
| 4 | **Guardar código en la carpeta fallaba con algunos nombres** | Si la IA escribía `// archivo: ./src/app.js`, la ruta quedaba `javascript/./src/app.js` y el navegador no deja crear la carpeta «.». | Se quitan los tramos `.` y vacíos de las rutas. |
| 5 | Tras usar el micrófono, el cuadro de texto perdía la pista «(/ para comandos)» | Se ponía un texto fijo distinto del normal (y del de móvil). | Una sola función decide ese texto. |
| 6 | En el móvil, el chat se leía a través del menú de modelos (tema Neón) | El fondo del menú era 97 % opaco. | Fondo opaco. |

## Mejoras de robustez y limpieza (sin cambiar lo que hace)

- `emo()` escapa el emoji que pinta (hoy todos son fijos o validados, pero así no se puede colar HTML en el futuro).
- CeceHub: los caracteres invisibles y de dirección de texto de `RE_CONTROL` estaban escritos tal cual en el
  código (patrón «Trojan Source»); ahora como escapes `\u…`.
- HTML: `<div>` dentro de `<button>` (no válido) → `<span>`; quitados un `<body>` suelto y dos niveles que ya no
  existen (Cece Mini y Cece Ultra, que el programa borraba al arrancar).
- JavaScript: quitadas 44 variables muertas (`x = void 0`) que dejó el minimizador y dos comprobaciones de niveles
  retirados; las constantes `COSTE_WEB_KIMI`, `TOPE_BINARIOS`, `TOPE_TEXTO_ARCHIVOS` y `TOPE_MESA` estaban
  declaradas pero se repetían los números a mano: ahora se usan.
- Se libera la imagen decodificada también cuando un adjunto se envía tal cual.
- Accesibilidad (axe-core): `aria-expanded` no vale en un `<textarea>`; la marca «CECE AI» es ahora el `<h1>`.
  Resultado: **0 avisos** en el chat y en los ajustes.

## Revisado y correcto

Sin fallos encontrados en:

- **Seguridad del chat**: el Markdown de la IA escapa todo el HTML (probado con `<img onerror>`, `<script>`,
  enlaces `javascript:` y atributos inyectados); las imágenes generadas solo aceptan `https:` o `data:image/…`.
- **Cifrado de las claves**: AES-256-GCM con PBKDF2-SHA256 (600.000 vueltas), bloqueo tras 5 intentos; probado de
  punta a punta (cifrar → descargar → abrir la copia → contraseña mala → buena → funciona).
- **Plugins propios**: se ejecutan aislados (iframe sin origen + Worker + CSP sin red); probado que no ven la
  página, no tienen `fetch` y que un bucle infinito se corta a los 3 s.
- **Nube**: el Gist va cifrado y otro equipo lo recupera con la misma frase.
- **Todos los motores** (Enterprise, Astra, Max, Turbo, Argon, Reserva, Local), Cece Pro a la vez y por relevo,
  herramientas web, código ejecutado, saltos al siguiente motor si uno falla, modo sin conexión, «Parar».
- **CeceHub**: zonas (equipo / WiFi / internet), código con comparación en tiempo constante, prueba HMAC para no
  dar el código a un impostor, protección contra «DNS rebinding», límite de intentos, mDNS y aviso UDP.
- **Estilos**: 0 valores CSS inválidos (csstree). Barrido automático de todos los botones, interruptores y
  desplegables de los ajustes (99 acciones), del modo Live, del editor de plugins, de CeceHub y de la nube: ningún error.

## Cómo se ha comprobado

`npm run probar`: **26 pruebas** en Chromium con las IAs simuladas (y CeceHub de verdad con una IA local
simulada). Sobre el archivo original pasan 21 de 26: fallan las de los puntos 1, 2, 4 y 5 y la que comprueba
que el CeceHub que se descarga es el nuevo. Con los arreglos pasan las 26.

## Decisiones (lo que no se ha tocado)

- La hoja de estilos tiene 40 selectores repetidos: son capas posteriores que sobrescriben a las anteriores.
  Juntarlos cambiaría el orden de la cascada y el aspecto; se dejan como están.
- El programa empaquetado ahora sale de `fuente/programa.js` minimizado con terser (antes venía ya minimizado).
  Se ha comprobado que la versión reconstruida sin cambios se comporta exactamente igual que la original.
