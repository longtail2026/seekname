"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function NameCardSkeleton({ rank }: { rank: number }) {
  const isTop = rank <= 3;
  return (
    <div
      style={{
        padding: isTop ? "20px 22px" : "18px 20px",
        background: isTop ? "linear-gradient(145deg, #FFFDF7, #FFF9ED)" : "#FFFDF7",
        borderRadius: 14,
        border: `1px solid ${isTop ? "rgba(212,148,26,0.3)" : "#EEE8DD"}`,
        boxShadow: isTop ? "0 2px 12px rgba(212,148,26,0.08)" : "0 1px 6px rgba(44,24,16,0.04)",
        animation: "pulse 1.6s ease-in-out infinite",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="skeleton" style={{ width: 32, height: 32, borderRadius: "50%", background: "#EEE5D5" }} />
          <div>
            <div className="skeleton" style={{ width: 60, height: 16, borderRadius: 4, background: "#EEE5D5", marginBottom: 4 }} />
            <div className="skeleton" style={{ width: 40, height: 12, borderRadius: 4, background: "#EEE5D5" }} />
          </div>
        </div>
        <div className="skeleton" style={{ width: 48, height: 20, borderRadius: 20, background: isTop ? "rgba(212,148,26,0.15)" : "#EEE5D5" }} />
      </div>
      {/* Name */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 10 }}>
        <div className="skeleton" style={{ width: isTop ? 72 : 56, height: isTop ? 36 : 28, borderRadius: 6, background: "#EEE5D5" }} />
        <div className="skeleton" style={{ width: 80, height: 14, borderRadius: 4, background: "#EEE5D5" }} />
      </div>
      {/* Meaning */}
      <div className="skeleton" style={{ width: "90%", height: 12, borderRadius: 4, background: "#EEE5D5", marginBottom: 6 }} />
      <div className="skeleton" style={{ width: "70%", height: 12, borderRadius: 4, background: "#EEE5D5", marginBottom: 14 }} />
      {/* Tags */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ width: 50 + i * 10, height: 22, borderRadius: 12, background: "#EEE5D5" }} />
        ))}
      </div>
      {/* Source */}
      <div className="skeleton" style={{ width: "60%", height: 11, borderRadius: 4, background: "#EEE5D5" }} />
    </div>
  );
}

function NamingLoadingContent() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FDFAF4 0%, #EDE5D0 100%)",
        paddingTop: 80,
        paddingBottom: 60,
      }}
    >
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
      `}</style>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px" }}>
        {/* Header skeleton */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div className="skeleton" style={{ width: 280, height: 20, borderRadius: 6, background: "#EEE5D5", margin: "0 auto 12px" }} />
          <div className="skeleton" style={{ width: 160, height: 14, borderRadius: 4, background: "#EEE5D5", margin: "0 auto" }} />
        </div>

        {/* Results grid */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[1, 2, 3, 4, 5, 6].map((rank) => (
            <NameCardSkeleton key={rank} rank={rank} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function NamingLoading() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FDFAF4 0%, #EDE5D0 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{ color: "#D4941A", fontSize: 14 }}>加载中...</div>
      </div>
    }>
      <NamingLoadingContent />
    </Suspense>
  );
}
