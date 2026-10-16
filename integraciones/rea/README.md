# Integración de REA en Cece AI

## Qué hace esta integración

Cece AI mantiene el comando especial **`/rea`**. Los mensajes normales no activan REA. La versión HTML ofrece un pequeño botón **Configurar REA** y, cuando se configura un servicio remoto, envía la ruta objetivo a ese servicio. El servidor ejecuta el comando oficial de análisis estático de `rea-agents` y devuelve su resultado; la interfaz no afirma que REA se ejecutó si el servicio falla.

**Importante:** un archivo HTML en el navegador no puede ejecutar la CLI de REA ni leer rutas del disco del servidor/ordenador sin un servicio con permisos explícitos. Este puente remoto analiza carpetas que ya estén dentro del workspace del servidor. No puede analizar una ruta local de tu PC directamente, ni implica que todas las capacidades MCP de REA estén disponibles a través de esta API.

## Sintaxis del chat

```text
/rea proyectos/mi-app — analiza la estructura JavaScript y sus módulos
```

- La ruta debe ser relativa al workspace del servidor, por ejemplo `proyectos/mi-app`.
- La carpeta debe existir en el servidor antes de ejecutar el comando.
- La parte opcional después de `—` describe el objetivo para conservarlo en el flujo de trabajo; el analizador estático ejecutado por este endpoint devuelve el análisis de la aplicación.
- `/rea` sin objetivo solicita que se indique una ruta.
- Un mensaje que no comienza con `/rea` no activa el flujo REA.
- La URL del servidor se guarda en `localStorage`; el token se conserva solo en `sessionStorage` y no se escribe en el repositorio.

## Desplegar el servicio remoto

Requisitos: Node.js **22.19 o posterior compatible con REA**, npm, conexión a npm y un directorio de workspace con las aplicaciones que se autoriza analizar.

1. Despliega `integraciones/rea/servidor.mjs` en un servicio Node.js (por ejemplo, un servicio web privado).
2. Define las variables de entorno:
   - `CECE_REA_TOKEN`: token aleatorio largo y privado, obligatorio.
   - `CECE_REA_WORKSPACE`: ruta absoluta de la carpeta que contendrá las aplicaciones autorizadas.
   - `PORT`: puerto proporcionado por la plataforma (por defecto 4317).
   - `CECE_REA_ORIGIN`: origen permitido por CORS. El valor por defecto es `*`; para producción, restríngelo al origen de tu interfaz cuando sea posible.
   - `CECE_REA_TIMEOUT_MS`: tiempo límite en milisegundos (por defecto 120000).
3. Asegúrate de que la carpeta del workspace contiene la aplicación a analizar. El servicio no ofrece un endpoint de subida ni clona automáticamente aplicaciones.
4. Comprueba `GET /health`. La respuesta `auth: true` indica que el token está configurado; no garantiza por sí sola que el análisis REA esté listo.
5. En Cece AI pulsa **Configurar REA**, introduce la URL HTTPS del servicio y el valor de `CECE_REA_TOKEN`.
6. Envía `/rea proyectos/mi-app — explica los módulos`.

El servidor ejecuta `npx --yes rea-agents@latest analyze-javascript-application <ruta> --json` mediante `spawn` con argumentos separados, sin shell. Rechaza rutas absolutas y traversal fuera del workspace, exige Bearer token y limita el tamaño de la petición y el tiempo de ejecución.

## Límites y seguridad

- El servicio debe desplegarse y configurarse por separado; subir este archivo a GitHub **no lo despliega** ni crea una URL.
- No uses el servicio público sin autenticación ni compartas el token. Para producción, configura CORS restrictivo, HTTPS y controles de acceso adicionales.
- El servicio solo expone análisis estático de aplicaciones JavaScript mediante el comando CLI documentado; no es un proxy genérico para ejecutar cualquier herramienta MCP de REA.
- Analiza solo software para el que tengas autorización. No envíes contraseñas, tokens ni datos privados.
- No se han incluido credenciales en los archivos.

## Referencias oficiales

- [Repositorio de REA](https://github.com/morluto/rea)
- [Instalación y configuración](https://github.com/morluto/rea/blob/main/docs/installation.md)
- [Paquete npm rea-agents](https://www.npmjs.com/package/rea-agents)
