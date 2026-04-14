"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  OCCUPATIONS,
  HOBBIES,
} from "@/lib/constants";

// ─── 头像裁剪组件 ───
function AvatarCropModal({
  src,
  onConfirm,
  onCancel,
}: {
  src: string;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // 图片状态
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const CIRCLE_SIZE = 240; // 裁剪圆直径

  // 加载图片
  useEffect(() => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      setImg(image);
      // 初始缩放：让图片短边填满圆
      const s = Math.max(CIRCLE_SIZE / image.width, CIRCLE_SIZE / image.height) * 1.3;
      setScale(s);
      setPos({ x: 0, y: 0 });
    };
    image.src = src;
  }, [src]);

  // 绘制裁剪预览（圆 + 图）
  useEffect(() => {
    if (!img || !canvasRef.current) return;
    const cv = canvasRef.current;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displaySize = CIRCLE_SIZE + 60; // 圆外留边
    cv.width = displaySize * dpr;
    cv.height = displaySize * dpr;
    cv.style.width = `${displaySize}px`;
    cv.style.height = `${displaySize}px`;
    ctx.scale(dpr, dpr);

    // 清空（半透明暗底）
    ctx.clearRect(0, 0, displaySize, displaySize);

    // 绘制图片（可移动/缩放）
    const cx = displaySize / 2;
    const cy = displaySize / 2;
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, CIRCLE_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(
      img,
      cx - w / 2 + pos.x,
      cy - h / 2 + pos.y,
      w,
      h
    );
    ctx.restore();

    // 绘制裁剪圆边框
    ctx.strokeStyle = "#E86A17";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, CIRCLE_SIZE / 2, 0, Math.PI * 2);
    ctx.stroke();

    // 十字辅助线
    ctx.strokeStyle = "rgba(232,106,23,0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - CIRCLE_SIZE / 2, cy);
    ctx.lineTo(cx + CIRCLE_SIZE / 2, cy);
    ctx.moveTo(cx, cy - CIRCLE_SIZE / 2);
    ctx.lineTo(cx, cy + CIRCLE_SIZE / 2);
    ctx.stroke();
  }, [img, pos, scale]);

  // 拖拽处理
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setDragging(true);
      setDragStart({ x: e.clientX - pos.x, y: e.clientY - pos.y });
    },
    [pos]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !img) return;
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setPos({ x: newX, y: newY });
    },
    [dragging, dragStart, img]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  // 缩放滑块
  const handleZoomIn = () =>
    setScale((prev) => Math.min(prev * 1.15, 5));
  const handleZoomOut = () =>
    setScale((prev) => Math.max(prev / 1.15, 0.5));

  // 确认裁剪 → 输出圆形 blob
  const handleConfirm = () => {
    if (!img) return;
    const outCanvas = document.createElement("canvas");
    const outSize = CIRCLE_SIZE; // 输出分辨率
    outCanvas.width = outSize;
    outCanvas.height = outSize;
    const outCtx = outCanvas.getContext("2d");
    if (!outCtx) return;

    // 画圆形裁剪区域
    const cx = outSize / 2;
    const cy = outSize / 2;
    const r = outSize / 2;
    outCtx.beginPath();
    outCtx.arc(cx, cy, r, 0, Math.PI * 2);
    outCtx.closePath();
    outCtx.clip();

    const w = img.width * scale;
    const h = img.height * scale;

    // 计算源坐标（从显示坐标反推）
    // 显示时：图片中心在 (displaySize/2 + pos.x, displaySize/2 + pos.y)
    // 显示尺寸 = (w, h)，输出尺寸 = (outSize, outSize)
    const displaySize = CIRCLE_SIZE + 60;
    const ratio = outSize / displaySize; // 输出 vs 显示 的比例
    const sx = (displaySize / 2 + pos.x) - w / 2; // 显示中图片左上角 x
    const sy = (displaySize / 2 + pos.y) - h / 2; // 显示中图片左上角 y

    outCtx.drawImage(img, sx * ratio, sy * ratio, w * ratio, h * ratio);

    outCanvas.toBlob(
      (blob) => {
        if (blob) onConfirm(blob);
      },
      "image/png",
      0.92
    );
  };

  if (!img) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "rgba(0,0,0,0.6)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onClick={onCancel}
      >
        <div
          style={{
            background: "#FFF",
            borderRadius: 16,
            padding: 40,
            color: "#4A3428",
            fontFamily: "'Noto Sans SC', sans-serif",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          加载图片中...
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.95)",
          borderRadius: 20,
          padding: "24px",
          maxWidth: "95vw",
          maxHeight: "95vh",
          overflow: "auto",
          boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "#4A3428",
            textAlign: "center",
            marginBottom: 6,
            fontFamily: "'Noto Serif SC', serif",
          }}
        >
          裁剪头像
        </h3>
        <p
          style={{
            fontSize: 13,
            color: "#999",
            textAlign: "center",
            marginBottom: 16,
            fontFamily: "'Noto Sans SC', sans-serif",
          }}
        >
          拖动调整位置，滚轮或按钮调整大小
        </p>

        {/* Canvas 裁剪区 */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            cursor: dragging ? "grabbing" : "grab",
            margin: "0 auto",
            marginBottom: 14,
            touchAction: "none",
            userSelect: "none" as any,
          }}
        >
          <canvas ref={canvasRef} />
        </div>

        {/* 缩放控制 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <button
            onClick={handleZoomOut}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "1px solid #DDD0C0",
              background: "#FFF",
              fontSize: 18,
              cursor: "pointer",
              lineHeight: "34px",
              textAlign: "center",
            }}
          >
            −
          </button>
          <span
            style={{
              fontSize: 13,
              color: "#888",
              fontFamily: "'Noto Sans SC', sans-serif",
              minWidth: 50,
              textAlign: "center",
            }}
          >
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "1px solid #DDD0C0",
              background: "#FFF",
              fontSize: 18,
              cursor: "pointer",
              lineHeight: "34px",
              textAlign: "center",
            }}
          >
            +
          </button>
        </div>

        {/* 按钮 */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "11px",
              borderRadius: 8,
              border: "1px solid #DDD0C0",
              background: "transparent",
              fontSize: 15,
              cursor: "pointer",
              fontFamily: "'Noto Sans SC', sans-serif",
              color: "#6B5A4E",
            }}
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            style={{
              flex: 1,
              padding: "11px",
              borderRadius: 8,
              border: "none",
              background: "#E86A17",
              color: "#FFF",
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "'Noto Sans SC', sans-serif",
            }}
          >
            确认裁剪
          </button>
        </div>
      </div>
    </div>
  );
}

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

  // 裁剪弹窗状态
  const [cropSrc, setCropSrc] = useState<string | null>(null);

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
      credentials: "same-origin",
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

  // 选择文件 → 预览进入裁剪
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 文件校验
    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)) {
      setMessage({ type: "error", text: "请选择 JPG/PNG/GIF/WebP 格式的图片" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "图片不能超过 2MB" });
      return;
    }

    // 读为 dataURL 给裁剪组件用
    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
    // 重置 input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // 裁剪确认 → 上传
  const handleCropConfirm = async (blob: Blob) => {
    setCropSrc(null);
    const token = localStorage.getItem("seekname_token");
    if (!token) return;

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      // 用 File 构造器包装 blob，确保有正确扩展名
      const file = new File([blob], "avatar.png", { type: "image/png" });
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
        // 同步 localStorage
        const stored = localStorage.getItem("seekname_user");
        if (stored) {
          try {
            const userObj = JSON.parse(stored);
            userObj.avatar = data.avatar;
            localStorage.setItem("seekname_user", JSON.stringify(userObj));
          } catch {}
        }
      } else {
        setMessage({ type: "error", text: data.error || "上传失败" });
      }
    } catch {
      setMessage({ type: "error", text: "网络错误，请重试" });
    } finally {
      setUploading(false);
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
        paddingTop: 56, /* 补偿 fixed header 高度 */
      }}
    >
      {/* 主内容区 */}
      <main
        style={{
          maxWidth: 640,
          margin: "0 auto",
          padding: "32px 20px 60px",
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
              background: "rgba(255,255,255,0.9)",
              backdropFilter: "blur(8px)",
              borderRadius: 16,
              padding: "36px 32px",
              boxShadow:
                "0 2px 8px rgba(74,52,40,0.04), 0 4px 16px rgba(74,52,40,0.02)",
              border: "1px solid #DDD0C0",
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

            {/* ── 头像区域（带裁剪） ── */}
            <section style={{ textAlign: "center", marginBottom: 32 }}>
              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                style={{
                  width: 100,
                  height: 100,
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
                  <span style={{ fontSize: 38, color: "#B0AAA0" }}>👤</span>
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
                      padding: "4px 0",
                      textAlign: "center",
                      fontFamily: "'Noto Sans SC', sans-serif",
                    }}
                  >
                    点击更换（支持裁剪）
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileSelect}
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
                支持 JPG、PNG、GIF、WebP，最大 2MB · 可拖动裁剪圆形区域
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
      </main>

      {/* 裁剪弹窗 */}
      {cropSrc && (
        <AvatarCropModal
          src={cropSrc}
          onConfirm={handleCropConfirm}
          onCancel={() => setCropSrc(null)}
        />
      )}
    </div>
  );
}
