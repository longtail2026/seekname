@echo off
REM 创建 Windows 定时任务 - 每天 04:00 触发自动爬虫+改写+发布（放在后台博客待发布列表）
REM 以管理员身份运行此脚本

set TASK_NAME=SeeknameAutoBlog
set SCRIPT_PATH=%~dp0trigger_auto_blog.bat

echo 正在创建定时任务 "%TASK_NAME%" ...
echo 脚本路径: %SCRIPT_PATH%

schtasks /create ^
  /tn "%TASK_NAME%" ^
  /tr "cmd.exe /c \"%SCRIPT_PATH%\"" ^
  /sc daily ^
  /st 04:00 ^
  /ru SYSTEM ^
  /f

if %errorlevel% equ 0 (
  echo.
  echo ===== 创建成功! =====
  echo 任务名称: %TASK_NAME%
  echo 触发时间: 每天 04:00
  echo 执行脚本: %SCRIPT_PATH%
  echo.
  echo 验证: schtasks /query /tn "%TASK_NAME%"
) else (
  echo.
  echo 创建失败，请以管理员身份运行此脚本。
)

pause