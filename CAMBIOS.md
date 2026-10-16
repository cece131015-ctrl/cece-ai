# Informe de depuración

## 16 de octubre de 2026 — Cece Sol dentro de Cece Pro y relevo que se adapta

- **Cece Sol entra en Cece Pro**: ahora Cece Pro trabaja con **cinco** modelos (Enterprise Plus, Argon, Astra, Max y el
  nuevo **Sol**) en vez de cuatro, tanto cuando responden a la vez como por relevo. El reparto de Configuración → Cece
  Pro tiene su propia barra para Sol, y los pesos se reparten entre los cinco.
- **El relevo se pasa los archivos**: cada paso del relevo recibe la última versión de los archivos que crearon los
  pasos anteriores y, si no los cambia, pasan tal cual al siguiente y a la respuesta final (quedan recogidos bajo
  «📁 Archivos del equipo»). Así el equipo construye sobre lo ya hecho en vez de empezar de cero cada vez.
- **El orden del relevo cambia según la petición**: antes el relevo iba siempre del modelo de menos peso al de más.
  Ahora, si la petición encaja mejor con unos modelos (por ejemplo, programar con los niveles de código, o ver
  imágenes y PDF con los motores que saben hacerlo), esos pasan a hablar **al final**, que es quien da la respuesta.
  Si la petición no pide nada especial, se mantiene el orden por peso de siempre, así que el comportamiento normal no
  cambia.

## 16 de octubre de 2026 — crear y modificar apps

Cece ya puede **crear tus propias aplicaciones** (originales y tuyas) y dejártelas **modificar como quieras**:

- **`/crear` (o `/app`, `/web`)**: describe lo que quieres («/crear una calculadora con historial») y Cece te programa una
  app o web completa en un solo archivo HTML, lista para abrir con doble clic.
- **`/modificar` (o `/cambiar`, `/edita`)**: cambia la última app que ha hecho Cece a tu gusto («/modificar ponla en modo
  oscuro»). Devuelve el archivo entero otra vez. También puedes, sin comando, seguir pidiéndole cambios por el chat: Cece
  recuerda la conversación y sigue editando la misma app.
- **👁️ Ver**: los bloques de código HTML llevan un botón para **ver la app funcionando** en una ventana. Esa vista va
  aislada (sin compartir origen con Cece), así que la app que pruebas no puede ver tus claves ni tu historial.

Es para construir lo tuyo, no para copiar webs o apps de otros.

## 15 de octubre de 2026 — modelo Cece Sol y tercera ronda

### Novedad: modelo **Cece Sol**

Se añade un modelo nuevo, **Cece Sol** (motor `gpt-6.1`), que aparece en el menú de modelos y se puede elegir con el
comando **`/sol`**. Usa la API de OpenAI (la misma que Cece Astra), así que toma la clave del campo `astra` del bloque
de configuración; no hace falta una clave nueva. El id del modelo es `gpt-6.1`: tiene que ser uno que tu cuenta/endpoint
de OpenAI sirva (si no, la API lo rechazará, como con cualquier modelo que no exista todavía). El precio puesto es el
mismo que el de Astra (10 $/50 $ por millón); cámbialo en `PRECIOS_MODELO` si tu cuenta cobra otra cosa.

### Seguridad (bóveda y copia protegida)

- Una clave antigua anotada **fuera de las llaves** de `CECE_KEYS` (en el comentario de cabecera o tras `};`) se
  copiaba en claro a la copia protegida, que además decía «solo hay texto cifrado». Ahora también se limpia lo de fuera.
- **«Bloquear ahora (y olvidar en este equipo)»** no borraba la llave de una copia creada con «Cambiar la contraseña»
  (otro id), así que esa copia se seguía abriendo sin contraseña. Ahora se olvidan todas las llaves recordadas.
- Tras «Cambiar la contraseña», Seguridad decía que el archivo antiguo «tiene las claves a la vista» (falso): ahora
  dice que la copia antigua se abre con la contraseña anterior.

### Motores (gasto y cortes)

- Un intento que **gasta tokens pero no llega a responder** (se quedó pensando, o falló una vuelta del bucle de
  herramientas) ya se cuenta en el gasto; antes desaparecía.
- **Cece Pro: al pulsar «Parar»** se estima también lo que costaron la fusión y los borradores que iban a medias;
  antes solo contaban los borradores ya terminados (y la fusión salía a 0).
- Una respuesta **cortada por el filtro de contenido o por falta de recursos del proveedor** ahora se avisa en el
  pie; antes se mostraba como si estuviera completa.
- Si la IA **se niega a responder** (sin texto), se dice «prefirió no responder» en vez de «respuesta vacía», y el
  texto de la negativa de Astra ya no se pierde.
- Con un **adjunto grande y una conexión lenta**, ya no se agota el tiempo subiéndolo diciendo «no responde» (y
  reenviándolo a cada motor): el límite se amplía según lo que pesa el archivo.
- El gasto incluye ahora las **búsquedas web** de Enterprise y de Astra (10 $ por cada 1.000), como ya hacía con Kimi.

### Cómo se ha comprobado

`npm run probar`: **46 pruebas** en Chromium, todas bien (2 nuevas: Cece Sol y los cortes/rechazos de los motores).
`npm run lint`: sin avisos.

## 13 de octubre de 2026 — segunda revisión

Se ha repasado otra vez **todo** el archivo, por zonas: el panel de GitHub, las peticiones a las IAs, el chat y los
adjuntos, la calculadora y los plugins, los ajustes y la nube, la voz y Cece Live, el servidor CeceHub (Python) y la
interfaz. Como la primera vez, **cada fallo se ha reproducido antes de arreglarlo** con un script, y cada arreglo
tiene su prueba automática, que falla con la versión anterior y pasa con la nueva. Después, otros agentes han
intentado romper los propios arreglos; lo que encontraron también está corregido aquí.

### ⚠️ Un cambio que vas a notar

**Cece abierta como archivo pide el código de CeceHub una vez.** Antes, Cece abierta con doble clic se conectaba al
CeceHub del mismo ordenador sin código. Pero el navegador manda exactamente lo mismo («Origin: null») cuando la
petición sale de un iframe con «sandbox» de **cualquier página web**: una web que visitaras podía usar tus IAs sin
que lo notaras. No hay forma de distinguir los dos casos, así que ahora los dos piden el código. Es solo la
primera vez: abre `http://localhost:9999` en el ordenador de CeceHub, copia el enlace de **«💻 Cece AI en este
equipo»** y pégalo en ⚙️ → 📴 Sin conexión → CeceHub (la consola de CeceHub también lo enseña al arrancar).
Cece explica estos pasos si lo intentas sin el código. CeceHub pasa a la **2.1.2** y Cece avisa a quien tenga una
anterior.

### Novedad: comando `/github`

`/github` (o `/gh`, `/git`, `/repositorios`) abre el panel de GitHub, igual que el botón 🐙 GitHub. El cursor va al
campo del token si aún no hay conexión, o a la lista de repositorios si ya la hay. **Abrirlo no llama a GitHub**:
solo se conecta cuando pegas el token y pulsas «Conectar» (o Enter). No corta la respuesta que esté escribiendo la
IA y sale en el menú de «/» y en `/ayuda`. Si ya tenías un plugin propio llamado `/github`, `/gh`, `/git` o
`/repositorios`, no se pierde: pasa a llamarse `/github2`, etc., y Cece te avisa.

### Seguridad

| Fallo | Qué pasaba | Arreglo |
|---|---|---|
| **Claves a la vista en la copia «protegida»** | Al cifrar las claves, una clave antigua comentada (`// turbo: "sk-…"`) o con un comentario delante seguía en claro dentro del archivo protegido, y la app decía lo contrario. | Ninguna cadena ni palabra con pinta de clave queda fuera de su sitio. |
| **Cualquier web podía usar tus IAs de CeceHub** | Desde un iframe con «sandbox» (ver arriba). | Ese caso pide el código. |
| **Un impostor de la WiFi podía quedarse con el código de CeceHub** | Contestando a `cecehub.local` por mDNS y reenviando la pregunta al CeceHub de verdad, conseguía una «prueba» válida y Cece le mandaba el código. | La prueba solo vale con la IP del equipo o con `localhost`, que no se pueden suplantar. |
| CeceHub con `--public-url` podía quedar abierto sin código | Si la dirección pública llegaba al puerto equivocado, todo entraba sin código (y hasta se podía leer el código), y CeceHub decía «✅ funciona». | La consola dice a qué puerto apuntar y avisa en rojo si el enlace llega sin código. |
| Un plugin propio podía congelar la app | Mandando él mismo el resultado se saltaba el máximo de 100.000 caracteres (39 s de página congelada) y podía contestar por otra ejecución. | Siempre se recorta y cada respuesta va a la suya. |
| Un paquete de red preparado ocupaba la CPU de CeceHub | Un solo paquete mDNS de 9 KB, medio segundo de CPU; con unos pocos por segundo, todo iba lento. | Se descartan los paquetes imposibles. |

### Panel de GitHub

- Guardar con una ruta que ya existía avisaba «Crear archivo nuevo» y lo **sobrescribía entero**: ahora se mira
  antes de preguntar y el aviso lo dice (también si el archivo ha cambiado en GitHub desde que se abrió).
- Al cambiar de repositorio, el editor seguía con el archivo del otro y se guardaba encima del de igual nombre.
- Los archivos de más de 1 MB se abrían **vacíos y al guardar se perdían**; los binarios daban un error raro. Ahora
  no se abren y se explica por qué. Se conservan los saltos de línea de Windows.
- Escape no cerraba, el foco se escapaba al chat de detrás (Enter enviaba el borrador) y un archivo soltado sobre
  el panel se enviaba en secreto a la IA. Solo se listaban 100 repositorios.
- La copia protegida (⚙️ → 🔐 Seguridad) salía **sin el panel de GitHub** ni la pantalla de bienvenida.

### Adjuntos: Word, Excel y PowerPoint

- Un .docx de 4 KB preparado **congelaba la página 15 s** (y uno de 40 KB, horas); una hoja de Excel de 114 KB se
  convertía en gigas de texto. Ahora se leen en tiempo lineal y con tope: 0,1 s y 1 s. Con documentos normales el
  texto sale idéntico al de antes.
- Word con **control de cambios**: a la IA le llegaba lo borrado mezclado con lo nuevo («100120 euros»).
- Excel con una hoja de gráfico en medio: los datos de una hoja llegaban con el nombre de otra.
- Word: el texto de los cuadros de texto llegaba repetido.
- Revisando el arreglo con 37 documentos reales (Word, LibreOffice, python-docx, openpyxl, xlsxwriter…) frente a la
  versión anterior, se corrigió también: los emojis de Word 365 desaparecían, un documento con tablas que cabía
  entero perdía el final (el máximo se medía antes de quitar los separadores), un .docx editado con un script
  (prefijo `ns0:`) salía vacío y los saltos de línea de PowerPoint contaban doble. Ahora todo lo que cambia
  respecto a la versión anterior son mejoras.

### Chat, comandos y Cece Pro

- `/calc`, `/convertir`… escritos mientras responde la IA **cortaban la respuesta** a medias. Ahora esperan a que
  termine (y lo dicen), van en orden, no se cuelan en otra conversación si cambias, y un Enter de más no corta nada.
- Cece Pro: al pulsar «Parar» durante la fusión, el gasto salía en 0 $ aunque los borradores ya se habían cobrado.
- «⬇️ Descargar imagen» abría una pestaña en vez de descargar.
- Si se corta la conexión a mitad de respuesta, ahora lo dice en español en vez de «network error».
- Motor Argon podía elegir una versión de su modelo que solo hace audio (todos los mensajes fallaban).
- Astra y Argon pegaban el texto de después de ejecutar código al de antes («…Python.El resultado…»).

### Calculadora y plugins

- `media(2,5; 3,5)` daba 3,75 (con «;» la coma ya es decimal, como en Excel); `3x4` daba error;
  `redondear(-2,5)` daba -2.
- `/temporizador 1h30m` ponía 30 minutos; `/dias 15/06/85` era 2085; `/aleatorio 1-100` sorteaba entre -100 y 1;
  `/convertir 1 ms a h` decía «= 0».
- `/json` decía «JSON válido» pero **cambiaba los números largos** (ids), `1.10` por `1.1` y quitaba claves
  repetidas.
- El resultado de un plugin lento se metía en el chat nuevo si cambiabas de conversación.
- «Descargar todo el código» guardaba la primera versión de un archivo en vez de la corregida.

### Conversaciones y nube

- **Importar una copia vieja borraba los mensajes nuevos** de esa conversación, sin preguntar.
- «Exportar (.json)» guardaba la versión vieja de la conversación abierta.
- Restaurar desde una copia algo que habías borrado: la nube lo volvía a borrar a los pocos segundos.
- Con «Sincronizar automáticamente» **apagado, se seguía subiendo** el historial a GitHub (lo que estaba
  programado y al cambiar de pestaña).
- «Desvincular este equipo» no desvinculaba: a los pocos segundos volvía a sincronizar.
- Al volver internet tras un corte, la nube no se reintentaba.
- Cece Local con la dirección de Ollama sin `/v1`: ahora dice que falta `/v1` en vez de culpar a un modelo.

### Voz y Cece Live

- El micrófono **tiraba frases de verdad** que empezaban como las que se inventa el reconocedor («Suscripción
  anual de Spotify…», «Gracias por verificarlo…»).
- Cambiar el Oído a «Navegador» con el micrófono escuchando daba un error falso de clave y cerraba el micrófono.
- Cece Live con «Guardar lo hablado en el chat» apagado decía «te dejo el código en el chat» y no lo dejaba.
- Lo hablado en Cece Live no se subía a la nube; el rótulo «habla para cortarme» salía cuando hablar no cortaba.

### CeceHub (además de lo de seguridad)

- Con `CECEHUB_TOKEN`, `--show-token` enseñaba un código que no valía y `--new-token` decía que revocaba los
  enlaces sin hacerlo.
- Un `cecehub.json` con un número donde va una dirección cerraba CeceHub con una traza.
- Con `--no-discovery` seguía anunciando `cecehub.local`; un enlace `http://` de internet recibía `:9999` de más.

### Interfaz y accesibilidad

- El visor de fotos no encerraba el foco: tras un Tab, Escape ya no lo cerraba y Enter pulsaba sin verlo lo que
  hubiera debajo (en la prueba, «Limpiar» borró el chat).
- Editor de plugins: Enter en «Texto de prueba» guardaba y cerraba el plugin en vez de probarlo.
- Contraste insuficiente (por debajo de 4,5:1) del código en línea en los temas Sepia y Claro, de las filas sin
  clave de «Comprobar conexiones» y del gris atenuado del tema Nord. Ahora axe-core no da ningún aviso de
  contraste en los 10 temas.
- Con «reducir movimiento» en el sistema, el índice de Configuración seguía desplazándose con animación.

### Herramientas

- `npm run lint` vigila también las variables usadas antes de declararse (así se cazaron dos fallos míos antes de
  subirlos) y fija las reglas de ruff y Python 3.8 (las versiones nuevas de ruff cambiaban las reglas por defecto).
- `desempaquetar.js` fallaba si el servidor de Python llevaba más comillas dobles que simples (por ejemplo tras
  `ruff format`): el archivo empaquetado ya no se podía volver a editar. Ahora vale con las dos y `empaquetar.js`
  comprueba que lo que empaqueta se puede desempaquetar.
- Una prueba («GitHub: ventana con Escape y foco dentro») pasaba aunque el foco se escapara del panel: ahora lo
  mira en cada pulsación, y se ha comprobado que falla con el panel roto.

### Cómo se ha comprobado

`npm run probar`: **44 pruebas** en Chromium con las IAs simuladas (y CeceHub de verdad con una IA local simulada),
todas bien. `npm run lint`: sin avisos. CeceHub probado también con Python 3.8.

## 8 de octubre de 2026 — primera revisión

Se ha revisado entero el archivo `cece-ai.html`: las ~10.500 líneas del programa (desempaquetado), la interfaz,
los estilos y el servidor CeceHub (2.440 líneas de Python). Cada fallo de la lista de abajo se ha **reproducido
primero** con una prueba automática sobre el archivo original y se ha comprobado que el arreglo lo resuelve.

### Fallos corregidos

| # | Fallo | Qué pasaba | Arreglo |
|---|---|---|---|
| 1 | **El tema «Oscuro» no se guardaba** | Con ajustes de una versión anterior, cada recarga volvía a «Neón», aunque se eligiera «Oscuro» otra vez. | La migración del tema se apunta como hecha. |
| 2 | **La página se congelaba al enviar un adjunto grande** | Antes de enviar una imagen o un PDF, cada variante de la petición se convertía a texto decenas de veces. Con un PDF de 12 MB: **3,7 s** sin responder. | Cada variante se convierte una vez y se reutiliza: **0,5 s**. |
| 3 | **CeceHub dejaba salir de `/v1`** (seguridad) | Una petición a `/v1/../api/pull` (o `%2e%2e`…) llegaba tal cual a la IA local: desde la WiFi, sin código, se podía usar la API nativa de Ollama (descargar, crear o copiar modelos). | Esas rutas se rechazan. CeceHub pasa a **2.1.1**: Cece avisa a quien tenga uno anterior de que descargue el nuevo. |
| 4 | **Guardar código en la carpeta fallaba con algunos nombres** | Si la IA escribía `// archivo: ./src/app.js`, la ruta quedaba `javascript/./src/app.js` y el navegador no deja crear la carpeta «.». | Se quitan los tramos `.` y vacíos de las rutas. |
| 5 | Tras usar el micrófono, el cuadro de texto perdía la pista «(/ para comandos)» | Se ponía un texto fijo distinto del normal (y del de móvil). | Una sola función decide ese texto. |
| 6 | En el móvil, el chat se leía a través del menú de modelos (tema Neón) | El fondo del menú era 97 % opaco. | Fondo opaco. |

### Mejoras de robustez y limpieza (sin cambiar lo que hace)

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

### Revisado y correcto

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

### Cómo se ha comprobado

`npm run probar`: **26 pruebas** en Chromium con las IAs simuladas (y CeceHub de verdad con una IA local
simulada). Sobre el archivo original pasan 21 de 26: fallan las de los puntos 1, 2, 4 y 5 y la que comprueba
que el CeceHub que se descarga es el nuevo. Con los arreglos pasan las 26.

### Decisiones (lo que no se ha tocado)

- La hoja de estilos tiene 40 selectores repetidos: son capas posteriores que sobrescriben a las anteriores.
  Juntarlos cambiaría el orden de la cascada y el aspecto; se dejan como están.
- El programa empaquetado ahora sale de `fuente/programa.js` minimizado con terser (antes venía ya minimizado).
  Se ha comprobado que la versión reconstruida sin cambios se comporta exactamente igual que la original.
