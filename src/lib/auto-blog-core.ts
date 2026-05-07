import prisma from "@/lib/prisma";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// ========== 起名行业长尾关键词库（7大类） ==========
export const LONGTAIL_KEYWORD_POOL: {
  category: string;
  keywords: string[];
  titleTemplate: string;
  contentHint: string;
}[] = [
  // 1. 男孩起名长尾
  { category: "男孩起名", keywords: ["姓张好听有寓意男孩名字", "2026年丙午年男孩取名大全", "古风儒雅男孩单字名推荐", "大气沉稳男孩双字名字", "带诗意典故的男孩名字", "五行属木适合男孩的名字", "简单不俗气男孩取名技巧", "小众不重名男孩名字精选", "阳光开朗男孩起名用字", "楚辞诗经男孩取名寓意解析"], titleTemplate: "【男孩起名】%s", contentHint: "男孩取名方法论、用字推荐、寓意解析" },
  // 2. 女孩起名长尾
  { category: "女孩起名", keywords: ["温柔仙气女孩古风名字", "好听清雅女孩诗意名字", "冷门又优美的女孩名字", "诗经出处女孩高分名字", "五行属水女孩雅致名字", "温婉有涵养女孩取名", "简约干净女孩单字名", "不易重名文艺女孩名字", "夏天出生女孩起名宜忌", "甜美灵动女孩名字推荐"], titleTemplate: "【女孩起名】%s", contentHint: "女孩取名风格、用字推荐、文化典故" },
  // 3. 姓氏专属长尾
  { category: "姓氏起名", keywords: ["李氏好听男孩女孩名字大全", "王氏寓意好的取名推荐", "张姓古风诗意名字怎么取", "刘姓简约不俗起名技巧", "陈姓男孩大气取名用字", "杨姓女孩温柔雅致名字", "黄姓小众不重名名字精选", "赵姓有典故出处名字推荐"], titleTemplate: "【姓氏起名】%s", contentHint: "特定姓氏搭配建议、百家姓文化" },
  // 4. 英文名/中文名转英文长尾
  { category: "英文名", keywords: ["中文名谐音洋气英文名", "男生高级感小众英文名", "女生温柔治愈系英文名", "按姓氏匹配专属英文名", "简约不烂大街英文名推荐", "中文名字音译英文名技巧"], titleTemplate: "【英文名】%s", contentHint: "英文名选取技巧、音译方法、流行趋势" },
  // 5. 公司名/品牌起名长尾
  { category: "公司起名", keywords: ["如何给公司起名", "如何给品牌起名", "高端大气的公司品牌名推荐", "品牌名反应产品诉求", "容易通过注册审核的公司名", "容易通过注册审核的品牌名"], titleTemplate: "【公司品牌起名】%s", contentHint: "工商核名规则、品牌命名策略、案例解析" },
  // 6. 宠物起名长尾
  { category: "宠物起名", keywords: ["如何给你的毛孩子起个合适的名字", "宠物需要起名的必要性", "宠物性格和名字"], titleTemplate: "【宠物起名】%s", contentHint: "宠物取名趣味方法、性格匹配建议" },
  // 7. 起名常识/避坑类
  { category: "起名知识", keywords: ["起名避讳用字有哪些", "名字音律搭配有什么讲究", "生辰八字取名正确方法", "取名为什么不能用生僻字", "三字名和双字名哪个更好", "如何给孩子取不易重名的名字"], titleTemplate: "【起名常识】%s", contentHint: "起名禁忌、音律五行、文化常识" },
];

// 将长尾关键词展平为简易话题列表（供 pickTopic 使用）
function buildTopicPoolFromLongtail() {
  const pool: { keywords: string[]; title: string; category: string; content: string }[] = [];
  for (const group of LONGTAIL_KEYWORD_POOL) {
    for (const kw of group.keywords) {
      pool.push({
        keywords: [kw],
        title: kw,
        category: group.category,
        content: `${group.contentHint}。目标长尾关键词：${kw}`,
      });
    }
  }
  return pool;
}

// 动态话题池（由长尾关键词构建）
function getTopicPool() {
  // 先尝试从数据库读取补充素材，若无则用长尾关键词池
  try {
    return buildTopicPoolFromLongtail();
  } catch {
    return buildTopicPoolFromLongtail();
  }
}

// ========== 去重检查：本站已有文章标题 ==========
let existingTitlesCache: string[] | null = null;
let existingTitlesCacheTime = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30分钟

export async function getExistingTitles(): Promise<string[]> {
  const now = Date.now();
  if (existingTitlesCache && (now - existingTitlesCacheTime) < CACHE_TTL) {
    return existingTitlesCache;
  }
  try {
    const posts = await prisma.blogPost.findMany({
      select: { title: true },
      where: { source: "auto_blog" },
    });
    existingTitlesCache = posts.map(p => p.title.trim().toLowerCase());
    existingTitlesCacheTime = now;
  } catch {
    existingTitlesCache = [];
  }
  return existingTitlesCache!;
}

export async function isDuplicateTitle(title: string): Promise<boolean> {
  const existing = await getExistingTitles();
  const cleanTitle = title.trim().toLowerCase();
  return existing.some(t => t === cleanTitle || t.includes(cleanTitle) || cleanTitle.includes(t));
}

// ========== 配置管理 ==========
export async function getConfig() {
  let config = await prisma.autoBlogConfig.findFirst();
  if (!config) {
    // 将所有长尾关键词压平作为默认爬取关键词
    const allKeywords = LONGTAIL_KEYWORD_POOL.flatMap(g => g.keywords);
    config = await prisma.autoBlogConfig.create({
      data: {
        isEnabled: true,
        frequency: "daily",
        crawlKeywords: allKeywords,
        requireReview: true,
        defaultCategory: "起名知识",
        writingStyle: "formal",
      },
    });
  }
  return config;
}

// ========== 话题选取（优先匹配配置中的关键词，去重） ==========
export async function pickTopic(keywords: string[]): Promise<{ title: string; category: string; content: string; targetKeyword: string }> {
  const pool = getTopicPool();

  // 按配置关键词匹配优先级
  const matched: { item: typeof pool[0]; priority: number }[] = [];
  for (let i = 0; i < keywords.length; i++) {
    const kw = keywords[i].trim().toLowerCase();
    for (const item of pool) {
      if (item.keywords.some(k => k.trim().toLowerCase() === kw)) {
        matched.push({ item, priority: i });
      }
    }
  }

  // 按优先级排序
  matched.sort((a, b) => a.priority - b.priority);

  // 尝试找到未写过的话题（去重）
  for (const m of matched) {
    const exists = await isDuplicateTitle(m.item.title);
    if (!exists) {
      return {
        title: m.item.title,
        category: m.item.category,
        content: m.item.content,
        targetKeyword: m.item.keywords[0],
      };
    }
  }

  // 如果全部写过，随机选取一个（仍然生成新内容）
  const fallback = matched.length > 0
    ? matched[Math.floor(Math.random() * matched.length)].item
    : pool[Math.floor(Math.random() * pool.length)];

  // 对标题加时间戳避免完全重复
  const dateStr = new Date().toISOString().slice(0, 10);
  return {
    title: `${fallback.title}（${dateStr}版）`,
    category: fallback.category,
    content: fallback.content,
    targetKeyword: fallback.keywords[0],
  };
}

// ========== AI 重写（使用专用 SEO 提示词模板） ==========
const SEO_PROMPT_TEMPLATE = `你现在是专业SEO博客编辑，我给你一篇爬虫抓取的原文，请按以下要求全权改写润色：
1、彻底重构文章结构，重新划分小标题、调整段落顺序，不要简单替换词语；
2、全文原创度拉满，大幅改写句式、换开头、重写结尾，保留核心知识点，删除废话冗余内容；
3、全文控制在800-1500字，排版清晰，分段合理，适合搜索引擎收录；另外在改写的全文前1/3处插入一张相关的图片；
4、自然植入指定长尾关键词：{{目标长尾关键词}}，均匀分布在标题、首段、正文、中段，不堆砌、不生硬；
5、语言通俗易懂，适合普通用户阅读，保留起名文化、取名技巧专业度；
6、不要出现广告、违规话术，只做干货内容输出，文末预留位置，我后续自动拼接固定导流文案；
7、输出格式：标准博客文章格式，有主标题、分段正文、清晰自然段，不用Markdown复杂格式。
8、在文末加上结尾端内容：
  看完本篇取名小知识，相信你已经掌握不少起名思路。如果不想花费大量时间翻阅典籍、斟酌用字，不妨直接使用Seekname寻名网的智能 AI 起名工具，
依托大数据与智能算法，结合你的起名意向，一键生成高分好名。涵盖男孩名、女孩名、古风诗意名、英文定制名、公司名、品牌名等多做起名需求，帮你轻松
选出专属好名。

以下为待改写原文：
{{粘贴爬虫抓取的原文}}`;

export async function aiRewrite(
  content: string,
  style: string,
  category: string,
  targetKeyword?: string
) {
  // 构建最终要注入的 SEO 长尾关键词
  const seoKeyword = targetKeyword || "起名";

  // --- 先查询已有博客标题用于去重 ---
  const existingTitles = await getExistingTitles();

  const styleDesc: Record<string, string> = {
    formal: "正式、典雅、专业",
    casual: "通俗易懂、亲切自然",
    professional: "专业严谨、数据翔实",
  };

  // 构建完整 prompt
  const prompt = SEO_PROMPT_TEMPLATE
    .replace("{{目标长尾关键词}}", seoKeyword)
    .replace("{{粘贴爬虫抓取的原文}}", content);

  // 额外注入风格和去重要求
  const fullPrompt = `${prompt}

额外要求：
- 语言风格：${styleDesc[style] || styleDesc.formal}
- 分类：${category}
- 标题不得与以下已有文章标题相同（如果太接近请换一种表述）：${existingTitles.slice(0, 20).join("、")}
- 输出格式：请按以下 JSON 格式返回（不要包含其他内容）：
{"title": "新标题（必须包含关键词【${seoKeyword}】）", "content": "改写后的完整文章内容（800-1500字，已包含图片占位和文末导流文案）", "keywords": ["${seoKeyword}", "起名", "起名技巧", "取名"]}`;

  if (!DEEPSEEK_API_KEY) {
    // mock 模式
    return {
      title: `${seoKeyword} - 深度解析与实用指南`,
      content: `# ${seoKeyword} - 深度解析与实用指南\n\n${content}\n\n看完本篇取名小知识，相信你已经掌握不少起名思路。如果不想花费大量时间翻阅典籍、斟酌用字，不妨直接使用Seekname寻名网的智能 AI 起名工具，依托大数据与智能算法，结合你的起名意向，一键生成高分好名。涵盖男孩名、女孩名、古风诗意名、英文定制名、公司名、品牌名等多做起名需求，帮你轻松选出专属好名。`,
      keywords: [seoKeyword, "起名", "起名技巧"],
    };
  }

  const res = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: fullPrompt }],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!res.ok) throw new Error(`AI API 调用失败: ${res.status}`);
  const data = await res.json();
  try {
    const parsed = JSON.parse(data.choices[0].message.content);
    // 确保标题不重复
    if (await isDuplicateTitle(parsed.title)) {
      parsed.title = `${parsed.title}（${new Date().toISOString().slice(0, 10)}）`;
    }
    return parsed;
  } catch {
    // AI 没返回纯 JSON，直接返回文本
    return {
      title: seoKeyword,
      content: data.choices[0].message.content,
      keywords: [seoKeyword],
    };
  }
}

// ========== 发布文章（HTTP 方式） ==========
export async function publishPost(postData: any, requireReview: boolean) {
  const res = await fetch(`${API_BASE}/api/admin/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: postData.title,
      content: postData.content,
      category: postData.category,
      keywords: postData.keywords || [],
      status: requireReview ? "draft" : "published",
      tags: postData.keywords || [],
      source: "auto_blog",
      sourceUrl: postData.sourceUrl || "",
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`发布文章失败 ${res.status}: ${errText}`);
  }
  return res.json();
}

// ========== 保存日志 ==========
export async function saveLog(logData: any) {
  const res = await fetch(`${API_BASE}/api/admin/auto-blog`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ logEntry: logData }),
  });
  return res.ok;
}