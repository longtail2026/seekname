"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  OCCUPATIONS,
  HOBBIES,
} from "@/lib/constants";

export default function SettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 表单状态
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [gender, setGender] = useState("");
  const [occupation, setOccupation] = useState("");
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  // 切换爱好选中
  const toggleHobby = (hobby: string) => {
    setSelectedHobbies((prev) =>
      prev.includes(hobby) ? prev.filter((h) => h !== hobby) : [...prev, hobby]
    );
  };

  // 加载用户信息
  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("seekname_token")
        : null;
    if (!token) {
      router.push("/login");
      return;
    }

    setLoading(true);
    fetch("/api/auth/session", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.user) {
          router.push("/login");
          return;
        }
        const u = data.user;
        setName(u.name || "");
        setAvatar(u.avatar || null);
        setGender(u.gender || "");
        setOccupation(u.occupation || "");
        setSelectedHobbies(Array.isArray(u.hobbies) ? u.hobbies : []);
        setEmail(u.email || "");
        setPhone(u.phone || "");
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  // 头像上传
  const handleAvatarUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const token = localStorage.getItem("seekname_token");
    if (!token) return;

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await fetch("/api/user/avatar/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.avatar) {
        setAvatar(data.avatar);
        setMessage({ type: "success", text: "头像更新成功！" });
      } else {
        setMessage({ type: "error", text: data.error || "上传失败" });
      }
    } catch {
      setMessage({ type: "error", text: "网络错误，请重试" });
    } finally {
      setUploading(false);
      // 重置 input 以便重复选择同一文件
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // 保存设置
  const handleSave = async () => {
    const token = localStorage.getItem("seekname_token");
    if (!token) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          gender,
          occupation,
          hobbies: selectedHobbies,
          email: email || null,
          phone: phone || null,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "账号信息已保存！" });
        // 更新 localStorage 中的用户名（供 Header 显示）
        const stored = localStorage.getItem("seekname_user");
        if (stored) {
          try {
            const userObj = JSON.parse(stored);
            userObj.name = name;
            userObj.avatar = avatar;
            userObj.gender = gender;
            localStorage.setItem("seekname_user", JSON.stringify(userObj));
          } catch {}
        }
      } else {
        setMessage({ type: "error", text: data.error || "保存失败" });
      }
    } catch {
      setMessage({ type: "error", text: "网络错误，请重试" });
    } finally {
      setSaving(false);
    }
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
            <span
              style={{
                fontSize: 15,
                color: "#E86A17",
                fontWeight: 600,
                fontFamily: "'Noto Sans SC', sans-serif",
                cursor: "default",
              }}
            >
              账号设置
            </span>
          </nav>
        </div>
      </header>

      {/* 主内容区 */}
      <main
        style={{
          maxWidth: 680,
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
          账号设置
        </h1>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#999" }}>
            加载中...
          </div>
        ) : (
          <div
            style={{
              background: "rgba(255,255,255,0.85)",
              borderRadius: 16,
              padding: "36px 40px",
              boxShadow: "0 4px 24px rgba(74,52,40,0.06)",
            }}
          >
            {/* 消息提示 */}
            {message && (
              <div
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  marginBottom: 20,
                  fontSize: 14,
                  fontFamily: "'Noto Sans SC', sans-serif",
                  background:
                    message.type === "success"
                      ? "rgba(39,174,96,0.08)"
                      : "rgba(231,76,60,0.08)",
                  color: message.type === "success" ? "#27AE60" : "#C0392B",
                  border: `1px solid ${
                    message.type === "success"
                      ? "rgba(39,174,96,0.2)"
                      : "rgba(231,76,60,0.2)"
                  }`,
                }}
              >
                {message.text}
              </div>
            )}

            {/* ── 头像区域 ── */}
            <section style={{ textAlign: "center", marginBottom: 32 }}>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: "50%",
                  margin: "0 auto 12px",
                  overflow: "hidden",
                  cursor: uploading ? "not-allowed" : "pointer",
                  border: "3px solid #E86A17",
                  position: "relative",
                  background: "#F5EDE0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "transform 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (!uploading)
                    (e.currentTarget as HTMLElement).style.transform = "scale(1.05)";
                }}
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.transform = "scale(1)")
                }
              >
                {avatar ? (
                  <img
                    src={avatar}
                    alt="头像"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ fontSize: 36, color: "#B0AAA0" }}>👤</span>
                )}
                {!uploading && (
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: "rgba(0,0,0,0.5)",
                      color: "#FFF",
                      fontSize: 11,
                      padding: "3px 0",
                      textAlign: "center",
                      fontFamily: "'Noto Sans SC', sans-serif",
                    }}
                  >
                    点击更换
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleAvatarUpload}
                style={{ display: "none" }}
              />
              {uploading && (
                <span
                  style={{
                    fontSize: 13,
                    color: "#E86A17",
                    fontFamily: "'Noto Sans SC', sans-serif",
                  }}
                >
                  上传中...
                </span>
              )}
              <p
                style={{
                  fontSize: 12,
                  color: "#999",
                  marginTop: 6,
                  fontFamily: "'Noto Sans SC', sans-serif",
                }}
              >
                支持 JPG、PNG、GIF、WebP，最大 2MB
              </p>
            </section>

            {/* ── 昵称 ── */}
            <label
              style={{
                display: "block",
                fontSize: 14,
                fontWeight: 600,
                color: "#4A3428",
                marginBottom: 6,
                fontFamily: "'Noto Sans SC', sans-serif",
              }}
            >
              昵称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入昵称"
              maxLength={20}
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: 8,
                border: "1px solid #DDD0C0",
                fontSize: 15,
                outline: "none",
                background: "#FFFEFA",
                fontFamily: "'Noto Sans SC', sans-serif",
                boxSizing: "border-box",
                marginBottom: 18,
                transition: "border-color 0.2s",
              }}
              onFocus={(e) =>
                ((e.target as HTMLInputElement).style.borderColor = "#E86A17")
              }
              onBlur={(e) =>
                ((e.target as HTMLInputElement).style.borderColor = "#DDD0C0")
              }
            />

            {/* ── 性别 ── */}
            <label
              style={{
                display: "block",
                fontSize: 14,
                fontWeight: 600,
                color: "#4A3428",
                marginBottom: 6,
                fontFamily: "'Noto Sans SC', sans-serif",
              }}
            >
              性别
            </label>
            <div style={{ display: "flex", gap: 16, marginBottom: 18 }}>
              {["男", "女"].map((g) => (
                <label
                  key={g}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                    padding: "8px 20px",
                    borderRadius: 8,
                    border: `1px solid ${gender === g ? "#E86A17" : "#DDD0C0"}`,
                    background: gender === g ? "rgba(232,106,23,0.05)" : "#FFFEFA",
                    transition: "all 0.2s",
                    fontFamily: "'Noto Sans SC', sans-serif",
                    fontSize: 14,
                  }}
                >
                  <input
                    type="radio"
                    name="gender"
                    value={g}
                    checked={gender === g}
                    onChange={() => setGender(g)}
                    style={{ display: "none" }}
                  />
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: "50%",
                      border: `2px solid ${gender === g ? "#E86A17" : "#CCC"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {gender === g && (
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#E86A17",
                        }}
                      />
                    )}
                  </span>
                  {g}
                </label>
              ))}
            </div>

            {/* ── 职业 ── */}
            <label
              style={{
                display: "block",
                fontSize: 14,
                fontWeight: 600,
                color: "#4A3428",
                marginBottom: 6,
                fontFamily: "'Noto Sans SC', sans-serif",
              }}
            >
              职业
            </label>
            <select
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              style={{
                width: "100%",
                padding: "11px 14px",
                borderRadius: 8,
                border: "1px solid #DDD0C0",
                fontSize: 15,
                outline: "none",
                background: "#FFFEFA",
                fontFamily: "'Noto Sans SC', sans-serif",
                boxSizing: "border-box",
                marginBottom: 18,
                cursor: "pointer",
                appearance: "auto",
              }}
            >
              <option value="">请选择职业</option>
              {OCCUPATIONS.map((occ) => (
                <option key={occ} value={occ}>
                  {occ}
                </option>
              ))}
            </select>

            {/* ── 爱好（多选标签） ── */}
            <label
              style={{
                display: "block",
                fontSize: 14,
                fontWeight: 600,
                color: "#4A3428",
                marginBottom: 6,
                fontFamily: "'Noto Sans SC', sans-serif",
              }}
            >
              爱好{" "}
              <span style={{ fontWeight: 400, color: "#999", fontSize: 13 }}>
                （可多选）
              </span>
            </label>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 22,
              }}
            >
              {HOBBIES.map((hobby) => {
                const selected = selectedHobbies.includes(hobby);
                return (
                  <button
                    key={hobby}
                    type="button"
                    onClick={() => toggleHobby(hobby)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 20,
                      border: `1px solid ${selected ? "#E86A17" : "#DDD0C0"}`,
                      background: selected
                        ? "rgba(232,106,23,0.08)"
                        : "#FFFEFA",
                      color: selected ? "#E86A17" : "#6B5A4E",
                      fontSize: 13,
                      cursor: "pointer",
                      fontFamily: "'Noto Sans SC', sans-serif",
                      transition: "all 0.2s",
                    }}
                  >
                    {hobby}
                  </button>
                );
              })}
            </div>

            {/* 分割线 */}
            <hr
              style={{
                border: "none",
                borderTop: "1px dashed #DDD0C0",
                margin: "22px 0",
              }}
            />

            {/* ── 联系方式 ── */}
            <h3
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "#4A3428",
                marginBottom: 14,
                fontFamily: "'Noto Serif SC', serif",
              }}
            >
              联系方式
            </h3>
            <p
              style={{
                fontSize: 13,
                color: "#888",
                marginBottom: 14,
                fontFamily: "'Noto Sans SC', sans-serif",
              }}
            >
              可补充注册时未填写的手机号或邮箱
            </p>

            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                color: "#6B5A4E",
                marginBottom: 4,
                fontFamily: "'Noto Sans SC', sans-serif",
              }}
            >
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={phone ? "补充填写邮箱" : "您的邮箱"}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #DDD0C0",
                fontSize: 14,
                outline: "none",
                background: "#FFFEFA",
                fontFamily: "'Noto Sans SC', sans-serif",
                boxSizing: "border-box",
                marginBottom: 12,
              }}
              onFocus={(e) =>
                ((e.target as HTMLInputElement).style.borderColor = "#E86A17")
              }
              onBlur={(e) =>
                ((e.target as HTMLInputElement).style.borderColor = "#DDD0C0")
              }
            />

            <label
              style={{
                display: "block",
                fontSize: 13,
                fontWeight: 500,
                color: "#6B5A4E",
                marginBottom: 4,
                fontFamily: "'Noto Sans SC', sans-serif",
              }}
            >
              手机号
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={email ? "补充填写手机号": "您的手机号"}
              maxLength={11}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 8,
                border: "1px solid #DDD0C0",
                fontSize: 14,
                outline: "none",
                background: "#FFFEFA",
                fontFamily: "'Noto Sans SC', sans-serif",
                boxSizing: "border-box",
                marginBottom: 24,
              }}
              onFocus={(e) =>
                ((e.target as HTMLInputElement).style.borderColor = "#E86A17")
              }
              onBlur={(e) =>
                ((e.target as HTMLInputElement).style.borderColor = "#DDD0C0")
              }
            />

            {/* ── 保存按钮 ── */}
            <button
              onClick={handleSave}
              disabled={saving}
              onMouseEnter={(e) => {
                if (!saving)
                  (e.currentTarget as HTMLElement).style.background = "#D55A0B";
              }}
              onMouseLeave={(e) => {
                if (!saving)
                  (e.currentTarget as HTMLElement).style.background = "#E86A17";
              }}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: 8,
                border: "none",
                background: saving ? "#CCC" : "#E86A17",
                color: "#FFF",
                fontSize: 16,
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "'Noto Sans SC', sans-serif",
                transition: "background 0.2s",
                letterSpacing: 4,
              }}
            >
              {saving ? "保存中..." : "保 存"}
            </button>
          </div>
        )}

        {/* 快捷链接 */}
        <div
          style={{
            textAlign: "center",
            marginTop: 20,
            display: "flex",
            justifyContent: "center",
            gap: 20,
          }}
        >
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
            ← 我的起名
          </Link>
          <Link
            href="/orders"
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
            历史订单 →
          </Link>
        </div>
      </main>
    </div>
  );
}
