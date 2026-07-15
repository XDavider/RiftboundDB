@echo off
echo Cerrando la aplicacion Riftbound...

echo Deteniendo servidor local...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3001" ^| find "LISTENING"') do (
    echo Cerrando Backend (PID %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| find ":5173" ^| find "LISTENING"') do (
    echo Cerrando Frontend (PID %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

echo Riftbound se ha cerrado correctamente.
timeout /t 3 >nul
