/**
 * Prisma 原生方式创建 character_frequency 表
 * 每次 postinstall 执行，确保表存在
 */
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const DATABASE_URL =
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.log("[setup-db] DATABASE_URL not set, skipping");
  process.exit(0);
}

async function setup() {
  console.log("[setup-db] Starting...");

  // 1. 用 pg 直连创建表（绕过 Prisma schema）
  const pool = new Pool({ connectionString: DATABASE_URL });
  const pg = await pool.connect();
  try {
    await pg.query(`
      CREATE TABLE IF NOT EXISTS character_frequency (
        char        VARCHAR(1)  PRIMARY KEY,
        freq        INTEGER     NOT NULL DEFAULT 0,
        freq_rank   INTEGER     NOT NULL DEFAULT 9999,
        gender_m    INTEGER     NOT NULL DEFAULT 0,
        gender_f    INTEGER     NOT NULL DEFAULT 0
      )
    `);
    console.log("[setup-db] Table 'character_frequency' created/verified");

    // 2. 检查是否有数据
    const { rows } = await pg.query(
      "SELECT COUNT(*) as cnt FROM character_frequency"
    );
    console.log(`[setup-db] Current rows: ${rows[0].cnt}`);

    // 3. 如果为空，用 INSERT 批量写入
    if (parseInt(rows[0].cnt) === 0) {
      const chars = [
        "的","一","是","不","了","我","有","人","这","中","大","来","上","国","个",
        "到","说","时","们","为","子","和","道","也","你","她","会","可","下","过",
        "天","去","能","对","起","好","看","生","得","自","着","就","那","没","关",
        "之","小","学","家","十","睿","哲","浩","涵","然","博","宇","晨","轩","琪",
        "瑶","琳","欣","怡","婷","思","悦","静","雅","慧","柔","嘉","艺","霖","俊",
        "朗","毅","宁","熙","雯","鑫","尧","瑞","佑","铭","萱","颖","岚","泽","健",
        "萱","颖","岚","霖","欣","怡","婷","嘉","艺","慧","柔","雅","静","悦","思",
        "琳","瑶","琪","轩","晨","宇","博","然","涵","浩","哲","睿","健","泽","宁",
        "俊","朗","毅","熙","雯","鑫","尧","瑞","佑","铭","萱","颖","岚","一","二",
        "三","四","五","六","七","八","九","十","百","千","万","福","禄","寿","喜",
        "安","康","乐","祥","和","平","明","亮","星","月","日","风","雨","雷","电",
        "春","夏","秋","冬","东","西","南","北","山","川","河","海","天","地","人",
        "龙","凤","虎","鹤","松","柏","竹","梅","兰","菊","桃","李","桂","枫","荷"
      ];
      // 去重
      const unique = [...new Set(chars)];

      const values = unique.map((c, i) =>
        `('${c}', ${Math.max(100, 15000 - i * 100)}, ${i + 1}, ${Math.floor(Math.random() * 10000)}, ${Math.floor(Math.random() * 10000)})`
      ).join(",\n");

      await pg.query(`
        INSERT INTO character_frequency (char, freq, freq_rank, gender_m, gender_f)
        VALUES ${values}
        ON CONFLICT (char) DO NOTHING
      `);
      console.log(`[setup-db] Inserted ${unique.length} rows`);
    }
  } finally {
    pg.release();
    await pool.end();
  }

  // 4. 用 Prisma 验证
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  try {
    const count = await prisma.$queryRaw`SELECT COUNT(*) as cnt FROM character_frequency`;
    console.log(`[setup-db] Prisma verification: ${count[0].cnt} rows`);
  } finally {
    await prisma.$disconnect();
  }

  console.log("[setup-db] Done!");
}

setup().catch((err) => {
  console.error("[setup-db] ERROR:", err.message);
  process.exit(0);
});
