# seekname
专注于AI起名（人名、公司\品牌\项目名、宠物、名字测评...）服务
2026.4.10 Web页面基本定稿：

# 模块文件划分
src/
├── lib/
│   ├── naming-types.ts          ← 新建：统一类型定义
│   ├── scenario-router.ts       ← 新建：场景路由 Layer 0
│   ├── intent-parser.ts         ← 重构：意图解析（各场景专属 prompt）
│   ├── character-retrieval.ts   ← 重构：字符召回（区分场景路径）
│   ├── name-filter.ts           ← 重构：多维过滤（场景化配置）
│   ├── ai-composer.ts           ← 新建：Layer 4 LLM 创意组合（核心）
│   ├── name-scorer.ts           ← 重构：评分体系真实化
│   ├── name-evaluator.ts        ← 新建：好名测评模块
│   ├── bazi-calculator.ts       ← 新建：八字计算
│   ├── phonetic-optimizer.ts    ← 现有，完整保留
│   ├── naming-pipeline.ts       ← 新建：统一管道入口
│   └── prisma.ts                ← 现有，保留
│
├── app/
│   ├── api/
│   │   ├── naming/
│   │   │   ├── generate/route.ts     ← 统一起名接口（接受 scenario 参数）
│   │   │   └── evaluate/route.ts     ← 测评接口（新建）
│   │
│   ├── (scenarios)/              ← 场景页面路由组
│   │   ├── baby/page.tsx         ← 宝宝起名
│   │   ├── adult/page.tsx        ← 成人改名
│   │   ├── english/page.tsx      ← 英文起名
│   │   ├── nickname/page.tsx     ← 社交网名
│   │   ├── company/page.tsx      ← 公司/品牌/项目/店铺起名
│   │   ├── pet/page.tsx          ← 宠物起名
│   │   └── evaluate/page.tsx     ← 好名测评
│   │
│   └── naming/
│       └── result/page.tsx       ← 通用结果页（按 scenario 参数渲染）
