@echo off
rem Abre Cece AI (cece-ai.html, que debe estar en esta misma carpeta) en pantalla completa.
rem Usa Chrome o Edge con --start-fullscreen; si no hay ninguno, abre el navegador predeterminado.
setlocal
set "HTML=%~dp0cece-ai.html"
if not exist "%HTML%" (
  echo No encuentro cece-ai.html junto a este archivo.
  pause
  exit /b 1
)
set "URL=file:///%HTML:\=/%"
set "NAV="
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "NAV=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined NAV if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "NAV=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined NAV if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set "NAV=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not defined NAV if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set "NAV=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if defined NAV goto pantalla
start "" "%HTML%"
echo No encuentro Chrome ni Edge: Cece AI se abre en el navegador predeterminado, sin pantalla completa.
goto fin
:pantalla
start "" "%NAV%" --start-fullscreen "%URL%"
:fin
endlocal
