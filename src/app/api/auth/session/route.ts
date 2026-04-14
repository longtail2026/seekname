/**
 * 登出 / 获取当前用户信息
 * POST /api/auth/logout   - 清除 cookie
 * GET  /api/auth/session  - 验证 token 返回当前用户
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

/**
 * 获取当前登录用户（通过 Cookie）
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const payload = await verifyToken(token);

    if (!payload) {
      // token 无效，清除 cookie
      const res = NextResponse.json({ user: null }, { status: 200 });
      res.cookies.delete("auth-token");
      return res;
    }

    // 查询完整用户信息
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        avatar: true,
        gender: true,
        occupation: true,
        hobbies: true,
        vipLevel: true,
        points: true,
        status: true,
        createdAt: true,
      },
    });

    if (!user || user.status !== "active") {
      const res = NextResponse.json({ user: null }, { status: 200 });
      res.cookies.delete("auth-token");
      return res;
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error("[Session API Error]", error);
    return NextResponse.json(
      { error: "服务器错误" },
      { status: 500 }
    );
  }
}

/**
 * 登出：清除 auth-token cookie
 */
export async function POST() {
  const response = NextResponse.json({ message: "已退出登录" });

  response.cookies.set("auth-token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
