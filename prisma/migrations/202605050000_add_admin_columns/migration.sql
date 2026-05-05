-- 为 users 表添加 admin 管理所需的列（password + admin_role）
-- Prisma schema 中已经定义，但初始迁移时未包含这些列

-- 添加 password 列（允许为空，已有用户可能没有密码）
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password" TEXT;

-- 添加 admin_role 列（空=普通用户，admin=超级管理员，operator=运营管理员）
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "admin_role" VARCHAR(20);

-- 添加 occupation 和 hobbies 列（Prisma schema 中定义的字段）
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "occupation" VARCHAR(50);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "hobbies" TEXT[] DEFAULT '{}';