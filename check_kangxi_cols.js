const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.$queryRawUnsafe(
    `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'kangxi_dict' ORDER BY ordinal_position`
  );
  console.log(JSON.stringify(result, null, 2));
}

main().catch(e => console.error(e.message)).finally(() => prisma.$disconnect());