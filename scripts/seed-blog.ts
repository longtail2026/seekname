/**
 * 博客种子数据迁移脚本
 * 用法：npx tsx scripts/seed-blog.ts
 *
 * - 幂等：已存在的 slug 不重复插入
 * - 自动创建 seed-user（id = 'seed-user-fixed-id-001'）
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_USER_ID = "seed-user-fixed-id-001";

const SEED_POSTS = [
  {
    title: "五行取名：如何根据宝宝生辰八字选好字",
    slug: "wuxing-bazi-naming-guide",
    summary: "八字起名是中华传统文化的精髓，本文详解如何根据五行缺失来选择吉祥好字。",
    content: `## 八字与五行

在中华传统文化中，名字不仅是一个符号，更承载着命运的期许。八字起名依据宝宝的出生年月日时，推算其五行喜忌，选取能够补益命格的汉字。

**什么是五行？** 金、木、水、火、土，是构成宇宙万物的五种基本元素。每个人的八字都有偏强偏弱，选择名字时要让五行达到平衡。

## 如何判断五行缺失

通过八字排盘，可以看到宝宝命盘中五行的分布：
- **木旺** → 宜补金、土，忌木
- **火旺** → 宜补水、木，忌火
- **土旺** → 宜补金、水，忌土
- **金旺** → 宜补水、火，忌金
- **水旺** → 宜补木、火，忌水

## 选字原则

1. **喜用神优先**：找出八字中的用神，在名字中加强
2. **音形义兼顾**：读音响亮、书写美观、寓意吉祥
3. **避开凶格字**：含义消极或有不良谐音的字要避免
4. **结合姓氏**：姓与名的五行要相生相合

起一个好名字，是父母给宝宝的第一份人生礼物。希望每个宝宝都能拥有与自己命格相合、伴随一生的好名字。`,
    coverImage: "",
    viewCount: 3842,
    likeCount: 267,
    commentCount: 43,
    favoriteCount: 189,
    createdAt: new Date("2026-04-10T08:00:00Z"),
    tags: ["五行取名", "八字起名", "宝宝起名"],
  },
  {
    title: "诗经女孩名字大全：300个出自诗经的好名字",
    slug: "shijing-girl-names-collection",
    summary: "蒹葭苍苍，白露为霜。诗经里的美名，为女孩取一个有诗意的名字。",
    content: `## 诗经起名：最美的文化传承

"关关雎鸠，在河之洲。窈窕淑女，君子好逑。"《诗经》作为中国最早的诗歌总集，其中大量优美词句至今仍适合用于起名。

## 精选女孩名字

### 来自《蒹葭》
- **蒹葭** — 蒹葭苍苍，白露为霜
- **伊人** — 所谓伊人，在水一方
- **白露** — 白露未已，所谓伊人

### 来自《关雎》
- **窈窕** — 窈窕淑女
- **淑** — 窈窕淑女，君子好逑
- **雎鸠** — 关关雎鸠

### 来自《桃夭》
- **桃夭** — 桃之夭夭，灼灼其华
- **灼华** — 桃之夭夭，灼灼其华
- **宜家** — 之子于归，宜其室家

### 来自《采薇》
- **采薇** — 采薇采薇，薇亦柔止
- **柔** — 薇亦柔止

## 选名建议

1. **考虑读音**：诗经词句古朴典雅，名字也要音韵和谐
2. **笔画适中**：不宜过于生僻，影响书写和他人识别
3. **寓意积极**：选择表达美好品德的字词
4. **结合姓氏**：单名与复名各有韵味，需结合姓氏整体考量`,
    coverImage: "",
    viewCount: 5217,
    likeCount: 412,
    commentCount: 88,
    favoriteCount: 341,
    createdAt: new Date("2026-04-08T10:30:00Z"),
    tags: ["诗词起名", "诗经", "女孩起名"],
  },
  {
    title: "唐诗男孩名字：100个大气稳重的男孩名推荐",
    slug: "tangshi-boy-names-100",
    summary: "春风得意马蹄疾，一日看尽长安花。唐诗中藏着最适合男孩的名字。",
    content: `## 唐诗中的男孩名字

唐代是中国诗歌的黄金时代，涌现了李白、杜甫、王维等伟大诗人。唐诗意境开阔、气势磅礴，非常适合为男孩取名。

## 精选男孩名字

### 来自李白
- **太白** — 诗仙李白的字号
- **青莲** — 李白号青莲居士
- **清风** — 俱怀逸兴壮思飞，欲上青天揽明月

### 来自杜甫
- **子美** — 杜甫字子美
- **少陵** — 杜甫号少陵野老
- **望岳** — 荡胸生层云，决眦入归鸟

### 来自王维
- **摩诘** — 王维字摩诘
- **辋川** — 王维修行之地
- **空山** — 人闲桂花落，夜静春山空

### 大气磅礴的唐诗名字
- **长安** — 春风得意马蹄疾，一日看尽长安花
- **凌云** — 俱怀逸兴壮思飞，欲上青天揽明月
- **长风** — 长风破浪会有时，直挂云帆济沧海
- **星河** — 天阶夜色凉如水，卧看牵牛织女星

## 起名要点

唐诗名字大气有内涵，选字时注意：
- 男性名字宜阳刚有力
- 避免过于阴柔的词
- 与姓氏搭配要顺口响亮`,
    coverImage: "",
    viewCount: 4531,
    likeCount: 328,
    commentCount: 56,
    favoriteCount: 271,
    createdAt: new Date("2026-04-06T09:00:00Z"),
    tags: ["诗词起名", "唐诗", "男孩起名"],
  },
  {
    title: "2026年最火的宝宝名字TOP20趋势分析",
    slug: "2026-baby-name-trends-top20",
    summary: "从寻名网数据库分析2026年最受欢迎的宝宝名字趋势与文化解读。",
    content: `## 2026年宝宝起名趋势

每年给宝宝起名都有新的流行趋势。通过寻名网的用户数据分析，我们整理出了2026年最火的宝宝名字方向。

## 2026年女孩名字趋势

### Top 5 女孩名字元素
1. **诗经词句** — "蒹葭""采薇""桃夭"持续火爆
2. **中式意境** — "念安""清欢""知意"等国风名字
3. **自然意象** — "云舒""星野""沐光"等自然系
4. **古典美德** — "婉约""端庄""雅正"等品德字
5. **复姓风** — 欧阳、夏侯等复姓受追捧

## 2026年男孩名字趋势

### Top 5 男孩名字元素
1. **唐诗大气** — "长安""凌云""长风"等
2. **楚辞豪情** — "修远""求索""正则"等
3. **家国情怀** — "安邦""定国"等大气名
4. **文武双全** — 刚柔并济的名字增多
5. **经典回归** — 单名回潮，如"安""宁""瑞"

## 起名建议

无论流行趋势如何，给宝宝起名最重要的是：
- 寓意美好
- 五行相合
- 音韵和谐
- 书写美观
- 独特不重名`,
    coverImage: "",
    viewCount: 7823,
    likeCount: 591,
    commentCount: 134,
    favoriteCount: 467,
    createdAt: new Date("2026-04-04T11:00:00Z"),
    tags: ["名字测评", "起名趋势", "2026起名"],
  },
  {
    title: "楚辞起名指南：如何用屈原的诗意给宝宝取名",
    slug: "chuci-poetry-naming-guide",
    summary: "路漫漫其修远兮，吾将上下而求索。楚辞中的豪情与浪漫，适合有抱负的宝宝。",
    content: `## 楚辞起名：浪漫与豪情并存

《楚辞》是中国文学史上第一部浪漫主义诗歌总集，其中大量词句瑰丽奇特、气势恢宏，非常适合为有抱负的宝宝取名。

## 屈原名句精选

### 经典名句
- **路漫漫** — 路漫漫其修远兮，吾将上下而求索
- **修远** — 同上，适合有志向的男孩
- **求索** — 象征不懈追求的精神
- **正则** — 名余曰正则兮，字余曰灵均
- **灵均** — 屈原之字，充满灵气

### 来自《九歌》
- **东皇太一** — 吉日兮辰良，穆将愉兮上皇
- **云中君** — 浴兰汤兮沐芳，华采衣兮若英
- **湘君** — 君不行兮夷犹，蹇谁留兮中洲

## 如何用楚辞起名

1. **直接取词**：如"修远""正则"可直接用作名字
2. **拆分组合**：从不同诗句中取字组合
3. **意象延伸**：根据屈原描绘的意象延伸取名
4. **寓意引申**：将诗句中的精神品质融入名字

楚辞名字大气、有文化底蕴，是给宝宝起名极佳的选择。`,
    coverImage: "",
    viewCount: 2987,
    likeCount: 223,
    commentCount: 37,
    favoriteCount: 198,
    createdAt: new Date("2026-04-02T08:30:00Z"),
    tags: ["诗词起名", "楚辞", "典故解析"],
  },
  {
    title: "公司起名：如何取一个能注册的吉祥商号",
    slug: "company-naming-registration-guide",
    summary: "公司起名不仅是文化事，更涉及商标注册与品牌传播。本文教你避坑取好名。",
    content: `## 公司起名的艺术与法律

公司名称是企业最重要的无形资产之一。一个好名字能让品牌传播事半功倍，而一个无法注册的名字则可能让创业者前功尽弃。

## 公司命名的法律要求

根据《企业名称登记管理规定》，公司名称：
- 不得与已注册企业名称相同或近似
- 不得含有有损国家利益的文字
- 行政区划、行业、组织形式必须规范
- 不得使用汉语拼音字母、阿拉伯数字

## 如何取一个好公司名

### 1. 音韵美感
名字读起来要顺口、响亮，有节奏感。如"阿里巴巴""腾讯"等。

### 2. 行业关联
最好让人一听就知道你是做什么的。如"百度"（信息检索）、"搜狐"（网络搜索）。

### 3. 文化内涵
融入传统文化元素，提升品牌底蕴。如"同仁堂""全聚德"。

### 4. 国际视野
如果面向全球市场，要考虑英文名的发音和含义。

### 5. 可注册性
在正式确定前，务必先做商标查询和企业名称核准。

## 常见起名方法

- **谐音法**：用与企业相关的谐音字
- **典故法**：引用成语或典故
- **组合法**：将几个有意义的字组合
- **音译法**：将外文名意译或音译为中文

一个好名字，是企业成功的第一步！`,
    coverImage: "",
    viewCount: 6124,
    likeCount: 487,
    commentCount: 72,
    favoriteCount: 389,
    createdAt: new Date("2026-03-28T14:00:00Z"),
    tags: ["起名心得", "公司起名", "商标注册"],
  },
];

async function main() {
  console.log("🌱 开始博客种子数据迁移...\n");

  // 1. 创建或获取 seed 用户
  let user = await prisma.user.findUnique({ where: { id: SEED_USER_ID } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        id: SEED_USER_ID,
        name: "寻名君",
        email: "seed@seekname.com",
        status: "active",
        vipLevel: 1,
      },
    });
    console.log(`✅ 创建种子用户: ${user.name} (${user.id})`);
  } else {
    console.log(`ℹ️  种子用户已存在: ${user.name}`);
  }

  // 2. 处理所有文章
  for (const post of SEED_POSTS) {
    // 检查 slug 是否已存在
    const existing = await prisma.blogPost.findUnique({ where: { slug: post.slug } });
    if (existing) {
      console.log(`⏭️  已存在，跳过: ${post.title}`);
      continue;
    }

    // 创建文章
    const created = await prisma.blogPost.create({
      data: {
        userId: SEED_USER_ID,
        title: post.title,
        slug: post.slug,
        summary: post.summary,
        content: post.content,
        coverImage: post.coverImage || null,
        viewCount: post.viewCount,
        likeCount: post.likeCount,
        commentCount: post.commentCount,
        favoriteCount: post.favoriteCount,
        status: "published",
        createdAt: post.createdAt,
      },
    });

    // 创建标签
    for (const tagName of post.tags) {
      // 创建或更新标签
      let tag = await prisma.blogTag.findUnique({ where: { name: tagName } });
      if (!tag) {
        const slug = tagName.toLowerCase().replace(/\s+/g, "-");
        tag = await prisma.blogTag.create({
          data: { name: tagName, slug, count: 0 },
        });
      } else {
        await prisma.blogTag.update({
          where: { id: tag.id },
          data: { count: { increment: 1 } },
        });
      }

      // 关联
      await prisma.blogPostTag.upsert({
        where: { postId_tagId: { postId: created.id, tagId: tag.id } },
        create: { postId: created.id, tagId: tag.id },
        update: {},
      });
    }

    console.log(`✅ 已创建: ${post.title}`);
  }

  console.log("\n🎉 博客种子数据迁移完成！");
}

main()
  .catch((e) => {
    console.error("❌ 迁移失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
