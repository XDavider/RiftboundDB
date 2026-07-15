@echo off
echo Iniciando Riftbound...

echo Iniciando Backend...
start "Riftbound Backend" cmd /c "cd backend && npm run dev"

echo Iniciando Frontend...
start "Riftbound Frontend" cmd /c "cd frontend && npm run dev"

echo ¡Todo listo! La aplicacion deberia abrirse en el navegador en breves.
