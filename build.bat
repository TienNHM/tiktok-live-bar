@echo off
setlocal EnableExtensions
chcp 65001 >nul

set "ROOT=%~dp0"
set "PROJECT_DIR=%ROOT%UnityProject"
set "OUTPUT_EXE=%ROOT%Build\TikTokLiveBar.exe"
set "LOG_FILE=%ROOT%build_log.txt"
set "PROJECT_VERSION="

for /f "tokens=2 delims=:" %%v in ('findstr /b "m_EditorVersion:" "%PROJECT_DIR%\ProjectSettings\ProjectVersion.txt" 2^>nul') do for /f "tokens=*" %%w in ("%%v") do set "PROJECT_VERSION=%%w"

if not defined PROJECT_VERSION (
    echo [LỖI] Không đọc được phiên bản Unity từ ProjectVersion.txt.
    goto :failed
)

set "UNITY_EXE=%ProgramFiles%\Unity\Hub\Editor\%PROJECT_VERSION%\Editor\Unity.exe"
if not exist "%UNITY_EXE%" (
    echo [LỖI] Chưa cài đúng Unity %PROJECT_VERSION%.
    echo Hãy cài phiên bản này bằng Unity Hub rồi chạy lại build.bat.
    goto :failed
)

echo =======================================
echo     BUILD GAME TIKTOK LIVE BAR
echo =======================================
echo Unity: %PROJECT_VERSION%
echo Output: %OUTPUT_EXE%
echo.

if not exist "%ROOT%Build" mkdir "%ROOT%Build"
"%UNITY_EXE%" -quit -batchmode -nographics -projectPath "%PROJECT_DIR%" -buildWindows64Player "%OUTPUT_EXE%" -logFile "%LOG_FILE%"
set "BUILD_RESULT=%ERRORLEVEL%"

if not "%BUILD_RESULT%"=="0" (
    echo [LỖI] Unity build thất bại ^(mã lỗi %BUILD_RESULT%^).
    echo Xem log: %LOG_FILE%
    goto :failed
)

if not exist "%OUTPUT_EXE%" (
    echo [LỖI] Unity không tạo file %OUTPUT_EXE%.
    echo Xem log: %LOG_FILE%
    goto :failed
)

echo.
echo Build thành công: %OUTPUT_EXE%
pause
exit /b 0

:failed
echo.
pause
exit /b 1
