/**
 * 艺名/笔名/主播名生成 API
 * POST /api/stage-name/generate
 */
import { NextRequest, NextResponse } from "next/server";
import { DeepSeekIntegration } from "@/lib/deepseek-integration";

// 身份映射，用于精准 prompt
const IDENTITY_MAP: Record<string, { label: string; promptHint: string; toneHints: string; namingRule: string }> = {
  "主播": {
    label: "主播/博主",
    promptHint: "适合在抖音/快手/视频号等短视频平台使用",
    toneHints: "好记、顺口、有记忆点、辨识度高、朗朗上口、适合口播",
    namingRule: "建议使用叠字、双音节、富有个性的组合，便于粉丝记忆",
  },
  "自媒体": {
    label: "自媒体/UP主/博主",
    promptHint: "适合B站/小红书/公众号等自媒体平台",
    toneHints: "有态度、有辨识度、IP感强、有内容调性、风格鲜明",
    namingRule: "建议使用有内容感的名字，能体现账号定位和领域特色",
  },
  "作家": {
    label: "作家/作者/诗人",
    promptHint: "适合出版书籍、发表文章时使用的笔名",
    toneHints: "有文学感、有诗意、含蓄优雅、耐人寻味、有文化底蕴",
    namingRule: "建议使用文艺、含蓄、有内涵的组合，避免过于直白或网红气",
  },
  "演员": {
    label: "演员/模特/艺人",
    promptHint: "适合娱乐圈使用的艺名",
    toneHints: "高级感、国际化、有星味、简约大气、过目不忘",
    namingRule: "建议使用时髦、有气质、易发音的组合，方便国际传播和品牌识别",
  },
  "职场": {
    label: "职场/演讲/知识博主",
    promptHint: "适合职场形象、知识分享、公众演讲",
    toneHints: "专业、沉稳、可信赖、有格局、精英感",
    namingRule: "建议使用正式、大气、有分量的组合，体现专业度和权威感",
  },
  "其他": {
    label: "其他公众形象",
    promptHint: "适合需要公众形象的各类场景",
    toneHints: "通用出众、有个性、有辨识度、不落俗套",
    namingRule: "可根据具体场景灵活调整风格",
  },
};

// 风格映射，用于细化 prompt
const STYLE_MAP: Record<string, string> = {
  "高级简约": "高级感强、简约大气、配色干净、设计感足、不花哨",
  "温柔治愈": "温柔温暖、治愈系、有亲和力、让人想靠近、暖色调",
  "清冷文艺": "清冷疏离、文艺气息、有故事感、不食人间烟火、文艺范",
  "大气稳重": "大气、稳重、有分量、成熟可靠、低调奢华",
  "酷飒个性": "酷、有个性、不随大流、潮、有态度、飒",
  "可爱甜系": "可爱、甜美、撒娇感、萌、软萌、元气满满",
  "幽默吸睛": "有趣、幽默、抓眼球、让人记住、有梗、好传播",
  "国学国风": "有国学底蕴、古风诗意、引经据典、典雅有出处、东方美学",
  "知识专业": "知识分子感、专业权威、有学识、严谨、值得信赖",
  "记忆点强": "过目不忘、有记忆点、辨识度极高、独特不撞名",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identity, gender, style, contains, length: lengthPref, avoid } = body;

    // 参数校验
    if (!identity || !gender || !style || !Array.isArray(style) || style.length === 0) {
      return NextResponse.json(
        { success: false, message: "请选择身份类型、性别气质和风格方向" },
        { status: 400 }
      );
    }

    // 检查AI是否可用
    if (!DeepSeekIntegration.isAvailable()) {
      return NextResponse.json(
        { success: false, message: "AI 服务未配置，请稍后重试" },
        { status: 503 }
      );
    }

    const iden = IDENTITY_MAP[identity] || IDENTITY_MAP["其他"];
    const styleDesc = style.map((s: string) => STYLE_MAP[s] || s).join("；");

    // 字数映射
    let lengthRule = "不限，由AI推荐最优方案";
    if (lengthPref === "2") {
      lengthRule = "2字名（最易传播，简洁有力）";
    } else if (lengthPref === "3") {
      lengthRule = "3字名（最适合主播/博主，有节奏感）";
    } else if (lengthPref === "4") {
      lengthRule = "4字名（IP感强、高级、有辨识度）";
    }

    const systemPrompt = `你是中国最专业的艺名、笔名、主播名命名师。你精通命名学、语言学、传播学。

你的核心能力：
- 为公众人物打造辨识度极高的艺名/笔名
- 确保名字易记、易传播、有气质、无负面歧义
- 帮助用户建立个人品牌IP

你生成的名字标准：
1. 易读、易记、容易口口传播
2. 辨识度高，不撞名、不烂大街
3. 符合身份气质，有个人品牌感
4. 无负面谐音、无不雅含义
5. 适合做网名、账号名、IP名
6. 不用生僻字、不用复杂字`;

    const userPrompt = `用户信息：
使用身份：${iden.label}（${iden.promptHint}）
性别气质：${gender}
风格方向：${style.join("、")}
风格细化：${styleDesc}
${contains ? `希望包含的字：${contains}` : ""}
字数偏好：${lengthRule}
${avoid ? `禁忌/不想要：${avoid}` : ""}

${iden.namingRule}

生成要求：
1. 生成10个名字
2. 每个名字都符合「${iden.toneHints}」
3. 名字要体现出「${style.join("、")}」的风格
4. 易读、易记、辨识度高
5. 无负面谐音、无歧义
6. 符合职业身份与风格
7. 每个名字附带一句适合场景的说明（说明为什么适合这个身份、风格亮点是什么）

请以 JSON 数组格式输出，不要加 markdown 代码块包裹：
[
  {
    "name": "名字",
    "explanation": "身份适配说明 + 风格亮点（一句话，30字以内）"
  }
]`;

    const rawResult = await DeepSeekIntegration.callRaw(systemPrompt, userPrompt, 0.7, 4096);

    // 解析 JSON
    let trimmed = rawResult.trim();
    const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) trimmed = match[1].trim();

    let names: Array<{ name: string; explanation: string }> = [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        names = parsed
          .filter((item: any) => item.name)
          .map((item: any) => ({
            name: item.name.trim(),
            explanation: item.explanation?.trim() || "",
          }));
      }
    } catch {
      // JSON 解析失败，尝试按行解析 "序号. 名字 - 说明" 格式
      console.warn("[stage-name] JSON 解析失败，尝试文本行解析");
      const lines = trimmed.split("\n").filter((l) => l.trim());
      for (const line of lines) {
        const lineMatch = line.match(/^\d+[\.\、\s]\s*(.+?)[\s\-—–]+(.+)$/);
        if (lineMatch) {
          names.push({
            name: lineMatch[1].trim(),
            explanation: lineMatch[2].trim(),
          });
        }
      }
    }

    if (names.length === 0) {
      console.error("[stage-name] 解析结果为空, raw:", rawResult.slice(0, 200));
      return NextResponse.json(
        { success: false, message: "AI 返回结果格式异常，请重试", data: [] },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: names });
  } catch (error) {
    console.error("[API stage-name/generate] 错误:", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误", data: [] },
      { status: 500 }
    );
  }
}