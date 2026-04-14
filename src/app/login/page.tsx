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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  useEffect(() => {
    // 如果已经登录，直接回跳
    if (searchParams.get("redirected") === "true") {
      setError(null);
    }
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

    setLoading(true);

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
            <div
              className="w-14 h-14 flex items-center justify-center transition-all duration-300 group-hover:scale-105"
              style={{
                background: "#C84A2A",
                border: "2px solid #A63A1E",
                boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.1)",
              }}
            >
              <span
                className="text-white text-xl font-bold"
                style={{ fontFamily: "'Noto Serif SC', serif" }}
              >
                名
              </span>
            </div>
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
