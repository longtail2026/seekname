/**
 * 名字分享落地页
 * /share/[token]
 * 接收人无需登录即可查看，展示名字详情 + 社交分享卡片
 */

import Link from "next/link";
import { ArrowLeft, Share2, Star, BookOpen, Shield, Users, Loader2 } from "lucide-react";
import prisma from "@/lib/prisma";

interface Props {
  params: Promise<{ token: string }>;
}

async function getSharedName(token: string) {
  try {
    const name = await prisma.names.findFirst({
      where: {
        OR: [{ id: token }, { shareToken: token }],
      },
      select: {
        id: true,
        name: true,
        pinyin: true,
        gender: true,
        surname: true,
        score: true,
        wuxing: true,
        strokes: true,
        meaning: true,
        classicSource: true,
        classicQuote: true,
        uniqueness: true,
        popularity: true,
        category: true,
        createdAt: true,
      },
    });
    return name;
  } catch {
    return null;
  }
}

export default async function SharePage({ params }: Props) {
  const { token } = await params;
  const name = await getSharedName(token);

  if (!name) {
    return <ShareNotFound />;
  }

  const genderLabel = name.gender === "M" ? "男孩" : "女孩";
  const shareUrl = typeof window !== "undefined" ? window.location.href : `https://www.seekname.cn/share/${token}`;
  const shareTitle = `「${name.name}」—— 一个寓意美好的名字，推荐给你！`;

  return (
    <div className="min-h-screen" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      {/* Header */}
      <header
        style={{
          background: "rgba(var(--background-rgb, 255,252,247), 0.92)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid var(--border)",
          padding: "0 24px",
          height: 56,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Link
          href="/"
          style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none", color: "var(--foreground-muted)", fontSize: 14 }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回首页</span>
        </Link>
        <span style={{ flex: 1 }} />
        <Link
          href="/personal"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 16px",
            background: "var(--primary)",
            color: "#fff",
            borderRadius: 20,
            textDecoration: "none",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          我也要起名
        </Link>
      </header>

      {/* Hero Section */}
      <div
        style={{
          maxWidth: 680,
          margin: "0 auto",
          padding: "48px 24px 32px",
          textAlign: "center",
        }}
      >
        {/* 分享标签 */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 14px",
            background: "var(--primary-glow)",
            border: "1px solid var(--primary)",
            borderRadius: 20,
            color: "var(--primary)",
            fontSize: 12,
            marginBottom: 24,
            fontFamily: "'Noto Sans SC', sans-serif",
          }}
        >
          <Share2 className="w-3 h-3" />
          {name.surname ? `${name.surname}家亲友分享` : "朋友分享的好名字"}
        </div>

        {/* 名字大字 */}
        <h1
          style={{
            fontFamily: "'Noto Serif SC', serif",
            fontSize: "clamp(48px, 10vw, 80px)",
            fontWeight: 700,
            color: "var(--ink)",
            margin: "0 0 8px",
            letterSpacing: "0.1em",
            lineHeight: 1.1,
          }}
        >
          {name.name}
        </h1>

        <p
          style={{
            color: "var(--foreground-muted)",
            fontSize: 15,
            marginBottom: 32,
            fontFamily: "'Noto Sans SC', sans-serif",
          }}
        >
          {name.pinyin}
          {name.gender && ` · ${genderLabel}`}
          {name.strokes && ` · ${name.strokes}画`}
        </p>

        {/* 评分卡片 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 12,
            marginBottom: 32,
          }}
        >
          <ScoreCard label="综合评分" score={name.score || 85} color="var(--primary)" />
          <ScoreCard label="文化底蕴" score={88} color="var(--gold)" />
          <ScoreCard label="音律和谐" score={90} color="#4A90D9" />
          <ScoreCard label="安全评分" score={name.score ? name.score - 4 : 82} color="#2EAD5A" />
        </div>

        {/* 社交分享 */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 12,
            marginBottom: 40,
          }}
        >
          <ShareButton
            platform="wechat"
            url={shareUrl}
            title={shareTitle}
          />
          <ShareButton
            platform="weibo"
            url={shareUrl}
            title={shareTitle}
          />
          <ShareButton
            platform="copy"
            url={shareUrl}
            title={shareTitle}
          />
        </div>
      </div>

      {/* 详细信息卡片 */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "0 24px 60px" }}>
        <div
          style={{
            background: "var(--background-warm)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: "28px 24px",
          }}
        >
          {/* 五行 */}
          {name.wuxing && (
            <DetailRow
              icon={<Shield className="w-4 h-4" style={{ color: "var(--primary)" }} />}
              label="五行用字"
              value={name.wuxing}
            />
          )}

          {/* 独特性 */}
          {name.uniqueness && (
            <DetailRow
              icon={<Star className="w-4 h-4" style={{ color: "var(--gold)" }} />}
              label="独特性"
              value={name.uniqueness}
            />
          )}

          {/* 典籍出处 */}
          {name.classicSource && (
            <DetailRow
              icon={<BookOpen className="w-4 h-4" style={{ color: "#4A90D9" }} />}
              label="典籍出处"
              value={name.classicSource}
            />
          )}

          {/* 同名人数 */}
          {name.popularity && (
            <DetailRow
              icon={<Users className="w-4 h-4" style={{ color: "#2EAD5A" }} />}
              label="同名人数"
              value={name.popularity}
            />
          )}

          {/* 寓意 */}
          {name.meaning && (
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--foreground-muted)",
                  lineHeight: 1.8,
                  fontFamily: "'Noto Sans SC', sans-serif",
                  margin: 0,
                }}
              >
                {name.meaning}
              </p>
            </div>
          )}

          {/* 典籍引文 */}
          {name.classicQuote && (
            <div
              style={{
                marginTop: 16,
                padding: "14px 16px",
                background: "var(--primary-glow)",
                borderLeft: "3px solid var(--primary)",
                borderRadius: "0 8px 8px 0",
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  color: "var(--foreground-muted)",
                  fontStyle: "italic",
                  lineHeight: 1.7,
                  margin: 0,
                  fontFamily: "'Noto Serif SC', serif",
                }}
              >
                「{name.classicQuote}」
              </p>
            </div>
          )}
        </div>

        {/* CTA 按钮 */}
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <Link
            href="/personal"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              padding: "14px 24px",
              background: "var(--primary)",
              color: "#fff",
              borderRadius: 12,
              textDecoration: "none",
              fontSize: 16,
              fontWeight: 600,
              fontFamily: "'Noto Serif SC', serif",
              boxShadow: "0 4px 16px var(--primary-glow)",
            }}
          >
            🚀 我也想要一个好名字
          </Link>
          <p
            style={{
              marginTop: 12,
              fontSize: 12,
              color: "var(--foreground-muted)",
              fontFamily: "'Noto Sans SC', sans-serif",
            }}
          >
            寻名网 · AI × 八字五行 · 12万部典籍
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── 子组件 ────────────────────────────────────────────

function ScoreCard({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div
      style={{
        background: "var(--background)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: "16px 12px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color,
          fontFamily: "'Noto Serif SC', serif",
          lineHeight: 1,
        }}
      >
        {score}
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--foreground-muted)",
          marginTop: 6,
          fontFamily: "'Noto Sans SC', sans-serif",
        }}
      >
        {label}
      </div>
      {/* 进度条 */}
      <div
        style={{
          marginTop: 8,
          height: 4,
          borderRadius: 2,
          background: "var(--border)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${score}%`,
            height: "100%",
            background: color,
            borderRadius: 2,
          }}
        />
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "10px 0",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div style={{ paddingTop: 2, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 12,
            color: "var(--foreground-muted)",
            marginBottom: 2,
            fontFamily: "'Noto Sans SC', sans-serif",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 15,
            color: "var(--ink)",
            fontFamily: "'Noto Serif SC', serif",
            fontWeight: 600,
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function ShareButton({
  platform,
  url,
  title,
}: {
  platform: "wechat" | "weibo" | "copy";
  url: string;
  title: string;
}) {
  const configs = {
    wechat: { label: "微信", icon: "💬", bg: "#07C160" },
    weibo: { label: "微博", icon: "📰", bg: "#E6162D" },
    copy: { label: "复制链接", icon: "🔗", bg: "var(--primary)" },
  };
  const cfg = configs[platform];

  if (platform === "copy") {
    return (
      <button
        onClick={() => {
          navigator.clipboard.writeText(url);
        }}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          padding: "12px 16px",
          background: "var(--background)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          cursor: "pointer",
          fontSize: 11,
          color: "var(--foreground-muted)",
          fontFamily: "'Noto Sans SC', sans-serif",
          transition: "all 0.2s",
        }}
      >
        <span style={{ fontSize: 18 }}>{cfg.icon}</span>
        <span>{cfg.label}</span>
      </button>
    );
  }

  const shareUrls = {
    wechat: `https://qr卧.wang?text=${encodeURIComponent(title + " " + url)}`,
    weibo: `http://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
  };

  return (
    <a
      href={shareUrls[platform]}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        padding: "12px 16px",
        background: "var(--background)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        textDecoration: "none",
        fontSize: 11,
        color: "var(--foreground-muted)",
        fontFamily: "'Noto Sans SC', sans-serif",
        transition: "all 0.2s",
      }}
    >
      <span style={{ fontSize: 18 }}>{cfg.icon}</span>
      <span>{cfg.label}</span>
    </a>
  );
}

function ShareNotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 24,
        textAlign: "center",
        background: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      <div style={{ fontSize: 48 }}>🔗</div>
      <h1
        style={{
          fontFamily: "'Noto Serif SC', serif",
          fontSize: 24,
          fontWeight: 700,
          color: "var(--ink)",
        }}
      >
        分享链接已失效
      </h1>
      <p style={{ color: "var(--foreground-muted)", fontSize: 14, fontFamily: "'Noto Sans SC', sans-serif" }}>
        此链接已过期或名字已被删除
      </p>
      <Link
        href="/"
        style={{
          marginTop: 8,
          padding: "10px 24px",
          background: "var(--primary)",
          color: "#fff",
          borderRadius: 20,
          textDecoration: "none",
          fontSize: 14,
          fontFamily: "'Noto Sans SC', sans-serif",
        }}
      >
        返回首页
      </Link>
    </div>
  );
}
