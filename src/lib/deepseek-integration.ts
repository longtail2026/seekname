/**
 * DeepSeek大模型集成模块
 * 
 * 功能：
 * 1. 意图解析 - 将用户自然语言输入解析为结构化意图
 * 2. 五行推断 - 使用AI推断汉字的五行属性
 * 3. 名字润色 - 对生成的名字进行AI润色和解释
 * 4. 安全过滤 - 使用AI进行更智能的安全检查
 */

import { StructuredIntent, NamingRequest } from "./naming-engine";

// DeepSeek API配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

// 检查API密钥是否可用
export function isDeepSeekAvailable(): boolean {
  return !!DEEPSEEK_API_KEY && DEEPSEEK_API_KEY.length > 0;
}

// 调用DeepSeek API
async function callDeepSeek(
  systemPrompt: string,
  userPrompt: string,
  temperature: number = 0.3,
  maxTokens: number = 1000
): Promise<string> {
  if (!isDeepSeekAvailable()) {
    throw new Error('DeepSeek API密钥未配置');
  }

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature,
        max_tokens: maxTokens,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API错误: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('调用DeepSeek API失败:', error);
    throw error;
  }
}

/**
 * 意图解析 - 将用户自然语言输入解析为结构化意图
 */
export async function parseIntentWithDeepSeek(
  rawInput: string,
  partialIntent?: Partial<StructuredIntent>
): Promise<StructuredIntent> {
  const systemPrompt = `你是一个专业的起名顾问，负责将用户的起名需求解析为结构化数据。

请严格按照以下JSON格式输出，不要添加任何其他内容：

{
  "surname": "姓氏",
  "gender": "M或F",
  "birthDate": "YYYY-MM-DD",
  "birthTime": "时辰（可选）",
  "style": ["风格1", "风格2", ...],
  "wordCount": 2或3,
  "wuxing": ["五行1", "五行2", ...],
  "avoidances": ["禁忌1", "禁忌2", ...],
  "imagery": ["意象1", "意象2", ...],
  "sourcePreference": ["出处1", "出处2", ...],
  "notes": "备注（可选）"
}

规则说明：
1. gender: "M"表示男性，"F"表示女性
2. wordCount: 2表示2字名，3表示3字名
3. wuxing: 只能包含"金"、"木"、"水"、"火"、"土"
4. 如果信息不明确，请根据常识推断
5. 保持数组简洁，最多3-5个元素`;

  const userPrompt = `请解析以下起名需求：

"${rawInput}"

${partialIntent ? `已知部分信息：${JSON.stringify(partialIntent, null, 2)}` : ''}

请输出完整的结构化意图：`;

  try {
    const result = await callDeepSeek(systemPrompt, userPrompt, 0.1, 500);
    
    // 解析JSON响应
    const parsed = JSON.parse(result) as StructuredIntent;
    
    // 验证必要字段
    if (!parsed.surname || !parsed.gender || !parsed.birthDate) {
      throw new Error('DeepSeek返回的意图缺少必要字段');
    }
    
    // 验证gender
    if (!['M', 'F'].includes(parsed.gender)) {
      throw new Error(`无效的gender值: ${parsed.gender}`);
    }
    
    // 验证wordCount
    if (parsed.wordCount !== 2 && parsed.wordCount !== 3) {
      parsed.wordCount = 2; // 默认2字名
    }
    
    // 验证wuxing
    if (parsed.wuxing) {
      parsed.wuxing = parsed.wuxing.filter(w => 
        ['金', '木', '水', '火', '土'].includes(w)
      );
    }
    
    return parsed;
  } catch (error) {
    console.error('DeepSeek意图解析失败:', error);
    
    // 返回默认意图
    return {
      surname: partialIntent?.surname || '张',
      gender: partialIntent?.gender || 'F',
      birthDate: partialIntent?.birthDate || '2025-03-15',
      birthTime: partialIntent?.birthTime,
      style: partialIntent?.style || ['温柔', '诗意'],
      wordCount: partialIntent?.wordCount || 2,
      wuxing: partialIntent?.wuxing || ['水'],
      avoidances: partialIntent?.avoidances || ['生僻字', '复杂字'],
      imagery: partialIntent?.imagery || ['清', '涵', '雨'],
      sourcePreference: partialIntent?.sourcePreference || ['诗经'],
      notes: partialIntent?.notes,
    };
  }
}

/**
 * 五行推断 - 使用AI推断汉字的五行属性
 */
export async function inferWuxingWithDeepSeek(
  character: string,
  context?: {
    meaning?: string;
    pinyin?: string;
    strokeCount?: number;
  }
): Promise<string> {
  const systemPrompt = `你是一个汉字五行分析专家。请准确分析汉字的五行属性。

五行规则：
1. 金：金属、坚硬、锋利、财富、秋天、西方、白色
2. 木：树木、植物、生长、春天、东方、绿色
3. 水：水流、海洋、雨水、冬天、北方、黑色、蓝色
4. 火：火焰、热情、光明、夏天、南方、红色
5. 土：土地、大地、稳定、中央、黄色、厚重

请只返回五行属性（金、木、水、火、土中的一个），不要返回其他内容。`;

  const userPrompt = `请分析汉字"${character}"的五行属性。

${context?.meaning ? `汉字含义：${context.meaning}` : ''}
${context?.pinyin ? `拼音：${context.pinyin}` : ''}
${context?.strokeCount ? `笔画数：${context.strokeCount}` : ''}

请根据汉字的结构、含义、部首等综合判断五行属性。`;

  try {
    const result = await callDeepSeek(systemPrompt, userPrompt, 0.1, 50);
    
    // 清理响应
    const cleaned = result.trim().replace(/[^金木水火土]/g, '');
    
    if (cleaned && ['金', '木', '水', '火', '土'].includes(cleaned[0])) {
      return cleaned[0];
    }
    
    // 如果AI无法确定，根据笔画数推断
    if (context?.strokeCount) {
      const lastDigit = context.strokeCount % 10;
      if ([1, 2].includes(lastDigit)) return '木';
      if ([3, 4].includes(lastDigit)) return '火';
      if ([5, 6].includes(lastDigit)) return '土';
      if ([7, 8].includes(lastDigit)) return '金';
      if ([9, 0].includes(lastDigit)) return '水';
    }
    
    return '木'; // 默认
  } catch (error) {
    console.error(`DeepSeek五行推断失败（${character}）:`, error);
    return '木'; // 默认
  }
}

/**
 * 名字润色 - 对生成的名字进行AI润色和解释
 */
export async function polishNameWithDeepSeek(
  fullName: string,
  givenName: string,
  context: {
    surname: string;
    gender: 'M' | 'F';
    style: string[];
    wuxing: string[];
    imagery: string[];
    sourcePreference: string[];
    characterInfo?: Array<{
      character: string;
      pinyin: string;
      wuxing: string;
      meaning: string;
      strokeCount: number;
    }>;
  }
): Promise<{
  polishedMeaning: string;
  culturalExplanation: string;
  suggestedImprovements?: string[];
}> {
  const systemPrompt = `你是一个专业的起名顾问，负责为生成的名字提供优美的解释和文化内涵。

请按照以下格式输出JSON：

{
  "polishedMeaning": "优美、有文化内涵的名字寓意解释（100字以内）",
  "culturalExplanation": "名字的文化出处和内涵解释（150字以内）",
  "suggestedImprovements": ["改进建议1", "改进建议2"]（可选）
}

要求：
1. 寓意解释要优美、有诗意，符合用户要求的风格
2. 文化解释要引用经典典籍或传统文化
3. 改进建议要具体、有建设性
4. 整体要专业、温暖、有文化底蕴`;

  const userPrompt = `请为名字"${fullName}"（姓氏：${context.surname}，名字：${givenName}）提供润色和解释。

用户需求：
- 性别：${context.gender === 'M' ? '男' : '女'}
- 风格偏好：${context.style.join('、')}
- 五行需求：${context.wuxing.join('、')}
- 意象偏好：${context.imagery.join('、')}
- 出处偏好：${context.sourcePreference.join('、')}

${context.characterInfo ? `
名字用字信息：
${context.characterInfo.map(char => 
  `- "${char.character}"：拼音${char.pinyin}，五行${char.wuxing}，含义"${char.meaning}"，${char.strokeCount}画`
).join('\n')}
` : ''}

请提供优美的名字解释和文化内涵：`;

  try {
    const result = await callDeepSeek(systemPrompt, userPrompt, 0.5, 800);
    
    // 解析JSON响应
    const parsed = JSON.parse(result);
    
    return {
      polishedMeaning: parsed.polishedMeaning || `${givenName}，寓意美好`,
      culturalExplanation: parsed.culturalExplanation || '源自传统文化，寓意深远',
      suggestedImprovements: parsed.suggestedImprovements,
    };
  } catch (error) {
    console.error(`DeepSeek名字润色失败（${fullName}）:`, error);
    
    return {
      polishedMeaning: `${givenName}，寓意美好，符合${context.style.join('、')}的风格`,
      culturalExplanation: `名字${givenName}源自中国传统文化，${context.sourcePreference.length > 0 ? `参考了${context.sourcePreference.join('、')}的意境` : '寓意深远，音韵和谐'}`,
    };
  }
}

/**
 * 安全过滤 - 使用AI进行更智能的安全检查
 */
export async function checkSafetyWithDeepSeek(
  name: string,
  context?: {
    pinyin?: string;
    characters?: string[];
  }
): Promise<{
  isSafe: boolean;
  safetyLevel: 'high' | 'medium' | 'low';
  warnings: string[];
  suggestions?: string[];
}> {
  const systemPrompt = `你是一个名字安全审查专家，负责检查名字是否存在安全隐患。

安全隐患包括：
1. 不雅谐音（普通话、方言）
2. 负面含义谐音
3. 政治敏感
4. 文化禁忌
5. 不吉利组合

请按照以下格式输出JSON：

{
  "isSafe": true/false,
  "safetyLevel": "high"/"medium"/"low",
  "warnings": ["警告1", "警告2"],
  "suggestions": ["建议1", "建议2"]（可选）
}

评估标准：
- high：完全安全，无任何问题
- medium：有轻微问题，但可以接受
- low：有明显问题，建议修改`;

  const userPrompt = `请检查名字"${name}"的安全性。

${context?.pinyin ? `拼音：${context.pinyin}` : ''}
${context?.characters ? `单字：${context.characters.join('、')}` : ''}

请从以下角度全面检查：
1. 普通话谐音
2. 常见方言谐音（粤语、闽南语等）
3. 多音字负面含义
4. 文化禁忌
5. 现代网络用语联想

请给出专业评估：`;

  try {
    const result = await callDeepSeek(systemPrompt, userPrompt, 0.2, 500);
    
    // 解析JSON响应
    const parsed = JSON.parse(result);
    
    return {
      isSafe: parsed.isSafe !== false,
      safetyLevel: parsed.safetyLevel || 'high',
      warnings: parsed.warnings || [],
      suggestions: parsed.suggestions,
    };
  } catch (error) {
    console.error(`DeepSeek安全检查失败（${name}）:`, error);
    
    // 默认返回安全
    return {
      isSafe: true,
      safetyLevel: 'high',
      warnings: [],
    };
  }
}

/**
 * 批量五行推断 - 为多个汉字推断五行
 */
export async function batchInferWuxing(
  characters: string[],
  contextMap?: Map<string, { meaning?: string; pinyin?: string; strokeCount?: number }>
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  
  // 分批处理，避免API限制
  const batchSize = 10;
  for (let i = 0; i < characters.length; i += batchSize) {
    const batch = characters.slice(i, i + batchSize);
    
    // 为每个字符创建promise
    const promises = batch.map(async (char) => {
      const context = contextMap?.get(char);
      const wuxing = await inferWuxingWithDeepSeek(char, context);
      return { char, wuxing };
    });
    
    // 等待批次完成
    const batchResults = await Promise.allSettled(promises);
    
    // 处理结果
    batchResults.forEach((resultItem) => {
      if (resultItem.status === 'fulfilled') {
        result.set(resultItem.value.char, resultItem.value.wuxing);
      }
    });
    
    // 避免速率限制
    if (i + batchSize < characters.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return result;
}

// 导出工具函数
export const DeepSeekIntegration = {
  isAvailable: isDeepSeekAvailable,
  parseIntent: parseIntentWithDeepSeek,
  inferWuxing: inferWuxingWithDeepSeek,
  polishName: polishNameWithDeepSeek,
  checkSafety: checkSafetyWithDeepSeek,
  batchInferWuxing: batchInferWuxing,
  callRaw: callDeepSeek,
};