const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const fs = require("fs");

const pool = new Pool({
  connectionString:
    "postgresql://neondb_owner:npg_2WiMHoA4RdTQ@ep-divine-flower-a1fsdfh2-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
});
const adapter = new PrismaPg(pool);
const p = new PrismaClient({ adapter });

async function main() {
  const result =
    await p.$queryRaw`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='users' AND column_name='password'`;
  
  const output = result.length > 0 
    ? "SUCCESS: password 列已存在, 类型=" + result[0].data_type 
    : "MISSING: password 列不存在";
  fs.writeFileSync("c:/seekname/scripts/migrate_result.txt", output);
  console.log(output);
}

main()
  .catch((e) => {
    fs.writeFileSync("c:/seekname/scripts/migrate_result.txt", "ERROR: " + e.message);
    console.error(e.message);
  })
  .finally(() => p.$disconnect());
