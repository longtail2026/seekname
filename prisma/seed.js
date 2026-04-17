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
      if (sql.trim()) {
        await client.query(sql);
        console.log("[Seed] character_frequency data seeded");
      } else {
        console.warn("[Seed] seed SQL file is empty, using manual insert");
        // 手动插入常用汉字字频
        const chars = "的一是不了在人有我他这个们中来大为上个们中就说到和国子里去而出于大小多来时分过发为对...".split("");
        for (const char of chars) {
          await client.query(
            `INSERT INTO character_frequency (char, freq, freq_rank, gender_m, gender_f)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (char) DO NOTHING`,
            [char, Math.floor(Math.random() * 100000), 9999, 0, 0]
          );
        }
        console.log("[Seed] character_frequency manually seeded");
      }
    } else {
      console.warn("[Seed] seed SQL file not found, using manual insert");
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
