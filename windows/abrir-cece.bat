@echo off
rem Abre Cece AI (cece-ai.html, que debe estar en esta misma carpeta) en pantalla completa.
rem Usa Chrome o Edge en una ventana propia (--app) con un perfil propio: si el navegador ya estaba abierto, sin
rem perfil propio ignoraria --start-fullscreen y abriria una pestana normal. Si no hay ninguno, usa el predeterminado.
setlocal
set "HTML=%~dp0cece-ai.html"
if not exist "%HTML%" (
  echo No encuentro cece-ai.html junto a este archivo.
  pause
  exit /b 1
)
set "URL=file:///%HTML:\=/%"
set "PERFIL=%LOCALAPPDATA%\CeceAI\navegador"
set "NAV="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "NAV=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined NAV if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "NAV=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined NAV if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "NAV=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
if not defined NAV if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "NAV=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not defined NAV if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "NAV=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if defined NAV goto pantalla
start "" "%HTML%"
echo No encuentro Chrome ni Edge: Cece AI se abre en el navegador predeterminado, sin pantalla completa.
goto fin
:pantalla
start "" "%NAV%" --user-data-dir="%PERFIL%" --no-first-run --no-default-browser-check --start-fullscreen --app="%URL%"
:fin
endlocal
