# 优化进度

## 建议实施计划

- [x] 建议一分析：route.ts 中 spiritScore ≤ 0 清空 source 逻辑
- [x] 建议二验证：Prompt 已包含规则14"宁可无出处也不要错误出处"
- [ ] 建议一实施：修改 route.ts spiritScore ≤ 0 时保留 reason，清空 book/text/modernText
- [ ] 建议一前端修改：前端典籍出处模块展示条件改为只检查 sourceBook/sourceText
- [ ] 建议三实施：route.ts 中分数拉伸（排名映射到55-95分）
- [ ] 建议四实施：将 spiritScore 作为加分项加入总分
- [ ] 验证：代码编译检查