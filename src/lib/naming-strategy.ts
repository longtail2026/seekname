/**
 * 起名风格策略矩阵
 * 
 * 根据客户输入的风格偏好，自动选择不同的起名策略：
 * 
 * | 风格类型       | 策略     | 具体做法                                    |
 * |---------------|---------|--------------------------------------------|
 * | 古典文化追求者  | 原字优先 | 展示典籍出处，解释含义，标注生僻度             |
 * | 实用主义者     | 现代字优先| 保留精神内核，用常见字替代                    |
 * | 中间派（默认） | 双轨展示  | 同时提供「古籍原字」和「现代同义字」            |
 */

// ============================================================
// 1. 策略枚举
// ============================================================

export enum NamingStrategyType {
  /** 追求古典文化 → 原字优先 */
  CLASSICAL = "CLASSICAL",
  /** 实用主义者 → 现代字优先 */
  MODERN = "MODERN",
  /** 中间派（默认）→ 双轨展示 */
  BALANCED = "BALANCED",
}

// ============================================================
// 2. 策略判定：根据用户输入自动选择策略
// ============================================================

/**
 * 判定用户属于哪种起名风格
 * 
 * 判定逻辑：
 * - 风格词（styles）包含"古典""古风""传统""典籍""书香""文雅"等 → CLASSICAL
 * - 风格词包含"实用""现代""简洁""通俗""大众"等 → MODERN  
 * - 期望词（intentions）含"古典""古书""典籍"等可覆盖 → CLASSICAL
 * - 期望词含"通俗""简单""常见""实用"等 → MODERN
 * - 其余默认 → BALANCED
 */
export function determineStrategy(
  styles: string[] = [],
  intentions: string[] = []
): NamingStrategyType {
  // 将风格和期望合并为一个字符串，用于关键词匹配
  const combined = [
    ...styles.map(s => s.toLowerCase()),
    ...intentions.map(i => i.toLowerCase()),
  ].join(" ");

  // 古典文化关键词
  const classicalKeywords = [
    "古典", "古风", "传统", "典籍", "书香", "文雅", "诗经",
    "古籍", "古书", "考古", "经典", "典雅", "庄重", "古韵",
    "文化", "历史", "儒雅", "博学", "古意", "classical",
  ];

  // 实用主义关键词
  const modernKeywords = [
    "实用", "现代", "简洁", "通俗", "大众", "简单", "常见",
    "流行", "时尚", "新颖", "创新", "好记", "顺口", "实用",
    "通顺", "好写", "柔和", "广泛", "modern", "simple",
  ];

  // 先判断是否明显偏向古典
  let classicalScore = 0;
  let modernScore = 0;

  for (const keyword of classicalKeywords) {
    if (combined.includes(keyword)) {
      classicalScore += keyword.length; // 长关键词权重更高
    }
  }

  for (const keyword of modernKeywords) {
    if (combined.includes(keyword)) {
      modernScore += keyword.length;
    }
  }

  // 加权决策
  if (classicalScore >= modernScore + 2) {
    return NamingStrategyType.CLASSICAL;
  }
  if (modernScore >= classicalScore + 2) {
    return NamingStrategyType.MODERN;
  }

  return NamingStrategyType.BALANCED;
}

// ============================================================
// 3. 各策略对应的 AI 提示词注入块
// ============================================================

/**
 * 根据策略类型获取对应的 AI 提示词块
 * 注入到 DeepSeek 的 prompt 中，指导名字生成风格
 */
export function getStrategyPromptBlock(strategy: NamingStrategyType): string {
  switch (strategy) {
    case NamingStrategyType.CLASSICAL:
      return `【原字优先模式】
严格遵循以下规则生成名字：
• 每个名字必须明确标注每个字出自哪部典籍的哪篇原文
• 优先使用典籍中的原字，即使该字在现代较生僻
• 在典籍出处中展示完整的原文片段，并解释该字在原文中的含义
• 生僻度等级标注：1-容易（常见字）、2-较常见、3-一般、4-较生僻、5-生僻
• 格式要求：每个名字附带【典籍出处】【原文】【含义】【生僻度】信息
• 即使名字使用生僻字，也坚持用原字，充分展现文化底蕴`;

    case NamingStrategyType.MODERN:
      return `【现代实用模式】
严格遵循以下规则生成名字：
• 保留典籍的精神内核和美好寓意，但使用现代常见同义字替代生僻字
• 确保每个字都在现代汉语中常见、易写、易认
• 名字必须朗朗上口，无歧义，适应现代社交场景
• 每个名字附带【精神来源典籍】【现代同义替换说明】信息
• 优先选择笔画适中、字形美观的常见字
• 生僻度要求：整体生僻度 ≤ 2（即所有字都是常见或较常见字）`;

    case NamingStrategyType.BALANCED:
    default:
      return `【双轨展示模式】
严格遵循以下规则生成名字：
• 每输出一个名字，同时提供「古籍原字版」和「现代同义字版」两个版本
• 格式示例：「熙（古籍原字）/ 曦（现代同义）」—— 在 finalName 后加括号标注
• 古籍原字：展示出自哪部典籍的哪篇原文
• 现代同义字：解释为何用此字替换，保留了什么精神内核
• 每个版本都需要标注典籍出处
• 让用户能清晰对比两个版本，自主选择偏好`;
  }
}

/**
 * 获取策略的生僻度阈值
 * CLASSICAL 不做限制（≥5 也能用）
 * MODERN 严格限制（≤2）
 * BALANCED 中等限制（≤3）
 */
export function getStrategyRarityThreshold(strategy: NamingStrategyType): number {
  switch (strategy) {
    case NamingStrategyType.CLASSICAL: return 5;  // 不限
    case NamingStrategyType.MODERN:    return 2;  // 严格
    case NamingStrategyType.BALANCED:  return 3;  // 中等
  }
}

// ============================================================
// 4. 策略标签与前端展示信息
// ============================================================

export interface StrategyTag {
  label: string;
  color: string;
  description: string;
  icon: string;
}

export function getStrategyTag(strategy: NamingStrategyType): StrategyTag {
  switch (strategy) {
    case NamingStrategyType.CLASSICAL:
      return {
        label: "🏛 古典原字优先",
        color: "#8B4513",
        description: "优先使用典籍原字，完整保留文化底蕴",
        icon: "scroll",
      };
    case NamingStrategyType.MODERN:
      return {
        label: "🔧 现代实用优先",
        color: "#2C5F4A",
        description: "保留典籍精神内核，使用现代常见字",
        icon: "zap",
      };
    case NamingStrategyType.BALANCED:
    default:
      return {
        label: "⚖️ 古今双轨展示",
        color: "#8B6914",
        description: "同时提供古籍原字和现代同义字供您选择",
        icon: "balance",
      };
  }
}

// ============================================================
// 5. 策略标签文本（用于 API 返回）
// ============================================================

export const STRATEGY_LABELS: Record<NamingStrategyType, string> = {
  [NamingStrategyType.CLASSICAL]: "古典原字优先",
  [NamingStrategyType.MODERN]: "现代实用优先",
  [NamingStrategyType.BALANCED]: "古今双轨展示",
};

// ============================================================
// 6. 策略矩阵配置表（完整定义）
// ============================================================

export interface StrategyConfig {
  type: NamingStrategyType;
  label: string;
  description: string;
  /**
   * 推荐使用方式：
   * - "original" → 展示典籍原著原文
   * - "modern"   → 展示现代翻译/同义字
   * - "both"     → 同时展示两种
   */
  displayMode: "original" | "modern" | "both";
  /** AI 提示词注入 */
  promptBlock: string;
  /** 生僻度阈值 */
  rarityThreshold: number;
  /** 前端展示的颜色 */
  color: string;
  /** 前端展示的图标 */
  icon: string;
}

export const STRATEGY_MATRIX: Record<NamingStrategyType, StrategyConfig> = {
  [NamingStrategyType.CLASSICAL]: {
    type: NamingStrategyType.CLASSICAL,
    label: "古典原字优先",
    description: "偏好传统文化的用户，注重名字的典籍出处和文化底蕴",
    displayMode: "original",
    promptBlock: getStrategyPromptBlock(NamingStrategyType.CLASSICAL),
    rarityThreshold: 5,
    color: "#8B4513",
    icon: "scroll",
  },
  [NamingStrategyType.MODERN]: {
    type: NamingStrategyType.MODERN,
    label: "现代实用优先",
    description: "注重实用性和现代感的用户，希望名字通俗易懂",
    displayMode: "modern",
    promptBlock: getStrategyPromptBlock(NamingStrategyType.MODERN),
    rarityThreshold: 2,
    color: "#2C5F4A",
    icon: "zap",
  },
  [NamingStrategyType.BALANCED]: {
    type: NamingStrategyType.BALANCED,
    label: "古今双轨展示",
    description: "兼顾古典传统与现代需求，提供两种选择",
    displayMode: "both",
    promptBlock: getStrategyPromptBlock(NamingStrategyType.BALANCED),
    rarityThreshold: 3,
    color: "#8B6914",
    icon: "balance",
  },
};