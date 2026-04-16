"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { LocaleProvider } from "@/contexts/LocaleContext";
import Header from "@/components/layout/Header";
import { CreditCard, Check, Sparkles } from "lucide-react";

// ─── Stripe Card Element 类型声明 ───
declare global {
  interface Window {
    Stripe?: (key: string) => {
      elements: () => {
        create: (type: string, options?: object) => {
          mount: (el: HTMLElement | string) => void;
          unmount: () => void;
        };
      };
    };
  }
}

const TIERS = [
  {
    level: 0,
    name: "Free",
    badge: "",
    price: "$0",
    period: "Forever",
    description: "Experience basic naming features, great for trying out",
    color: "#888",
    bg: "#F8F8F8",
    accentColor: "#CCC",
    features: [
      { text: "5 name generations per day", included: true },
      { text: "Basic Five Elements analysis", included: true },
      { text: "Single page evaluation report", included: true },
      { text: "3 classic references", included: true },
      { text: "Unlimited name generation", included: false },
      { text: "Deep Five Elements analysis", included: false },
      { text: "AI complete classic interpretation", included: false },
      { text: "Name collision rate query", included: false },
      { text: "Priority customer support", included: false },
      { text: "Exclusive name collection book", included: false },
    ],
    cta: "Free Trial",
    ctaStyle: "outline" as const,
    highlighted: false,
  },
  {
    level: 1,
    name: "VIP Monthly",
    badge: "Most Popular",
    price: "$4",
    period: "/month",
    description: "Unlock all features, ideal for users with clear naming needs",
    color: "#E86A17",
    bg: "#FFF8F4",
    accentColor: "#E86A17",
    features: [
      { text: "200 name generations per day", included: true },
      { text: "Basic Five Elements analysis", included: true },
      { text: "Single page evaluation report", included: true },
      { text: "3 classic references", included: true },
      { text: "Deep Five Elements analysis (Wu Xing)", included: true },
      { text: "AI classic interpretation (Shijing/Chuci/Tang)", included: true },
      { text: "Nationwide name collision rate query", included: true },
      { text: "Priority customer support", included: false },
      { text: "Exclusive cloud name collection", included: false },
      { text: "PDF export with full analysis", included: false },
    ],
    cta: "Subscribe",
    ctaStyle: "filled" as const,
    highlighted: true,
  },
  {
    level: 2,
    name: "SVIP Yearly",
    badge: "Best Value",
    price: "$28",
    period: "/year",
    description: "Equivalent to $2.3/month, best value, enjoy exclusive benefits for a year",
    color: "#D4941A",
    bg: "#FFFCF0",
    accentColor: "#D4941A",
    features: [
      { text: "Unlimited name generation", included: true },
      { text: "Basic Five Elements analysis", included: true },
      { text: "Single page evaluation report", included: true },
      { text: "All classic references", included: true },
      { text: "Deep Five Elements analysis (Wu Xing)", included: true },
      { text: "AI complete classic interpretation", included: true },
      { text: "Nationwide + dialect analysis", included: true },
      { text: "24/7 Priority customer support", included: true },
      { text: "Exclusive cloud collection + export", included: true },
      { text: "PDF export with full analysis", included: true },
    ],
    cta: "Subscribe Yearly",
    ctaStyle: "filled-gold" as const,
    highlighted: false,
  },
];

const FAQS = [
  {
    q: "What's the difference between Free and VIP?",
    a: "Free version is limited to 5 name generations per day with basic Five Elements analysis. VIP/SVIP users enjoy unlimited generations, deep Five Elements analysis, AI classic interpretation, and name collision rate queries.",
  },
  {
    q: "Are SVIP Yearly and Monthly the same in features?",
    a: "SVIP Yearly and Monthly have completely identical membership benefits. The only difference is the subscription duration and price. SVIP Yearly is equivalent to only $2.3/month.",
  },
  {
    q: "Is payment secure? What payment methods are supported?",
    a: "All payments are processed securely through Stripe. We never store any payment sensitive information (card numbers, passwords, etc.). We support Visa, Mastercard, American Express, and more.",
  },
  {
    q: "Can I get a refund?",
    a: "Virtual goods are non-refundable once activated. However, SVIP Yearly subscribers can contact customer support for special handling within 7 days of purchase.",
  },
  {
    q: "Will my data be preserved after VIP expires?",
    a: "Expired VIP users can still log in to view their saved names and evaluation records, but premium features (unlimited generation, name collision rate, etc.) will return to free version limits.",
  },
];

export default function VipENPage() {
  return (
    <LocaleProvider initialLocale="en">
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-gray-500">Loading...</div></div>}>
        <VipContentEN />
      </Suspense>
    </LocaleProvider>
  );
}

function VipContentEN() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedTier, setSelectedTier] = useState<typeof TIERS[0] | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const cardElementRef = useRef<HTMLDivElement>(null);

  // 检查用户 VIP 状态
  const isVip = user && user.vipLevel > 0;

  // 加载 Stripe.js
  useEffect(() => {
    if (!showUpgradeModal || !selectedTier || selectedTier.level === 0) return;

    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!publishableKey) {
      console.warn("Stripe publishable key not configured");
      return;
    }

    const loadStripe = () => {
      if (typeof window === "undefined" || window.Stripe) return;

      const script = document.createElement("script");
      script.src = "https://js.stripe.com/v3/";
      script.onload = () => {
        if (window.Stripe && cardElementRef.current) {
          const stripe = window.Stripe(publishableKey);
          const elements = stripe.elements();
          const card = elements.create("card", {
            style: {
              base: {
                fontSize: "16px",
                color: "#2C1810",
                fontFamily: "'Noto Sans SC', sans-serif",
                "::placeholder": { color: "#A09080" },
              },
            },
          });
          card.mount(cardElementRef.current);
        }
      };
      document.head.appendChild(script);
    };

    loadStripe();
  }, [showUpgradeModal, selectedTier]);

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

  const handlePayment = async () => {
    if (!selectedTier || !user) return;

    setIsProcessing(true);
    setPaymentMessage(null);

    try {
      // 模拟支付流程（实际项目中需要调用后端创建 PaymentIntent）
      const token = localStorage.getItem("token");
      const res = await fetch("/api/stripe/create-payment-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tier: selectedTier.level }),
      });

      const data = await res.json();

      if (data.success) {
        setPaymentMessage({
          type: "success",
          text: "🎉 Payment successful! You are now a VIP member.",
        });
        window.dispatchEvent(new Event("vip-upgraded"));
        setTimeout(() => {
          setShowUpgradeModal(false);
          router.push("/settings");
        }, 2000);
      } else {
        setPaymentMessage({ type: "error", text: data.error || "Payment failed. Please try again." });
      }
    } catch {
      setPaymentMessage({ type: "error", text: "Network error. Please try again." });
    } finally {
      setIsProcessing(false);
    }
  };

  const closeModal = () => {
    if (!isProcessing) {
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
                }}>
                  ✨ You're already a {user.vipLevel === 2 ? "SVIP" : "VIP"} Member
                </div>
                <h1 style={{ fontSize: 36, fontWeight: 700, color: "#FFFCF7", margin: "0 0 14px" }}>
                  Thank You for Choosing SeekName
                </h1>
                <p style={{ fontSize: 16, color: "rgba(255,252,247,0.7)", margin: "0 0 28px" }}>
                  Your membership benefits are active. Enjoy exploring the infinite possibilities of names
                </p>
                <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                  <Link href="/settings" style={{
                    padding: "10px 28px", borderRadius: 24,
                    background: "linear-gradient(135deg, #E86A17, #D55A0B)",
                    color: "#FFF", fontSize: 14,
                    textDecoration: "none",
                    boxShadow: "0 4px 16px rgba(232,106,23,0.4)",
                  }}>View My Benefits</Link>
                  <Link href="/naming" style={{
                    padding: "10px 28px", borderRadius: 24,
                    background: "transparent",
                    border: "1px solid rgba(255,252,247,0.3)",
                    color: "rgba(255,252,247,0.8)", fontSize: 14,
                    textDecoration: "none",
                  }}>Generate Names →</Link>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, color: "#D4941A", letterSpacing: "0.2em", marginBottom: 14 }}>
                  ─── Membership Center ───
                </div>
                <h1 style={{ fontSize: 38, fontWeight: 700, color: "#FFFCF7", margin: "0 0 14px" }}>
                  Unlock All Possibilities
                </h1>
                <p style={{ fontSize: 16, color: "rgba(255,252,247,0.65)", margin: "0 0 32px", lineHeight: 1.7 }}>
                  Upgrade your membership for unlimited generation, in-depth evaluation, AI classic interpretation<br />
                  Every name carries unique cultural meaning
                </p>
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  padding: "8px 20px", borderRadius: 20,
                  background: "rgba(212,148,26,0.15)",
                  border: "1px solid rgba(212,148,26,0.3)",
                  fontSize: 13, color: "#D4941A",
                }}>
                  <span style={{ fontSize: 16 }}>🎁</span>
                  New members: First month $3, get 100 points upon activation
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Pricing Cards ── */}
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
                  {isRecommended && (
                    <div style={{
                      position: "absolute", top: -14, left: "50%",
                      transform: "translateX(-50%)",
                      padding: "4px 16px", borderRadius: 12,
                      background: "linear-gradient(135deg, #E86A17, #D55A0B)",
                      color: "#FFF", fontSize: 12,
                      whiteSpace: "nowrap",
                      boxShadow: "0 2px 8px rgba(232,106,23,0.4)",
                    }}>
                      ⭐ Most Popular
                    </div>
                  )}

                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 13, color: tier.accentColor, fontWeight: 500, marginBottom: 4 }}>
                      {tier.name}
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                      <span style={{ fontSize: 40, fontWeight: 800, color: tier.color, lineHeight: 1 }}>
                        {tier.price}
                      </span>
                      <span style={{ fontSize: 14, color: "#999" }}>{tier.period}</span>
                    </div>
                    <p style={{ fontSize: 13, color: "#888", margin: "8px 0 0", lineHeight: 1.5 }}>
                      {tier.description}
                    </p>
                  </div>

                  <div style={{ height: 1, background: "#EEE8DD", margin: "0 0 20px" }} />

                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
                    {tier.features.map((f, i) => (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        fontSize: 13, color: f.included ? "#444" : "#CCC",
                      }}>
                        <span style={{ fontSize: 14, flexShrink: 0 }}>
                          {f.included ? "✓" : "—"}
                        </span>
                        <span style={{ textDecoration: f.included ? "none" : "line-through" }}>
                          {f.text}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleUpgrade(tier)}
                    disabled={alreadyHas || tier.level === 0}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: alreadyHas ? "default" : "pointer",
                      transition: "all 0.2s",
                      ...(alreadyHas
                        ? { background: "rgba(0,0,0,0.04)", border: "1px solid #EEE8DD", color: "#AAA" }
                        : tier.ctaStyle === "outline"
                        ? { background: "transparent", border: "1px solid #DDD0C0", color: "#666" }
                        : tier.ctaStyle === "filled-gold"
                        ? { background: "linear-gradient(135deg, #D4941A, #C07D10)", border: "none", color: "#FFF", boxShadow: "0 4px 16px rgba(212,148,26,0.35)" }
                        : { background: "linear-gradient(135deg, #E86A17, #D55A0B)", border: "none", color: "#FFF", boxShadow: "0 4px 16px rgba(232,106,23,0.35)" }
                      ),
                    }}
                  >
                    {alreadyHas ? "Subscribed" : tier.cta}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Benefits ── */}
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px 64px" }}>
          <div style={{
            background: "#FFF",
            borderRadius: 16,
            border: "1px solid #EEE8DD",
            padding: "36px 40px",
          }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: "#2D1B0E", margin: "0 0 28px", textAlign: "center" }}>
              Why Choose SeekName Membership?
            </h2>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 28,
            }}>
              {[
                { icon: "🔒", title: "Data Security", desc: "All data encrypted, supports export and deletion anytime" },
                { icon: "⚡", title: "Lightning Fast", desc: "AI name generation average response time < 2 seconds" },
                { icon: "📚", title: "Professional Classics", desc: "Built-in Shijing, Chuci, Tang poetry and other Chinese classics" },
                { icon: "🌐", title: "Always Available", desc: "Web/App multi-device sync, available 24/7" },
              ].map((item) => (
                <div key={item.title} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>{item.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#2D1B0E", marginBottom: 6 }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: 13, color: "#888", lineHeight: 1.6 }}>
                    {item.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── FAQ ── */}
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px 80px" }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: "#2D1B0E", margin: "0 0 28px", textAlign: "center" }}>
            Frequently Asked Questions
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {FAQS.map((faq, i) => (
              <div key={i} style={{ borderBottom: i < FAQS.length - 1 ? "1px solid #F0E8DA" : "none" }}>
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
                  <span style={{ fontSize: 15, fontWeight: 600, color: "#2D1B0E" }}>{faq.q}</span>
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
                  }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Payment Modal ── */}
      {showUpgradeModal && selectedTier && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 2000,
            background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 24,
          }}
          onClick={() => !isProcessing && setShowUpgradeModal(false)}
        >
          <div
            style={{
              background: "#FFF", borderRadius: 20,
              padding: "36px 40px", width: "100%", maxWidth: 420,
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 20, fontWeight: 700, color: "#2D1B0E", margin: "0 0 8px", textAlign: "center" }}>
              Subscribe to {selectedTier.name}
            </h3>
            <p style={{ fontSize: 13, color: "#999", textAlign: "center", margin: "0 0 28px" }}>
              Amount: <strong style={{ color: selectedTier.color, fontSize: 18 }}>
                {selectedTier.price}{selectedTier.period}
              </strong>
            </p>

            <div style={{
              background: "#F9F7F4", borderRadius: 12,
              padding: "16px 18px", marginBottom: 20,
              fontSize: 13, color: "#666",
              lineHeight: 1.7,
            }}>
              <div style={{ marginBottom: 8, fontWeight: 600, color: "#2D1B0E" }}>
                Note:
              </div>
              · Virtual goods are non-refundable once activated<br />
              · SVIP Yearly can apply for special refund within 7 days<br />
              · Payment means you agree to the Terms of Service
            </div>

            {paymentMessage && (
              <div style={{
                padding: "10px 14px", borderRadius: 8, marginBottom: 16,
                background: paymentMessage.type === "success" ? "#E8F5E9" : "#FFEBEE",
                color: paymentMessage.type === "success" ? "#2E7D32" : "#C62828",
                fontSize: 13,
                textAlign: "center",
              }}>
                {paymentMessage.text}
              </div>
            )}

            {/* Stripe Card Element */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#2C1810", marginBottom: 8, display: "block" }}>
                <CreditCard className="w-4 h-4 inline mr-1" />
                Card Information
              </label>
              <div
                ref={cardElementRef}
                id="card-element"
                style={{
                  padding: "12px 14px",
                  border: "1px solid #DDD0C0",
                  borderRadius: 8,
                  background: "#FFFCF7",
                }}
              />
              {!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && !isProcessing && (
                <div style={{
                  padding: "12px", borderRadius: 8,
                  background: "#FFF3E0", border: "1px dashed #FFB74D",
                  color: "#E65100", fontSize: 12, textAlign: "center", marginTop: 8,
                }}>
                  ⚠️ Stripe not configured. Please set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in .env
                </div>
              )}
            </div>

            <button
              onClick={handlePayment}
              disabled={isProcessing}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: 10,
                background: "linear-gradient(135deg, #E86A17, #D55A0B)",
                border: "none",
                color: "#FFF",
                fontSize: 15,
                fontWeight: 600,
                cursor: isProcessing ? "not-allowed" : "pointer",
                opacity: isProcessing ? 0.6 : 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {isProcessing ? (
                <>
                  <Sparkles className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Pay {selectedTier.price}
                </>
              )}
            </button>

            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
              <button
                onClick={closeModal}
                disabled={isProcessing}
                style={{
                  flex: 1, padding: "12px",
                  borderRadius: 10, border: "1px solid #DDD0C0",
                  background: "#FFF", color: "#666",
                  fontSize: 14, cursor: isProcessing ? "not-allowed" : "pointer",
                  opacity: isProcessing ? 0.5 : 1,
                }}
              >
                Cancel
              </button>
            </div>

            {/* Stripe Badge */}
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <p className="text-xs text-gray-400">
                Secured by <strong>Stripe</strong> · Visa · Mastercard · Amex
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
