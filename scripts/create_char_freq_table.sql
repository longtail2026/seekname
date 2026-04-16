-- 创建字频聚合表，加速常用度查询
DROP TABLE IF EXISTS character_frequency CASCADE;

CREATE TABLE character_frequency (
  char       VARCHAR(1) PRIMARY KEY,
  freq       INTEGER NOT NULL DEFAULT 0,
  freq_rank  INTEGER,  -- 在所有字中的排名（1=最高频）
  gender_m   INTEGER NOT NULL DEFAULT 0,  -- 男名中出现次数
  gender_f   INTEGER NOT NULL DEFAULT 0   -- 女名中出现次数
);

-- 从 name_samples 统计字频（given_name）
INSERT INTO character_frequency(char, freq, gender_m, gender_f)
SELECT
  c AS char,
  COUNT(*) AS freq,
  COUNT(*) FILTER (WHERE gender = 'M') AS gender_m,
  COUNT(*) FILTER (WHERE gender = 'F') AS gender_f
FROM name_samples,
     LATERAL unnest(string_to_array(given_name, NULL)) AS c
GROUP BY c;

-- 计算排名
WITH ranked AS (
  SELECT char, freq, ROW_NUMBER() OVER (ORDER BY freq DESC) as rank_num
  FROM character_frequency
)
UPDATE character_frequency cf
SET freq_rank = ranked.rank_num
FROM ranked
WHERE cf.char = ranked.char;

-- 建立索引
CREATE INDEX ON character_frequency(freq DESC);
CREATE INDEX ON character_frequency(char);

-- 验证
SELECT * FROM character_frequency ORDER BY freq DESC LIMIT 10;
SELECT COUNT(*) AS total_chars, SUM(freq) AS total_occurrences FROM character_frequency;
