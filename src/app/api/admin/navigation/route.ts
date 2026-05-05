import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const items = await prisma.navigationItem.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        children: { orderBy: { sortOrder: "asc" } },
      },
    });
    return NextResponse.json({ items: items.filter((i) => !i.parentId) });
  } catch (error) {
    console.error("Navigation error:", error);
    return NextResponse.json({ error: "获取导航失败" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { label, href, parentId, sortOrder, isActive, icon, description } = body;

    const maxOrder = await prisma.navigationItem.aggregate({
      _max: { sortOrder: true },
    });

    const item = await prisma.navigationItem.create({
      data: {
        label,
        href: href || null,
        parentId: parentId || null,
        sortOrder: sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1,
        isActive: isActive ?? true,
        icon: icon || null,
        description: description || null,
      },
    });

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error("Nav create error:", error);
    return NextResponse.json({ error: "创建导航失败" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, label, href, parentId, sortOrder, isActive, icon, description } = body;

    const data: any = {};
    if (label !== undefined) data.label = label;
    if (href !== undefined) data.href = href;
    if (parentId !== undefined) data.parentId = parentId;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;
    if (isActive !== undefined) data.isActive = isActive;
    if (icon !== undefined) data.icon = icon;
    if (description !== undefined) data.description = description;

    await prisma.navigationItem.update({ where: { id }, data });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Nav update error:", error);
    return NextResponse.json({ error: "更新导航失败" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get("id") || "0");
    if (!id) return NextResponse.json({ error: "缺少ID" }, { status: 400 });

    await prisma.navigationItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Nav delete error:", error);
    return NextResponse.json({ error: "删除导航失败" }, { status: 500 });
  }
}