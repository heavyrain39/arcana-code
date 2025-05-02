@echo off
echo ===================================
echo  Attempting to stop Arcana Code Server...
echo ===================================
echo.

REM Find the process by window title and terminate it forcefully
taskkill /FI "WINDOWTITLE eq ArcanaCodeServer" /F /T > nul

echo.
echo Stop command sent. If the server was running, it should be terminated.
echo Check the server window (if open) or try accessing http://localhost:3000 to confirm.
echo.
echo ===================================

pause