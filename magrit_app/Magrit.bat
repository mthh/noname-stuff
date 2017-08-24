@echo off
start dist\app\app.exe --no-redis
timeout /t 2 /nobreak > NUL
start firefox http://localhost:9999/