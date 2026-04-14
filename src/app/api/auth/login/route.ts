/**
 * 登录 API
 * POST /api/auth/login
 *
 * 支持手机号+密码 或 邮箱+密码 登录
 * 返回 JWT token
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, signToken, TokenPayload } from "@/lib/auth";

// 生成头像 URL 的辅助函数
function generateAvatarUrl(userId: string, name: string): string {
  const AVATAR_BASE = "https://api.dicebear.com/7.x/adventure/svg";
  // 用 userId 生成稳定的种子
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const seedChars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let seed = "";
  const absHash = Math.abs(hash);
  for (let i = 0; i < 8; i++) {
    seed += seedChars[absHash % seedChars.length];
    // eslint-disable-next-line no-bitwise
    seed += seedChars[(absHash >> (i + 3)) % seedChars.length];
  }
  return `${AVATAR_BASE}?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f4,ffd5dc,ffdfbf&hair=variant01,variant02,variant03,variant04`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { account, password } = body;

    // ── 校验 ──
    if (!account || typeof account !== "string" || account.trim() === "") {
      return NextResponse.json(
        { error: "请输入手机号或邮箱" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "请输入密码" }, { status: 400 });
    }

    const normalizedAccount = account.trim().toLowerCase();

    // ── 查找用户（手机号或邮箱） ──
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedAccount },
          { phone: account.trim() },
        ],
      },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "账号或密码错误" },
        { status: 401 }
      );
    }

    // ── 验证密码 ──
    const isValid = await comparePassword(password, user.password);

    if (!isValid) {
      return NextResponse.json(
        { error: "账号或密码错误" },
        { status: 401 }
      );
    }

    // ── 检查用户状态 ──
    if (user.status !== "active") {
      return NextResponse.json(
        { error: "该账户已被禁用，请联系客服" },
        { status: 403 }
      );
    }

    // ── 首次登录自动生成动漫头像 ──
    let avatarUrl = user.avatar;
    if (!avatarUrl) {
      avatarUrl = generateAvatarUrl(user.id, user.name || "");
      await prisma.user.update({
        where: { id: user.id },
        data: { avatar: avatarUrl },
      });
    }

    // ── 生成 JWT ──
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email ?? undefined,
      phone: user.phone ?? undefined,
    };

    const token = await signToken(payload);

    // ── 返回 ──
    const response = NextResponse.json(
      {
        message: "登录成功",
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          name: user.name,
          avatar: avatarUrl,
          gender: user.gender,
          occupation: user.occupation,
          hobbies: user.hobbies,
          vipLevel: user.vipLevel,
          points: user.points,
        },
        token,
      },
      { status: 200 }
    );

    // Set-Cookie 也存一份（方便 SSR 场景）
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 天
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[Login API Error]", error);
    return NextResponse.json(
      { error: "服务器内部错误，请稍后重试" },
      { status: 500 }
    );
  }
}
