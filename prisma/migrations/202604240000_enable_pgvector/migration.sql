-- 启用 pgvector 扩展（用于语义向量搜索）
-- Neon PostgreSQL 支持 pgvector 扩展
-- 详情: https://neon.tech/docs/extensions/pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 验证扩展安装成功
SELECT 'pgvector 扩展已安装' AS status,
       extversion AS version
FROM pg_extension
WHERE extname = 'vector';
