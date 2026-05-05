import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }
    if (status) where.status = status;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          phone: true,
          name: true,
          avatar: true,
          gender: true,
          status: true,
          adminRole: true,
          vipLevel: true,
          points: true,
          createdAt: true,
          _count: {
            select: {
              nameRecords: true,
              comments: true,
              blogPosts: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({ users, total, page, pageSize });
  } catch (error) {
    console.error("Users list error:", error);
    return NextResponse.json({ error: "获取用户列表失败" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id, name, status, adminRole } = await req.json();

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (status !== undefined) data.status = status;
    if (adminRole !== undefined) data.adminRole = adminRole;

    const user = await prisma.user.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("User update error:", error);
    return NextResponse.json({ error: "更新用户失败" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "缺少用户ID" }, { status: 400 });

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("User delete error:", error);
    return NextResponse.json({ error: "删除用户失败" }, { status: 500 });
  }
}