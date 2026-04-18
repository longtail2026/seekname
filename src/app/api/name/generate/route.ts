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
import { queryRaw, executeRaw } from "@/lib/prisma";
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

// 从数据库查询典籍名句（原生SQL，替代Prisma ORM）
async function queryClassics(keywords: string[], limit: number = 3) {
  const keyword = (keywords[0] || "德").slice(0, 10); // 限制长度防止SQL注入
  const entries = await queryRaw<{
    id: string;
    book_name: string;
    ancient_text: string;
    modern_text: string;
  }>(
    `SELECT id, book_name, ancient_text, modern_text
     FROM classics_entries
     WHERE ancient_text LIKE $1
     LIMIT $2`,
    [`%${keyword}%`, limit]
  );
  return entries;
}

// 从康熙字典查询字（原生SQL，替代Prisma ORM）
async function queryKangxiChars(chars: string[]) {
  if (!chars.length) return [];
  const placeholders = chars.map((_, i) => `$${i + 1}`).join(", ");
  const dict = await queryRaw<{
    character: string;
    pinyin: string;
    wuxing: string;
    meaning: string;
    stroke_count: number;
  }>(
    `SELECT character, pinyin, wuxing, meaning, stroke_count
     FROM kangxi_dict
     WHERE character IN (${placeholders})`,
    chars
  );
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
  const charMap = new Map(charInfo.map((c) => [c.character, { ...c, strokeCount: c.stroke_count }]));

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
            book: entry.book_name,
            text: entry.ancient_text?.slice(0, 50) + "...",
            fullText: entry.modern_text,
          }
        : undefined,
    };
  });
}

/**
 * 创建订单记录（每次起名调用都会创建）
 * 使用原生 SQL 而非 Prisma ORM，避免 Prisma 7 adapter 在 Serverless 环境的类型问题
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
  const isPaid = false; // 目前全部免费

  try {
    // 用原生 SQL 插入 name_record，绕过 Prisma adapter
    const resultsJson = JSON.stringify(params.results);
    const nameRecordRows = await queryRaw<{ id: string }>(
      `INSERT INTO name_record
        (user_id, surname, gender, birth_date, birth_time, expectations, style,
         results, status, is_paid, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [
        params.userId ?? null,
        params.surname,
        params.gender, // "M" / "F"
        new Date(params.birthDate),
        params.birthTime ?? null,
        params.expectations ?? null,
        params.style ?? null,
        resultsJson,
        "completed",
        isPaid,
        now,
        now,
      ]
    );

    if (!nameRecordRows[0]) {
      console.error("[Create Order] name_record insert failed, no RETURNING id");
      return null;
    }
    const nameRecordId = nameRecordRows[0].id;

    // 用原生 SQL 插入 order
    const orderRows = await queryRaw<{
      id: string; orderno: string; type: string;
      amount: string; pay_status: string; status: string; created_at: Date;
    }>(
      `INSERT INTO "order"
        (order_no, user_id, type, amount, pay_status, status, name_record_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, order_no as orderno, type, amount, pay_status, status, created_at`,
      [
        orderNo,
        params.userId ?? null,
        params.category,
        isPaid ? 9.9 : 0,
        isPaid ? "paid" : "free",
        "completed",
        nameRecordId,
        now,
        now,
      ]
    );

    if (!orderRows[0]) {
      console.error("[Create Order] order insert failed, no RETURNING id");
      return null;
    }

    const order = orderRows[0];
    return {
      id: order.id,
      orderNo: order.orderno,
      type: order.type,
      amount: Number(order.amount),
      payStatus: order.pay_status,
      status: order.status,
      createdAt: order.created_at.toISOString(),
      nameRecordId,
    };
  } catch (e: any) {
    console.error("[Create Order Error]", e?.message || e, "detail:", e?.detail || "");
    return null;
  }
}

export async function POST(request: NextRequest) {
  // 整体超时保护：55秒后强制返回（Vercel Hobby 最大 10s，企业版 60s）
  const TIMEOUT_MS = 55000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

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
          // 用原生 SQL 替代 Prisma ORM（避免 Serverless 连接池问题）
          const users = await queryRaw<{ id: string; name: string | null }>(
            `SELECT id, name FROM "user" WHERE id = $1 LIMIT 1`,
            [payload.userId]
          );
          if (users[0]) currentUser = users[0];
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
        const charMap = new Map(charInfo.map((c) => [c.character, { ...c, strokeCount: c.stroke_count }]));

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

        // 调用 AI Composer（含一次超时重试）
        // 策略：OpenRouter 国际路由慢，首次 45s 超时 → 重试一次 → 再超时则走传统生成
        console.log(`[API] aiCompose 开始，候选池=${pool.length}个字`);
        let candidates: any[] = [];
        let composeError: Error | null = null;

        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            console.log(`[API] AI Composer 第 ${attempt} 次尝试...`);
            // OpenRouter 国际路由慢，首、次均给足时间
            const timeout = attempt === 1 ? 45000 : 40000;
            candidates = await Promise.race([
              aiCompose(pool, intent, {
                scenario,
                fallbackToRules: true,
                maxCandidates: 6, // 6个：前3名付费解锁，后3名免费显示
                wordCount: 2,
              }, surname),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error(`AI Composer 超时(${attempt})`)), timeout)
              ),
            ]);
            console.log(`[API] AI Composer 第 ${attempt} 次成功，返回 ${candidates.length} 个`);
            break; // 成功，跳出重试循环
          } catch (err) {
            composeError = err as Error;
            console.warn(`[API] AI Composer 第 ${attempt} 次失败: ${composeError.message}`);
            if (attempt === 1) {
              // 首次超时，等函数 warm 后重试（Vercel 冷启动通常 3-5s）
              await new Promise((r) => setTimeout(r, 500));
            }
          }
        }

        // 两次都失败，降级到传统生成
        if (candidates.length === 0) {
          console.warn(`[API] AI Composer 两次都失败，降级到传统生成: ${composeError}`);
          rawNames = await generateNames(surname, gender, wuxingResult.likes, expectations);
          if (rawNames.length > 0) {
            rawNames = await attachSources(rawNames, expectations);
          }
        } else {
          // AI Composer 成功 → 映射结果
          rawNames = candidates.map((c: any) => ({
            name: c.fullName,
            givenName: c.givenName,
            pinyin: c.pinyin,
            wuxing: c.wuxing,
            meaning: c.meaning,
            strokeCount: c.strokeCount,
            source: c.sources?.[0]
              ? { book: c.sources[0].book, text: c.sources[0].text }
              : undefined,
            score: c.score,
          }));
          console.log(`[API] AI Composer 生成 ${rawNames.length} 个名字`);
        }
      } catch (err) {
        console.error("[API] AI Composer 意外失败，降级到传统生成:", err);
        rawNames = await generateNames(surname, gender, wuxingResult.likes, expectations);
      }
    } else {
      // ── 使用传统规则生成 ──
      rawNames = await generateNames(surname, gender, wuxingResult.likes, expectations);
    }

    // ── 附加典籍出处（传统模式下补全，AI 模式已有）──
    const namesWithSource = await attachSources(rawNames, expectations);
    console.log(`[API] attachSources 完成，namesWithSource=${namesWithSource.length}个`);

    // ── 如果名字为空，直接报错（方便调试）──
    if (namesWithSource.length === 0) {
      // 先检查数据库是否有康熙字典数据
      const charCountRows = await queryRaw<{ cnt: string }>(`SELECT COUNT(*) as cnt FROM kangxi_dict`);
      const entryCountRows = await queryRaw<{ cnt: string }>(`SELECT COUNT(*) as cnt FROM classics_entries`);
      const charCount = parseInt(charCountRows[0]?.cnt || "0");
      const entryCount = parseInt(entryCountRows[0]?.cnt || "0");
      console.error(`[API] 名字列表为空！康熙字典=${charCount}条，典籍=${entryCount}条`);
      return NextResponse.json(
        { success: false, error: `名字生成失败（康熙字典${charCount}条，典籍${entryCount}条）。请检查数据库是否有初始数据。` },
        { status: 500 }
      );
    }

    // ── 创建订单记录（每次必建）──
    console.log(`[API] 开始创建订单，namesWithSource=${namesWithSource.length}个`);
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
    console.log(`[API] createOrder 完成，orderId=${order?.id || 'null'}`);

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

    console.log(`[API] 返回成功，names=${namesWithSource.length}，order=${order?.id || 'null'}`);
    
    // 调试：检查返回数据
    console.log(`[API] namesWithSource[0]:`, JSON.stringify(namesWithSource[0]));
    console.log(`[API] namesWithSource[0] 是 null?`, namesWithSource[0] === null);
    console.log(`[API] namesWithSource[0] 是 undefined?`, namesWithSource[0] === undefined);
    
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
  } catch (error: any) {
    const msg = error instanceof Error ? error.message : String(error);
    const isAbort = error?.name === 'AbortError' || msg.includes('aborted');

    // 超时：返回已有结果或部分结果
    if (isAbort) {
      console.warn("[API] 请求超时（55s），强制返回");
      return NextResponse.json(
        { success: false, error: "起名服务响应超时，请稍后重试", detail: "TIMEOUT" },
        { status: 504 }
      );
    }

    console.error("起名 API 错误:", msg, error);

    // 区分错误类型，给出更明确的提示
    let userMsg = "服务器内部错误";
    if (msg.includes("DeepSeek") || msg.includes("API")) {
      userMsg = "AI 服务调用失败，请稍后重试";
    } else if (msg.includes("prisma") || msg.includes("connect") || msg.includes("connection")) {
      userMsg = "数据库连接失败，请检查环境变量配置";
    }

    return NextResponse.json(
      { success: false, error: userMsg, detail: msg },
      { status: 500 }
    );
  } finally {
    clearTimeout(timeoutId);
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
