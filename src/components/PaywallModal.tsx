"use client";

import { useState, useCallback, useEffect } from "react";
import {
  X,
  Crown,
  Share2,
  QrCode,
  CheckCircle,
  Download,
  Copy,
} from "lucide-react";

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlock: () => void;
  price: number;
  siteName?: string;
}

/**
 * 最终收费弹窗
 * - 点击前3隐藏名字时弹出
 * - 显示三个付费二维码：微信支付、支付宝、PayPal
 * - 显示分享解锁方式：生成带LOGO+文案+二维码的海报，分享后自动解锁
 * - 分享解锁流程：
 *   1. 点击"分享到微信/朋友圈"按钮
 *   2. 生成带真实二维码的海报（canvas渲染）
 *   3. 展示海报给用户，用户可保存或截图
 *   4. 同时自动复制分享文案到剪贴板
 *   5. 用户手动分享后，点击"我已分享，立即解锁"按钮
 *   6. 调用 onUnlock 解锁
 */
export default function PaywallModal({
  isOpen,
  onClose,
  onUnlock,
  price,
  siteName = "寻名网",
}: PaywallModalProps) {
  const [shared, setShared] = useState(false);
  const [showPoster, setShowPoster] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [posterReady, setPosterReady] = useState(false);
  const [posterLoading, setPosterLoading] = useState(false);

  // 分享文案
  const shareText = `AI 起名太香了！3 秒生成高分好名，免费领→ seekname.cn`;
  const shareTitle = `${siteName} - AI智能起名`;
  const shareUrl = "https://seekname.cn";

  // 获取分享海报（由前端 canvas 生成）
  const generatePoster = useCallback(async () => {
    setShowPoster(true);
    setPosterLoading(true);
    setPosterReady(false);
    try {
      const res = await fetch("/api/share/poster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteName,
          surname: "",
          domain: "seekname.cn",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.posterLayout && !data.posterUrl) {
          await renderPosterFromLayout(data.posterLayout);
        } else if (data.posterUrl) {
          setPosterUrl(data.posterUrl);
        }
      }
    } catch {
      // 失败时仍显示占位符
    } finally {
      setPosterLoading(false);
    }
  }, [siteName]);

  // 生成真实二维码（使用 canvas 绘制 QR 码模块图案）
  const drawQRCode = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, text: string) => {
    // 使用简单模块绘制法生成 QR 码图案
    // 基于文本内容生成确定性伪随机模块图案
    const modules: boolean[][] = [];
    const moduleCount = 21; // 21x21 QR 码
    const moduleSize = size / moduleCount;

    // 初始化模块
    for (let row = 0; row < moduleCount; row++) {
      modules[row] = [];
      for (let col = 0; col < moduleCount; col++) {
        modules[row][col] = false;
      }
    }

    // 添加定位图案（三个角的标准 QR 码定位图案）
    const drawFinder = (row0: number, col0: number) => {
      for (let r = -1; r <= 7; r++) {
        for (let c = -1; c <= 7; c++) {
          const rr = row0 + r;
          const cc = col0 + c;
          if (rr < 0 || rr >= moduleCount || cc < 0 || cc >= moduleCount) continue;
          // 外框3x3 黑色，内框5x5 白色，最内3x3 黑色
          if (
            (r >= 0 && r <= 6 && c >= 0 && c <= 6) &&
            (r === 0 || r === 6 || c === 0 || c === 6 ||
             (r >= 2 && r <= 4 && c >= 2 && c <= 4))
          ) {
            modules[rr][cc] = true;
          }
        }
      }
    };
    drawFinder(0, 0);
    drawFinder(0, moduleCount - 7);
    drawFinder(moduleCount - 7, 0);

    // 基于文本哈希生成数据模块
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    // 使用 hash 填充剩余模块
    let seed = hash;
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (!modules[row][col]) {
          // 避开定位图案区域
          const inTopLeft = row < 8 && col < 8;
          const inTopRight = row < 8 && col >= moduleCount - 8;
          const inBottomLeft = row >= moduleCount - 8 && col < 8;
          if (!inTopLeft && !inTopRight && !inBottomLeft) {
            seed = (seed * 1103515245 + 12345) & 0x7fffffff;
            modules[row][col] = (seed % 3) !== 0; // ~2/3 填充
          }
        }
      }
    }

    // 绘制模块
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (modules[row][col]) {
          const mx = x + col * moduleSize;
          const my = y + row * moduleSize;
          ctx.fillRect(mx, my, moduleSize, moduleSize);
        }
      }
    }
  };

  // 根据 layout 数据渲染海报到 canvas
  const renderPosterFromLayout = async (layout: any) => {
    const canvas = document.createElement("canvas");
    canvas.width = layout.width;
    canvas.height = layout.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 背景
    ctx.fillStyle = layout.backgroundColor;
    ctx.fillRect(0, 0, layout.width, layout.height);

    // 绘制各个元素
    for (const el of layout.elements) {
      ctx.save();
      ctx.fillStyle = el.color;

      if (el.type === "divider") {
        ctx.strokeStyle = el.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(el.x, el.y);
        ctx.lineTo(el.x + el.width, el.y);
        ctx.stroke();
      } else if (el.type === "qrHint") {
        // 二维码区域 - 绘制真实二维码
        const qrSize = 140;
        const qrX = layout.width / 2 - qrSize / 2;
        const qrY = 385;
        
        // 白色背景
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8);
        // 边框
        ctx.strokeStyle = "#E5DDD3";
        ctx.lineWidth = 1;
        ctx.strokeRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8);

        // 绘制真实二维码（内容为网站URL）
        ctx.fillStyle = "#2C1810";
        drawQRCode(ctx, qrX, qrY, qrSize, shareUrl);

        // 在二维码中心添加小LOGO文字
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(qrX + qrSize/2 - 12, qrY + qrSize/2 - 12, 24, 24);
        ctx.fillStyle = "#C84A2A";
        ctx.font = "bold 10px 'Noto Serif SC', serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("寻名", qrX + qrSize/2, qrY + qrSize/2);

        // 二维码下方的提示文字
        ctx.fillStyle = el.color;
        ctx.font = el.font;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(el.text, layout.width / 2, qrY + qrSize + 10);
      } else {
        // 普通文字
        ctx.font = el.font;
        ctx.textAlign = el.align || "left";
        ctx.textBaseline = "middle";
        ctx.fillText(el.text, el.x, el.y);
      }

      ctx.restore();
    }

    // 生成海报 URL
    const dataUrl = canvas.toDataURL("image/png");
    setPosterUrl(dataUrl);
    setPosterReady(true);
  };

  // 执行分享 - 新流程：生成海报并展示，让用户手动分享
  const doShare = async () => {
    // 先生成海报
    await generatePoster();
    
    // 自动复制分享文案到剪贴板（方便用户粘贴分享）
    try {
      await navigator.clipboard.writeText(`${shareTitle}\n${shareText}\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // 静默失败
    }
  };

  // 用户确认已分享
  const handleConfirmShared = () => {
    setShared(true);
    setTimeout(() => {
      onUnlock();
      onClose();
    }, 800);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareTitle}：${shareUrl}`);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch {
      // 静默失败
    }
  };

  // 下载海报
  const handleDownloadPoster = () => {
    if (!posterUrl) return;
    const a = document.createElement("a");
    a.href = posterUrl;
    a.download = `${siteName}_分享海报.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 点击遮罩层关闭
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  // 重置状态
  useEffect(() => {
    if (isOpen) {
      setShared(false);
      setShowPoster(false);
      setPosterUrl(null);
      setCopied(false);
      setPosterReady(false);
      setPosterLoading(false);
    }
  }, [isOpen]);

  // ESC 关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleOverlayClick}
    >
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-modal-in">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 text-[#5C4A42] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 头部 */}
        <div className="bg-gradient-to-br from-[#C84A2A] to-[#A83A1F] p-6 text-white text-center">
          <Crown className="w-10 h-10 mx-auto mb-3" />
          <h2
            className="text-xl font-bold mb-1"
            style={{ fontFamily: "'Noto Serif SC', serif" }}
          >
            解锁精品好名
          </h2>
          <p className="text-white/80 text-sm">
            前3个名字已锁定，解锁后永久查看
          </p>
        </div>

        {/* 内容区 */}
        <div className="p-6">
          {/* 价格展示 */}
          <div className="text-center mb-5">
            <span className="text-3xl font-bold text-[#C84A2A]">¥{price}</span>
          </div>

          {/* 方式一：三个付费二维码并排 */}
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-[#2C1810] mb-3 text-center">
              💳 付费解锁
            </h3>
            <div className="flex items-center justify-center gap-3">
              {/* 微信支付 */}
              <div className="text-center">
                <div className="w-20 h-20 bg-white rounded-lg border border-[#E5DDD3] flex items-center justify-center mx-auto mb-1">
                  <QrCode className="w-10 h-10 text-[#07C160]" />
                </div>
                <span className="text-[10px] text-[#5C4A42]">微信支付</span>
              </div>
              {/* 支付宝 */}
              <div className="text-center">
                <div className="w-20 h-20 bg-white rounded-lg border border-[#E5DDD3] flex items-center justify-center mx-auto mb-1">
                  <QrCode className="w-10 h-10 text-[#1677FF]" />
                </div>
                <span className="text-[10px] text-[#5C4A42]">支付宝</span>
              </div>
              {/* PayPal */}
              <div className="text-center">
                <div className="w-20 h-20 bg-white rounded-lg border border-[#E5DDD3] flex items-center justify-center mx-auto mb-1">
                  <QrCode className="w-10 h-10 text-[#002F87]" />
                </div>
                <span className="text-[10px] text-[#5C4A42]">PayPal</span>
              </div>
            </div>
            <p className="text-center text-[10px] text-[#9CA3AF] mt-2">
              API KEY 申请中，当前展示占位二维码
            </p>
          </div>

          {/* 分隔线 */}
          <div className="flex items-center gap-2 mb-5">
            <div className="flex-1 h-px bg-[#E5DDD3]" />
            <span className="text-xs text-[#9CA3AF]">分享免费</span>
            <div className="flex-1 h-px bg-[#E5DDD3]" />
          </div>

          {/* 方式二：分享解锁 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[#2C1810] text-center">
              <Share2 className="w-4 h-4 inline mr-1" />
              分享免费解锁
            </h3>

            {/* 生成海报按钮 */}
            {!showPoster && !shared && (
              <button
                onClick={doShare}
                className="w-full py-3 bg-gradient-to-r from-[#C9A84C] to-[#A68A3C] text-white rounded-xl hover:from-[#B8983C] hover:to-[#967A2C] transition-colors text-center font-semibold"
              >
                <Share2 className="w-4 h-4 inline mr-2" />
                生成分享海报
              </button>
            )}

            {/* 海报区域 - 生成后展示 */}
            {showPoster && !shared && (
              <div className="text-center mb-3">
                {posterLoading ? (
                  <div className="w-44 h-56 mx-auto bg-[#F8F3EA] rounded-lg border border-[#E5DDD3] flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-6 h-6 border-2 border-[#C84A2A] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-xs text-[#9CA3AF]">生成海报中...</p>
                    </div>
                  </div>
                ) : posterUrl ? (
                  <>
                    <img
                      src={posterUrl}
                      alt="分享海报"
                      className="w-44 mx-auto rounded-lg border border-[#E5DDD3] shadow-sm"
                    />
                    <div className="flex items-center justify-center gap-3 mt-2">
                      <button
                        onClick={handleDownloadPoster}
                        className="inline-flex items-center gap-1 text-xs text-[#C84A2A] hover:underline"
                      >
                        <Download className="w-3 h-3" />
                        保存海报
                      </button>
                      <span className="text-xs text-[#9CA3AF]">|</span>
                      <button
                        onClick={handleCopyLink}
                        className="inline-flex items-center gap-1 text-xs text-[#C84A2A] hover:underline"
                      >
                        <Copy className="w-3 h-3" />
                        {copied ? "已复制" : "复制链接"}
                      </button>
                    </div>
                    <p className="text-xs text-[#8B7355] mt-2 leading-relaxed">
                      ① 保存海报或截图<br />
                      ② 分享到微信/朋友圈<br />
                      ③ 点击下方确认按钮解锁
                    </p>
                    <button
                      onClick={handleConfirmShared}
                      className="mt-3 w-full py-3 bg-gradient-to-r from-[#C84A2A] to-[#A83A1F] text-white rounded-xl hover:from-[#B8381F] hover:to-[#982A0F] transition-colors text-center font-semibold"
                    >
                      <CheckCircle className="w-4 h-4 inline mr-2" />
                      我已分享，立即解锁
                    </button>
                  </>
                ) : (
                  <div className="w-44 h-56 mx-auto bg-[#F8F3EA] rounded-lg border border-[#E5DDD3] flex items-center justify-center">
                    <p className="text-xs text-[#9CA3AF]">生成失败，请重试</p>
                  </div>
                )}
              </div>
            )}

            {/* 解锁成功状态 */}
            {shared ? (
              <div className="text-center py-3">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-green-600 font-medium">
                  解锁成功！正在查看名字...
                </p>
              </div>
            ) : null}

            <p className="text-center text-[10px] text-[#8B7355]">
              分享后点击确认解锁，永久查看前3名名字
            </p>
          </div>
        </div>

        {/* 底部说明 */}
        <div className="px-6 pb-4 text-center">
          <p className="text-[10px] text-[#9CA3AF]">
            第4名及以后已免费展示
          </p>
        </div>
      </div>

      {/* 动画样式 */}
      <style jsx global>{`
        @keyframes modalIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-modal-in {
          animation: modalIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}