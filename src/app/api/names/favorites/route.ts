/**
 * GET  /api/names/favorites       — 获取收藏列表
 * POST /api/names/favorites       — 添加收藏
 * DELETE /api/names/favorites?id=  — 移除收藏
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

// GET — 列表
export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId)
    return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = Math.min(50, parseInt(searchParams.get("pageSize") || "20"));

  const [total, items] = await prisma.$transaction([
    prisma.nameFavorite.count({ where: { userId } }),
    prisma.nameFavorite.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return NextResponse.json({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

// POST — 添加收藏（幂等）
export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId)
    return NextResponse.json({ error: "请先登录" }, { status: 401 });

  try {
    const body = await req.json();
    const { fullName, surname, gender, score, analysis, wuxing, source, note } = body;

    if (!fullName || !surname || !gender) {
      return NextResponse.json(
        { error: "缺少必要字段：fullName, surname, gender" },
        { status: 400 }
      );
    }

    const item = await prisma.nameFavorite.upsert({
      where: { userId_fullName: { userId, fullName } },
      update: { score, analysis, wuxing, note },
      create: {
        userId,
        fullName,
        surname,
        gender,
        score: score ?? null,
        analysis: analysis ?? null,
        wuxing: wuxing ?? [],
        source: source ?? "api",
        note: note ?? null,
      },
    });

    return NextResponse.json({ item, action: "saved" }, { status: 200 });
  } catch (error) {
    console.error("[NameFavorite POST]", error);
    return NextResponse.json({ error: "收藏失败" }, { status: 500 });
  }
}

// DELETE — 移除
export async function DELETE(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId)
    return NextResponse.json({ error: "请先登录" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");
  const fullName = searchParams.get("fullName");

  if (!id && !fullName)
    return NextResponse.json(
      { error: "必须提供 id 或 fullName 参数" },
      { status: 400 }
    );

  try {
    if (id) {
      await prisma.nameFavorite.deleteMany({
        where: { id, userId },
      });
    } else if (fullName) {
      await prisma.nameFavorite.deleteMany({
        where: { userId, fullName },
      });
    }

    return NextResponse.json({ action: "deleted" }, { status: 200 });
  } catch (error) {
    console.error("[NameFavorite DELETE]", error);
    return NextResponse.json({ error: "移除失败" }, { status: 500 });
  }
}
