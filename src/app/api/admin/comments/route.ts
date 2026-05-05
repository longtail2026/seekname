import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const status = searchParams.get("status") || "";

    const where: any = {};
    if (status) where.status = status;

    const [comments, total] = await Promise.all([
      prisma.blogComment.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          content: true,
          status: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
          post: { select: { id: true, title: true } },
        },
      }),
      prisma.blogComment.count({ where }),
    ]);

    return NextResponse.json({ comments, total, page, pageSize });
  } catch (error) {
    console.error("Comments error:", error);
    return NextResponse.json({ error: "获取评论失败" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status } = body;
    if (!id || !status) return NextResponse.json({ error: "参数错误" }, { status: 400 });

    await prisma.blogComment.update({ where: { id }, data: { status } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Comment update error:", error);
    return NextResponse.json({ error: "更新评论失败" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get("id") || "0");
    if (!id) return NextResponse.json({ error: "缺少ID" }, { status: 400 });

    await prisma.blogComment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Comment delete error:", error);
    return NextResponse.json({ error: "删除评论失败" }, { status: 500 });
  }
}