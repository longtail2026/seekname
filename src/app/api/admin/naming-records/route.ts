import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const search = searchParams.get("search") || "";
    const userId = searchParams.get("userId") || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { surname: { contains: search } },
        { expectations: { contains: search } },
      ];
    }
    if (userId) where.userId = userId;

    const [records, total] = await Promise.all([
      prisma.nameRecord.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          surname: true,
          gender: true,
          birthDate: true,
          style: true,
          expectations: true,
          results: true,
          status: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.nameRecord.count({ where }),
    ]);

    return NextResponse.json({ records, total, page, pageSize });
  } catch (error) {
    console.error("Naming records error:", error);
    return NextResponse.json({ error: "获取起名记录失败" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "缺少ID" }, { status: 400 });
    await prisma.nameRecord.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete record error:", error);
    return NextResponse.json({ error: "删除记录失败" }, { status: 500 });
  }
}