# Integración de REA en Cece AI

## Comandos

REA solo se activa cuando el mensaje empieza por `/rea`. Los mensajes normales conservan el flujo habitual.

```text
/rea quiero un clon de <app:Spotify:https://spotify.com>
/rea quiero un clon de https://ejemplo.com
/rea proyectos/mi-app — analiza su estructura JavaScript
```

## Clonación web disponible

El servidor valida la URL pública, obtiene el HTML de la página, sigue un máximo de cuatro redirecciones y guarda la captura en `clones/<dominio>-<fecha>-<id>/index.html` dentro del workspace. Devuelve la ruta del archivo.

**Esta primera versión crea una captura HTML, no un clon funcional completo.** Conserva referencias a CSS, JavaScript, imágenes y APIs remotas; no descarga todos los recursos ni replica APIs privadas, autenticación, bases de datos o lógica de servidor. Algunas webs modernas pueden verse incompletas. El nombre dentro de `<app:...>` es descriptivo: se usa la URL que aparece en esa etiqueta.

## Despliegue

Requisitos: Node.js 22+, npm, acceso a internet desde el servidor y un workspace persistente.

1. Despliega `integraciones/rea/servidor.mjs` como servicio Node.
2. Configura `CECE_REA_TOKEN` (token privado obligatorio), `CECE_REA_WORKSPACE` (ruta absoluta), `PORT` (asignado por la plataforma), `CECE_REA_ORIGIN` (origen CORS restringido) y opcionalmente `CECE_REA_TIMEOUT_MS`.
3. Comprueba `GET /health`; `auth: true` indica que el token está configurado.
4. En Cece AI escribe `/rea` seguido del objetivo. Si falta la configuración, el chat solicita la URL HTTPS y el token; ya no hay un botón flotante de REA.
5. Para analizar una aplicación, indica una carpeta relativa existente dentro del workspace del servidor. Para capturar una página pública, usa la sintaxis `<app:Nombre:https://sitio.com>`.

El servidor exige Bearer token, limita el tamaño del cuerpo HTML y el tiempo de espera, y valida los destinos públicos para reducir riesgos SSRF. No lo expongas sin autenticación.

## Límites y seguridad

- Actualizar GitHub no despliega el servicio ni crea una URL pública.
- La URL del servicio se guarda en `localStorage`; el token solo en `sessionStorage` y no debe subirse al repositorio.
- La captura guarda archivos en el workspace del servidor; el navegador no puede escribir en el disco local del usuario.
- Clona solo sitios para los que tengas autorización y respeta derechos y condiciones.
- `npm test` ejecuta las pruebas de interfaz y las pruebas HTTP del servidor. La ejecución real de REA requiere desplegar el servicio y tener acceso a npm desde él; actualizar GitHub no despliega el servicio.

## Referencias

- [Repositorio oficial de REA](https://github.com/morluto/rea)
- [Documentación de instalación](https://github.com/morluto/rea/blob/main/docs/installation.md)
- [Paquete npm rea-agents](https://www.npmjs.com/package/rea-agents)
