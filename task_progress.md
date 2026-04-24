# Bug 修复进度

- [x] 问题1: 姓氏重复（张张灵灵）— 修复 parseMarkdownTable + route.ts 姓氏剥离逻辑
- [x] 问题2: 后两个字都一样 — 添加 givenName 去重 + 叠字名过滤
- [x] 问题3: 缺少白话译文 — 改进 modernText 模糊匹配（书名包含 + 原文交叉匹配）
- [x] 问题4: 典籍出处虚构 — 检测 "X之X" 虚构模式，回填真实典籍出处
- [x] 验证修复结果 (TypeScript 编译通过)
