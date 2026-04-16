import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const chars = ["沐", "涵"];

  // 方法1: $queryRawUnsafe + spread
  try {
    const r1 = await prisma.$queryRawUnsafe(
      `SELECT id, book_name, ancient_text FROM classics_entries WHERE ancient_text LIKE $1 LIMIT 3`,
      `%${chars[0]}%`
    );
    console.log("方法1 OK:", r1);
  } catch (e) {
    console.error("方法1失败:", e);
  }

  // 方法2: 拼接字符串（临时，安全问题先忽略，仅测试）
  try {
    const r2 = await prisma.$queryRawUnsafe(
      `SELECT id, book_name, ancient_text FROM classics_entries WHERE ancient_text LIKE '%${chars[0]}%' LIMIT 3`
    );
    console.log("方法2 OK:", r2);
  } catch (e) {
    console.error("方法2失败:", e);
  }
}

main().catch(console.error);
