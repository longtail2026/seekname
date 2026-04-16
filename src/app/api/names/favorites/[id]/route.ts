/**
 * GET    /api/names/favorites/[id] — 获取单条收藏详情
 * PATCH  /api/names/favorites/[id] — 更新备注
 * DELETE /api/names/favorites/[id] — 删除收藏
 */
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "seekname_default_secret_change_in_production"
);

async function getUserId(req: NextRequest): Promise<string | null> {
  const token =
    req.cookies.get("token")?.value ||
    req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.userId as string;
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  try {
    const item = await prisma.nameFavorite.findFirst({
      where: { id: params.id, userId },
    });
    if (!item) return NextResponse.json({ error: "未找到该收藏" }, { status: 404 });
    return NextResponse.json({ item });
  } catch (error) {
    console.error("[NameFavorite GET]", error);
    return NextResponse.json({ error: "加载失败" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  try {
    const body = await req.json();
    const { note } = body;

    const item = await prisma.nameFavorite.updateMany({
      where: { id: params.id, userId },
      data: { note: note ?? null },
    });

    if (item.count === 0) return NextResponse.json({ error: "未找到该收藏" }, { status: 404 });

    return NextResponse.json({ action: "updated" });
  } catch (error) {
    console.error("[NameFavorite PATCH]", error);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: "请先登录" }, { status: 401 });

  try {
    await prisma.nameFavorite.deleteMany({
      where: { id: params.id, userId },
    });
    return NextResponse.json({ action: "deleted" });
  } catch (error) {
    console.error("[NameFavorite DELETE]", error);
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}
