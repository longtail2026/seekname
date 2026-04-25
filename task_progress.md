# 策略矩阵集成任务

## 已完成项

- [x] 创建 `src/lib/naming-strategy.ts` — 策略枚举、判定逻辑、AI prompt块、标签信息、配置表
- [x] 修改 `src/lib/semantic-naming-engine.ts` — `buildAIPrompt()` 注入策略指令、`semanticNamingFlow()` 返回 `strategyType`
- [x] 修改 `src/app/api/name/generate/route.ts` — API 返回 `strategyInfo` 包含 type/label/tag/color/description

## 待优化项

- [ ] API route.ts — strategyInfo 补充 displayMode 字段，用于前端差异化展示
- [ ] 前端 naming/page.tsx — 根据 displayMode 差异化展示典籍出处：
  - CLASSICAL(original)：重点展示典籍原文，标注生僻度
  - MODERN(modern)：重点展示现代翻译
  - BALANCED(both)：同时展示古籍原字和现代同义字对比
- [ ] 首页 page.tsx — 在起名表单区域增加策略提示
- [ ] TypeScript 编译验证通过