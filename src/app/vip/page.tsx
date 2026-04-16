"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/layout/Header";

// PayPal JS SDK 全局类型
declare const paypal: {
  Buttons(config: {
    style?: Record<string, string>;
    onClick?: (data: unknown, actions: { reject: () => unknown; resolve: () => unknown }) => unknown;
    createOrder?: () => Promise<string>;
    onApprove?: (data: { orderID: string }) => void;
    onCancel?: () => void;
    onError?: (err: unknown) => void;
  }): { render: (el: HTMLElement) => void };
};

const TIERS = [
  {
    level: 0,
    name: "免费版",
    badge: "",
    price: "¥0",
    period: "永久免费",
    description: "体验基础起名功能，适合尝鲜用户",
    color: "#888",
    bg: "#F8F8F8",
    accentColor: "#CCC",
    features: [
      { text: "每日名字生成 5 次", included: true },
      { text: "基础五行分析", included: true },
      { text: "单页测评报告", included: true },
      { text: "典籍引用 3 条", included: true },
      { text: "无限名字生成", included: false },
      { text: "深度五行分析", included: false },
      { text: "AI 典籍完整解读", included: false },
      { text: "重名率查询", included: false },
      { text: "优先客服支持", included: false },
      { text: "专属典藏名字本", included: false },
    ],
    cta: "免费体验",
    ctaStyle: "outline" as const,
    highlighted: false,
  },
  {
    level: 1,
    name: "VIP 会员",
    badge: "最受欢迎",
    price: "¥29",
    period: "/月",
    description: "解锁全部功能，适合有明确起名需求的用户",
    color: "#E86A17",
    bg: "#FFF8F4",
    accentColor: "#E86A17",
    features: [
      { text: "每日名字生成 5 次", included: true },
      { text: "基础五行分析", included: true },
      { text: "单页测评报告", included: true },
      { text: "典籍引用 3 条", included: true },
      { text: "每日名字生成 200 次", included: true },
      { text: "深度五行分析（金木水火土）", included: true },
      { text: "AI 典籍完整解读（诗经/楚辞/唐诗）", included: true },
      { text: "全国重名率查询", included: true },
      { text: "优先客服支持", included: false },
      { text: "专属典藏名字本（云端保存）", included: false },
    ],
    cta: "立即开通",
    ctaStyle: "filled" as const,
    highlighted: true,
  },
  {
    level: 2,
    name: "SVIP 会员",
    badge: "年度超值",
    price: "¥199",
    period: "/年",
    description: "SVIP 折合约 ¥16.6/月，全网最低价，畅享一年专属权益",
    color: "#D4941A",
    bg: "#FFFCF0",
    accentColor: "#D4941A",
    features: [
      { text: "每日名字生成 5 次", included: true },
      { text: "基础五行分析", included: true },
      { text: "单页测评报告", included: true },
      { text: "典籍引用 3 条", included: true },
      { text: "无限名字生成", included: true },
      { text: "深度五行分析（金木水火土）", included: true },
      { text: "AI 典籍完整解读（全部典籍）", included: true },
      { text: "全国重名率 + 方言谐音分析", included: true },
      { text: "7×24 小时专属客服", included: true },
      { text: "专属典藏名字本（云端保存 + 导出）", included: true },
    ],
    cta: "开通年卡",
    ctaStyle: "filled-gold" as const,
    highlighted: false,
  },
];

const FAQS = [
  {
    q: "免费版和 VIP 有什么区别？",
    a: "免费版每日限制 5 次名字生成，只提供基础五行分析和单页测评报告。VIP/SVIP 无次数限制，并享有深度五行分析、AI 典籍解读、重名率查询等专属功能。",
  },
  {
    q: "SVIP 年卡和月卡功能一样吗？",
    a: "SVIP 年卡和月卡会员权益完全相同，区别仅在于订阅时长和价格。SVIP 年卡相当于每月仅需 ¥16.6，性价比最高。",
  },
  {
    q: "支付安全吗？支持哪些支付方式？",
    a: "支付全程由 PayPal 提供安全保护，我们不存储任何支付敏感信息（卡号、密码等）。支持 PayPal、 Visa、Mastercard、American Express、UnionPay 等多种方式。",
  },
  {
    q: "会员可以退款吗？",
    a: "虚拟商品一经开通不支持退款，但 SVIP 年卡在开通 7 天内如有问题可联系客服申请特殊处理。",
  },
  {
    q: "VIP 到期后数据会保留吗？",
    a: "到期的 VIP 用户仍然可以登录查看已收藏的名字和测评记录，但高级功能（无限生成、重名率查询等）会恢复为免费版限制。",
  },
];

export default function VipPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState<typeof TIERS[0] | null>(null);
  const [paying, setPaying] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [paymentMessage, setPaymentMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const paypalContainerRef = useRef<HTMLDivElement>(null);

  // 处理 PayPal 返回结果
  useEffect(() => {
    const paymentStatus = searchParams.get("payment");
    const orderId = searchParams.get("orderId");
    if (paymentStatus === "success" && orderId && user) {
      handlePayPalCapture(orderId);
    } else if (paymentStatus === "cancelled") {
      setPaymentMessage({ type: "error", text: "支付已取消，请选择其他支付方式" });
      router.replace("/vip");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, user]);

  // PayPal 扣款成功后升级 VIP
  const handlePayPalCapture = async (orderId: string) => {
    setPaying(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/paypal/capture-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (data.success) {
        setPaymentMessage({
          type: "success",
          text: `🎉 ${data.message || "开通成功！"} 订单号：${data.orderId}`,
        });
        setShowUpgradeModal(false);
        // 通知 AuthContext 刷新用户信息
        window.dispatchEvent(new Event("vip-upgraded"));
        setTimeout(() => router.push("/settings"), 2000);
      } else {
        setPaymentMessage({ type: "error", text: data.error || "支付确认失败，请联系客服" });
      }
    } catch {
      setPaymentMessage({ type: "error", text: "网络异常，请稍后重试" });
    } finally {
      setPaying(false);
      router.replace("/vip");
    }
  };

  // 加载 PayPal SDK 并渲染按钮
  useEffect(() => {
    if (!showUpgradeModal || !selectedTier || selectedTier.level === 0) return;

    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    if (!clientId) return;

    // 动态加载 PayPal JS SDK
    const loadPayPal = () => {
      if (typeof window === "undefined") return;
      const existing = document.getElementById("paypal-sdk");
      if (!existing) {
        const script = document.createElement("script");
        script.id = "paypal-sdk";
        script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
        script.onload = () => renderPayPalButtons();
        document.head.appendChild(script);
      } else {
        renderPayPalButtons();
      }
    };

    const renderPayPalButtons = () => {
      if (typeof paypal === "undefined" || !paypalContainerRef.current) return;
      paypalContainerRef.current.innerHTML = "";

      paypal.Buttons({
        style: { layout: "vertical", color: "gold", shape: "rect", label: "pay" },
        async onClick(_data: any, actions: any) {
          if (!user) {
            router.push("/login?redirect=/vip");
            return actions.reject();
          }
          return actions.resolve();
        },
        async createOrder() {
          const token = localStorage.getItem("token");
          const res = await fetch("/api/paypal/create-order", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`,
            },
            body: JSON.stringify({ tier: selectedTier!.level }),
          });
          const data = await res.json();
          if (!res.ok || !data.orderId) {
            throw new Error(data.error || "创建订单失败");
          }
          return data.orderId;
        },
        onApprove(data: any) {
          // PayPal 跳转会带上 orderId，直接在页面处理
          window.location.href = `/vip?payment=success&orderId=${data.orderID}`;
        },
        onCancel() {
          setPaymentMessage({ type: "error", text: "支付已取消" });
        },
        onError(err: any) {
          console.error("[PayPal]", err);
          setPaymentMessage({ type: "error", text: "支付出错，请重试" });
        },
      }).render(paypalContainerRef.current);
    };

    loadPayPal();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showUpgradeModal, selectedTier]);

  // 如果已登录且是 VIP，显示续费/管理界面
  const isVip = user && user.vipLevel > 0;

  const handleUpgrade = (tier: typeof TIERS[0]) => {
    if (!user) {
      router.push("/login?redirect=/vip");
      return;
    }
    if (tier.level <= (user.vipLevel ?? 0)) {
      router.push("/settings");
      return;
    }
    setSelectedTier(tier);
    setShowUpgradeModal(true);
  };

  const closeModal = () => {
    if (!paying) {
      setShowUpgradeModal(false);
      setPaymentMessage(null);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FFFCF7" }}>
      <Header />

      <div style={{ paddingTop: 60 }}>

        {/* ── Hero ── */}
        <div style={{
          background: "linear-gradient(180deg, #2D1B0E 0%, #4A2E18 100%)",
          padding: "64px 24px 56px",
          textAlign: "center",
          position: "relative",
          overflow: "hidden",
        }}>
          {/* 背景纹理 */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "radial-gradient(circle at 30% 60%, rgba(232,106,23,0.12) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(212,148,26,0.08) 0%, transparent 50%)",
          }} />
          <div style={{ position: "relative", zIndex: 1, maxWidth: 680, margin: "0 auto" }}>
            {isVip ? (
              <>
                <div style={{
                  display: "inline-block",
                  padding: "4px 16px",
                  borderRadius: 20,
                  background: "rgba(212,148,26,0.2)",
                  color: "#D4941A",
                  fontSize: 13,
                  marginBottom: 16,
                  fontFamily: "'Noto Sans SC', sans-serif",
                }}>
                  ✨ 已是 {user.vipLevel === 2 ? "SVIP" : "VIP"} 会员
                </div>
                <h1 style={{
                  fontSize: 36, fontWeight: 700, color: "#FFFCF7",
                  margin: "0 0 14px", fontFamily: "'Noto Serif SC', serif",
                }}>
                  感谢您选择寻名网
                </h1>
                <p style={{ fontSize: 16, color: "rgba(255,252,247,0.7)", margin: "0 0 28px" }}>
                  您的会员权益已生效，尽情探索名字的无限可能
                </p>
                <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                  <Link href="/settings" style={{
                    padding: "10px 28px", borderRadius: 24,
                    background: "linear-gradient(135deg, #E86A17, #D55A0B)",
                    color: "#FFF", fontSize: 14,
                    textDecoration: "none", fontFamily: "'Noto Sans SC', sans-serif",
                    boxShadow: "0 4px 16px rgba(232,106,23,0.4)",
                  }}>查看我的权益</Link>
                  <Link href="/naming" style={{
                    padding: "10px 28px", borderRadius: 24,
                    background: "transparent",
                    border: "1px solid rgba(255,252,247,0.3)",
                    color: "rgba(255,252,247,0.8)", fontSize: 14,
                    textDecoration: "none", fontFamily: "'Noto Sans SC', sans-serif",
                  }}>去起名 →</Link>
                </div>
              </>
            ) : (
              <>
                <div style={{
                  fontSize: 13, color: "#D4941A",
                  letterSpacing: "0.2em", marginBottom: 14,
                  fontFamily: "'Noto Serif SC', serif",
                }}>
                  ─── 会员中心 ───
                </div>
                <h1 style={{
                  fontSize: 38, fontWeight: 700, color: "#FFFCF7",
                  margin: "0 0 14px", fontFamily: "'Noto Serif SC', serif",
                }}>
                  解锁名字的全部可能
                </h1>
                <p style={{ fontSize: 16, color: "rgba(255,252,247,0.65)", margin: "0 0 32px", lineHeight: 1.7 }}>
                  升级会员，解锁无限生成、深度测评、AI 典籍解读<br />
                  让每一个名字都承载独特的文化寓意
                </p>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "8px 20px", borderRadius: 20,
                  background: "rgba(212,148,26,0.15)",
                  border: "1px solid rgba(212,148,26,0.3)",
                  fontSize: 13, color: "#D4941A",
                  fontFamily: "'Noto Sans SC', sans-serif",
                }}>
                  <span style={{ fontSize: 16 }}>🎁</span>
                  新会员首月仅需 ¥19，开通即送 100 积分
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── 定价卡片 ── */}
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 24,
            alignItems: "start",
          }}>
            {TIERS.map((tier) => {
              const alreadyHas = user && tier.level <= (user.vipLevel ?? 0);
              const isRecommended = tier.level === 1;
              return (
                <div
                  key={tier.level}
                  style={{
                    background: tier.bg,
                    borderRadius: 20,
                    border: tier.highlighted
                      ? `2px solid ${tier.accentColor}`
                      : "1px solid #EEE8DD",
                    padding: "32px 28px",
                    position: "relative",
                    boxShadow: tier.highlighted
                      ? "0 8px 40px rgba(232,106,23,0.18)"
                      : "0 2px 12px rgba(44,24,16,0.04)",
                    transform: tier.highlighted ? "scale(1.02)" : "none",
                  }}
                >
                  {/* 推荐标签 */}
                  {isRecommended && (
                    <div style={{
                      position: "absolute", top: -14, left: "50%",
                      transform: "translateX(-50%)",
                      padding: "4px 16px", borderRadius: 12,
                      background: "linear-gradient(135deg, #E86A17, #D55A0B)",
                      color: "#FFF", fontSize: 12,
                      fontFamily: "'Noto Sans SC', sans-serif",
                      whiteSpace: "nowrap",
                      boxShadow: "0 2px 8px rgba(232,106,23,0.4)",
                    }}>
                      ⭐ 最受欢迎
                    </div>
                  )}

                  {/* 标题 */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{
                      fontSize: 13, color: tier.accentColor,
                      fontFamily: "'Noto Sans SC', sans-serif",
                      fontWeight: 500, marginBottom: 4,
                    }}>{tier.name}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                      <span style={{
                        fontSize: 40, fontWeight: 800,
                        color: tier.color,
                        fontFamily: "'Noto Serif SC', serif",
                        lineHeight: 1,
                      }}>{tier.price}</span>
                      <span style={{ fontSize: 14, color: "#999", fontFamily: "'Noto Sans SC', sans-serif" }}>
                        {tier.period}
                      </span>
                    </div>
                    <p style={{
                      fontSize: 13, color: "#888",
                      margin: "8px 0 0", fontFamily: "'Noto Sans SC', sans-serif",
                      lineHeight: 1.5,
                    }}>{tier.description}</p>
                  </div>

                  {/* 分隔线 */}
                  <div style={{ height: 1, background: "#EEE8DD", margin: "0 0 20px" }} />

                  {/* 功能列表 */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
                    {tier.features.map((f, i) => (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        fontSize: 13, color: f.included ? "#444" : "#CCC",
                        fontFamily: "'Noto Sans SC', sans-serif",
                      }}>
                        <span style={{ fontSize: 14, flexShrink: 0 }}>
                          {f.included ? "✓" : "—"}
                        </span>
                        <span style={{
                          textDecoration: f.included ? "none" : "line-through",
                          fontWeight: f.included ? 400 : 300,
                        }}>{f.text}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA 按钮 */}
                  <button
                    onClick={() => handleUpgrade(tier)}
                    disabled={alreadyHas || (tier.level === 0)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 600,
                      fontFamily: "'Noto Sans SC', sans-serif",
                      cursor: alreadyHas ? "default" : "pointer",
                      transition: "all 0.2s",
                      ...(alreadyHas
                        ? {
                            background: "rgba(0,0,0,0.04)",
                            border: "1px solid #EEE8DD",
                            color: "#AAA",
                          }
                        : tier.ctaStyle === "outline"
                        ? {
                            background: "transparent",
                            border: "1px solid #DDD0C0",
                            color: "#666",
                          }
                        : tier.ctaStyle === "filled-gold"
                        ? {
                            background: "linear-gradient(135deg, #D4941A, #C07D10)",
                            border: "none",
                            color: "#FFF",
                            boxShadow: "0 4px 16px rgba(212,148,26,0.35)",
                          }
                        : {
                            background: "linear-gradient(135deg, #E86A17, #D55A0B)",
                            border: "none",
                            color: "#FFF",
                            boxShadow: "0 4px 16px rgba(232,106,23,0.35)",
                          }),
                    }}
                  >
                    {alreadyHas ? "已开通" : tier.cta}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 权益保障 ── */}
        <div style={{
          maxWidth: 900, margin: "0 auto",
          padding: "0 24px 64px",
        }}>
          <div style={{
            background: "#FFF",
            borderRadius: 16,
            border: "1px solid #EEE8DD",
            padding: "36px 40px",
          }}>
            <h2 style={{
              fontSize: 22, fontWeight: 700, color: "#2D1B0E",
              margin: "0 0 28px", textAlign: "center",
              fontFamily: "'Noto Serif SC', serif",
            }}>
              为什么选择寻名网会员？
            </h2>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 28,
            }}>
              {[
                { icon: "🔒", title: "数据安全", desc: "所有数据加密存储，支持随时导出和删除" },
                { icon: "⚡", title: "极速体验", desc: "AI 名字生成平均响应时间 < 2 秒" },
                { icon: "📚", title: "专业典籍", desc: "内置诗经、楚辞、唐诗、宋词等国学典籍" },
                { icon: "🌐", title: "随时可用", desc: "网页/App 多端同步，24 小时随时起名" },
              ].map((item) => (
                <div key={item.title} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>{item.icon}</div>
                  <div style={{
                    fontSize: 15, fontWeight: 600, color: "#2D1B0E",
                    marginBottom: 6, fontFamily: "'Noto Serif SC', serif",
                  }}>{item.title}</div>
                  <div style={{
                    fontSize: 13, color: "#888",
                    lineHeight: 1.6, fontFamily: "'Noto Sans SC', sans-serif",
                  }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── FAQ ── */}
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px 80px" }}>
          <h2 style={{
            fontSize: 24, fontWeight: 700, color: "#2D1B0E",
            margin: "0 0 28px", textAlign: "center",
            fontFamily: "'Noto Serif SC', serif",
          }}>
            常见问题
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {FAQS.map((faq, i) => (
              <div
                key={i}
                style={{
                  borderBottom: i < FAQS.length - 1 ? "1px solid #F0E8DA" : "none",
                }}
              >
                <button
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  style={{
                    width: "100%",
                    padding: "18px 0",
                    background: "none",
                    border: "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{
                    fontSize: 15, fontWeight: 600, color: "#2D1B0E",
                    fontFamily: "'Noto Sans SC', sans-serif",
                  }}>{faq.q}</span>
                  <span style={{
                    fontSize: 18, color: "#E86A17",
                    transition: "transform 0.2s",
                    transform: faqOpen === i ? "rotate(45deg)" : "rotate(0deg)",
                  }}>+</span>
                </button>
                {faqOpen === i && (
                  <div style={{
                    paddingBottom: 18,
                    fontSize: 14, color: "#666",
                    lineHeight: 1.7,
                    fontFamily: "'Noto Sans SC', sans-serif",
                  }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 支付弹窗 ── */}
      {showUpgradeModal && selectedTier && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 2000,
            background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24,
          }}
          onClick={() => !paying && setShowUpgradeModal(false)}
        >
          <div
            style={{
              background: "#FFF", borderRadius: 20,
              padding: "36px 40px", width: "100%", maxWidth: 420,
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{
              fontSize: 20, fontWeight: 700, color: "#2D1B0E",
              margin: "0 0 8px", textAlign: "center",
              fontFamily: "'Noto Serif SC', serif",
            }}>
              确认开通 {selectedTier.name}
            </h3>
            <p style={{
              fontSize: 13, color: "#999", textAlign: "center",
              margin: "0 0 28px", fontFamily: "'Noto Sans SC', sans-serif",
            }}>
              订单金额：<strong style={{ color: selectedTier.color, fontSize: 18 }}>
                {selectedTier.price}{selectedTier.period}
              </strong>
            </p>

            <div style={{
              background: "#F9F7F4", borderRadius: 12,
              padding: "16px 18px", marginBottom: 20,
              fontSize: 13, color: "#666",
              fontFamily: "'Noto Sans SC', sans-serif",
              lineHeight: 1.7,
            }}>
              <div style={{ marginBottom: 8, fontWeight: 600, color: "#2D1B0E" }}>
                温馨提示：
              </div>
              · 虚拟商品一经开通不支持退款<br />
              · SVIP 年卡 7 天内可申请特殊情况退款<br />
              · 支付即表示同意《会员服务协议》
            </div>

            {/* 支付状态提示 */}
            {paymentMessage && (
              <div style={{
                padding: "10px 14px", borderRadius: 8, marginBottom: 16,
                background: paymentMessage.type === "success" ? "#E8F5E9" : "#FFEBEE",
                color: paymentMessage.type === "success" ? "#2E7D32" : "#C62828",
                fontSize: 13, fontFamily: "'Noto Sans SC', sans-serif",
                textAlign: "center",
              }}>
                {paymentMessage.text}
              </div>
            )}

            {/* PayPal 按钮容器 */}
            {selectedTier.level > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div ref={paypalContainerRef} id="paypal-button-container" />
                {!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID && !paying && (
                  <div style={{
                    padding: "12px", borderRadius: 8,
                    background: "#FFF3E0", border: "1px dashed #FFB74D",
                    color: "#E65100", fontSize: 12,
                    textAlign: "center", fontFamily: "'Noto Sans SC', sans-serif",
                  }}>
                    ⚠️ PayPal 尚未配置，请在 .env 中设置 NEXT_PUBLIC_PAYPAL_CLIENT_ID
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={closeModal}
                disabled={paying}
                style={{
                  flex: 1, padding: "12px",
                  borderRadius: 10, border: "1px solid #DDD0C0",
                  background: "#FFF", color: "#666",
                  fontSize: 14, cursor: paying ? "not-allowed" : "pointer",
                  fontFamily: "'Noto Sans SC', sans-serif",
                  opacity: paying ? 0.5 : 1,
                }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
