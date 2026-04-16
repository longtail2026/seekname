import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    const payload = verifyToken(token || "");
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const { tier } = await req.json();

    // tier: 0 = free, 1 = VIP monthly, 2 = SVIP annual
    const validTiers = [0, 1, 2];
    if (!validTiers.includes(tier)) {
      return NextResponse.json({ error: "无效的会员等级" }, { status: 400 });
    }

    // 查询当前用户
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { vipLevel: true, id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 不允许降级
    if (tier <= (user.vipLevel ?? 0)) {
      return NextResponse.json({ error: "您已拥有更高或同等会员等级" }, { status: 400 });
    }

    // 更新会员等级
    const updated = await prisma.user.update({
      where: { id: payload.userId },
      data: { vipLevel: tier },
      select: { vipLevel: true, id: true },
    });

    // 生成模拟订单号
    const orderId = `VIP${Date.now()}${tier}`;

    return NextResponse.json({
      success: true,
      orderId,
      vipLevel: updated.vipLevel,
      message: "会员升级成功",
    });
  } catch (err: any) {
    // 数据库不可用时返回友好错误
    if (err.code === "P2025" || err.message?.includes("Can't reach database")) {
      return NextResponse.json(
        { error: "服务暂时不可用，请稍后重试" },
        { status: 503 }
      );
    }
    console.error("[VIP upgrade]", err);
    return NextResponse.json({ error: "服务器错误" }, { status: 500 });
  }
}
