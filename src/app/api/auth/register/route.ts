/**
 * 注册 API
 * POST /api/auth/register
 *
 * 支持手机号注册或邮箱注册（二选一）
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // 支持两种格式：account（合并输入框）或 email/phone 分开
    const { account, email, phone, password, name } = body;

    // ── 基础校验 ──
    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "密码至少需要 6 个字符" },
        { status: 400 }
      );
    }

    if (password.length > 50) {
      return NextResponse.json(
        { error: "密码不能超过 50 个字符" },
        { status: 400 }
      );
    }

    // 必须提供手机号或邮箱（二选一）
    // 如果传了 account（合并输入框），自动判断是手机号还是邮箱
    let normalizedEmail: string | null = null;
    let normalizedPhone: string | null = null;

    if (account && typeof account === "string" && account.trim() !== "") {
      const trimmedAccount = account.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^1[3-9]\d{9}$/;

      if (emailRegex.test(trimmedAccount)) {
        normalizedEmail = trimmedAccount.toLowerCase();
      } else if (phoneRegex.test(trimmedAccount)) {
        normalizedPhone = trimmedAccount;
      } else if (trimmedAccount.includes("@")) {
        return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });
      } else {
        return NextResponse.json({ error: "手机号格式不正确" }, { status: 400 });
      }
    }

    // 兼容旧的 email/phone 分开传的方式
    const hasEmailFallback = email && typeof email === "string" && email.trim() !== "";
    const hasPhoneFallback = phone && typeof phone === "string" && phone.trim() !== "";

    if (!normalizedEmail && !normalizedPhone && !hasEmailFallback && !hasPhoneFallback) {
      return NextResponse.json(
        { error: "请输入手机号或邮箱" },
        { status: 400 }
      );
    }

    // 使用 fallback 值
    if (!normalizedEmail && hasEmailFallback) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });
      }
      normalizedEmail = email.trim().toLowerCase();
    }
    if (!normalizedPhone && hasPhoneFallback) {
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(phone.trim())) {
        return NextResponse.json({ error: "手机号格式不正确" }, { status: 400 });
      }
      normalizedPhone = phone.trim();
    }

    // ── 查重：手机号或邮箱已存在 ──
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
          ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
        ],
      },
    });

    if (existingUser) {
      if (existingUser.email === normalizedEmail) {
        return NextResponse.json(
          { error: "该邮箱已被注册" },
          { status: 409 }
        );
      }
      if (existingUser.phone === normalizedPhone) {
        return NextResponse.json(
          { error: "该手机号已被注册" },
          { status: 409 }
        );
      }
    }

    // ── 创建用户 ──
    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        phone: normalizedPhone,
        password: hashedPassword,
        name: name?.trim() || null,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "注册成功",
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Register API Error]", error);
    return NextResponse.json(
      { error: "服务器内部错误，请稍后重试" },
      { status: 500 }
    );
  }
}
