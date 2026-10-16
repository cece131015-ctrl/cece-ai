# Integración de REA en Cece AI

Este documento describe la integración parcial de **REA (Reverse Engineer Anything)** en Cece AI y distingue el comando de chat de la ejecución real de las herramientas.

## Estado actual

- Cece AI reconoce `/rea` como comando explícito y `/reverse-engineer` como alias.
- La lógica de `/rea` está en `fuente/programa.js`.
- **La interfaz HTML no inicia procesos locales ni se conecta automáticamente a una sesión MCP.** Por tanto, registrar el comando no significa que REA se haya ejecutado.
- Si el entorno de IA no tiene acceso real a REA, el modelo debe indicarlo y no inventar análisis, resultados ni evidencias.
- No se han añadido claves, tokens ni credenciales a este repositorio.

## Activación exclusiva con `/rea`

Para pedir un análisis, escribe el comando al principio del mensaje:

```text
/rea D:/proyectos/mi-app — investiga cómo funciona el inicio de sesión
```

El texto después de `/rea` se convierte en la solicitud de análisis. Un mensaje normal que no comience con `/rea` no activa el flujo especial de REA.

Ejemplo sin objetivo:

```text
/rea
```

Cece AI solicita que se especifique la aplicación o ruta y qué se quiere investigar.

## Requisitos oficiales de REA

La distribución oficial del proyecto es el repositorio [morluto/rea](https://github.com/morluto/rea) y el paquete npm [rea-agents](https://www.npmjs.com/package/rea-agents). Consulta la [guía oficial de instalación](https://github.com/morluto/rea/blob/main/docs/installation.md) antes de instalar o configurar.

La guía oficial consultada indica que REA admite Node.js 22.x desde 22.19, 24.x desde 24.11 y 26 o superior. Node.js 23 y 25 no están soportados según esa guía.

Inicio de la configuración guiada:

```bash
npx rea-agents@latest setup
```

REA muestra el plan de configuración y solicita aprobación antes de modificar la configuración del agente o instalar dependencias opcionales como Hopper. Revisa cada cambio y reinicia el cliente MCP cuando termine.

Para un análisis puntual de una aplicación JavaScript/Electron extraída, la guía oficial también documenta:

```bash
npx -y rea-agents@latest analyze-javascript-application /ruta/absoluta/a/la/app --json
```

Sustituye la ruta de ejemplo por la ruta real del objetivo. Los comandos disponibles y sus requisitos dependen de la versión instalada y del tipo de análisis. Los análisis nativos pueden requerir configurar un motor como Hopper, Ghidra o IDA; no todos los análisis tienen los mismos requisitos.

## Arquitectura necesaria para una conexión real

REA ofrece un servidor MCP local. Para que el comando de Cece AI lo ejecute de verdad, hace falta una capa de conexión que:

1. Se ejecute en un entorno con permisos para iniciar o conectarse al proceso REA.
2. Inicie el servidor MCP mediante el mecanismo documentado por REA o se conecte a una instancia ya configurada.
3. Envíe la tarea y procese la respuesta conforme al protocolo y las herramientas que anuncie la versión activa.
4. Devuelva a Cece AI resultados y evidencias reales, con errores y límites explícitos.
5. Pida autorización antes de acciones que modifiquen archivos, instalen componentes o cambien configuraciones.

**No es suficiente incluir un comando en JavaScript del navegador.** Un HTML abierto directamente en el navegador no puede arrancar por sí solo una CLI local ni hablar con un servidor MCP stdio. Para ello se necesita una aplicación anfitriona o puente local compatible, o una integración MCP del agente que esté usando Cece AI.

Esta capa de conexión no está implementada por este cambio. Hasta que se desarrolle y pruebe, `/rea` prepara y transmite la intención de análisis al modelo, pero no garantiza que las herramientas REA estén disponibles.

## Seguridad y uso responsable

- Analiza solo aplicaciones, archivos y sistemas para los que tengas autorización.
- No copies secretos, tokens, contraseñas ni datos privados a los mensajes o registros.
- Revisa los planes de instalación y configuración antes de aprobarlos.
- No afirmes que se ha inspeccionado un archivo o ejecutado una herramienta si no existe evidencia verificable de esa operación.

## Referencias oficiales

- [Repositorio de REA](https://github.com/morluto/rea)
- [Instalación y configuración](https://github.com/morluto/rea/blob/main/docs/installation.md)
- [Paquete npm rea-agents](https://www.npmjs.com/package/rea-agents)
- [Web oficial de REA](https://rea.tools/)
