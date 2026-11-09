# Cece AI — guía de uso

Cece AI es tu asistente de inteligencia artificial en **un solo archivo**: `cece-ai.html`. No se instala nada. Se
abre con doble clic en el navegador y tus conversaciones se guardan en ese mismo navegador.

---

## 1. Lo que necesitas

- **Un navegador:** Chrome o Edge (recomendados), o Firefox o Safari. En el móvil también funciona.
- **Al menos una clave de API** de alguno de los servicios de la tabla de abajo. Sin ninguna clave, Cece solo pone
  «Error HTTP 401».

## 2. Primeros pasos

Si te ha llegado `Cece-AI.zip`, **extráelo primero** (clic derecho → «Extraer todo»). Abierto desde dentro del zip,
lo que cambies no se guarda y los `.bat` no encuentran el resto de archivos.

### Paso 1 — Pon tus claves

Abre `cece-ai.html` con el **Bloc de notas** (clic derecho → Abrir con → Bloc de notas). Arriba del todo está el
bloque de configuración. Pega cada clave **entre las comillas de su hueco**, guarda y cierra.

```
turbo:      "aquí-tu-clave",   // Motor Turbo · clave de DeepSeek (sk-…)
```

Cada hueco es de un servicio. Una clave puesta en el hueco de otro servicio no funciona, aunque si su formato no deja
dudas Cece la usa donde toca y te avisa.

| Hueco | Motor de Cece | Servicio | La clave empieza por | Dónde se consigue |
| --- | --- | --- | --- | --- |
| `turbo` | Cece Turbo (rápido y barato) | DeepSeek | `sk-` | platform.deepseek.com |
| `max` | Cece Max y Ultra Code | Moonshot (Kimi) | `sk-` | platform.moonshot.ai |
| `astra` | Cece Astra y Cece Sol | OpenAI | `sk-proj-` o `sk-` | platform.openai.com |
| `enterprise` | Cece Enterprise Plus | Anthropic | `sk-ant-` | console.anthropic.com |
| `argon` | Cece Argon | Google Gemini | `AIza` | aistudio.google.com |
| `reserva` | Reserva y oído rápido de Live | Groq | `gsk_` | console.groq.com |
| `muse` | Muse Wonder (solo en Cece Pro) | Meta | — | la que te dé Meta |
| `voz` | Voz Cece Natural (opcional) | ElevenLabs | — | elevenlabs.io |
| `nube_token` | ☁️ Nube (opcional) | GitHub | `ghp_` o `github_pat_` | github.com → Settings → Developer settings |
| `nube` | ☁️ Nube (opcional) | — | una frase secreta larga que tú inventes | — |

No hace falta rellenarlos todos: con una sola clave ya funciona. Los huecos que no uses se quedan vacíos (`""`).

### Paso 2 — Ábrelo y comprueba las claves

Abre `cece-ai.html` con doble clic. Ve a **⚙️ Configuración → 🔐 Seguridad → 🔌 Comprobar conexiones**: dice qué
claves funcionan, cuáles no y por qué (clave mal puesta, sin saldo, sin internet…). No gasta nada.

### Paso 3 — Protege tus claves (recomendado)

Mientras las claves estén escritas tal cual en el archivo, cualquiera que lo abra con el Bloc de notas puede verlas. En
**⚙️ Configuración → 🔐 Seguridad → «Cifrar mis claves con contraseña»** se descarga una copia protegida. Usa esa
copia y **borra la que tiene las claves a la vista**. Al abrirla, Cece te pide la contraseña.

### En Windows: abrirlo con Ctrl+Alt+C a pantalla completa

1. Deja `cece-ai.html`, `abrir-cece.bat` y `crear-acceso-directo.bat` en la misma carpeta (la carpeta `Cece-AI` que
   sale al extraer el zip ya los trae juntos).
2. Haz doble clic en `crear-acceso-directo.bat` una vez: crea **«Cece AI»** en el escritorio.
3. Desde entonces, **Ctrl+Alt+C** abre Cece AI a pantalla completa (sales con F11).

Este acceso usa un perfil del navegador propio de Cece, así que sus conversaciones van aparte de las que tengas
abriendo el archivo normal. Para pasarlas de un sitio a otro: Configuración → 💬 Conversaciones → Exportar e Importar.

---

## 3. Cómo se usa

### Escribir y responder

- Escribe y pulsa **Enter** para enviar. **Mayús+Enter** hace una línea nueva. Si lo prefieres al revés, cámbialo en
  Configuración → 🤖 IA y respuestas → «Enviar mensajes con».
- **Ctrl+Enter** mientras Cece responde deja tu mensaje **en cola**: sale solo cuando termina.
- **⏹** para la respuesta.
- **📎** adjunta **cualquier archivo**: imágenes, PDF, Word, Excel, PowerPoint, código, texto, `.zip`, `.tar`, `.tar.gz`,
  `.iso`… También se pueden arrastrar o pegar. De los comprimidos y las imágenes de disco, Cece lee la lista de archivos
  y el texto de los que son de texto, sin abrir ni ejecutar nada. De los demás (programas, vídeos, `.7z`…) le dice a la
  IA qué tipo de archivo es.
- Selecciona un trozo de la conversación y pulsa **«💬 Mencionar en el chat»** para citarlo en tu próximo mensaje.
- Debajo de cada respuesta tienes **📋 Copiar** y **🔊 Leer**. El código tiene su botón **Ver** para probar webs y juegos.
- **❓ Cece pregunta sus dudas:** si mientras programa algo importante no está claro, te lo pregunta con botones. Pulsa
  uno o escribe tu respuesta y sigue con el trabajo. Se apaga en Configuración → 🤖 IA y respuestas.

### Chat de incógnito 🕶️

Pulsa **🕶️** arriba (o escribe `/incognito`). Ese chat **no se guarda** en ningún sitio (ni en la lista, ni en la nube,
ni en la carpeta) y Cece no usa ni apunta nada en su memoria. **Al salir se borra**: con «Salir», con «Limpiar», al abrir
otra conversación, al cambiar de perfil o al cerrar o recargar la página.

### Elegir el modelo

Pulsa el nombre del modelo de arriba (por ejemplo **⚡ CECE TURBO**) y elige:

| Modelo | Para qué |
| --- | --- |
| Cece Turbo | Rápido y barato: lo del día a día |
| Cece Max | Muy capaz, también busca en internet |
| Cece Astra y Cece Sol | Muy capaces, ven imágenes y PDF |
| Cece Argon | Ve imágenes y PDF y ejecuta código |
| Cece Enterprise Plus | El más cuidadoso para textos y razonamientos largos |
| Cece Ultra Code | Programar |
| **Cece Pro** | Un equipo de varios modelos: hacen la base, la completan, la revisan, buscan errores, los corrigen y la pulen. Es el más potente y el más caro. |
| Cece Local | Una IA de tu ordenador, sin internet (ver «Sin conexión») |

Si un modelo falla, Cece prueba solo con otro y te lo dice debajo de la respuesta.

### Hablar con Cece (LIVE)

Pulsa **LIVE** para una conversación por voz, como una llamada. Habla cuando veas «Te escucho…» y Cece te responde
en voz alta. Puedes cortarle hablando encima. Se configura en Configuración → 🤖 IA y respuestas → «Configurar Cece
Live» (voz, idioma, modelo…). El navegador te pedirá permiso para el micrófono la primera vez.

### Comandos con «/»

Escribe **/** al principio del mensaje y sale la lista. Los más útiles:

| Comando | Qué hace |
| --- | --- |
| `/crear` | Te programa una app completa en un solo archivo |
| `/html`, `/2d-game`, `/3d-game` | Una página web, un juego 2D o un juego 3D. El 3D, en **Unity**, **Unreal** o **web** (HTML, JS y CSS): si no lo dices, te pregunta |
| `/lab3d` | **Lab 3D:** describe un modelo («una casita con un árbol») y Cece lo enseña en 3D y te da el `.obj` y su `.mtl` para Blender, Unity o Unreal |
| `/backend`, `/api`, `/bd`, `/sql` | Servidor, API, base de datos o consulta SQL |
| `/react`, `/extension`, `/bot`, `/cli` | Interfaz con React, extensión de Chrome, bot, programa de terminal |
| `/depurar`, `/tests`, `/docs`, `/explicar` | Arreglar, probar, documentar o explicar código (el tuyo o el último del chat) |
| `/modificar` | Cambia la última app o código que ha hecho Cece |
| `/buscar`, `/leer` | Buscar en internet o leer una página |
| `/imagen` | Dibujar una imagen |
| `/calc`, `/convertir`, `/temporizador`, `/hora` | Cuentas, unidades, temporizador y hora (sin IA y sin gastar) |
| `/recordar`, `/olvidar` | La memoria de Cece |
| `/perfil` | Ver o cambiar de perfil |
| `/github` | El panel de GitHub |
| `/nuevo`, `/incognito`, `/exportar` | Conversación nueva, chat de incógnito o descargar la conversación |
| `/ayuda` | Todos los comandos |

---

## 4. Lo tuyo: memoria, perfiles, idioma y aspecto

- **🧠 Memoria:** Cece recuerda cosas de ti en todas tus conversaciones. Las elige ella sola mientras habláis (te avisa
  debajo de la respuesta, con un botón para deshacerlo), y también se las puedes pedir con «recuerda que…» o
  `/recordar`. Las ves y las quitas en Configuración → 🤖 IA y respuestas → 🧠 Memoria. Nunca guarda contraseñas ni
  claves.
- **👤 Perfiles:** si usáis Cece varias personas, cada una puede tener su perfil con su nombre, sus conversaciones, sus
  ajustes y su memoria (Configuración → 🌍 General → Perfil, o `/perfil Ana`).
- **Tu nombre y tu avatar:** en Configuración → 🌍 General. Puedes elegir un emoji o subir una foto.
- **Idioma de la app:** español, English, français, Deutsch, italiano, português o català (Configuración → 🌍
  General). El idioma en que te responde se elige aparte, en 🤖 IA y respuestas.
- **Cómo responde:** longitud, tono, nivel de las explicaciones, emojis y tus propias instrucciones, en 🤖 IA y
  respuestas.
- **Aspecto:** temas, color, tamaño del texto y ancho del chat, en 🎨 Apariencia.

## 5. Tus conversaciones

- Se guardan **solas** en este navegador a cada mensaje: no hace falta guardarlas ni descargarlas. «Limpiar» empieza
  otra sin perder la anterior. En 💬 Conversaciones puedes buscarlas, abrirlas, borrarlas, exportarlas (.json o .md) e
  importarlas en otro ordenador. Las de incógnito no se guardan.
- **📁 Archivos que crea Cece:** en 💬 Conversaciones, elige una carpeta una vez (Chrome o Edge) y el código, las
  imágenes y los modelos 3D se guardan ahí solos, sin descargar nada. Al volver a abrir Cece, la carpeta se reconecta
  con tu primer clic (con «Permitir siempre», ni pregunta).
- **☁️ Nube (opcional):** sincroniza conversaciones, plugins y aspecto entre tus equipos, cifrado con tu frase
  secreta, en un Gist privado de tu cuenta de GitHub. Necesita los huecos `nube_token` y `nube`. Se activa en ☁️ Nube.
- Si abres el archivo desde un USB, algunos navegadores no guardan nada al cerrar: Cece te avisa. Elige la carpeta de
  «📁 Archivos que crea Cece» y las conversaciones se guardan ahí solas y vuelven al conectarla.

## 6. Sin internet

Sin conexión, Cece sigue funcionando con tus conversaciones, los comandos sin IA y la voz del navegador. Lo que le
pidas a la IA se envía solo cuando vuelve internet. Si tienes una IA en tu ordenador (Ollama o LM Studio), también
responde sin internet: Configuración → 📴 Sin conexión.

## 7. Seguridad y privacidad

- Las claves solo están en tu archivo. **No compartas el archivo con tus claves dentro:** compártelo vacío o cifra
  las claves antes (Paso 3).
- Cuando Cece habla con un servicio, la clave de ese servicio va en la petición. No compartas capturas de F12 → Red.
- El token del panel 🐙 GitHub solo vive en la memoria de la pestaña: se borra al desconectar o cerrar.
- Los plugins con código se ejecutan aislados, sin ver tus claves ni tus conversaciones y sin internet.

## 8. Si algo falla

| Lo que ves | Qué pasa y qué hacer |
| --- | --- |
| «Error HTTP 401» | El bloque de configuración está vacío. Pon al menos una clave (Paso 1). |
| «La clave de «turbo» (…) no es válida, caducó o no tiene permisos» | Esa clave está mal copiada, caducada o es de otro servicio. Revisa ese hueco y usa «Comprobar conexiones». |
| «🔀 La clave que pusiste en «…» es de «…»» | Pusiste una clave en el hueco de otro servicio. Cece ya la usa bien, pero muévela al hueco que te dice. |
| «sin saldo» | La clave vale, pero esa cuenta no tiene saldo: recárgala en la web del servicio. |
| «límite de uso» | Has hecho muchas peticiones seguidas: espera un poco o usa otro modelo. |
| «Sin conexión a internet» | Tu mensaje se envía solo cuando vuelve la red. |
| No se oye o no te escucha en LIVE | Da permiso al micrófono en el candado de la barra de direcciones. |
| Ctrl+Alt+C no hace nada | Otro programa usa ese atajo, o falta ejecutar `crear-acceso-directo.bat` (desde la carpeta extraída, no desde dentro del zip). |
| Las claves están «cifradas y bloqueadas» | Escribe tu contraseña al abrir (o en 🔐 Seguridad → Desbloquear). |

La versión de tu copia sale al final de Configuración → 🌍 General (por ejemplo, «Cece AI · 2026.11.09»).
