/**
 * 作品起名 API
 * POST /api/work-name/generate
 *
 * 为文学作品、手工艺品、艺术品、影视剧、短视频等作品命名
 */
import { NextRequest, NextResponse } from "next/server";
import { DeepSeekIntegration } from "@/lib/deepseek-integration";

// ─── 作品类型 → 命名风格映射 ───
const WORK_TYPE_MAP: Record<string, { label: string; desc: string; tone: string }> = {
  "文学作品": {
    label: "文学作品",
    desc: "小说、散文、诗歌等文学作品",
    tone: "有文学感、有意境、耐人寻味、有画面感",
  },
  "手工艺品/非遗": {
    label: "手工艺品",
    desc: "手工艺品、非遗作品、文创手作",
    tone: "有温度、有匠心感、质朴高级、有传统文化韵味",
  },
  "艺术品": {
    label: "艺术品",
    desc: "画作、雕塑、摄影等艺术品",
    tone: "有艺术感、抽象唯美、有张力、不直白",
  },
  "影视剧/短剧": {
    label: "影视剧",
    desc: "影视剧、短剧、微电影、纪录片",
    tone: "有故事感、有吸引力、适合传播、能引发好奇",
  },
  "短视频/栏目": {
    label: "短视频/栏目",
    desc: "短视频、栏目、专辑、系列内容",
    tone: "有记忆点、易传播、抓眼球、朗朗上口",
  },
  "其他文创": {
    label: "其他文创",
    desc: "文创产品、IP名称、其他创意作品",
    tone: "有创意、有文化感、不落俗套",
  },
};

// ─── 风格 → 命名规则 ───
const STYLE_RULES: Record<string, string> = {
  "文艺诗意": "用词优美、有诗意，文学性强",
  "东方国风": "有中国传统文化韵味，善用古典意象",
  "禅意静谧": "清雅、空灵、留白，禅意盎然",
  "高级简约": "极简有力，少即是多，有格调",
  "温暖治愈": "柔和、温暖、有治愈力，给人舒适感",
  "大气磅礴": "气势恢宏、有力量感，适合大制作",
  "清冷疏离": "冷感、疏离、不落俗，有距离美",
  "浪漫唯美": "梦幻、浪漫，画面感强，情感丰富",
  "复古怀旧": "有年代感、怀旧气质，经典耐品",
  "现代先锋": "前卫、新颖、有实验性，打破常规",
  "故事感强": "名字本身就像一个故事的开端",
  "意象优美": "善用自然意象，画面感强烈",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      workType,        // 作品类型（必选）
      theme,           // 主题/核心内容（必填）
      styles,          // 风格数组（必选，最多3个）
      keywords,        // 风格倾向关键词（选填）
      lengthPref,      // 字数要求（必选）
      avoid,           // 禁忌（选填）
    } = body;

    // ─── 参数校验 ───
    if (!workType) {
      return NextResponse.json(
        { success: false, message: "请选择作品类型" },
        { status: 400 }
      );
    }
    if (!theme || theme.trim().length < 2) {
      return NextResponse.json(
        { success: false, message: "请填写作品主题或核心内容（至少2个字）" },
        { status: 400 }
      );
    }
    if (!styles || !Array.isArray(styles) || styles.length === 0) {
      return NextResponse.json(
        { success: false, message: "请选择至少一个作品风格" },
        { status: 400 }
      );
    }
    if (!lengthPref) {
      return NextResponse.json(
        { success: false, message: "请选择字数要求" },
        { status: 400 }
      );
    }

    // ─── AI 可用性检查 ───
    if (!DeepSeekIntegration.isAvailable()) {
      return NextResponse.json(
        { success: false, message: "AI 服务未配置，请稍后重试" },
        { status: 503 }
      );
    }

    // ─── 构建提示词 ───
    const typeInfo = WORK_TYPE_MAP[workType] || WORK_TYPE_MAP["其他文创"];

    // 风格规则拼接
    const styleRules = styles
      .map((s: string) => STYLE_RULES[s] || s)
      .join("；");

    // 字数映射
    const lengthMap: Record<string, string> = {
      "2": "2个字，精炼高级，多为双字词",
      "3": "3个字，经典好记，节奏感强",
      "4": "4个字（最推荐），国风/文艺感最强，适合大多数作品",
      "短句": "短句/短语，适合影视剧、栏目、专辑（4-8字）",
    };
    const lengthDesc = lengthMap[lengthPref] || "不限字数，由AI自由发挥";

    const systemPrompt = `你是专业的作品命名师，擅长为文学、艺术、工艺、影视类作品起名。
你深谙中华文化之美，能驾驭古今意象，懂得留白与意境的力量。
你创作的名字有格调、易传播、有美感、贴合主题、无负面歧义。`;

    const userPrompt = `请为以下作品创作名称。

【作品类型】${typeInfo.label}（${typeInfo.desc}）
【作品主题】${theme}
【风格要求】${styleRules}
${keywords && keywords.trim() ? `【关键词元素】${keywords}（建议融入作品中）` : ""}
【字数要求】${lengthDesc}
${avoid && avoid.trim() ? `【禁忌】${avoid}` : ""}

严格遵循以下命名规则：
1. 符合作品气质，有画面感、有意境、有文化感
2. 不低俗、不直白、不撞大街、无负面谐音
3. 易记、易传播、适合用作标题/IP名称
4. 每个名字必须附带一句意境解读（20字内）
5. 生成10个作品名
6. 风格统一，调性一致
7. ${typeInfo.tone}

请以 JSON 数组格式输出，不要加 markdown 代码块包裹：
[
  {
    "name": "作品名",
    "explanation": "意境解读（一句话解释这个名字的意境和适配场景）"
  }
]`;

    const rawResult = await DeepSeekIntegration.callRaw(systemPrompt, userPrompt, 0.65, 4096);

    // ─── 解析 JSON ───
    let trimmed = rawResult.trim();
    // 去掉可能的 ```json ``` 包裹
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
      // JSON 解析失败时，尝试文本行解析 "序号. 作品名 —— 意境解读"
      console.warn("[work-name] JSON 解析失败，尝试文本行解析");
      const lines = trimmed.split("\n").filter((l) => l.trim());
      for (const line of lines) {
        const lineMatch = line.match(/^\d+[\.\、]\s*(.+?)[\s\-—–]+(.+)$/);
        if (lineMatch) {
          names.push({
            name: lineMatch[1].trim(),
            explanation: lineMatch[2].trim(),
          });
        }
      }
    }

    if (names.length === 0) {
      console.error("[work-name] 解析结果为空, raw:", rawResult.slice(0, 200));
      return NextResponse.json(
        { success: false, message: "AI 返回结果格式异常，请重新生成", data: [] },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: names });
  } catch (error) {
    console.error("[API work-name/generate] 错误:", error);
    return NextResponse.json(
      { success: false, message: "服务器内部错误", data: [] },
      { status: 500 }
    );
  }
}