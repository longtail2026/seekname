-- seekname_db 完整导出脚本
-- 用于迁移到 Vercel Postgres 或其他 PostgreSQL 服务
-- 执行: psql -h <host> -U <user> -d <db> -f export-db.sql

-- 设置编码和 schema
SET client_encoding = 'UTF8';
SET search_path = public;

-- 1. classics_books 表结构和数据
DROP TABLE IF EXISTS classics_entries CASCADE;
DROP TABLE IF EXISTS classics_books CASCADE;

CREATE TABLE classics_books (
    id SERIAL PRIMARY KEY,
    orig_id INTEGER,
    name VARCHAR(100) NOT NULL,
    author VARCHAR(100),
    category VARCHAR(20),
    dynasty VARCHAR(20),
    description TEXT
);

-- 2. classics_entries 表
CREATE TABLE classics_entries (
    id SERIAL PRIMARY KEY,
    book_id INTEGER REFERENCES classics_books(id) ON DELETE CASCADE,
    book_name VARCHAR(100),
    chapter_name VARCHAR(200),
    ancient_text TEXT NOT NULL,
    modern_text TEXT,
    keywords TEXT[]
);

CREATE INDEX idx_ce_book ON classics_entries(book_id);
CREATE INDEX idx_ce_keywords ON classics_entries USING gin(keywords);

-- 3. name_samples 表
DROP TABLE IF EXISTS name_samples CASCADE;

CREATE TABLE name_samples (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(30) NOT NULL,
    surname VARCHAR(10),
    given_name VARCHAR(20),
    gender CHAR(1),
    frequency INTEGER,
    pinyin VARCHAR(100)
);

CREATE INDEX idx_ns_surname ON name_samples(surname);
CREATE INDEX idx_ns_gender ON name_samples(gender);

-- 4. kangxi_dict 表
DROP TABLE IF EXISTS kangxi_dict CASCADE;

CREATE TABLE kangxi_dict (
    id SERIAL PRIMARY KEY,
    character VARCHAR(10) NOT NULL,
    pinyin VARCHAR(50),
    radical VARCHAR(10),
    stroke_count INTEGER,
    meaning TEXT,
    wuxing VARCHAR(10),
    source VARCHAR(100),
    created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_kd_char ON kangxi_dict(character);
CREATE INDEX idx_kd_pinyin ON kangxi_dict(pinyin);
CREATE INDEX idx_kd_wuxing ON kangxi_dict(wuxing);

-- 5. sensitive_words 表
DROP TABLE IF EXISTS sensitive_words CASCADE;

CREATE TABLE sensitive_words (
    id SERIAL PRIMARY KEY,
    word TEXT NOT NULL,
    category VARCHAR(50),
    level INTEGER,
    source_file VARCHAR(100),
    created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_sw_word ON sensitive_words(word);
CREATE INDEX idx_sw_category ON sensitive_words(category);

-- 6. wuxing_characters 表
DROP TABLE IF EXISTS wuxing_characters CASCADE;

CREATE TABLE wuxing_characters (
    id SERIAL PRIMARY KEY,
    character VARCHAR(10) NOT NULL,
    wuxing VARCHAR(10),
    meaning TEXT,
    suitability TEXT,
    pinyin VARCHAR(50),
    stroke_count INTEGER,
    created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_wx_char ON wuxing_characters(character);
CREATE INDEX idx_wx_wuxing ON wuxing_characters(wuxing);
