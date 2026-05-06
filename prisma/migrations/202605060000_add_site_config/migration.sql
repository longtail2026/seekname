-- 添加站点配置表（收费开关、价格等）
-- 用于存储键值对配置（paywall_enabled, paywall_price, paywall_hidden_count 等）
CREATE TABLE IF NOT EXISTS "site_config" (
    "id" SERIAL PRIMARY KEY,
    "key" VARCHAR(100) NOT NULL UNIQUE,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认收费配置
INSERT INTO "site_config" ("key", "value") VALUES
    ('paywall_enabled', 'false'),
    ('paywall_price', '9.9'),
    ('paywall_hidden_count', '3')
ON CONFLICT ("key") DO NOTHING;