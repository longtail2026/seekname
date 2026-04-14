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
    const { email, phone, password, name } = body;

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
    const hasEmail = email && typeof email === "string" && email.trim() !== "";
    const hasPhone = phone && typeof phone === "string" && phone.trim() !== "";

    if (!hasEmail && !hasPhone) {
      return NextResponse.json(
        { error: "请输入手机号或邮箱" },
        { status: 400 }
      );
    }

    // 邮箱格式校验
    if (hasEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });
      }
    }

    // 手机号格式校验（简单校验，支持国内号码）
    if (hasPhone) {
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(phone.trim())) {
        return NextResponse.json(
          { error: "手机号格式不正确" },
          { status: 400 }
        );
      }
    }

    const normalizedEmail = hasEmail ? email.trim().toLowerCase() : null;
    const normalizedPhone = hasPhone ? phone.trim() : null;

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
