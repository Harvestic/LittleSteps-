@echo off
setlocal
echo ====================================================
echo   LittleSteps GitHub Push Utility
echo ====================================================
echo.

set /p REPO_URL="Enter your GitHub repository URL (e.g. https://github.com/Username/littlesteps.git): "
if "%REPO_URL%"=="" (
    echo Error: Repository URL cannot be empty.
    pause
    exit /b 1
)

echo.
git remote remove origin 2>nul
git remote add origin %REPO_URL%
git branch -M main

echo.
echo Attempting to push to %REPO_URL%...
echo (If prompted, enter your GitHub Username and Personal Access Token)
echo.
git push -u origin main

if %ERRORLEVEL% equ 0 (
    echo.
    echo ====================================================
    echo   Push successful! Your repository is now up to date.
    echo ====================================================
) else (
    echo.
    echo ====================================================
    echo   Push failed. Please check your credentials or URL.
    echo ====================================================
)

pause
