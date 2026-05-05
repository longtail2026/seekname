/**
 * JSON-LD 结构化数据组件
 * 提供 WebSite、BreadcrumbList、ItemList、Product、Service、FAQ 等多类型结构化数据
 */
export default function JsonLd() {
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "SeekName AI起名网",
    url: "https://www.seekname.cn",
    description:
      "AI智能起名，提供宝宝起名、英文名、公司起名、店铺起名、艺名笔名、跨境电商名、外国人中文名、网名等一站式名字生成服务，好听、好记、无负面歧义。",
    inLanguage: "zh-CN",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://www.seekname.cn/search?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "CNY",
      description: "免费起名服务",
    },
    publisher: {
      "@type": "Organization",
      name: "SeekName",
      url: "https://www.seekname.cn",
      logo: {
        "@type": "ImageObject",
        url: "https://www.seekname.cn/images/icon-512.png",
        width: 512,
        height: 512,
      },
      description: "AI智能起名平台，提供多种类型的名字生成服务",
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer service",
        email: "support@seekname.cn",
      },
    },
  };

  // 全站面包屑（首页）
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "SeekName AI起名网", item: "https://www.seekname.cn" },
    ],
  };

  // 服务结构化（核心起名服务）
  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "AI起名服务",
    serviceType: "起名命名服务",
    provider: {
      "@type": "Organization",
      name: "SeekName",
      url: "https://www.seekname.cn",
    },
    areaServed: { "@type": "Country", name: "CN" },
    description: "提供AI驱动的宝宝起名、公司起名、店铺起名、英文名生成等一站式命名服务",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "CNY",
      description: "免费使用",
    },
    audience: {
      "@type": "Audience",
      audienceType: "准父母、创业者、求职者、跨境卖家、博主、宠物主",
    },
  };

  // 起名工具列表结构化数据（工具页聚合展示）
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "SeekName AI起名工具大全",
    description: "一站式AI起名工具列表，覆盖宝宝、英文、公司、店铺等各类起名需求",
    url: "https://www.seekname.cn",
    numberOfItems: 12,
    itemListOrder: "http://schema.org/ItemListOrderDescending",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "AI宝宝起名", url: "https://www.seekname.cn/personal" },
      { "@type": "ListItem", position: 2, name: "AI英文名生成", url: "https://www.seekname.cn/en/choose-name" },
      { "@type": "ListItem", position: 3, name: "AI公司起名", url: "https://www.seekname.cn/company" },
      { "@type": "ListItem", position: 4, name: "AI品牌起名", url: "https://www.seekname.cn/brand" },
      { "@type": "ListItem", position: 5, name: "AI店铺起名", url: "https://www.seekname.cn/shop" },
      { "@type": "ListItem", position: 6, name: "跨境电商英文起名", url: "https://www.seekname.cn/business-name/cross-border-en-name" },
      { "@type": "ListItem", position: 7, name: "AI外国人中文名", url: "https://www.seekname.cn/foreigner-name" },
      { "@type": "ListItem", position: 8, name: "AI艺名笔名生成", url: "https://www.seekname.cn/work-name" },
      { "@type": "ListItem", position: 9, name: "AI社交网名", url: "https://www.seekname.cn/social-name" },
      { "@type": "ListItem", position: 10, name: "AI宠物起名", url: "https://www.seekname.cn/pet" },
      { "@type": "ListItem", position: 11, name: "AI名字评分", url: "https://www.seekname.cn/evaluate" },
      { "@type": "ListItem", position: 12, name: "起名知识博客", url: "https://www.seekname.cn/blog" },
    ],
  };

  // FAQ 结构化（页面上常见问题）
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "SeekName可以免费使用吗？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "SeekName所有起名工具完全免费，包括宝宝起名、公司起名、英文名生成、店铺起名等，无需付费即可使用。",
        },
      },
      {
        "@type": "Question",
        name: "AI起的名字靠谱吗？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "SeekName基于先进的AI模型，结合八字命理、音律美学、文化寓意、商标核名等多维度考量，生成的名字好听、好记、无负面歧义，质量有保障。",
        },
      },
      {
        "@type": "Question",
        name: "SeekName有哪些起名工具？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "平台提供宝宝起名、英文名生成、公司起名、品牌起名、店铺起名、跨境电商英文名、外国人中文名、艺名笔名、社交网名、宠物起名、名字评分等12+种起名工具。",
        },
      },
      {
        "@type": "Question",
        name: "起名的结果可以商用吗？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "AI生成的名字仅作为建议和灵感参考，建议在使用前进行商标查询和工商核名，确保名字的合法可用性。",
        },
      },
    ],
  };

  // 博客文章结构化（用于博客列表页，让蜘蛛理解博客内容结构）
  const blogCollectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "起名知识博客 - 宝宝起名技巧·名字大全·命名文化",
    description: "分享宝宝起名技巧、好听名字大全、英文名推荐、公司店铺起名攻略、命名文化典故等丰富内容",
    url: "https://www.seekname.cn/blog",
    isPartOf: {
      "@type": "WebSite",
      name: "SeekName AI起名网",
      url: "https://www.seekname.cn",
    },
    about: {
      "@type": "Thing",
      name: "起名命名文化",
    },
  };

  // 企业信息结构化（增强搜索引擎对企业站点的信任）
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "SeekName AI起名网",
    url: "https://www.seekname.cn",
    logo: "https://www.seekname.cn/images/icon-512.png",
    description: "AI智能起名平台，提供宝宝起名、英文名、公司起名、店铺起名等一站式名字生成服务",
    foundingDate: "2024",
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        email: "support@seekname.cn",
        availableLanguage: ["Chinese", "English"],
      },
    ],
    sameAs: [
      "https://github.com/longtail2026/seekname",
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogCollectionJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
    </>
  );
}