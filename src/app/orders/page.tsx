"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Package, Clock, CheckCircle } from "lucide-react";

// 订单数据类型
interface OrderItem {
  id: string;
  orderNo: string;
  type: string;          // 业务类别
  amount: number;
  payStatus: string;     // paid / free / pending
  status: string;        // completed / pending
  createdAt: string;
  nameRecord?: {
    id: string;
    surname: string;
    gender: string;
    results: any;        // JSON 候选名字列表
  };
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    // 检查登录状态
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("seekname_token")
        : null;

    if (!token) {
      router.push("/login");
      return;
    }

    // 加载订单列表（同时获取用户名）
    Promise.all([
      fetch("/api/user/orders", {
        credentials: "same-origin",
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()),
      fetch("/api/auth/session", {
        credentials: "same-origin",
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.json()),
    ])
      .then(([ordersData, sessionData]) => {
        if (sessionData.user) {
          setUserName(sessionData.user.name || sessionData.user.email || sessionData.user.phone || null);
        }
        if (ordersData.orders && Array.isArray(ordersData.orders)) {
          setOrders(ordersData.orders as OrderItem[]);
        } else if (ordersData.error) {
          setError(ordersData.error);
        }
      })
      .catch(() => setError("加载失败，请重试"))
      .finally(() => setLoading(false));
  }, [router]);

  // 格式化日期时间
  function formatDateTime(isoStr: string): string {
    const d = new Date(isoStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes()
    ).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  }

  // 格式化金额
  function formatAmount(amount: number, payStatus: string): string {
    if (payStatus === "free") return "免费";
    return `¥${amount.toFixed(2)}`;
  }

  // 获取候选名字文本
  function getCandidateNames(results: any): string[] {
    if (!results) return [];
    if (Array.isArray(results)) {
      return results.map((r: any) => r.name || r).filter(Boolean);
    }
    return [];
  }

  // ── 渲染 ──
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #FDF8F3 0%, #F5EDE0 50%, #EDE5D8 100%)",
      }}
    >
      <main
        style={{
          maxWidth: 900,
          margin: "36px auto",
          padding: "0 20px",
        }}
      >
        {/* 页面标题 */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: "#4A3428",
              fontFamily: "'Noto Serif SC', serif",
            }}
          >
            我的订单
          </h1>
          <p
            style={{
              fontSize: 14,
              color: "#999",
              marginTop: 6,
              fontFamily: "'Noto Sans SC', sans-serif",
            }}
          >
            {userName ? `账号：${userName}` : ""} · 所有起名记录均在此展示
          </p>
        </div>

        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 0",
              color: "#999",
              fontFamily: "'Noto Sans SC', sans-serif",
            }}
          >
            <Package
              style={{ display: "inline-block", animation: "spin 1s linear infinite" }}
              size={32}
            />
            <p style={{ marginTop: 12 }}>加载中...</p>
          </div>
        ) : error ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 0",
              background: "rgba(255,255,255,0.7)",
              borderRadius: 16,
            }}
          >
            <p style={{ color: "#C0392B", fontSize: 15 }}>{error}</p>
            <Link
              href="/personal"
              style={{
                display: "inline-block",
                marginTop: 16,
                color: "#E86A17",
                textDecoration: "none",
                fontSize: 14,
                fontFamily: "'Noto Sans SC', sans-serif",
              }}
            >
              ← 去起一个名字
            </Link>
          </div>
        ) : orders.length === 0 ? (
          /* 空状态 */
          <div
            style={{
              textAlign: "center",
              padding: "60px 24px",
              background: "rgba(255,255,255,0.7)",
              borderRadius: 16,
              boxShadow: "0 4px 24px rgba(74,52,40,0.06)",
            }}
          >
            <span style={{ fontSize: 48 }}>📋</span>
            <p
              style={{
                fontSize: 16,
                color: "#6B5A4E",
                marginTop: 12,
                fontFamily: "'Noto Sans SC', sans-serif",
              }}
            >
              还没有订单记录
            </p>
            <p
              style={{
                fontSize: 13,
                color: "#AAA",
                marginTop: 6,
                fontFamily: "'Noto Sans SC', sans-serif",
              }}
            >
              使用起名服务后，订单将自动记录在这里
            </p>
            <Link
              href="/personal"
              style={{
                display: "inline-block",
                marginTop: 18,
                padding: "10px 28px",
                background: "#E86A17",
                color: "#FFF",
                borderRadius: 8,
                textDecoration: "none",
                fontSize: 15,
                fontWeight: 500,
                fontFamily: "'Noto Sans SC', sans-serif",
              }}
            >
              立即起名
            </Link>
          </div>
        ) : (
          /* 订单列表 */
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* 列头说明 */}
            <div
              style={{
                padding: "10px 16px",
                background: "rgba(232,106,23,0.05)",
                border: "1px solid rgba(232,106,23,0.1)",
                borderRadius: 8,
                fontSize: 13,
                color: "#888",
                fontFamily: "'Noto Sans SC', sans-serif",
                textAlign: "center",
              }}
            >
              每行一条订单：用户名 — 订单号 — 业务类别 — 时间 — 候选名字
            </div>

            {orders.map((order) => {
              const candidates = getCandidateNames(order.nameRecord?.results);
              return (
                <div
                  key={order.id}
                  style={{
                    background: "rgba(255,255,255,0.88)",
                    border: "1px solid #DDD0C0",
                    borderRadius: 12,
                    overflow: "hidden",
                    transition: "border-color 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.borderColor = "#E86A17")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.borderColor = "#DDD0C0")
                  }
                >
                  {/* 第一行：核心信息 */}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: "8px 16px",
                      padding: "14px 18px",
                      borderBottom:
                        candidates.length > 0
                          ? "1px dashed #EEE8DD"
                          : "none",
                      }}
                  >
                    {/* 用户名 */}
                    <span
                      style={{
                        fontWeight: 600,
                        color: "#4A3428",
                        fontSize: 14,
                        fontFamily: "'Noto Sans SC', sans-serif",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {userName || "匿名"}
                    </span>

                    {/* 分隔 */}
                    <span style={{ color: "#DDD0C0" }}>·</span>

                    {/* 订单号 */}
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: 13,
                        color: "#E86A17",
                        fontWeight: 500,
                        letterSpacing: 0.5,
                      }}
                    >
                      {order.orderNo}
                    </span>

                    {/* 分隔 */}
                    <span style={{ color: "#DDD0C0" }}>·</span>

                    {/* 业务类别 */}
                    <span
                      style={{
                        padding: "2px 10px",
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 500,
                        background: "rgba(232,106,23,0.08)",
                        color: "#E86A17",
                        fontFamily: "'Noto Sans SC', sans-serif",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {order.type}
                    </span>

                    {/* 分隔 */}
                    <span style={{ color: "#DDD0C0" }}>·</span>

                    {/* 金额/免费 */}
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: order.payStatus === "free" ? "#27AE60" : "#E86A17",
                        fontFamily: "'Noto Sans SC', sans-serif",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatAmount(order.amount, order.payStatus)}
                    </span>

                    {/* 弹性空间 + 时间 */}
                    <span style={{ flex: 1 }} />
                    <span
                      style={{
                        fontSize: 12,
                        color: "#BBB",
                        fontFamily: "'Noto Sans SC', sans-serif",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatDateTime(order.createdAt)}
                    </span>
                  </div>

                  {/* 第二行：订单详情（姓氏/性别/出生信息）+ 候选名字 */}
                  {(candidates.length > 0 || order.nameRecord) && (
                    <div
                      style={{
                        padding: "12px 18px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        background: "#FAF7F2",
                      }}
                    >
                      {/* 起名参数摘要 */}
                      {order.nameRecord && (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "6px 14px",
                            fontSize: 12,
                            color: "#888",
                            fontFamily: "'Noto Sans SC', sans-serif",
                          }}
                        >
                          <span>
                            <strong style={{ color: "#4A3428" }}>
                              {order.nameRecord.surname}姓
                            </strong>{" "}
                            ·{" "}
                            {order.nameRecord.gender === "male"
                              ? "男"
                              : order.nameRecord.gender === "female"
                              ? "女"
                              : order.nameRecord.gender}
                          </span>
                          <span>已生成 {candidates.length} 个候选名字</span>
                          <CheckCircle size={13} style={{ color: "#27AE60" }} />
                        </div>
                      )}

                      {/* 候选名字标签 */}
                      {candidates.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 6,
                          }}
                        >
                          {candidates.map((name: string, idx: number) => (
                            <span
                              key={idx}
                              style={{
                                padding: "4px 12px",
                                borderRadius: 6,
                                background: "#FFF",
                                border: `1px solid ${
                                  idx === 0
                                    ? "#E86A17"
                                    : idx <= 2
                                    ? "rgba(232,106,23,0.25)"
                                    : "#EEDDCC"
                                }`,
                                fontSize: 14,
                                fontWeight: idx <= 2 ? 600 : 400,
                                color:
                                  idx === 0
                                    ? "#E86A17"
                                    : idx <= 2
                                    ? "#C8540A"
                                    : "#8B7355",
                                fontFamily: "'Noto Serif SC', serif",
                              }}
                            >
                              {name}
                              {idx < 3 && (
                                <span
                                  style={{
                                    fontSize: 9,
                                    marginLeft: 3,
                                    opacity: 0.5,
                                  }}
                                >
                                  #{idx + 1}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 底部返回 */}
      <div style={{ textAlign: "center", paddingBottom: 32 }}>
        <Link
          href="/personal"
          style={{
            fontSize: 14,
            color: "#E86A17",
            textDecoration: "none",
            fontFamily: "'Noto Sans SC', sans-serif",
          }}
        >
          ← 继续起名
        </Link>
      </div>
    </div>
  );
}
