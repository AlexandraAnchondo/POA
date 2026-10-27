@echo off
echo ======================================
echo   Iniciando proceso de despliegue...
echo ======================================

:: Paso 1: Build del proyecto (asegúrate de estar en la carpeta del frontend)
echo ======================================
echo   Ejecutando build del proyecto... 
echo ======================================
call npm run build

:: Paso 2: Borrar carpeta html en Nginx y copiar los nuevos archivos
echo ======================================
echo   Reemplazando archivos en .\nginx\html... 
echo ======================================
rmdir /s /q .\nginx\html
xcopy /s /e /y /i .\dist .\nginx\html

:: Paso 3: Detener Nginx
echo ======================================
echo   Deteniendo Nginx... 
echo ======================================
cd /d .\nginx
taskkill /f /im nginx.exe

:: Paso 4: Iniciar Nginx
echo ======================================
echo   Iniciando Nginx... 
echo ======================================
start nginx

echo ======================================
echo  Despliegue completado correctamente
echo ======================================
pause
