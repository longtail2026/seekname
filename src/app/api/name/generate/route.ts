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
import { parseIntent } from "@/lib/intent-parser";
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




// 五行相生关系：每个五行的相生五行
const WUXING_SHENG: Record<string, string[]> = {
  "金": ["水", "土"],   // 金生水，土生金
  "木": ["火", "水"],   // 木生火，水生木
  "水": ["木", "金"],   // 水生木，金生水
  "火": ["土", "木"],   // 火生土，木生火
  "土": ["金", "火"],   // 土生金，火生土
};

// 从带声调符号的拼音提取声调（支持 Unicode 声调字符）
function extractToneFromPinyin(pinyin: string): number {
  if (!pinyin) return 0;
  const first = pinyin.split("、")[0].trim();
  for (const ch of first) {
    if ("āēīōūǖĀĒĪŌŪǕ".includes(ch)) return 1;
    if ("áéíóúǘÁÉÍÓÚǗ".includes(ch)) return 2;
    if ("ǎěǐǒǔǚǍĚǏǑǓǙ".includes(ch)) return 3;
    if ("àèìòùǜÀÈÌÒÙǛ".includes(ch)) return 4;
  }
  // 兼容旧版数字声调格式
  const m = first.match(/(\d)$/);
  return m ? parseInt(m[1]) : 0;
}

async function generateNames(
  surname: string,
  gender: string,
  wuxingLikes: string[],
  expectations?: string
) {
  // ── 策略：用喜用五行字做"主字"，用相生五行字做"配字"，确保跨五行配对 ──
  // 喜用五行（每种最多20字）
  const mainWx = wuxingLikes.length > 0 ? wuxingLikes : ["水", "木"];
  // 相生五行（补充配对字池）
  const compWxSet = new Set<string>();
  for (const wx of mainWx) {
    for (const s of (WUXING_SHENG[wx] || [])) compWxSet.add(s);
  }
  // 排除和喜用五行重叠的
  for (const wx of mainWx) compWxSet.delete(wx);
  const compWx = Array.from(compWxSet).slice(0, 2); // 最多取2种配字五行

  type CharInfo = { char: string; pinyin: string; wuxing: string; meaning: string; strokeCount: number };

  // 查询 kangxi_dict 获取拼音和笔画（原生SQL，替代Prisma ORM）
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

  // 性别友好的字池（从619字五行库中精选）
const GENDER_CHARS: Record<string, Record<string, string[]>> = {
  F: { // 女性优先
    金: ["琳","瑶","珂","珊","琦","瑾","璐","珂","珞","珠","瑞","琴","瑛","瑟","珑","珈","珂","玥","锦","钰"],
    木: ["桐","楠","梅","桦","榆","桂","樱","槿","榕","兰","芳","芷","芸","芬","芯","花","苒","莲","莎","苹"],
    水: ["涵","泽","洋","沛","润","澜","沁","汐","洁","沁","漾","澜","淳","清","漫","潇","潞","潼","潞","汝"],
    火: ["炅","煦","焕","晴","晓","晗","昱","婷","烨","煜","煊","炜","熙","彤","丹","荧","甜","映","黛","昕"],
    土: ["培","基","均","堂","安","婉","娴","媛","婕","怡","娅","嫣","娴","婷","岚","岫","岱","岭","岳","均"],
  },
  M: { // 男性优先
    金: ["铭","钧","铮","锐","锋","瑞","铎","锡","铠","镕","钟","鉴","镇","锦","钰","鑫","鏹","鐘","鐸","鏞"],
    木: ["林","森","梓","柏","松","槐","楷","栋","梁","桐","楠","榆","森","桓","榛","榕","楠","楷","棱","楚"],
    水: ["泽","浩","清","源","涛","润","澜","瀚","波","泉","滔","潮","澎","澈","潺","濡","滨","润","渊","湛"],
    火: ["炎","煜","炜","烨","熠","灿","燃","烽","炫","耀","辉","炽","炀","焕","煌","熠","灼","炜","熠","熠"],
    土: ["坤","培","基","城","垣","坚","墨","域","垚","堂","培","域","堪","坚","增","圣","型","垣","址","垂"],
  },
};

async function fetchChars(wxList: string[], limitEach: number, gender: string): Promise<CharInfo[]> {
  const chars: CharInfo[] = [];
  const genderMap = GENDER_CHARS[gender] || GENDER_CHARS.F;

  for (const wx of wxList) {
    // 优先用性别友好的字池
    const preferredChars = genderMap[wx] || [];
    const charList = preferredChars.slice(0, limitEach);
    
    if (charList.length === 0) {
      // 字池没有，查询 name_wuxing + kangxi_dict
      const wxRows = await queryRaw<{ name_char: string; wuxing: string }>(
        `SELECT name_char, wuxing FROM name_wuxing WHERE wuxing = $1 LIMIT $2`,
        [wx, limitEach]
      );
      const dbCharList = wxRows.map(r => r.name_char);
      
      if (dbCharList.length === 0) continue;
      
      const dictMap = new Map<string, { pinyin: string; meaning: string; stroke_count: number }>();
      const placeholders = dbCharList.map((_, i) => `$${i + 1}`).join(", ");
      const dictRows = await queryRaw<{ character: string; pinyin: string; meaning: string; stroke_count: number }>(
        `SELECT character, pinyin, meaning, stroke_count FROM kangxi_dict WHERE character IN (${placeholders})`,
        dbCharList
      );
      for (const r of dictRows) dictMap.set(r.character, { pinyin: r.pinyin, meaning: r.meaning, stroke_count: r.stroke_count });
      
      for (const r of wxRows) {
        const d = dictMap.get(r.name_char);
        chars.push({
          char: r.name_char,
          pinyin: d?.pinyin || "",
          wuxing: r.wuxing,
          meaning: d?.meaning || "",
          strokeCount: d?.stroke_count || 0
        });
      }
    } else {
      // 用性别友好字池，查 kangxi_dict 补全字段
      const dictMap = new Map<string, { pinyin: string; meaning: string; stroke_count: number }>();
      const placeholders = charList.map((_, i) => `$${i + 1}`).join(", ");
      const dictRows = await queryRaw<{ character: string; pinyin: string; meaning: string; stroke_count: number }>(
        `SELECT character, pinyin, meaning, stroke_count FROM kangxi_dict WHERE character IN (${placeholders})`,
        charList
      );
      for (const r of dictRows) dictMap.set(r.character, { pinyin: r.pinyin, meaning: r.meaning, stroke_count: r.stroke_count });
      
      for (const c of charList) {
        const d = dictMap.get(c);
        if (d) {
          chars.push({
            char: c,
            pinyin: d.pinyin,
            wuxing: wx,
            meaning: d.meaning,
            strokeCount: d.stroke_count
          });
        }
      }
    }
  }
  return chars;
}

  const mainChars = await fetchChars(mainWx, 40, gender);
  const compChars = await fetchChars(compWx, 30, gender);

  // 去重
  const allCharMap = new Map<string, CharInfo>();
  for (const c of [...mainChars, ...compChars]) allCharMap.set(c.char, c);
  const mainSet = new Set(mainChars.map(c => c.char));

  console.log(`[generateNames] 主字(${mainWx.join(",")})=${mainChars.length}个，配字(${compWx.join(",")})=${compChars.length}个`);

  if (mainChars.length === 0) {
    console.warn("[generateNames] 主字池为空，无法配对");
    return [];
  }

  // 全排列配对：主字 × 所有字（主字+配字），确保至少一个字是喜用五行
  const result: any[] = [];
  const seen = new Set<string>();
  const allChars = Array.from(allCharMap.values());

  for (const c1 of mainChars) {
    for (const c2 of allChars) {
      if (c1.char === c2.char) continue;
      // 至少一个字是主五行
      if (!mainSet.has(c1.char) && !mainSet.has(c2.char)) continue;

      // 拼音分隔符用顿号
      const p1 = c1.pinyin?.split("、")[0].trim() || "";
      const p2 = c2.pinyin?.split("、")[0].trim() || "";

      // 音律过滤：声调不能相同
      const tone1 = extractToneFromPinyin(p1);
      const tone2 = extractToneFromPinyin(p2);
      if (tone1 > 0 && tone2 > 0 && tone1 === tone2) continue;

      // 五行过滤：两字五行不能完全相同
      if (c1.wuxing && c2.wuxing && c1.wuxing === c2.wuxing) continue;

      const key = [c1.char, c2.char].sort().join("");
      if (seen.has(key)) continue;
      seen.add(key);

      result.push({
        name: surname + c1.char + c2.char,
        givenName: c1.char + c2.char,
        pinyin: [p1, p2].join("、"),
        wuxing: c1.wuxing + c2.wuxing,
        meaning: `${c1.meaning}；${c2.meaning}`,
        strokeCount: c1.strokeCount + c2.strokeCount,
      });
    }
  }

  console.log(`[generateNames] 全排列配对完成 → ${result.length}个候选`);
  return result;
}

// 为名字匹配典籍出处
// 用扩展关键词查询典籍库，按索引轮换分配出处
// 注意：不再跳过已有 source 的名字，而是强制用扩展关键词重新分配
async function attachSources(names: any[], expandedKeywords: string[] = []) {
  if (!names.length) return names;

  const keywords = expandedKeywords.length ? expandedKeywords : ["德", "才", "智", "仁", "义"];

  // 用扩展后的关键词列表逐个查询典籍并去重
  const seen = new Set<string>();
  const entries: Array<{ id: string; book_name: string; ancient_text: string; modern_text: string }> = [];
  for (const kw of keywords.slice(0, 15)) {
    const matched = await queryClassics([kw], 3);
    for (const e of matched) {
      if (!seen.has(e.id)) {
        seen.add(e.id);
        entries.push(e);
      }
    }
  }

  if (!entries.length) {
    console.log(`[API] attachSources: 典籍库无匹配记录（关键词=${keywords.slice(0, 5).join(",")}），返回无典籍`);
    // 清空不可靠典籍
    return names.map((n) => ({ ...n, source: undefined }));
  }

  console.log(`[API] attachSources: 关键词=${keywords.slice(0, 3).join(",")}... → 查询到${entries.length}条典籍，分配给${names.length}个名字`);

  return names.map((name, index) => {
    // 强制用扩展关键词重新分配典籍（不再保留旧典籍，确保每次都用扩展关键词）
    const entry = entries[index % entries.length];
    return {
      ...name,
      source: {
        book: entry.book_name,
        text: entry.ancient_text?.slice(0, 50) + "...",
        fullText: entry.modern_text,
      },
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

    // ── 解析用户意图（分词+同义词扩展），所有分支都需要 ──
    const { keywords: _, expanded } = parseIntent(expectations);

    let rawNames: any[] = [];

    if (useAiComposer) {
      // ── 使用 AI 创意组合层 ──
      try {
        console.log(`[API] 使用 AI Composer，场景=${scenario}`);

        console.log(`[API] 意图解析：原始=${expectations || "无"} → 扩展=${expanded.slice(0, 15).join(",")}...`);

        // ── 构建候选字池（从数据库的619字五行库中取，性别区分）──
        const isFemale = gender === "F";
        const poolChars: Array<{ char: string; wx: string }> = [];
        
        // 喜用五行各取 20 字
        for (const wx of wuxingResult.likes) {
          const wxChars = await queryRaw<{ name_char: string; wuxing: string }>(
            `SELECT name_char, wuxing FROM name_wuxing WHERE wuxing = $1 LIMIT 30`,
            [wx]
          );
          for (const r of wxChars) {
            poolChars.push({ char: r.name_char, wx: r.wuxing });
          }
        }
        
        // 补充其他四行的字（各 10 字，增加多样性）
        const allWuxing = ["金","木","水","火","土"];
        for (const wx of allWuxing) {
          if (!wuxingResult.likes.includes(wx)) {
            const wxChars = await queryRaw<{ name_char: string; wuxing: string }>(
              `SELECT name_char, wuxing FROM name_wuxing WHERE wuxing = $1 LIMIT 15`,
              [wx]
            );
            for (const r of wxChars) {
              poolChars.push({ char: r.name_char, wx: r.wuxing });
            }
          }
        }

        const uniqueChars = Array.from(new Set(poolChars.map((p) => p.char)));
        const charInfo = await queryKangxiChars(uniqueChars.slice(0, 100));
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

        // ── 补充完整五行字池（金/木/水/火/土各20字，共100字，性别区分）──
        const FULL_POOL_CHARS: Array<{ char: string; wx: string }> = [
          ...(isFemale
            ? ["琳","瑶","珂","珊","琦","瑾","璐","珠","瑞","琴","瑛","瑟","珑","珈","玥","锦","钰","环","璧","琅"].map(c=>({char:c,wx:"金"}))
            : ["铭","鑫","钧","铮","锐","锋","瑞","铎","锡","铠","镕","钟","鉴","鎮","鏹","鐘","鐸","鏞","鎮","鏍"].map(c=>({char:c,wx:"金"}))
          ),
          ...(isFemale
            ? ["桐","楠","梅","桦","榆","桂","樱","槿","榕","兰","芳","芷","芸","芬","芯","花","苒","莲","莎","苹"].map(c=>({char:c,wx:"木"}))
            : ["林","森","梓","柏","松","槐","楷","栋","梁","桐","楠","榆"].map(c=>({char:c,wx:"木"}))
          ),
          ...(isFemale
            ? ["涵","泽","洋","沛","润","澜","淳","沁","瀚","波","泉","汐"].map(c=>({char:c,wx:"水"}))
            : ["泽","浩","清","源","涛","润","澜","瀚","波","泉","滔","潮"].map(c=>({char:c,wx:"水"}))
          ),
          ...(isFemale
            ? ["炅","煦","焕","灵","晴","晓","晗","昱","晃","曼","晶","熹"].map(c=>({char:c,wx:"火"}))
            : ["炎","煜","炜","烨","熠","灿","燃","烽","炫","耀","辉","炽"].map(c=>({char:c,wx:"火"}))
          ),
          ...["坤","培","基","城","均","堂","圣","坚","墨","域","垚","安"].map(c=>({char:c,wx:"土"})),
        ];
        const poolCharSet = new Set(pool.map((p: any) => p.character));
        const supplementalChars = FULL_POOL_CHARS.filter((p) => !poolCharSet.has(p.char)).slice(0, 60);
        const fullPool: typeof pool = [
          ...pool,
          ...supplementalChars.map((p) => ({
            character: p.char,
            pinyin: "",
            wuxing: p.wx,
            meaning: "",
            strokeCount: 8,
            frequency: 50,
          })),
        ];
        Object.assign(pool, fullPool);

        // ── 用扩展后的关键词查询典籍库，传给 AI Composer ──
        let classicalEntries: Array<{ id: string; book_name: string; ancient_text: string; modern_text: string }> = [];
        const seen = new Set<string>();
        for (const kw of expanded.slice(0, 15)) {
          const entries = await queryClassics([kw], 3);
          for (const e of entries) {
            if (!seen.has(e.id)) { seen.add(e.id); classicalEntries.push(e); }
          }
        }
        classicalEntries = classicalEntries.slice(0, 30);
        console.log(`[API] 典籍查询：去重后=${classicalEntries.length}条`);

        // ── 构建 StructuredIntent（imagery 用扩展后的关键词）──
        const intent = {
          surname,
          gender: gender as "M" | "F",
          birthDate,
          birthTime,
          style: style ? [style] : [],
          wordCount: 2 as const,
          wuxing: wuxingResult.likes,
          avoidances: [] as string[],
          imagery: expanded.slice(0, 12),
          sourcePreference: [],
          notes: expectations,
        };

        // 调用 AI Composer（含一次超时重试）
        console.log(`[API] aiCompose 开始，候选池=${pool.length}个字`);
        let candidates: any[] = [];
        let composeError: Error | null = null;
        let resultHolder: any[] | null = null;

        for (let attempt = 1; attempt <= 2; attempt++) {
          resultHolder = null;
          const timeout = attempt === 1 ? 45000 : 40000;
          console.log(`[API] AI Composer 第 ${attempt} 次尝试，超时=${timeout / 1000}s...`);

          const aiPromise = aiCompose(pool, intent, {
            scenario,
            fallbackToRules: true,
            maxCandidates: 6,
            wordCount: 2,
            classicalEntries: classicalEntries.map((e) => ({
              book: e.book_name,
              ancient_text: e.ancient_text,
              modern_text: e.modern_text,
            })),
          }, surname, classicalEntries.map((e) => ({
            book: e.book_name,
            ancient_text: e.ancient_text,
            modern_text: e.modern_text,
          }))).then((result) => {
            resultHolder = result;
            return result;
          });

          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`AI Composer 超时(${attempt})`)), timeout)
          );

          try {
            candidates = await Promise.race([aiPromise, timeoutPromise]);
            console.log(`[API] AI Composer 第 ${attempt} 次成功，返回 ${candidates.length} 个`);
            break;
          } catch (err) {
            composeError = err as Error;
            if (resultHolder !== null) {
              candidates = resultHolder;
              console.log(`[API] AI Composer 第 ${attempt} 次 timeout 但有 ${candidates.length} 个结果`);
              break;
            }
            console.warn(`[API] AI Composer 第 ${attempt} 次失败: ${composeError.message}`);
            if (attempt === 1) {
              await new Promise((r) => setTimeout(r, 500));
            }
          }
        }

        // 两次都失败且无结果，降级到传统生成（不在此处调attachSources，统一在最后处理）
        if (candidates.length === 0) {
          console.warn("[API] AI Composer 两次都失败，降级到传统生成");
          rawNames = await generateNames(surname, gender, wuxingResult.likes, expectations);
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
    const namesWithSource = await attachSources(rawNames, expanded);
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
            score: n.score, // 必须传递 score，否则前端随机生成分数导致乱序
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
