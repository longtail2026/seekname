/**
 * AI 起名 API
 * POST /api/name/generate
 *
 * 每次调用自动创建订单记录（免费和付费统一）
 * 订单包含完整起名信息，供后台数据分析
 *
 * 请求体：
 *   surname, gender, birthDate, birthTime?, expectations?, style?
 *   scenario?: "baby" | "adult" | "company" | "brand" | "shop" | "pet"  (默认 baby)
 *   useAiComposer?: boolean  (默认 true，优先使用 AI 创意组合层)
 *
 * 响应：
 *   success, data: { orderId, orderNo, wuxing, names }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOrderNo, generateAnonymousName } from "@/lib/order";
import { verifyToken } from "@/lib/auth";
import { aiCompose } from "@/lib/ai-composer";
import type { NamingScenario } from "@/lib/ai-composer";

// ─── 起名配置 ───
const NAME_CONFIG = {
  countPerSurname: 5,
  wuxingChars: {
    "金": ["铭", "锦", "钧", "铮", "铄", "钰", "鑫", "锐", "锋", "铭"],
    "木": ["林", "森", "桐", "楠", "梓", "柏", "松", "桦", "柳", "梅"],
    "水": ["涵", "泽", "洋", "涛", "浩", "清", "源", "沐", "沛", "沅"],
    "火": ["炎", "煜", "煊", "炜", "烨", "熠", "灿", "炅", "炅", "煦"],
    "土": ["坤", "垚", "培", "基", "城", "垣", "堂", "墨", "均", "圣"],
  },
};

// 业务类别映射
const CATEGORY_MAP: Record<string, string> = {
  personal: "个人起名",
  company: "公司起名",
  pet: "宠物起名",
  evaluate: "名字测评",
};

// 根据八字计算五行喜忌（简化版）
function calculateWuxing(birthDate: string, birthTime?: string) {
  const month = new Date(birthDate).getMonth() + 1;
  const seasonMap: Record<number, { likes: string[]; avoids: string[] }> = {
    1: { likes: ["火"], avoids: ["水"] },
    2: { likes: ["金"], avoids: ["木"] },
    3: { likes: ["金"], avoids: ["木"] },
    4: { likes: ["金"], avoids: ["木"] },
    5: { likes: ["水"], avoids: ["火"] },
    6: { likes: ["水"], avoids: ["火"] },
    7: { likes: ["水"], avoids: ["火"] },
    8: { likes: ["木"], avoids: ["金"] },
    9: { likes: ["木"], avoids: ["金"] },
    10: { likes: ["木"], avoids: ["金"] },
    11: { likes: ["火"], avoids: ["水"] },
    12: { likes: ["火"], avoids: ["水"] },
  };
  return seasonMap[month] || { likes: ["土"], avoids: [] };
}

// 从数据库查询典籍名句
async function queryClassics(keywords: string[], limit: number = 3) {
  const entries = await prisma.classicsEntry.findMany({
    where: {
      OR: [
        { keywords: { hasSome: keywords } },
        { ancientText: { contains: keywords[0] || "" } },
      ],
    },
    take: limit,
    select: {
      id: true,
      bookName: true,
      ancientText: true,
      modernText: true,
    },
  });
  return entries;
}

// 从康熙字典查询字
async function queryKangxiChars(chars: string[]) {
  const dict = await prisma.kangxiDict.findMany({
    where: { character: { in: chars } },
    select: {
      character: true,
      pinyin: true,
      wuxing: true,
      meaning: true,
      strokeCount: true,
    },
  });
  return dict;
}

// 生成名字组合
async function generateNames(
  surname: string,
  gender: string,
  wuxingLikes: string[],
  expectations?: string
) {
  const names = [];
  const preferredChars: string[] = [];
  for (const wx of wuxingLikes) {
    const chars =
      NAME_CONFIG.wuxingChars[wx as keyof typeof NAME_CONFIG.wuxingChars];
    if (chars) preferredChars.push(...chars);
  }

  const charInfo = await queryKangxiChars(preferredChars.slice(0, 20));
  const charMap = new Map(charInfo.map((c) => [c.character, c]));

  const suitableChars = preferredChars.filter((char) => {
    const info = charMap.get(char);
    return !!info;
  });

  const count = Math.min(
    NAME_CONFIG.countPerSurname,
    Math.floor(suitableChars.length / 2)
  );

  for (let i = 0; i < count; i++) {
    const char1 = suitableChars[i * 2];
    const char2 = suitableChars[i * 2 + 1];
    if (!char1 || !char2) continue;

    const info1 = charMap.get(char1);
    const info2 = charMap.get(char2);

    const fullName = surname + char1 + char2;
    const pinyin = [
      info1?.pinyin?.split(",")[0] || "",
      info2?.pinyin?.split(",")[0] || "",
    ].join(" ");
    const wuxing = (info1?.wuxing || "") + (info2?.wuxing || "");

    names.push({
      name: fullName,
      givenName: char1 + char2,
      pinyin: pinyin.trim(),
      wuxing: wuxing || "未知",
      meaning: `${info1?.meaning || ""}；${info2?.meaning || ""}`,
      strokeCount: (info1?.strokeCount || 0) + (info2?.strokeCount || 0),
    });
  }

  return names;
}

// 为名字匹配典籍出处
async function attachSources(names: any[], expectations?: string) {
  const keywords = expectations
    ? expectations.split(/[,，\s]+/).filter(Boolean)
    : ["德", "才", "智", "仁", "义"];

  const entries = await queryClassics(keywords, 5);

  return names.map((name, index) => {
    const entry = entries[index % entries.length];
    return {
      ...name,
      source: entry
        ? {
            book: entry.bookName,
            text: entry.ancientText?.slice(0, 50) + "...",
            fullText: entry.modernText,
          }
        : undefined,
    };
  });
}

/**
 * 创建订单记录（每次起名调用都会创建）
 */
async function createOrder(params: {
  userId?: string | null;
  userName?: string | null;
  category: string;
  surname: string;
  gender: string;
  birthDate: string;
  birthTime?: string;
  expectations?: string;
  style?: string;
  results: any[];
}) {
  const orderNo = generateOrderNo();
  const now = new Date();
  const isPaid = false; // 目前全部免费，后续接入支付后根据业务判断

  try {
    // 先创建起名记录（注意：不传 String[] 字段，Prisma 7 adapter 对数组类型有 bug）
    const nameRecord = await prisma.nameRecord.create({
      data: {
        userId: params.userId ?? null,
        surname: params.surname,
        gender: params.gender === "M" ? "male" : params.gender === "F" ? "female" : params.gender,
        birthDate: new Date(params.birthDate),
        birthTime: params.birthTime,
        expectations: params.expectations,
        style: params.style,
        results: params.results as object, // Json 字段，不用 any
        status: "completed",
      },
    });

    // 再创建订单（关联起名记录）
    const order = await prisma.order.create({
      data: {
        orderNo,
        userId: params.userId ?? null,
        type: params.category,
        amount: isPaid ? 9.9 : 0, // 免费起名 = 0 元
        payStatus: isPaid ? "paid" : "free", // free 表示免费无需支付
        status: "completed",
        nameRecordId: nameRecord.id,
      },
    });

    // 返回订单信息（用于前端展示）
    return {
      id: order.id,
      orderNo: order.orderNo,
      type: order.type,
      amount: Number(order.amount),
      payStatus: order.payStatus,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      nameRecordId: nameRecord.id,
    };
  } catch (e) {
    console.error("[Create Order Error]", e);
    // 即使订单创建失败也不阻断主流程
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      surname,
      gender,
      birthDate,
      birthTime,
      expectations,
      style,
      category = "personal", // 默认个人起名
    } = body;

    // 参数校验
    if (!surname || !gender || !birthDate) {
      return NextResponse.json(
        { success: false, error: "缺少必要参数：姓氏、性别、生日" },
        { status: 400 }
      );
    }

    // ── 获取当前用户（如果已登录）──
    let currentUser: { id: string; name?: string | null } | null = null;
    let anonymousName: string | null = null;

    // 尝试从 cookie 获取用户
    const token =
      request.cookies.get("auth-token")?.value ||
      request.headers.get("Authorization")?.replace("Bearer ", "");

    if (token) {
      try {
        const payload = await verifyToken(token);
        if (payload) {
          const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, name: true },
          });
          if (user) currentUser = user;
        }
      } catch {}
    }

    if (!currentUser) {
      anonymousName = generateAnonymousName();
    }

    // ── 计算五行喜忌 ──
    const wuxingResult = calculateWuxing(birthDate, birthTime);

    // ── 确定场景 & 是否使用 AI 组合层 ──
    const validScenarios: NamingScenario[] = ["baby", "adult", "company", "brand", "shop", "pet"];
    const scenario: NamingScenario = validScenarios.includes(category as NamingScenario)
      ? (category as NamingScenario)
      : "baby";
    const useAiComposer = body.useAiComposer !== false; // 默认开启

    let rawNames: any[] = [];

    if (useAiComposer) {
      // ── 使用 AI 创意组合层 ──
      try {
        console.log(`[API] 使用 AI Composer，场景=${scenario}`);

        // 构建 StructuredIntent（与 naming-engine.ts 兼容的格式）
        const intent = {
          surname,
          gender: gender as "M" | "F",
          birthDate,
          birthTime,
          style: style ? [style] : [],
          wordCount: 2 as const,
          wuxing: wuxingResult.likes,
          avoidances: [] as string[],
          imagery: expectations
            ? expectations.split(/[,，\s]+/).filter(Boolean)
            : [],
          sourcePreference: [],
          notes: expectations,
        };

        // 构建候选字池（从五行字库中取）
        const poolChars: Array<{ char: string; wx: string }> = [];
        for (const wx of wuxingResult.likes) {
          const chars = NAME_CONFIG.wuxingChars[wx as keyof typeof NAME_CONFIG.wuxingChars] || [];
          for (const char of chars) {
            poolChars.push({ char, wx });
          }
        }

        const uniqueChars = Array.from(new Set(poolChars.map((p) => p.char)));
        const charInfo = await queryKangxiChars(uniqueChars.slice(0, 30));
        const charMap = new Map(charInfo.map((c) => [c.character, c]));

        const pool = poolChars
          .filter((p) => charMap.has(p.char))
          .reduce<typeof poolChars>((acc, p) => {
            if (!acc.find((x) => x.char === p.char)) acc.push(p);
            return acc;
          }, [])
          .map((p) => {
            const info = charMap.get(p.char)!;
            return {
              character: p.char,
              pinyin: info.pinyin || "",
              wuxing: info.wuxing || p.wx || "",
              meaning: info.meaning || "",
              strokeCount: info.strokeCount || 0,
              frequency: 50,
            };
          });

        // 调用 AI Composer
        const candidates = await aiCompose(pool, intent, {
          scenario,
          fallbackToRules: true,
          maxCandidates: 8,
          wordCount: 2,
        }, surname);

        rawNames = candidates.map((c) => ({
          name: c.fullName,
          givenName: c.givenName,
          pinyin: c.pinyin,
          wuxing: c.wuxing,
          meaning: c.meaning,
          strokeCount: c.strokeCount,
          source: c.sources[0]
            ? { book: c.sources[0].book, text: c.sources[0].text }
            : undefined,
          score: c.score,
        }));

        console.log(`[API] AI Composer 生成 ${rawNames.length} 个名字`);
      } catch (err) {
        console.error("[API] AI Composer 失败，降级到传统生成:", err);
        rawNames = await generateNames(surname, gender, wuxingResult.likes, expectations);
      }
    } else {
      // ── 使用传统规则生成 ──
      rawNames = await generateNames(surname, gender, wuxingResult.likes, expectations);
    }

    // ── 附加典籍出处（传统模式下补全，AI 模式已有）──
    const namesWithSource = await attachSources(rawNames, expectations);

    // ── 如果名字为空，直接报错（方便调试）──
    if (namesWithSource.length === 0) {
      // 先检查数据库是否有康熙字典数据
      const charCount = await prisma.kangxiDict.count();
      const entryCount = await prisma.classicsEntry.count();
      console.error(`[API] 名字列表为空！康熙字典=${charCount}条，典籍=${entryCount}条`);
      return NextResponse.json(
        { success: false, error: `名字生成失败（康熙字典${charCount}条，典籍${entryCount}条）。请检查数据库是否有初始数据。` },
        { status: 500 }
      );
    }

    // ── 创建订单记录（每次必建）──
    const order = await createOrder({
      userId: currentUser?.id ?? null,
      userName: currentUser?.name || anonymousName,
      category: CATEGORY_MAP[category] || category,
      surname,
      gender,
      birthDate,
      birthTime,
      expectations,
      style,
      results: namesWithSource,
    });

    // 构建返回的订单详情（给前端/后台用）
    const orderDetail = order
      ? {
          orderNo: order.orderNo,
          userName: currentUser?.name || anonymousName || "匿名用户",
          category: CATEGORY_MAP[category] || category,
          date: nowStr(),
          time: nowTimeStr(),
          detail: {
            surname,
            gender: gender === "M" ? "男" : gender === "F" ? "女" : gender,
            birthDate,
            birthTime,
            expectations,
            style,
          },
          candidates: namesWithSource.map((n) => ({
            name: n.name,
            pinyin: n.pinyin,
            wuxing: n.wuxing,
            meaning: n.meaning,
            source: n.source,
          })),
        }
      : null;

    return NextResponse.json({
      success: true,
      data: {
        orderId: order?.id,
        orderNo: order?.orderNo,
        orderDetail,
        wuxing: wuxingResult,
        names: namesWithSource,
        scenario,
        useAiComposer,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("起名 API 错误:", msg, error);

    // 区分错误类型，给出更明确的提示
    let userMsg = "服务器内部错误";
    if (msg.includes("DeepSeek") || msg.includes("API")) {
      userMsg = "AI 服务调用失败，请检查 DEEPSEEK_API_KEY 配置";
    } else if (msg.includes("prisma") || msg.includes("connect") || msg.includes("connection")) {
      userMsg = "数据库连接失败，请检查环境变量配置";
    }

    return NextResponse.json(
      { success: false, error: userMsg, detail: msg },
      { status: 500 }
    );
  }
}

// 辅助：当前时间字符串
function nowStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
function nowTimeStr(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

// 测试接口
export async function GET() {
  return NextResponse.json({
    message: "AI 起名 API - 每次调用自动生成订单",
    usage:
      "POST /api/name/generate with body: { surname, gender, birthDate, birthTime?, expectations?, style?, category? }",
  });
}
