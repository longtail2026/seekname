/**
 * test-name-scorer.ts - Sprint 4：评分真实化测试脚本
 *
 * 测试四个维度：
 *  1. 文化分 - 查询典籍出处
 *  2. 常用度 - 查询字频表
 *  3. 重名风险 - 查询真实人名数据库
 *  4. 音律分 - phonetic-optimizer
 */

import "dotenv/config";
import {
  queryCulturalSource,
  queryPopularity,
  queryUniqueness,
  computeRealScores,
} from "../src/lib/name-scorer";
import { evaluatePhoneticQuality } from "../src/lib/phonetic-optimizer";
import type { CharacterInfo } from "../src/lib/naming-engine";

async function testCultural() {
  console.log("\n========== 1. 文化分测试 ==========");

  const testCases = [
    [{ character: "沐", pinyin: "mu4", wuxing: "水", meaning: "沐浴" } as CharacterInfo],
    [{ character: "涵", pinyin: "han2", wuxing: "水", meaning: "包含" } as CharacterInfo],
    [{ character: "诗", pinyin: "shi1", wuxing: "金", meaning: "诗歌" } as CharacterInfo],
    [{ character: "晴", pinyin: "qing2", wuxing: "火", meaning: "晴天" } as CharacterInfo],
    [{ character: "泽", pinyin: "ze2", wuxing: "水", meaning: "恩泽" } as CharacterInfo],
  ];

  for (const chars of testCases) {
    const result = await queryCulturalSource(chars);
    console.log(
      `  ${chars.map((c) => c.character).join("")} | ` +
        `典故=${result.found ? "✅ " + result.bookName : "❌ 无"} | ` +
        `文化分=${result.matchScore}`
    );
    if (result.found) {
      console.log(
        `  原文：${result.ancientText.slice(0, 40)}...`
      );
    }
  }
}

async function testPopularity() {
  console.log("\n========== 2. 常用度测试 ==========");

  const testCases = [
    [{ character: "华", pinyin: "hua2" } as CharacterInfo, { character: "明", pinyin: "ming2" } as CharacterInfo],
    [{ character: "沐", pinyin: "mu4" } as CharacterInfo, { character: "涵", pinyin: "han2" } as CharacterInfo],
    [{ character: "子", pinyin: "zi3" } as CharacterInfo, { character: "轩", pinyin: "xuan1" } as CharacterInfo],
    [{ character: "鑫", pinyin: "xin1" } as CharacterInfo, { character: "焱", pinyin: "yan4" } as CharacterInfo],
  ];

  for (const chars of testCases) {
    const result = await queryPopularity(chars);
    const charStr = chars.map((c) => c.character).join("");
    const freqDetails = result.charFreqs
      .map((cf) => `${cf.char}=${cf.freq}次(第${cf.freqRank})`)
      .join(" | ");
    console.log(
      `  ${charStr} | 字频均值=${result.avgFreq} | ` +
        `排名均值=${result.avgRank} | ` +
        `常用分=${result.popularityScore} | 生僻分=${result.rarityScore}`
    );
    console.log(`  详情：${freqDetails}`);
  }
}

async function testUniqueness() {
  console.log("\n========== 3. 重名风险测试 ==========");

  const testCases = [
    { fullName: "张伟", givenName: "伟", surname: "张" },
    { fullName: "王芳", givenName: "芳", surname: "王" },
    { fullName: "李浩然", givenName: "浩然", surname: "李" },
    { fullName: "赵子轩", givenName: "子轩", surname: "赵" },
    { fullName: "钱沐涵", givenName: "沐涵", surname: "钱" },
    { fullName: "孙鑫焱", givenName: "鑫焱", surname: "孙" },
  ];

  for (const { fullName, givenName, surname } of testCases) {
    const result = await queryUniqueness(fullName, givenName, surname);
    console.log(
      `  ${fullName} | 全名=${result.fullNameCount}次 | ` +
        `名=${result.givenNameCount}次 | ` +
        `风险=${result.homophoneRisk} | ` +
        `独=${result.uniquenessScore} | ${result.rarityLabel}`
    );
  }
}

async function testPhonetic() {
  console.log("\n========== 4. 音律分测试 ==========");

  const testCases = [
    [{ character: "林", pinyin: "lin2" }, { character: "雨", pinyin: "yu3" }] as CharacterInfo[],
    [{ character: "程", pinyin: "cheng2" }, { character: "墨", pinyin: "mo4" }] as CharacterInfo[],
    [{ character: "沐", pinyin: "mu4" }, { character: "涵", pinyin: "han2" }] as CharacterInfo[],
  ];

  for (const chars of testCases) {
    const result = evaluatePhoneticQuality(chars);
    console.log(
      `  ${chars.map((c) => c.character).join("")} | ` +
        `总分=${result.overallScore} | ` +
        `平仄=${result.breakdown.pingze} 声=${result.breakdown.initialHarmony} 韵=${result.breakdown.finalHarmony || "?"} 流畅=${result.breakdown.toneFluency} 方言=${result.breakdown.dialectSafety}`
    );
    if (result.warnings.length > 0) {
      console.log(`  警告：${result.warnings.join(", ")}`);
    }
  }
}

async function testIntegration() {
  console.log("\n========== 5. 完整集成测试（模拟候选名） ==========");

  const mockCandidate = {
    fullName: "张沐涵",
    givenName: "沐涵",
    pinyin: "mu4 han2",
    wuxing: "水水",
    meaning: "沐浴涵养",
    strokeCount: 20,
    score: 0,
    scoreBreakdown: {
      cultural: 0,
      popularity: 0,
      harmony: 0,
      safety: 85,
      overall: 0,
    },
    sources: [],
    warnings: [],
    uniqueness: "medium" as const,
  };

  console.log("  输入候选名：张沐涵");
  const result = await computeRealScores(mockCandidate, "F");

  console.log("\n  评分结果：");
  console.log(`    综合分：${result.score}`);
  console.log(`    文化分：${result.scoreBreakdown.cultural}`);
  console.log(`    常用度：${result.scoreBreakdown.popularity}`);
  console.log(`    音律分：${result.scoreBreakdown.harmony}`);
  console.log(`    重名风险：${result.uniqueness}`);
  console.log(`    来源：${result.sources.length > 0 ? result.sources.map((s) => s.book).join(", ") : "无典故"}`);
  console.log(`    警告：${result.warnings.length > 0 ? result.warnings.join(", ") : "无"}`);
}

async function main() {
  console.log("========================================");
  console.log("  Sprint 4：评分真实化测试");
  console.log("========================================");

  const start = Date.now();

  await testCultural();
  await testPopularity();
  await testUniqueness();
  await testPhonetic();
  await testIntegration();

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n✅ 全部测试完成，耗时 ${elapsed}s`);
}

main().catch(console.error);
