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
  // 查 users 表结构
  const result =
    await p.$queryRaw`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position`;
  
  let output = "=== Neon users 表结构 ===\n";
  let hasPassword = false;
  for (const row of result) {
    const line = `  ${row.column_name.padEnd(20)} | ${row.data_type.padEnd(12)} | 可空: ${row.is_nullable}`;
    output += line + "\n";
    if (row.column_name === "password") hasPassword = true;
  }
  output += `\n已有 password 列: ${hasPassword ? "是" : "否（需要添加）"}\n`;
  
  fs.writeFileSync("c:/seekname/scripts/neon_users_result.txt", output);
  console.log(output);
}

main()
  .catch((e) => {
    fs.writeFileSync("c:/seekname/scripts/neon_users_result.txt", "Error: " + e.message);
    console.error("Error:", e.message);
  })
  .finally(() => p.$disconnect());
