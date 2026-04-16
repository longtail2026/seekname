-- Migration: Add blog tables (blog_posts, blog_tags, blog_post_tags)
-- Created: 2026-04-16

-- 1. blog_posts: 博客文章主表
CREATE TABLE IF NOT EXISTS "blog_posts" (
    "id" SERIAL PRIMARY KEY,
    "user_id" VARCHAR(25) NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "title" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(250) NOT NULL UNIQUE,
    "summary" VARCHAR(500),
    "content" TEXT,
    "cover_image" VARCHAR(500),
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "like_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "favorite_count" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_bp_user" ON "blog_posts"("user_id");
CREATE INDEX IF NOT EXISTS "idx_bp_status" ON "blog_posts"("status");
CREATE INDEX IF NOT EXISTS "idx_bp_created" ON "blog_posts"("created_at" DESC);

-- 2. blog_tags: 博客标签表
CREATE TABLE IF NOT EXISTS "blog_tags" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(50) NOT NULL UNIQUE,
    "slug" VARCHAR(60) NOT NULL UNIQUE,
    "count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. blog_post_tags: 文章-标签关联表
CREATE TABLE IF NOT EXISTS "blog_post_tags" (
    "id" SERIAL PRIMARY KEY,
    "post_id" INTEGER NOT NULL REFERENCES "blog_posts"("id") ON DELETE CASCADE,
    "tag_id" INTEGER NOT NULL REFERENCES "blog_tags"("id") ON DELETE CASCADE,
    CONSTRAINT "uk_bpt_post_tag" UNIQUE ("post_id", "tag_id")
);

CREATE INDEX IF NOT EXISTS "idx_bpt_post" ON "blog_post_tags"("post_id");
CREATE INDEX IF NOT EXISTS "idx_bpt_tag" ON "blog_post_tags"("tag_id");

-- 自动更新 updated_at 触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updated_at" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON "blog_posts";
CREATE TRIGGER update_blog_posts_updated_at
    BEFORE UPDATE ON "blog_posts"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
