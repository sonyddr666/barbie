@echo off
cd /d "%~dp0"
set "PORT=8087"
where node >nul 2>nul
if errorlevel 1 (
  echo Instale o Node.js para abrir a Palace Engine.
  pause
  exit /b 1
)
if not exist "node_modules\three\build\three.module.js" (
  call npm install --omit=dev
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
node server.cjs --open --editor
pause
