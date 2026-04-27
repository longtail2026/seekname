/**
 * 直接测试 buildAIPrompt 生成的提示词（纯 JS，不依赖 TS 编译）
 * 输入参数：surname=王, gender=F, expectations=平安健康,聪明智慧,品德高尚
 *         intentions=["平安健康","聪明智慧","品德高尚"]
 *         styles=["古风典雅","清新自然","温柔婉约","诗意浪漫"]
 */

// 手动复制 buildAIPrompt 逻辑（纯 JS 版本，方便调试查看）
// 原始逻辑在 src/lib/semantic-naming-engine.ts ~line 150-250
function buildAiPrompt(request, matches) {
  const {
    surname = "张",
    gender = "F",
    expectations = "平安健康，聪明智慧",
    style = ["古风典雅"],
    wordCount = 2,
  } = request;

  // 确定策略（简化：不引入 strategy 模块，直接硬编码为古风典雅）
  const strategy = "CLASSICAL";

  // 策略对应的 prompt 块（简化，仅用于展示）
  const strategyPromptBlock = 
    strategy === "CLASSICAL"
      ? "【策略：古典原字优先】优先选用古籍原字，以传统汉字写法呈现名字，保留古风韵味。"
      : strategy === "MODERN"
        ? "【策略：现代实用优先】优先选用现代常用字，避免生僻字，确保名字易于识读和书写。"
        : "【策略：古今双轨展示】同时提供古籍原字和现代同义字两种版本，兼顾古典韵味和现代实用性。";

  const strategyLabel = 
    strategy === "CLASSICAL" ? "古典原字优先" :
    strategy === "MODERN" ? "现代实用优先" : "古今双轨展示";

  const genderText = gender === "M" ? "男" : "女";
  const styleText = style.join("，");

  // ─── 降级模式 ───
  if (matches.length === 0) {
    return {
      name: "无典籍匹配·降级模式",
      prompt: `你是一位专业的中文起名专家。
请根据以下客户需求，生成50个中文名字（每个名字${wordCount}个字）。

${strategyPromptBlock}

客户需求：
- 性别：【${genderText}】
- 姓氏：【${surname}】
- 期望寓意：【${expectations}】
- 风格偏好：【${styleText}】

输出格式：用Markdown表格，列包括：序号、名字、拼音、寓意说明、选字理由、典籍出处

注意：
1. 【核心】名字应该像一个完整的词语，有画面感和诗意，不能是简单的好字堆砌。例如"若溪"（如同溪流）是好的，"智仁"（智慧+仁义）是两个抽象字的机械拼接、效果差；
2. 优先选择寓意美好的实词组合（如"语晴""沐晨""书瑶"），而非抽象概念的拼接；
3. 注意声调平仄搭配，读起来朗朗上口；
4. 拼音要准确，带声调标注；
5. 寓意说明要具体、有诗意；
6. 【关键】选字理由必须点名每个字取自哪部典籍哪篇哪段，且必须带引号引用该段原文（如：庄字出自《礼记·乐记》"故听其雅、颂之声，志意得广焉；执其干戚，习其俯仰诎伸，容貌得庄焉；"）；
7. 典籍出处必须精确到篇章名和原句，不能只说"出自《诗经》"这种笼统表述，也不能只写"象征坚强不屈"却不引用原文；
8. 名字要体现性别特点：男名宜用刚健、宏大、英武类字，女名宜用柔美、温婉、秀丽类字；
9. 【重要】每个名字的出处不能重复：请确保50个名字的出处覆盖不同的典籍篇章；
10. 【关键一致性检查】选字理由中引用的每个字（如"庄"字出自…"庄"）必须确实存在于"名字"列中。名字不含的字，理由里不能引用。`
    };
  }

  // ─── 有典籍匹配 ───
  const classicsInfo = matches
    .slice(0, 5)
    .map(
      (match, index) =>
        `${index + 1}. 《${match.bookName}》: "${match.ancientText}" (${match.modernText || "现代释义"})`
    )
    .join("\n");

  return {
    name: "有典籍匹配",
    prompt: `你是一位专业的中文起名专家。
请根据以下客户需求，生成50个中文名字（每个名字${wordCount}个字）。

${strategyPromptBlock}

客户需求：
- 性别：【${genderText}】
- 姓氏（可选）：【${surname}】
- 期望寓意：【${expectations}】
- 风格偏好：【${styleText}】
- 当前策略：【${strategyLabel}】

参考典籍（这些典籍已经语义匹配到与客户需求相关，请优先从中提取）：
${classicsInfo}

输出格式：用Markdown表格，列包括：序号、名字、拼音、寓意说明、选字理由、典籍出处

注意：
1. 名字要优美、有文化内涵，符合客户性别和风格偏好
2. 拼音要准确，带声调标注
3. 寓意说明要具体、有诗意
4. 【关键】选字理由必须点名每个字取自哪部典籍哪篇哪段，且必须带引号引用该段原文（如：庄字出自《礼记·乐记》"故听其雅、颂之声，志意得广焉；执其干戚，习其俯仰诎伸，容貌得庄焉；"）；
5. 典籍出处必须精确到篇章名和原句，不能只说"出自《诗经》"这种笼统表述，也不能只写"象征坚强不屈"却不引用原文；
6. 名字要体现性别特点：男名宜用刚健、宏大、英武类字，女名宜用柔美、温婉、秀丽类字；
7. 【重要】每个名字的出处不能重复：请确保50个名字的出处覆盖不同的典籍篇章；
8. 【核心】名字应该像一个完整的词语，有画面感和诗意，不能是简单的好字堆砌。例如"若溪"（如同溪流）是好的，"智仁"（智慧+仁义）是两个抽象字的机械拼接、效果差；
9. 优先选择寓意美好的实词组合（如"语晴""沐晨""书瑶"），而非抽象概念的拼接；
10. 注意声调平仄搭配，读起来朗朗上口；
11. 【关键一致性检查】选字理由中引用的每个字（如"庄"字出自…"庄"）必须确实存在于"名字"列中。名字不含的字，理由里不能引用。`
  };
}

// ============================================================
// 测试参数
// ============================================================
const request = {
  surname: "王",
  gender: "F",
  expectations: "平安健康,聪明智慧,品德高尚",
  style: ["古风典雅", "清新自然", "温柔婉约", "诗意浪漫"],
  wordCount: 2,
};

// 模拟无典籍匹配
console.log("\n" + "=".repeat(72));
console.log("  [场景一] 无典籍匹配（降级模式）");
console.log("=".repeat(72));
const result1 = buildAiPrompt(request, []);
console.log(result1.prompt);

// 模拟有典籍匹配
const mockMatches = [
  {
    id: 1,
    bookName: "礼记·曲礼",
    ancientText: "人有礼则安，无礼则危。故曰：礼者不可不学也。",
    modernText: "人有礼仪就能平安，没有礼仪就危险。所以说礼是不能不学的。",
    similarity: 0.92,
    extractedChars: ["礼", "安", "学"],
    meaning: "平安，礼仪",
  },
  {
    id: 2,
    bookName: "礼记·中庸",
    ancientText: "中也者，天下之大本也；和也者，天下之达道也。致中和，天地位焉，万物育焉。",
    modernText: "中是天下的大根本；和是天下的通途。达到中和，天地各安其位，万物生长化育。",
    similarity: 0.88,
    extractedChars: ["中", "和", "安"],
    meaning: "中正平和，万物和谐",
  },
  {
    id: 3,
    bookName: "周易·乾卦",
    ancientText: "天行健，君子以自强不息。",
    modernText: "天道运行刚健有力，君子应该效法天道，自强不息。",
    similarity: 0.85,
    extractedChars: ["健", "强"],
    meaning: "自强不息，刚健有为",
  },
  {
    id: 4,
    bookName: "诗经·卫风·淇奥",
    ancientText: "有匪君子，如切如磋，如琢如磨。瑟兮僩兮，赫兮咺兮。",
    modernText: "有位文雅的君子，像切磋骨器、琢磨玉器那样精进。庄严啊，显赫啊。",
    similarity: 0.82,
    extractedChars: ["君", "琢", "磨"],
    meaning: "君子如玉，精雕细琢",
  },
  {
    id: 5,
    bookName: "论语·学而",
    ancientText: "学而时习之，不亦说乎？有朋自远方来，不亦乐乎？人不知而不愠，不亦君子乎？",
    modernText: "学习并时常温习，不是很愉快吗？有朋友从远方来，不是很快乐吗？",
    similarity: 0.80,
    extractedChars: ["学", "乐", "君"],
    meaning: "学习之乐，君子之风",
  },
];

console.log("\n" + "=".repeat(72));
console.log("  [场景二] 有典籍匹配（主路径）");
console.log("=".repeat(72));
const result2 = buildAiPrompt(request, mockMatches);
console.log(result2.prompt);
