@echo off
echo 启动naming_classics表向量化进程（后台运行）...
echo 开始时间: %date% %time%
echo.

cd /d "C:\seekname"

echo 检查Python进程...
tasklist | findstr /i "python.exe" > nul
if %errorlevel% equ 0 (
    echo 警告: 已有Python进程在运行
    echo 如果这是向量化进程，请不要重复启动
    pause
    exit /b 1
)

echo 启动向量化进程...
echo 输出将保存到 vectorization_full.log
echo 按Ctrl+C可以停止，但建议让进程完成

rem 使用start /B在后台运行，不打开新窗口
start /B python vectorize_naming_classics.py > vectorization_full.log 2>&1

echo.
echo 进程已在后台启动
echo 检查日志: tail -f vectorization_full.log (Linux) 或 type vectorization_full.log (Windows)
echo.
echo 要检查进程是否仍在运行，请运行:
echo tasklist | findstr python.exe
echo.
echo 要停止进程，请运行:
echo taskkill /f /im python.exe
echo.
echo 开始时间: %date% %time%
pause