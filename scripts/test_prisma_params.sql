-- 测试参数化查询（模拟 Prisma $queryRawUnsafe 行为）
PREPARE test_stmt(text, text) AS
SELECT id, book_name, ancient_text,
  (CASE WHEN ancient_text LIKE '%' || $1 || '%' THEN 1 ELSE 0 END +
   CASE WHEN ancient_text LIKE '%' || $2 || '%' THEN 1 ELSE 0 END) AS hit_count
FROM classics_entries
WHERE ancient_text LIKE '%' || $1 || '%'
   OR ancient_text LIKE '%' || $2 || '%'
ORDER BY hit_count DESC
LIMIT 3;

EXECUTE test_stmt('沐', '涵');
DEALLOCATE test_stmt;
