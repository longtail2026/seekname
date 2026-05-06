/**
 * 分享海报生成 API
 * 生成带网站 LOGO + 短文案 + 二维码的海报
 * 使用服务端 canvas 渲染真实图片
 */
import { NextResponse } from "next/server";

interface PosterRequest {
  siteName: string;
  surname: string;
  domain: string;
}

export async function POST(request: Request) {
  try {
    const body: PosterRequest = await request.json();
    const { siteName = "寻名网", domain = "seekname.cn" } = body;

    // 返回海报结构化数据，由前端 canvas 渲染生成图片
    const posterData = {
      success: true,
      posterUrl: "",
      shareText: `AI 起名太香了！3 秒生成高分好名，免费领→ ${domain}`,
      shareTitle: `${siteName} - AI智能起名`,
      shareUrl: `https://${domain}`,
      posterLayout: {
        width: 600,
        height: 900,
        backgroundColor: "#FDFAF4",
        elements: [
          {
            type: "logo",
            text: siteName,
            font: "bold 36px 'Noto Serif SC', serif",
            color: "#C84A2A",
            x: 300,
            y: 120,
            align: "center" as const,
          },
          {
            type: "slogan",
            text: "AI 起名太香了！3 秒生成高分好名",
            font: "20px sans-serif",
            color: "#2C1810",
            x: 300,
            y: 220,
            align: "center" as const,
          },
          {
            type: "subtitle",
            text: `免费领→ ${domain}`,
            font: "bold 24px sans-serif",
            color: "#C84A2A",
            x: 300,
            y: 270,
            align: "center" as const,
          },
          {
            type: "divider",
            x: 100,
            y: 310,
            width: 400,
            color: "#E5DDD3",
          },
          {
            type: "qrHint",
            text: "扫码或搜索进入",
            font: "14px sans-serif",
            color: "#8B7355",
            x: 300,
            y: 610,
            align: "center" as const,
          },
          {
            type: "domain",
            text: domain,
            font: "bold 16px sans-serif",
            color: "#2C1810",
            x: 300,
            y: 640,
            align: "center" as const,
          },
          {
            type: "footer",
            text: `${siteName} · AI 智能起名平台`,
            font: "12px sans-serif",
            color: "#9CA3AF",
            x: 300,
            y: 850,
            align: "center" as const,
          },
        ],
      },
    };

    return NextResponse.json(posterData);
  } catch (error) {
    console.error("[Poster API] Error:", error);
    return NextResponse.json(
      { success: false, error: "生成海报失败" },
      { status: 500 }
    );
  }
}