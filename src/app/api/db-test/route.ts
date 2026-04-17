/**
 * GET /api/db-test
 * 验证 seekname_db 数据库连接及各表数据量（含业务表）
 */
import { NextResponse } from "next/server";
import { queryRaw } from "@/lib/prisma";

/**
 * 安全查询表行数，表不存在时返回 null 而不报错
 */
async function safeCount(sql: string): Promise<number | null> {
  try {
    const rows = await queryRaw<{ cnt: string }>(sql);
    return parseInt(rows[0]?.cnt ?? "0");
  } catch {
    return null; // 表不存在
  }
}

export async function GET() {
  try {
    // 种子数据表（使用 schema 实际的 @@map 名称）
    const [booksCount, entriesCount, namesCount, kangxiCount, sensitiveCount, wuxingCount] =
      await Promise.all([
        safeCount("SELECT COUNT(*) as cnt FROM classics_books"),
        safeCount("SELECT COUNT(*) as cnt FROM classics_entries"),
        safeCount("SELECT COUNT(*) as cnt FROM name_samples"),
        safeCount("SELECT COUNT(*) as cnt FROM kangxi_dict"),
        safeCount("SELECT COUNT(*) as cnt FROM sensitive_words"),
        safeCount("SELECT COUNT(*) as cnt FROM wuxing_characters"),
      ]);

    // 业务表
    const [nameRecordCount, orderCount, favoriteCount, userCount] = await Promise.all([
      safeCount("SELECT COUNT(*) as cnt FROM name_record"),
      safeCount("SELECT COUNT(*) as cnt FROM \"order\""),
      safeCount("SELECT COUNT(*) as cnt FROM name_favorite"),
      safeCount("SELECT COUNT(*) as cnt FROM \"user\""),
    ]);

    // 检查 name_record 表结构
    let nameRecordColumns: string[] = [];
    try {
      const cols = await queryRaw<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = 'name_record' AND table_schema = 'public'
         ORDER BY ordinal_position`
      );
      nameRecordColumns = cols.map(r => r.column_name);
    } catch { /* 表不存在 */ }

    return NextResponse.json({
      status: "ok",
      database: "seekname_db",
      seedTables: {
        classics_books:     booksCount,
        classics_entries:    entriesCount,
        name_samples:        namesCount,
        kangxi_dict:          kangxiCount,
        sensitive_words:     sensitiveCount,
        wuxing_characters:  wuxingCount,
      },
      businessTables: {
        name_record:       nameRecordCount,
        order:             orderCount,
        name_favorite:     favoriteCount,
        user:              userCount,
      },
      nameRecordColumns,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const detail = (error as any)?.detail || "";
    return NextResponse.json(
      { status: "error", message: msg, detail },
      { status: 500 }
    );
  }
}
