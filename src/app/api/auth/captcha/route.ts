/**
 * 验证码 API
 * GET /api/auth/captcha
 *
 * 生成四位数字变形随机验证码（Canvas绘制）
 * - 每次请求生成新的随机码
 * - 返回 base64 图片 + 文本答案
 * - 使用 session/内存存储验证答案
 */

import { NextRequest, NextResponse } from "next/server";

// 内存存储验证码（生产环境应使用 Redis）
const captchaStore = new Map<string, { code: string; expires: number }>();

// 清理过期验证码（每5分钟执行一次）
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of Array.from(captchaStore.entries())) {
    if (value.expires < now) {
      captchaStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

function generateCaptchaId(): string {
  return `captcha_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * 生成变形数字验证码图片
 * 使用纯 Canvas API 绘制，包含：
 * - 随机4位数字
 * - 轻微旋转和位置偏移
 * - 干扰线和噪点
 * - 随机颜色变化（保持可读性）
 */
function generateCaptchaImage(code: string): string {
  const width = 120;
  const height = 44;
  
  // 使用 Node.js 环境下的 Canvas 实现
  // 由于服务端没有 DOM Canvas，我们用 SVG 代替
  const chars = code.split("");
  const charColors = ["#E86A17", "#D4941A", "#2D1B0E", "#B07814"];
  
  // 生成每个字符的变换参数
  const charElements = chars.map((char, i) => {
    const x = 18 + i * 26;
    const yBase = 30;
    const rotate = (Math.random() - 0.5) * 24; // ±12度旋转
    const yOffset = (Math.random() - 0.5) * 6;   // ±3px 偏移
    const fontSize = 22 + Math.floor(Math.random() * 6); // 22-28px
    const color = charColors[Math.floor(Math.random() * charColors.length)];
    
    return `
      <text 
        x="${x}" 
        y="${yBase + yOffset}" 
        font-family="'Noto Sans SC', 'Arial', sans-serif" 
        font-size="${fontSize}" 
        font-weight="bold"
        fill="${color}"
        transform="rotate(${rotate}, ${x}, ${yBase + yOffset})"
      >${char}</text>
    `;
  });

  // 干扰线（3-5条细线）
  const lines = Array.from({ length: 3 + Math.floor(Math.random() * 3) }, () => {
    const x1 = Math.random() * width;
    const y1 = Math.random() * height;
    const x2 = Math.random() * width;
    const y2 = Math.random() * height;
    const strokeColor = `rgba(180, 160, 140, ${0.2 + Math.random() * 0.3})`;
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${strokeColor}" stroke-width="1" />`;
  });

  // 噪点圆点（20-40个）
  const dots = Array.from({ length: 20 + Math.floor(Math.random() * 21) }, () => {
    const cx = Math.random() * width;
    const cy = Math.random() * height;
    const r = 0.5 + Math.random() * 1.5;
    const fillOpacity = 0.15 + Math.random() * 0.35;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(139,119,101,${fillOpacity})" />`;
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <!-- 背景 -->
    <rect width="100%" height="100%" fill="#FFFCF7" rx="6" />
    <!-- 背景噪点纹理 -->
    ${dots.join("\n    ")}
    <!-- 干扰线 -->
    ${lines.join("\n    ")}
    <!-- 验证码字符 -->
    ${charElements.join("\n    ")}
    <!-- 底部轻微装饰线 -->
    <line x1="4" y1="40" x2="${width-4}" y2="40" stroke="rgba(212,148,26,0.25)" stroke-width="1" />
  </svg>`;

  // SVG 转 base64
  const base64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

export async function GET() {
  try {
    // 生成随机4位数字
    const code = String(1000 + Math.floor(Math.random() * 9000));
    const captchaId = generateCaptchaId();
    const image = generateCaptchaImage(code);

    // 存储验证码（有效期3分钟）
    captchaStore.set(captchaId, {
      code,
      expires: Date.now() + 3 * 60 * 1000,
    });

    return NextResponse.json({
      captchaId,
      image,
      expiresIn: 180, // 秒
    });
  } catch (error) {
    console.error("[Captcha Error]", error);
    return NextResponse.json(
      { error: "验证码生成失败" },
      { status: 500 }
    );
  }
}

/**
 * 验证用户提交的验证码
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { captchaId, userInput } = body;

    if (!captchaId || !userInput) {
      return NextResponse.json(
        { valid: false, error: "缺少验证码参数" },
        { status: 400 }
      );
    }

    const stored = captchaStore.get(captchaId);

    if (!stored) {
      return NextResponse.json(
        { valid: false, error: "验证码已过期或不存在" },
        { status: 410 }
      );
    }

    if (Date.now() > stored.expires) {
      captchaStore.delete(captchaId);
      return NextResponse.json(
        { valid: false, error: "验证码已过期，请刷新" },
        { status: 410 }
      );
    }

    // 不区分大小写比较
    const isValid = stored.code.trim().toLowerCase() === userInput.trim().toLowerCase();

    // 验证后立即删除（一次性使用）
    captchaStore.delete(captchaId);

    return NextResponse.json({ valid: isValid });
  } catch (error) {
    console.error("[Captcha Verify Error]", error);
    return NextResponse.json(
      { valid: false, error: "服务器错误" },
      { status: 500 }
    );
  }
}
