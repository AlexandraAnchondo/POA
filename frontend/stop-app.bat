@echo off
echo ======================================
echo   Deteniendo Nginx... 
echo ======================================
cd /d .\nginx
taskkill /f /im nginx.exe
pause
