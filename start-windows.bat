@echo off
cd /d "%~dp0"
node run-local.js
if errorlevel 1 (
  echo.
  echo Node.js is needed. Install it from https://nodejs.org and try again.
)
pause
