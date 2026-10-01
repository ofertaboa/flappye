@echo off
chcp 65001 >nul
title Flappy Copo - servidor local
cd /d "%~dp0"
if "%PORT%"=="" set PORT=8090
echo.
echo  ==========================================
echo    Flappy Copo - servidor local (estatico)
echo  ==========================================
echo.
echo  Abra no navegador:  http://localhost:%PORT%/flappye/
echo  (a barra do base path /flappye e a mesma do GitHub Pages)
echo.
echo  Para publicar NA RAIZ (Netlify/Cloudflare) rode antes:
echo      node tools\setup.js --root
echo  Para voltar ao base do GitHub Pages:
echo      node tools\setup.js
echo.
node tools\server.js
pause
