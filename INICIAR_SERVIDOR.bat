@echo off
title HYPER-SLEEP - Servidor local
cd /d "%~dp0"
set "PORT=8087"
where node >nul 2>nul
if errorlevel 1 (
  echo O Node.js nao foi encontrado.
  echo Instale o Node.js e abra este arquivo novamente.
  pause
  exit /b 1
)
if not exist "node_modules\three\build\three.module.js" (
  echo Instalando os recursos do jogo...
  call npm install --omit=dev
  if errorlevel 1 (
    echo Nao foi possivel instalar os recursos.
    pause
    exit /b 1
  )
)
echo.
echo Jogo:   http://127.0.0.1:8087/
echo Editor: http://127.0.0.1:8087/editor.html
echo Deixe esta janela aberta enquanto joga.
echo Para desligar o servidor, pressione Ctrl+C.
echo.
node server.cjs --open
if errorlevel 1 pause
