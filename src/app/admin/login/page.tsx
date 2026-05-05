"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "登录失败");
        return;
      }

      localStorage.setItem("seekname_admin", JSON.stringify(data.user));
      router.push("/admin");
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: "40px 32px",
          width: 400,
          maxWidth: "90vw",
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🔍</div>
          <h1 style={{ fontSize: 24, fontWeight: "bold", margin: "0 0 4px" }}>
            SeekName 管理中心
          </h1>
          <p style={{ fontSize: 14, color: "#999", margin: 0 }}>
            请输入管理员账号登录
          </p>
        </div>

        <form onSubmit={handleLogin}>
          {error && (
            <div
              style={{
                padding: "8px 12px",
                background: "#fff2f0",
                border: "1px solid #ffccc7",
                borderRadius: 6,
                color: "#cf1322",
                fontSize: 13,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 13,
                fontWeight: 500,
                color: "#333",
              }}
            >
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入管理员邮箱"
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #d9d9d9",
                borderRadius: 6,
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 13,
                fontWeight: 500,
                color: "#333",
              }}
            >
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #d9d9d9",
                borderRadius: 6,
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px 0",
              background: loading ? "#91caff" : "#1677ff",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 15,
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.2s",
            }}
          >
            {loading ? "登录中..." : "登 录"}
          </button>
        </form>

        <div style={{ marginTop: 24, padding: "12px 16px", background: "#f6ffed", borderRadius: 6, fontSize: 12, color: "#52c41a" }}>
          <strong>默认管理员：</strong>seekname@163.com / ZGGs1240
        </div>
      </div>
    </div>
  );
}