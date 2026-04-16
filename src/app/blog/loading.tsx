"use client";

function PostCardSkeleton() {
  return (
    <div
      style={{
        background: "#FFF",
        borderRadius: 12,
        border: "1px solid #EEE8DD",
        overflow: "hidden",
      }}
    >
      {/* Cover */}
      <div
        className="skeleton"
        style={{ width: "100%", height: 160, background: "#EEE5D5" }}
      />
      <div style={{ padding: "16px 18px" }}>
        {/* Tags */}
        <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
          <div className="skeleton" style={{ width: 48, height: 20, borderRadius: 10, background: "#EEE5D5" }} />
          <div className="skeleton" style={{ width: 36, height: 20, borderRadius: 10, background: "#EEE5D5" }} />
        </div>
        {/* Title */}
        <div className="skeleton" style={{ width: "85%", height: 16, borderRadius: 4, background: "#EEE5D5", marginBottom: 8 }} />
        <div className="skeleton" style={{ width: "60%", height: 16, borderRadius: 4, background: "#EEE5D5", marginBottom: 12 }} />
        {/* Summary */}
        <div className="skeleton" style={{ width: "100%", height: 12, borderRadius: 4, background: "#EEE5D5", marginBottom: 6 }} />
        <div className="skeleton" style={{ width: "80%", height: 12, borderRadius: 4, background: "#EEE5D5", marginBottom: 16 }} />
        {/* Footer */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="skeleton" style={{ width: 80, height: 12, borderRadius: 4, background: "#EEE5D5" }} />
          <div className="skeleton" style={{ width: 100, height: 12, borderRadius: 4, background: "#EEE5D5" }} />
        </div>
      </div>
    </div>
  );
}

export default function BlogLoading() {
  return (
    <div style={{ minHeight: "100vh", background: "#FFFCF7" }}>
      {/* Header skeleton */}
      <div
        style={{
          background: "linear-gradient(135deg, #2D1B0E 0%, #4A2E18 100%)",
          padding: "48px 0 36px",
          textAlign: "center",
        }}
      >
        <div className="skeleton" style={{ width: 200, height: 24, borderRadius: 6, background: "rgba(255,255,255,0.15)", margin: "0 auto 10px" }} />
        <div className="skeleton" style={{ width: 320, height: 18, borderRadius: 4, background: "rgba(255,255,255,0.1)", margin: "0 auto" }} />
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        {/* Search + tags skeleton */}
        <div style={{ display: "flex", gap: 16, marginBottom: 32, alignItems: "center", flexWrap: "wrap" }}>
          <div className="skeleton" style={{ width: 280, height: 38, borderRadius: 20, background: "#EEE5D5" }} />
          <div style={{ display: "flex", gap: 8, flex: 1 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton" style={{ width: 60 + i * 5, height: 30, borderRadius: 16, background: "#EEE5D5" }} />
            ))}
          </div>
        </div>

        {/* Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: 20,
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
