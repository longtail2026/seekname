/**
 * 用户中心 Dashboard
 * /dashboard
 * 统一起名历史 / 名字典藏 / 我的文章 / VIP积分 四个模块
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Package, Star, FileText, Crown, Settings, LogOut,
  Loader2, ArrowRight, Heart, ThumbsUp, Eye, Clock,
  ChevronRight, User, Shield, Gift, TrendingUp
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";

// ─── 类型定义 ────────────────────────────────────────────

interface Order {
  id: string;
  orderNo: string;
  type: string;
  amount: number;
  payStatus: string;
  status: string;
  createdAt: string;
  nameRecord?: {
    id: string;
    surname: string;
    gender: string;
    results: unknown[];
  };
}

interface Favorite {
  id: string;
  fullName: string;
  surname: string;
  gender: string;
  score: number | null;
  analysis: string | null;
  wuxing: string[];
  source: string;
  createdAt: string;
}

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  summary: string;
  cover_image: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  created_at: string;
  tags: string[];
}

// ─── 主组件 ────────────────────────────────────────────

type TabKey = "orders" | "favorites" | "articles" | "vip";

const TABS: { key: TabKey; label: string; icon: React.ReactNode; enLabel: string }[] = [
  { key: "orders", label: "起名历史", enLabel: "Naming History", icon: <Package className="w-4 h-4" /> },
  { key: "favorites", label: "名字典藏", enLabel: "Favorites", icon: <Heart className="w-4 h-4" /> },
  { key: "articles", label: "我的文章", enLabel: "My Articles", icon: <FileText className="w-4 h-4" /> },
  { key: "vip", label: "VIP会员", enLabel: "VIP Member", icon: <Crown className="w-4 h-4" /> },
];

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const { locale } = useLocale();
  const router = useRouter();
  const isEn = locale === "en";

  const [activeTab, setActiveTab] = useState<TabKey>("orders");
  const [tabLoading, setTabLoading] = useState(false);

  // 数据状态
  const [orders, setOrders] = useState<Order[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [articles, setArticles] = useState<BlogPost[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 认证检查
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // 加载标签页数据
  const loadTabData = useCallback(async (tab: TabKey) => {
    if (!user) return;
    setTabLoading(true);
    setError(null);

    const token = localStorage.getItem("seekname_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    try {
      if (tab === "orders") {
        const res = await fetch("/api/user/orders", { headers });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setOrders(data.orders || []);
      } else if (tab === "favorites") {
        const res = await fetch("/api/names/favorites", { headers });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setFavorites(data.items || []);
      } else if (tab === "articles") {
        // 需要用户 ID，尝试从 session 获取
        const sessionRes = await fetch("/api/auth/session", { headers });
        const sessionData = await sessionRes.json();
        const uid = sessionData.user?.id;
        if (!uid) throw new Error("无法获取用户信息");
        const res = await fetch(`/api/blog/posts?userId=${uid}`, { headers });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setArticles(data.posts || []);
      }
      // vip tab 使用 user 数据，无需额外请求
    } catch (err) {
      setError((err as Error).message || "加载失败");
    } finally {
      setTabLoading(false);
    }
  }, [user]);

  // 切换标签时加载数据
  useEffect(() => {
    if (!user) return;
    loadTabData(activeTab);
  }, [activeTab, user, loadTabData]);

  if (authLoading || !user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", gap: 12, color: "var(--foreground-muted)", fontFamily: "'Noto Sans SC', sans-serif" }}>
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>{isEn ? "Loading..." : "加载中..."}</span>
      </div>
    );
  }

  const userDisplayName = user.name || user.email?.split("@")[0] || (isEn ? "User" : "用户");
  const isVip = user.vipLevel > 0;

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", color: "var(--foreground)" }}>
      {/* ── 用户信息 Header ── */}
      <div
        style={{
          background: "linear-gradient(135deg, #2C1810 0%, #4A3428 50%, #6B4A38 100%)",
          padding: "32px 24px 48px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* 背景装饰 */}
        <div style={{ position: "absolute", top: -20, right: -20, width: 200, height: 200, borderRadius: "50%", background: "rgba(212,148,26,0.08)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -30, left: "30%", width: 120, height: 120, borderRadius: "50%", background: "rgba(232,106,23,0.06)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", gap: 20 }}>
          {/* 头像 */}
          {user.avatar ? (
            <img src={user.avatar} alt="" style={{ width: 64, height: 64, borderRadius: "50%", border: "3px solid rgba(212,148,26,0.5)", objectFit: "cover" }} />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg, #E86A17, #D4941A)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, color: "#fff", fontFamily: "'Noto Serif SC', serif", border: "3px solid rgba(212,148,26,0.5)" }}>
              {(user.name || user.email || "?").charAt(0).toUpperCase()}
            </div>
          )}

          {/* 用户信息 */}
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#fff", fontFamily: "'Noto Serif SC', serif" }}>
                {userDisplayName}
              </h2>
              {isVip && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", background: "rgba(212,148,26,0.25)", border: "1px solid rgba(212,148,26,0.5)", borderRadius: 20, fontSize: 12, color: "#E8B02E", fontFamily: "'Noto Serif SC', serif" }}>
                  <Crown className="w-3 h-3" /> VIP {user.vipLevel}
                </span>
              )}
            </div>
            {user.email && (
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "'Noto Sans SC', sans-serif" }}>
                {user.email}
              </p>
            )}
          </div>

          {/* 快捷操作 */}
          <div style={{ display: "flex", gap: 8 }}>
            <Link href="/settings" style={{ padding: "8px 16px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#fff", textDecoration: "none", fontSize: 13, display: "flex", alignItems: "center", gap: 6, transition: "background 0.2s" }}>
              <Settings className="w-4 h-4" />
              {isEn ? "Settings" : "设置"}
            </Link>
            <button onClick={logout} style={{ padding: "8px 16px", background: "rgba(192,57,43,0.2)", border: "1px solid rgba(192,57,43,0.3)", borderRadius: 8, color: "#FF8A7A", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, transition: "background 0.2s" }}>
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* VIP 升级卡片 */}
        {!isVip && (
          <div style={{ maxWidth: 900, margin: "24px auto 0", background: "rgba(212,148,26,0.12)", border: "1px solid rgba(212,148,26,0.25)", borderRadius: 12, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
            <Gift className="w-5 h-5" style={{ color: "#E8B02E", flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.7)", fontFamily: "'Noto Sans SC', sans-serif", flex: 1 }}>
              {isEn ? "Upgrade to VIP for unlimited name evaluations & exclusive features" : "升级 VIP，解锁无限名字测评、优先分析和专属典藏功能"}
            </p>
            <Link href="/vip" style={{ padding: "6px 16px", background: "linear-gradient(135deg, #D4941A, #E8B02E)", borderRadius: 16, color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", fontFamily: "'Noto Sans SC', sans-serif" }}>
              {isEn ? "Upgrade Now" : "立即升级"}
            </Link>
          </div>
        )}
      </div>

      {/* ── Tab 导航 + 内容 ── */}
      <div style={{ maxWidth: 900, margin: "-24px auto 0", padding: "0 20px 60px" }}>
        {/* Tab 切换器 */}
        <div
          style={{
            background: "var(--background)",
            borderRadius: "16px 16px 0 0",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            overflow: "hidden",
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: "14px 8px",
                border: "none",
                background: "none",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 5,
                fontSize: 13,
                fontWeight: activeTab === tab.key ? 600 : 400,
                color: activeTab === tab.key ? "var(--primary)" : "var(--foreground-muted)",
                borderBottom: activeTab === tab.key ? "2px solid var(--primary)" : "2px solid transparent",
                transition: "all 0.2s",
                fontFamily: "'Noto Sans SC', sans-serif",
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab 内容区 */}
        <div
          style={{
            background: "var(--background)",
            border: "1px solid var(--border)",
            borderTop: "none",
            borderRadius: "0 0 16px 16px",
            minHeight: 400,
            padding: "24px",
          }}
        >
          {tabLoading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 0", gap: 10, color: "var(--foreground-muted)", fontFamily: "'Noto Sans SC', sans-serif" }}>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{isEn ? "Loading..." : "加载中..."}</span>
            </div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--error)" }}>
              <p style={{ margin: 0, fontFamily: "'Noto Sans SC', sans-serif" }}>{error}</p>
            </div>
          ) : (
            <>
              {activeTab === "orders" && <OrdersTab orders={orders} isEn={isEn} />}
              {activeTab === "favorites" && <FavoritesTab favorites={favorites} isEn={isEn} />}
              {activeTab === "articles" && <ArticlesTab articles={articles} isEn={isEn} />}
              {activeTab === "vip" && <VipTab user={user} isEn={isEn} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 四个 Tab 内容组件 ────────────────────────────────────

function OrdersTab({ orders, isEn }: { orders: Order[]; isEn: boolean }) {
  if (orders.length === 0) return <EmptyState icon="📋" message={isEn ? "No naming history yet" : "还没有起名记录"} sub={isEn ? "Start naming to see your history here" : "使用起名服务后，记录将自动展示在这里"} actionHref="/personal" actionLabel={isEn ? "Start Naming" : "立即起名"} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {orders.map((order) => {
        const candidates: string[] = Array.isArray(order.nameRecord?.results) ? order.nameRecord.results.map((r: unknown) => (r as { name?: string }).name).filter(Boolean) : [];
        return (
          <div key={order.id} style={{ background: "var(--background-warm)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px", transition: "border-color 0.2s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px 12px", flexWrap: "wrap", marginBottom: candidates.length > 0 ? 12 : 0 }}>
              <span style={{ fontFamily: "monospace", fontSize: 13, color: "var(--primary)", fontWeight: 600 }}>{order.orderNo}</span>
              <span style={{ padding: "2px 8px", borderRadius: 8, fontSize: 11, background: "var(--primary-glow)", color: "var(--primary)", fontFamily: "'Noto Sans SC', sans-serif" }}>{order.type}</span>
              <span style={{ fontSize: 12, color: order.payStatus === "free" ? "#2EAD5A" : "var(--primary)", fontWeight: 600 }}>{order.payStatus === "free" ? (isEn ? "Free" : "免费") : `¥${order.amount}`}</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 12, color: "var(--foreground-muted)", fontFamily: "'Noto Sans SC', sans-serif" }}>
                <Clock className="w-3 h-3 inline" style={{ marginRight: 3, verticalAlign: "middle" }} />
                {new Date(order.createdAt).toLocaleDateString("zh-CN")}
              </span>
            </div>
            {order.nameRecord && (
              <div style={{ fontSize: 12, color: "var(--foreground-muted)", marginBottom: 8, fontFamily: "'Noto Sans SC', sans-serif" }}>
                {order.nameRecord.surname}姓 · {order.nameRecord.gender === "male" ? "男" : order.nameRecord.gender === "female" ? "女" : order.nameRecord.gender}
                <span style={{ marginLeft: 8, color: "#2EAD5A" }}><ThumbsUp className="w-3 h-3 inline" style={{ marginRight: 2, verticalAlign: "middle" }} />{candidates.length} {isEn ? "candidates" : "个候选名"}</span>
              </div>
            )}
            {candidates.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {candidates.slice(0, 5).map((name, i) => (
                  <Link key={i} href={`/naming/${name}`} style={{ padding: "3px 10px", borderRadius: 6, background: "#fff", border: `1px solid ${i === 0 ? "var(--primary)" : "var(--border)"}`, fontSize: 14, color: i === 0 ? "var(--primary)" : "var(--foreground-muted)", textDecoration: "none", fontFamily: "'Noto Serif SC', serif", fontWeight: i === 0 ? 600 : 400 }}>
                    {name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FavoritesTab({ favorites, isEn }: { favorites: Favorite[]; isEn: boolean }) {
  if (favorites.length === 0) return <EmptyState icon="❤️" message={isEn ? "No favorites yet" : "还没有收藏的名字"} sub={isEn ? "Save names you love to your collection" : "在名字详情页点击收藏，名字将出现在这里"} actionHref="/collection" actionLabel={isEn ? "Browse Collection" : "浏览典藏本"} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {favorites.map((fav) => (
        <div key={fav.id} style={{ background: "var(--background-warm)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Link href={`/naming/${fav.fullName}`} style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", textDecoration: "none", fontFamily: "'Noto Serif SC', serif" }}>{fav.fullName}</Link>
              <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 11, background: fav.gender === "M" ? "rgba(74,144,217,0.1)" : "rgba(232,112,160,0.1)", color: fav.gender === "M" ? "#4A90D9" : "#E870A0", fontFamily: "'Noto Sans SC', sans-serif" }}>
                {fav.gender === "M" ? (isEn ? "Boy" : "男") : (isEn ? "Girl" : "女")}
              </span>
              {fav.score && (
                <span style={{ fontSize: 13, fontWeight: 700, color: fav.score >= 85 ? "#2EAD5A" : fav.score >= 70 ? "var(--warning)" : "var(--error)" }}>
                  ⭐ {fav.score}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: "var(--foreground-muted)", fontFamily: "'Noto Sans SC', sans-serif" }}>
              {fav.surname}姓 · {fav.wuxing?.join(" · ")} · {new Date(fav.createdAt).toLocaleDateString("zh-CN")}
            </div>
          </div>
          <Link href={`/naming/${fav.fullName}`} style={{ padding: "6px 14px", background: "var(--primary)", borderRadius: 8, color: "#fff", textDecoration: "none", fontSize: 13, display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
            {isEn ? "View" : "查看"} <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      ))}
    </div>
  );
}

function ArticlesTab({ articles, isEn }: { articles: BlogPost[]; isEn: boolean }) {
  if (articles.length === 0) return <EmptyState icon="✍️" message={isEn ? "No articles yet" : "还没有发表的文章"} sub={isEn ? "Share your naming insights with the community" : "分享您的起名心得，让更多人看到"} actionHref="/blog/write" actionLabel={isEn ? "Write Article" : "写文章"} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {articles.map((post) => (
        <div key={post.id} style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16 }}>
          <Link href={`/blog/${post.slug || post.id}`} style={{ textDecoration: "none", display: "block" }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", margin: "0 0 6px", fontFamily: "'Noto Serif SC', serif", lineHeight: 1.4 }}>{post.title}</h3>
            <p style={{ fontSize: 13, color: "var(--foreground-muted)", margin: "0 0 10px", fontFamily: "'Noto Sans SC', sans-serif", lineHeight: 1.5 }}>{post.summary}</p>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "var(--foreground-muted)", display: "flex", alignItems: "center", gap: 3, fontFamily: "'Noto Sans SC', sans-serif" }}><Eye className="w-3 h-3" />{post.view_count}</span>
            <span style={{ fontSize: 12, color: "var(--foreground-muted)", display: "flex", alignItems: "center", gap: 3, fontFamily: "'Noto Sans SC', sans-serif" }}><ThumbsUp className="w-3 h-3" />{post.like_count}</span>
            <span style={{ fontSize: 12, color: "var(--foreground-muted)", display: "flex", alignItems: "center", gap: 3, fontFamily: "'Noto Sans SC', sans-serif" }}><FileText className="w-3 h-3" />{post.comment_count}</span>
            <span style={{ fontSize: 12, color: "var(--foreground-muted)", display: "flex", alignItems: "center", gap: 3, fontFamily: "'Noto Sans SC', sans-serif" }}><Clock className="w-3 h-3" />{new Date(post.created_at).toLocaleDateString("zh-CN")}</span>
            <span style={{ flex: 1 }} />
            <Link href={`/blog/${post.slug || post.id}`} style={{ fontSize: 12, color: "var(--primary)", textDecoration: "none", display: "flex", alignItems: "center", gap: 2 }}>{isEn ? "Read" : "阅读"} <ArrowRight className="w-3 h-3" /></Link>
          </div>
        </div>
      ))}
    </div>
  );
}

function VipTab({ user, isEn }: { user: { vipLevel: number; points: number }; isEn: boolean }) {
  const vip = user.vipLevel;

  const benefits = [
    { icon: "∞", text: isEn ? "Unlimited name evaluations" : "无限次名字测评", available: true },
    { icon: "⚡", text: isEn ? "Priority AI analysis" : "优先 AI 分析", available: true },
    { icon: "📖", text: isEn ? "Exclusive classic archives" : "专属典籍查阅", available: true },
    { icon: "🎁", text: isEn ? "Monthly bonus points" : "每月积分赠送", available: true },
    { icon: "📑", text: isEn ? "PDF export without watermark" : "PDF 导出无水印", available: true },
    { icon: "🔍", text: isEn ? "Advanced name matching" : "深度五行匹配", available: vip >= 2 },
    { icon: "💬", text: isEn ? "Expert consultation" : "专家一对一咨询", available: vip >= 3 },
  ];

  return (
    <div>
      {/* VIP 状态卡 */}
      <div style={{ background: "linear-gradient(135deg, #2C1810, #4A3428)", borderRadius: 16, padding: "24px", marginBottom: 24, textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -10, right: -10, width: 100, height: 100, borderRadius: "50%", background: "rgba(212,148,26,0.08)" }} />
        <Crown className="w-8 h-8" style={{ color: "#E8B02E", margin: "0 auto 8px" }} />
        <h3 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: "'Noto Serif SC', serif" }}>
          {vip === 0 ? (isEn ? "Free Member" : "免费会员") : `${isEn ? "VIP" : "VIP"} ${vip} ${isEn ? "Member" : "会员"}`}
        </h3>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "rgba(255,255,255,0.5)", fontFamily: "'Noto Sans SC', sans-serif" }}>
          {vip === 0
            ? (isEn ? "Upgrade to unlock premium features" : "升级解锁更多高级功能")
            : (isEn ? `Valid until: no expiration` : `有效期：永久有效`)}
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 16 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#E8B02E", fontFamily: "'Noto Serif SC', serif" }}>{user.points}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "'Noto Sans SC', sans-serif" }}>{isEn ? "Points" : "积分"}</div>
          </div>
          {vip > 0 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#E8B02E", fontFamily: "'Noto Serif SC', serif" }}>VIP {vip}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontFamily: "'Noto Sans SC', sans-serif" }}>{isEn ? "Level" : "等级"}</div>
            </div>
          )}
        </div>
        {vip === 0 && (
          <Link href="/vip" style={{ display: "inline-block", padding: "10px 28px", background: "linear-gradient(135deg, #D4941A, #E8B02E)", borderRadius: 20, color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 600, fontFamily: "'Noto Sans SC', sans-serif" }}>
            {isEn ? "Upgrade to VIP" : "立即升级 VIP"}
          </Link>
        )}
      </div>

      {/* 权益列表 */}
      <h4 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 600, color: "var(--ink)", fontFamily: "'Noto Sans SC', sans-serif" }}>
        {isEn ? "Membership Benefits" : "会员权益"}
      </h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {benefits.map((b, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: b.available ? "var(--background-warm)" : "var(--muted)", borderRadius: 8, opacity: b.available ? 1 : 0.5 }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{b.icon}</span>
            <span style={{ fontSize: 14, color: "var(--foreground)", fontFamily: "'Noto Sans SC', sans-serif", flex: 1 }}>{b.text}</span>
            {b.available ? (
              <span style={{ fontSize: 12, color: "#2EAD5A", display: "flex", alignItems: "center", gap: 3, fontFamily: "'Noto Sans SC', sans-serif" }}><Shield className="w-3 h-3" />{isEn ? "Active" : "已开通"}</span>
            ) : (
              <span style={{ fontSize: 12, color: "var(--foreground-muted)", fontFamily: "'Noto Sans SC', sans-serif" }}>{isEn ? "VIP " + Math.max(2, i + 1) : `VIP ${Math.max(2, i + 1)} 解锁`}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ icon, message, sub, actionHref, actionLabel }: { icon: string; message: string; sub: string; actionHref: string; actionLabel: string }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 24px" }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 600, color: "var(--ink)", fontFamily: "'Noto Serif SC', serif" }}>{message}</p>
      <p style={{ margin: "0 0 20px", fontSize: 13, color: "var(--foreground-muted)", fontFamily: "'Noto Sans SC', sans-serif" }}>{sub}</p>
      <Link href={actionHref} style={{ display: "inline-block", padding: "9px 24px", background: "var(--primary)", color: "#fff", borderRadius: 20, textDecoration: "none", fontSize: 14, fontWeight: 500, fontFamily: "'Noto Sans SC', sans-serif" }}>
        {actionLabel}
      </Link>
    </div>
  );
}
