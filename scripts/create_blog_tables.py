"""
创建博客相关数据库表
blog_posts / blog_comments / blog_likes / blog_favorites / blog_tags / blog_post_tags
"""
import psycopg2
import os

DATABASE_URL = "postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

SQL = """
-- 博客文章表（user_id 用 TEXT 匹配 users.id）
CREATE TABLE IF NOT EXISTS blog_posts (
  id          SERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  slug        VARCHAR(220) UNIQUE,
  summary     TEXT,
  content     TEXT NOT NULL,
  cover_image VARCHAR(500),
  status      VARCHAR(20) NOT NULL DEFAULT 'published',
  view_count  INTEGER NOT NULL DEFAULT 0,
  like_count  INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  favorite_count INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 博客标签表
CREATE TABLE IF NOT EXISTS blog_tags (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(50) UNIQUE NOT NULL,
  count INTEGER NOT NULL DEFAULT 0
);

-- 文章-标签关联表
CREATE TABLE IF NOT EXISTS blog_post_tags (
  post_id INTEGER NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  tag_id  INTEGER NOT NULL REFERENCES blog_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- 评论表（支持一级回复）
CREATE TABLE IF NOT EXISTS blog_comments (
  id          SERIAL PRIMARY KEY,
  post_id     INTEGER NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id   INTEGER REFERENCES blog_comments(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  like_count  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 点赞表（文章点赞 / 评论点赞）
CREATE TABLE IF NOT EXISTS blog_likes (
  id          SERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type VARCHAR(20) NOT NULL,
  target_id   INTEGER NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, target_type, target_id)
);

-- 收藏表
CREATE TABLE IF NOT EXISTS blog_favorites (
  id         SERIAL PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id    INTEGER NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, post_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_blog_posts_user_id    ON blog_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status     ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_created_at ON blog_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_comments_post_id ON blog_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_likes_target     ON blog_likes(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_blog_favorites_user   ON blog_favorites(user_id);

-- 插入几条示例文章（author user_id=1，如不存在则跳过）
INSERT INTO blog_posts (user_id, title, slug, summary, content, status)
SELECT id, '为什么说名字是人的第二张脸？',
  'why-name-is-second-face',
  '一个好名字不仅是父母的心意，更是孩子一生的名片……',
  E'## 名字的力量\n\n古人云：「赐子千金，不如赐子好名。」\n\n一个好名字，能给孩子带来自信，也能在第一印象中留下深刻的记忆……\n\n## 五行与名字\n\n传统命理学认为，名字的五行应与生辰八字相辅相成……',
  'published'
FROM users LIMIT 1
ON CONFLICT (slug) DO NOTHING;

INSERT INTO blog_posts (user_id, title, slug, summary, content, status)
SELECT id, '康熙字典里藏着哪些美好的汉字？',
  'kangxi-beautiful-characters',
  '康熙字典收录 47,000 余字，其中不乏寓意深远、字形优美的佳字……',
  E'## 康熙字典的价值\n\n《康熙字典》是清代官方编纂的汉字规范大典，收字 47,035 个……\n\n## 推荐用字\n\n**木火系**：桦、梓、桐、樱……\n**水系**：澄、清、淇、涵……',
  'published'
FROM users LIMIT 1
ON CONFLICT (slug) DO NOTHING;
"""

def main():
    print("连接 Neon 数据库...")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()
    print("执行建表 SQL...")
    cur.execute(SQL)
    print("✅ 博客相关表创建成功")
    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
