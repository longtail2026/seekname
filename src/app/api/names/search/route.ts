/**
 * 名字搜索 API
 * 支持搜索起名历史和典藏本
 * GET /api/names/search?q=xxx&type=orders|favorites|all
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // 验证用户认证
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() || "";
    const type = searchParams.get("type") || "all"; // orders | favorites | all

    if (!query) {
      return NextResponse.json({ success: false, error: "Search query is required" }, { status: 400 });
    }

    if (query.length > 50) {
      return NextResponse.json({ success: false, error: "Query too long" }, { status: 400 });
    }

    const results: {
      orders: Array<{
        id: string;
        orderNo: string;
        type: string;
        createdAt: string;
        nameRecord: {
          surname: string;
          gender: string;
          results: string[];
        } | null;
      }>;
      favorites: Array<{
        id: string;
        fullName: string;
        surname: string;
        gender: string;
        score: number | null;
        createdAt: string;
      }>;
    } = {
      orders: [],
      favorites: [],
    };

    // 搜索起名历史
    if (type === "orders" || type === "all") {
      // 获取订单及其关联的起名记录
      const allOrders = await prisma.order.findMany({
        where: {
          userId: payload.userId,
        },
        include: {
          nameRecord: {
            select: {
              surname: true,
              gender: true,
              results: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });

      // 过滤出订单号或名字匹配的订单
      const orders = allOrders.filter((order) => {
        const lowerQuery = query.toLowerCase();
        // 匹配订单号
        if (order.orderNo.toLowerCase().includes(lowerQuery)) {
          return true;
        }
        // 匹配名字
        const nameRecord = order.nameRecord;
        if (nameRecord?.results && Array.isArray(nameRecord.results)) {
          const results = nameRecord.results as string[];
          if (results.some((name) => name.includes(query))) {
            return true;
          }
        }
        if (nameRecord?.surname && typeof nameRecord.surname === "string" && nameRecord.surname.includes(query)) {
          return true;
        }
        return false;
      }).slice(0, 20);

      results.orders = orders.map((order) => ({
        id: order.id,
        orderNo: order.orderNo,
        type: order.type,
        createdAt: order.createdAt.toISOString(),
        nameRecord: order.nameRecord ? {
          surname: order.nameRecord.surname,
          gender: order.nameRecord.gender,
          results: Array.isArray(order.nameRecord.results)
            ? (order.nameRecord.results as string[])
            : [],
        } : null,
      }));
    }

    // 搜索典藏本
    if (type === "favorites" || type === "all") {
      const favorites = await prisma.nameFavorite.findMany({
        where: {
          userId: payload.userId,
          OR: [
            { fullName: { contains: query } },
            { surname: { contains: query } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      results.favorites = favorites.map((fav) => ({
        id: fav.id,
        fullName: fav.fullName,
        surname: fav.surname,
        gender: fav.gender,
        score: fav.score,
        createdAt: fav.createdAt.toISOString(),
      }));
    }

    return NextResponse.json({
      success: true,
      query,
      total: results.orders.length + results.favorites.length,
      ...results,
    });
  } catch (error) {
    console.error("[Names Search Error]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
