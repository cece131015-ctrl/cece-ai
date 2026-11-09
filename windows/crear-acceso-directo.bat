@echo off
rem Crea "Cece AI.lnk" en el escritorio. Al pulsar Ctrl+Alt+C abre Cece AI (abrir-cece.bat) en pantalla completa.
rem Ejecutalo una vez. Tiene que estar en la misma carpeta que abrir-cece.bat y cece-ai.html.
setlocal
set "CECE_DIR=%~dp0"
rem Si se abre desde dentro del .zip, Windows solo saca este archivo a una carpeta temporal que luego borra:
rem el acceso directo apuntaria a algo que ya no existe y Ctrl+Alt+C no haria nada.
if not exist "%CECE_DIR%abrir-cece.bat" goto faltan
if not exist "%CECE_DIR%cece-ai.html" goto faltan
powershell -NoProfile -ExecutionPolicy Bypass -Command "$d=[Environment]::GetFolderPath('Desktop'); $s=(New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $d 'Cece AI.lnk')); $s.TargetPath=(Join-Path $env:CECE_DIR 'abrir-cece.bat'); $s.WorkingDirectory=$env:CECE_DIR; $s.WindowStyle=7; $s.Description='Abre Cece AI en pantalla completa'; $s.Hotkey='CTRL+ALT+C'; $s.Save()"
if errorlevel 1 (
  echo No se pudo crear el acceso directo.
) else (
  echo Listo: "Cece AI" esta en el escritorio. Pulsa Ctrl+Alt+C para abrirlo.
)
pause
endlocal
exit /b 0
:faltan
echo No encuentro cece-ai.html y abrir-cece.bat junto a este archivo.
echo Si lo has abierto desde dentro del .zip, extrae antes la carpeta: clic derecho en el .zip, "Extraer todo".
echo Despues ejecuta crear-acceso-directo.bat desde la carpeta extraida.
pause
endlocal
exit /b 1
