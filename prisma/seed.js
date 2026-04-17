/**
 * 数据库种子脚本
 * 创建 character_frequency 表（如不存在）并填充数据
 * Vercel 构建时调用：node prisma/seed.js
 */
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const DATABASE_URL =
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.warn("[Seed] DATABASE_URL not set, skipping seed");
  process.exit(0);
}

async function seed() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();

  try {
    // 创建表（如不存在）
    await client.query(`
      CREATE TABLE IF NOT EXISTS character_frequency (
        char        VARCHAR(1)  PRIMARY KEY,
        freq        INTEGER     NOT NULL DEFAULT 0,
        freq_rank   INTEGER     NOT NULL DEFAULT 9999,
        gender_m    INTEGER     NOT NULL DEFAULT 0,
        gender_f    INTEGER     NOT NULL DEFAULT 0
      )
    `);
    console.log("[Seed] character_frequency table ready");

    // 读取并执行种子 SQL
    const sqlPath = path.join(__dirname, "seed-character-frequency.sql");
    if (fs.existsSync(sqlPath)) {
      const sql = fs.readFileSync(sqlPath, "utf8");
      await client.query(sql);
      console.log("[Seed] character_frequency data seeded");
    }

    // 验证
    const { rows } = await client.query(
      "SELECT COUNT(*) as cnt FROM character_frequency"
    );
    console.log(`[Seed] character_frequency count: ${rows[0].cnt}`);
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("[Seed] Error:", err.message);
  process.exit(0); // 不阻塞构建
});
