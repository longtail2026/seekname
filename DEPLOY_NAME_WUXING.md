# name_wuxing 部署指南

## 数据文件
- `c:\seekname\name_wuxing.sql` — 619 字五行字库（偏旁部首法判定，覆盖金/木/水/火/土）
- 分布：金 168 / 木 158 / 水 146 / 火 79 / 土 68

## 部署步骤

### 步骤 1：在 Vercel PostgreSQL 中创建表

1. 打开 [Vercel Dashboard](https://vercel.com/dashboard)
2. 进入你的 `seekname` 项目 → **Storage** → 点击 PostgreSQL 数据库
3. 点击 **"Query"** 或 **"Console"** 标签
4. 复制 `name_wuxing.sql` 的全部内容，粘贴执行

> ⚠️ 注意：Vercel Console 每次只能执行部分 SQL，建议分批执行或使用 `psql` 客户端。

### 步骤 2（推荐）：用 psql 客户端直连

```bash
# 从 Vercel Storage 页面获取连接信息
# POSTGRES_URL 格式: postgresql://user:password@host:5432/verceldb

psql "postgresql://xxx:yyy@host:5432/verceldb" -f name_wuxing.sql
```

### 步骤 3：验证导入成功

```sql
SELECT COUNT(*) FROM name_wuxing;           -- 应返回 619
SELECT wuxing, COUNT(*) FROM name_wuxing GROUP BY wuxing;
```

### 步骤 4：提交代码

```bash
cd c:\seekname
git add src/lib/naming-engine.ts src/app/api/name/generate/route.ts
git commit -m "chore: 优先查询 name_wuxing 五行字库"
git push
```

Vercel 自动部署后，新的起名引擎会优先查 `name_wuxing`。

---

## 代码变更说明

### route.ts（起名 API）
- `fetchChars()` 函数改为：先查 `name_wuxing` 获取高覆盖五行，再查 `kangxi_dict` 补全拼音/笔画/典籍

### naming-engine.ts（典籍匹配层）
- 典籍匹配层补充字时，改为先查 `name_wuxing`，再用 `kangxi_dict` 补全字段
- 两处均保留回退逻辑：`name_wuxing` 查不到时回退原 `kangxi_dict` 查询

### name_wuxing 表
- 独立表，不碰 `kangxi_dict` 已有数据
- 5 个五行均有字，不会因某行缺字而触发默认兜底

## 数据质量说明

| 指标 | kangxi_dict | name_wuxing |
|------|------------|------------|
| 字数 | ~24,000 | 619 |
| 五行覆盖率 | 49% | 100% (619/619) |
| 判定方法 | 不明（可能 AI） | 偏旁部首法 |
| 用途 | 康熙字典/典籍 | 起名专用 |

`name_wuxing` 专门针对起名优化（取名常用字，非生僻字），619 字覆盖日常起名场景足够。
