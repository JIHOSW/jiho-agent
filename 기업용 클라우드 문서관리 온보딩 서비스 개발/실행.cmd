@echo off
setlocal
cd /d "%~dp0"
set "FIRSTMILE_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%FIRSTMILE_NODE%" set "FIRSTMILE_NODE=node"
if not exist "node_modules\vinext\dist\cli.js" (
  echo Install dependencies first: pnpm install
  pause
  exit /b 1
)
echo FIRSTMILE: open the Local URL printed below.
echo Press Ctrl+C to stop.
"%FIRSTMILE_NODE%" scripts\run-framework.mjs dev
pause
