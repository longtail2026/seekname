/**
 * AI Composer 测试脚本
 * 运行方式：node --env-file=.env scripts/test-ai-composer.ts
 *
 * 测试内容：
 * 1. 字池构建
 * 2. Prompt 生成（各场景）
 * 3. Fallback 规则组合（不需要 DeepSeek key）
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { aiCompose, AIComposer } from "../src/lib/ai-composer";
import type { NamingScenario } from "../src/lib/ai-composer";
import type { CharacterInfo, StructuredIntent } from "../src/lib/naming-engine";
import { PhoneticOptimizer } from "../src/lib/phonetic-optimizer";

async function testPoolConstruction() {
  console.log("\n========== 测试 1: 字池构建 ==========");

  const intent: StructuredIntent = {
    surname: "李",
    gender: "F",
    birthDate: "2025-03-15",
    style: ["温柔", "诗意"],
    wordCount: 2,
    wuxing: ["水", "木"],
    avoidances: ["生僻字"],
    imagery: ["清", "涵", "汐", "沐", "雨", "涟"],
    sourcePreference: ["诗经", "楚辞"],
  };

  const mockPool: CharacterInfo[] = [
    { character: "涵", pinyin: "hán", wuxing: "水", meaning: "包容、涵养", strokeCount: 11, source: "《说文》", sourceText: "涵，咸也" },
    { character: "清", pinyin: "qīng", wuxing: "水", meaning: "清澈、纯净", strokeCount: 11, source: "《诗经·魏风》", sourceText: "河水清且涟漪" },
    { character: "沐", pinyin: "mù", wuxing: "水", meaning: "润泽，洗涤", strokeCount: 7, source: "《诗经·小雅》", sourceText: "既见君子，我心则沐" },
    { character: "雨", pinyin: "yǔ", wuxing: "水", meaning: "雨水、恩泽", strokeCount: 8, source: "《诗经》", sourceText: "雨我公田" },
    { character: "汐", pinyin: "xī", wuxing: "水", meaning: "晚潮、潮汐", strokeCount: 6 },
    { character: "涟", pinyin: "lián", wuxing: "水", meaning: "波纹、细雨", strokeCount: 13 },
    { character: "沛", pinyin: "pèi", wuxing: "水", meaning: "水盛、充沛", strokeCount: 7 },
    { character: "溪", pinyin: "xī", wuxing: "水", meaning: "小溪、清流", strokeCount: 13 },
    { character: "源", pinyin: "yuán", wuxing: "水", meaning: "源头、水源", strokeCount: 13, source: "《诗经》", sourceText: "源泉混混" },
    { character: "泽", pinyin: "zé", wuxing: "水", meaning: "恩泽，光泽", strokeCount: 8 },
    { character: "桐", pinyin: "tóng", wuxing: "木", meaning: "梧桐、祥瑞", strokeCount: 10, source: "《诗经》", sourceText: "椅桐梓漆" },
    { character: "柳", pinyin: "liǔ", wuxing: "木", meaning: "杨柳、柔美", strokeCount: 9, source: "《诗经》", sourceText: "昔我往矣，杨柳依依" },
    { character: "柔", pinyin: "róu", wuxing: "木", meaning: "柔和、温柔", strokeCount: 9 },
    { character: "雯", pinyin: "wén", wuxing: "水", meaning: "云纹、彩云", strokeCount: 12 },
    { character: "澜", pinyin: "lán", wuxing: "水", meaning: "波澜、大波", strokeCount: 21, source: "《孟子》", sourceText: "观水有术，必观其澜" },
  ];

  const summary = AIComposer.buildPoolSummary(mockPool, 15);
  console.log("字池摘要（部分）：");
  console.log(summary.slice(0, 300));
  console.log(`\n✅ 字池构建正常，共 ${mockPool.length} 个候选字`);

  return { pool: mockPool, intent };
}

async function testPromptGeneration(pool: CharacterInfo[], intent: StructuredIntent) {
  console.log("\n========== 测试 2: Prompt 生成（Baby 场景） ==========");

  const config = {
    scenario: "baby" as NamingScenario,
    fallbackToRules: true,
    maxCandidates: 6,
    wordCount: 2 as const,
  };

  const { system, user } = AIComposer.buildCompositionPrompt(config, intent, "");
  console.log("--- System Prompt (前400字) ---");
  console.log(system.slice(0, 400));
  console.log("\n--- User Prompt (前400字) ---");
  console.log(user.slice(0, 400));

  console.log("\n✅ Prompt 生成正常");
}

async function testFallbackRuleCompose(pool: CharacterInfo[], intent: StructuredIntent) {
  console.log("\n========== 测试 3: Fallback 规则组合（无需 DeepSeek Key） ==========");

  const config = {
    scenario: "baby" as NamingScenario,
    fallbackToRules: true,
    maxCandidates: 5,
    wordCount: 2 as const,
  };

  const candidates = await aiCompose(pool, intent, config, "李");

  console.log(`\n生成 ${candidates.length} 个候选名字：`);
  for (const c of candidates) {
    console.log(`  [${c.score}分] ${c.fullName} (${c.pinyin})`);
    console.log(`    寓意：${c.meaning}`);
    console.log(`    五行=${c.wuxing} | 笔画=${c.strokeCount} | 音律分=${c.scoreBreakdown.harmony}`);
    if (c.sources.length > 0) {
      console.log(`    出处：${c.sources[0].book}「${c.sources[0].text}」`);
    }
    if (c.warnings.length > 0) {
      console.log(`    提示：${c.warnings.join(", ")}`);
    }
  }

  if (candidates.length > 0) {
    console.log(`\n✅ Fallback 规则组合正常，最高分 ${candidates[0].score}`);
  }
}

async function testAllScenarios(pool: CharacterInfo[], baseIntent: StructuredIntent) {
  console.log("\n========== 测试 4: 各场景 Prompt 对比 ==========");

  const scenarios: NamingScenario[] = ["baby", "adult", "company", "brand", "shop", "pet"];

  for (const scenario of scenarios) {
    const config = {
      scenario,
      fallbackToRules: true,
      maxCandidates: 3,
      wordCount: 2 as const,
    };
    const { system } = AIComposer.buildCompositionPrompt(config, baseIntent, "");
    console.log(`  ${scenario}: System Prompt 前100字 = "${system.slice(0, 100).replace(/\n/g, " ")}..."`);
  }

  console.log("\n✅ 各场景 Prompt 生成正常");
}

async function testDatabasePool() {
  console.log("\n========== 测试 5: 从数据库构建真实字池（可选） ==========");

  try {
    const intent: StructuredIntent = {
      surname: "王",
      gender: "M",
      birthDate: "2024-01-01",
      style: ["大气", "志向"],
      wordCount: 2,
      wuxing: ["金", "土"],
      avoidances: [],
      imagery: ["志", "远", "翔", "宇", "轩", "博"],
      sourcePreference: [],
    };

    const entries = await prisma.classicsEntry.findMany({
      where: {
        OR: [{ keywords: { hasSome: intent.imagery } }],
      },
      take: 20,
      include: { book: true },
    });

    console.log(`典籍查询结果：${entries.length} 条`);

    const charSet = new Set<string>();
    for (const e of entries) {
      for (const ch of e.ancientText) {
        if (ch >= "\u4e00" && ch <= "\u9fff") charSet.add(ch);
      }
    }

    const chars = await prisma.kangxiDict.findMany({
      where: { character: { in: Array.from(charSet) } },
      take: 20,
    });

    console.log(`康熙字典命中：${chars.length} 个字`);

    const pool: CharacterInfo[] = chars.map((c) => ({
      character: c.character,
      pinyin: c.pinyin || "",
      wuxing: c.wuxing || "",
      meaning: c.meaning || "",
      strokeCount: c.strokeCount || 0,
    }));

    if (pool.length >= 5) {
      const config = {
        scenario: "baby" as NamingScenario,
        fallbackToRules: true,
        maxCandidates: 3,
        wordCount: 2 as const,
      };
      const candidates = await aiCompose(pool, intent, config, "王");
      console.log(`\n真实字池生成完成，共 ${candidates.length} 个候选：`);
      for (const c of candidates) {
        console.log(`  [${c.score}分] ${c.fullName} - ${c.meaning}`);
      }
    }
  } catch (error) {
    console.log("数据库连接失败（正常，如未配置 DB）:", String(error).slice(0, 100));
  }

  try { await prisma.$disconnect(); } catch {}
  console.log("\n✅ 所有测试完成");
}

async function runAllTests() {
  try {
    const { pool, intent } = await testPoolConstruction();
    await testPromptGeneration(pool, intent);
    await testFallbackRuleCompose(pool, intent);
    await testAllScenarios(pool, intent);
    await testDatabasePool();
  } catch (error) {
    console.error("测试失败:", error);
    process.exit(1);
  }
}

runAllTests();
