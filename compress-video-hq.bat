@echo off
echo =====================================
echo    VIDEO COMPRESSOR (High Quality)
echo =====================================
echo.

REM Change to the directory where this .bat file is located
cd /d "%~dp0"

REM Check if index.js exists
if not exist "includes\index.js" (
    echo ERROR: includes\index.js not found in current directory!
    echo Make sure this .bat file is in the project root folder.
    pause
    exit /b 1
)

REM Run video compression with high quality
echo Starting video compression (high quality)...
echo.
node includes/index.js --video-only --high-quality

echo.
echo =====================================
echo Video compression finished!
echo Press any key to close...
pause >nul