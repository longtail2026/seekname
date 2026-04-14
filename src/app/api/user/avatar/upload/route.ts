/**
 * 头像上传 API - 上传自定义头像
 * POST /api/user/avatar/upload
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
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

    // ── 解析表单数据 ──
    const formData = await request.formData();
    const file = formData.get("avatar") as File | null;

    if (!file) {
      return NextResponse.json({ error: "请选择要上传的图片" }, { status: 400 });
    }

    // 校验文件类型
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "仅支持 JPG、PNG、GIF、WebP 格式" },
        { status: 400 }
      );
    }

    // 校验文件大小（最大 2MB）
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: "图片大小不能超过 2MB" },
        { status: 400 }
      );
    }

    // 转换为 base64 存储（小项目方案，生产环境应使用对象存储如 COS/OSS）
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    // 更新用户头像
    const updatedUser = await prisma.user.update({
      where: { id: payload.userId },
      data: { avatar: base64 },
      select: {
        id: true,
        avatar: true,
      },
    });

    return NextResponse.json({
      message: "头像上传成功",
      avatar: updatedUser.avatar,
    });
  } catch (error) {
    console.error("[Avatar Upload Error]", error);
    return NextResponse.json(
      { error: "服务器内部错误，请稍后重试" },
      { status: 500 }
    );
  }
}
