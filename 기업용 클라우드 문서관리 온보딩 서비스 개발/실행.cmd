@echo off
setlocal
cd /d "%~dp0"
set "jihodev_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%jihodev_NODE%" set "jihodev_NODE=node"
if not exist "node_modules\vinext\dist\cli.js" (
  echo Install dependencies first: pnpm install
  pause
  exit /b 1
)
echo jihodev: open the Local URL printed below.
echo Press Ctrl+C to stop.
"%jihodev_NODE%" scripts\run-framework.mjs dev
pause
