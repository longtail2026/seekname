# 任务进度

## 问题分析
姓氏匹配算法中，`calcSurnameMatchScore` 在检查候选名时，错误地尝试将**名字候选**（如 "Gordon"）与姓氏英文表达（如 "Cheung"）做匹配，导致：
- "Gordon" ≠ "Cheung" → 姓氏匹配得分=0
- 实际姓氏"张"→"Cheung" 的正确映射没有被自动加分

## 修复内容（`calcSurnameMatchScore` V6.4）

### 核心变更
- **姓氏在150映射表中** → **直接给最高分（100分）**
- 因为推荐全名会使用 `Gordon Cheung` 这样的形式，姓氏本身的英文表达已确定
- 额外检查候选名是否与姓氏表达匹配（锦上添花，不影响基础100分）

### 修复后效果
- `张 → Cheung` 升权成功 → `Gordon Cheung` 获得100姓氏分
- `Gordon Zhang` 与 `Gordon Cheung` 竞争更公平：音匹分排序决定最终名次
- `zhang → Cheung` 拼音匹配不再被错误使用

## 算法流程（已有功能无需修改）
- [x] DB候选 ≤ 10个（已通过音节预筛选）
- [x] AI生成10个候选
- [x] 20个候选合并去重、打分排序
- [x] 取前6名反馈前台

- [x] 分析 `ename-generator.ts` 中 `calcSurnameMatchScore` 的调用链
- [x] 分析 `ename-surname-map.ts` 的姓氏映射结构
- [x] 修改 `calcSurnameMatchScore`：姓氏在150映射表中时直接返回100分
- [x] 验证：TypeScript编译 `ename-generator.ts` 无新增错误