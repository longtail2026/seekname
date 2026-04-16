"use client";

import { useState, useEffect, useCallback } from "react";

interface AlipayQRCodeProps {
  orderNo: string;
  qrCode: string;
  amount: number;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * 支付宝当面付二维码组件
 * 显示支付二维码并轮询支付结果
 */
export default function AlipayQRCode({
  orderNo,
  qrCode,
  amount,
  onSuccess,
  onError,
}: AlipayQRCodeProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [status, setStatus] = useState<"loading" | "ready" | "paid" | "expired" | "error">("loading");
  const [timeLeft, setTimeLeft] = useState(600); // 10分钟倒计时

  // 生成二维码 URL
  useEffect(() => {
    if (!qrCode) {
      // 模拟模式：生成占位二维码
      setQrCodeUrl("");
      setStatus("ready");
      return;
    }

    setQrCodeUrl(qrCode);
    setStatus("ready");
  }, [qrCode]);

  // 轮询支付结果
  const checkPaymentStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/alipay/query?orderNo=${orderNo}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();

      if (data.success && data.order?.payStatus === "paid") {
        setStatus("paid");
        onSuccess?.();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [orderNo, onSuccess]);

  // 轮询检查支付结果
  useEffect(() => {
    if (status !== "ready") return;

    const interval = setInterval(async () => {
      const isPaid = await checkPaymentStatus();
      if (isPaid) {
        clearInterval(interval);
      }
    }, 3000); // 每 3 秒检查一次

    return () => clearInterval(interval);
  }, [status, checkPaymentStatus]);

  // 倒计时
  useEffect(() => {
    if (status !== "ready") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setStatus("expired");
          clearInterval(timer);
          onError?.("二维码已过期，请刷新页面重新发起支付");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, onError]);

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // 刷新二维码
  const refreshQRCode = async () => {
    setStatus("loading");
    setTimeLeft(600);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch("/api/alipay/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tier: parseInt(orderNo.match(/^ALI(\d)/)?.[1] || "1"),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setQrCodeUrl(data.qrCode);
        setStatus("ready");
      } else {
        setStatus("error");
        onError?.(data.error || "刷新失败");
      }
    } catch {
      setStatus("error");
      onError?.("网络错误");
    }
  };

  if (status === "paid") {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: "#52c41a", marginBottom: 8 }}>
          支付成功！
        </div>
        <div style={{ fontSize: 14, color: "#666" }}>正在跳转...</div>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>⏰</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: "#fa8c16", marginBottom: 8 }}>
          二维码已过期
        </div>
        <button
          onClick={refreshQRCode}
          style={{
            marginTop: 16,
            padding: "10px 24px",
            background: "linear-gradient(135deg, #1677ff, #4096ff)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          重新获取二维码
        </button>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>❌</div>
        <div style={{ fontSize: 18, fontWeight: 600, color: "#f5222d", marginBottom: 8 }}>
          出错了
        </div>
        <button
          onClick={refreshQRCode}
          style={{
            marginTop: 16,
            padding: "10px 24px",
            background: "#1677ff",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center" }}>
      {/* 金额 */}
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 14, color: "#666" }}>支付金额</span>
        <div style={{ fontSize: 28, fontWeight: 700, color: "#1677ff" }}>
          ¥{amount.toFixed(2)}
        </div>
      </div>

      {/* 二维码 */}
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 20,
          display: "inline-block",
          marginBottom: 16,
        }}
      >
        {qrCodeUrl ? (
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUrl)}`}
            alt="支付宝二维码"
            width={200}
            height={200}
            style={{ display: "block" }}
          />
        ) : (
          // 模拟模式：显示示例二维码
          <div
            style={{
              width: 200,
              height: 200,
              background: "linear-gradient(135deg, #1677ff 0%, #4096ff 100%)",
              borderRadius: 8,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 8 }}>🐱</div>
            <div style={{ fontSize: 14 }}>模拟支付</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>（测试模式）</div>
          </div>
        )}
      </div>

      {/* 提示 */}
      <div
        style={{
          fontSize: 14,
          color: "#666",
          marginBottom: 16,
          fontFamily: "'Noto Sans SC', sans-serif",
        }}
      >
        <div style={{ marginBottom: 4 }}>请使用支付宝扫一扫</div>
        <div style={{ color: "#999" }}>扫描下方二维码完成支付</div>
      </div>

      {/* 倒计时 */}
      <div
        style={{
          fontSize: 13,
          color: timeLeft < 60 ? "#f5222d" : "#999",
          fontFamily: "'Noto Sans SC', sans-serif",
        }}
      >
        二维码有效期：{formatTime(timeLeft)}
      </div>

      {/* 模拟支付按钮（测试用） */}
      {!qrCodeUrl && (
        <button
          onClick={async () => {
            const token = localStorage.getItem("token");
            await fetch("/api/alipay/mock-complete", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ orderNo }),
            });
            setStatus("paid");
            onSuccess?.();
          }}
          style={{
            marginTop: 16,
            padding: "10px 24px",
            background: "linear-gradient(135deg, #1677ff, #4096ff)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          模拟支付成功（测试用）
        </button>
      )}
    </div>
  );
}
