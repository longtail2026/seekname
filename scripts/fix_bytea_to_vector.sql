-- ============================================================
-- 修复 naming_classics 表：bytea → vector(1024)
-- 问题：combined_text_embedding 列被错误创建为 BYTEA 类型
-- 原因：创建表时 pgvector 扩展未安装，PostgreSQL 降级 bytea
-- 解决：添加新的 vector(1024) 列用于语义搜索
-- ============================================================

-- 1. 在 naming_classics 表中添加 vector(1024) 列
--    新列与原 bytea 列并存，不删除旧数据
ALTER TABLE naming_classics
ADD COLUMN IF NOT EXISTS combined_text_embedding_vec vector(1024);

-- 2. 添加 modern_text 对应的向量列（供未来使用）
ALTER TABLE naming_classics
ADD COLUMN IF NOT EXISTS modern_text_embedding_vec vector(1024);

-- 3. 添加 ancient_text 对应的向量列（供未来使用）
ALTER TABLE naming_classics
ADD COLUMN IF NOT EXISTS ancient_text_embedding_vec vector(1024);

-- 4. 创建 HNSW 索引（提升语义搜索性能）
CREATE INDEX IF NOT EXISTS idx_naming_classics_embedding_vec
ON naming_classics
USING hnsw (combined_text_embedding_vec vector_cosine_ops);

-- 5. 验证新列
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'naming_classics'
  AND column_name LIKE '%embedding_vec'
ORDER BY column_name;

-- 6. 统计状态
SELECT 
  '修复前状态' AS stage,
  COUNT(*) AS total_rows,
  COUNT(combined_text_embedding) AS with_bytea_embedding,
  COUNT(combined_text_embedding_vec) AS with_vector_embedding
FROM naming_classics;
