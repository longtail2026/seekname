"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// 订单状态映射
const STATUS_MAP: Record<string, { text: string; color: string }> = {
  pending: { text: "待支付", color: "#F39C12" },
  paid: { text: "已支付", color: "#27AE60" },
  failed: { text: "支付失败", color: "#E74C3C" },
  refunded: { text: "已退款", color: "#95A5A6" },
};

// 支付方式映射
const PAY_METHOD_MAP: Record<string, string> = {
  wechat: "微信支付",
  alipay: "支付宝",
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("seekname_token")
        : null;
    if (!token) {
      router.push("/login");
      return;
    }

    fetch("/api/user/orders", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setOrders(data.orders || []);
      })
      .catch(() => setError("网络错误，请重试"))
      .finally(() => setLoading(false));
  }, [router]);

  // 格式化日期
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ── 渲染 ──
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #FDF8F3 0%, #F5EDE0 50%, #EDE5D8 100%)",
      }}
    >
      {/* 顶部导航条 */}
      <header
        style={{
          background: "rgba(255,255,255,0.7)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(232,106,23,0.1)",
          padding: "14px 0",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            href="/"
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "#4A3428",
              textDecoration: "none",
              fontFamily: "'Noto Serif SC', serif",
              letterSpacing: 2,
            }}
          >
            寻名
          </Link>
          <nav style={{ display: "flex", gap: 28, alignItems: "center" }}>
            <Link
              href="/"
              style={{
                fontSize: 15,
                color: "#6B5A4E",
                textDecoration: "none",
                fontFamily: "'Noto Sans SC', sans-serif",
              }}
            >
              首页
            </Link>
            <Link
              href="/personal"
              style={{
                fontSize: 15,
                color: "#6B5A4E",
                textDecoration: "none",
                fontFamily: "'Noto Sans SC', sans-serif",
              }}
            >
              我的起名
            </Link>
            <Link
              href="/settings"
              style={{
                fontSize: 15,
                color: "#6B5A4E",
                textDecoration: "none",
                fontFamily: "'Noto Sans SC', sans-serif",
              }}
            >
              账号设置
            </Link>
          </nav>
        </div>
      </header>

      {/* 主内容区 */}
      <main
        style={{
          maxWidth: 800,
          margin: "36px auto",
          padding: "0 20px",
        }}
      >
        {/* 页面标题 */}
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: "#4A3428",
            textAlign: "center",
            marginBottom: 28,
            fontFamily: "'Noto Serif SC', serif",
          }}
        >
          历史订单
        </h1>

        {loading ? (
          <div
            style={{ textAlign: "center", padding: "60px 0", color: "#999" }}
          >
            加载中...
          </div>
        ) : error ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              background: "rgba(255,255,255,0.7)",
              borderRadius: 12,
              color: "#C0392B",
            }}
          >
            <p>{error}</p>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: 12,
                padding: "8px 24px",
                border: "none",
                borderRadius: 6,
                background: "#E86A17",
                color: "#FFF",
                cursor: "pointer",
                fontFamily: "'Noto Sans SC', sans-serif",
                fontSize: 14,
              }}
            >
              重试
            </button>
          </div>
        ) : orders.length === 0 ? (
          /* 空状态 */
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              background: "rgba(255,255,255,0.7)",
              borderRadius: 12,
            }}
          >
            <span style={{ fontSize: 56 }}>📋</span>
            <p
              style={{
                marginTop: 16,
                fontSize: 16,
                color: "#888",
                fontFamily: "'Noto Sans SC', sans-serif",
              }}
            >
              暂无订单记录
            </p>
            <p
              style={{
                marginTop: 6,
                fontSize: 13,
                color: "#AAA",
                fontFamily: "'Noto Sans SC', sans-serif",
              }}
            >
              完成起名服务支付后，订单会显示在这里
            </p>
            <Link
              href="/"
              style={{
                display: "inline-block",
                marginTop: 16,
                padding: "10px 28px",
                borderRadius: 8,
                background: "#E86A17",
                color: "#FFF",
                textDecoration: "none",
                fontFamily: "'Noto Sans SC', sans-serif",
                fontSize: 15,
                fontWeight: 500,
              }}
            >
              去起名 →
            </Link>
          </div>
        ) : (
          /* 订单列表 */
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {orders.map((order) => {
              const status = STATUS_MAP[order.status] || {
                text: order.status,
                color: "#666",
              };
              return (
                <div
                  key={order.id}
                  style={{
                    background: "rgba(255,255,255,0.85)",
                    borderRadius: 12,
                    padding: "20px 24px",
                    boxShadow: "0 2px 12px rgba(74,52,40,0.05)",
                  }}
                >
                  {/* 订单头部 */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        color: "#888",
                        fontFamily: "'Noto Sans SC', sans-serif",
                      }}
                    >
                      订单号：{order.orderNo}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: status.color,
                        fontFamily: "'Noto Sans SC', sans-serif",
                        padding: "3px 10px",
                        borderRadius: 12,
                        background: `${status.color}15`,
                      }}
                    >
                      {status.text}
                    </span>
                  </div>

                  {/* 订单详情 */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: 10,
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: 12,
                          color: "#999",
                          fontFamily: "'Noto Sans SC', sans-serif",
                        }}
                      >
                        金额
                      </span>
                      <p
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: "#E86A17",
                          fontFamily: "'Noto Sans SC', sans-serif",
                        }}
                      >
                        ¥{order.amount.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <span
                        style={{
                          fontSize: 12,
                          color: "#999",
                          fontFamily: "'Noto Sans SC', sans-serif",
                        }}
                      >
                        支付方式
                      </span>
                      <p
                        style={{
                          fontSize: 14,
                          color: "#4A3428",
                          fontFamily: "'Noto Sans SC', sans-serif",
                        }}
                      >
                        {PAY_METHOD_MAP[order.payMethod] || order.payMethod || "-"}
                      </p>
                    </div>
                    <div>
                      <span
                        style={{
                          fontSize: 12,
                          color: "#999",
                          fontFamily: "'Noto Sans SC', sans-serif",
                        }}
                      >
                        下单时间
                      </span>
                      <p
                        style={{
                          fontSize: 13,
                          color: "#4A3428",
                          fontFamily: "'Noto Sans SC', sans-serif",
                        }}
                      >
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    {order.payTime && (
                      <div>
                        <span
                          style={{
                            fontSize: 12,
                            color: "#999",
                            fontFamily: "'Noto Sans SC', sans-serif",
                          }}
                        >
                          支付时间
                        </span>
                        <p
                          style={{
                            fontSize: 13,
                            color: "#4A3428",
                            fontFamily: "'Noto Sans SC', sans-serif",
                          }}
                        >
                          {formatDate(order.payTime)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 关联的起名记录 */}
                  {order.nameRecord && (
                    <div
                      style={{
                        borderTop: "1px dashed #EEE8DD",
                        paddingTop: 12,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          color: "#999",
                          fontFamily: "'Noto Sans SC', sans-serif",
                        }}
                      >
                        起名记录：
                      </span>
                      <div
                        style={{
                          marginTop: 6,
                          padding: "8px 12px",
                          background: "#FAF7F2",
                          borderRadius: 6,
                          fontSize: 13,
                          fontFamily: "'Noto Sans SC', sans-serif",
                          color: "#4A3428",
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>
                          {order.nameRecord.surname}姓 ·{" "}
                          {order.nameRecord.gender === "male"
                            ? "男"
                            : order.nameRecord.gender === "female"
                            ? "女"
                            : ""}
                        </span>
                        {order.nameRecord.results && (
                          <span
                            style={{
                              marginLeft: 10,
                              color: "#E86A17",
                              fontSize: 12,
                            }}
                          >
                            已生成候选名字
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 底部导航 */}
        <div
          style={{
            textAlign: "center",
            marginTop: 24,
            display: "flex",
            justifyContent: "center",
            gap: 20,
          }}
        >
          <Link
            href="/settings"
            style={{
              fontSize: 14,
              color: "#E86A17",
              textDecoration: "none",
              fontFamily: "'Noto Sans SC', sans-serif",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.textDecoration =
                "underline")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.textDecoration = "none")
            }
          >
            ← 账号设置
          </Link>
          <Link
            href="/personal"
            style={{
              fontSize: 14,
              color: "#E86A17",
              textDecoration: "none",
              fontFamily: "'Noto Sans SC', sans-serif",
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.textDecoration =
                "underline")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.textDecoration = "none")
            }
          >
            我的起名 →
          </Link>
        </div>
      </main>
    </div>
  );
}
