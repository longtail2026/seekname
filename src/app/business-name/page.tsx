/**
 * 统一商业起名页面
 * /business-name
 *
 * 整合公司起名、品牌起名、店铺起名、项目起名四个类型
 * 顶部切换器切换类型，表单自动适配
 */
"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Building2, Sparkles, Info,
  Loader2, Copy, Check, AlertTriangle, Shield, Globe, Target, Store,
  ChevronDown, ChevronUp,
} from "lucide-react";

/* ─── 常量 ─── */
type BusinessType = "company" | "brand" | "shop" | "project";

const BUSINESS_TYPES: { key: BusinessType; label: string; icon: string; desc: string }[] = [
  { key: "company", label: "公司起名", icon: "🏢", desc: "工商核名友好" },
  { key: "brand", label: "品牌起名", icon: "⭐", desc: "品牌定位精准" },
  { key: "shop", label: "店铺起名", icon: "🏪", desc: "好记吸睛" },
  { key: "project", label: "项目起名", icon: "🚀", desc: "简短有力" },
];

const INDUSTRIES = [
  "科技 / 互联网 / 软件",
  "电商 / 贸易 / 零售",
  "文化传媒 / 广告",
  "美妆 / 护肤",
  "服装 / 服饰",
  "餐饮 / 食品",
  "教育 / 咨询",
  "设计 / 创意",
  "建筑 / 工程",
  "医疗 / 健康",
  "制造 / 生产",
  "服务行业",
];

const STYLES = ["大气稳重", "现代科技", "简约国际", "高端品质", "创意独特", "传统吉利", "年轻潮流", "文艺清新"];

const LENGTHS = [
  { value: "2", label: "2 字", note: "难注册" },
  { value: "3", label: "3 字", note: "中等" },
  { value: "4", label: "4 字", note: "推荐" },
  { value: "不限", label: "不限", note: "" },
];

const COMPANY_TYPES = ["有限责任公司", "个体工商户", "科技工作室", "商贸电商", "品牌工作室", "其他"];

const BRAND_POSITIONING = ["中端大众", "高端品质", "潮牌时尚", "国风文化", "科技极简", "自然环保"];
const SHOP_TYPES = ["餐饮美食", "服装服饰", "美业护肤", "电商网店", "生活服务", "教育培训", "文化创意"];
const PROJECT_FIELDS = ["产品品牌", "活动策划", "课程培训", "IP创作", "技术项目", "社群社区"];

const PROVINCES = [
  "安徽", "澳门", "北京", "重庆", "福建", "甘肃", "广东", "广西", "贵州",
  "海南", "河北", "河南", "黑龙江", "湖北", "湖南", "吉林", "江苏", "江西",
  "辽宁", "内蒙古", "宁夏", "青海", "山东", "山西", "陕西", "上海", "四川",
  "台湾", "天津", "西藏", "香港", "新疆", "云南", "浙江",
];

const CITY_MAP: Record<string, string[]> = {
  "安徽": ["安庆", "蚌埠", "亳州", "池州", "滁州", "阜阳", "合肥", "淮北", "淮南", "黄山", "六安", "马鞍山", "铜陵", "芜湖", "宿州", "宣城"],
  "北京": ["东城", "西城", "朝阳", "海淀", "丰台", "石景山", "通州", "大兴", "房山", "门头沟", "昌平", "顺义", "平谷", "怀柔", "密云", "延庆"],
  "重庆": ["渝中", "江北", "沙坪坝", "九龙坡", "南岸", "北碚", "渝北", "巴南", "万州", "涪陵", "长寿", "江津", "合川", "永川", "南川", "綦江", "大足", "璧山", "铜梁", "潼南", "荣昌", "开州", "梁平", "武隆", "城口", "丰都", "垫江", "忠县", "云阳", "奉节", "巫山", "巫溪", "石柱", "秀山", "酉阳", "彭水"],
  "福建": ["福州", "厦门", "莆田", "三明", "泉州", "漳州", "南平", "龙岩", "宁德"],
  "甘肃": ["兰州", "嘉峪关", "金昌", "白银", "天水", "武威", "张掖", "平凉", "酒泉", "庆阳", "定西", "陇南", "临夏", "甘南"],
  "广东": ["广州", "深圳", "珠海", "汕头", "佛山", "韶关", "湛江", "肇庆", "江门", "茂名", "惠州", "梅州", "汕尾", "河源", "阳江", "清远", "东莞", "中山", "潮州", "揭阳", "云浮"],
  "广西": ["南宁", "柳州", "桂林", "梧州", "北海", "防城港", "钦州", "贵港", "玉林", "百色", "贺州", "河池", "来宾", "崇左"],
  "海南": ["海口", "三亚", "三沙", "儋州", "五指山", "琼海", "文昌", "万宁", "东方", "定安", "屯昌", "澄迈", "临高", "白沙", "昌江", "乐东", "陵水", "保亭", "琼中"],
  "河北": ["石家庄", "唐山", "秦皇岛", "邯郸", "邢台", "保定", "张家口", "承德", "沧州", "廊坊", "衡水"],
  "河南": ["郑州", "开封", "洛阳", "平顶山", "安阳", "鹤壁", "新乡", "焦作", "濮阳", "许昌", "漯河", "三门峡", "南阳", "商丘", "信阳", "周口", "驻马店", "济源"],
  "黑龙江": ["哈尔滨", "齐齐哈尔", "鸡西", "鹤岗", "双鸭山", "大庆", "伊春", "佳木斯", "七台河", "牡丹江", "黑河", "绥化", "大兴安岭"],
  "湖北": ["武汉", "黄石", "十堰", "宜昌", "襄阳", "鄂州", "荆门", "孝感", "荆州", "黄冈", "咸宁", "随州", "恩施", "仙桃", "潜江", "天门", "神农架"],
  "湖南": ["长沙", "株洲", "湘潭", "衡阳", "邵阳", "岳阳", "常德", "张家界", "益阳", "郴州", "永州", "怀化", "娄底", "湘西"],
  "吉林": ["长春", "吉林", "四平", "辽源", "通化", "白山", "松原", "白城", "延边"],
  "江苏": ["南京", "无锡", "徐州", "常州", "苏州", "南通", "连云港", "淮安", "盐城", "扬州", "镇江", "泰州", "宿迁"],
  "江西": ["南昌", "景德镇", "萍乡", "九江", "新余", "鹰潭", "赣州", "吉安", "宜春", "抚州", "上饶"],
  "辽宁": ["沈阳", "大连", "鞍山", "抚顺", "本溪", "丹东", "锦州", "营口", "阜新", "辽阳", "盘锦", "铁岭", "朝阳", "葫芦岛"],
  "山东": ["济南", "青岛", "淄博", "枣庄", "东营", "烟台", "潍坊", "济宁", "泰安", "威海", "日照", "临沂", "德州", "聊城", "滨州", "菏泽"],
  "山西": ["太原", "大同", "阳泉", "长治", "晋城", "朔州", "晋中", "运城", "忻州", "临汾", "吕梁"],
  "陕西": ["西安", "铜川", "宝鸡", "咸阳", "渭南", "延安", "汉中", "榆林", "安康", "商洛"],
  "上海": ["黄浦", "徐汇", "长宁", "静安", "普陀", "虹口", "杨浦", "闵行", "宝山", "嘉定", "浦东", "金山", "松江", "青浦", "奉贤", "崇明"],
  "四川": ["成都", "自贡", "攀枝花", "泸州", "德阳", "绵阳", "广元", "遂宁", "内江", "乐山", "南充", "眉山", "宜宾", "广安", "达州", "雅安", "巴中", "资阳", "阿坝", "甘孜", "凉山"],
  "天津": ["和平", "河东", "河西", "南开", "河北", "红桥", "东丽", "西青", "津南", "北辰", "武清", "宝坻", "滨海", "宁河", "静海", "蓟州"],
  "浙江": ["杭州", "宁波", "温州", "嘉兴", "湖州", "绍兴", "金华", "衢州", "舟山", "台州", "丽水"],
};

interface NameResult {
  name: string;
  meaning: string;
  industryMatch: string;
  risk: string;
}

const riskColor = (r: string) => {
  switch (r) {
    case "低": return { bg: "#ECFDF5", text: "#059669", label: "推荐度高" };
    case "高": return { bg: "#FEF2F2", text: "#DC2626", label: "推荐度低" };
    case "★": case "★★": return { bg: "#FEF2F2", text: "#DC2626", label: "推荐度低" };
    case "★★★": case "★★★★": return { bg: "#FFFBEB", text: "#D97706", label: "推荐度中" };
    case "★★★★★": return { bg: "#ECFDF5", text: "#059669", label: "推荐度高" };
    default: return { bg: "#FFFBEB", text: "#D97706", label: "适中" };
  }
};

const matchColor = (m: string) => {
  switch (m) {
    case "高": return "#059669";
    case "中": return "#D97706";
    case "低": return "#78716C";
    default: return "#78716C";
  }
};

/* ─── 主组件 ─── */
export default function BusinessNamePage() {
  const [type, setType] = useState<BusinessType>("company");

  // 通用字段
  const [industry, setIndustry] = useState("");
  const [customIndustry, setCustomIndustry] = useState("");
  const [business, setBusiness] = useState("");
  const [style, setStyle] = useState<string[]>([]);
  const [keywords, setKeywords] = useState("");
  const [lengthPref, setLengthPref] = useState("3");
  const [avoid, setAvoid] = useState("");

  // 公司特有
  const [companyType, setCompanyType] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");

  // 品牌特有
  const [brandPositioning, setBrandPositioning] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [international, setInternational] = useState(false);
  const [trademarkFriendly, setTrademarkFriendly] = useState(false);

  // 店铺特有
  const [shopType, setShopType] = useState("");
  const [shopStyle, setShopStyle] = useState("");
  const [catchy, setCatchy] = useState(false);

  // 项目特有
  const [projectField, setProjectField] = useState("");
  const [projectTone, setProjectTone] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<NameResult[]>([]);
  const [copied, setCopied] = useState("");
  const [showTips, setShowTips] = useState(true);

  // 当前类型的城市列表
  const cities = useMemo(() => (province ? CITY_MAP[province] || [] : []), [province]);

  const toggleStyle = (s: string) => {
    setStyle((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : prev.length < 3 ? [...prev, s] : prev
    );
  };

  const handleSubmit = useCallback(async () => {
    const finalIndustry = customIndustry || industry;
    if (!finalIndustry) { setError("请选择或填写所属行业"); return; }
    if (!business.trim()) { setError("请填写主营业务描述"); return; }
    if (style.length === 0) { setError("请选择至少一个名字风格"); return; }
    if (type === "company" && (!province || !city)) { setError("请选择注册地区（省/市）"); return; }

    setError("");
    setLoading(true);
    setResults([]);

    try {
      const body: Record<string, any> = {
        type,
        industry: finalIndustry,
        business: business.trim(),
        style,
        keywords: keywords.trim() || undefined,
        length: lengthPref,
        avoid: avoid.trim() || undefined,
      };

      // 类型特有字段
      if (type === "company") {
        body.companyType = companyType || "有限责任公司";
        body.province = province;
        body.city = city;
      } else if (type === "brand") {
        body.brandPositioning = brandPositioning || undefined;
        body.targetAudience = targetAudience || undefined;
        body.international = international;
        body.trademarkFriendly = trademarkFriendly;
      } else if (type === "shop") {
        body.shopType = shopType || undefined;
        body.shopStyle = shopStyle || undefined;
        body.catchy = catchy;
      } else if (type === "project") {
        body.projectField = projectField || undefined;
        body.projectTone = projectTone || undefined;
      }

      const res = await fetch("/api/business-name/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success && data.data?.length > 0) {
        setResults(data.data);
      } else {
        setError(data.message || "AI 生成失败，请重试");
      }
    } catch {
      setError("网络请求失败，请重试");
    } finally {
      setLoading(false);
    }
  }, [type, industry, customIndustry, business, style, keywords, lengthPref, avoid,
      companyType, province, city,
      brandPositioning, targetAudience, international, trademarkFriendly,
      shopType, shopStyle, catchy,
      projectField, projectTone]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(""), 2000);
  };

  // 根据类型获取横幅标题
  const bannerInfo = useMemo(() => {
    const map: Record<BusinessType, { icon: React.ReactNode; title: string; tagline: string }> = {
      company: {
        icon: <Building2 size={28} color="#95D5B2" />,
        title: "AI 公司起名",
        tagline: "工商核名友好 · 易通过 · 贴合行业",
      },
      brand: {
        icon: <Target size={28} color="#95D5B2" />,
        title: "AI 品牌起名",
        tagline: "精准定位 · 国际化友好 · 有记忆点",
      },
      shop: {
        icon: <Store size={28} color="#95D5B2" />,
        title: "AI 店铺起名",
        tagline: "好记吸睛 · 氛围感强 · 易传播",
      },
      project: {
        icon: <Globe size={28} color="#95D5B2" />,
        title: "AI 项目起名",
        tagline: "简短有力 · 传播性强 · 高识别度",
      },
    };
    return map[type];
  }, [type]);

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF9" }}>
      {/* 顶部横幅 */}
      <div
        style={{
          background: "linear-gradient(135deg, #1B4332 0%, #2D6A4F 50%, #40916C 100%)",
          padding: "32px 20px 20px",
          textAlign: "center",
        }}
      >
        {bannerInfo.icon}
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#fff", margin: "6px 0 2px", letterSpacing: 1 }}>
          {bannerInfo.title}
        </h1>
        <p style={{ fontSize: 13, color: "#95D5B2", margin: 0 }}>{bannerInfo.tagline}</p>

        {/* 类型切换器 - 放在横幅中 */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 6,
            marginTop: 16,
            flexWrap: "wrap",
          }}
        >
          {BUSINESS_TYPES.map((bt) => (
            <button
              key={bt.key}
              onClick={() => {
                setType(bt.key);
                setResults([]);
                setError("");
              }}
              style={{
                padding: "8px 16px",
                borderRadius: 24,
                border: type === bt.key ? "2px solid #95D5B2" : "1px solid rgba(149, 213, 178, 0.3)",
                background: type === bt.key ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)",
                color: type === bt.key ? "#fff" : "#95D5B2",
                fontSize: 13,
                fontWeight: type === bt.key ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.2s",
                backdropFilter: "blur(4px)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.2)";
                (e.currentTarget as HTMLElement).style.color = "#fff";
              }}
              onMouseLeave={(e) => {
                if (type !== bt.key) {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                  (e.currentTarget as HTMLElement).style.color = "#95D5B2";
                }
              }}
            >
              {bt.icon} {bt.label}
              <span style={{ fontSize: 11, opacity: 0.7, marginLeft: 4 }}>· {bt.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 990, margin: "0 auto", padding: "24px 16px" }}>
        {/* 提示信息 */}
        {type === "company" && showTips && (
          <div
            style={{
              background: "#FFF7ED",
              border: "1px solid #FED7AA",
              borderRadius: 12,
              padding: "14px 16px",
              marginBottom: 20,
              fontSize: 13,
              color: "#9A3412",
              lineHeight: 1.6,
              position: "relative",
            }}
          >
            <button
              onClick={() => setShowTips(false)}
              style={{ position: "absolute", top: 8, right: 10, background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#9A3412" }}
            >
              ✕
            </button>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <Info size={16} style={{ marginTop: 2, flexShrink: 0 }} />
              <div>
                <strong>注册难度参考：</strong>2字≈难注册 · 3字≈中等 · 4字最易通过<br />
                同地区同行业不能重名 · 最终以当地工商局核名为准
              </div>
            </div>
          </div>
        )}

        {/* 表单卡片 */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            border: "1px solid #E7E5E4",
            padding: 24,
          }}
        >
          {/* ── 通用字段 ── */}

          {/* 1. 所属行业 */}
          <SectionTitle num="1" title="所属行业" required />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            {INDUSTRIES.map((ind) => (
              <button
                key={ind}
                onClick={() => { setIndustry(ind); setCustomIndustry(""); }}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: `1px solid ${(industry === ind && !customIndustry) ? "#2D6A4F" : "#D6D3D1"}`,
                  background: (industry === ind && !customIndustry) ? "#2D6A4F" : "#fff",
                  color: (industry === ind && !customIndustry) ? "#fff" : "#44403C",
                  fontSize: 13,
                  fontWeight: (industry === ind && !customIndustry) ? 600 : 400,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {ind}
              </button>
            ))}
          </div>
          <input
            placeholder="或自定义行业（如：宠物医疗、新能源电池）"
            value={customIndustry}
            onChange={(e) => { setCustomIndustry(e.target.value); setIndustry(""); }}
            style={{ ...inputStyle, marginBottom: 20 }}
          />

          {/* 2. 主营业务描述 */}
          <SectionTitle num="2" title="主营业务描述" required />
          <textarea
            placeholder="请简要填写业务描述（10–20字）&#10;例：软件开发、短视频运营、化妆品销售、服装设计"
            value={business}
            onChange={(e) => setBusiness(e.target.value)}
            rows={3}
            style={{ ...inputStyle, width: "100%", resize: "vertical", marginBottom: 20, lineHeight: 1.5 }}
          />

          {/* 3. 名字风格 */}
          <SectionTitle num="3" title="名字风格" required extra="（最多选 3 个）" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {STYLES.map((s) => (
              <button
                key={s}
                onClick={() => toggleStyle(s)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: `1px solid ${style.includes(s) ? "#2D6A4F" : "#D6D3D1"}`,
                  background: style.includes(s) ? "#2D6A4F" : "#fff",
                  color: style.includes(s) ? "#fff" : "#44403C",
                  fontSize: 14,
                  fontWeight: style.includes(s) ? 600 : 400,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* ── 类型特有字段 ── */}

          {/* 公司起名特有 */}
          {type === "company" && (
            <>
              {/* 企业类型 */}
              <SectionTitle num="4" title="企业类型" required />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                {COMPANY_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setCompanyType(t)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: `1px solid ${companyType === t ? "#2D6A4F" : "#D6D3D1"}`,
                      background: companyType === t ? "#2D6A4F" : "#fff",
                      color: companyType === t ? "#fff" : "#44403C",
                      fontSize: 14,
                      fontWeight: companyType === t ? 600 : 400,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* 注册地区（省/市下拉联动） */}
              <SectionTitle num="5" title="注册地区" required />
              <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
                <select
                  value={province}
                  onChange={(e) => { setProvince(e.target.value); setCity(""); }}
                  style={selectStyle}
                >
                  <option value="">选择省份</option>
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  style={{ ...selectStyle, flex: 1 }}
                  disabled={!province}
                >
                  <option value="">{province ? "选择地市" : "请先选择省份"}</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* 品牌起名特有 */}
          {type === "brand" && (
            <>
              <SectionTitle num="4" title="品牌定位" />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                {BRAND_POSITIONING.map((p) => (
                  <button
                    key={p}
                    onClick={() => setBrandPositioning(brandPositioning === p ? "" : p)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: `1px solid ${brandPositioning === p ? "#2D6A4F" : "#D6D3D1"}`,
                      background: brandPositioning === p ? "#2D6A4F" : "#fff",
                      color: brandPositioning === p ? "#fff" : "#44403C",
                      fontSize: 14,
                      fontWeight: brandPositioning === p ? 600 : 400,
                      cursor: "pointer",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <SectionTitle num="5" title="目标人群" />
              <input
                placeholder="例：Z 世代、职场精英、宝妈、大学生、中产阶级"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                style={{ ...inputStyle, marginBottom: 12 }}
              />

              <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#44403C", cursor: "pointer" }}>
                  <input type="checkbox" checked={international} onChange={(e) => setInternational(e.target.checked)} />
                  考虑未来国际化
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#44403C", cursor: "pointer" }}>
                  <input type="checkbox" checked={trademarkFriendly} onChange={(e) => setTrademarkFriendly(e.target.checked)} />
                  需要商标友好
                </label>
              </div>
            </>
          )}

          {/* 店铺起名特有 */}
          {type === "shop" && (
            <>
              <SectionTitle num="4" title="店铺类型" />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                {SHOP_TYPES.map((st) => (
                  <button
                    key={st}
                    onClick={() => setShopType(shopType === st ? "" : st)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: `1px solid ${shopType === st ? "#2D6A4F" : "#D6D3D1"}`,
                      background: shopType === st ? "#2D6A4F" : "#fff",
                      color: shopType === st ? "#fff" : "#44403C",
                      fontSize: 14,
                      fontWeight: shopType === st ? 600 : 400,
                      cursor: "pointer",
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <SectionTitle num="5" title="店铺风格" />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                {["网红打卡", "复古文艺", "简约冷淡", "温馨治愈", "高端精致", "潮流街头"].map((ss) => (
                  <button
                    key={ss}
                    onClick={() => setShopStyle(shopStyle === ss ? "" : ss)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: `1px solid ${shopStyle === ss ? "#2D6A4F" : "#D6D3D1"}`,
                      background: shopStyle === ss ? "#2D6A4F" : "#fff",
                      color: shopStyle === ss ? "#fff" : "#44403C",
                      fontSize: 14,
                      fontWeight: shopStyle === ss ? 600 : 400,
                      cursor: "pointer",
                    }}
                  >
                    {ss}
                  </button>
                ))}
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, color: "#44403C", cursor: "pointer", marginBottom: 20 }}>
                <input type="checkbox" checked={catchy} onChange={(e) => setCatchy(e.target.checked)} />
                需要吸睛、易传播、好记
              </label>
            </>
          )}

          {/* 项目起名特有 */}
          {type === "project" && (
            <>
              <SectionTitle num="4" title="项目领域" />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                {PROJECT_FIELDS.map((pf) => (
                  <button
                    key={pf}
                    onClick={() => setProjectField(projectField === pf ? "" : pf)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: `1px solid ${projectField === pf ? "#2D6A4F" : "#D6D3D1"}`,
                      background: projectField === pf ? "#2D6A4F" : "#fff",
                      color: projectField === pf ? "#fff" : "#44403C",
                      fontSize: 14,
                      fontWeight: projectField === pf ? 600 : 400,
                      cursor: "pointer",
                    }}
                  >
                    {pf}
                  </button>
                ))}
              </div>

              <SectionTitle num="5" title="调性" />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                {["简洁有力", "震撼冲击", "专业可靠", "可爱亲和", "科幻未来", "国风典雅"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setProjectTone(projectTone === t ? "" : t)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 8,
                      border: `1px solid ${projectTone === t ? "#2D6A4F" : "#D6D3D1"}`,
                      background: projectTone === t ? "#2D6A4F" : "#fff",
                      color: projectTone === t ? "#fff" : "#44403C",
                      fontSize: 14,
                      fontWeight: projectTone === t ? 600 : 400,
                      cursor: "pointer",
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#166534", marginBottom: 20, display: "flex", alignItems: "flex-start", gap: 6 }}>
                <Info size={14} style={{ marginTop: 1, flexShrink: 0 }} />
                <span>项目名建议 2–3 字，简短有力、传播性强。已自动优化字数偏好。</span>
              </div>
            </>
          )}

          {/* 通用：关键词 / 包含字 */}
          <SectionTitle num="6" title="希望包含的字 / 关键词" />
          <input
            placeholder={type === "company" ? "诚信、创新、致远、恒、鑫、瑞、泽…" : "希望名称中包含的词或寓意"}
            value={keywords}
            onChange={(e) => setKeywords(e.target.value.slice(0, 20))}
            style={{ ...inputStyle, marginBottom: 20 }}
          />

          {/* 通用：字数偏好 */}
          <SectionTitle num="7" title="字数偏好" required />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {LENGTHS.map((l) => (
              <button
                key={l.value}
                onClick={() => setLengthPref(l.value)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: `1px solid ${lengthPref === l.value ? "#2D6A4F" : "#D6D3D1"}`,
                  background: lengthPref === l.value ? "#2D6A4F" : "#fff",
                  color: lengthPref === l.value ? "#fff" : "#44403C",
                  fontSize: 14,
                  fontWeight: lengthPref === l.value ? 600 : 400,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {l.label}
                {l.note && (
                  <span style={{ opacity: 0.7, marginLeft: 4, fontSize: 12 }}>· {l.note}</span>
                )}
              </button>
            ))}
          </div>

          {/* 通用：禁忌词 */}
          <SectionTitle num="8" title="禁忌 / 不想要的" />
          <input
            placeholder="例：不要太土、不要「鑫/隆/发」类字、不要生僻字"
            value={avoid}
            onChange={(e) => setAvoid(e.target.value)}
            style={{ ...inputStyle, marginBottom: 24 }}
          />

          {/* 错误提示 */}
          {error && (
            <div style={{ color: "#DC2626", fontSize: 14, marginBottom: 16, padding: "8px 12px", background: "#FEF2F2", borderRadius: 8 }}>
              ⚠️ {error}
            </div>
          )}

          {/* 提交按钮 */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px 0",
              borderRadius: 12,
              border: "none",
              background: loading ? "#A8A29E" : "linear-gradient(135deg, #1B4332, #2D6A4F)",
              color: "#fff",
              fontSize: 16,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "opacity 0.2s",
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                正在生成...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                立即生成{
                  type === "company" ? "公司名" :
                  type === "brand" ? "品牌名" :
                  type === "shop" ? "店铺名" : "项目名"
                }
              </>
            )}
          </button>
        </div>

        {/* 结果区域 */}
        {results.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "#292524", margin: "0 0 4px" }}>
              推荐{
                type === "company" ? "公司名" :
                type === "brand" ? "品牌名" :
                type === "shop" ? "店铺名" : "项目名"
              }
            </h2>
            <p style={{ fontSize: 13, color: "#A8A29E", margin: "0 0 16px" }}>
              {type === "company" ? "以下名称由 AI 根据工商核名规则生成，最终以当地工商局核名为准" :
               "以下名称由 AI 智能生成"}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {results.map((item, i) => {
                const riskInfo = riskColor(item.risk);
                return (
                  <div
                    key={i}
                    style={{
                      background: "#fff",
                      borderRadius: 12,
                      border: "1px solid #E7E5E4",
                      padding: "16px 18px",
                      position: "relative",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div>
                        <span style={{ fontSize: 18, fontWeight: 700, color: "#292524" }}>{item.name}</span>
                        <span
                          style={{
                            marginLeft: 10,
                            fontSize: 12,
                            padding: "2px 8px",
                            borderRadius: 4,
                            background: riskInfo.bg,
                            color: riskInfo.text,
                            fontWeight: 600,
                          }}
                        >
                          {riskInfo.label}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopy(item.name)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#A8A29E", padding: 4 }}
                        title="复制"
                      >
                        {copied === item.name ? <Check size={16} color="#059669" /> : <Copy size={16} />}
                      </button>
                    </div>
                    <p style={{ fontSize: 14, color: "#57534E", margin: "0 0 8px", lineHeight: 1.5 }}>
                      {item.meaning}
                    </p>
                    <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#A8A29E" }}>
                      <span>
                        {type === "company" ? "行业匹配：" : type === "brand" ? "调性匹配：" : type === "shop" ? "氛围匹配：" : "传播力："}
                        <span style={{ color: matchColor(item.industryMatch), fontWeight: 600 }}>{item.industryMatch}</span>
                      </span>
                      <span>
                        <Shield size={12} style={{ display: "inline", marginRight: 2 }} />
                        {type === "company" ? "以工商局核名为准" : "AI 推荐"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 免责声明 */}
            <div
              style={{
                marginTop: 16,
                padding: "12px 16px",
                background: "#F5F5F4",
                borderRadius: 10,
                fontSize: 12,
                color: "#A8A29E",
                display: "flex",
                alignItems: "flex-start",
                gap: 6,
                lineHeight: 1.5,
              }}
            >
              <AlertTriangle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
              <span>
                {type === "company"
                  ? "本工具生成的公司名称仅供参考，不构成注册建议。实际工商注册结果以当地市场监督管理局核名为准。建议使用前通过国家企业信用信息公示系统查询是否已被注册。"
                  : "本工具生成的名称为 AI 推荐，仅供参考。建议最终使用前进行必要的商标查询和版权检查。"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── 子组件 ─── */
function SectionTitle({ num, title, required, extra }: { num: string; title: string; required?: boolean; extra?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 10 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#2D6A4F", background: "#D8F3DC", padding: "2px 6px", borderRadius: 4 }}>
        {num}
      </span>
      <span style={{ fontSize: 14, fontWeight: 600, color: "#292524" }}>
        {title}
        {required && <span style={{ color: "#DC2626", marginLeft: 2 }}>*</span>}
      </span>
      {extra && <span style={{ fontSize: 12, color: "#A8A29E" }}>{extra}</span>}
    </div>
  );
}

/* ─── 公共样式 ─── */
const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #D6D3D1",
  fontSize: 14,
  color: "#292524",
  background: "#fff",
  outline: "none",
  fontFamily: "'Noto Sans SC', sans-serif",
};

const selectStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #D6D3D1",
  fontSize: 14,
  color: "#292524",
  background: "#fff",
  outline: "none",
  fontFamily: "'Noto Sans SC', sans-serif",
  cursor: "pointer",
  minWidth: 140,
};