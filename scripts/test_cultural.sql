-- 测试文化分 SQL（参数化）
SELECT id, book_name, ancient_text,
  (CASE WHEN ancient_text LIKE '%沐%' THEN 1 ELSE 0 END +
   CASE WHEN ancient_text LIKE '%涵%' THEN 1 ELSE 0 END) AS hit_count
FROM classics_entries
WHERE ancient_text LIKE '%沐%'
   OR ancient_text LIKE '%涵%'
ORDER BY hit_count DESC
LIMIT 3;
