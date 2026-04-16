"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff, LogIn } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");   // 验证码输入
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  // 验证码状态
  const [captchaId, setCaptchaId] = useState<string | null>(null);
  const [captchaImage, setCaptchaImage] = useState<string>("");
  const [captchaLoading, setCaptchaLoading] = useState(true);

  // 获取验证码
  async function fetchCaptcha() {
    try {
      setCaptchaLoading(true);
      const res = await fetch("/api/auth/captcha");
      if (res.ok) {
        const data = await res.json();
        setCaptchaId(data.captchaId);
        setCaptchaImage(data.image);
      }
    } catch {
      console.error("[Captcha Fetch Error]");
    } finally {
      setCaptchaLoading(false);
    }
  }

  useEffect(() => {
    fetchCaptcha(); // 初始加载验证码

    // 如果已经登录，直接回跳
    if (searchParams.get("redirected") === "true") {
      setError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!account.trim()) {
      setError("请输入手机号或邮箱");
      return;
    }
    if (!password) {
      setError("请输入密码");
      return;
    }
    if (!captchaInput.trim()) {
      setError("请输入验证码");
      return;
    }

    setLoading(true);

    // 先验证验证码
    try {
      const captchaRes = await fetch("/api/auth/captcha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ captchaId, userInput: captchaInput }),
      });
      const captchaData = await captchaRes.json();
      if (!captchaData.valid) {
        setLoading(false);
        setError(captchaData.error || "验证码错误，请重新输入");
        fetchCaptcha(); // 刷新验证码
        setCaptchaInput("");
        return;
      }
    } catch {
      setLoading(false);
      setError("验证码验证失败，请重试");
      return;
    }

    // 验证码通过 → 执行登录
    const result = await login(account.trim(), password);
    
    setLoading(false);

    if (result.success) {
      // 登录成功 → 回跳到之前的页面
      router.push(decodeURIComponent(callbackUrl));
      router.refresh();
    } else {
      setError(result.error || "登录失败，请重试");
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background:
          "linear-gradient(180deg, #FFFCF7 0%, #FFF8F0 50%, #F5EDE0 100%)",
      }}
    >
      {/* 背景装饰 */}
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 50%, rgba(201,168,76,0.08) 0%, transparent 60%),
            radial-gradient(circle at 80% 80%, rgba(232,106,23,0.06) 0%, transparent 55%)
          `,
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Logo / 品牌区 */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-3 group">
            <img
              src="/images/48-48-ICO-1.png"
              alt="寻名网"
              className="w-14 h-14 transition-all duration-300 group-hover:scale-105"
            />
            <div className="flex flex-col items-start">
              <span
                className="text-2xl font-bold text-[#2C1810]"
                style={{ fontFamily: "'Noto Serif SC', serif" }}
              >
                寻名网
              </span>
              <span className="text-xs text-[#5C4A42]">
                用户登录
              </span>
            </div>
          </Link>
        </div>

        {/* 登录卡片 */}
        <div
          className="rounded-2xl p-8 relative"
          style={{
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(12px)",
            border: "1px solid #DDD0C0",
            boxShadow:
              "0 4px 24px rgba(44,24,16,0.08), 0 1px 3px rgba(44,24,16,0.04)",
          }}
        >
          {/* 卡片顶部装饰线 */}
          <div
            className="absolute top-0 left-6 right-6 h-[2px]"
            style={{
              background:
                "linear-gradient(90deg, transparent, #D4941A, transparent)",
            }}
          />

          <h2
            className="text-2xl font-bold text-center mb-2 mt-2"
            style={{ fontFamily: "'Noto Serif SC', serif", color: "#2C1810" }}
          >
            欢迎回来
          </h2>
          <p
            className="text-sm text-center mb-8"
            style={{ color: "#5C4A42" }}
          >
            登录以继续使用寻名服务
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 错误提示 */}
            {error && (
              <div
                className="rounded-lg px-4 py-3 text-sm animate-fadeIn"
                style={{
                  background: "rgba(232,90,58,0.08)",
                  border: "1px solid rgba(232,90,58,0.25)",
                  color: "#E85A3A",
                }}
              >
                {error}
              </div>
            )}

            {/* 账号输入（手机/邮箱） */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ fontFamily: "'Noto Sans SC', sans-serif", color: "#2C1810" }}
              >
                手机号 / 邮箱
              </label>
              <input
                type="text"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder="请输入手机号或邮箱"
                autoComplete="username"
                className="w-full px-4 py-3 text-base bg-white rounded-xl transition-all duration-300 placeholder:text-[#B0AAA0] focus:outline-none focus:shadow-[0_0_0_3px_rgba(232,106,23,0.15)]"
                style={{
                  fontFamily: "'Noto Sans SC', sans-serif",
                  border: "1px solid #DDD0C0",
                  color: "#2D1B0E",
                }}
                onFocus={(e) => { (e.target as HTMLElement).style.borderColor = "#E86A17"; }}
                onBlur={(e) => { (e.target as HTMLElement).style.borderColor = "#DDD0C0"; }}
              />
            </div>

            {/* 密码输入 */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ fontFamily: "'Noto Sans SC', sans-serif", color: "#2C1810" }}
              >
                密码
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-11 text-base bg-white rounded-xl transition-all duration-300 placeholder:text-[#B0AAA0] focus:outline-none focus:shadow-[0_0_0_3px_rgba(232,106,23,0.15)]"
                  style={{
                    fontFamily: "'Noto Sans SC', sans-serif",
                    border: "1px solid #DDD0C0",
                    color: "#2D1B0E",
                  }}
                  onFocus={(e) => { (e.target as HTMLElement).style.borderColor = "#E86A17"; }}
                  onBlur={(e) => { (e.target as HTMLElement).style.borderColor = "#DDD0C0"; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-colors duration-200"
                  style={{ color: "#B0AAA0" }}
                  onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = "#E86A17"}
                  onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = "#B0AAA0"}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* 验证码 */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ fontFamily: "'Noto Sans SC', sans-serif", color: "#2C1810" }}
              >
                验证码
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="text"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  placeholder="输入4位数字验证码"
                  autoComplete="off"
                  maxLength={4}
                  className="flex-1 px-4 py-3 text-base bg-white rounded-xl transition-all duration-300 placeholder:text-[#B0AAA0] focus:outline-none focus:shadow-[0_0_0_3px_rgba(232,106,23,0.15)]"
                  style={{
                    fontFamily: "'Noto Sans SC', sans-serif",
                    border: "1px solid #DDD0C0",
                    color: "#2D1B0E",
                    letterSpacing: "8px",
                    textAlign: "center",
                    fontWeight: 600,
                  }}
                  onFocus={(e) => { (e.target as HTMLElement).style.borderColor = "#E86A17"; }}
                  onBlur={(e) => { (e.target as HTMLElement).style.borderColor = "#DDD0C0"; }}
                />
                {/* 验证码图片（可点击刷新） */}
                <button
                  type="button"
                  onClick={fetchCaptcha}
                  title="点击刷新验证码"
                  style={{
                    height: 48,
                    width: 110,
                    padding: 0,
                    border: "1px solid #DDD0C0",
                    borderRadius: 10,
                    background: "#FFFCF7",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "border-color 0.2s",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#E86A17"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#DDD0C0"; }}
                >
                  {captchaLoading ? (
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        border: "2px solid #DDD0C0",
                        borderTopColor: "#E86A17",
                        borderRadius: "50%",
                        animation: "spin 0.6s linear infinite",
                      }}
                    />
                  ) : captchaImage ? (
                    <img
                      src={captchaImage}
                      alt="验证码"
                      style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 8, pointerEvents: "none" }}
                    />
                  ) : (
                    <span style={{ fontSize: 12, color: "#BBB" }}>加载中</span>
                  )}
                </button>
              </div>
              <p style={{ fontSize: 11, color: "#AAA", marginTop: 4, fontFamily: "'Noto Sans SC', sans-serif" }}>
                看不清？点击图片可刷新
              </p>
            </div>

            {/* 忘记密码（预留） */}
            <div className="text-right">
              <button
                type="button"
                className="text-sm transition-colors duration-200"
                style={{ fontFamily: "'Noto Sans SC', sans-serif", color: "#999" }}
                onMouseEnter={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = "#E86A17"; }}
                onMouseLeave={(e) => { const el = e.currentTarget as HTMLElement; el.style.color = "#999"; }}
              >
                忘记密码？
              </button>
            </div>

            {/* 登录按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full !py-3.5 text-base disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  登录中...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <LogIn className="w-5 h-5" />
                  登 录
                </span>
              )}
            </button>
          </form>

          {/* 社交登录分隔区 */}
          {(() => {
            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
            const isGithubConfigured = !!process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
            if (!isGithubConfigured) return null;
            return (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 20 }}>
                  <div style={{ flex: 1, height: "1px", background: "#DDD0C0" }} />
                  <span style={{ fontSize: 12, color: "#AAA", fontFamily: "'Noto Sans SC', sans-serif", whiteSpace: "nowrap" }}>其他登录方式</span>
                  <div style={{ flex: 1, height: "1px", background: "#DDD0C0" }} />
                </div>
                <button
                  type="button"
                  onClick={() => { window.location.href = "/api/auth/github"; }}
                  style={{
                    marginTop: 12,
                    width: "100%",
                    height: 46,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    border: "1px solid #DDD0C0",
                    borderRadius: 12,
                    background: "#FFF",
                    cursor: "pointer",
                    fontSize: 14,
                    color: "#2C1810",
                    fontFamily: "'Noto Sans SC', sans-serif",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = "#24292F";
                    el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.borderColor = "#DDD0C0";
                    el.style.boxShadow = "none";
                  }}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="#24292F">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                  使用 GitHub 登录
                </button>
              </>
            );
          })()}

          {/* 底部：去注册 */}
          <div
            className="mt-6 pt-6 text-center text-sm"
            style={{ borderTop: "1px solid rgba(221,208,192,0.6)" }}
          >
            <span style={{ color: "#5C4A42" }}>还没有账号？</span>{" "}
            <Link
              href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="font-medium transition-colors duration-200"
              style={{ color: "#E86A17", fontFamily: "'Noto Sans SC', sans-serif" }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.textDecoration = "underline"}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.textDecoration = "none"}
            >
              立即注册
            </Link>
          </div>

          {/* 卡片底部装饰 */}
          <div
            className="absolute bottom-0 left-8 right-8 h-[1px]"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(212,148,26,0.3), transparent)",
            }}
          />
        </div>

        {/* 返回首页 */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-sm transition-colors duration-200 inline-flex items-center gap-1"
            style={{ color: "#B0AAA0", fontFamily: "'Noto Sans SC', sans-serif" }}
            onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = "#E86A17"}
            onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = "#B0AAA0"}
          >
            ← 返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#E86A17] border-t-transparent rounded-full" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
