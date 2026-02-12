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
echo         UNINSTALLER
echo ========================================
echo Running with Administrator privileges 
echo.
echo WARNING: This will completely remove:
echo.
echo [SYSTEM COMPONENTS]
echo FFmpeg (video compression tool)
echo Chocolatey (package manager)
echo Node.js LTS (if installed via Chocolatey)
echo.
echo [PROJECT FILES]
echo All npm dependencies in includes/node_modules/
echo package-lock.json
echo All compressed files in dist/ and src/compressed/
echo.
echo [SYSTEM CHANGES]
echo PATH environment variables will be cleaned
echo Chocolatey environment variables will be removed
echo.
echo This action CANNOT be undone!
echo.
echo If you have other projects using FFmpeg or Chocolatey,
echo they will STOP WORKING after this uninstall.
echo.
pause
echo.
echo Are you ABSOLUTELY SURE you want to continue?
echo Type "DELETE EVERYTHING" to proceed (case sensitive):
echo.
set /p confirm="> "

if not "%confirm%"=="DELETE EVERYTHING" (
    echo.
    echo Uninstall cancelled. No changes were made.
    pause
    exit /b 0
)

echo.
echo ========================================
echo    STARTING UNINSTALL PROCESS
echo ========================================

REM Change to the directory where this .bat file is located
cd /d "%~dp0"
echo.

echo [1/6] Removing project npm dependencies...
if exist "includes\node_modules" (
    echo Removing includes\node_modules...
    rmdir /s /q "includes\node_modules" 2>nul
    if exist "includes\node_modules" (
        echo WARNING: Some files in node_modules could not be deleted (files may be in use)
        echo Trying alternative method...
        call PowerShell -Command "Remove-Item -Path 'includes\node_modules' -Recurse -Force -ErrorAction SilentlyContinue"
    )
    echo node_modules removed
) else (
    echo node_modules not found (already clean)
)

if exist "includes\package-lock.json" (
    del "includes\package-lock.json" 2>nul
    echo package-lock.json removed
)

echo.
echo [2/6] Removing compressed files...
if exist "dist" (
    echo Removing dist folder...
    rmdir /s /q "dist" 2>nul
    echo dist folder removed
)

if exist "src\compressed" (
    echo Removing src\compressed folder...
    rmdir /s /q "src\compressed" 2>nul
    echo src\compressed folder removed
)

for /d %%d in (src\*) do (
    if exist "%%d\compressed" (
        echo Removing %%d\compressed...
        rmdir /s /q "%%d\compressed" 2>nul
    )
)

echo.
echo [3/6] Checking installed components...

REM Check what's installed
set "ffmpeg_installed=false"
set "choco_installed=false"
set "nodejs_via_choco=false"

ffmpeg -version >nul 2>&1
if not errorlevel 1 (
    set "ffmpeg_installed=true"
    echo FFmpeg is installed
)

choco --version >nul 2>&1
if not errorlevel 1 (
    set "choco_installed=true"
    echo Chocolatey is installed
    
    REM Check if Node.js was installed via Chocolatey
    choco list nodejs-lts --local-only >nul 2>&1
    if not errorlevel 1 (
        set "nodejs_via_choco=true"
        echo Node.js LTS installed via Chocolatey
    )
)

echo.
echo [4/6] Uninstalling Chocolatey packages...
if "%choco_installed%"=="true" (
    if "%nodejs_via_choco%"=="true" (
        echo Uninstalling Node.js LTS...
        choco uninstall nodejs-lts -y --remove-dependencies
        if errorlevel 1 (
            echo WARNING: Failed to uninstall Node.js LTS
        ) else (
            echo Node.js LTS uninstalled
        )
    )
    
    if "%ffmpeg_installed%"=="true" (
        echo Uninstalling FFmpeg...
        choco uninstall ffmpeg -y --remove-dependencies
        if errorlevel 1 (
            echo WARNING: Failed to uninstall FFmpeg
        ) else (
            echo FFmpeg uninstalled
        )
    )
    
    echo Uninstalling all remaining Chocolatey packages...
    choco uninstall all -y 2>nul
) else (
    echo Chocolatey not installed (skipping package removal)
)

echo.
echo [5/6] Removing Chocolatey completely...
if "%choco_installed%"=="true" (
    echo Removing Chocolatey directories...
    if exist "%ProgramData%\chocolatey" (
        rmdir /s /q "%ProgramData%\chocolatey" 2>nul
        call PowerShell -Command "Remove-Item -Path '$env:ProgramData\chocolatey' -Recurse -Force -ErrorAction SilentlyContinue"
    )
    
    if exist "%USERPROFILE%\.chocolatey" (
        rmdir /s /q "%USERPROFILE%\.chocolatey" 2>nul
        call PowerShell -Command "Remove-Item -Path '$env:USERPROFILE\.chocolatey' -Recurse -Force -ErrorAction SilentlyContinue"
    )
    
    echo Chocolatey directories removed
) else (
    echo Chocolatey not installed (skipping directory removal)
)

echo.
echo [6/6] Cleaning environment variables...
call PowerShell -Command ^
"[Environment]::SetEnvironmentVariable('ChocolateyInstall', $null, 'User'); ^
[Environment]::SetEnvironmentVariable('ChocolateyInstall', $null, 'Machine'); ^
[Environment]::SetEnvironmentVariable('ChocolateyLastPathUpdate', $null, 'User'); ^
[Environment]::SetEnvironmentVariable('ChocolateyLastPathUpdate', $null, 'Machine'); ^
$machinePath = [Environment]::GetEnvironmentVariable('PATH', 'Machine'); ^
if ($machinePath) { ^
$cleanPath = $machinePath -replace [regex]::Escape('C:\ProgramData\chocolatey\bin;'), ''; ^
[Environment]::SetEnvironmentVariable('PATH', $cleanPath, 'Machine') ^
}; ^
$userPath = [Environment]::GetEnvironmentVariable('PATH', 'User'); ^
if ($userPath) { ^
$cleanUserPath = $userPath -replace [regex]::Escape('C:\ProgramData\chocolatey\bin;'), ''; ^
[Environment]::SetEnvironmentVariable('PATH', $cleanUserPath, 'User') ^
}; ^
Write-Host 'Environment variables cleaned'"

echo.
echo ========================================
echo         UNINSTALL COMPLETED!
echo ========================================
echo.
echo The following has been removed:
echo FFmpeg
echo Chocolatey  
echo Node.js LTS (if installed via Chocolatey)
echo All npm dependencies (includes/node_modules)
echo All compressed files (dist, src/compressed)
echo Environment variables cleaned
echo.
echo IMPORTANT NOTES:
echo - Restart your computer to complete PATH cleanup
echo - If you had Node.js installed manually (not via Chocolatey), it's still installed
echo - Other programs that used FFmpeg or Chocolatey may no longer work
echo - Project source files in src/ folder are preserved
echo.
echo To reinstall everything, run install.bat
echo.
pause