"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Eye, EyeOff, UserPlus, CheckCircle2, Mail, Phone } from "lucide-react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [form, setForm] = useState({
    account: "",       // 手机号或邮箱，合并为一个输入框
    password: "",
    confirmPassword: "",
    name: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { register } = useAuth();

  function updateField(
    field: keyof typeof form,
    value: string
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError(null);
  }

  // 判断输入内容是邮箱还是手机号
  function detectAccountType(value: string): 'email' | 'phone' | '' {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'email';
    if (/^1[3-9]\d{9}$/.test(trimmed)) return 'phone';
    return '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // 校验
    if (!form.account.trim()) {
      setError("请输入手机号或邮箱");
      return;
    }
    
    const trimmed = form.account.trim();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    const isPhone = /^1[3-9]\d{9}$/.test(trimmed);

    if (!isEmail && !isPhone) {
      setError("请输入有效的手机号或邮箱地址");
      return;
    }

    if (form.password.length < 6) {
      setError("密码至少需要 6 个字符");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    setLoading(true);

    const result = await register({
      email: isEmail ? trimmed : undefined,
      phone: isPhone ? trimmed : undefined,
      password: form.password,
      name: form.name.trim() || undefined,
    });

    setLoading(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        router.push(
          `/login?callbackUrl=${encodeURIComponent(callbackUrl)}&redirected=true`
        );
      }, 2500);
    } else {
      setError(result.error || "注册失败，请重试");
    }
  }

  // 成功状态
  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{
          background:
            "linear-gradient(180deg, #FFFCF7 0%, #FFF8F0 50%, #F5EDE0 100%)",
        }}
      >
        <div className="text-center">
          <div
            className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center animate-ink-spread"
            style={{
              background: "rgba(46,173,90,0.1)",
              border: "1px solid rgba(46,173,90,0.25)",
            }}
          >
            <CheckCircle2 className="w-10 h-10" style={{ color: "#2EAD5A" }} />
          </div>
          <h2
            className="text-2xl font-bold mb-2"
            style={{ fontFamily: "'Noto Serif SC', serif", color: "#2D1B0E" }}
          >
            注册成功！
          </h2>
          <p className="text-[#5C4A42] mb-6" style={{ fontFamily: "'Noto Sans SC', sans-serif" }}>
            正在跳转到登录页面...
          </p>
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}&redirected=true`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white transition-all duration-300 hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(135deg, #2C1810 0%, #1a120c 100%)",
              fontFamily: "'Noto Serif SC', serif",
              boxShadow: "0 2px 8px rgba(45,27,14,0.3)",
            }}
          >
            立即登录 →
          </Link>
        </div>
      </div>
    );
  }

  const accountType = detectAccountType(form.account);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
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
            radial-gradient(circle at 80% 20%, rgba(201,168,76,0.08) 0%, transparent 60%),
            radial-gradient(circle at 20% 70%, rgba(232,106,23,0.06) 0%, transparent 55%)
          `,
        }}
      />

      {/* PC端更宽：max-w-[480px]，移动端自适应 */}
      <div className="relative w-full max-w-[480px]" style={{ maxWidth: 'min(480px, 92vw)' }}>
        {/* Logo / 品牌区 */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center space-x-3 group">
            <img
              src="/images/48-48-ICO-1.png"
              alt="寻名网"
              className="w-12 h-12 transition-all duration-300 group-hover:scale-105"
            />
            <div className="flex flex-col items-start">
              <span
                className="text-xl font-bold text-[#2C1810]"
                style={{ fontFamily: "'Noto Serif SC', serif" }}
              >
                寻名网
              </span>
              <span className="text-xs text-[#5C4A42]">新用户注册</span>
            </div>
          </Link>
        </div>

        {/* 注册卡片 */}
        <div
          className="rounded-2xl p-6 sm:p-8 relative"
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
            className="text-xl sm:text-2xl font-bold text-center mb-1 mt-2"
            style={{ fontFamily: "'Noto Serif SC', serif", color: "#2C1810" }}
          >
            创建账号
          </h2>
          <p
            className="text-xs sm:text-sm text-center mb-6"
            style={{ color: "#5C4A42", fontFamily: "'Noto Sans SC', sans-serif" }}
          >
            注册即可使用 AI 智能起名服务
          </p>

          <form onSubmit={handleSubmit} className="space-y-3.5">
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

            {/* 昵称（选填） */}
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ fontFamily: "'Noto Sans SC', sans-serif", color: "#2C1810" }}
              >
                昵称{" "}
                <span style={{ color: "#B0AAA0", fontWeight: "normal" }}>
                  （选填）
                </span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="您的称呼"
                autoComplete="name"
                maxLength={20}
                className="w-full px-4 py-2.5 text-base bg-white rounded-xl transition-all duration-300 placeholder:text-[#B0AAA0] focus:outline-none focus:shadow-[0_0_0_3px_rgba(232,106,23,0.15)]"
                style={{
                  fontFamily: "'Noto Sans SC', sans-serif",
                  border: "1px solid #DDD0C0",
                  color: "#2D1B0E",
                }}
                onFocus={(e) => { (e.target as HTMLElement).style.borderColor = "#E86A17"; }}
                onBlur={(e) => { (e.target as HTMLElement).style.borderColor = "#DDD0C0"; }}
              />
            </div>

            {/* 手机号/邮箱 合并为一个输入框 */}
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ fontFamily: "'Noto Sans SC', sans-serif", color: "#2C1810" }}
              >
                手机号 / 邮箱{" "}
                <span style={{ color: "#B0AAA0", fontWeight: "normal" }}>
                  （二选一）
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={form.account}
                  onChange={(e) => updateField("account", e.target.value)}
                  placeholder="请输入手机号或邮箱地址"
                  autoComplete="username"
                  className="w-full pl-11 pr-4 py-2.5 text-base bg-white rounded-xl transition-all duration-300 placeholder:text-[#B0AAA0] focus:outline-none focus:shadow-[0_0_0_3px_rgba(232,106,23,0.15)]"
                  style={{
                    fontFamily: "'Noto Sans SC', sans-serif",
                    border: "1px solid #DDD0C0",
                    color: "#2D1B0E",
                  }}
                  onFocus={(e) => { (e.target as HTMLElement).style.borderColor = "#E86A17"; }}
                  onBlur={(e) => { (e.target as HTMLElement).style.borderColor = "#DDD0C0"; }}
                />
                {/* 左侧图标：根据输入类型动态变化 */}
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  {accountType === 'email' ? (
                    <Mail className="w-4.5 h-4.5" style={{ color: "#999" }} strokeWidth={2} />
                  ) : accountType === 'phone' ? (
                    <Phone className="w-4.5 h-4.5" style={{ color: "#999" }} strokeWidth={2} />
                  ) : (
                    <span className="text-xs" style={{ color: "#B0AAA0" }}>📱</span>
                  )}
                </div>
              </div>
              {/* 自动识别提示 */}
              {accountType && (
                <p className="mt-1 text-xs ml-1" style={{ color: "#2EAD5A" }}>
                  ✓ 已识别为{accountType === 'email' ? '邮箱' : '手机号'}
                </p>
              )}
            </div>

            {/* 密码 */}
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ fontFamily: "'Noto Sans SC', sans-serif", color: "#2C1810" }}
              >
                密码
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  placeholder="至少 6 个字符"
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 pr-11 text-base bg-white rounded-xl transition-all duration-300 placeholder:text-[#B0AAA0] focus:outline-none focus:shadow-[0_0_0_3px_rgba(232,106,23,0.15)]"
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

            {/* 确认密码 */}
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ fontFamily: "'Noto Sans SC', sans-serif", color: "#2C1810" }}
              >
                确认密码
              </label>
              <input
                type={showPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(e) => updateField("confirmPassword", e.target.value)}
                placeholder="再次输入密码"
                autoComplete="new-password"
                className="w-full px-4 py-2.5 text-base bg-white rounded-xl transition-all duration-300 placeholder:text-[#B0AAA0] focus:outline-none focus:shadow-[0_0_0_3px_rgba(232,106,23,0.15)]"
                style={{
                  fontFamily: "'Noto Sans SC', sans-serif",
                  border: "1px solid #DDD0C0",
                  color: "#2D1B0E",
                }}
                onFocus={(e) => { (e.target as HTMLElement).style.borderColor = "#E86A17"; }}
                onBlur={(e) => { (e.target as HTMLElement).style.borderColor = "#DDD0C0"; }}
              />
            </div>

            {/* 注册按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full !py-3 text-base mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
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
                  注册中...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  注 册
                </span>
              )}
            </button>
          </form>

          {/* 底部：去登录 */}
          <div
            className="mt-5 pt-4 text-center text-sm"
            style={{ borderTop: "1px solid rgba(221,208,192,0.6)" }}
          >
            <span style={{ color: "#5C4A42" }}>已有账号？</span>{" "}
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              className="font-medium transition-colors duration-200"
              style={{ color: "#E86A17", fontFamily: "'Noto Sans SC', sans-serif" }}
              onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.textDecoration = "underline"}
              onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.textDecoration = "none"}
            >
              立即登录
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
        <div className="text-center mt-4">
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

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#E86A17] border-t-transparent rounded-full" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
