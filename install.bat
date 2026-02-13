@echo off
setlocal EnableDelayedExpansion

REM Check for admin privileges and auto-elevate if needed
net session >nul 2>&1
if errorlevel 1 (
    echo Requesting Administrator privileges...
    PowerShell -Command "Start-Process cmd -ArgumentList '/c \"%~f0\"' -Verb RunAs"
    exit /b 0
)

echo ========================================
echo         INSTALLER
echo ========================================
echo Running with Administrator privileges
echo.
echo This will install everything needed and run a test compression.
echo Please run this file as Administrator!
pause

REM Change to the directory where this .bat file is located
cd /d "%~dp0"

echo [1/6] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo Node.js not found. Installing via Chocolatey...
    
    REM Check if Chocolatey is installed
    choco --version >nul 2>&1
    if errorlevel 1 (
        echo Installing Chocolatey first...
        powershell -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"
        if errorlevel 1 (
            echo ERROR: Failed to install Chocolatey
            pause
            exit /b 1
        )
        echo Chocolatey installed
    )
    
    echo Installing Node.js LTS...
    choco install nodejs-lts -y
    if errorlevel 1 (
        echo ERROR: Failed to install Node.js
        pause
        exit /b 1
    )
    echo Node.js is installed
) else (
    echo Node.js is installed
)

echo.
echo [2/6] Checking FFmpeg...
ffmpeg -version >nul 2>&1
if errorlevel 1 (
    echo FFmpeg not found. Installing via Chocolatey...
    
    REM Chocolatey should be installed from step 1, but double-check
    choco --version >nul 2>&1
    if errorlevel 1 (
        echo Installing Chocolatey...
        powershell -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"
        if errorlevel 1 (
            echo ERROR: Failed to install Chocolatey
            pause
            exit /b 1
        )
        echo Chocolatey installed
    )
    
    echo Installing FFmpeg...
    choco install ffmpeg -y
    if errorlevel 1 (
        echo ERROR: Failed to install FFmpeg
        echo.
        echo This might be due to:
        echo - Internet connection issues
        echo - Antivirus blocking the installation
        echo - Insufficient permissions
        echo.
        echo Try running this installer again, or install FFmpeg manually.
        pause
        exit /b 1
    )
    echo FFmpeg installed
    
    REM Refresh PATH
    echo Refreshing environment variables...
    call refreshenv >nul 2>&1
    echo Environment refreshed
) else (
    echo FFmpeg is installed
)

echo.
echo [3/6] Installing npm dependencies...
echo Current directory: %CD%
echo Checking for package.json in includes folder...
if not exist "includes\package.json" (
    echo ERROR: includes\package.json not found!
    echo Make sure this installer is in the project root folder.
    echo Project structure should be:
    echo   project\
    echo   ├── includes\
    echo   │   ├── index.js
    echo   │   └── package.json
    echo   └── INSTALL-EVERYTHING.bat
    echo.
    echo Files in includes directory:
    dir includes /b 2>nul
    pause
    exit /b 1
)

echo Installing npm dependencies in includes folder...
echo This may take a moment...
cd includes
call npm install
set npm_exit_code=%errorlevel%
cd ..
if %npm_exit_code% neq 0 (
    echo WARNING: npm install had some issues, but continuing...
    echo You can run 'npm install' manually in includes folder if needed.
) else (
    echo npm dependencies installed successfully
)

echo.
echo [4/6] Creating test environment...

REM Create src directory if it doesn't exist
if not exist "src" (
    mkdir "src"
    if exist "src" (
        echo Created src directory
    ) else (
        echo ERROR: Failed to create src directory
        pause
        exit /b 1
    )
) else (
    echo src directory already exists
)

REM Create dist directory if it doesn't exist  
if not exist "dist" (
    mkdir "dist"
    if exist "dist" (
        echo Created dist directory
    ) else (
        echo ERROR: Failed to create dist directory
        pause
        exit /b 1
    )
) else (
    echo dist directory already exists
)

REM Copy any image files from main directory to src for testing
for %%f in (includes\*.jpg includes\*.jpeg includes\*.png includes\*.bmp includes\*.tiff includes\*.webp) do (
    echo Copying %%f to src folder...
    copy "%%f" "src\" >nul 2>&1
)
echo Test environment ready

echo.
echo [5/6] Running test compression...
node includes/index.js --test-only
echo Test compression completed
echo.
echo [6/6] Installation complete!
echo.
echo ========================================
echo           READY TO USE!
echo ========================================
echo.
echo Your media compressor is now ready!
echo.
echo Available .bat files:
echo - compress.bat - Compress all media
echo - compress-video-hq.bat - High quality video compression  
echo - clean-and-compress.bat - Clean and compress all
echo.
echo Manual usage: node includes/index.js [options]
echo Help: node includes/index.js --help
echo.
echo Put your images/videos in the 'src' folder and run!
echo Compressed files will appear in 'dist' folder.
echo.
pause