@echo off
REM 自动爬虫触发脚本 - 每日由 Windows 任务计划调用
REM 调用本地的 Next.js API，向 localhost:3000 发请求触发爬虫

cd /d "%~dp0.."

REM 检查localhost:3000是否启动
netstat -ano 2>nul | findstr ":3000 " >nul
if errorlevel 1 (
  echo [%date% %time%] 错误: localhost:3000 未启动，跳过本次爬取 >> logs\auto_blog_cron.log 2>nul
  exit /b 1
)

echo [%date% %time%] 开始触发自动爬虫... >> logs\auto_blog_cron.log 2>nul

REM 用node发送HTTP请求触发cron
node -e "fetch('http://localhost:3000/api/cron/auto-blog').then(r=>r.text()).then(d=>{console.log(d);process.exit(0)}).catch(e=>{console.error(e);process.exit(1)})" >> logs\auto_blog_cron.log 2>&1

echo [%date% %time%] 触发完成 >> logs\auto_blog_cron.log 2>nul