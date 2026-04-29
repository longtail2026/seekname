# 起名性别特征优化任务

## 问题
- "张智慧"95分但老土，"张婉婷"60分但更像女孩名
- 直白匹配用户期望词的"口号名"得分过高
- 性别特征权重不足，女性气质未充分体现

## 优化方案（四层联动）

### 1. gender-chars.ts 字库调整
- [ ] "慧"从FEMALE_LEANING移入MALE_LEANING（与"智"联合使用时加重惩罚）
- [ ] checkOvertName 加强：新增"智慧""智丽""智美"等专用惩罚组合
- [ ] buildGenderPromptBlock 强化AI提示警告

### 2. name-scorer-v2.ts 评分调整
- [ ] scoreGenderFit：直白口号名额外罚30分，总分上限限制
- [ ] scoreSemanticMatch：直白惩罚上限40→60，精准匹配惩罚加重
- [ ] 性别权重15%→20%，语义权重20%→15%（互换权重）

### 3. semantic-naming-engine.ts AI提示
- [ ] 强化buildNamingMaterialsPrompt和buildAIPrompt中的禁用词警告

### 4. 编译验证
- [ ] 验证TypeScript编译通过