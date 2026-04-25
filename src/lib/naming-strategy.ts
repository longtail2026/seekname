/**
 * 起名策略矩阵
 * 
 * 根据客户输入的风格偏好，决定语义匹配后采用典籍原字还是现代同义字。
 * 
 * 策略矩阵：
 * ┌──────────────────┬────────────────┬──────────────────────────────────────┐
 * │ 起名风格偏好类型   │ 推荐方案        │ 具体做法                              │
 * ├──────────────────┼────────────────┼──────────────────────────────────────┤
 * │ 追求古典文化      │ 原字优先        │ 展示典籍出处，解释含义，标注生僻度       │
 * │ 实用主义者        │ 现代字优先      │ 保留精神内核，用常见字替代               │
 * │ 中间派（默认）     │ 双轨展示        │ 同时提供「古籍原字」和「现代同义字」     │
 * └──────────────────┴────────────────┴──────────────────────────────────────┘
 */

// ─── 策略类型 ───

/** 起名策略枚举 */
export enum NamingStrategyType {
  /** 追求古典文化 → 原字优先 */
  CLASSICAL = "classical",
  /** 实用主义者 → 现代字优先 */
  PRAGMATIC = "pragmatic",
  /** 中间派（默认）→ 双轨展示 */
  BALANCED = "balanced",
}

/** 策略的显示名称 */
export const STRATEGY_LABELS: Record<NamingStrategyType, string> = {
  [NamingStrategyType.CLASSICAL]: "古典原字优先",
  [NamingStrategyType.PRAGMATIC]: "现代实用优先",
  [NamingStrategyType.BALANCED]: "古今双轨展示",
};

/** 策略的详细描述 */
export const STRATEGY_DESCRIPTIONS: Record<NamingStrategyType, string> = {
  [NamingStrategyType.CLASSICAL]:
    "优先使用典籍中的原始汉字，展示完整的典籍出处，解释每个字的古义，标注生僻度（生僻度≤3为佳）。",
  [NamingStrategyType.PRAGMATIC]:
    "保留典籍原文的精神内核和寓意，但使用现代常见字替代生僻字，确保名字朗朗上口、易于书写。",
  [NamingStrategyType.BALANCED]:
    "同时提供两个版本：一是「古籍原字」版（带典籍出处），二是「现代同义字」版（保留寓意但使用常见字），让用户自行选择。",
};

// ─── 风格偏好到策略的映射 ───

/** 
 * 用户选择的风格偏好 → 策略类型映射
 * 当多个风格同时选中时，按优先级取第一个匹配的策略
 */
export const STYLE_TO_STRATEGY_MAP: Record<string, NamingStrategyType> = {
  "古风典雅": NamingStrategyType.CLASSICAL,
  "诗意浪漫": NamingStrategyType.CLASSICAL,
  "清新自然": NamingStrategyType.CLASSICAL,

  "现代简约": NamingStrategyType.PRAGMATIC,
  "洋气国际": NamingStrategyType.PRAGMATIC,
  "独特个性": NamingStrategyType.PRAGMATIC,

  "大气豪迈": NamingStrategyType.BALANCED,
  "温柔婉约": NamingStrategyType.BALANCED,
  "稳重成熟": NamingStrategyType.BALANCED,
  "可爱灵动": NamingStrategyType.BALANCED,
};

/** 
 * 策略优先级顺序（高优先级的风格优先决定策略）
 * CLASSICAL > BALANCED > PRAGMATIC
 */
const STRATEGY_PRIORITY: NamingStrategyType[] = [
  NamingStrategyType.CLASSICAL,
  NamingStrategyType.BALANCED,
  NamingStrategyType.PRAGMATIC,
];

/**
 * 从用户选择的风格偏好列表推导出最终策略
 * @param styles 用户选择的风格偏好数组
 * @param expectations 用户选择的取名寓意数组（可选，用于补充判断）
 * @returns 确定的策略类型
 */
export function determineStrategy(
  styles: string[],
  expectations?: string[]
): NamingStrategyType {
  if (!styles || styles.length === 0) {
    // 如果没有选择任何风格，根据寓意推断
    if (expectations && expectations.length > 0) {
      // "品德高尚"倾向于古典，"事业有成"可实用
      const classicalHints = ["品德高尚", "才华艺术", "美丽俊俏"];
      const pragmaticHints = ["事业有成", "富贵财富", "阳光开朗"];
      
      const classicalCount = expectations.filter(e => classicalHints.includes(e)).length;
      const pragmaticCount = expectations.filter(e => pragmaticHints.includes(e)).length;
      
      if (classicalCount > pragmaticCount) return NamingStrategyType.CLASSICAL;
      if (pragmaticCount > classicalCount) return NamingStrategyType.PRAGMATIC;
    }
    return NamingStrategyType.BALANCED; // 默认中间派
  }

  // 按优先级排序，取第一个匹配的策略
  const matchedStrategies = new Set<NamingStrategyType>();
  for (const style of styles) {
    const strategy = STYLE_TO_STRATEGY_MAP[style];
    if (strategy) {
      matchedStrategies.add(strategy);
    }
  }

  // 按优先级返回
  for (const priority of STRATEGY_PRIORITY) {
    if (matchedStrategies.has(priority)) {
      return priority;
    }
  }

  // 如果匹配不到任何策略，再根据风格关键词推断
  for (const style of styles) {
    if (style.includes("古") || style.includes("典") || style.includes("诗") || style.includes("传统")) {
      return NamingStrategyType.CLASSICAL;
    }
    if (style.includes("现") || style.includes("国际") || style.includes("简约") || style.includes("个性")) {
      return NamingStrategyType.PRAGMATIC;
    }
  }

  return NamingStrategyType.BALANCED;
}

// ─── 策略特定的 Prompt 指令 ───

/**
 * 根据策略类型生成 AI 提示词指令块
 * @param strategy 策略类型
 * @returns 策略描述字符串，可直接嵌入 AI prompt
 */
export function getStrategyPromptBlock(strategy: NamingStrategyType): string {
  switch (strategy) {
    case NamingStrategyType.CLASSICAL:
      return `【起名策略：古典原字优先】
- 优先从典籍原文中直接提取汉字的原始形态，不得随意替换为简化字或同义字。
- 每个名字必须标注精确的典籍出处（书名+篇名）。
- 对每个名字中的关键字，解释其古义和在名字中的寓意。
- 评估并标注每个名字的生僻度（1-5星，★★★☆☆以上为佳）。
- 生僻字不超过总字数的1/3，避免使用过于晦涩的字。`;

    case NamingStrategyType.PRAGMATIC:
      return `【起名策略：现代实用优先】
- 核心目标：保留典籍原文的精神内核和美好寓意。
- 如果典籍原字生僻或难以读写，用现代常见同义字/近义字替代。
- 确保名字朗朗上口，笔画适中（单字不超过15画为佳），适合日常使用。
- 标注该名字的精神内核源自哪部典籍，但不必拘泥于原字。
- 如果某典籍名句中的关键字很常见且寓意好，可以直接使用原字。`;

    case NamingStrategyType.BALANCED:
      return `【起名策略：古今双轨展示】
- 每个名字需要同时提供两个版本：
  版本A（古籍原字版）：使用典籍原文中的汉字，标注典籍出处，解释古义，标注生僻度。
  版本B（现代同义字版）：保留与版本A相同的精神内核和寓意，但使用现代常见字，让名字更易读写。
- 两个版本应有相同的寓意根基，只是用字方案不同。
- 用户可以自由选择更喜欢哪个版本。
- 对关键字分别标注"古义"和"今用"。`;

    default:
      return getStrategyPromptBlock(NamingStrategyType.BALANCED);
  }
}

/**
 * 获取策略的简要标签（用于前端展示）
 */
export function getStrategyTag(strategy: NamingStrategyType): {
  label: string;
  color: string;
  description: string;
} {
  switch (strategy) {
    case NamingStrategyType.CLASSICAL:
      return {
        label: "📜 原字优先",
        color: "#8B4513",
        description: "典籍原字 · 出处可考 · 古风韵味",
      };
    case NamingStrategyType.PRAGMATIC:
      return {
        label: "✨ 现代优先",
        color: "#2E7D32",
        description: "精神内核 · 常见字替代 · 朗朗上口",
      };
    case NamingStrategyType.BALANCED:
      return {
        label: "🔄 双轨展示",
        color: "#E86A17",
        description: "古籍原字 + 现代同义字 · 任君选择",
      };
  }
}

/**
 * 获取生僻度评级文字
 * @param score 1-5 的评分（5为最生僻）
 * @returns 生僻度描述
 */
export function getRarityLabel(score: number): { stars: string; label: string } {
  const clamped = Math.max(1, Math.min(5, score));
  const stars = "★".repeat(6 - clamped) + "☆".repeat(clamped - 1);
  const labels: Record<number, string> = {
    1: "非常常见",
    2: "较为常见",
    3: "稍微生僻",
    4: "较为生僻",
    5: "非常生僻",
  };
  return { stars, label: labels[clamped] || "适中" };
}