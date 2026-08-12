@echo off
setlocal EnableExtensions
chcp 65001 >nul

set "ROOT=%~dp0"
set "BRIDGE_DIR=%ROOT%TikTokBridge"
set "BRIDGE_PORT=3000"

echo =======================================
echo     KHỞI ĐỘNG TIKTOK LIVE BAR
echo =======================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [LỖI] Không tìm thấy Node.js.
    echo Hãy cài Node.js 20 trở lên: https://nodejs.org/
    goto :failed
)

if not exist "%BRIDGE_DIR%\package.json" (
    echo [LỖI] Không tìm thấy TikTokBridge\package.json.
    goto :failed
)

if not exist "%BRIDGE_DIR%\node_modules\express\package.json" (
    echo [1/3] Đang cài đặt thư viện Node.js...
    pushd "%BRIDGE_DIR%"
    if exist package-lock.json (
        call npm ci
    ) else (
        call npm install
    )
    if errorlevel 1 (
        popd
        echo [LỖI] npm install không thành công.
        goto :failed
    )
    popd
) else (
    echo [1/3] Thư viện Node.js đã sẵn sàng.
)

pushd "%BRIDGE_DIR%"
for /f "usebackq delims=" %%p in (`node -e "const e=require('./src/config/environment');e.loadEnvironmentFile();process.stdout.write(String(e.getServerSettings().port))"`) do set "BRIDGE_PORT=%%p"
popd
set "CONTROL_URL=http://127.0.0.1:%BRIDGE_PORT%/control.html"

call :bridge_is_ready
if defined BRIDGE_READY (
    echo [2/3] TikTok Bridge đang chạy sẵn trên cổng %BRIDGE_PORT%.
    goto :launch_game
)

set "PORT_PID="
for /f "tokens=5" %%a in ('netstat -ano ^| findstr /r /c:":%BRIDGE_PORT% .*LISTENING" 2^>nul') do if not defined PORT_PID set "PORT_PID=%%a"
if defined PORT_PID (
    echo [LỖI] Cổng %BRIDGE_PORT% đang bị chương trình khác sử dụng ^(PID %PORT_PID%^).
    echo Launcher sẽ KHÔNG tự tắt chương trình khác để tránh mất dữ liệu.
    echo Hãy đóng chương trình đó, sau đó chạy lại run.bat.
    goto :failed
)

echo [2/3] Đang khởi động TikTok Bridge...
start "TikTok Bridge" /D "%BRIDGE_DIR%" cmd /k "npm start"

set "BRIDGE_READY="
for /l %%i in (1,1,30) do (
    if not defined BRIDGE_READY (
        call :bridge_is_ready
        if not defined BRIDGE_READY ping 127.0.0.1 -n 2 >nul
    )
)
if not defined BRIDGE_READY (
    echo [LỖI] TikTok Bridge không sẵn sàng sau 30 giây.
    echo Hãy xem lỗi trong cửa sổ "TikTok Bridge".
    goto :failed
)

:launch_game
echo [3/3] Đang khởi động Game...
if not "%BRIDGE_PORT%"=="3000" (
    echo [CẢNH BÁO] Bản game dựng sẵn chỉ kết nối cổng 3000.
    echo Bridge và Control Panel vẫn chạy trên cổng %BRIDGE_PORT%, nhưng game sẽ không được mở.
    goto :open_control
)
if exist "%ROOT%Build\TikTokLiveBar.exe" (
    start "" "%ROOT%Build\TikTokLiveBar.exe"
) else if exist "%ROOT%Build\TIKTOK_LIVE_BAR.exe" (
    start "" "%ROOT%Build\TIKTOK_LIVE_BAR.exe"
) else (
    echo [CẢNH BÁO] Không tìm thấy file Game trong thư mục Build.
    echo Chạy build.bat sau khi cài Unity 6, hoặc mở UnityProject bằng Unity Hub.
)

:open_control
start "" "%CONTROL_URL%"
echo.
echo Đã khởi động. Control Panel: %CONTROL_URL%
exit /b 0

:bridge_is_ready
set "BRIDGE_READY="
for /f "usebackq delims=" %%r in (`powershell -NoProfile -Command "try { $h = Invoke-RestMethod -Uri '%CONTROL_URL:control.html=api/health%' -TimeoutSec 2; if ($h.status -eq 'ok' -and $h.appId -eq 'tiktok-live-bar-bridge') { 'YES' } } catch {}"`) do set "BRIDGE_READY=%%r"
exit /b 0

:failed
echo.
pause
exit /b 1
