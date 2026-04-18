"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 错误已记录至服务端日志
    console.error("[SeekName Error]", error);
  }, [error]);

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
      {/* 错误图标 */}
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: "rgba(232,106,23,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 28,
        }}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#E86A17"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <h1
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: "#2D1B0E",
          marginBottom: 10,
          fontFamily: "'Noto Serif SC', serif",
        }}
      >
        服务异常
      </h1>

      <p
        style={{
          fontSize: 14,
          color: "#8B7355",
          marginBottom: 8,
          lineHeight: 1.7,
          maxWidth: 420,
        }}
      >
        抱歉，起名服务遇到了意外状况
      </p>
      <p
        style={{
          fontSize: 12,
          color: "#B0A090",
          marginBottom: 36,
        }}
      >
        请稍后重试，或联系 support@seekname.cn
      </p>

      {/* 调试信息（临时开启，方便排查生产问题） */}
      <div
        style={{
          fontSize: 12,
          color: "#fff",
          marginBottom: 24,
          padding: "12px 16px",
          background: "#c0392b",
          borderRadius: 8,
          fontFamily: "monospace",
          maxWidth: 480,
          textAlign: "left",
          wordBreak: "break-all",
          whiteSpace: "pre-wrap",
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: 6 }}>🔧 错误详情（临时调试）:</div>
        <div>message: {error.message || "(空)"}</div>
        {error.digest && <div>digest: {error.digest}</div>}
        <div>stack: {error.stack?.slice(0, 600) || "(空)"}</div>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={reset}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "11px 28px",
            background: "linear-gradient(135deg, #E86A17 0%, #D55A0B 100%)",
            color: "#fff",
            borderRadius: 8,
            border: "none",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            boxShadow: "0 4px 16px rgba(232,106,23,0.3)",
          }}
        >
          <RefreshCw className="w-4 h-4" />
          重试一次
        </button>
        <Link
          href="/"
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
          <Home className="w-4 h-4" />
          返回首页
        </Link>
      </div>
    </div>
  );
}
