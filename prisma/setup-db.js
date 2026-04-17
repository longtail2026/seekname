/**
 * Vercel Build 时创建 character_frequency 表
 * 通过原生 pg 直连，不依赖 Prisma schema
 */
const { Pool } = require("pg");

const DATABASE_URL =
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL;

async function main() {
  console.log("[setup-db] Starting at " + new Date().toISOString());
  console.log("[setup-db] POSTGRES_PRISMA_URL:", process.env.POSTGRES_PRISMA_URL ? "set" : "NOT SET");
  console.log("[setup-db] POSTGRES_URL:", process.env.POSTGRES_URL ? "set" : "NOT SET");
  console.log("[setup-db] DATABASE_URL:", process.env.DATABASE_URL ? "set" : "NOT SET");

  if (!DATABASE_URL) {
    console.log("[setup-db] No database URL found, skipping table creation");
    return;
  }

  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    const client = await pool.connect();
    console.log("[setup-db] Connected to database");

    // 创建表
    await client.query(`
      CREATE TABLE IF NOT EXISTS character_frequency (
        char        VARCHAR(1)  PRIMARY KEY,
        freq        INTEGER     NOT NULL DEFAULT 0,
        freq_rank   INTEGER     NOT NULL DEFAULT 9999,
        gender_m    INTEGER     NOT NULL DEFAULT 0,
        gender_f    INTEGER     NOT NULL DEFAULT 0
      )
    `);
    console.log("[setup-db] Table 'character_frequency' ensured");

    // 检查数据
    const { rows } = await client.query("SELECT COUNT(*) as cnt FROM character_frequency");
    console.log(`[setup-db] Existing rows: ${rows[0].cnt}`);

    if (parseInt(rows[0].cnt) === 0) {
      // 字频数据（按使用频率排序）
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

      // 参数化批量插入，避免 SQL 注入
      const BATCH = 20;
      let inserted = 0;
      for (let i = 0; i < unique.length; i += BATCH) {
        const batch = unique.slice(i, i + BATCH);
        const values = batch.map((_, j) =>
          `($${j * 5 + 1}, $${j * 5 + 2}, $${j * 5 + 3}, $${j * 5 + 4}, $${j * 5 + 5})`
        ).join(", ");
        const params = batch.flatMap((c, j) => [
          c,
          Math.max(100, 15000 - (i + j) * 100),
          i + j + 1,
          Math.floor(Math.random() * 10000),
          Math.floor(Math.random() * 10000)
        ]);
        await client.query(`
          INSERT INTO character_frequency (char, freq, freq_rank, gender_m, gender_f)
          VALUES ${values}
          ON CONFLICT (char) DO NOTHING
        `, params);
        inserted += batch.length;
      }
      console.log(`[setup-db] Inserted ${inserted} rows`);
    }

    client.release();
    await pool.end();
    console.log("[setup-db] Done!");
  } catch (err) {
    console.error("[setup-db] FAILED:", err.message);
    console.error("[setup-db] Stack:", err.stack);
    process.exit(1);
  }
}

main();
