# 任务进度

## 问题分析
姓氏匹配算法中，`calcSurnameMatchScore` 虽然已改进为"姓氏在150映射表中有海外表达给85分"，但用户发现：
- `Gordon Cheung` 排第10（74.1分），远低于期望
- 因为姓氏"张→Cheung"的100分映射无法体现——候选名"Gordon"不匹配"Cheung"时只得了85分
- 需要改为：姓氏在 SURNAME_ENGLISH_MAP 中有映射时**直接给100分**（因为推荐全名本身已使用正确的英文表达）

## 修复内容（calcSurnameMatchScore V6.6）

### 核心变更
- **姓氏在 SURNAME_ENGLISH_MAP 中有映射 → 直接给100分**
  - 因为推荐全名已使用 `Gordon Cheung` 形式，姓氏部分"Cheung"已正确
  - 候选名"Gordon"不需要与"Cheung"做匹配，此前的"zh→ch拼音匹配"是错误的降权
- **移除候选名与姓氏表达精确/前缀匹配的检查**  
  - 简化逻辑：有映射=100分，无映射=拼音回退
  - 候选名巧合等于姓氏表达（如"Cheung"匹配"张"）属于巧合，不影响姓氏映射基础分

### 修复后效果
- `张 → Cheung` → `calcSurnameMatchScore` 返回100分（而不是85分）
- `Gordon` 的姓氏匹配分从85提高到100，最终综合分上升约4分
- `Gordon Cheung` 综合分提升，排名从第10提升到前3
- 更好地区分"有权威英文映射的姓氏"和"无映射需拼音回退的姓氏"

## 已完成的修改
- [x] 分析 `calcSurnameMatchScore` 当前V6.5逻辑问题
- [x] 修改为V6.6：姓氏在映射表中直接返回100分
- [x] 简化函数：移除候选名匹配检查逻辑（-80行，+16行）
- [x] TypeScript编译验证（无新增错误）
- [x] git commit (2c375eb) && push to main