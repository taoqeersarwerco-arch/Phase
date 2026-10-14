@echo off
title Phase Cinema - Local Media Server
color 0F
cls
echo ========================================================
echo   PHASE CINEMA - High-Performance Streaming Platform
echo ========================================================
echo.
echo  [1/2] Initializing Phase server on http://localhost:8080 ...
echo  [2/2] Opening your default web browser ...
echo.
echo  To watch in 4K, select any title and click "Watch in VLC".
echo  Press Ctrl+C in this window when you want to stop the server.
echo ========================================================
echo.

:: Wait 1 second then open browser
start "" cmd /c "timeout /t 1 /nobreak >nul & start http://localhost:8080"

:: Start Node.js server
node server.js

pause
