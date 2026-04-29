# 起名质量深度分析与修复方案

## 一、核心问题提炼

用户观察到：「张婀娜」「张妍妍」俗气，「张婉茹」「张婉妡」反而效果好。
从 Vercel log 可以看到，排名逻辑完全扭曲，问题根源不在 DeepSeek 生成，而在**后处理打分+过滤管线的错误**。

---

## 二、Bug 1（关键致命）：`findBestClassicsMatch` 未传入 `styles`

### 位置
`src/app/api/name/generate/route.ts` **第 506 行** 和 **第 648 行**

### 代码
```typescript
// ❌ 错误：未传入 styles
let spiritMatch = SemanticNamingEngine.findBestClassicsMatch(
  resolved.meaning,
  resolved.reason,
  result.matches,
  expectations,
  intentions   // ← 漏掉了 styles
);

// ✅ 应该传入 styles
let spiritMatch = SemanticNamingEngine.findBestClassicsMatch(
  resolved.meaning,
  resolved.reason,
  result.matches,
  expectations,
  intentions,
  styles       // ← 缺少这个参数
);
```

### 影响链
1. `findBestClassicsMatch` → `calculateSpiritScore(styles?)` → `getRelevantSpiritCategories(styles?)`
2. 当 `styles` 为 `undefined`/`null` 时 → `getRelevantSpiritCategories` 返回 `null`
3. `null` 意味着**扫描全部 14 个意气类别**（包括「豪迈大气」「阳光开朗」等）
4. 用户选择的是「温柔婉约」「清新自然」「诗意浪漫」，典籍本来是正确的《孟子》·"恻隐之心"，但其现代译文中的词被误判

### 证据：Log 中看到的误判
```
[意气因子2] 典籍包含"豪迈大气"不兼容词 → -8分
[意气因子2] 典籍包含"浪漫诗意"不兼容词 → -8分
[意气因子2] 典籍包含"阳光开朗"不兼容词 → -8分
```

《孟子》"恻隐之心"的现代译文**本身没有任何"豪迈大气"的词**，是 `styles` 没传入导致扫描范围错误，触发了无关类别的`incompatible`惩罚。

### 正确行为
当用户选择「温柔婉约」风格时，应仅扫描 `INTENTION_TO_SPIRIT_MAP["温柔婉约"]` 映射的类别（谦逊温和、温文儒雅、浪漫诗意），不扫「豪迈大气」的 incompatible。

---

## 三、Bug 2（次致命）：硬性过滤过于严苛

### Log 证据
```
[语义起名-新路径] 硬性过滤: 37 → 通过11, 移除26
```
70% 的名字被移除，只剩 11 个。

### 问题分析
`hardFilterNames` 过滤规则太严，特别是以下规则：
- 叠字名「妍妍」通过，但"婉婉"可能被过滤
- 含非常用字（wuxing unknown）的直接移除
- 生僻字过滤门槛过高

DeepSeek 生成的 37 个名字中，有相当部分是合理的（如"婉茹""婉妡"），但被硬过滤筛掉了。剩余 11 个主体是「妍妍」「婀娜」「妩媚」这类过于直白的花瓶名。

### 修正方向
1. 降低硬过滤的严格度（比如从 26/37=70% 移除率降到 40-50%）
2. 对 wuxing unknown 的字放宽过滤（可以在 Scorer 中降分而非直接移除）
3. 合并 hardFilter + scorer 为两阶段：soft filter（移除明显不合适的）→ scorer 排序（对 borderline 名字降分而不是移除）

---

## 四、Bug 3（严重）：SemanticScorer 七维打分同质化 —— "妍妍"霸榜

### Log 证据
```
[ScorerV2] 妍妍 | 语义=30 音律=80 性别=95 五行=50 文化=90 字形=70 独特=45 风格=33 → 总分=67
[ScorerV2] 妍妍 | 语义=30 音律=80 性别=95 五行=50 文化=93 字形=70 独特=46 风格=33 → 总分=67
[ScorerV2] 妍妍 | 语义=30 音律=80 性别=95 五行=50 文化=95 字形=70 独特=47 风格=33 → 总分=68
...
[语义起名-新路径] 七维打分排序完成: 前5名 = 妍妍(68分), 妍妍(68分), 妍妍(68分), 妍妍(68分), 妍妍(67分)
```

### 根本原因
同一个「妍妍」名字被 DeepSeek 生成了多个不同的 `name.source`/典籍出处版本，每个版本单独打分。因为「妍妍」的汉字内容不变，语义/音律/性别/五行/文化/字形/独特/风格是同一个名字的不同副本在循环，得分高度近似。

### 修正方向
1. 打分前按 `givenName` + `source` 去重（而不是只看 givenName）
2. 或：对同一个 givenName 取最高分版本，而不是保留多个副本
3. 或：Scorer 增加名字多样性惩罚：同一 givenName 出现 N 次，第 N+1 次扣分

---

## 五、Bug 4（严重）：性别评分对「智慧」「才华」类名字过度惩罚

### Log 证据
```
TACKY_FEMALE_NAMES = ["智慧", "聪明", "美丽", "俊秀", "善良", "才华", "爱华"];
```
用户期望「聪明智慧」「才华艺术」，但 `TACKY_FEMALE_NAMES` 列表中包含「智慧」「聪明」「才华」—— 这是用户**主动选择**的期望。

### 影响
- 「张妍妍」就是因为不含"智慧""才华"字，逃过了 -35 分的罚分
- 「张婉妡」的"妡"字不在任何惩罚列表中 → 性别分保持 80
- 用户期望「聪明智慧、才华艺术」，但系统在性别维度给这些期望方向扣分 → 逻辑矛盾

### 修正方向
1. 当用户主动选择"智慧""才华"为意向时，`tackyPenalty` 应豁免对应的惩罚词
2. 或：改为检查名字是否**不相关的直白词**而非是否含"智慧/才华"
3. 上下文人感知：名字含"慧"而在期望中有"智慧" → 不应扣分

---

## 六、Bug 5（中）：意气匹配落入局部最优——所有名字匹配同一典籍

### Log 证据
所有名字的典籍出处都是《孟子》，只有个别名字因"骄溢"被否决而被清空出处。

### 原因
`findBestClassicsMatch` 从数据库 `result.matches` 中选最佳意气匹配典籍，但：
1. 数据库匹配到的典籍只有 10 条（且大部分是《孟子》相关语录）
2. `calculateSpiritScore` 对"不兼容"惩罚过于敏感 → 只有《孟子》不被否决
3. 多样化逻辑（usedBookNames）是事后补救，但「最佳匹配」始终是同一个

### 修正方向
1. 在数据库搜索时扩大典籍多样性
2. `findBestClassicsMatch` 不再严格按 spiritScore 排序，而是对每个名字用不同典籍（强制多样化）
3. 或：不同的名字寓意（meaning）强制匹配不同的典籍类别

---

## 七、综合修复提案

### 优先级 P0（立即修复）

1. **route.ts 第 506、648 行传入 `styles`**
   ```typescript
   // 改 before:
   findBestClassicsMatch(meaning, reason, matches, expectations, intentions)
   // 改 after:
   findBestClassicsMatch(meaning, reason, matches, expectations, intentions, styles)
   ```
   这是唯一一个零风险的修复，立即解决"豪迈大气"误判。

2. **hardFilter 放宽**
   将 hardFilter 的移除率从 ~70% 降低到 ~40%。对"五行未知"的字改为降分而非移除。

### 优先级 P1（重要优化）

3. **Scorer 前按 `givenName` + `source` 去重**，避免"妍妍"霸榜
4. **性别 `tackyPenalty` 豁免与用户期望冲突的惩罚词**
   ```typescript
   // 只有当用户没选"智慧""才华"时，才扣 tackyPenalty
   if (userIntends.includes("智慧")) skip "智慧" penalty
   if (userIntends.includes("才华")) skip "才华" penalty
   ```

### 优先级 P2（中长期优化）

5. **意气匹配多样化**：不同名字选不同典籍，而非所有名字竞争同一个最佳匹配
6. **典籍出处多样性提升**：数据库查询时增加多样性权重

---

## 八、预期修复效果

| 名字 | 当前排名 | 修复后预期排名 | 原因 |
|------|---------|---------------|------|
| 张婀娜 | 1 | 3-4 | 意气匹配不再被"豪迈大气"扣分，但仍偏俗 |
| 张妍妍 | 2 | 5 | 硬过滤后不再霸榜，性别扣分豁免后合理 |
| 张婉妡 | 3 | 1-2 | 本身寓意好，修复后意气匹配得分稳居前列 |
| 张妩媚 | 4 | 5 | 偏俗，风格不匹配「聪明智慧」|
| 张婉如 | 5 | 2-3 | 温和婉约，匹配用户风格，得分应提升 |

预期：Top 3 应为 **张婉妡 > 张婉如 > [一个带"慧/智/敏"的新名字]**，风格匹配「聪明智慧+温柔婉约」。