-- 检查典籍关键字格式
SELECT id, book_name, keywords, ancient_text
FROM classics_entries
LIMIT 5;

-- 搜索包含"沐"的典故
SELECT id, book_name, keywords, ancient_text
FROM classics_entries
WHERE ancient_text LIKE '%沐%'
LIMIT 5;

-- 搜索包含"诗"的典故
SELECT id, book_name, keywords, ancient_text
FROM classics_entries
WHERE ancient_text LIKE '%诗%'
LIMIT 5;
