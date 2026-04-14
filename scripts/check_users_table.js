const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

const pool = new Pool({
  connectionString:
    "postgresql://postgres:postgres@localhost:5432/seekname_db?schema=public",
});
const adapter = new PrismaPg(pool);
const p = new PrismaClient({ adapter });

async function main() {
  const result =
    await p.$queryRaw`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position`;
  console.log("=== users 表结构 ===");
  console.table(result);
}

main()
  .catch((e) => console.error(e))
  .finally(() => p.$disconnect());
