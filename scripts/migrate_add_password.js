const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const fs = require("fs");

// 连接 Neon 云端数据库
const pool = new Pool({
  connectionString:
    "postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
});
const adapter = new PrismaPg(pool);
const p = new PrismaClient({ adapter });

async function main() {
  console.log("正在执行: ALTER TABLE users ADD COLUMN password TEXT...");
  
  try {
    await p.$executeRaw`ALTER TABLE users ADD COLUMN password TEXT`;
    console.log("✅ password 列添加成功！");
    
    // 验证
    const result =
      await p.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='password'`;
    if (result.length > 0) {
      console.log("✅ 验证通过: password 列已存在于 users 表");
    }
  } catch (e) {
    if (e.message?.includes("already exists") || e.code === "42701") {
      console.log("⚠️  password 列已存在，无需重复添加（这是正常的）");
    } else {
      throw e;
    }
  }
}

main()
  .catch((e) => {
    console.error("❌ 执行失败:", e.message);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
