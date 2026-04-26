/**
 * 硬性过滤模块测试脚本
 * 测试 5 条过滤规则是否按预期工作
 */
import { hardFilterNames, summarizeRemoved } from "./src/lib/hard-filter";

interface TestName {
  name: string;
  givenName: string;
  pinyin: string;
  meaning: string;
  reason: string;
  source: string;
  strategyType?: string;
}

const names: TestName[] = [
  // ── 应通过（正常名字） ──
  { name: "张伟", givenName: "伟", pinyin: "wěi", meaning: "伟大", reason: "取自《诗经》", source: "《诗经》" },
  { name: "李明", givenName: "明", pinyin: "míng", meaning: "光明", reason: "取自《周易》", source: "《周易》" },
  { name: "王浩然", givenName: "浩然", pinyin: "hào rán", meaning: "浩然正气", reason: "取自《孟子》", source: "《孟子》" },
  { name: "陈思远", givenName: "思远", pinyin: "sī yuǎn", meaning: "思虑深远", reason: "取自《论语》", source: "《论语》" },
  { name: "张伟伟", givenName: "伟伟", pinyin: "wěi wěi", meaning: "伟大", reason: "重名测试", source: "《诗经》" },

  // ── 应淘汰 ──
  // 规则1: 生僻字（龘不在GB2312一级字库）
  { name: "张龘龘", givenName: "龘龘", pinyin: "dá dá", meaning: "龙腾", reason: "笔画过多测试", source: "《诗经》" },

  // 规则2: 负面含义（"恶"、"病"、"毒"是敏感字）
  { name: "张恶", givenName: "恶", pinyin: "è", meaning: "凶恶", reason: "负面含义测试", source: "《诗经》" },
  { name: "张病毒", givenName: "病毒", pinyin: "bìng dú", meaning: "生命力", reason: "敏感词测试", source: "《诗经》" },

  // 规则3: 谐音避讳（史真香→屎真香，需传surname:"史"才触发）
  { name: "史真香", givenName: "真香", pinyin: "zhēn xiāng", meaning: "真实芬芳", reason: "谐音测试", source: "《诗经》" },

  // 规则5: 笔画极端
  { name: "张一一", givenName: "一一", pinyin: "yī yī", meaning: "一一", reason: "笔画过少测试", source: "《诗经》" },

  // 另外测试（䶮为生僻字，但不在测试范围，仅保留观察）
  { name: "王变婷", givenName: "变婷", pinyin: "biàn tíng", meaning: "变美", reason: "谐音测试", source: "《诗经》" },
];

function main() {
  console.log("═══════════════════════════════════════════");
  console.log("       硬性过滤模块测试 v2（修复验证）");
  console.log("═══════════════════════════════════════════\n");

  // ── 测试1: 硬性过滤（无姓氏参数） ──
  console.log("── 测试1: 无姓氏参数（仅名字笔画）──");
  const result1 = hardFilterNames(names, {});
  console.log(`  总: ${names.length} → 通过: ${result1.passed.length}, 淘汰: ${result1.removed.length}`);
  result1.removed.forEach((r) => {
    console.log(`   ✗ "${r.name}": ${r.reasons.map((rr) => `[${rr.rule}]${rr.reason}`).join("; ")}`);
  });
  result1.passed.forEach((p) => {
    console.log(`   ✓ "${p.name}" (${p.pinyin})`);
  });

  // 验证: 无姓氏时张伟6画应淘汰（只算名），张伟伟12画应通过（名笔画≥8）
  const passedNames1 = result1.passed.map((p) => p.name);
  const r1伟 = !passedNames1.includes("张伟");
  const r1伟伟 = passedNames1.includes("张伟伟");
  const r1龘龘 = result1.removed.some((r) => r.name === "张龘龘");
  const r1恶 = result1.removed.some((r) => r.name === "张恶");
  const r1病毒 = result1.removed.some((r) => r.name === "张病毒");
  const r1一一 = result1.removed.some((r) => r.name === "张一一");
  const r1真香 = !result1.removed.some((r) => r.name === "史真香"); // 无姓氏参数时不触发谐音

  console.log(`\n  ✓ 张伟(6画)被淘汰: ${r1伟 ? "✅" : "❌"}`);
  console.log(`  ✓ 张伟伟(12画)通过: ${r1伟伟 ? "✅" : "❌"}`);
  console.log(`  ✓ 张龘龘(生僻字+笔画极多): ${r1龘龘 ? "✅" : "❌"}`);
  console.log(`  ✓ 张恶(负面含义): ${r1恶 ? "✅" : "❌"}`);
  console.log(`  ✓ 张病毒(负面含义): ${r1病毒 ? "✅" : "❌"}`);
  console.log(`  ✓ 张一一(笔画2画<8): ${r1一一 ? "✅" : "❌"}`);
  console.log(`  ✓ 史真香(无姓氏不触发谐音): ${r1真香 ? "✅" : "❌"}`);

  // ── 测试2: 姓氏=张，笔画应包含姓 ──
  console.log("\n── 测试2: 姓氏=张，笔画算完整姓名──");
  const result2 = hardFilterNames(names, { surname: "张" });
  console.log(`  总: ${names.length} → 通过: ${result2.passed.length}, 淘汰: ${result2.removed.length}`);
  result2.removed.forEach((r) => {
    console.log(`   ✗ "${r.name}": ${r.reasons.map((rr) => `[${rr.rule}]${rr.reason}`).join("; ")}`);
  });
  result2.passed.forEach((p) => {
    console.log(`   ✓ "${p.name}" (${p.pinyin})`);
  });

  const passedNames2 = result2.passed.map((p) => p.name);
  const r2伟 = passedNames2.includes("张伟"); // 张(12)+伟(6)=18画 ≥ 8
  const r2一一 = passedNames2.includes("张一一"); // 张(12)+一一(2)=14画 ≥ 8

  console.log(`\n  ✓ 张伟(姓12+名6=18画≥8)通过: ${r2伟 ? "✅" : "❌"}`);
  console.log(`  ✓ 张一一(姓12+名2=14画≥8)通过: ${r2一一 ? "✅" : "❌"}`);

  // ── 测试3: 史真香传姓氏"史"时触发谐音 ──
  console.log("\n── 测试3: 史真香传姓氏=史，验证谐音检测──");
  const result3 = hardFilterNames(
    [{ name: "史真香", givenName: "真香", pinyin: "zhēn xiāng", meaning: "test", reason: "test", source: "test" }],
    { surname: "史" }
  );
  const r3淘汰 = result3.removed.some((r) => r.name === "史真香");
  console.log(`  史真香(姓氏=史) → ${r3淘汰 ? "❌ 被淘汰 ✅ (谐音检测正常)" : "✅ 通过 (谐音检测异常)"}`);

  // ── 测试4: 重名限制（完整姓名匹配） ──
  console.log("\n── 测试4: 重名限制（完整姓名）──");
  // 名人库有"张飞"，但无"张伟伟"
  const result4 = hardFilterNames(
    [
      { name: "张伟伟", givenName: "伟伟", pinyin: "wěi wěi", meaning: "test", reason: "test", source: "test" },
      { name: "张三飞", givenName: "三飞", pinyin: "sān fēi", meaning: "test", reason: "test", source: "test" },
    ],
    { surname: "张", checkFamousNames: true }
  );
  console.log(`  张伟伟 重名检测: ${result4.passed.some(p => p.name === "张伟伟") ? "✅ 通过 (不在名人库)" : "❌ 被淘汰"}`);
  console.log(`  张三飞 重名检测: ${result4.passed.some(p => p.name === "张三飞") ? "✅ 通过 (不在名人库)" : "❌ 被淘汰"}`);

  // ── 测试5: 名人准确匹配（包拯） ──
  console.log("\n── 测试5: 名人准确匹配──");
  const fullNameTest = hardFilterNames(
    [{ name: "包拯", givenName: "拯", pinyin: "zhěng", meaning: "拯救", reason: "test", source: "test" }],
    { surname: "包", checkFamousNames: true }
  );
  console.log(`  包拯 重名检测: ${fullNameTest.removed.some(r => r.name === "包拯") ? "❌ 被淘汰 ✅" : "✅ 通过 (无匹配)"}`);
  // 注意：名人库无"包拯"，所以应通过。如需增加需加入FAMOUS_NAMES。

  // ── 测试6: 补充常用字验证（梓萱婷秀英） ──
  console.log("\n── 测试6: 补充常用字（梓萱婷秀英）──");
  const commonCharsTest = hardFilterNames(
    [
      { name: "张梓萱", givenName: "梓萱", pinyin: "zǐ xuān", meaning: "test", reason: "test", source: "test" },
      { name: "李婷秀", givenName: "婷秀", pinyin: "tíng xiù", meaning: "test", reason: "test", source: "test" },
      { name: "王英杰", givenName: "英杰", pinyin: "yīng jié", meaning: "test", reason: "test", source: "test" },
    ],
    { surname: "张" }
  );
  console.log(`  张梓萱: ${commonCharsTest.passed.some(p => p.name === "张梓萱") ? "✅ 通过" : "❌ 被淘汰"}`);
  console.log(`  李婷秀: ${commonCharsTest.passed.some(p => p.name === "李婷秀") ? "✅ 通过" : "❌ 被淘汰"}`);
  console.log(`  王英杰: ${commonCharsTest.passed.some(p => p.name === "王英杰") ? "✅ 通过" : "❌ 被淘汰"}`);

  // ── 最终总结 ──
  console.log("\n═══════════════════════════════════════════");
  const allPassed = r1伟 && r1伟伟 && r1龘龘 && r1恶 && r1病毒 && r1一一 && r1真香 &&
    r2伟 && r2一一 && r3淘汰;
  console.log(`  修复验证: ${allPassed ? "✅ 全部通过" : "❌ 有失败项"}`);
  console.log("═══════════════════════════════════════════");
}

main();