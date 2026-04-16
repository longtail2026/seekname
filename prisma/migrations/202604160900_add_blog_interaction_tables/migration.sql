-- 博客评论表
CREATE TABLE IF NOT EXISTS blog_comments (
    id          SERIAL PRIMARY KEY,
    post_id     INTEGER NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    user_id     VARCHAR(25) NOT NULL,
    parent_id   INTEGER REFERENCES blog_comments(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    like_count  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bc_post  ON blog_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_bc_user  ON blog_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_bc_parent ON blog_comments(parent_id);

-- 博客点赞表
CREATE TABLE IF NOT EXISTS blog_likes (
    id          SERIAL PRIMARY KEY,
    user_id     VARCHAR(25) NOT NULL,
    target_type VARCHAR(20) NOT NULL,  -- 'post' | 'comment'
    target_id   INTEGER NOT NULL,
    created_at  TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT  uk_blog_like UNIQUE (user_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_bl_user ON blog_likes(user_id);

-- 博客收藏表
CREATE TABLE IF NOT EXISTS blog_favorites (
    id          SERIAL PRIMARY KEY,
    user_id     VARCHAR(25) NOT NULL,
    post_id     INTEGER NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    CONSTRAINT  uk_blog_favorite UNIQUE (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_bf_user ON blog_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_bf_post ON blog_favorites(post_id);

-- updated_at 触发器（评论表）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_blog_comments_updated_at ON blog_comments;
CREATE TRIGGER update_blog_comments_updated_at
    BEFORE UPDATE ON blog_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- seed 用户（评论和点赞需要此用户）
INSERT INTO users (id, name, email, status, vip_level)
VALUES ('seed-user-fixed-id-001', '寻名君', 'seed@seekname.com', 'active', 1)
ON CONFLICT (id) DO NOTHING;
