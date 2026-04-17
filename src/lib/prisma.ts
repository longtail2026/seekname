/**
 * Prisma Client 单例（仅限服务端使用）
 *
 * ⚠️ 重要：本文件仅限服务端代码导入。
 * 在任意 Client Component（"use client"）中直接或动态导入本文件
 * 都会导致构建失败，因为 pg 驱动依赖 Node.js 内置模块（fs/dns/net/tls）。
 *
 * 如需在客户端访问数据库，请创建 API Route（/app/api/xxx/route.ts）
 * 然后让客户端通过 fetch() 调用。
 *
 * Prisma 7 新版通过 adapter（直连）或 accelerateUrl（云端加速）
 * 来传递连接 URL，不再在 schema.prisma 的 datasource 里写 url。
 * 本地开发使用 pg adapter（需要 @prisma/adapter-pg + pg 包）。
 * 生产环境可替换为 Prisma Accelerate。
 */

import "server-only";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const DATABASE_URL =
  process.env.POSTGRES_PRISMA_URL ??
  process.env.POSTGRES_URL ??
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

// ─── 原生 SQL 查询（绕过 Prisma adapter，用于 Serverless 环境）─────────────
// 用途：Prisma 7 adapter 在 Serverless 中对某些操作行为异常，用原生 pg 替代
export async function queryRaw<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

export async function executeRaw(
  sql: string,
  params?: unknown[]
): Promise<number> {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rowCount ?? 0;
  } finally {
    client.release();
  }
}
