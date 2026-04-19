import { NextResponse } from "next/server";
import { queryRaw } from "@/lib/prisma";

export async function GET() {
  try {
    // 检查所有表
    const tables = await queryRaw<{ table_name: string }>(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    // 检查 classics_entries 表结构和数据量
    let classicsInfo: any = null;
    const hasClassicsTable = tables.some(t => t.table_name === 'classics_entries');
    
    if (hasClassicsTable) {
      const countResult = await queryRaw<{ cnt: string }>(`SELECT COUNT(*) as cnt FROM classics_entries`);
      const columns = await queryRaw<{ column_name: string; data_type: string }>(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'classics_entries'
        ORDER BY ordinal_position
      `);
      
      // 抽样几条数据
      const samples = await queryRaw<Record<string, unknown>>(`SELECT * FROM classics_entries LIMIT 3`);
      
      classicsInfo = {
        rowCount: countResult[0]?.cnt || '0',
        columns: columns,
        samples: samples
      };
    }

    // 检查其他相关表
    const relatedTables = ['classics_books', 'name_samples', 'kangxi_dict', 'wuxing_characters', 'name_wuxing'];
    const relatedInfo: Record<string, any> = {};
    
    for (const table of relatedTables) {
      const exists = tables.some(t => t.table_name === table);
      if (exists) {
        const countResult = await queryRaw<{ cnt: string }>(`SELECT COUNT(*) as cnt FROM ${table}`);
        relatedInfo[table] = { exists: true, rowCount: countResult[0]?.cnt || '0' };
      } else {
        relatedInfo[table] = { exists: false };
      }
    }

    return NextResponse.json({
      success: true,
      allTables: tables.map(t => t.table_name),
      hasClassicsEntries: hasClassicsTable,
      classicsInfo,
      relatedTables: relatedInfo
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
