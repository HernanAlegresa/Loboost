@echo off
setlocal

set PORT=3000
set LOCAL_IP=192.168.1.7

echo ============================================
echo   LoBoost - Dev iPhone Mode (WiFi Local)
echo ============================================
echo.
echo Abre esta URL en tu iPhone (mismo WiFi):
echo.
echo   http://%LOCAL_IP%:%PORT%
echo.
echo Hot reload activo. Guarda un archivo y
echo recarga Safari para ver los cambios.
echo.
echo Ctrl+C para detener.
echo ============================================
echo.

cd /d "%~dp0.."
npx next dev --webpack -H 0.0.0.0 --port %PORT%
