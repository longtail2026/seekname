/**
 * 端到端测试：英文名生成引擎 V4.2
 * 
 * 测试用例：
 * 1. 徐小燕（女，谐音需求）- Diana/Diane 不应出现在结果中
 * 2. 张国光（男，谐音需求）- Gordon 应出现在结果中
 * 3. 李丽（女，谐音需求）- Lee/Lily 应出现
 */
import { generateEnglishNames } from "./src/lib/ename-generator";

async function main() {
  console.log("\n====================================================");
  console.log("  V4.2 端到端英文名生成测试");
  console.log("====================================================\n");

  // ===== 测试1: 徐小燕 =====
  console.log("=== 测试1: 徐小燕（女，谐音贴近中文名） ===");
  const r1 = await generateEnglishNames({
    gender: "female",
    surname: "徐",
    fullName: "徐小燕",
    needs: ["谐音贴近中文名", "含义美好"],
    count: 10,
  });
  
  if (r1.success) {
    // 检查 Diana/Diane/Dione 是否被过滤掉
    const badNames = ["Diana", "Diane", "Dione", "Fidelia", "Dickerson", "Dickson", "Gibbs", "Giles", "Gillespie", "Childers", "Diamond", "Dickens"];
    const foundBad = r1.data.filter(d => badNames.includes(d.name)).map(d => `${d.name}(${d.score}/${d.phoneticScore})`);
    
    console.log(`  结果数: ${r1.data.length}`);
    console.log(`  前5名: ${r1.data.slice(0, 5).map(d => `${d.name}(${d.score}/${d.phoneticScore})`).join(", ")}`);
    console.log(`  所有发音分: ${r1.data.map(d => `${d.name}=${d.phoneticScore}`).join(", ")}`);
    
    if (foundBad.length === 0) {
      console.log("  ✅ Diana/Diane 等无关名已从结果中移除");
    } else {
      console.log(`  ❌ 仍有不该出现的结果: ${foundBad.join(", ")}`);
    }
  } else {
    console.log("  ❌ 生成失败:", r1.message);
  }

  // ===== 测试2: 张国光 =====
  console.log("\n=== 测试2: 张国光（男，谐音贴近中文名） ===");
  const r2 = await generateEnglishNames({
    gender: "male",
    surname: "张",
    fullName: "张国光",
    needs: ["谐音贴近中文名"],
    count: 10,
  });
  
  if (r2.success) {
    const gordon = r2.data.find(d => d.name === "Gordon");
    console.log(`  结果数: ${r2.data.length}`);
    console.log(`  前10名: ${r2.data.map(d => `${d.name}(${d.score}/${d.phoneticScore})`).join(", ")}`);
    
    if (gordon) {
      console.log(`  ✅ Gordon 在结果中 (phoneticScore=${gordon.phoneticScore})`);
    } else {
      console.log("  ❌ Gordon 不在结果中（但可能被含义/风格筛选掉了）");
    }
  }

  // ===== 测试3: 李丽 =====
  console.log("\n=== 测试3: 李丽（女，谐音贴近中文名） ===");
  const r3 = await generateEnglishNames({
    gender: "female",
    surname: "李",
    fullName: "李丽",
    needs: ["谐音贴近中文名", "简约好记"],
    count: 10,
  });
  
  if (r3.success) {
    const goodNames = r3.data.filter(d => d.phoneticScore >= 60).map(d => `${d.name}(${d.phoneticScore})`);
    console.log(`  发音匹配≥60的结果: ${goodNames.join(", ") || "无"}`);
    
    const leeNames = r3.data.filter(d => ["Lee", "Lily", "Leigh", "Elia", "Lia", "Li"].includes(d.name));
    if (leeNames.length > 0) {
      console.log(`  ✅ Lee/Lily 等匹配结果出现: ${leeNames.map(d => `${d.name}(${d.score})`).join(", ")}`);
    }
  }

  // ===== 摘要 =====
  console.log("\n====================================================");
  console.log("  测试完成");
  console.log("====================================================");
}

main().catch(console.error);