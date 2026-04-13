# 分批导入数据到 Neon Postgres
# 每批 500 条，避免超时

$VERCEL_URL = "postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
$env:PGPASSWORD = 'npg_2WiMHoA4RdTQ'

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  seekname_db -> Neon Postgres 分批导入" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# 检查当前数据量
Write-Host "`n[检查当前数据量...]" -ForegroundColor Yellow
psql $VERCEL_URL -c "SELECT 'kangxi_dict' as t, COUNT(*) as c FROM kangxi_dict UNION ALL SELECT 'name_samples', COUNT(*) FROM name_samples UNION ALL SELECT 'sensitive_words', COUNT(*) FROM sensitive_words UNION ALL SELECT 'classics_entries', COUNT(*) FROM classics_entries"

Write-Host "`n准备导入剩余数据..." -ForegroundColor Green
Write-Host "每批 500 条，请耐心等待..." -ForegroundColor Gray

# 导入 kangxi_dict 剩余数据
Write-Host "`n[1/4] 导入 kangxi_dict (从第 4001 条开始)..." -ForegroundColor Yellow
$env:PGPASSWORD = 'postgres'
$total = psql -h localhost -U postgres -d seekname_db -t -c "SELECT COUNT(*) FROM kangxi_dict" | ForEach-Object { $_.Trim() }
Write-Host "  本地总数: $total 条"

# 分批导出并导入 kangxi_dict
for ($offset = 4000; $offset -lt $total; $offset += 500) {
    $limit = 500
    $end = [Math]::Min($offset + $limit, $total)
    $actualLimit = $end - $offset
    
    Write-Host "  -> 导入 $offset ~ $end ($actualLimit 条)..." -NoNewline
    
    # 导出这一批
    $env:PGPASSWORD = 'postgres'
    psql -h localhost -U postgres -d seekname_db -c "COPY (SELECT * FROM kangxi_dict ORDER BY id LIMIT $actualLimit OFFSET $offset) TO STDOUT WITH CSV HEADER" | Out-File -FilePath "C:\seekname\scripts\temp_batch.csv" -Encoding utf8
    
    # 导入到 Neon
    $env:PGPASSWORD = 'npg_2WiMHoA4RdTQ'
    psql $VERCEL_URL -c "COPY kangxi_dict FROM STDIN WITH CSV HEADER" < "C:\seekname\scripts\temp_batch.csv" 2>$null
    
    $pct = [math]::Round(($end / $total) * 100, 1)
    Write-Host " 完成 ($pct%)" -ForegroundColor Green
    
    Start-Sleep -Milliseconds 500
}

Write-Host "`n[2/4] 导入 name_samples..." -ForegroundColor Yellow
# 同样方式导入 name_samples
$env:PGPASSWORD = 'postgres'
$total = psql -h localhost -U postgres -d seekname_db -t -c "SELECT COUNT(*) FROM name_samples" | ForEach-Object { $_.Trim() }
Write-Host "  本地总数: $total 条"

for ($offset = 0; $offset -lt $total; $offset += 500) {
    $limit = 500
    $end = [Math]::Min($offset + $limit, $total)
    $actualLimit = $end - $offset
    
    Write-Host "  -> 导入 $offset ~ $end ($actualLimit 条)..." -NoNewline
    
    $env:PGPASSWORD = 'postgres'
    psql -h localhost -U postgres -d seekname_db -c "COPY (SELECT * FROM name_samples ORDER BY id LIMIT $actualLimit OFFSET $offset) TO STDOUT WITH CSV HEADER" | Out-File -FilePath "C:\seekname\scripts\temp_batch.csv" -Encoding utf8
    
    $env:PGPASSWORD = 'npg_2WiMHoA4RdTQ'
    psql $VERCEL_URL -c "COPY name_samples FROM STDIN WITH CSV HEADER" < "C:\seekname\scripts\temp_batch.csv" 2>$null
    
    $pct = [math]::Round(($end / $total) * 100, 1)
    Write-Host " 完成 ($pct%)" -ForegroundColor Green
    
    Start-Sleep -Milliseconds 500
}

Write-Host "`n[3/4] 导入 sensitive_words..." -ForegroundColor Yellow
$env:PGPASSWORD = 'postgres'
$total = psql -h localhost -U postgres -d seekname_db -t -c "SELECT COUNT(*) FROM sensitive_words" | ForEach-Object { $_.Trim() }
Write-Host "  本地总数: $total 条"

for ($offset = 0; $offset -lt $total; $offset += 500) {
    $limit = 500
    $end = [Math]::Min($offset + $limit, $total)
    $actualLimit = $end - $offset
    
    Write-Host "  -> 导入 $offset ~ $end ($actualLimit 条)..." -NoNewline
    
    $env:PGPASSWORD = 'postgres'
    psql -h localhost -U postgres -d seekname_db -c "COPY (SELECT * FROM sensitive_words ORDER BY id LIMIT $actualLimit OFFSET $offset) TO STDOUT WITH CSV HEADER" | Out-File -FilePath "C:\seekname\scripts\temp_batch.csv" -Encoding utf8
    
    $env:PGPASSWORD = 'npg_2WiMHoA4RdTQ'
    psql $VERCEL_URL -c "COPY sensitive_words FROM STDIN WITH CSV HEADER" < "C:\seekname\scripts\temp_batch.csv" 2>$null
    
    $pct = [math]::Round(($end / $total) * 100, 1)
    Write-Host " 完成 ($pct%)" -ForegroundColor Green
    
    Start-Sleep -Milliseconds 500
}

Write-Host "`n[4/4] 导入 classics_entries..." -ForegroundColor Yellow
$env:PGPASSWORD = 'postgres'
$total = psql -h localhost -U postgres -d seekname_db -t -c "SELECT COUNT(*) FROM classics_entries" | ForEach-Object { $_.Trim() }
Write-Host "  本地总数: $total 条"

for ($offset = 0; $offset -lt $total; $offset += 500) {
    $limit = 500
    $end = [Math]::Min($offset + $limit, $total)
    $actualLimit = $end - $offset
    
    Write-Host "  -> 导入 $offset ~ $end ($actualLimit 条)..." -NoNewline
    
    $env:PGPASSWORD = 'postgres'
    psql -h localhost -U postgres -d seekname_db -c "COPY (SELECT id, book_id, book_name, chapter_name, ancient_text, modern_text, array_to_string(keywords, '|') as keywords FROM classics_entries ORDER BY id LIMIT $actualLimit OFFSET $offset) TO STDOUT WITH CSV HEADER" | Out-File -FilePath "C:\seekname\scripts\temp_batch.csv" -Encoding utf8
    
    $env:PGPASSWORD = 'npg_2WiMHoA4RdTQ'
    psql $VERCEL_URL -c "COPY classics_entries(id, book_id, book_name, chapter_name, ancient_text, modern_text, keywords) FROM STDIN WITH CSV HEADER" < "C:\seekname\scripts\temp_batch.csv" 2>$null
    
    $pct = [math]::Round(($end / $total) * 100, 1)
    Write-Host " 完成 ($pct%)" -ForegroundColor Green
    
    Start-Sleep -Milliseconds 500
}

# 清理临时文件
Remove-Item "C:\seekname\scripts\temp_batch.csv" -ErrorAction SilentlyContinue

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  导入完成！" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan

# 验证最终数据
Write-Host "`n[最终数据验证]" -ForegroundColor Yellow
psql $VERCEL_URL -c "SELECT 'classics_books' as t, COUNT(*) as c FROM classics_books UNION ALL SELECT 'classics_entries', COUNT(*) FROM classics_entries UNION ALL SELECT 'name_samples', COUNT(*) FROM name_samples UNION ALL SELECT 'kangxi_dict', COUNT(*) FROM kangxi_dict UNION ALL SELECT 'sensitive_words', COUNT(*) FROM sensitive_words UNION ALL SELECT 'wuxing_characters', COUNT(*) FROM wuxing_characters"
