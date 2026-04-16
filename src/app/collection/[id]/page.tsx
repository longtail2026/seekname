"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { jsPDF } from "jspdf";
import { useLocale } from "@/contexts/LocaleContext";

interface NameAnalysis {
  wuxing?: {
    score?: number;
    likes?: string[];
    avoid?: string[];
    interpretation?: string;
  };
  phonetic?: {
    score?: number;
    details?: string[];
  };
  uniqueness?: {
    riskLevel?: string;
    count?: number;
    note?: string;
  };
  classic?: {
    score?: number;
    source?: string;
    poem?: string;
  };
}

interface NameFavorite {
  id: string;
  surname: string;
  fullName: string;
  gender: string;
  score: number | null;
  analysis: NameAnalysis | null;
  wuxing: string[];
  source: string | null;
  note: string | null;
  createdAt: string;
}

// 五行颜色
const WUXING_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  金: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" },
  木: { bg: "bg-green-100",  text: "text-green-800",  border: "border-green-300"  },
  水: { bg: "bg-blue-100",   text: "text-blue-800",   border: "border-blue-300"   },
  火: { bg: "bg-red-100",    text: "text-red-800",    border: "border-red-300"    },
  土: { bg: "bg-amber-100",  text: "text-amber-800",  border: "border-amber-300"  },
};

function WuxingBadge({ name }: { name: string }) {
  const color = WUXING_COLORS[name] || { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-300" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${color.bg} ${color.text} ${color.border}`}>
      {name}
    </span>
  );
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const pct = Math.round(score);
  const color = pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span className="font-medium text-gray-700">{pct}/100</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLocale();
  const router = useRouter();
  const [item, setItem] = useState<NameFavorite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchItem = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/names/favorites/${id}`);
      if (!res.ok) throw new Error("加载失败");
      const data = await res.json();
      setItem(data.item || data);
      setNoteText((data.item || data).note || "");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetchItem();
  }, [id, fetchItem]);

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      const res = await fetch(`/api/names/favorites/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: noteText }),
      });
      if (res.ok) {
        setItem((prev) => prev ? { ...prev, note: noteText } : prev);
        setEditingNote(false);
      }
    } finally {
      setSavingNote(false);
    }
  };

  const handleExportPdf = async () => {
    if (!item) return;
    setExporting(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();

      // 封面
      doc.setFillColor(245, 232, 200);
      doc.rect(0, 0, pageW, 297, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.text(item.fullName, pageW / 2, 70, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(t("collection.detail.title"), pageW / 2, 82, { align: "center" });

      // 评分
      if (item.score !== null) {
        doc.setFontSize(14);
        doc.setTextColor(200, 148, 26);
        doc.text(`${t("collection.detail.overallScore")}：${item.score}/100`, pageW / 2, 98, { align: "center" });
      }

      // 五行
      if (item.wuxing?.length > 0) {
        doc.setFontSize(10);
        doc.setTextColor(80);
        doc.text(`${t("collection.detail.favorableElements")}：${item.wuxing.join(" / ")}`, pageW / 2, 110, { align: "center" });
      }

      // 分析详情
      doc.setFontSize(10);
      doc.setTextColor(60);
      let y = 130;
      const analysis = item.analysis as NameAnalysis | null;

      if (analysis?.phonetic) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30);
        doc.text(`${t("collection.detail.phoneticAnalysis")}：${analysis.phonetic.score || "-"}分`, 20, y);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80);
        if (analysis.phonetic.details?.length) {
          y += 6;
          doc.text(analysis.phonetic.details.join("；"), 20, y, { maxWidth: pageW - 40 });
        }
        y += 12;
      }

      if (analysis?.classic) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30);
        doc.text(t("collection.detail.classicAnalysis"), 20, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80);
        if (analysis.classic.source) {
          doc.text(`${t("collection.detail.source")}：${analysis.classic.source}`, 20, y);
          y += 5;
        }
        if (analysis.classic.poem) {
          const poemLines = analysis.classic.poem.split("\n");
          for (const line of poemLines) {
            doc.text(line, 20, y);
            y += 5;
          }
        }
        y += 6;
      }

      if (analysis?.uniqueness) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30);
        doc.text(`${t("collection.detail.uniquenessRisk")}：${analysis.uniqueness.riskLevel || "-"}`, 20, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80);
        if (analysis.uniqueness.note) {
          doc.text(analysis.uniqueness.note, 20, y, { maxWidth: pageW - 40 });
        }
        y += 10;
      }

      // 备注
      if (item.note) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30);
        doc.text(t("collection.editNote") || "备注", 20, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80);
        doc.text(item.note, 20, y, { maxWidth: pageW - 40 });
      }

      // 结尾
      doc.addPage();
      doc.setFillColor(245, 232, 200);
      doc.rect(0, 0, pageW, 297, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(30);
      doc.text(item.fullName, pageW / 2, 130, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(t("collection.back"), pageW / 2, 145, { align: "center" });
      doc.text(`seekname.cn · ${new Date().toLocaleDateString()}`, pageW / 2, 160, { align: "center" });

      doc.save(`seekname-${item.fullName}-${Date.now()}.pdf`);
    } catch (e) {
      console.error("[PDF Export]", e);
      alert("导出失败，请重试");
    } finally {
      setExporting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center">
      <div className="text-gray-400">{t("common.loading")}</div>
    </div>
  );

  if (error || !item) return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex flex-col items-center justify-center">
      <p className="text-red-500 mb-4">{error || "未找到该收藏"}</p>
      <Link href="/collection" className="px-4 py-2 bg-amber-600 text-white rounded-lg">
        {t("collection.back")}
      </Link>
    </div>
  );

  const analysis = item.analysis as NameAnalysis | null;
  const likes = analysis?.wuxing?.likes || item.wuxing || [];
  const avoid = analysis?.wuxing?.avoid || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* 顶部导航 */}
      <div className="bg-white border-b border-amber-100 sticky top-[60px] z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/collection"
              className="flex items-center gap-1.5 text-amber-700 hover:text-amber-800 text-sm font-medium"
            >
              <span>←</span>
              <span>{t("collection.back")}</span>
            </Link>
            <span className="text-gray-300">|</span>
            <span className="text-gray-400 text-sm">{t("collection.detail.title")}</span>
          </div>
          <button
            onClick={handleExportPdf}
            disabled={exporting}
            className="px-4 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            {exporting ? t("collection.exporting") : t("collection.detail.exportPdf")}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 名字头 */}
        <div className="text-center mb-8">
          <div className="text-5xl font-bold text-gray-900 mb-2">{item.fullName}</div>
          <div className="text-gray-400 text-sm">
            {t("collection.detail.gender")}：
            {item.gender === "M" ? t("collection.detail.male") : t("collection.detail.female")}
            {" · "}
            {t("collection.detail.savedAt")} {new Date(item.createdAt).toLocaleDateString()}
          </div>
        </div>

        {/* 综合评分 */}
        {item.score !== null && (
          <div className="bg-white rounded-xl border border-amber-100 p-6 mb-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-800 mb-4">
              {t("collection.detail.overallScore")}
            </h2>
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center">
                <span className={`text-4xl font-bold ${item.score >= 80 ? "text-green-600" : item.score >= 60 ? "text-amber-600" : "text-red-500"}`}>
                  {item.score}
                </span>
                <span className="text-xs text-gray-400 mt-1">/ 100</span>
              </div>
              <div className="flex-1">
                <ScoreBar score={item.score} label={t("collection.detail.overallScore")} />
                {analysis?.phonetic?.score !== undefined && (
                  <ScoreBar score={analysis.phonetic.score} label={t("collection.detail.phoneticScore")} />
                )}
                {analysis?.classic?.score !== undefined && (
                  <ScoreBar score={analysis.classic.score} label={t("collection.detail.classicScore")} />
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 五行分析 */}
          <div className="bg-white rounded-xl border border-amber-100 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-800 mb-4">
              {t("collection.detail.wuxingAnalysis")}
            </h2>
            {likes.length > 0 && (
              <div className="mb-3">
                <div className="text-xs text-gray-500 mb-2">{t("collection.detail.favorableElements")}</div>
                <div className="flex flex-wrap gap-2">
                  {likes.map((wx) => <WuxingBadge key={wx} name={wx} />)}
                </div>
              </div>
            )}
            {avoid.length > 0 && (
              <div className="mb-3">
                <div className="text-xs text-gray-500 mb-2">{t("collection.detail.avoidElements")}</div>
                <div className="flex flex-wrap gap-2">
                  {avoid.map((wx) => (
                    <span key={wx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 line-through">
                      {wx}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {analysis?.wuxing?.interpretation && (
              <p className="text-sm text-gray-600 mt-3 leading-relaxed">{analysis.wuxing.interpretation}</p>
            )}
          </div>

          {/* 音韵分析 */}
          <div className="bg-white rounded-xl border border-amber-100 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-800 mb-4">
              {t("collection.detail.phoneticAnalysis")}
            </h2>
            {analysis?.phonetic?.score !== undefined && (
              <div className="mb-3">
                <span className="text-2xl font-bold text-amber-700">{analysis.phonetic.score}</span>
                <span className="text-sm text-gray-400"> / 100</span>
              </div>
            )}
            {analysis?.phonetic?.details && analysis.phonetic.details.length > 0 && (
              <ul className="text-sm text-gray-600 space-y-1">
                {analysis.phonetic.details.map((d, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-400 mt-0.5">✓</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            )}
            {!analysis?.phonetic && (
              <p className="text-sm text-gray-400">{t("common.loading")}</p>
            )}
          </div>

          {/* 重名分析 */}
          <div className="bg-white rounded-xl border border-amber-100 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-800 mb-4">
              {t("collection.detail.uniquenessAnalysis")}
            </h2>
            {analysis?.uniqueness?.riskLevel && (
              <div className="mb-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  analysis.uniqueness.riskLevel === "low" ? "bg-green-100 text-green-800" :
                  analysis.uniqueness.riskLevel === "medium" ? "bg-amber-100 text-amber-800" :
                  "bg-red-100 text-red-800"
                }`}>
                  {analysis.uniqueness.riskLevel === "low" ? t("collection.detail.lowRisk") :
                   analysis.uniqueness.riskLevel === "medium" ? t("collection.detail.mediumRisk") :
                   t("collection.detail.highRisk")}
                </span>
              </div>
            )}
            {analysis?.uniqueness?.count !== undefined && (
              <p className="text-sm text-gray-500">
                同名人数约 {analysis.uniqueness.count.toLocaleString()} 人
              </p>
            )}
            {analysis?.uniqueness?.note && (
              <p className="text-sm text-gray-600 mt-2">{analysis.uniqueness.note}</p>
            )}
          </div>

          {/* 典籍出处 */}
          <div className="bg-white rounded-xl border border-amber-100 p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-800 mb-4">
              {t("collection.detail.classicAnalysis")}
            </h2>
            {analysis?.classic?.source && (
              <div className="mb-2">
                <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                  {t("collection.detail.source")}
                </span>
                <span className="ml-2 text-sm text-gray-700 font-medium">{analysis.classic.source}</span>
              </div>
            )}
            {analysis?.classic?.poem && (
              <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line font-serif italic">
                  {analysis.classic.poem}
                </p>
              </div>
            )}
            {!analysis?.classic && (
              <p className="text-sm text-gray-400">{t("common.loading")}</p>
            )}
          </div>
        </div>

        {/* 备注编辑 */}
        <div className="mt-6 bg-white rounded-xl border border-amber-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-800">
              {t("collection.editNote")}
            </h2>
            {!editingNote && (
              <button
                onClick={() => setEditingNote(true)}
                className="text-sm text-amber-600 hover:text-amber-700"
              >
                {t("common.edit")}
              </button>
            )}
          </div>
          {editingNote ? (
            <div>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder={t("collection.notePlaceholder")}
                rows={3}
                className="w-full p-3 border border-amber-200 rounded-lg text-sm resize-none outline-none focus:border-amber-400"
              />
              <div className="flex gap-2 mt-2 justify-end">
                <button
                  onClick={() => { setEditingNote(false); setNoteText(item.note || ""); }}
                  className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleSaveNote}
                  disabled={savingNote}
                  className="px-4 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                >
                  {savingNote ? t("common.loading") : t("collection.saveNote")}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">
              {item.note || t("collection.noNote")}
            </p>
          )}
        </div>

        {/* 操作区 */}
        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={handleExportPdf}
            disabled={exporting}
            className="px-6 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {exporting ? t("collection.exporting") : t("collection.exportSingle")}
          </button>
          <Link
            href={`/naming?regenerate=${encodeURIComponent(item.fullName)}`}
            className="px-6 py-2.5 border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors"
          >
            {t("collection.detail.regenerate")}
          </Link>
        </div>
      </div>
    </div>
  );
}
