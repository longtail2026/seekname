/**
 * AI 起名 API
 * POST /api/name/generate
 * 
 * 请求体：
 * {
 *   surname: string       // 姓氏
 *   gender: "M" | "F"     // 性别
 *   birthDate: string     // 生日 YYYY-MM-DD
 *   birthTime?: string    // 时辰（可选）
 *   expectations?: string // 期望寓意
 *   style?: string        // 风格：elegant/modern/classic
 * }
 * 
 * 响应：
 * {
 *   success: true,
 *   data: {
 *     recordId: string,
 *     names: Array<{
 *       name: string,
 *       pinyin: string,
 *       wuxing: string,
 *       meaning: string,
 *       source?: { book: string, text: string }
 *     }>
 *   }
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 起名配置
const NAME_CONFIG = {
  // 每个姓氏生成的名字数量
  countPerSurname: 5,
  // 五行对应常用字（从康熙字典中筛选）
  wuxingChars: {
    "金": ["铭", "锦", "钧", "铮", "铄", "钰", "鑫", "锐", "锋", "铭"],
    "木": ["林", "森", "桐", "楠", "梓", "柏", "松", "桦", "柳", "梅"],
    "水": ["涵", "泽", "洋", "涛", "浩", "清", "源", "沐", "沛", "沅"],
    "火": ["炎", "煜", "煊", "炜", "烨", "熠", "灿", "炅", "炅", "煦"],
    "土": ["坤", "垚", "培", "基", "城", "垣", "堂", "墨", "均", "圣"],
  },
};

// 根据八字计算五行喜忌（简化版）
function calculateWuxing(birthDate: string, birthTime?: string) {
  // 这里应该是复杂的八字计算逻辑
  // 简化版：根据出生月份粗略判断
  const month = new Date(birthDate).getMonth() + 1;
  
  // 春季(2-4月)喜金，夏季(5-7月)喜水，秋季(8-10月)喜木，冬季(11-1月)喜火
  const seasonMap: Record<number, { likes: string[], avoids: string[] }> = {
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
    where: {
      character: { in: chars },
    },
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
  
  // 获取喜用五行的字
  const preferredChars: string[] = [];
  for (const wx of wuxingLikes) {
    const chars = NAME_CONFIG.wuxingChars[wx as keyof typeof NAME_CONFIG.wuxingChars];
    if (chars) {
      preferredChars.push(...chars);
    }
  }
  
  // 查询这些字的康熙字典信息
  const charInfo = await queryKangxiChars(preferredChars.slice(0, 20));
  const charMap = new Map(charInfo.map(c => [c.character, c]));
  
  // 根据性别和期望筛选合适的字
  const suitableChars = preferredChars.filter(char => {
    const info = charMap.get(char);
    if (!info) return false;
    // 这里可以添加更多筛选逻辑
    return true;
  });
  
  // 生成名字组合（双字名）
  const count = Math.min(NAME_CONFIG.countPerSurname, Math.floor(suitableChars.length / 2));
  
  for (let i = 0; i < count; i++) {
    const char1 = suitableChars[i * 2];
    const char2 = suitableChars[i * 2 + 1];
    
    if (!char1 || !char2) continue;
    
    const info1 = charMap.get(char1);
    const info2 = charMap.get(char2);
    
    const fullName = surname + char1 + char2;
    const pinyin = [info1?.pinyin?.split(",")[0] || "", info2?.pinyin?.split(",")[0] || ""].join(" ");
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
  
  // 简单匹配：给每个名字随机分配一个典籍出处
  return names.map((name, index) => {
    const entry = entries[index % entries.length];
    return {
      ...name,
      source: entry ? {
        book: entry.bookName,
        text: entry.ancientText?.slice(0, 50) + "...",
        fullText: entry.modernText,
      } : undefined,
    };
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { surname, gender, birthDate, birthTime, expectations, style } = body;
    
    // 参数校验
    if (!surname || !gender || !birthDate) {
      return NextResponse.json(
        { success: false, error: "缺少必要参数：姓氏、性别、生日" },
        { status: 400 }
      );
    }
    
    if (!["M", "F"].includes(gender)) {
      return NextResponse.json(
        { success: false, error: "性别只能是 M(男) 或 F(女)" },
        { status: 400 }
      );
    }
    
    // 计算五行喜忌
    const wuxingResult = calculateWuxing(birthDate, birthTime);
    
    // 生成名字
    const rawNames = await generateNames(
      surname,
      gender,
      wuxingResult.likes,
      expectations
    );
    
    // 附加典籍出处
    const namesWithSource = await attachSources(rawNames, expectations);
    
    // 创建起名记录（可选，如果有用户信息）
    let recordId: string | undefined;
    try {
      const record = await prisma.nameRecord.create({
        data: {
          surname,
          gender,
          birthDate: new Date(birthDate),
          birthTime,
          wuxingLikes: wuxingResult.likes,
          wuxingAvoids: wuxingResult.avoids,
          expectations,
          style,
          results: namesWithSource,
          status: "completed",
          // 如果有用户ID，可以关联
          userId: "", // 暂时为空，后续接入用户系统
        },
      });
      recordId = record.id;
    } catch (e) {
      console.log("记录创建失败（可能表不存在）:", e);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        recordId,
        wuxing: wuxingResult,
        names: namesWithSource,
      },
    });
    
  } catch (error) {
    console.error("起名 API 错误:", error);
    return NextResponse.json(
      { success: false, error: "服务器内部错误" },
      { status: 500 }
    );
  }
}

// 测试接口
export async function GET() {
  return NextResponse.json({
    message: "AI 起名 API",
    usage: "POST /api/name/generate with body: { surname, gender, birthDate, birthTime?, expectations?, style? }",
  });
}
