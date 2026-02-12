@echo off
echo =====================================
echo    CLEAN AND COMPRESS ALL MEDIA
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

REM Run with clean option
echo Cleaning output directory and compressing all media...
echo.
node includes/index.js --clean

echo.
echo =====================================
echo Clean compression finished!
echo Press any key to close...
pause >nul