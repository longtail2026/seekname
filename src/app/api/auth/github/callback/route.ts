/**
 * GitHub OAuth 回调处理
 * GET /api/auth/github/callback
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// 用 DiceBear 生成稳定头像
function generateAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/7.x/adventure/svg?seed=${encodeURIComponent(seed)}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error || "授权被取消")}`)
    );
  }

  try {
    // 1. 用 code 换 GitHub Access Token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
    if (!tokenData.access_token) {
      throw new Error(tokenData.error || "获取 access_token 失败");
    }

    const accessToken = tokenData.access_token;

    // 2. 获取 GitHub 用户信息
    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const githubUser = await userRes.json() as {
      id: number;
      login: string;
      name: string | null;
      email: string | null;
      avatar_url: string | null;
    };

    // 3. 获取主要邮箱（如果 GitHub 未公开邮箱）
    let email = githubUser.email;
    if (!email) {
      const emailRes = await fetch("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" },
      });
      const emails = await emailRes.json() as Array<{ email: string; primary: boolean; verified: boolean }>;
      const primary = emails.find((e) => e.primary && e.verified) || emails[0];
      email = primary?.email || null;
    }

    const githubId = String(githubUser.id);
    const nickname = githubUser.name || githubUser.login;

    // 4. 查找或创建用户
    let userId: string;
    const existing = await prisma.user.findFirst({
      where: { wxOpenId: `gh_${githubId}` },
      select: { id: true },
    }).catch(() => null);

    if (existing) {
      userId = existing.id;
    } else {
      // 新用户：插入 users 表
      const result = await prisma.$queryRaw<{ id: string }[]>`
        INSERT INTO users (name, email, avatar, wx_openid, status)
        VALUES (${nickname}, ${email || null}, ${githubUser.avatar_url || generateAvatarUrl(githubId)}, ${`gh_${githubId}`}, 'active')
        ON CONFLICT (wx_openid) DO UPDATE SET name = EXCLUDED.name, avatar = EXCLUDED.avatar
        RETURNING id
      `.catch(() => null);

      if (!result || result.length === 0) {
        // fallback：查询已有
        const found = await prisma.user.findFirst({
          where: { wxOpenId: `gh_${githubId}` },
          select: { id: true },
        });
        userId = found?.id || "github-user";
      } else {
        userId = result[0].id;
      }
    }

    // 5. 签发 JWT
    const token = await signToken({ userId, email: email || undefined });
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 天

    // 6. 写 cookie 并跳转
    const res = NextResponse.redirect(new URL("/", SITE_URL));
    res.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires,
      path: "/",
    });

    return res;
  } catch (err) {
    console.error("[GitHub OAuth]", err);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("GitHub 登录失败，请重试")}`)
    );
  }
}
