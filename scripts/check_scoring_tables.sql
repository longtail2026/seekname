-- classics_entries 表结构
\d classics_entries

-- name_samples 表结构
\d name_samples

-- name_samples 示例数据
SELECT full_name, surname, given_name, gender, pinyin FROM name_samples LIMIT 5;

-- classics_entries 示例数据
SELECT * FROM classics_entries LIMIT 5;

-- 统计 name_samples 各字出现次数
SELECT
  char,
  COUNT(*) as count
FROM (
  SELECT unnest(string_to_array(given_name, NULL)) as char FROM name_samples
) t
GROUP BY char
ORDER BY count DESC
LIMIT 20;
