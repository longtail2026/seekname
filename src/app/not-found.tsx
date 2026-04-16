"use client";

import Link from "next/link";
import { Home, Search, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(180deg, #FDFAF4 0%, #EDE5D0 100%)",
        padding: "40px 24px",
        textAlign: "center",
        fontFamily: "'Noto Sans SC', sans-serif",
      }}
    >
      {/* 装饰性太极图 */}
      <div style={{ position: "relative", marginBottom: 32 }}>
        <svg
          width="120"
          height="120"
          viewBox="0 0 120 120"
          style={{ opacity: 0.12 }}
        >
          <circle cx="60" cy="60" r="55" stroke="#D4941A" strokeWidth="1" fill="none" />
          <circle cx="60" cy="60" r="40" stroke="#D4941A" strokeWidth="1" fill="none" />
          <circle cx="60" cy="60" r="25" stroke="#D4941A" strokeWidth="1" fill="none" />
          <line x1="60" y1="5" x2="60" y2="115" stroke="#D4941A" strokeWidth="0.5" />
          <line x1="5" y1="60" x2="115" y2="60" stroke="#D4941A" strokeWidth="0.5" />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: 48, fontWeight: 700, color: "#E86A17", fontFamily: "'Noto Serif SC', serif" }}>
            404
          </span>
        </div>
      </div>

      {/* 标题 */}
      <h1
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: "#2D1B0E",
          marginBottom: 12,
          fontFamily: "'Noto Serif SC', serif",
        }}
      >
        页面不存在
      </h1>

      <p
        style={{
          fontSize: 15,
          color: "#8B7355",
          marginBottom: 8,
          lineHeight: 1.7,
          maxWidth: 400,
        }}
      >
        此页面已迁移、删除，或 URL 有误
      </p>
      <p
        style={{
          fontSize: 13,
          color: "#B0A090",
          marginBottom: 36,
          lineHeight: 1.6,
        }}
      >
        名不正则言不顺，页不在此亦同理
      </p>

      {/* 操作按钮 */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "11px 28px",
            background: "linear-gradient(135deg, #E86A17 0%, #D55A0B 100%)",
            color: "#fff",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            textDecoration: "none",
            boxShadow: "0 4px 16px rgba(232,106,23,0.3)",
          }}
        >
          <Home className="w-4 h-4" />
          返回首页
        </Link>
        <Link
          href="/personal"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "11px 28px",
            background: "#FFF",
            color: "#5C4A3A",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            textDecoration: "none",
            border: "1px solid #DDD0C0",
          }}
        >
          <Search className="w-4 h-4" />
          立即起名
        </Link>
      </div>

      {/* 底部提示 */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          fontSize: 11,
          color: "#C8B8A8",
        }}
      >
        <Link href="/" style={{ color: "#D4941A", textDecoration: "none" }}>
          寻名网
        </Link>
        {" · "}
        若有疑问请联系 support@seekname.cn
      </div>
    </div>
  );
}
