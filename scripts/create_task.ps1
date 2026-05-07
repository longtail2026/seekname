$taskName = "SeeknameAutoBlog"
$scriptPath = "c:\seekname\scripts\trigger_auto_blog.bat"

# 删除旧任务（如有）
$null = schtasks /delete /tn $taskName /f 2>&1

# 创建新任务：每天 04:00 执行（爬取+改写+发布到后台待发布列表）
$cmd = "schtasks /create /tn `"$taskName`" /tr `"cmd.exe /c `"$scriptPath`"`" /sc daily /st 04:00 /ru SYSTEM /f"
Write-Host "Executing: $cmd"
Invoke-Expression $cmd

Write-Host ""
if ($LASTEXITCODE -eq 0) {
    Write-Host "===== 创建成功! ====="
    Write-Host "任务名称: $taskName"
    Write-Host "触发时间: 每天 04:00"
    Write-Host "执行脚本: $scriptPath"
} else {
    Write-Host "创建失败，请以管理员身份运行此脚本。"
}