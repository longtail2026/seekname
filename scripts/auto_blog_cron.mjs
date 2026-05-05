/**
 * AI 自动博客发布引擎 - 定时任务脚本
 * 
 * 功能：
 * 1. 从配置读取爬取关键词
 * 2. 模拟爬取目标网站文章
 * 3. 调用 DeepSeek API 进行 AI 改写（洗稿 + 润色 + 扩写）
 * 4. 自动生成标题、关键词、分类
 * 5. 以草稿或直接发布状态写入博客
 * 6. 记录执行日志
 * 
 * 使用方式：
 *   node scripts/auto_blog_cron.mjs
 * 
 * 也可通过 Vercel Cron Job 定时触发（配置 vercel.json）
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

/**
 * 1. 获取自动发文配置
 */
async function fetchConfig() {
  const res = await fetch(`${API_BASE}/api/admin/auto-blog`);
  if (!res.ok) throw new Error(`获取配置失败: ${res.status}`);
  const data = await res.json();
  return data.config;
}

/**
 * 话题池 — 覆盖用户指定的 8 大类起名话题，每天轮换
 */
const TOPIC_POOL = [
  {
    keywords: ["英文名大全", "男生英文名", "女生英文名"],
    title: "2025年最受欢迎英文名大全",
    category: "英文名大全",
    content: `
      给自家孩子取一个好听又有内涵的英文名，是很多家长的愿望。英文名不仅在学校和社交场合中使用，
      未来的工作环境中也常常需要一个合适的英文名。一个好的英文名应该简洁易读、发音优美、寓意积极。
      男生常见的英文名如 William（坚定的保护者）、Alexander（人类的守护者）、Benjamin（幸运之子），
      女生常见的英文名如 Olivia（橄榄树，象征和平）、Emma（ universal, 全能）、Sophia（智慧）等。
      选择英文名时需要注意名字的文化背景，避免选择容易引起歧义的词。同时也建议名字的发音在中文语境下也自然顺口，
      比如 Lily、Lucy、Alice 这类音译和原音都很优美的名字。
    `
  },
  {
    keywords: ["宝宝起名禁忌", "好听不重名的名字"],
    title: "宝宝起名禁忌与好听不重名名字推荐",
    category: "宝宝起名",
    content: `
      给宝宝起名大有讲究，避开以下禁忌，帮你家宝贝取一个好名字。第一，忌用生僻字，如"鑫""（多个金）"
      等虽然寓意好但笔画复杂的字，会给孩子日后的书写和社交带来麻烦。第二，忌谐音不好的字，
      比如"杜子腾"容易被叫成"肚子疼"。第三，忌过于跟风，所谓的大热名字如"梓涵""子轩"等，
      班里同名率极高。推荐一些好听又不重名的名字：女孩名"知鸢"（知书达礼，鸢飞唳天）、
      男孩名"凌霄"（志存高远）、中性名"南絮"（南方柳絮般温柔）。选择名字时，
      建议多考虑字与姓氏的搭配是否和谐，音律是否优美，字形是否平衡。
    `
  },
  {
    keywords: ["公司起名规则", "工商核名技巧"],
    title: "公司起名全攻略：从规则到技巧一网打尽",
    category: "公司起名",
    content: `
      开公司第一步就是起个好名字。企业名称通常由行政区划+字号+行业+组织形式四部分组成。
      核名是公司注册的关键环节，技巧如下：一、准备3-5个备选名，按优先级排列。二、字号避
      免使用国家名称、行业通用词等禁用词。三、字号最好寓意积极、朗朗上口，如"华为"意为
      "中华有为"。四、查重时注意同音字和形近字也可能被驳回。五、含"集团""国际"等字眼
      需要满足一定的注册资本门槛。推荐常见的命名方式：寓意法（为众人、聚成）、
      谐音法（行远——行远必自迩）、拆字法、古诗取词法等。
    `
  },
  {
    keywords: ["跨境电商品牌名怎么取"],
    title: "跨境电商品牌命名策略：让老外记住你的品牌",
    category: "跨境电商",
    content: `
      跨境电商的崛起让越来越多的中国品牌走向世界。一个好的跨境品牌名需要兼顾中文语境和海外市场。
      命名原则：一、全球可读性——拼读规则在各种语言中基本一致。二、域名可用性——确保.com或
      主流后缀可以注册。三、文化适应性——在主要目标市场没有负面联想。四、简短易记——3-5个
      字母最佳。案例：Shein（取自"she"+"in"，简洁有力）、Anker（锚，象征稳定可靠）、
      Zaful（zeal+full的变体，充满热情）。避免使用拼音直译（如"Xiexie"）或过于中文化的表达，
      这样的名字在国外用户看来难以发音和记忆。
    `
  },
  {
    keywords: ["外国人中文名怎么起"],
    title: "外国人起中文名的艺术：好听又有文化底蕴",
    category: "外国人中文名",
    content: `
      越来越多的外国友人对中国文化产生兴趣，想要为自己取一个中文名字。给外国人起中文名不同于
      中国人取名，侧重于音译的贴切和意境的传达。好的中文名应该：一、发音与原名相近，如
      Elon Musk→马一龙、Taylor Swift→泰勒·斯威夫特。二、选取有美好寓意的汉字，如
      Chris→可睿（智慧）、Alice→爱丽丝（优雅）。三、注意声调搭配，避免拗口的三声连读。
      四、姓氏最好选择常见百家姓，让名字更像地道中文名。为外国人取中文名时，可以结合他们的
      性格特征、职业特点，让名字不仅"像中文名"还要"像他们自己的名字"。
    `
  },
  {
    keywords: ["艺名主播名笔名技巧"],
    title: "艺名·主播名·笔名：让你的名字会说话",
    category: "艺名笔名主播名",
    content: `
      自媒体时代，一个好名字就是一张最佳名片。艺名、主播名和笔名的取名思路各有不同。
      艺名强调记忆点和辨识度，如"周深"（上周的深度）、"王一博"（唯一的搏击）。
      主播名侧重亲和力和传播性，如"李佳琦"简洁有力，"疯狂小杨哥"带有动作画面感。
      笔名则更注重文艺气质和独特性，如"韩寒"（冷冽）、"八月长安"（诗意）。
      取名技巧：可以使用叠字（如"范冰冰"）、反义组合（如"白夜"）、物品+情感（如"薄荷微凉"）、
      数字+文字（如"七月"）等方式。建议避免过于复杂或存在歧义的名字。
    `
  },
  {
    keywords: ["姓氏起源", "名字寓意", "名字文化"],
    title: "中国姓氏起源与名字文化探源",
    category: "名字文化寓意",
    content: `
      中国姓氏源远流长，承载着中华民族的文化基因。姓氏起源主要分为几大类：以国为氏（如齐、鲁、宋）、
      以封邑为氏（如屈、解）、以官名为氏（如司马、司徒）、以职业为氏（如巫、陶）、
      以居住地为氏（如东郭、西门）。《百家姓》中"赵钱孙李"的排序源于宋代，
      赵为皇姓故排第一。名字文化方面，古人有名有字有号，名是出生时取，字是成年后取，
      号是自取。如李白字太白号青莲居士。现代起名则更注重寓意和个性。一个名字寄托着
      父母对孩子的殷切期望和美好祝愿。
    `
  },
  {
    keywords: ["好名字测试", "名字打分因素"],
    title: "名字测试与打分：什么是一个好名字？",
    category: "名字打分测试",
    content: `
      网上流传的各种名字打分测试，究竟有没有参考价值？一个名字的好坏可以从多个维度来评估。
      一、音韵维度：名字的声调搭配是否和谐，平仄是否错落有致，读起来是否朗朗上口。
      二、字形维度：汉字结构是否平衡，书写是否流畅美观，名字整体的视觉感受。
      三、寓意维度：每个字的含义是否积极正面，组合起来是否有好的整体寓意。
      四、文化维度：是否有文化出处，是否与经典诗词或典故相关。
      五、独特性维度：重名率是否适中，既不过于大众化也不过于生僻。
      六、五行维度：是否与生辰八字相补，五行是否平衡。
      提醒家长，名字打分仅供参考，不必过分迷信。最适合孩子的名字，就是最好的名字。
    `
  }
];

/**
 * 2. 模拟爬取目标网站文章 — 按话题轮换
 * 真实场景下应接入第三方爬虫服务或使用 cheerio 等库
 */
let topicIndex = 0;

async function crawlArticle(keywords) {
  console.log(`[Crawl] 使用关键词: ${keywords.join(", ")}`);

  // 从话题池中按日期轮换选择话题
  // 可基于当天日期决定，保证每天固定一个话题
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
  topicIndex = dayOfYear % TOPIC_POOL.length;

  const poolItem = TOPIC_POOL[topicIndex];

  // 如果指定的关键词与话题池匹配，优先使用匹配的话题
  const matched = TOPIC_POOL.find(p =>
    keywords.some(kw => p.keywords.some(pkw => pkw.includes(kw) || kw.includes(pkw)))
  );

  const target = matched || poolItem;

  console.log(`[Crawl] 命中话题 #${TOPIC_POOL.indexOf(target)}: ${target.title}`);

  return {
    title: target.title,
    content: target.content.trim(),
    sourceUrl: `https://example.com/${encodeURIComponent(target.category)}`,
  };
}

/**
 * 3. 调用 DeepSeek API 进行 AI 改写
 */
async function aiRewrite(originalArticle, writingStyle, category) {
  if (!DEEPSEEK_API_KEY) {
    console.log("[AI] 未配置 DEEPSEEK_API_KEY，使用模拟改写");
    return mockRewrite(originalArticle, writingStyle, category);
  }

  const styleMap = {
    formal: "正式、典雅",
    casual: "通俗易懂、亲切自然",
    professional: "专业严谨、有深度",
  };

  const prompt = `你是一位专业的起名知识博主。请根据以下原文进行深度改写，要求：
1. 保持核心信息，但改变句式结构和表达方式
2. 扩充内容，增加更多实用建议和案例
3. 风格：${styleMap[writingStyle] || "正式"}
4. 生成新标题（吸引眼球的博客标题）
5. 生成 3-5 个 SEO关键词
6. 分类：${category}

原文：
${originalArticle}

请按以下 JSON 格式返回（不要包含其他内容）：
{
  "title": "新标题",
  "content": "改写后的完整文章内容（不少于 800 字）",
  "keywords": ["关键词1", "关键词2", "关键词3"]
}`;

  const res = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!res.ok) throw new Error(`AI API 调用失败: ${res.status}`);
  const data = await res.json();
  
  try {
    return JSON.parse(data.choices[0].message.content);
  } catch {
    // 如果返回的不是 JSON，直接使用原始内容
    return {
      title: "AI 改写文章",
      content: data.choices[0].message.content,
      keywords: [],
    };
  }
}

/**
 * 模拟改写（无 API Key 时使用）
 */
function mockRewrite(original, style, category) {
  const stylePrefix = style === "formal" ? "【正式】" : style === "casual" ? "【通俗】" : "【专业】";
  // 从原文截取前 10 个字作为标题参考
  const topicHint = original.trim().substring(0, 10).replace(/\n/g, "");
  return {
    title: `${stylePrefix}深度解析：${topicHint}... - 全方位指南`,
    content: `# 深度解析：${topicHint}... - 全方位指南

## 为什么这个话题如此重要？

${original}

## 深入分析与实用建议

在当代社会，起名已经不再仅仅是一个简单的标签问题。越来越多的父母和企业开始注重名字的文化内涵和品牌价值。一个好的名字不仅能够让人在人群中脱颖而出，更能够影响自信心和品牌发展。

## 关键要点总结

1. **音韵搭配**：名字的声调搭配要和谐，避免拗口
2. **字形美观**：选择结构均衡、书写美观的汉字
3. **寓意深刻**：名字应该具有积极向上的寓意
4. **文化底蕴**：可以从古典诗词中汲取灵感
5. **避免谐音**：仔细检查是否有不好的谐音

## 结语

起名是一门学问，也是一份责任。希望每一位用户都能找到那个最完美的名字。`,
    keywords: ["起名", "起名技巧", category, "名字寓意", "传统文化"],
  };
}

/**
 * 4. 将文章发布到博客
 */
async function publishPost(postData, requireReview) {
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
    }),
  });

  if (!res.ok) throw new Error(`发布文章失败: ${res.status}`);
  return res.json();
}

/**
 * 5. 记录执行日志
 */
async function saveLog(logData) {
  // 日志通过 auto-blog API 保存
  const res = await fetch(`${API_BASE}/api/admin/auto-blog`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      logEntry: logData,
    }),
  });
  return res.ok;
}

/**
 * 主执行函数
 */
async function executeAutoBlog() {
  const startTime = Date.now();
  console.log(`[AutoBlog] ${new Date().toISOString()} - 开始自动发文任务`);

  try {
    // 1. 获取配置
    const config = await fetchConfig();
    if (!config || !config.isEnabled) {
      console.log("[AutoBlog] 引擎已关闭，跳过执行");
      return { status: "skipped", message: "引擎已关闭" };
    }

    console.log(`[AutoBlog] 配置: 关键词=${config.crawlKeywords?.join(",") || "默认"}, 分类=${config.defaultCategory}, 文风=${config.writingStyle}`);

    // 2. 爬取文章
    const keywords = config.crawlKeywords || ["起名"];
    const article = await crawlArticle(keywords);

    // 3. AI 改写
    console.log("[AutoBlog] 开始 AI 改写...");
    const rewritten = await aiRewrite(article.content, config.writingStyle, config.defaultCategory);
    console.log(`[AutoBlog] 改写完成: ${rewritten.title}`);

    // 4. 发布文章
    console.log("[AutoBlog] 发布文章中...");
    const post = await publishPost({
      title: rewritten.title,
      content: rewritten.content,
      category: config.defaultCategory || "起名知识",
      keywords: rewritten.keywords || [],
    }, config.requireReview);

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`[AutoBlog] 发布成功! ID: ${post.id}, 耗时: ${duration}秒`);

    // 5. 记录日志
    await saveLog({
      sourceUrl: article.sourceUrl,
      sourceTitle: article.title,
      status: "success",
      duration,
      postId: post.id,
    });

    return { status: "success", postId: post.id, duration };
  } catch (error) {
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.error(`[AutoBlog] 执行失败: ${error.message}`);

    await saveLog({
      sourceUrl: "",
      sourceTitle: "",
      status: "failed",
      duration,
      errorMessage: error.message,
    }).catch(() => {});

    return { status: "failed", error: error.message, duration };
  }
}

// 直接执行
executeAutoBlog()
  .then((result) => {
    console.log(`[AutoBlog] 执行结果:`, JSON.stringify(result, null, 2));
    process.exit(result.status === "failed" ? 1 : 0);
  })
  .catch((err) => {
    console.error("[AutoBlog] 未捕获错误:", err);
    process.exit(1);
  });