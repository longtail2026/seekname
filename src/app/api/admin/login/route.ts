import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "邮箱和密码不能为空" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        adminRole: true,
        status: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "账号不存在" }, { status: 401 });
    }

    if (user.status === "inactive" || user.status === "disabled") {
      return NextResponse.json({ error: "账号已被禁用" }, { status: 403 });
    }

    if (!user.adminRole || (user.adminRole !== "admin" && user.adminRole !== "operator")) {
      return NextResponse.json({ error: "没有管理权限" }, { status: 403 });
    }

    // 验证密码（处理旧版明文和新版 bcrypt）
    let valid = false;
    if (user.password && (user.password.startsWith("$2a$") || user.password.startsWith("$2b$"))) {
      valid = await bcrypt.compare(password, user.password);
    } else if (user.password) {
      // 明文密码兼容（开发阶段）
      valid = user.password === password;
    }

    if (!valid) {
      return NextResponse.json({ error: "密码错误" }, { status: 401 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name || user.email?.split("@")[0] || "管理员",
        role: user.adminRole,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json({ error: "登录失败" }, { status: 500 });
  }
}