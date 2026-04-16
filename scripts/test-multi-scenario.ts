/**
 * 多场景 API 测试脚本
 *
 * 用法：
 *   cd C:\seekname
 *   npx tsx --env-file=.env scripts/test-multi-scenario.ts
 *
 * 说明：
 *   - 自动遍历 6 个场景测试 API
 *   - 对比 AI Composer vs 传统规则生成
 *   - 打印每个场景的生成结果和评分
 */

import * as fs from "fs";
import * as path from "path";

const BASE_URL = "http://localhost:3000";
const API_PATH = "/api/name/generate";

// 6 个场景的测试用例
const SCENARIOS = [
  {
    name: "宝宝起名（baby）",
    category: "baby",
    body: {
      surname: "张",
      gender: "F",
      birthDate: "2025-03-15",
      expectations: "温柔、诗意、古典",
      style: "诗意",
      category: "baby",
      useAiComposer: true,
    },
  },
  {
    name: "宝宝起名（男，baby）",
    category: "baby",
    body: {
      surname: "李",
      gender: "M",
      birthDate: "2024-08-20",
      expectations: "勇敢、智慧、阳光",
      style: "大气",
      category: "baby",
      useAiComposer: true,
    },
  },
  {
    name: "成人改名（adult）",
    category: "adult",
    body: {
      surname: "王",
      gender: "M",
      birthDate: "1990-05-10",
      expectations: "稳重、专业、有气场",
      style: "大气稳重",
      category: "adult",
      useAiComposer: true,
    },
  },
  {
    name: "公司起名（company）",
    category: "company",
    body: {
      surname: "",
      gender: "M",
      birthDate: "2024-01-01",
      expectations: "科技、创新、未来",
      category: "company",
      useAiComposer: true,
    },
  },
  {
    name: "品牌起名（brand）",
    category: "brand",
    body: {
      surname: "",
      gender: "M",
      birthDate: "2024-01-01",
      expectations: "年轻、活力、时尚",
      category: "brand",
      useAiComposer: true,
    },
  },
  {
    name: "宠物起名（pet）",
    category: "pet",
    body: {
      surname: "",
      gender: "M",
      birthDate: "2024-01-01",
      expectations: "可爱、呆萌、好叫",
      category: "pet",
      useAiComposer: true,
    },
  },
];

async function callAPI(
  body: Record<string, any>,
  label: string
): Promise<{ duration: number; success: boolean; names?: any[]; error?: string; scenario?: string }> {
  const start = Date.now();

  try {
    const response = await fetch(`${BASE_URL}${API_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const json = await response.json();
    const duration = Date.now() - start;

    if (!response.ok || !json.success) {
      return { duration, success: false, error: json.error || `HTTP ${response.status}` };
    }

    return {
      duration,
      success: true,
      names: json.data?.names || [],
      scenario: json.data?.scenario,
    };
  } catch (err: any) {
    return { duration, success: false, error: err.message };
  }
}

function printDivider(title: string) {
  console.log("\n" + "═".repeat(70));
  console.log("  " + title);
  console.log("═".repeat(70));
}

function printName(name: any, index: number) {
  const score = name.score !== undefined ? `[${name.score}分]` : "";
  const source = name.source ? `📖 ${name.source.book}: ${name.source.text}` : "";
  console.log(`  ${index + 1}. ${name.name} ${name.pinyin || ""} ${score}`);
  console.log(`     五行: ${name.wuxing || "-"} | 笔画: ${name.strokeCount || "-"}`);
  console.log(`     寓意: ${name.meaning || "-"}`);
  if (source) console.log(`     ${source}`);
}

async function main() {
  console.log("\n🧪 寻名网 - 多场景 API 测试");
  console.log(`📡 目标: ${BASE_URL}${API_PATH}`);
  console.log(`⏱️  时间: ${new Date().toLocaleString("zh-CN")}`);

  // 检查服务是否可用
  try {
    const healthRes = await fetch(`${BASE_URL}/api/db-test`);
    if (!healthRes.ok) {
      console.error("\n⚠️  服务似乎未启动，请先运行：npm run dev");
      process.exit(1);
    }
  } catch {
    console.error("\n⚠️  无法连接到 http://localhost:3000，请确保开发服务器正在运行。");
    console.error("   运行：cd C:\\seekname && npm run dev");
    process.exit(1);
  }

  const results: Array<{
    name: string;
    category: string;
    success: boolean;
    duration: number;
    count: number;
    topScore: number;
    error?: string;
  }> = [];

  // ── 测试每个场景 ──
  for (const tc of SCENARIOS) {
    printDivider(`场景 ${tc.category}: ${tc.name}`);

    console.log("📤 请求参数:");
    console.log(JSON.stringify(tc.body, null, 2));

    const result = await callAPI(tc.body, tc.name);

    if (!result.success) {
      console.log(`\n  ❌ 失败: ${result.error}`);
      results.push({
        name: tc.name,
        category: tc.category,
        success: false,
        duration: result.duration,
        count: 0,
        topScore: 0,
        error: result.error,
      });
      continue;
    }

    const names = result.names || [];
    const topScore = names[0]?.score || 0;

    console.log(`\n  ✅ 成功 | 耗时 ${result.duration}ms | 生成 ${names.length} 个名字`);
    console.log("\n  📋 生成结果:");
    names.slice(0, 5).forEach((n, i) => printName(n, i));

    results.push({
      name: tc.name,
      category: tc.category,
      success: true,
      duration: result.duration,
      count: names.length,
      topScore,
    });
  }

  // ── 对比测试：AI Composer vs 传统规则 ──
  printDivider("对比测试：AI Composer vs 传统规则");

  const compareBody = {
    surname: "刘",
    gender: "M",
    birthDate: "2023-11-08",
    expectations: "聪明、勇敢、稳重",
    style: "大气",
    category: "baby",
  };

  const [aiResult, ruleResult] = await Promise.all([
    callAPI({ ...compareBody, useAiComposer: true }, "AI Composer"),
    callAPI({ ...compareBody, useAiComposer: false }, "传统规则"),
  ]);

  console.log("\n📊 对比结果:");
  console.log(`  AI Composer  : ${aiResult.success ? `✅ ${aiResult.duration}ms | ${aiResult.names?.length || 0}个名字 | 最高分 ${aiResult.names?.[0]?.score || "-"}` : "❌ " + aiResult.error}`);
  console.log(`  传统规则生成: ${ruleResult.success ? `✅ ${ruleResult.duration}ms | ${ruleResult.names?.length || 0}个名字 | 最高分 ${ruleResult.names?.[0]?.score || "-"}` : "❌ " + ruleResult.error}`);

  // ── 汇总报告 ──
  printDivider("测试汇总");

  const passed = results.filter((r) => r.success).length;
  const avgDuration = Math.round(
    results.reduce((s, r) => s + r.duration, 0) / results.length
  );
  const avgScore = Math.round(
    results.filter((r) => r.success && r.topScore > 0).reduce((s, r) => s + r.topScore, 0) /
    results.filter((r) => r.success && r.topScore > 0).length
  );

  console.log(`
  📊 总体统计:
     通过率: ${passed}/${results.length} (${Math.round((passed / results.length) * 100)}%)
     平均耗时: ${avgDuration}ms
     平均最高分: ${avgScore}分

  📋 详细结果:
  `);

  results.forEach((r) => {
    const status = r.success ? "✅" : "❌";
    const scoreStr = r.topScore > 0 ? `${r.topScore}分` : "-";
    console.log(`  ${status} ${r.category.padEnd(8)} ${r.name.padEnd(20)} ${r.duration}ms | ${r.count}个 | 最高${scoreStr}`);
  });

  console.log("\n" + "═".repeat(70));
  console.log("  测试完成！");
  console.log("═".repeat(70) + "\n");
}

main().catch((err) => {
  console.error("测试脚本异常:", err);
  process.exit(1);
});
