"use client";

import { useState } from "react";

interface SubscribeButtonProps {
  className?: string;
  variant?: "primary" | "secondary";
}

export default function SubscribeButton({
  className = "",
  variant = "primary",
}: SubscribeButtonProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubscribe = async () => {
    if (!email || !email.includes("@")) {
      setStatus("error");
      setMessage("请输入有效的邮箱地址");
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (data.success) {
        setStatus("success");
        setMessage("订阅成功！请查收确认邮件");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "订阅失败");
      }
    } catch {
      setStatus("error");
      setMessage("网络错误，请稍后重试");
    }
  };

  if (status === "success") {
    return (
      <div className={`text-center ${className}`}>
        <div className="text-4xl mb-2">✨</div>
        <p className="text-green-600 font-medium">{message}</p>
      </div>
    );
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="输入邮箱订阅"
        className={`flex-1 px-4 py-2 rounded-lg border ${
          status === "error" ? "border-red-300" : "border-gray-200"
        } focus:outline-none focus:border-amber-400`}
        disabled={status === "loading"}
        onKeyDown={(e) => e.key === "Enter" && handleSubscribe()}
      />
      <button
        onClick={handleSubscribe}
        disabled={status === "loading"}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
          variant === "primary"
            ? "bg-amber-600 text-white hover:bg-amber-700"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
        } disabled:opacity-50`}
      >
        {status === "loading" ? "订阅中..." : "订阅"}
      </button>
      {status === "error" && (
        <p className="absolute -bottom-6 left-0 text-xs text-red-500">{message}</p>
      )}
    </div>
  );
}
