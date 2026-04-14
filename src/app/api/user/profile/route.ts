/**
 * 账号设置 API - 更新用户个人信息
 * PUT /api/user/profile
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { OCCUPATIONS, HOBBIES } from "@/lib/constants";

export async function PUT(request: NextRequest) {
  try {
    // ── 鉴权 ──
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "登录已过期" }, { status: 401 });
    }

    // ── 解析请求体 ──
    const body = await request.json();
    const {
      name,
      avatar,
      gender,
      occupation,
      hobbies,
      email,
      phone,
    } = body;

    // 构建更新数据（只更新提供的字段）
    const updateData: Record<string, unknown> = {};
    if (typeof name === "string") updateData.name = name.trim();
    if (typeof avatar === "string") updateData.avatar = avatar.trim();
    if (typeof gender === "string" && ["男", "女"].includes(gender)) {
      updateData.gender = gender;
    }
    if (typeof occupation === "string") {
      updateData.occupation = occupation.trim();
    }
    if (Array.isArray(hobbies)) {
      updateData.hobbies = hobbies;
    }

    // 邮箱/手机号校验
    if (email !== undefined) {
      if (email === null || email.trim() === "") {
        updateData.email = null;
      } else if (typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        updateData.email = email.trim().toLowerCase();
      } else {
        return NextResponse.json(
          { error: "邮箱格式不正确" },
          { status: 400 }
        );
      }
    }

    if (phone !== undefined) {
      if (phone === null || phone.trim() === "") {
        updateData.phone = null;
      } else if (typeof phone === "string" && /^1[3-9]\d{9}$/.test(phone.trim())) {
        updateData.phone = phone.trim();
      } else {
        return NextResponse.json(
          { error: "手机号格式不正确" },
          { status: 400 }
        );
      }
    }

    // 如果没有要更新的字段
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "没有需要更新的字段" },
        { status: 400 }
      );
    }

    // ── 更新用户信息 ──
    const updatedUser = await prisma.user.update({
      where: { id: payload.userId },
      data: updateData,
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
        createdAt: true,
      },
    });

    return NextResponse.json({
      message: "更新成功",
      user: updatedUser,
    });
  } catch (error) {
    console.error("[Profile Update Error]", error);
    return NextResponse.json(
      { error: "服务器内部错误，请稍后重试" },
      { status: 500 }
    );
  }
}
