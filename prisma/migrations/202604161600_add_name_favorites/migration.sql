-- 名字典藏表
CREATE TABLE IF NOT EXISTS name_favorites (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     VARCHAR(25) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    surname     VARCHAR(10) NOT NULL,
    full_name   VARCHAR(30) NOT NULL,
    gender      CHAR(1) NOT NULL,
    score       INTEGER DEFAULT 0,
    analysis    JSONB,
    wuxing      TEXT[],
    source      VARCHAR(200),
    note        VARCHAR(200),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT  uk_name_fav_user_name UNIQUE (user_id, full_name)
);

CREATE INDEX IF NOT EXISTS idx_nf_user ON name_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_nf_created ON name_favorites(created_at DESC);
