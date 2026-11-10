# Informe de depuración

## 10 de noviembre de 2026 — depuración de lo nuevo

Cada arreglo tiene su prueba, que falla con la versión anterior (95 pruebas en total).

- **Las marcas de Cece dentro del código.** Si la IA escribía código con etiquetas `<pregunta>`, `<opcion>` o
  `<recordar>` (por ejemplo, el XML de un test), Cece se las quitaba al código, hacía tarjetas de pregunta con ellas y
  guardaba en la memoria lo que llevaran. Ahora las marcas solo cuentan fuera de los bloques de código. De paso, el
  código ya no pierde las líneas en blanco dobles (las de Python entre funciones).
- **Un botón de respuesta ya no ejecuta comandos.** El texto de las opciones de una pregunta lo escribe la IA. Una
  opción «/olvidar todo» borraba la memoria al pulsarla, y una «recuerda que…» apuntaba en ella. Ahora se manda como
  respuesta, tal cual.
- **Texto retorcido que congelaba la página.** Una nota de memoria seguida de miles de espacios dejaba la página
  parada 12 segundos. Ahora no tarda nada.
- **La carpeta no pisa lo que edites.** Al abrir Cece con la carpeta conectada se volvían a escribir los archivos de la
  conversación abierta: se perdía lo editado a mano y el código sin nombre se duplicaba cada vez. Ahora solo se guarda lo
  que se crea en la sesión. El código sin nombre tiene siempre el mismo nombre, y reabrir una conversación no repite sus
  archivos en «Descargar todo el código».
- **Reconexión de la carpeta.** Si la primera pulsación no le valía al navegador, salía su error en inglés y ya no se
  reconectaba. Ahora espera a la siguiente, sin avisos. El consejo de elegir carpeta sale tres veces como mucho.
- **Incógnito.** Entrar en incógnito cambiaba la conversación abierta por una vacía; con el guardado automático
  apagado, se perdía. Ahora no se toca: al salir (o al recargar) vuelves a ella.
- **Lista de conversaciones.** Si cerrabas la pestaña justo después de un mensaje, la lista se quedaba sin lo último.
  Ahora se guarda al ocultar o cerrar la pestaña, y al arrancar.
- **Adjuntos.** Los nombres con tilde dentro de un `.zip` hecho en Windows salían rotos («canci�n.txt»). Los Word,
  Excel y PowerPoint con macros o plantillas (`.docm`, `.xlsm`, `.pptm`…) iban como un zip con el XML en crudo y ahora se
  leen como documentos. Un TIFF o una foto RAW se rechazaban y ahora se adjuntan diciendo qué son. Un `.tar` falso ya
  no enseña nombres basura, y un zip que miente sobre sus tamaños no se lee.
- **Lab 3D.** La rueda del ratón sobre el modelo se quedaba con el desplazamiento del chat: ahora solo acerca después
  de tocar el modelo, y hay botones ＋ y －. En el móvil se puede deslizar el chat por encima. El modelo da una vuelta
  y para (antes giraba sin fin, gastando batería) y se repinta al cambiar de tamaño. Se aceptan descripciones en bloque
  `json`, con comentarios, comas de más o posiciones como `{x, y, z}`; las piezas repetidas tienen nombres distintos y
  un `.obj` con nombre de archivo se guarda con ese nombre.
- **`/3d-game`:** la palabra «three» a secas ya no elige la web sin preguntar. En el panel de Cece Pro ya no se ve la
  marca de las preguntas.
- Versión 2026.11.10.

## 9 de noviembre de 2026 — Motor Enterprise: modelo nuevo

- El **Motor Enterprise** (el de Cece Enterprise Plus y una de las partes de Cece Pro) usa el modelo más nuevo de su
  proveedor. Es **más barato**: los costes que calcula Cece pasan de 10 $/50 $ a 8 $/40 $ por millón de tokens
  (entrada/salida).
- El **asesor** (`/asesor`) usa siempre el mismo modelo que el motor. Con el modelo nuevo, un asesor de otro modelo se
  rechaza con un error.
- **Relevo si el modelo declina.** Si el modelo prefiere no responder a algo por sus filtros de seguridad, el proveedor
  repite la petición en su modelo de reserva dentro de la misma respuesta, y Cece lo dice debajo («respondió su modelo
  de reserva»). Si la cuenta no admite ese relevo, Cece lo nota en la primera petición, sigue sin él y no lo vuelve a
  pedir hasta recargar. Si nadie responde, sigue pasando al siguiente motor, como antes.
- Al seguir un turno que el proveedor dejó en pausa (búsquedas largas), Cece devuelve lo recibido **tal cual**, con el
  mismo sistema y las mismas herramientas: el modelo nuevo lo comprueba en todas las cuentas. Tras un relevo, de lo
  anterior solo se devuelve lo que el proveedor admite.
- Prueba nueva con todo lo anterior.

## 9 de noviembre de 2026 — cualquier archivo, guardado solo, incógnito, Lab 3D y preguntas

- **📎 Cualquier archivo.** Antes solo imágenes, PDF, Office y texto. Ahora vale todo. Los `.zip`, `.tar`, `.tar.gz`,
  `.gz` y `.iso` se leen por trozos, sin cargarlos enteros: Cece le pasa a la IA la lista de archivos y el texto de los
  de texto (README primero, sin `node_modules`, y también Word/Excel/PowerPoint de dentro). No abre, no instala y no
  ejecuta nada. De los demás (programas, vídeos, `.7z`, `.rar`, fotos HEIC…) dice qué son, su tamaño y lo legible que
  llevan. Un texto enorme ya no se rechaza: se lee el principio sin romper las tildes.
- **Las conversaciones se guardan solas** en la lista a cada mensaje. Antes, sin pulsar «Guardar», «Limpiar» las
  perdía. Se puede apagar. Borrar de la lista la conversación abierta empieza otra; antes, al seguir escribiendo,
  volvía a aparecer.
- **🕶️ Chat de incógnito** (botón o `/incognito`). No se guarda en la lista, ni para cuando vuelvas, ni en la nube, ni
  en la carpeta, y no usa ni apunta memoria (tampoco con «recuerda que…»). Al salir, abrir otra conversación o
  recargar, se borra con los archivos que creó.
- **📁 Lo que crea Cece se guarda solo, sin descargar.** Con una carpeta elegida (Chrome o Edge) van solos el código,
  las imágenes (`imagenes/`) y los modelos 3D (`modelos-3d/`). La carpeta de la última vez se reconecta con el primer
  clic, sin pulsar «Reconectar», y lo creado antes de conectarla se guarda al conectarla. Si el navegador no conserva
  datos (USB), las conversaciones van a la carpeta y vuelven al conectarla, en vez de descargarse. Tras recargar, el
  código de la conversación vuelve a la lista de «Descargar todo».
- **🧪 Lab 3D** (`/lab3d`). La IA describe el modelo con piezas (caja, esfera, cilindro, cono, toro, pirámide, plano).
  Cece construye la malla con las caras hacia fuera, hace el `.obj` y su `.mtl` (un material por color) y lo enseña en
  3D: se gira arrastrando y se acerca con la rueda. Un bloque `obj` escrito tal cual también se ve.
- **❓ Cece pregunta sus dudas mientras programa.** Si algo importante no está claro, termina con una pregunta con
  botones, y lo que eliges (o escribes) le llega como respuesta. Se apaga en 🤖 IA y respuestas.
- **🧊 `/3d-game` en Unity, Unreal o web.** Si no lo dices, Cece pregunta antes de gastar nada. Unity da C# y los
  pasos en el editor. Unreal da C++, Blueprints y los pasos. Web da HTML, JS y CSS con Three.js, que se prueba con «Ver».
- Cada cosa tiene su prueba (93 en total).

## 9 de noviembre de 2026 — «Error HTTP 401» y repaso general

- **Sin ninguna clave**, el chat y Cece Live solo dicen **«Error HTTP 401»**, sin más explicación. Lo que hay que hacer
  sigue en la guía y en ⚙️ Configuración → 🔐 Seguridad → «Comprobar conexiones».
- **Arreglos del repaso** (cada uno con su prueba, que fallaba antes):
  - **Claves pegadas con caracteres invisibles.** Copiadas de WhatsApp, de una web o de un PDF se cuela a veces un
    espacio de ancho cero, o el guion se vuelve tipográfico (‑ –). El navegador no podía enviar la clave y Cece decía
    «Revisa tu conexión a internet», que no era el problema. Ahora se limpian solas. Un hueco con solo caracteres
    invisibles cuenta como vacío.
  - **Lo mismo con el token del panel 🐙 GitHub:** pegado con un invisible, comillas o «Bearer » fallaba con un error en
    inglés. Ahora conecta.
  - **«🧠 Anotando»** solo sale mientras Cece escribe la nota. Si la ponía al principio de la respuesta, el aviso se
    quedaba durante toda la respuesta y no se veía el cursor.
  - **Memoria:** olvidar un trozo corto (por ejemplo «Madrid») borraba todo lo que lo nombraba («Su hermana trabaja en
    Madrid»). Ahora solo quita el dato que toca. Las instrucciones de la IA ya no dicen que todo lo recordado «te lo
    pidió» el usuario, porque ahora también lo elige Cece.
  - **Idioma de la app:** se quedaban en español «Pensando», «Razonando», «Dibujando», «N modelos trabajando», «X
    falló, probando otro», los textos que salen al pasar el ratón (LIVE, 100 %, adjuntar, modo code, micrófono, GitHub),
    las etiquetas «Cerrar» de las ventanas y la lista de conversaciones («Aún no hay conversaciones guardadas»,
    «Borrar» y la fecha). El título de una conversación no se traduce aunque coincida con una palabra de la app.
  - **Los `.bat` de Windows** avisan si se abren desde dentro del `.zip` sin extraerlo. Antes
    `crear-acceso-directo.bat` hacía un acceso directo a una carpeta temporal que Windows borra, y Ctrl+Alt+C dejaba de
    funcionar. La guía dice que hay que extraer el zip primero.
- Versión 2026.11.09.

## 6 de noviembre de 2026 — «🧠 Anotando» mientras Cece guarda algo en la memoria

- Mientras espera la respuesta sigue saliendo **«Pensando»**, como siempre. Cuando Cece se pone a escribir algo para
  la memoria, sale **«🧠 Anotando»** con los mismos puntitos animados:
  - si todavía no ha escrito texto, la burbuja dice «🧠 Anotando» en lugar de quedarse en blanco o en «Pensando»;
  - si ya ha escrito su respuesta, «🧠 Anotando» aparece debajo mientras termina la nota y se quita al acabar;
  - sin «Ver el texto según se escribe», el «Pensando» pasa a «🧠 Anotando»;
  - en Cece Pro, el paso que está anotando lo dice en la barrita.
- Al terminar queda la nota «🧠 Recordado: «…»» con su botón «Olvidar», como antes. «Anotando» se traduce al
  idioma de la app.

## 6 de noviembre de 2026 — listo para usar

- **Guía de uso** nueva, [`GUIA.md`](GUIA.md), para quien solo quiere usarlo. Explica qué clave va en cada hueco y dónde
  se consigue, cómo abrirlo, comprobar las claves y protegerlas, el acceso directo de Windows, los modelos, LIVE, los
  comandos, la memoria, los perfiles, las conversaciones y la nube, el modo sin internet, la seguridad, y una tabla de
  «si algo falla» con cada aviso y qué hacer.
- **Paquete listo para repartir:** `npm run preparar` hace `dist/Cece-AI.zip` con la carpeta `Cece-AI/` y dentro
  `cece-ai.html`, `abrir-cece.bat`, `crear-acceso-directo.bat` y `LEEME.txt` (la guía, para el Bloc de notas). Antes
  de empaquetar **comprueba que el archivo no lleve ninguna clave ni copia cifrada**; si la lleva, no hace el paquete. El
  zip sale idéntico cada vez.
- **Versión visible:** al final de Configuración → 🌍 General sale «Cece AI · 2026.11.06», para saber qué copia
  tienes.
- **Arreglo:** si la IA respondía solo con una marca de memoria, sin texto, la burbuja se quedaba en «Pensando» y se
  guardaba un mensaje vacío. Ahora dice «🧠 Anotado.».
- El README manda a la guía y a «🔐 Seguridad → Comprobar conexiones», que es donde está ahora.

## 5 de noviembre de 2026 — memoria automática: Cece decide qué recordar

- **Cece elige sola qué guardar en la 🧠 Memoria** mientras habláis, sin que tengas que decir «recuerda que…». Guarda
  lo que cuentas de ti que sirve para más adelante: cómo te llamas, a qué te dedicas, tus gustos, alergias o
  costumbres, tus proyectos o cómo prefieres las respuestas. Lo pasajero y lo que ya recuerda no lo guarda.
- **También decide qué olvidar:** si algo deja de ser verdad («ya como carne») o le pides que lo olvide, lo quita.
- **Debajo de la respuesta** sale «🧠 Recordado: «…»» con un botón «Olvidar» para deshacerlo, o «🧹 Olvidado: «…»».
- **Nunca guarda** contraseñas, claves de API ni números de tarjeta o de cuenta, aunque la IA lo intente.
- **Cómo funciona:** la IA añade al final de su respuesta unas marcas que no ves. Cece las recoge y las quita antes de
  enseñar la respuesta, de guardarla en la conversación, de copiarla o de leerla en voz alta. Mientras llega el texto
  tampoco se ve una marca a medias. No gasta llamadas de más. En Cece Pro vale lo que marque cualquiera de los pasos.
- Se apaga en Configuración → 🤖 IA y respuestas → 🧠 Memoria → «Cece decide sola qué recordar». Lo de «recuerda
  que…», `/recordar` y `/olvidar` sigue funcionando igual.

## 5 de noviembre de 2026 — que las claves funcionen y que la IA tenga memoria

**Claves de API**

La causa más común de «las claves no funcionan» era poner una clave en el hueco que no es el suyo. Cada hueco del
bloque de configuración va a un servicio fijo, pero el archivo no decía cuál; una clave en el hueco de otro servicio se
le mandaba a ese otro y fallaba siempre con «HTTP 401».

- **El bloque de configuración dice de qué servicio es cada hueco** y cómo empieza su clave: `enterprise` → Anthropic
  (`sk-ant-…`), `astra` → OpenAI, `max` → Moonshot/Kimi, `turbo` → DeepSeek, `argon` → Google Gemini (`AIza…`),
  `reserva` → Groq (`gsk_…`), `muse` → Meta, `voz` → ElevenLabs y `nube_token` → GitHub.
- **Una clave en el hueco equivocado se usa donde toca** cuando su formato no deja dudas: `sk-ant-…`, `AIza…`, `gsk_…`,
  `sk-proj-…`, las de DeepSeek, `ghp_…` o `github_pat_…`, y las de ElevenLabs. Al abrir sale un aviso, y «Comprobar
  conexiones» dice qué clave estaba dónde. Al descargar la copia cifrada (o la de cambiar claves), cada clave queda ya
  en su hueco.
- **Al pegar una clave** se quitan las comillas, el «Bearer » de delante y los espacios o saltos de línea que se cuelan.
- **El error 401 dice qué hueco revisar:** «La clave de «turbo» (…) no es válida, caducó o no tiene permisos». Si Cece
  pasa sola a otro motor, el aviso del pie también lo dice.
- **Sin ninguna clave:** «Fallo de conexión (HTTP 401): no encuentro ninguna clave. Ponlas en el bloque de
  configuración del principio del archivo.»
- El comentario del bloque manda a «🔐 Seguridad → Comprobar conexiones», que es donde está ahora.

**Memoria**

- **En una conversación:** la IA recibe los últimos 80 mensajes, en vez de 30, y hasta el doble de texto. Si la
  conversación es más larga, también recibe un resumen de lo que pediste antes, empezando por tu primer mensaje (que
  suele ser el objetivo). Así no se le olvida el principio.
- **🧠 Memoria entre conversaciones** (nueva, en la pestaña «IA y respuestas»): lo que le pidas recordar lo sabe en
  todas tus conversaciones y en Cece Live.
  - Empieza un mensaje con «recuerda que…», «acuérdate de que…» o «no olvides que…» (también en los otros seis
    idiomas). Se guarda y el mensaje le llega igual a la IA.
  - `/recordar texto` lo guarda, `/recordar` solo enseña lo que recuerda, y `/olvidar 2`, `/olvidar perro` u
    `/olvidar todo` lo quitan.
  - En Configuración: la lista con ✕ para quitar, un cuadro para añadir, «Borrar toda la memoria» y un interruptor
    para apagarla. Cada perfil tiene la suya. Todavía no viaja con la ☁️ Nube.
- **Cece Live no recibía nada de «Cómo responde Cece»**, aunque la configuración decía que sí: ni tu nombre, ni el
  tono, ni el nivel, ni tus instrucciones. Ahora los recibe, y también la memoria.

**Otros arreglos**

- Con un perfil que no es el principal, el tema se pintaba un instante con el del principal al abrir. Ahora sale
  directamente el suyo.

## 5 de noviembre de 2026 — depuración de perfiles, avatar y pestañas

He revisado lo más nuevo y además he comprobado que no hay mezcla de perfiles entre ventanas (la app no escucha
cambios de otras pestañas), que la trampa de foco del panel ignora las pestañas ocultas y que todo cabe en un móvil.
Arreglos:

- **Un avatar con fondo transparente salía con el fondo negro.** La foto se guardaba siempre en JPEG, que no tiene
  transparencia. Ahora, si la imagen tiene partes transparentes, se guarda en PNG; si no, sigue en JPEG, que ocupa
  menos.
- **Se podían crear dos perfiles con el mismo nombre**, y entonces `/perfil Ana` no sabía a cuál ir. Ahora avisa «Ya hay
  un perfil con ese nombre». También avisa si pasas de 20 perfiles.
- **Abrir la configuración** recibía el clic del botón como si fuera el nombre de una pestaña. Funcionaba por
  casualidad. Ahora siempre abre la última pestaña que usaste.
- La ayuda del **idioma de la app** decía que solo cambiaba «los textos principales» y mandaba a «Cómo responde Cece»
  sin decir en qué pestaña está. Ahora dice que está en «IA y respuestas».

## 5 de noviembre de 2026 — configuración ordenada por partes

La configuración era una sola lista muy larga y desordenada: por ejemplo, «Conversaciones» salía en medio de las
opciones de la IA y «Emojis» lejos de «Apariencia». Ahora va por **pestañas** y solo se ve una parte cada vez:

| Pestaña | Qué tiene |
| --- | --- |
| 🌍 General | Perfil, idioma de la app, tu nombre, tu avatar, saludo, hora, limpiar, detalles, corrector y pantalla completa |
| 🤖 IA y respuestas | Cece Live, modo de esfuerzo (y Cece Pro), cómo responde Cece, ver el texto según se escribe, límite de velocidad, internet e imágenes |
| 🎨 Apariencia | Tema, color, tamaño, espaciado, ancho, animaciones y estilo de los emojis |
| 💬 Conversaciones | Guardar, buscar, exportar e importar, y la carpeta del código generado |
| 🧩 Plugins | Los integrados y los tuyos |
| 📴 Sin conexión | IA de tu ordenador y CeceHub |
| ☁️ Nube | Sincronizar entre equipos |
| 🔐 Seguridad | Cifrar las claves y comprobar las conexiones |

- Al cerrar y volver a abrir la configuración, sigue en la última pestaña.
- Con el teclado, las flechas, Inicio y Fin pasan de una pestaña a otra.
- Las pestañas se traducen al idioma de la app. No se ha quitado ningún ajuste: solo están ordenados.

## 5 de noviembre de 2026 — tu avatar

- **Tu avatar** (el dibujo junto a tus mensajes) se cambia en Configuración → 🌍 General → «Tu avatar». Puedes elegir
  uno de 24 emojis o **📷 subir una foto**. La foto se recorta al centro y se reduce a 128×128, así ocupa muy poco.
  «Quitar la foto» vuelve al emoji.
- Cambia también en los mensajes que ya están en pantalla. Cada perfil tiene el suyo y viaja con la ☁️ Nube, como el
  resto de la apariencia.
- En la lista de perfiles, el tuyo sale con tu nombre aunque aún no hayas guardado ningún ajuste (antes ponía
  «Principal»).

## 5 de noviembre de 2026 — perfiles de usuario

- **Varios perfiles en la misma Cece AI**, en Configuración → 🌍 General → «👤 Perfil». Cada perfil tiene su nombre,
  sus conversaciones, sus ajustes (idioma, tema, cómo responde…), sus plugins y su nube. Las claves del bloque de
  configuración son las mismas para todos, porque van en el archivo.
- **➕ Nuevo:** pide un nombre, crea el perfil y entra en él, vacío y con el saludo ya con ese nombre.
- **Cambiar:** se elige en la lista. Cece guarda lo que hay y se recarga con los datos del otro perfil.
- **🗑️ Borrar:** borra el perfil en el que estás con todo lo suyo y vuelve al principal. El principal no se puede
  borrar.
- **`/perfil`** lista los perfiles, y **`/perfil Ana`** cambia al perfil «Ana».
- El nombre del perfil es el de «Cómo te llamas»: si lo cambias, cambia en la lista.
- **No pierdes nada:** lo que ya tenías es el perfil principal y sigue donde estaba.
- La **nube** usa un archivo distinto en tu Gist para cada perfil, así no se mezclan. La limpieza de imágenes y PDF
  guardados respeta los de los demás perfiles.
- Son del equipo y se comparten entre perfiles: CeceHub, el desbloqueo de las claves con contraseña y la carpeta donde
  se guarda el código.

## 5 de noviembre de 2026 — depuración: idioma de la app y acceso directo de Windows

Revisión de todo el código: ids que no existen, alias de comandos que se pisan, `innerHTML` con datos sin escapar,
expresiones regulares construidas con texto del usuario, diccionarios de los siete idiomas y las partes más nuevas. Lo
demás salió limpio. Estos son los fallos encontrados; cada uno se reprodujo antes de arreglarlo.

- **Al cambiar de idioma, algunos textos volvían a un estado viejo.** Con MaxFull puesto y Cece Pro elegido, al pasar
  por ejemplo del inglés al francés, el título de Cece Pro volvía a «reparto» y el distintivo del modelo al de Cece
  Turbo. La traducción recordaba el texto de la primera vez. Ahora, si el código lo ha cambiado después, se traduce
  el texto actual.
- **Lo que el código cambia mientras la app está en otro idioma salía en español.** Por ejemplo, el aviso de MaxFull al
  activarlo, la lista de modelos de Cece Live o los estados de la nube. Ahora se traduce en cuanto cambia.
- **Seguían en español** los nombres de los temas (Oscuro, Claro, Océano…), las velocidades (Lento, Rápido, Máximo),
  los estilos de emojis (Del sistema, Plano) y los avisos del panel. Ahora se traducen.
- **`abrir-cece.bat` no abría a pantalla completa si Chrome o Edge ya estaban abiertos** (lo normal). En ese caso el
  navegador ignora `--start-fullscreen` y abre una pestaña más. Ahora Cece se abre en su propia ventana (`--app`) con un
  perfil propio (`%LOCALAPPDATA%\CeceAI\navegador`), así que siempre sale a pantalla completa. También encuentra
  Chrome instalado solo para tu usuario. Como el perfil es aparte, las conversaciones que abras desde el acceso directo
  se guardan en ese perfil: para llevarte las de antes, expórtalas e impórtalas, o usa la ☁️ Nube.

## 5 de noviembre de 2026 — te llama Cece y saluda distinto cada vez

- **Nombre «Cece» por defecto.** Cece AI te saluda por tu nombre y la IA sabe que te llamas Cece. Si lo tenías vacío,
  pasa a «Cece». Se cambia o se borra en Configuración → 🌍 General → «Cómo te llamas», y si lo borras, se respeta.
- **El saludo cambia cada vez** y depende de la hora:
  - **Mañana (6 a 13 h):** «¡Hola, Cece! 👋 ¿Qué tal estás?», «Hola, madrugador 👋 ¿Cómo has dormido, Cece?» (solo
    hasta las 10), «¡Buenos días, Cece! 👋 ¿Con qué empezamos hoy?», «¡Arriba, Cece! 👋 Un café y a por el día. ¿En
    qué te ayudo?» y «Buenos días, Cece 👋 ¿Qué tal ha empezado la mañana?».
  - **Tarde (13 a 21 h):** «¡Buenas tardes, Cece! 👋 ¿Qué tal va el día?», «¡Hola, Cece! 👋 ¿Cómo va la tarde?»,
    «¡Hola de nuevo, Cece! 👋 ¿Qué hacemos esta tarde?» y «Buenas tardes, Cece 👋 ¿En qué te puedo ayudar?».
  - **Noche (21 a 6 h):** «¡Buenas noches, Cece! 👋 ¿Qué tal ha ido el día?», «Hola, ave nocturna 👋 ¿En qué te ayudo
    esta noche, Cece?», «¡Hola, Cece! 👋 ¿Trasnochando un poco?» y «Buenas noches, Cece 👋 ¿Un último proyecto antes de
    dormir?».
- Los otros seis idiomas de la app tienen sus propios saludos equivalentes (por ejemplo, «Hello, early bird» o «Hello,
  night owl» en inglés).

## 4 de noviembre de 2026 — acceso directo en Windows (Ctrl+Alt+C)

- **`windows/abrir-cece.bat`:** abre `cece-ai.html` (que debe estar en la misma carpeta) en **pantalla completa**, con
  Chrome o Edge (`--start-fullscreen`). Si no encuentra ninguno, abre el navegador predeterminado sin pantalla completa.
- **`windows/crear-acceso-directo.bat`:** se ejecuta una vez y crea **«Cece AI»** en el escritorio, con el atajo
  **Ctrl+Alt+C**. Ese atajo abre `abrir-cece.bat`. Un `.bat` no puede tener atajo de teclado por sí solo, por eso se
  usa el acceso directo.
- Uso: pon `cece-ai.html`, `abrir-cece.bat` y `crear-acceso-directo.bat` en la misma carpeta, ejecuta
  `crear-acceso-directo.bat` y pulsa Ctrl+Alt+C. Para salir de la pantalla completa, pulsa F11 (o Esc en Edge/Chrome).

## 4 de noviembre de 2026 — toda la app traducida al idioma elegido

Al cambiar el **idioma de la app** (Configuración → 🌍 General) ahora se traduce toda la interfaz, no solo el saludo y
los títulos: las siete lenguas siguen siendo español, English, français, Deutsch, italiano, português y català.

- **Panel de configuración entero:** todos los títulos, etiquetas, textos de ayuda, opciones de los desplegables y
  botones (General, Cece Live, Internet, Conexiones, Imágenes, Modo de esfuerzo, Cece Pro, Conversaciones, velocidad,
  Emojis, Pantalla, Código, Respuesta, Cómo responde Cece, Apariencia, Plugins, Sin conexión, Nube y Seguridad).
- **Ajustes de Cece Live:** cómo te habla, cómo te escucha, idioma y modelo, comportamiento y la pausa.
- **Barra de estado** de abajo («Última», «Sesión», «tokens») y los **distintivos** del menú de modelos (Rápido,
  Imbatible, Nuevo, Insignia, Creativo…).
- **Cuadros de texto** (placeholders) del chat y de los ajustes.

Lo que no se traduce a propósito: los nombres propios (Cece Pro, Cece Company, los nombres de los modelos y de las
voces, Nord, Sepia…) y los textos de dentro de los mensajes, que son cosa de la IA. Si un texto todavía no tiene
traducción, se queda en español en vez de romperse. La traducción recorre sola el panel, así que los textos nuevos solo
necesitan añadirse al diccionario.

## 4 de noviembre de 2026 — aviso sin claves

- Si el bloque de configuración no tiene **ninguna** clave, el aviso del chat y el de Cece Live ahora dicen
  **«Fallo de conexión (HTTP 401).»** en vez de «Falta rellenar el bloque de configuración del principio del
  archivo.». 401 es el código de «sin autorización», el que devuelve un proveedor cuando no recibe una clave válida.
  Los demás avisos no cambian: claves bloqueadas con contraseña, falta la clave de un modelo concreto, Cece Local sin
  IA, etc.

## 4 de noviembre de 2026 — saludo, idioma de la app, más ajustes y plugins de programación

**Saludo al empezar**
- El chat vacío saluda: **«Hola, buenas tardes, soy Cece AI 👋 ¿En qué te puedo ayudar hoy?»**. Dice «buenos días»
  de 6 a 13 h, «buenas tardes» de 13 a 21 h y «buenas noches» el resto. Si pones tu nombre en Configuración, lo
  incluye: «Hola, Ana, buenas tardes…».

**Configuración → 🌍 General (nueva sección, la primera)**
- **Idioma de la app:** español, English, français, Deutsch, italiano, português y català. Traduce el saludo, la
  cabecera (Limpiar, Configuración), el cuadro de texto, el botón de enviar y parar, el índice y los títulos
  de la configuración, y la sección General entera. El resto de textos (avisos y explicaciones más largas) sigue en
  español por ahora. El idioma de las respuestas se elige en «Cómo responde Cece», y el de la voz, en Cece Live.
- **Cómo te llamas:** Cece te saluda por tu nombre y lo usa de vez en cuando al responder.
- **Saludar al empezar:** se puede apagar.
- **Formato de la hora:** 24 o 12 horas, en el reloj y en los mensajes.
- **Preguntar antes de limpiar el chat.**
- **Detalles bajo cada respuesta** (modelo, tokens y velocidad): se pueden ocultar.
- **Corrector ortográfico al escribir:** se puede apagar.

**Configuración → ✍️ Cómo responde Cece (dos ajustes más)**
- **Nivel de las explicaciones:** automático, principiante (sin tecnicismos, paso a paso), intermedio o experto
  (técnico y al grano).
- **Emojis en las respuestas:** los de siempre, pocos, ninguno o muchos.

**17 plugins de programación nuevos.** Se escriben al principio del mensaje y le mandan a Cece unas instrucciones ya
preparadas para que el trabajo salga completo. En tu burbuja se ve solo lo que escribiste.

| Comando | Qué hace |
| --- | --- |
| `/html` (`/pagina`, `/landing`) | Página web completa, moderna y adaptada al móvil, en un solo HTML |
| `/2d-game` (`/juego2d`) | Juego 2D original con canvas: teclado y táctil, puntos, pausa y «Jugar otra vez» |
| `/3d-game` (`/juego3d`) | Juego 3D original con Three.js: luces, sombras, cámara que te sigue y objetivo |
| `/backend` (`/servidor`) | Servidor con rutas, validación, base de datos, `.env.example`, seguridad básica y README |
| `/api` (`/rest`) | Tabla de endpoints, OpenAPI 3 y el servidor que la implementa, con ejemplos `curl` |
| `/bd` (`/basedatos`) | Tablas, claves, índices, `schema.sql`, datos de ejemplo y consultas |
| `/sql` (`/consulta`) | La consulta SQL que necesitas, explicada |
| `/react` (`/componente`) | Interfaz con React que se abre con doble clic (y cómo pasarla a Vite) |
| `/extension` (`/addon`) | Extensión para Chrome/Edge (Manifest V3) con los permisos justos |
| `/bot` (`/discord`, `/telegram`) | Bot con comandos, token en `.env` y README |
| `/cli` (`/terminal`) | Programa de terminal con `--help` y errores claros |
| `/tests` (`/test`, `/pruebas`) | Pruebas automáticas de tu código o del último del chat |
| `/docs` (`/readme`) | README y comentarios de documentación |
| `/depurar` (`/debug`, `/arreglar`) | Busca y arregla los errores de tu código o del último del chat |
| `/docker` | Dockerfile, `.dockerignore` y `docker-compose.yml` |
| `/regex` | Expresión regular explicada, con ejemplos |
| `/explicar` | Explica paso a paso tu código o el último del chat |

`/tests`, `/docs`, `/depurar`, `/docker` y `/explicar` se pueden mandar solos: trabajan sobre el último código de la
conversación. Los juegos piden que sean originales (sin copiar juegos existentes ni sus personajes). Los de un solo
HTML (`/html`, `/2d-game`, `/3d-game`, `/react`) se pueden probar con el botón «Ver». `/3d-game` y `/react` necesitan
internet para cargar Three.js o React. Como todos los plugins, se pueden apagar en Configuración → 🧩 Plugins.

## 4 de noviembre de 2026 — depuración, segunda ronda: lo más nuevo

Se revisó el código añadido estos días: cola y citas, el panel de GitHub y la barrita de Cece Pro. Salieron 8 fallos
más. Cada uno se reprodujo antes de arreglarlo y tiene una prueba que falla con la versión anterior.

- **Las citas («Mencionar en el chat») desaparecían al recargar** o al volver a la conversación. La burbuja se quedaba
  sin el recuadro citado, y vacía si solo habías mandado la cita. Ahora se conservan. También salen como cita en el
  `.md` exportado, y una conversación que empieza con una cita se titula con ella, no con la instrucción interna.
- **Un adjunto de texto largo se cortaba a 20.000 caracteres al recargar.** Le pasaba, por ejemplo, a un repositorio
  traído con «📥 Traer esta carpeta al chat»: tras recargar o volver a la conversación, Cece solo veía los primeros
  archivos y podía reescribir los demás sin verlos. Ahora el texto entero se guarda en el navegador (IndexedDB),
  como las imágenes. Si en otro equipo no está, se usa el principio, avisando de que está recortado.
- **Traer una carpeta con más de 80 archivos** decía «no cabían 1» aunque quedaran cientos sin mirar. Ahora avisa de
  que hay más y de que abras una subcarpeta para traer el resto.
- **La barrita de Cece Pro no enseñaba el razonamiento** de Kimi, Claude, OpenAI ni Gemini: solo el que venía dentro del
  texto. Ahora lo enseña en directo en cada paso (relevo y borradores a la vez).
- **La barrita contaba los pasos planeados, no los hechos.** Decía «(12)» aunque solo se hubieran hecho 7. Además, el
  estado («🔎 Buscando…», «X falló, probando otro…») se quedaba puesto mientras ya estaba escribiendo. En el modo de
  borradores, lo que escribió un motor que falló ya no se mezcla con el siguiente.
- **El aviso de coste del relevo no era el real.** Decía «cada mensaje se paga 6 veces», pero el relevo hace de 6 a 12
  llamadas: 6 papeles y hasta 3 vueltas de buscar→corregir. La explicación de Cece Pro ahora describe los papeles.
- **«Probar conexiones» no comprobaba la clave de Muse Wonder.** Ahora sí.
- **Importar un plugin cuyo id venía con un espacio o una «/»** (« traducir», «/traducir») creaba un duplicado
  `traducir2` en vez de actualizar `/traducir`.

## 4 de noviembre de 2026 — depuración: Cece Pro, Cece Live, comandos y nube

Cuatro revisiones (Cece Pro, voz, comandos/plugins y nube) encontraron 15 fallos reales. Cada uno se reprodujo antes de
arreglarlo y tiene una prueba que falla con la versión anterior.

**Cece Pro (relevo)**
- **El paso «Corregir» no veía el trabajo que tenía que corregir.** Solo recibía la lista de errores. En prosa, o en
  código sin nombre de archivo, se perdía todo lo hecho por Base, Completar y Revisar. Ahora recibe la última entrega
  y, además, los errores.
- **Con 4 o 5 modelos, «Calidad máxima» iba al menos adecuado.** Los papeles se repartían con `idx % n` y `5 % 5 = 0`.
  Ahora se cuentan desde el final, así que el último paso va siempre al modelo que mejor encaja con la petición. Con 6
  modelos no cambia nada.
- **El bucle «buscar → corregir» se paraba antes de tiempo.** Bastaba con que la frase «sin errores» apareciera en
  cualquier parte, por ejemplo «…corrigiendo eso, quedará sin errores». Ahora solo cuenta si toda la respuesta es la
  marca `SIN ERRORES`.
- **Muse Wonder ya no entra sin clave.** Con la IA local encendida, el modelo local le hacía de motor. Ahora no tiene
  respaldo: si falta su clave, no participa.

**Cece Live**
- **Muse Wonder ya no se puede elegir como modelo de Live.** Salía en la lista, se guardaba y Live hablaba con él.
- **Sin conexión, un turno de Live ya no queda en la cola del chat.** Antes, al volver la red, el chat lo contestaba por
  su cuenta y con su propio modelo. Si además lo reintentabas en Live, como pedía la pantalla, se pagaba y se
  respondía dos veces. Ahora Live dice que no hay conexión y que lo intentes cuando vuelva.
- **Al perder el micrófono también se para el reconocimiento del navegador.** Antes seguía escuchando, contestaba
  igualmente y Live se quedaba en «Hablando…».
- **Tocar el orbe mientras se abre el micrófono** ya no da «Error interno: … MediaRecorder». Live empieza a escuchar
  solo cuando el micrófono está listo.

**Comandos**
- **`redondear` / `round` redondeaban mal los x,xx5 a partir de 2.** Por ejemplo, `redondear(4,725; 2)` daba 4,72.
  Ahora da 4,73, como Excel.
- **Los enteros de 13 a 15 cifras salían inventados** en `/calc`, en `/convertir` y en el botón 📋. `2^40` daba
  1.099.511.627.780 en vez de 1.099.511.627.776.
- **`/temporizador` con una unidad que no conocía la tomaba como minutos.** Por ejemplo, «2 hrs» sonaba a los 2
  minutos. Ahora entiende `hrs`, `mins`, `segs` y `secs`, y también «1 hora y media». Si después de un número hay una
  palabra que no es una unidad, avisa de cómo escribir el tiempo.
- **`/web` crea apps**, como decía la ayuda. Antes hacía una búsqueda, porque `/buscar` también tenía ese alias y se
  registraba antes. Para buscar en internet siguen `/buscar`, `/search` y `/google`.

**Nube (sincronización entre equipos)**
- **Los plugins se fusionan uno a uno.** Antes ganaba la lista entera del último equipo que tocó algo. Así, activar o
  desactivar un plugin en un equipo con la lista vieja borraba en todos los equipos los plugins creados en el otro,
  sin copia. Ahora gana la versión más reciente de cada plugin, y borrar o renombrar uno deja una marca para que el
  otro equipo no lo devuelva.
- **La apariencia también se fusiona ajuste a ajuste.** Antes, cambiar la letra en un equipo devolvía en el otro el
  tema viejo.
- **«Ya no disponible» ya no viaja entre equipos.** Al continuar en el equipo B una conversación con una imagen que solo
  estaba en el equipo A, B guardaba la marca «perdido» y A pasaba a ver sus propias imágenes como no disponibles.
  Ahora esa marca es solo de cada equipo.
- **«Desvincular este equipo» se desactiva durante una sincronización.** Antes, la ronda en curso volvía a enlazar el
  Gist y deshacía el cambio.

## 4 de noviembre de 2026 — mensajes en cola y citar trozos del chat

- **Ctrl+Enter (o ⌘+Enter) mientras Cece responde pone tu mensaje en cola** en vez de cortar la respuesta. Se ve en
  una bandeja encima del cuadro (🕒 1. …, con 📎/💬 si lleva adjuntos o citas) y sale solo cuando termina la
  respuesta, en orden. Se le aplican sus `/comandos` igual que a un mensaje normal (por ejemplo `/crear …`). Con ✕ lo
  sacas de la cola y vuelve al cuadro para editarlo. Enter normal sigue como antes: corta la respuesta y envía.
- **«💬 Mencionar en el chat»**: al seleccionar un trozo de la conversación aparece ese botón junto a la selección.
  El trozo va a un recuadro encima del cuadro de texto que **no se puede editar** (se quita con ✕); lo que escribes
  sí. Al enviar, Cece recibe esos fragmentos (y quién los dijo) como contexto delante de tu mensaje, y la burbuja los
  muestra como cita. Hasta 5 citas por mensaje. Los `/comandos` se leen de lo que escribes, nunca del texto citado.

## 3 de noviembre de 2026 — subir a GitHub el código que escribe Cece

- El panel **🐙 GitHub** (`/github`) ya permitía conectar tu cuenta, ver repositorios y archivos, editar y guardar un
  archivo y **crear repositorios privados**, siempre con confirmación. Ahora además tiene **«⬆️ Subir el código del
  chat»**: sube de una vez al repositorio y rama elegidos **todos los archivos de código que Cece ha escrito en la
  conversación** (la última versión de cada uno).
- Antes de subir, enseña la lista de archivos, el repositorio, la rama y el mensaje, y pide confirmación. Los archivos
  que ya existan se actualizan (se sobrescriben) y los nuevos se crean. Si alguno falla, dice cuáles.
- Las rutas se suben **sin la carpeta por lenguaje** que Cece usa al descargar (`html/`, `javascript/`…), para que un
  proyecto web quede bien montado (`index.html` junto a `style.css` y `app.js`). Si dos archivos se llamaran igual, se
  conserva la ruta completa.
- Flujo: pídele a Cece que programe algo (o usa `/crear`) → `/github` → conecta con tu token → crea o elige un
  repositorio → «Subir el código del chat». Cada archivo va en su propio commit.
- **Editar un repositorio que ya tienes:** «📥 Traer esta carpeta al chat» adjunta al próximo mensaje los archivos de
  texto de la carpeta que estés viendo (y subcarpetas), cada uno con su ruta, en un solo adjunto. Se saltan
  dependencias (`node_modules`…), archivos generados, binarios e imágenes, y hay un tope (80 archivos, ~250 000
  caracteres; lo que no cabe se nombra). Luego le pides a Cece el cambio, reescribe los archivos con su ruta completa y
  los subes con «Subir el código del chat», que respeta las carpetas (edita `src/app.js`, no crea un `app.js` suelto).
  Ojo: mientras el repo siga en la conversación, cada mensaje lo vuelve a enviar y gasta tokens.
- El token sigue viviendo **solo en la memoria de la pestaña** (no se guarda en el archivo ni en el navegador). Para
  crear repositorios, el token necesita permiso de administración además de contenidos.

## 3 de noviembre de 2026 — Cece Pro pasa a ser un pipeline de papeles

- **Cece Pro por relevo** deja de ser un pase simple entre modelos y pasa a un **pipeline de papeles fijos**: un
  modelo hace la **base**, otro la **completa**, otro **revisa/depura**, otro **busca errores**, otro los **corrige** y
  otro **pule la calidad**. Después repite **buscar errores → corregir** en bucle **hasta que no quede ninguno**.
- El bucle tiene un **tope de 3 vueltas** (`MAX_REV_PRO`) para acotar el coste y evitar que se quede dando vueltas: en
  el peor caso son los 6 papeles + 3 repasos. El paso «buscar» avisa de que no hay errores respondiendo `SIN ERRORES`,
  y entonces el bucle se detiene.
- Si hay menos de seis modelos disponibles, los papeles se reparten entre los que haya (un mismo modelo puede hacer
  varios papeles). Los archivos del equipo se siguen pasando de un paso al siguiente y llegan completos a la respuesta.
- **Barrita en directo, plegable (como ChatGPT/Claude):** mientras trabaja, una sola línea dice qué está haciendo ahora
  («🔧 Corregir · Max · pensando…», «🐞 Buscar errores…»). Tiene una flechita: al pulsarla gira y despliega el detalle
  de cada paso (papel, modelo, estado, el **razonamiento** 💭 y el texto que va escribiendo, todo en directo). Al
  terminar queda plegada con el número de pasos. Vale también para Cece Pro «a la vez».

## 3 de noviembre de 2026 — nuevo motor Muse Wonder (solo Cece Pro)

- **Muse Wonder** se añade como un motor más **dentro de Cece Pro** (sexta parte del relevo/borradores), con su propia
  barra de reparto en Configuración → Cece Pro. **No** aparece como modelo suelto en el menú ni tiene comando propio:
  solo trabaja como parte de Cece Pro.
- Usa un proveedor nuevo (`musewonder`, API compatible con OpenAI en `https://api.meta.ai/v1`, modelo
  `muse-wonder-1.0`). Su clave va en el campo nuevo **`muse`** del bloque de configuración del principio del archivo.
  Mientras esté vacío, Muse Wonder simplemente no participa.
- El **precio está sin fijar** (`PRECIOS_MODELO["muse-wonder-1.0"] = [0, 0]`): hasta que pongas la tarifa real, Cece
  contará ese motor como 0 $. Ajústalo cuando sepas el coste.
- El reparto de Cece Pro pasa a repartir entre **seis** partes; los repartos por defecto antiguos (3, 4 y 5 partes) se
  migran a un reparto parejo para que ninguna parte nueva se quede corta.

## 30 de octubre de 2026 — motor de Cece Max y cuatro arreglos

- **Cece Max pasa a usar el modelo `kimi-k3.1-pro`** (antes `kimi-k3`): se renombra en la lista de modelos de Moonshot,
  en el nombre que se muestra, en los niveles (Pro, Argon, Turbo…) y en la tabla de precios. El precio se deja igual
  (3 $/15 $ por millón) hasta confirmar la tarifa real; cámbialo en `PRECIOS_MODELO` si tu cuenta cobra otra cosa.
- **Reparto de Cece Pro — migración de 4 a 5 partes:** quien venía de la versión de 4 modelos (reparto por defecto
  25/25/25/25) se quedaba con Sol al ~16 % al normalizar. Ahora ese reparto por defecto antiguo se detecta y se
  reparte parejo entre los cinco (20/20/20/20/20). Los repartos personalizados no se tocan.
- **Orden del relevo según la petición — archivos de código:** si adjuntabas un archivo de código sin escribir
  palabras como «código» o «programa», el relevo no detectaba que era una tarea de programación (miraba una lista de
  adjuntos que a esa altura solo tiene imágenes y PDF). Ahora lo detecta por el archivo incrustado en el texto, así que
  los modelos con perfil de código terminan el relevo cuando toca.
- **Parar la fusión de Cece Pro:** si parabas justo cuando estaba fundiendo y aún no había soltado texto, el gasto se
  contaba casi diez veces mayor de lo real (se facturaba el borrador de reserva como si fuera la salida de la fusión).
  Ahora solo se cobra lo que de verdad salió.
- **Vista «Ver» de apps:** la ventana de vista previa no se cerraba con Escape si el foco estaba fuera del recuadro
  (por ejemplo en el fondo de la página). Ahora Escape la cierra desde cualquier parte de Cece. (Si el foco está dentro
  de la propia app —un iframe aislado de otro origen— el navegador no deja oír la tecla al exterior: ahí quedan el
  botón «Cerrar ✕» y el clic en el fondo.)

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
