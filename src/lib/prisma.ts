/**
 * Prisma Client 单例
 *
 * Prisma 7 新版通过 adapter（直连）或 accelerateUrl（云端加速）
 * 来传递连接 URL，不再在 schema.prisma 的 datasource 里写 url。
 *
 * 本地开发使用 pg adapter（需要 @prisma/adapter-pg + pg 包）。
 * 生产环境可替换为 Prisma Accelerate。
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/seekname_db?schema=public";

// 创建 pg 连接池
const pool = new Pool({ connectionString: DATABASE_URL });

// 创建 Prisma adapter
const adapter = new PrismaPg(pool);

// ─── 全局单例（避免开发热重载时重复创建连接） ────────────────────────
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
