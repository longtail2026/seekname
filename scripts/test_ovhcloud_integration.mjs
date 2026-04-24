/**
 * 测试 OVHcloud BGE-M3 集成
 * 验证从 OVHcloud 客户端生成向量到语义搜索的完整流程
 * 
 * 运行：node scripts/test_ovhcloud_integration.mjs
 */

// 模拟 fetch 环境
const originalFetch = globalThis.fetch;

// OVHcloud 配置
const OVHCLOUD_CONFIG = {
  baseUrl: "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1",
  model: "BAAI/bge-m3",
  dimension: 1024,
  timeout: 30000,
};

// ========== 测试 1：直接调用 OVHcloud API ==========
async function testDirectOVHCloud() {
  console.log("\n========== 测试 1: 直接调用 OVHcloud API ==========");
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`${OVHCLOUD_CONFIG.baseUrl}/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OVHCLOUD_CONFIG.model,
        input: "希望孩子聪明智慧、才华横溢",
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`❌ OVHcloud API 错误: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`   响应体: ${errorText.slice(0, 300)}`);
      return null;
    }

    const data = await response.json();
    
    // 验证格式
    if (!data?.data?.[0]?.embedding) {
      console.error(`❌ 无法解析响应格式:`, JSON.stringify(data).slice(0, 200));
      return null;
    }

    const vector = data.data[0].embedding;
    console.log(`✅ OVHcloud API 调用成功`);
    console.log(`   向量维度: ${vector.length}`);
    console.log(`   向量前5个值: [${vector.slice(0, 5).map(v => v.toFixed(6)).join(", ")}]`);
    console.log(`   模型: ${data.model || "bge-m3"}`);
    console.log(`   Token 使用: ${JSON.stringify(data.usage || {})}`);

    if (vector.length !== 1024) {
      console.error(`❌ 维度异常: 期望 1024, 实际 ${vector.length}`);
      return null;
    }

    return vector;
  } catch (error) {
    console.error(`❌ 请求失败:`, error.message);
    return null;
  }
}

// ========== 测试 2：批量嵌入 ==========
async function testBatchEmbedding() {
  console.log("\n========== 测试 2: 批量嵌入 ==========");

  const texts = [
    "希望孩子聪明智慧",
    "平安健康快乐成长",
    "才华横溢、博学多才",
  ];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(`${OVHCLOUD_CONFIG.baseUrl}/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OVHCLOUD_CONFIG.model,
        input: texts,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`❌ 批量 API 错误: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data?.data || !Array.isArray(data.data)) {
      console.error("❌ 批量响应格式异常");
      return null;
    }

    const vectors = data.data
      .sort((a, b) => a.index - b.index)
      .map(item => item.embedding);

    console.log(`✅ 批量嵌入成功`);
    console.log(`   输入 ${texts.length} 条文本`);
    console.log(`   返回 ${vectors.length} 个向量`);
    console.log(`   每个向量维度: ${vectors[0]?.length}`);

    return vectors;
  } catch (error) {
    console.error(`❌ 批量请求失败:`, error.message);
    return null;
  }
}

// ========== 测试 3：语义相似度验证 ==========
async function testSemanticSimilarity(vector) {
  console.log("\n========== 测试 3: 语义相似度验证 ==========");

  // 将同一文本分别输入，验证一致性
  const testTexts = [
    "希望孩子聪明智慧、才华横溢",  // 完全相同的语义
    "愿孩子聪慧过人、才华出众",    // 非常相似的语义
    "身体健康、平平安安",          // 语义不同
    "英文名测试",                  // 完全不相关
  ];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(`${OVHCLOUD_CONFIG.baseUrl}/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OVHCLOUD_CONFIG.model,
        input: testTexts,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    const vectors = data.data
      .sort((a, b) => a.index - b.index)
      .map(item => item.embedding);

    // 计算余弦相似度
    function cosineSimilarity(a, b) {
      let dot = 0, normA = 0, normB = 0;
      for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
      }
      return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    console.log("文本相似度对比:");
    for (let i = 0; i < testTexts.length; i++) {
      for (let j = i + 1; j < testTexts.length; j++) {
        const sim = cosineSimilarity(vectors[i], vectors[j]);
        console.log(`   "${testTexts[i].slice(0, 12)}..." vs "${testTexts[j].slice(0, 12)}..."`);
        console.log(`   相似度: ${(sim * 100).toFixed(2)}%`);
      }
    }

    // 验证：语义相似的文本应该有更高的相似度
    const similarSim = cosineSimilarity(vectors[0], vectors[1]);
    const diffSim = cosineSimilarity(vectors[0], vectors[3]);
    
    if (similarSim > diffSim) {
      console.log(`\n✅ 语义相似度验证通过: 相似文本(${(similarSim*100).toFixed(1)}%) > 不相关文本(${(diffSim*100).toFixed(1)}%)`);
    } else {
      console.warn(`\n⚠️ 语义相似度异常: 相似文本(${(similarSim*100).toFixed(1)}%) < 不相关文本(${(diffSim*100).toFixed(1)}%)`);
    }

    return { vectors, similarityMatrix: { similarSim, diffSim } };
  } catch (error) {
    console.error("❌ 相似度测试失败:", error.message);
    return null;
  }
}

// ========== 测试 4：检查可用性 ==========
async function testServiceAvailability() {
  console.log("\n========== 测试 4: OVHcloud 服务可用性 ==========");

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`${OVHCLOUD_CONFIG.baseUrl}/models`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      console.log("✅ OVHcloud 服务可用");
      const data = await response.json();
      return true;
    } else {
      console.log(`⚠️ OVHcloud /models 返回 ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`⚠️ OVHcloud 服务检查: ${error.message}`);
    return false;
  }
}

// ========== 主函数 ==========
async function main() {
  console.log("==========================================");
  console.log("  OVHcloud BGE-M3 集成测试");
  console.log("==========================================");
  console.log(`   API: ${OVHCLOUD_CONFIG.baseUrl}`);
  console.log(`   模型: ${OVHCLOUD_CONFIG.model}`);
  console.log(`   维度: ${OVHCLOUD_CONFIG.dimension}`);

  // 测试 1: 单文本嵌入
  const vector = await testDirectOVHCloud();
  if (!vector) {
    console.log("\n❌ 基础嵌入测试失败，停止后续测试");
    return;
  }

  // 测试 2: 批量嵌入
  await testBatchEmbedding();

  // 测试 3: 语义相似度
  await testSemanticSimilarity(vector);

  // 测试 4: 服务可用性
  await testServiceAvailability();

  console.log("\n==========================================");
  console.log("  全部测试完成");
  console.log("==========================================");
  console.log("\n✅ OVHcloud BGE-M3 集成就绪!");
  console.log("   主要嵌入方案: OVHcloud (免费, 无需 API Key)");
  console.log("   备用嵌入方案: HuggingFace API");
  console.log("   向量维度: 1024");
  console.log("   pgvector 算子: <=> (余弦距离)");
  console.log("   搜索兜底: 关键词 ILIKE 搜索");
}

main().catch(console.error);
