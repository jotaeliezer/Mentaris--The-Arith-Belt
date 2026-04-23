@echo off
setlocal
REM Repo root = parent of this file's directory (works from scripts\ or dev\)
set "REPO=%~dp0.."
cd /d "%REPO%"
set "REPO=%CD%"

echo.
echo === Mentaris local dev: build, sync dev\public, server, watch ===
echo.
echo Before continuing: CLOSE any previous "Mentaris dev server" and "Mentaris watch" windows,
echo and close browser tabs on http://localhost:4173  (they lock public\*.bundle.js on Windows^).
echo If build says "user-mapped section" or "cannot perform on a file" -- those were still open.
echo.
pause

set SYNC_DEV_WORKSPACE=1
call npm run build
if errorlevel 1 (
  echo BUILD FAILED
  pause
  exit /b 1
)

echo.
echo Starting static server on http://localhost:4173 ...
start "Mentaris dev server" /D "%REPO%" cmd /k "npx --yes serve dev\public -l 4173"

timeout /t 2 /nobreak >nul
start "" "http://localhost:4173/home.html"
start "" "http://localhost:4173/asteroid_blaster.html"
start "" "http://localhost:4173/side_ops.html"

echo.
echo Starting esbuild watch - edits to src\ re-bundle to public\ then auto-sync dev\public ...
start "Mentaris watch" /D "%REPO%" cmd /k "set SYNC_DEV_WORKSPACE=1&& npm run watch"

echo.
echo   Home:     http://localhost:4173/home.html
echo   Game:     http://localhost:4173/asteroid_blaster.html
echo   Side Ops: http://localhost:4173/side_ops.html
echo.
echo Close the "dev server" and "watch" windows when done.
pause
