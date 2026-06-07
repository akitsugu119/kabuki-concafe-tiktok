@echo off
cd /d "%~dp0"
echo ==============================================
echo   Kabuki Concafe TikTok matome - starting up
echo.
echo   PC      :  http://localhost:3030
echo   Smapho  :  http://192.168.2.103:3030
echo.
echo   * Open the Smapho URL on a phone on the SAME Wi-Fi.
echo   * Close this window to stop the server.
echo ==============================================
echo.
call npm run dev -- --port 3030 -H 0.0.0.0
echo.
echo Server stopped. Press any key to close.
pause >nul
