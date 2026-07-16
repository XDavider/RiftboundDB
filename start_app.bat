@echo off
echo Iniciando Riftbound...

echo Iniciando Backend...
start "Riftbound Backend" cmd /k "cd backend && npm start"

echo Iniciando Frontend...
start "Riftbound Frontend" cmd /c "cd frontend && npm run dev"

echo ¡Todo listo! La aplicacion deberia abrirse en el navegador en breves.
