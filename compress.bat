@echo off
echo =====================================
echo         MEDIA COMPRESSOR
echo =====================================
echo.

REM Change to the directory where this .bat file is located
cd /d "%~dp0"

REM Check if index.js exists in includes folder
if not exist "includes\index.js" (
    echo ERROR: includes\index.js not found in current directory!
    echo Make sure this .bat file is in the project root folder.
    echo Project structure should be:
    echo   project\
    echo   ├── includes\index.js
    echo   ├── src\
    echo   └── compress.bat
    pause
    exit /b 1
)

REM Run the media compressor
echo Starting compression...
echo.
node includes/index.js

echo.
echo =====================================
echo Compression finished!
echo Press any key to close...
pause >nul