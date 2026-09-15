@echo off
echo ========================================
echo Setup Otomatis - Sistem Raport RQM
echo ========================================
echo.

REM Goto project directory
cd /d "%~dp0"

echo [1/5] Install dependencies frontend...
call npm install
if errorlevel 1 goto error

echo.
echo [2/5] Memastikan @libsql/client terinstall...
call npm install @libsql/client --save
if errorlevel 1 goto error

echo.
echo [3/5] Install dependencies backend (api)...
cd api
call npm install
if errorlevel 1 goto error
cd ..

echo.
echo [4/5] Push schema ke Turso...
call npm run db:push
if errorlevel 1 goto error

echo.
echo [5/5] Verifikasi database...
call npm run db:verify
if errorlevel 1 (
    echo.
    echo Peringatan: verifikasi gagal tapi schema mungkin sudah terpush.
    echo Cek Turso dashboard untuk memastikan.
)

echo.
echo ========================================
echo SETUP SELESAI!
echo ========================================
echo.
echo Langkah selanjutnya:
echo   1. Double-click run-backend.bat
echo   2. Double-click run-frontend.bat
echo   3. Buka browser: http://localhost:5173
echo   4. Login: admin@rqm.com (password kosong di awal)
echo.
pause
exit /b 0

:error
echo.
echo ========================================
echo TERJADI ERROR!
echo ========================================
echo.
echo Troubleshooting:
echo   1. Pastikan Node.js 20+ terinstall: node --version
echo   2. Pastikan koneksi internet aktif (untuk npm install)
echo   3. Cek file .env di root dan di api/
echo   4. Lihat pesan error di atas untuk detail
echo.
pause
exit /b 1
