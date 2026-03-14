@echo off
cd /d "%~dp0"
title Roger Launcher - Debug Mode

:: Debug: Show first line is executing
echo STARTING DEBUG MODE...
echo.

:: Check if opencode exists
where opencode >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Opencode found in PATH
) else (
    echo [ERROR] Opencode NOT found in PATH!
    echo Please ensure Opencode is installed and in your PATH
    pause
    exit /b 1
)

:: Check node
where node >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Node.js found in PATH
) else (
    echo [ERROR] Node.js NOT found in PATH!
    pause
    exit /b 1
)

echo.
echo [1/4] Cleaning up old node processes...
taskkill /F /IM node.exe >nul 2>&1

echo [2/4] Starting Opencode server...
start "" /B opencode serve --port 55222 --hostname 127.0.0.1 > opencode_serve.log 2>&1

timeout /t 3 >nul

echo [3/4] Starting webhook server...
start "" /B node server.js > bridge.log 2>&1

timeout /t 3 >nul

echo [4/4] Launching tunnel...
echo.
echo ============================================================
echo  Copy this URL to Feishu:
echo ============================================================
echo.

bin\cloudflared.exe tunnel --url http://localhost:3000

echo.
echo Tunnel closed. Cleaning up...
taskkill /F /IM node.exe >nul 2>&1
pause