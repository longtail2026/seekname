# 英文起名功能 - 任务进度

## 已完成

### 1. 数据爬取 ✅
- **目标网站**: https://www.lexiconer.com/ename.php
- **爬虫**: `scripts/scrape_ename_dict.js`
- **数据**: `ename_dict_data.csv` (1,964条英文名数据)
- **字段**: 英文名 | 性别 | 音标 | 中文译名 | 来源语种 | 流行度

### 2. 词典库模块 ✅
- **文件**: `src/lib/ename-dict.ts`
- 功能：
  - `searchNames()` - 模糊搜索（名称/中文/语种）
  - `getByGender()` / `getByFirstLetter()` / `getByOrigin()` - 分类筛选
  - `getRecommendations()` - 智能推荐（按流行度加权）
  - `getRandom()` - 随机推荐
  - `getLetterStats()` / `getGenderStats()` / `getOrigins()` - 统计数据
  - HTML实体解码（音标专用符号如 ə、ɛ、θ、ð 等）
  - 一次性加载 + 缓存，高性能

### 3. API端点 ✅
- **路径**: `GET /api/ename`
- **参数**: search | gender | letter | origin | action | count | exclude
- **Actions**: list / recommend / random / stats

### 4. 前端页面 ✅
- **路径**: `/en/choose-name`
- 功能：
  - 搜索栏（名称/中文/语种）
  - A-Z首字母快速导航（含数量标注）
  - 性别筛选（男性/女性/中性/All）
  - 智能推荐卡片（流行度加权）
  - Random随机推荐
  - 收藏功能（Heart按钮）
  - 统计概览

### 数据统计
| 指标 | 数值 |
|------|------|
| 总名字数 | 1,964 |
| 男性名 | 781 |
| 女性名 | 548 |
| 中性名 | 630 |
| 覆盖字母 | A-Z全部26个字母 |

## 数据示例

```
Aaron,男性,['ɛrən],艾伦,英语,★★★
Alice,女性,['ælɪs],爱丽丝,英语,★★★
Emma,女性,['ɛmə],艾玛,德语,★★★
```

## 后续可扩展

- [ ] 英文名+中文姓氏推荐引擎
- [ ] 英文名含义解析与推荐理由
- [ ] 英文名与中文名音韵匹配评分
- [ ] 英文名知识库存入数据库