/**
 * 博客写文章页
 * 支持 Markdown 编辑 + 实时预览 + 发布
 *
 * 路由: /blog/write
 * 要求: 已登录
 */

"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Eye, Edit3, Upload, Tag, X, Loader2,
  AlertCircle, CheckCircle, Image as ImageIcon
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocale } from "@/contexts/LocaleContext";

type EditMode = "write" | "preview";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

function TagInput({ tags, onChange }: TagInputProps) {
  const [input, setInput] = useState("");

  const addTag = (val: string) => {
    const trimmed = val.trim();
    if (trimmed && !tags.includes(trimmed) && tags.length < 5) {
      onChange([...tags, trimmed]);
      setInput("");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2 min-h-[32px]">
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-sm border border-amber-200"
          >
            <Tag className="w-3 h-3" />
            {t}
            <button
              onClick={() => onChange(tags.filter((x) => x !== t))}
              className="hover:text-amber-900"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag(input);
          }
        }}
        placeholder="输入标签后回车（最多5个）"
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-amber-400"
        disabled={tags.length >= 5}
      />
    </div>
  );
}

// 简易 Markdown 渲染（避免引入完整 remark/rehype）
function renderMarkdown(md: string): string {
  if (!md) return "";
  return md
    // 标题
    .replace(/^### (.+)$/gm, "<h3 class='text-lg font-semibold text-gray-800 mt-4 mb-2'>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2 class='text-xl font-semibold text-gray-800 mt-6 mb-2'>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1 class='text-2xl font-bold text-gray-900 mt-6 mb-3'>$1</h1>")
    // 粗体/斜体
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // 引用块
    .replace(/^> (.+)$/gm, "<blockquote class='border-l-4 border-amber-300 pl-4 py-1 my-3 text-gray-600 italic bg-amber-50'>$1</blockquote>")
    // 代码块
    .replace(/```(\w*)\n([\s\S]*?)```/g, "<pre class='bg-gray-900 text-gray-100 rounded-lg p-4 my-3 overflow-x-auto text-sm'><code>$2</code></pre>")
    // 行内代码
    .replace(/`(.+?)`/g, "<code class='bg-gray-100 text-red-600 px-1.5 py-0.5 rounded text-sm'>$1</code>")
    // 列表
    .replace(/^- (.+)$/gm, "<li class='ml-4 list-disc text-gray-700'>$1</li>")
    .replace(/^(\d+)\. (.+)$/gm, "<li class='ml-4 list-decimal text-gray-700'>$2</li>")
    // 链接
    .replace(/\[(.+?)\]\((.+?)\)/g, "<a href='$2' class='text-amber-600 hover:underline' target='_blank'>$1</a>")
    // 图片
    .replace(/!\[(.+?)\]\((.+?)\)/g, "<img src='$2' alt='$1' class='max-w-full rounded-lg my-3' />")
    // 段落（空行分隔的内容块）
    .split(/\n\n+/)
    .map((block) => {
      if (block.startsWith("<")) return block;
      return `<p class='text-gray-700 leading-relaxed mb-3'>${block.replace(/\n/g, "<br/>")}</p>`;
    })
    .join("\n");
}

export default function BlogWritePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLocale();

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [coverImage, setCoverImage] = useState("");
  const [mode, setMode] = useState<EditMode>("write");
  const [publishing, setPublishing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 未登录引导
  if (!user) {
    return (
      <div className="min-h-screen bg-[#FDFAF4] flex flex-col items-center justify-center">
        <AlertCircle className="w-12 h-12 text-amber-400 mb-4" />
        <h2 className="text-xl font-bold text-[#2C1810] mb-2">请先登录</h2>
        <p className="text-[#5C4A42] mb-6">登录后即可开始撰写文章</p>
        <div className="flex gap-3">
          <Link href="/login?redirect=/blog/write" className="px-6 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700">
            登录
          </Link>
          <Link href="/blog" className="px-6 py-2.5 border border-[#E5DDD3] text-[#5C4A42] rounded-lg hover:bg-[#F8F3EA]">
            返回博客
          </Link>
        </div>
      </div>
    );
  }

  const handleCoverUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setError("图片大小不能超过 5MB");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload/image", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        setCoverImage(data.url);
      } else {
        setError(data.error || "上传失败");
      }
    } catch {
      setError("上传失败，请重试");
    } finally {
      setUploading(false);
    }
  };

  const handlePublish = async () => {
    if (!title.trim()) { setError("请输入文章标题"); return; }
    if (!content.trim()) { setError("请输入文章内容"); return; }

    setPublishing(true);
    setError(null);
    try {
      const res = await fetch("/api/blog/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          summary: summary.trim() || content.slice(0, 200),
          content: content.trim(),
          tags,
          cover_image: coverImage || undefined,
          author_id: user.id,
          author_name: user.name || user.email || "匿名",
        }),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        setSuccess(true);
        setTimeout(() => router.push(`/blog/${data.id}`), 1500);
      } else {
        setError(data.error || data.message || "发布失败");
      }
    } catch {
      setError("网络错误，请重试");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFAF4]">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-white border-b border-[#E5DDD3]">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/blog" className="flex items-center gap-2 text-[#5C4A42] hover:text-[#C84A2A] transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">返回博客</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setMode("write")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                  mode === "write" ? "bg-amber-600 text-white" : "bg-white text-gray-500 hover:text-gray-700"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                写作
              </button>
              <button
                onClick={() => setMode("preview")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                  mode === "preview" ? "bg-amber-600 text-white" : "bg-white text-gray-500 hover:text-gray-700"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                预览
              </button>
            </div>
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="px-4 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              {publishing ? "发布中..." : "发布文章"}
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* 错误/成功提示 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm text-green-700">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            发布成功！正在跳转到文章页...
          </div>
        )}

        <div className="space-y-6">
          {/* 封面图 */}
          <div>
            <div className="text-xs font-medium text-gray-500 mb-2">封面图（可选）</div>
            {coverImage ? (
              <div className="relative max-w-xs">
                <img src={coverImage} alt="封面" className="w-full h-40 object-cover rounded-lg" />
                <button
                  onClick={() => setCoverImage("")}
                  className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full max-w-xs h-40 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-amber-300 hover:text-amber-500 transition-colors"
              >
                {uploading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <ImageIcon className="w-6 h-6" />
                    <span className="text-xs">点击上传封面图</span>
                  </>
                )}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleCoverUpload(file);
                e.target.value = "";
              }}
            />
          </div>

          {/* 标题 */}
          <div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入文章标题..."
              className="w-full text-3xl font-bold text-[#2C1810] placeholder-gray-300 outline-none bg-transparent"
              style={{ fontFamily: "'Noto Serif SC', serif" }}
            />
          </div>

          {/* 摘要 */}
          <div>
            <input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="简短摘要（选填，将显示在文章列表）"
              className="w-full text-sm text-[#5C4A42] placeholder-gray-300 outline-none bg-transparent"
            />
          </div>

          <div className="border-t border-[#E5DDD3]" />

          {/* 标签 */}
          <div>
            <div className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
              <Tag className="w-3 h-3" />
              文章标签
            </div>
            <TagInput tags={tags} onChange={setTags} />
          </div>

          <div className="border-t border-[#E5DDD3]" />

          {/* 编辑/预览切换 */}
          {mode === "write" ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`# 文章标题\n\n在此输入内容...\n\n## 小节标题\n\n正文内容，支持 **粗体**、*斜体*、\`行内代码\`\n\n> 引用块\n\n- 列表项\n\n\`\`\`\n代码块\n\`\`\``}
              className="w-full min-h-[500px] text-gray-700 text-sm leading-relaxed outline-none resize-none bg-transparent font-mono"
              spellCheck={false}
            />
          ) : (
            <div
              className="min-h-[500px] prose prose-amber max-w-none"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
            />
          )}

          {/* Markdown 提示 */}
          {mode === "write" && (
            <div className="text-xs text-gray-400 flex flex-wrap gap-4">
              <span>**粗体**</span>
              <span>*斜体*</span>
              <span>`代码`</span>
              <span>## 标题</span>
              <span>## 引用</span>
              <span>- 列表</span>
              <span>![](图片链接)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
