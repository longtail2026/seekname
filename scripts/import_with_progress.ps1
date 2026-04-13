# 数据库导入脚本 - 带进度反馈
$neonConn = "postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
$localConn = "postgresql://postgres:postgres@localhost:5432/seekname_db"
$BATCH_SIZE = 300

# 获取当前Neon数据库中的数据量
function Get-NeonCount($table) {
    $result = psql $neonConn -t -c "SELECT COUNT(*) FROM $table;" 2>$null
    return [int]($result.Trim())
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  数据库导入开始" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 定义导入任务
$tasks = @(
    @{ Table = "classics_entries"; Current = 22113; Target = 124120 },
    @{ Table = "name_samples"; Current = 7500; Target = 88431 },
    @{ Table = "sensitive_words"; Current = 0; Target = 87042 }
)

foreach ($task in $tasks) {
    $table = $task.Table
    $current = $task.Current
    $target = $task.Target
    $remaining = $target - $current
    
    if ($remaining -le 0) {
        Write-Host "[$table] 已完成 ($target/$target)" -ForegroundColor Green
        continue
    }
    
    Write-Host "[$table] 开始导入... 当前: $current, 目标: $target, 剩余: $remaining" -ForegroundColor Yellow
    
    $batchNum = 0
    $totalBatches = [math]::Ceiling($remaining / $BATCH_SIZE)
    
    while ($current -lt $target) {
        $batchNum++
        $offset = $task.Current + ($batchNum - 1) * $BATCH_SIZE
        $limit = [math]::Min($BATCH_SIZE, $target - $current)
        
        # 使用pg_dump导出批次数据并导入
        $pgDumpCmd = "pg_dump -h localhost -U postgres -d seekname_db --data-only --inserts --no-owner --no-privileges -t $table --where ""ctid IN (SELECT ctid FROM $table ORDER BY id LIMIT $limit OFFSET $offset)"" 2>`$null"
        $insertCmd = "psql `"$neonConn`" 2>`$null"
        Invoke-Expression "$pgDumpCmd | $insertCmd" | Out-Null
        
        $current += $limit
        $percent = [math]::Round(($current / $target) * 100, 1)
        
        Write-Host "  批次 $batchNum/$totalBatches : $current / $target (${percent}%)" -ForegroundColor Gray
        
        # 每10批次显示一次汇总
        if ($batchNum % 10 -eq 0) {
            $actualCount = Get-NeonCount $table
            Write-Host "  -> 数据库实际计数: $actualCount" -ForegroundColor DarkGray
        }
        
        # 小延迟避免过载
        Start-Sleep -Milliseconds 100
    }
    
    $finalCount = Get-NeonCount $table
    Write-Host "[$table] 完成! 最终数量: $finalCount / $target" -ForegroundColor Green
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  所有导入任务完成!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 最终统计
Write-Host ""
Write-Host "最终数据量统计:" -ForegroundColor Cyan
$checkCmd = "SELECT 'classics_books' as table_name, COUNT(*) as count FROM classics_books UNION ALL SELECT 'wuxing_characters', COUNT(*) FROM wuxing_characters UNION ALL SELECT 'kangxi_dict', COUNT(*) FROM kangxi_dict UNION ALL SELECT 'classics_entries', COUNT(*) FROM classics_entries UNION ALL SELECT 'name_samples', COUNT(*) FROM name_samples UNION ALL SELECT 'sensitive_words', COUNT(*) FROM sensitive_words ORDER BY table_name"
psql $neonConn -c $checkCmd 2>$null
