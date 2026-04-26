/**
 * 硬性过滤模块测试脚本
 * 测试 5 条过滤规则是否按预期工作
 */

// 模拟 GeneratedName 类型
const names = [
  // 正常名字
  { name: "张伟", givenName: "伟", pinyin: "wěi", meaning: "伟大", reason: "取自《诗经》", source: "《诗经》" },
  { name: "李明", givenName: "明", pinyin: "míng", meaning: "光明", reason: "取自《周易》", source: "《周易》" },
  // 生僻字（不在GB2312一级字库）
  { name: "张䶮", givenName: "䶮", pinyin: "yǎn", meaning: "飞龙在天", reason: "生僻字测试", source: "《诗经》" },
  // 负面含义（包含敏感词）
  { name: "张恶", givenName: "恶", pinyin: "è", meaning: "凶恶", reason: "负面含义测试", source: "《诗经》" },
  // 谐音避讳
  { name: "史真香", givenName: "真香", pinyin: "zhēn xiāng", meaning: "真实芬芳", reason: "谐音测试", source: "《诗经》" },
  // 笔画极端（总笔画<8或>35）
  { name: "张一一", givenName: "一一", pinyin: "yī yī", meaning: "一一", reason: "笔画过少测试", source: "《诗经》" },
  { name: "张龘龘", givenName: "龘龘", pinyin: "dá dá", meaning: "龙腾", reason: "笔画过多测试", source: "《诗经》" },
  // 多字名
  { name: "王浩然", givenName: "浩然", pinyin: "hào rán", meaning: "浩然正气", reason: "取自《孟子》", source: "《孟子》" },
  // 负面含义 - 常见敏感词
  { name: "张病毒", givenName: "病毒", pinyin: "bìng dú", meaning: "生命力", reason: "敏感词测试", source: "《诗经》" },
  // 谐音避讳 - 常见敏感谐音
  { name: "王变婷", givenName: "变婷", pinyin: "biàn tíng", meaning: "变美", reason: "谐音测试", source: "《诗经》" },
  // 正常三字名
  { name: "陈思远", givenName: "思远", pinyin: "sī yuǎn", meaning: "思虑深远", reason: "取自《论语》", source: "《论语》" },
];

async function main() {
  try {
    const { hardFilterNames, summarizeRemoved } = await import('./src/lib/hard-filter.ts');
    
    console.log("═══════════════════════════════════════════");
    console.log("       硬性过滤模块测试");
    console.log("═══════════════════════════════════════════\n");

    const result = hardFilterNames(names, { surname: "张" });
    
    console.log(`📊 总名字数: ${names.length}`);
    console.log(`✅ 通过: ${result.passed.length}`);
    console.log(`❌ 淘汰: ${result.removed.length}\n`);
    
    if (result.removed.length > 0) {
      console.log("── 淘汰详情 ──");
      result.removed.forEach((r, i) => {
        console.log(`\n${i + 1}. "${r.name}"`);
        r.reasons.forEach((rr) => {
          console.log(`   ✗ ${rr.rule}: ${rr.reason}`);
        });
      });
    }
    
    if (result.passed.length > 0) {
      console.log("\n── 通过名单 ──");
      result.passed.forEach((p, i) => {
        console.log(`  ${i + 1}. "${p.name}" (${p.pinyin})`);
      });
    }
    
    console.log("\n── 统计摘要 ──");
    console.log(summarizeRemoved(result.removed));
    
  } catch (err) {
    console.error("测试失败:", err);
  }
}

main();