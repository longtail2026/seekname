/**
 * AI 起名 API - 语义匹配版本
 * POST /api/name/generate
 *
 * 基于语义匹配和DeepSeek AI生成名字
 * 每次调用自动创建订单记录
 *
 * 请求体：
 *   surname, gender, birthDate, birthTime?, expectations?, style?
 *   intentions?: string[]  // 勾选的意向词数组
 *   styles?: string[]      // 勾选的风格词数组
 *   category?: "personal" | "company" | "pet" | "evaluate"  (默认 personal)
 *
 * 响应：
 *   success, data: { orderId, orderNo, wuxing, names }
 */

import { NextRequest, NextResponse } from "next/server";
import { queryRaw } from "@/lib/prisma";
import { generateOrderNo, generateAnonymousName } from "@/lib/order";
import { verifyToken } from "@/lib/auth";
import { 
  SemanticNamingRequest, 
  semanticNamingFlow,
  GeneratedName,
  ClassicsMatch,
  SemanticNamingEngine 
} from "@/lib/semantic-naming-engine";
import {
  NamingStrategyType,
  getStrategyTag,
  STRATEGY_LABELS,
  STRATEGY_MATRIX,
  determineStrategy,
} from "@/lib/naming-strategy";
import {
  calculateBaZi,
  analyzeWuxingPreference,
  fullBaZiAnalysis,
  queryCharsWuxing,
  analyzeNameWuxing,
  type WuxingPreference,
  type BaZiResult,
} from "@/lib/bazi-service";

// 业务类别映射
const CATEGORY_MAP: Record<string, string> = {
  personal: "个人起名",
  company: "公司起名",
  pet: "宠物起名",
  evaluate: "名字测评",
};

// 使用真正的八字排盘+五行喜忌分析，替换原来的季节简化版
function calculateWuxing(birthDate: string, birthTime?: string) {
  try {
    const { bazi, preference } = fullBaZiAnalysis(birthDate, birthTime);
    return {
      bazi: bazi.fullBaZi,
      dayMaster: bazi.dayMaster,
      dayMasterWuxing: bazi.dayMasterWuxing,
      wuxingSummary: bazi.wuxingSummary,
      likes: preference.favorableElements,
      avoids: preference.unfavorableElements,
      missing: preference.missingElements,
      isExcessive: preference.isExcessive,
      isWeak: preference.isWeak,
      description: preference.description,
    };
  } catch (e) {
    console.warn("[BaZi] 八字排盘失败，使用季节简化版:", e);
    // 降级：季节简化版
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
    const fallback = seasonMap[month] || { likes: ["土"], avoids: [] };
    return {
      bazi: "",
      dayMaster: "",
      dayMasterWuxing: "",
      wuxingSummary: `季节:${month}月`,
      likes: fallback.likes,
      avoids: fallback.avoids,
      missing: [],
      isExcessive: false,
      isWeak: false,
      description: "基于季节的简化分析（八字排盘降级）",
    };
  }
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
      // 新增：意向和风格勾选参数
      intentions = [],  // 勾选的意向词数组，如 ["善良", "智慧", "成功"]
      styles = [],     // 勾选的风格词数组，如 ["古典", "温婉"]
    } = body;

    // 日志输出参数
    console.log(`[API] 接收参数: surname=${surname}, gender=${gender}, expectations=${expectations}, intentions=${JSON.stringify(intentions)}, styles=${JSON.stringify(styles)}`);

    // 参数校验
    if (!surname || !gender || !birthDate) {
      return NextResponse.json(
        { success: false, error: "缺少必要参数：姓氏、性别、生日" },
        { status: 400 }
      );
    }

    // 验证性别格式
    const genderCode = gender.toUpperCase() === "F" ? "F" : "M";

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

    // ── 计算五行喜忌（保留用于返回结果）──
    const wuxingResult = calculateWuxing(birthDate, birthTime);

    // ── 构建语义匹配请求 ──
    // 组合 expectations 和 intentions 作为 rawInput
    const rawInputParts: string[] = [];
    if (expectations) rawInputParts.push(expectations);
    if (intentions.length > 0) rawInputParts.push(intentions.join("，"));
    
    const rawInput = rawInputParts.join("，") || "美好寓意";
    
    // 组合 style 和 styles 作为风格偏好
    const styleList: string[] = [];
    if (style) styleList.push(style);
    if (styles.length > 0) styleList.push(...styles);
    
    const semanticRequest: SemanticNamingRequest = {
      rawInput,
      surname,
      gender: genderCode,
      birthDate,
      birthTime,
      expectations: rawInput, // 使用组合后的文本
      style: styleList.length > 0 ? styleList : ["古风典雅"], // 默认风格
      wordCount: 2, // 默认2个字的名字
      // 将勾选的意向词逐项传给引擎，触发独立搜索模式
      intentions: intentions.length > 0 ? intentions : undefined,
      styles: styles.length > 0 ? styles : undefined,
    };

    console.log(`[API] 语义匹配请求: rawInput="${rawInput}", gender=${genderCode}, style=${JSON.stringify(semanticRequest.style)}`);

    // ── 调用语义匹配起名引擎 ──
    const result = await semanticNamingFlow(semanticRequest);

    if (!result.success) {
      console.error(`[API] 语义匹配起名失败: ${result.message}`);
      return NextResponse.json(
        { 
          success: false, 
          error: result.message || "语义匹配起名失败，请稍后重试",
          detail: "SEMANTIC_NAMING_FAILED"
        },
        { status: 500 }
      );
    }

    console.log(`[API] 语义匹配成功: 匹配典籍${result.matches.length}个，生成名字${result.generatedNames.length}个，过滤后保留${result.filteredNames.length}个`);

    // ── 后处理：分散用字 ──
    // 作为 AI prompt 之外的安全兜底。只用当名字足够多(>20)时才启用，
    // 且 maxRepeat=3 以避免过于严苛剔除所有名字，
    // 同音字 maxHomophoneRepeat=3 同样放宽。
    let diversifiedNames = result.filteredNames;
    if (result.filteredNames.length > 20) {
      const diversifyResult = SemanticNamingEngine.diversifyNames(result.filteredNames, 3, 3);
      if (diversifyResult.removed.length > 0) {
        console.log(`[API-分散后处理] 共移除${diversifyResult.removed.length}个名字，理由:`, diversifyResult.removed);
      }
      diversifiedNames = diversifyResult.diversified;
    }

    // ── 转换结果为API格式 ──
    // 先将 DeepSeek 返回的名字解析为 (givenName, rawSource) 对
    // 同时检测并修复虚构典籍
    interface ResolvedName {
      givenName: string;
      pinyin: string;
      meaning: string;
      reason: string;
      rawSource: string;
      modernText: string;
      score: number;
      scoreBreakdownV2?: Record<string, number>;
    }

    const resolvedNames: ResolvedName[] = diversifiedNames.map((name: GeneratedName) => {
      // 确保 givenName 不包含姓氏（parseMarkdownTable 已处理，但二次防御）
      let givenName = name.givenName;
      if (givenName.startsWith(surname)) {
        givenName = givenName.slice(surname.length);
      }
      
      // 检测 DeepSeek 是否编造了不存在的典籍出处
      // 常见虚构模式："XX取自《YY·ZZ》"XX之XX"" — 典籍中不存在"X之X"格式的原文
      const sourceStr = name.source || "";
      const isFabricated = /之[^，。]*之/.test(sourceStr) && 
        /[灵容慧德明]/.test(sourceStr) && 
        !sourceStr.includes('《');
      
      let cleanedSource = sourceStr;
      if (isFabricated && result.matches.length > 0) {
        // 从真实典籍匹配结果中取一个作为替代
        const match = result.matches[0];
        cleanedSource = `出自《${match.bookName}》"${match.ancientText}"`;
      }
      
      return {
        givenName,
        pinyin: name.pinyin,
        meaning: name.meaning,
        reason: name.reason,
        rawSource: cleanedSource,
        modernText: name.modernText || "",
        score: name.score ?? 80,
        scoreBreakdownV2: (name as any).scoreBreakdownV2,
      };
    });

    // 去重：相同 givenName 只保留第一个
    const seenGivenNames = new Set<string>();
    const uniqueResolvedNames = resolvedNames.filter(n => {
      if (seenGivenNames.has(n.givenName)) return false;
      seenGivenNames.add(n.givenName);
      return true;
    });

    // 过滤掉叠字名（后两字完全相同的，如"灵灵""容容"）
    const nonDuplicateGivenNames = uniqueResolvedNames.filter(n => {
      if (n.givenName.length === 2 && n.givenName[0] === n.givenName[1]) {
        return false; // 过滤叠字名
      }
      return true;
    });

    // ── 从 kangxi_dict 批量查询名字中各汉字的五行属性 ──
    // 收集所有需要查询的汉字
    const allNameChars = [...new Set(nonDuplicateGivenNames.flatMap(n => n.givenName.split("")))];
    const charWuxingData = await queryCharsWuxing(allNameChars);
    // 构建快速查找 Map：字符 → 五行
    const charWuxingMap = new Map<string, string>();
    charWuxingData.forEach(cd => {
      if (cd.wuxing) charWuxingMap.set(cd.character, cd.wuxing);
    });

    // 构建最终 API 格式的名字列表
    const apiNames = nonDuplicateGivenNames.map((resolved: ResolvedName, index: number) => {
      const givenName = resolved.givenName;
      
      // 从数据库查询名字中各字的五行（有缺失时用默认）
      let wuxing = "";
      // 逐字五行分析：每个字符的五行 + 匹配喜忌状态
      const charWuxingDetails: Array<{ char: string; wuxing: string; matchStatus: "喜用" | "忌用" | "中性" | "未知" }> = [];
      if (givenName.length >= 1) {
        const chars = givenName.split('');
        chars.forEach(char => {
          const wx = charWuxingMap.get(char) || "";
          let matchStatus: "喜用" | "忌用" | "中性" | "未知" = "中性";
          if (wx && wuxingResult.likes?.includes(wx)) {
            matchStatus = "喜用";
          } else if (wx && wuxingResult.avoids?.includes(wx)) {
            matchStatus = "忌用";
          } else if (wx) {
            matchStatus = "中性";
          } else {
            matchStatus = "未知";
          }
          charWuxingDetails.push({ char, wuxing: wx, matchStatus });
        });
        const wuxingList = chars.map(char => charWuxingMap.get(char) || "").filter(w => w);
        wuxing = wuxingList.length > 0 ? wuxingList.join("") : "木火";
      } else {
        wuxing = "木火";
      }

      const strokeCount = givenName.length * 8;

      // ── 意气匹配后处理：典籍出处降级展示 ──
      // 优先级：
      //   1. 先用 findBestClassicsMatch 从数据库真实 matches 中找到意气匹配的典籍
      //   2. 如果数据库无合适匹配，才尝试使用 DeepSeek 生成的出处（已做意气校验）
      //   3. 如果都不匹配，典籍出处留空（宁可没有，也不要错误）
      let source = { book: "", text: "", modernText: "", reason: "" };

      // 第一步：用意气匹配算法从数据库真实 matches 找到最佳典籍
      const spiritMatch = SemanticNamingEngine.findBestClassicsMatch(
        resolved.meaning,
        resolved.reason,
        result.matches,
        expectations
      );

      if (spiritMatch) {
        // ✅ 数据库有意气匹配的典籍 → 优先使用
        source = {
          book: `《${spiritMatch.bookName}》`,
          text: spiritMatch.ancientText || "",
          modernText: spiritMatch.modernText || "",
          reason: resolved.reason || "",
        };
      } else if (resolved.rawSource && resolved.rawSource.length > 0) {
        // ⚠️ 数据库无合适匹配，降级尝试使用 DeepSeek 生成的出处
        // 但要用意气匹配校验，避免意气背离
        const sourceStr = resolved.rawSource;
        const bookMatch = sourceStr.match(/《([^》]+)》/);
        const rawBookName = bookMatch ? bookMatch[1] : "";
        const displayBook = rawBookName ? `《${rawBookName}》` : "";
        const afterBook = sourceStr.replace(/.*?》/, "").replace(/^[：:""""]?/, "").replace(/[""""]$/g, "").trim();
        
        // 将 AI 生成的出处也做意气匹配校验
        const aiModernText = resolved.modernText || "";
        const aiClassicsForCheck = {
          bookName: rawBookName || "未知典籍",
          ancientText: afterBook || "",
          modernText: aiModernText,
        };
        const aiSpiritScore = (() => {
          // 简单计算 AI 出处的意气得分（只校验不兼容词）
          const meaningText = resolved.meaning || "";
          const checkText = `${aiModernText} ${afterBook}`.toLowerCase();
          const incompatibleTerms = ["谦恭", "谨慎", "温顺", "谦卑", "恭敬", "小心", "阴郁", "忧伤"];
          if (meaningText.includes("豪迈") || meaningText.includes("大气") || meaningText.includes("强大")) {
            if (incompatibleTerms.some(t => checkText.includes(t))) {
              return -5; // 意气背离
            }
          }
          return 1; // 无明显冲突
        })();

        if (aiSpiritScore > 0 && rawBookName) {
          // 勉强可用，但标记为低可信度
          source = {
            book: displayBook,
            text: afterBook || resolved.reason || "",
            modernText: aiModernText || "",
            reason: resolved.reason || "",
          };
        }
        // else: AI 出处也意气背离 → 留空（不展示）
      }
      // else: 数据库和 AI 都无合适匹配 → 保持空 source（不展示典籍出处）

      // 拼接姓氏（保证不重复）
      const fullName = surname + givenName;

      // 构建五行喜忌理由文本
      const wuxingMatchCount = charWuxingDetails.filter(d => d.matchStatus === "喜用").length;
      const wuxingAvoidCount = charWuxingDetails.filter(d => d.matchStatus === "忌用").length;
      const wuxingReasonParts: string[] = [];
      charWuxingDetails.forEach(d => {
        if (d.wuxing) {
          wuxingReasonParts.push(`"${d.char}"属${d.wuxing}，为${d.matchStatus}字`);
        } else {
          wuxingReasonParts.push(`"${d.char}"五行未知`);
        }
      });
      let wuxingConclusion = "";
      if (wuxingMatchCount > wuxingAvoidCount) {
        wuxingConclusion = `名字整体匹配喜用五行（${wuxingResult.likes?.join("、") || "未定"}），有助于补益八字`;
      } else if (wuxingAvoidCount > 0) {
        wuxingConclusion = `建议优先选择喜用五行（${wuxingResult.likes?.join("、") || "未定"}）的字`;
      } else {
        wuxingConclusion = `名字五行与八字喜忌协调，属中性选择`;
      }
      const wuxingPrefReason = wuxingReasonParts.join("；") + (wuxingReasonParts.length > 0 ? `。${wuxingConclusion}` : "");

      return {
        name: fullName,
        givenName: givenName,
        pinyin: resolved.pinyin,
        wuxing,
        charWuxingDetails,
        wuxingPrefReason,
        meaning: resolved.meaning,
        reason: resolved.reason,
        strokeCount,
        score: resolved.score ?? (90 - index * 2),
        scoreBreakdownV2: resolved.scoreBreakdownV2,
        source,
      };
    });

    // 如果过滤后名字不足，使用生成的名字（未过滤）
    let finalNames = apiNames;
    if (apiNames.length < 5 && result.generatedNames.length > 0) {
      console.log(`[API] 过滤后名字不足(${apiNames.length})，使用部分未过滤名字`);
      
      // 获取已有 givenName 集合，防止重复
      const existingGivenNames = new Set(apiNames.map(n => n.givenName));
      
      // 在 result.generatedNames 内部也按 givenName 去重（只保留第一次出现的）
      const seenInGenerated = new Set<string>();
      const dedupedGenerated = result.generatedNames.filter((name: GeneratedName) => {
        if (seenInGenerated.has(name.givenName)) return false;
        seenInGenerated.add(name.givenName);
        return true;
      });
      
      const additionalNames = dedupedGenerated
        // 跳过已经存在的 givenName
        .filter((name: GeneratedName) => !existingGivenNames.has(name.givenName))
        .slice(0, 10 - apiNames.length)
        .map((name: GeneratedName, index: number) => {
        const givenName = name.givenName;
        let wuxing = "木火";
        const strokeCount = givenName.length * 8;
        const fullName = surname + givenName;
        
        let source = { book: "《诗经》", text: "美好寓意", modernText: "", reason: "" };
        if (result.matches.length > 0) {
          const matchIndex = (apiNames.length + index) % result.matches.length;
          const match = result.matches[matchIndex];
          source = {
            book: `《${match.bookName}》`,
            text: match.ancientText || "",
            modernText: match.modernText || "",
            reason: name.reason || match.meaning || "",
          };
        } else if (name.source && name.source.length > 0) {
          source = {
            book: "",
            text: name.source,
            modernText: "",
            reason: name.reason || "",
          };
        }

        // 使用真实打分（result.filteredNames中有评分），而不是默认80分
        const realScore = name.score ?? 80;

        // 逐字五行分析
        const additionalChars = givenName.split('');
        const additionalCharWuxingDetails: Array<{ char: string; wuxing: string; matchStatus: "喜用" | "忌用" | "中性" | "未知" }> = [];
        additionalChars.forEach(char => {
          const wx = charWuxingMap.get(char) || "";
          let matchStatus: "喜用" | "忌用" | "中性" | "未知" = "中性";
          if (wx && wuxingResult.likes?.includes(wx)) {
            matchStatus = "喜用";
          } else if (wx && wuxingResult.avoids?.includes(wx)) {
            matchStatus = "忌用";
          } else if (wx) {
            matchStatus = "中性";
          } else {
            matchStatus = "未知";
          }
          additionalCharWuxingDetails.push({ char, wuxing: wx, matchStatus });
        });
        const additionalWuxingParts: string[] = [];
        additionalCharWuxingDetails.forEach(d => {
          if (d.wuxing) {
            additionalWuxingParts.push(`"${d.char}"属${d.wuxing}，为${d.matchStatus}字`);
          }
        });
        const additionalWuxingConclusion = `名字五行（${wuxing}）与八字喜忌匹配`;
        const additionalWuxingPrefReason = additionalWuxingParts.join("；") + (additionalWuxingParts.length > 0 ? `。${additionalWuxingConclusion}` : "");

        return {
          name: fullName,
          givenName: name.givenName,
          pinyin: name.pinyin,
          wuxing,
          charWuxingDetails: additionalCharWuxingDetails,
          wuxingPrefReason: additionalWuxingPrefReason,
          meaning: name.meaning,
          reason: name.reason || "",
          strokeCount,
          score: realScore,
          scoreBreakdownV2: (name as any).scoreBreakdownV2,
          source,
        };
      });
      
      finalNames = [...apiNames, ...additionalNames];
    }

    // ✅ 按分数从高到低排序
    finalNames.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    // 限制最多10个名字
    finalNames = finalNames.slice(0, 10);

    // ── 创建订单记录（每次必建）──
    console.log(`[API] 开始创建订单，finalNames=${finalNames.length}个`);
    const order = await createOrder({
      userId: currentUser?.id ?? null,
      userName: currentUser?.name || anonymousName,
      category: CATEGORY_MAP[category] || category,
      surname,
      gender: genderCode,
      birthDate,
      birthTime,
      expectations,
      style,
      results: finalNames,
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
            gender: genderCode === "M" ? "男" : "女",
            birthDate,
            birthTime,
            expectations,
            style,
          },
          candidates: finalNames.map((n) => ({
            name: n.name,
            pinyin: n.pinyin,
            wuxing: n.wuxing,
            meaning: n.meaning,
            reason: n.reason,
            source: n.source,
            score: n.score,
            charWuxingDetails: n.charWuxingDetails,
            wuxingPrefReason: n.wuxingPrefReason,
          })),
        }
      : null;

    console.log(`[API] 返回成功，names=${finalNames.length}，order=${order?.id || 'null'}`);
    
    // ── 构建策略信息（供前端展示）──
    const strategyTag = getStrategyTag(result.strategyType);
    const strategyInfo = {
      type: result.strategyType,
      label: STRATEGY_LABELS[result.strategyType],
      tag: strategyTag.label,
      color: strategyTag.color,
      description: strategyTag.description,
      displayMode: STRATEGY_MATRIX[result.strategyType]?.displayMode || "both",
    };

    return NextResponse.json({
      success: true,
      data: {
        orderId: order?.id,
        orderNo: order?.orderNo,
        orderDetail,
        wuxing: wuxingResult,
        names: finalNames,
        semanticMatches: result.matches.length,
        strategy: strategyInfo,
        message: result.message,
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
    } else if (msg.includes("semantic") || msg.includes("语义")) {
      userMsg = "语义匹配服务异常，请稍后重试";
    }

    return NextResponse.json(
      { success: false, error: userMsg, detail: msg },
      { status: 500 }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

// 测试接口
export async function GET() {
  return NextResponse.json({
    message: "AI 起名 API - 语义匹配版本",
    usage:
      "POST /api/name/generate with body: { surname, gender, birthDate, birthTime?, expectations?, style?, intentions?, styles?, category? }",
    note: "基于语义匹配和DeepSeek AI生成名字，自动过滤忌讳字、生僻字等",
  });
}