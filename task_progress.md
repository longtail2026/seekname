# 修复任务清单

## 问题1：打分普遍不高（六七十分）
- [x] 分析代码（name-scorer-v2.ts）
- [ ] 修复：提升语义匹配基础分、文化内涵基础分，增加总分最低基线

## 问题2：页面显示缺少"现代译文"
- [x] 分析页面展示代码（page.tsx）
- [ ] 修复：AI prompt输出格式增加"现代译文"列

## 问题3：名字中1/4应为单字名
- [x] 分析wordCount硬编码（route.ts、AI prompt）
- [ ] 修复：修改wordCount逻辑，AI prompt要求混搭

## 问题4：典籍出处需具体篇章名和原文
- [x] 分析AI prompt（semantic-naming-engine.ts）
- [ ] 修复：强化prompt要求