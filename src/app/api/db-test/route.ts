/**
 * GET /api/db-test
 * 验证 seekname_db 数据库连接及各表数据量
 */
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const [
      booksCount,
      entriesCount,
      namesCount,
      kangxiCount,
      sensitiveCount,
      wuxingCount,
    ] = await Promise.all([
      prisma.classicsBook.count(),
      prisma.classicsEntry.count(),
      prisma.nameSample.count(),
      prisma.kangxiDict.count(),
      prisma.sensitiveWord.count(),
      prisma.wuxingCharacter.count(),
    ]);

    return NextResponse.json({
      status: "ok",
      database: "seekname_db",
      tables: {
        classics_books:   booksCount,
        classics_entries: entriesCount,
        name_samples:     namesCount,
        kangxi_dict:      kangxiCount,
        sensitive_words:  sensitiveCount,
        wuxing_characters: wuxingCount,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ status: "error", message: msg }, { status: 500 });
  }
}
