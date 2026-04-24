-- ============================================================
-- 启用 pgvector 扩展（Neon PostgreSQL 生产数据库）
-- ============================================================
-- 使用方式（二选一）：
--
-- 方式 1：通过 Prisma 迁移（推荐）
--   npx prisma migrate deploy
--   （会自动执行 prisma/migrations/202604240000_enable_pgvector/migration.sql）
--
-- 方式 2：直接通过 Neon SQL Console 执行本脚本
--   登录 https://console.neon.tech → 选择项目 → SQL Editor
--   复制粘贴本文件内容执行
--
-- 方式 3：通过 psql 命令行
--   psql "$DATABASE_URL" -f scripts/enable_pgvector_production.sql
--
-- 验证是否成功：
--   SELECT * FROM pg_extension WHERE extname = 'vector';
--   如果返回一行记录则表示安装成功
-- ============================================================

-- 1. 启用 pgvector 扩展（如果已安装则跳过）
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. 验证安装
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'vector'
  ) THEN
    RAISE NOTICE '✅ pgvector 扩展已安装!';
  ELSE
    RAISE WARNING '❌ pgvector 扩展未安装，请检查数据库权限';
  END IF;
END $$;

-- 3. 检查 naming_classics 表的向量列
SELECT 
  column_name, 
  udt_name, 
  data_type
FROM information_schema.columns 
WHERE table_name = 'naming_classics' 
  AND column_name = 'combined_text_embedding';

-- 4. 创建 HNSW 索引（提升语义搜索性能）
CREATE INDEX IF NOT EXISTS idx_naming_classics_embedding 
ON naming_classics 
USING hnsw (combined_text_embedding vector_cosine_ops);

-- 5. 最终验证
SELECT 'pgvector 生产环境设置完成' AS status,
       extname, extversion
FROM pg_extension
WHERE extname = 'vector';
