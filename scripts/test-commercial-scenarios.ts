/**
 * Sprint 5 测试脚本：商业起名三场景
 * 验证公司/品牌/店铺/宠物起名 API + 结果页渲染
 *
 * 用法：npx tsx --env-file=.env scripts/test-commercial-scenarios.ts
 */

import { DeepSeekIntegration } from "../src/lib/deepseek-integration";
import { aiCompose } from "../src/lib/ai-composer";
import type { StructuredIntent } from "../src/lib/ai-composer";

// 模拟数据库中的康熙字典字
const mockCharPool = [
  { character: "明", pinyin: "míng", wuxing: "火", meaning: "光明、聪慧", strokeCount: 8, frequency: 80 },
  { character: "德", pinyin: "dé", wuxing: "火", meaning: "品德、德行", strokeCount: 15, frequency: 55 },
  { character: "信", pinyin: "xìn", wuxing: "金", meaning: "诚信、信念", strokeCount: 9, frequency: 50 },
  { character: "远", pinyin: "yuǎn", wuxing: "土", meaning: "远大、深远", strokeCount: 12, frequency: 45 },
  { character: "腾", pinyin: "téng", wuxing: "火", meaning: "飞腾、上升", strokeCount: 20, frequency: 40 },
  { character: "辉", pinyin: "huī", wuxing: "火", meaning: "光辉、辉煌", strokeCount: 15, frequency: 42 },
  { character: "盛", pinyin: "shèng", wuxing: "金", meaning: "兴盛、盛大", strokeCount: 12, frequency: 38 },
  { character: "瑞", pinyin: "ruì", wuxing: "金", meaning: "吉祥、祥瑞", strokeCount: 14, frequency: 35 },
  { character: "锦", pinyin: "jǐn", wuxing: "金", meaning: "锦绣前程", strokeCount: 16, frequency: 30 },
  { character: "诚", pinyin: "chéng", wuxing: "金", meaning: "真诚、诚信", strokeCount: 14, frequency: 48 },
];

async function testCommercialScenarios() {
  console.log("=".repeat(60));
  console.log("Sprint 5 商业起名测试");
  console.log(`DeepSeek 可用: ${DeepSeekIntegration.isAvailable()}`);
  console.log("=".repeat(60));

  const scenarios: Array<{
    name: string;
    scenario: "company" | "brand" | "shop" | "pet" | "baby" | "adult";
    intent: Partial<StructuredIntent>;
    expectChars: number;
  }> = [
    {
      name: "公司起名",
      scenario: "company",
      intent: { industry: "互联网科技", imagery: ["创新", "科技", "未来"] },
      expectChars: 8,
    },
    {
      name: "品牌起名",
      scenario: "brand",
      intent: { brandTone: ["高端", "优雅"], imagery: ["品质", "格调"] },
      expectChars: 8,
    },
    {
      name: "店铺起名",
      scenario: "shop",
      intent: { industry: "餐饮", imagery: ["温馨", "好记", "美味"] },
      expectChars: 8,
    },
    {
      name: "宠物起名",
      scenario: "pet",
      intent: { petType: "猫", imagery: ["可爱", "呆萌", "灵气"] },
      expectChars: 6,
    },
    {
      name: "个人起名（Baby）",
      scenario: "baby",
      intent: { gender: "M" as "M" | "F", wuxing: ["木", "水"], imagery: ["聪明", "勇敢"] },
      expectChars: 8,
    },
  ];

  const results: Array<{
    scenario: string;
    success: boolean;
    names: string[];
    avgScore: number;
    timeMs: number;
    error?: string;
  }> = [];

  for (const tc of scenarios) {
    const start = Date.now();
    process.stdout.write(`\n[测试] ${tc.name}... `);

    try {
      const fullIntent: StructuredIntent = {
        surname: "测",
        gender: "M",
        birthDate: "2025-01-01",
        style: [],
        wordCount: 2,
        wuxing: [],
        avoidances: [],
        imagery: [],
        sourcePreference: [],
        ...tc.intent,
      } as StructuredIntent;

      const candidates = await aiCompose(
        mockCharPool,
        fullIntent,
        { scenario: tc.scenario, fallbackToRules: true, maxCandidates: 5, wordCount: 2 },
        tc.scenario === "baby" ? "李" : undefined
      );

      const timeMs = Date.now() - start;
      const names: string[] = candidates.map((c: { fullName: string }) => c.fullName);
      const avgScore: number = candidates.length > 0
        ? Math.round(candidates.reduce((s: number, c: { score: number }) => s + c.score, 0) / candidates.length)
        : 0;

      console.log(`✓ ${names.length}个名字，评分=${avgScore}，耗时=${timeMs}ms`);

      if (tc.scenario === "baby") {
        (candidates as Array<{ fullName: string; scoreBreakdown?: Record<string, number> }>).slice(0, 3).forEach((c) => {
          const sb = c.scoreBreakdown || {};
          console.log(`   ${c.fullName} | 文化=${sb.cultural || 0} | 常用度=${sb.popularity || 0} | 音律=${sb.harmony || 0} | 重名=${sb.uniqueness || "?"}`);
        });
      }

      results.push({
        scenario: tc.name,
        success: candidates.length > 0,
        names,
        avgScore,
        timeMs,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`✗ 失败: ${msg}`);
      results.push({
        scenario: tc.name,
        success: false,
        names: [],
        avgScore: 0,
        timeMs: Date.now() - start,
        error: msg,
      });
    }
  }

  // 汇总报告
  console.log("\n" + "=".repeat(60));
  console.log("测试汇总");
  console.log("=".repeat(60));
  results.forEach(r => {
    const status = r.success ? "✅" : "❌";
    console.log(`${status} ${r.scenario}: ${r.names.length}个名字 | 均分=${r.avgScore} | ${r.timeMs}ms`);
    if (r.error) console.log(`   错误: ${r.error}`);
  });

  const passed = results.filter(r => r.success).length;
  console.log(`\n通过率: ${passed}/${results.length} (${Math.round(passed / results.length * 100)}%)`);
}

testCommercialScenarios().catch(console.error);
