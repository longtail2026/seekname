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
 * 2. 模拟爬取目标网站文章
 * 真实场景下应接入第三方爬虫服务或使用 cheerio 等库
 * 这里实现一个模拟爬取，返回占位文本
 */
async function crawlArticle(keywords) {
  console.log(`[Crawl] 使用关键词: ${keywords.join(", ")}`);
  
  // TODO: 替换为真实爬虫逻辑
  // 示例：使用 fetch 爬取百度搜索或指定源站
  const mockArticle = `
    给宝宝取名字是每个家庭的头等大事。一个好的名字不仅要有美好的寓意，还要考虑到音韵、字形、五行等多方面因素。
    在中国传统文化中，名字承载着父母对孩子的期望和祝福。很多家长会选择从诗词歌赋中寻找灵感，
    或者根据孩子的生辰八字来起名。近年来，越来越多的年轻父母开始关注名字的独特性和时尚感，
    既要有文化底蕴，又要避免过于传统和老气。
    起名时还需要注意以下几点：避免使用生僻字、注意名字的谐音问题、考虑名字的笔画数理、
    以及名字与姓氏的搭配是否和谐。建议家长们在确定名字之前，多念几遍，听听看是否顺口。
    此外，还可以结合生肖喜用字来起名，比如属狗的孩子适合用带有"宀"、"冖"等部首的字，
    寓意有家有依靠。总之，起名是一项需要慎重对待的大事，值得花时间和心思。
  `;
  
  return {
    title: "宝宝起名注意事项与技巧大全",
    content: mockArticle.trim(),
    sourceUrl: "https://example.com/baby-naming-tips",
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
  return {
    title: `${stylePrefix}深度解析：宝宝起名全攻略 - 从传统到现代`,
    content: `# 深度解析：宝宝起名全攻略

## 为什么起名如此重要？

${original}

## 现代起名的趋势

在当代社会，起名已经不再仅仅是一个简单的标签问题。越来越多的父母开始注重名字的文化内涵和个性化表达。一个好的名字不仅能够让孩子在人群中脱颖而出，更能够影响孩子的自信心和人格发展。

## 实用起名建议

1. **音韵搭配**：名字的声调搭配要和谐，避免拗口
2. **字形美观**：选择结构均衡、书写美观的汉字
3. **寓意深刻**：名字应该具有积极向上的寓意
4. **文化底蕴**：可以从古典诗词中汲取灵感
5. **避免谐音**：仔细检查是否有不好的谐音

## 结语

起名是一门学问，也是一份责任。希望每一位父母都能为孩子找到那个最完美的名字。`,
    keywords: ["宝宝起名", "起名技巧", "起名注意事项", "名字寓意", "传统文化"],
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