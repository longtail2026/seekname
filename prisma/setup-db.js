/**
 * Vercel Build 时用原生 pg 创建所有必要的表
 * 不依赖 prisma db push（Vercel 环境里不稳定）
 */
const { Pool } = require("pg");

const DATABASE_URL =
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL;

async function main() {
  console.log("[setup-db] Starting at " + new Date().toISOString());

  if (!DATABASE_URL) {
    console.log("[setup-db] No DATABASE_URL, skipping");
    return;
  }

  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    const client = await pool.connect();
    console.log("[setup-db] Connected to database");

    // ── 1. character_frequency ──────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS character_frequency (
        char        VARCHAR(1)  PRIMARY KEY,
        freq        INTEGER     NOT NULL DEFAULT 0,
        freq_rank   INTEGER     NOT NULL DEFAULT 9999,
        gender_m    INTEGER     NOT NULL DEFAULT 0,
        gender_f    INTEGER     NOT NULL DEFAULT 0
      )
    `);
    console.log("[setup-db] Table 'character_frequency' OK");

    const { rows: cfRows } = await client.query(
      "SELECT COUNT(*) as cnt FROM character_frequency"
    );
    if (parseInt(cfRows[0].cnt) === 0) {
      const chars = [
        "的","一","是","不","了","我","有","人","这","中","大","来","上","国","个",
        "到","说","时","们","为","子","和","道","也","你","她","会","可","下","过",
        "天","去","能","对","起","好","看","生","得","自","着","就","那","没","关",
        "之","小","学","家","十","睿","哲","浩","涵","然","博","宇","晨","轩","琪",
        "瑶","琳","欣","怡","婷","思","悦","静","雅","慧","柔","嘉","艺","霖","俊",
        "朗","毅","宁","熙","雯","鑫","尧","瑞","佑","铭","萱","颖","岚","泽","健",
        "三","四","五","六","七","八","九","百","千","万","福","禄","寿","喜",
        "安","康","乐","祥","和","平","明","亮","星","月","日","风","雨","雷","电",
        "春","夏","秋","冬","东","西","南","北","山","川","河","海","天","地","龙",
        "凤","虎","鹤","松","柏","竹","梅","兰","菊","桃","李","桂","枫","荷","文"
      ];
      const unique = [...new Set(chars)];
      const BATCH = 20;
      for (let i = 0; i < unique.length; i += BATCH) {
        const batch = unique.slice(i, i + BATCH);
        const values = batch.map((_, j) =>
          `($${j*5+1}, $${j*5+2}, $${j*5+3}, $${j*5+4}, $${j*5+5})`
        ).join(", ");
        const params = batch.flatMap((c, j) => [
          c,
          Math.max(100, 15000 - (i+j)*100),
          i+j+1,
          Math.floor(Math.random()*10000),
          Math.floor(Math.random()*10000)
        ]);
        await client.query(`
          INSERT INTO character_frequency (char,freq,freq_rank,gender_m,gender_f)
          VALUES ${values} ON CONFLICT (char) DO NOTHING
        `, params);
      }
      console.log(`[setup-db] Inserted ${unique.length} character_frequency rows`);
    }

    // ── 2. user ─────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        email       VARCHAR(255) UNIQUE NOT NULL,
        name        VARCHAR(100),
        password    VARCHAR(255),
        avatar_url  VARCHAR(500),
        vip_expires_at TIMESTAMPTZ,
        is_vip      BOOLEAN     DEFAULT FALSE,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log("[setup-db] Table 'user' OK");

    // ── 3. name_record ───────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS name_record (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     VARCHAR(100),
        surname     VARCHAR(50) NOT NULL,
        gender      CHAR(1)     NOT NULL,
        birth_date  TIMESTAMPTZ NOT NULL,
        birth_time  VARCHAR(20),
        style       VARCHAR(20),
        results     JSONB,
        status      VARCHAR(20) DEFAULT 'generating',
        is_paid     BOOLEAN     DEFAULT FALSE,
        share_token VARCHAR(100) UNIQUE,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log("[setup-db] Table 'name_record' OK");

    // ── 4. order ─────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "order" (
        id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        order_no        VARCHAR(50) UNIQUE NOT NULL,
        user_id         VARCHAR(100),
        type            VARCHAR(20) NOT NULL,
        amount          DECIMAL(10,2) DEFAULT 0,
        pay_status      VARCHAR(20) DEFAULT 'pending',
        status          VARCHAR(20) DEFAULT 'pending',
        name_record_id  UUID,
        transaction_id  VARCHAR(100),
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log("[setup-db] Table 'order' OK");

    // ── 5. name_favorite ─────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS name_favorite (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     VARCHAR(100) NOT NULL,
        name        VARCHAR(100) NOT NULL,
        surname     VARCHAR(50) NOT NULL,
        full_name   VARCHAR(150) NOT NULL,
        pinyin      VARCHAR(200),
        meaning     TEXT,
        wuxing      VARCHAR(100),
        score       DECIMAL(5,2),
        gender      CHAR(1),
        source_book VARCHAR(100),
        source_text TEXT,
        order_id    UUID,
        name_record_id UUID,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log("[setup-db] Table 'name_favorite' OK");

    // ── 6. blog_post ─────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS blog_post (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     VARCHAR(100) NOT NULL,
        title       VARCHAR(300) NOT NULL,
        content     TEXT,
        cover_image VARCHAR(500),
        tags        VARCHAR(500)[],
        status      VARCHAR(20) DEFAULT 'draft',
        view_count  INTEGER     DEFAULT 0,
        like_count  INTEGER     DEFAULT 0,
        is_featured BOOLEAN     DEFAULT FALSE,
        published_at TIMESTAMPTZ,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log("[setup-db] Table 'blog_post' OK");

    // ── 7. blog_comment ──────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS blog_comment (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id     UUID        NOT NULL,
        user_id     VARCHAR(100),
        user_name    VARCHAR(100),
        content     TEXT        NOT NULL,
        parent_id    UUID,
        created_at   TIMESTAMPTZ DEFAULT NOW(),
        updated_at   TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log("[setup-db] Table 'blog_comment' OK");

    // ── 8. subscription ──────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscription (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        email       VARCHAR(255) UNIQUE NOT NULL,
        status      VARCHAR(20) DEFAULT 'pending',
        token       VARCHAR(100) UNIQUE,
        confirmed_at TIMESTAMPTZ,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log("[setup-db] Table 'subscription' OK");

    // ── 验证所有表都已创建 ──────────────────────────────────────────────────
    const { rows: tables } = await client.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN (
        'character_frequency','user','name_record','order',
        'name_favorite','blog_post','blog_comment','subscription'
      )
    `);
    console.log(`[setup-db] Verified ${tables.length}/8 tables exist:`, tables.map(r=>r.tablename).join(', '));

    client.release();
    await pool.end();
    console.log("[setup-db] All done!");
  } catch (err) {
    console.error("[setup-db] FAILED:", err.message);
    console.error("[setup-db] Detail:", err.detail);
    process.exit(1);
  }
}

main();
