@echo off
REM Set a unique title for the command prompt window
title Arcana Code v1.0 Server

echo ===================================
echo  Starting Arcana Code v1.0 Server...
echo ===================================
echo.

REM Start the default web browser and navigate to localhost:3000
echo Opening Arcana Code in your default browser...
start http://localhost:3000

echo.
echo Server logs will be displayed below.
echo To stop the server, close this window or press Ctrl+C.
echo Or use the stop.bat script.
echo.

REM ★★★ Run the Node.js server using node ★★★
node server.js

echo.
echo ===================================
echo  Arcana Code Server has stopped.
echo ===================================

REM Keep the window open after stopping to see messages
pause