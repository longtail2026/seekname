/**
 * GET /api/db-test
 * 验证 seekname_db 数据库连接及各表数据量（含业务表）
 */
import { NextResponse } from "next/server";
import { queryRaw } from "@/lib/prisma";

export async function GET() {
  try {
    // 种子数据表（Prisma ORM 查询）
    const [
      booksCount,
      entriesCount,
      namesCount,
      kangxiCount,
      sensitiveCount,
      wuxingCount,
    ] = await Promise.all([
      queryRaw<{ cnt: string }>("SELECT COUNT(*) as cnt FROM classics_book"),
      queryRaw<{ cnt: string }>("SELECT COUNT(*) as cnt FROM classics_entry"),
      queryRaw<{ cnt: string }>("SELECT COUNT(*) as cnt FROM name_sample"),
      queryRaw<{ cnt: string }>("SELECT COUNT(*) as cnt FROM kangxi_dict"),
      queryRaw<{ cnt: string }>("SELECT COUNT(*) as cnt FROM sensitive_word"),
      queryRaw<{ cnt: string }>("SELECT COUNT(*) as cnt FROM wuxing_character"),
    ]);

    // 业务表（原生 SQL 查询）
    const [nameRecordCount, orderCount, favoriteCount, userCount] = await Promise.all([
      queryRaw<{ cnt: string }>("SELECT COUNT(*) as cnt FROM name_record"),
      queryRaw<{ cnt: string }>("SELECT COUNT(*) as cnt FROM \"order\""),
      queryRaw<{ cnt: string }>("SELECT COUNT(*) as cnt FROM name_favorite"),
      queryRaw<{ cnt: string }>("SELECT COUNT(*) as cnt FROM \"user\""),
    ]);

    // 检查 name_record 表结构
    const nameRecordColumns = await queryRaw<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'name_record' AND table_schema = 'public'
       ORDER BY ordinal_position`
    );

    return NextResponse.json({
      status: "ok",
      database: "seekname_db",
      seedTables: {
        classics_books:     parseInt(booksCount[0].cnt),
        classics_entries:    parseInt(entriesCount[0].cnt),
        name_samples:        parseInt(namesCount[0].cnt),
        kangxi_dict:         parseInt(kangxiCount[0].cnt),
        sensitive_words:     parseInt(sensitiveCount[0].cnt),
        wuxing_characters:  parseInt(wuxingCount[0].cnt),
      },
      businessTables: {
        name_record:       parseInt(nameRecordCount[0].cnt),
        order:            parseInt(orderCount[0].cnt),
        name_favorite:    parseInt(favoriteCount[0].cnt),
        user:             parseInt(userCount[0].cnt),
      },
      nameRecordColumns: nameRecordColumns.map(r => r.column_name),
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
