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
 * - 用户分享后调用 navigator.share（或复制链接兜底）
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

  // 分享文案
  const shareText = `AI 起名太香了！3 秒生成高分好名，免费领→ seekname.cn`;
  const shareTitle = `${siteName} - AI智能起名`;
  const shareUrl = "https://seekname.cn";

  // 获取分享海报（由前端 canvas 生成）
  const generatePoster = useCallback(async () => {
    setShowPoster(true);
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
        // 如果有 posterUrl 直接用，否则用 layout 数据在前端 canvas 渲染
        // 这里用 layout 数据在 canvas 上生成海报
        if (data.posterLayout && !data.posterUrl) {
          await renderPosterFromLayout(data.posterLayout);
        } else if (data.posterUrl) {
          setPosterUrl(data.posterUrl);
        }
      }
    } catch {
      // 失败时仍显示占位符
    }
  }, [siteName]);

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
      ctx.font = el.font;
      ctx.textAlign = el.align || "left";

      if (el.type === "divider") {
        ctx.strokeStyle = el.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(el.x, el.y);
        ctx.lineTo(el.x + el.width, el.y);
        ctx.stroke();
      } else if (el.type === "qrHint") {
        // 二维码区域（边框占位）
        ctx.strokeStyle = "#E5DDD3";
        ctx.lineWidth = 2;
        ctx.strokeRect(layout.width / 2 - 75, 380, 150, 150);
        // 内框虚线
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(layout.width / 2 - 65, 390, 130, 130);
        ctx.setLineDash([]);
        // 提示文字
        ctx.fillStyle = el.color;
        ctx.font = el.font;
        ctx.textAlign = "center";
        ctx.fillText("二维码区域（分享时自动填充）", layout.width / 2, 480);
      } else {
        // 普通文字
        ctx.fillText(el.text, el.x, el.y);
      }

      ctx.restore();
    }

    // 生成海报 URL
    const dataUrl = canvas.toDataURL("image/png");
    setPosterUrl(dataUrl);
  };

  // 执行分享
  const doShare = async () => {
    // 先生成海报
    await generatePoster();

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        // 分享成功后自动解锁
        onShareSuccess();
      } catch (err) {
        if ((err as any)?.name !== "AbortError") {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareTitle}：${shareUrl}`);
      setCopied(true);
      setTimeout(() => {
        onShareSuccess();
      }, 1500);
    } catch {
      // 兜底：直接解锁
      onShareSuccess();
    }
  };

  const onShareSuccess = () => {
    setShared(true);
    setTimeout(() => {
      onUnlock();
      onClose();
    }, 1500);
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
            <span className="text-xs text-[#9CA3AF]">或</span>
            <div className="flex-1 h-px bg-[#E5DDD3]" />
          </div>

          {/* 方式二：分享解锁 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[#2C1810] text-center">
              <Share2 className="w-4 h-4 inline mr-1" />
              分享免费解锁
            </h3>

            {/* 海报区域 */}
            {showPoster && (
              <div className="text-center mb-3">
                {posterUrl ? (
                  <>
                    <img
                      src={posterUrl}
                      alt="分享海报"
                      className="w-36 mx-auto rounded-lg border border-[#E5DDD3] shadow-sm"
                    />
                    <button
                      onClick={handleDownloadPoster}
                      className="mt-1 inline-flex items-center gap-1 text-xs text-[#C84A2A] hover:underline"
                    >
                      <Download className="w-3 h-3" />
                      保存海报
                    </button>
                  </>
                ) : (
                  <div className="w-36 h-48 mx-auto bg-[#F8F3EA] rounded-lg border border-[#E5DDD3] flex items-center justify-center">
                    <p className="text-xs text-[#9CA3AF]">加载中...</p>
                  </div>
                )}
              </div>
            )}

            {/* 分享/复制按钮 */}
            {shared || copied ? (
              <div className="text-center py-3">
                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-green-600 font-medium">
                  解锁成功！正在查看名字...
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={doShare}
                  className="w-full py-3 bg-gradient-to-r from-[#C9A84C] to-[#A68A3C] text-white rounded-xl hover:from-[#B8983C] hover:to-[#967A2C] transition-colors text-center font-semibold"
                >
                  <Share2 className="w-4 h-4 inline mr-2" />
                  分享到微信 / 朋友圈
                </button>
                <button
                  onClick={handleCopyLink}
                  className="w-full py-2 border border-[#E5DDD3] text-[#5C4A42] rounded-xl hover:bg-[#F8F3EA] transition-colors text-center text-sm"
                >
                  <Copy className="w-3.5 h-3.5 inline mr-1.5" />
                  复制链接（自动解锁）
                </button>
              </div>
            )}

            <p className="text-center text-[10px] text-[#8B7355]">
              分享后自动解锁，永久查看前3名名字
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