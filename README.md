# Cece AI

Todo Cece AI es **un solo archivo**: [`cece-ai.html`](cece-ai.html). Se abre con doble clic en el navegador
(Chrome o Edge recomendados) y no necesita instalar nada.

## Usarlo

1. Abre `cece-ai.html` con el Bloc de notas y rellena las claves del bloque de configuración del principio
   (`CECE_KEYS`). Las que no uses se pueden dejar vacías.
2. Ábrelo en el navegador. En ⚙️ Configuración → 🔌 Conexiones puedes comprobar que cada clave funciona.
3. Recomendado: ⚙️ Configuración → 🔐 Seguridad → cifrar las claves con contraseña. Se descarga una copia
   protegida (AES-256-GCM); usa esa y borra la que tiene las claves a la vista.

## Cambiarlo

Dentro de `cece-ai.html` el programa va empaquetado. Para trabajar con él:

```bash
npm install                      # herramientas (terser, prettier, eslint)
npm run desempaquetar            # cece-ai.html → fuente/   (sobrescribe fuente/)
# … editar fuente/programa.js, fuente/pagina.html o fuente/cecehub-server.py …
npm run empaquetar               # fuente/ → cece-ai.html
npm run lint                     # eslint + ruff
npm run probar                   # pruebas en Chromium (necesita Playwright)
```

| Archivo | Qué es |
|---|---|
| `cece-ai.html` | La aplicación lista para usar. Los estilos, el bloque de claves y los emojis se editan aquí directamente. |
| `fuente/programa.js` | El JavaScript de la aplicación, legible. Al empaquetar se minimiza con terser. |
| `fuente/pagina.html` | El HTML de la interfaz (se inserta al abrir el archivo). |
| `fuente/cecehub-server.py` | El servidor CeceHub que Cece ofrece para descargar (va dentro de `programa.js`). Su `VERSION` tiene que ser igual que `CECEHUB_VERSION`. |
| `herramientas/` | `desempaquetar.js`, `empaquetar.js` y `probar.js`. |
| `CAMBIOS.md` | Informe de la depuración: qué fallaba y qué se ha cambiado. |

### Pruebas

`npm run probar` abre la aplicación en un Chromium sin ventana con **todas las IAs simuladas** (no sale nada a
internet ni se gasta saldo) y prueba: cada motor y su formato de respuesta, Cece Pro (a la vez y por relevo), los
plugins y su aislamiento, el Markdown frente a HTML malicioso, el cifrado de las claves, la nube, el modo sin
conexión, los adjuntos, «Parar», el micrófono y CeceHub de verdad (con `python3`).

Para instalar Playwright: `npm i -D playwright && npx playwright install chromium`.
Se puede probar otro archivo o filtrar por nombre: `node herramientas/probar.js otra-copia.html "cifrar|nube"`.

## Integración con GitHub

La versión empaquetada de `cece-ai.html` incluye un panel **🐙 GitHub** para conectar con la API oficial, listar repositorios, navegar por carpetas, leer/editar archivos, guardar commits y crear repositorios privados. Cada escritura requiere confirmación explícita.

- El token se introduce en el panel y permanece solo en memoria de la pestaña; no se guarda en `localStorage` ni se añade al código.
- Usa un token fine-grained limitado a los repositorios necesarios, con **Contents: Read and write** y **Metadata: Read-only**. Para crear repositorios, concede además el permiso de administración requerido por GitHub.
- No pegues el token en el código, en el chat ni en capturas. Pulsa **Desconectar y borrar token** cuando termines.
- La aplicación añade al arrancar una pantalla breve con **«Creado por Cece AI»**.
- La integración está insertada en el HTML empaquetado; al editar y reconstruir el proyecto, comprueba que el bloque `CECE_GITHUB_PANEL_V1` siga presente en el archivo de salida.

Documentación de permisos: https://docs.github.com/en/rest/authentication/permissions-required-for-fine-grained-personal-access-tokens
