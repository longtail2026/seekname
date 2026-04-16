"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { jsPDF } from "jspdf";
import { useLocale } from "@/contexts/LocaleContext";
import { Scale } from "lucide-react";

interface NameFavorite {
  id: string;
  surname: string;
  fullName: string;
  gender: string;
  score: number | null;
  analysis: Record<string, unknown> | null;
  wuxing: string[];
  note: string | null;
  createdAt: string;
}

interface ApiResponse {
  items: NameFavorite[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// 简单五行颜色映射
const WUXING_COLORS: Record<string, string> = {
  金: "bg-yellow-100 text-yellow-800",
  木: "bg-green-100 text-green-800",
  水: "bg-blue-100 text-blue-800",
  火: "bg-red-100 text-red-800",
  土: "bg-amber-100 text-amber-800",
};

export default function CollectionPage() {
  const { t } = useLocale();
  const [items, setItems] = useState<NameFavorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/names/favorites?pageSize=100");
      if (res.status === 401) {
        // 未登录，跳转到登录页
        window.location.href = "/login?redirect=/collection";
        return;
      }
      if (!res.ok) throw new Error("加载失败");
      const data: ApiResponse = await res.json();
      setItems(data.items);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleDelete = async (id: string) => {
    if (!confirm("确定移除这个名字吗？")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/names/favorites?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.id !== id));
      }
    } finally {
      setDeleting(null);
    }
  };

  const exportPdf = async () => {
    if (items.length === 0) return;
    setExporting(true);

    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();

      // 封面
      doc.setFillColor(245, 232, 200); // 暖黄色背景
      doc.rect(0, 0, pageW, 297, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(28);
      doc.text("名字典藏本", pageW / 2, 60, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.text(t("collection.pdfTitle"), pageW / 2, 75, { align: "center" });

      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(
        `生成时间：${new Date().toLocaleString("zh-CN")}`,
        pageW / 2,
        90,
        { align: "center" }
      );

      doc.setTextColor(0);

      // 每条记录
      let y = 115;
      const LINE_H = 38;
      const MAX_PER_PAGE = 6;
      let countOnPage = 0;

      for (const item of items) {
        if (countOnPage >= MAX_PER_PAGE || y > 260) {
          doc.addPage();
          y = 20;
          countOnPage = 0;
        }

        // 卡片背景
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(15, y, pageW - 30, LINE_H - 4, 3, 3, "F");

        // 名字
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.setTextColor(30);
        doc.text(item.fullName, 22, y + 12);

        // 评分
        if (item.score !== null) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10);
          doc.setTextColor(80);
          doc.text(`评分 ${item.score}`, 22, y + 20);
        }

        // 五行标签
        let x = 60;
        for (const wx of (item.wuxing || []).slice(0, 3)) {
          const color = WUXING_COLORS[wx] ? wx : "金木水火土".includes(wx) ? wx : "金";
          doc.setFillColor(245, 245, 245);
          doc.roundedRect(x, y + 6, 10, 6, 1, 1, "F");
          doc.setFontSize(7);
          doc.setTextColor(100);
          doc.text(wx, x + 5, y + 10, { align: "center" });
          x += 14;
        }

        // 收藏时间
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `收藏于 ${new Date(item.createdAt).toLocaleDateString("zh-CN")}`,
          pageW - 22,
          y + LINE_H - 8,
          { align: "right" }
        );

        y += LINE_H;
        countOnPage++;
      }

      // 结尾页
      doc.addPage();
      doc.setFillColor(245, 232, 200);
      doc.rect(0, 0, pageW, 297, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(30);
      doc.text("共收藏 " + items.length + " 个名字", pageW / 2, 140, {
        align: "center",
      });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text("SeekName", pageW / 2, 155, {
        align: "center",
      });
      doc.text("seekname.cn", pageW / 2, 165, { align: "center" });

      doc.save(`seekname-collection-${Date.now()}.pdf`);
    } catch (e) {
      console.error("[PDF Export]", e);
      alert("导出失败，请重试");
    } finally {
      setExporting(false);
    }
  };

  // 选择模式切换
  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    setSelectedIds(new Set());
  };

  // 选择/取消选择名字
  const toggleSelect = (id: string, fullName: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else if (newSelected.size < 3) {
      newSelected.add(id);
    } else {
      alert("最多选择 3 个名字进行对比");
      return;
    }
    setSelectedIds(newSelected);
  };

  // 获取选中名字并跳转到对比页
  const goToCompare = () => {
    const selectedNames = items
      .filter((item) => selectedIds.has(item.id))
      .map((item) => item.fullName);

    if (selectedNames.length < 2) {
      alert("请至少选择 2 个名字");
      return;
    }

    const surname = selectedNames[0].slice(0, 1);
    const namesParam = selectedNames.join(",");
    window.location.href = `/compare?names=${namesParam}&surname=${surname}&from=collection`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* 头部 */}
      <div className="bg-white border-b border-amber-100">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{t("collection.title")}</h1>
              <p className="mt-2 text-gray-500">
                {loading ? "" : selectMode
                  ? `已选择 ${selectedIds.size}/3 个名字`
                  : t("collection.total", { count: items.length })
                }
              </p>
            </div>
            <div className="flex gap-3">
              {items.length >= 2 && (
                <button
                  onClick={toggleSelectMode}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
                    selectMode
                      ? "bg-amber-100 text-amber-700 border border-amber-300"
                      : "border border-amber-300 text-amber-700 hover:bg-amber-50"
                  }`}
                >
                  <Scale className="w-4 h-4" />
                  {selectMode ? "取消选择" : "名字 PK"}
                </button>
              )}
              <Link
                href="/naming"
                className="px-4 py-2 text-sm border border-amber-300 text-amber-700 rounded-lg hover:bg-amber-50 transition-colors"
              >
                {t("collection.goNaming")}
              </Link>
              <button
                onClick={exportPdf}
                disabled={items.length === 0 || exporting}
                className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {exporting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {t("collection.exporting")}
                  </>
                ) : (
                  <>{t("collection.exportPdf")}</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 对比操作栏 */}
      {selectMode && selectedIds.size >= 2 && (
        <div className="sticky top-0 z-10 bg-amber-600 text-white px-4 py-3 shadow-lg">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <span className="text-sm">
              已选择 {selectedIds.size} 个名字，可前往对比
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1.5 text-sm bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                重选
              </button>
              <button
                onClick={goToCompare}
                className="px-4 py-1.5 text-sm bg-white text-amber-700 font-medium rounded-lg hover:bg-white/90 transition-colors"
              >
                开始对比 →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 内容 */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={fetchItems}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg"
            >
              {t("errors.retry")}
            </button>
          </div>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <NameCard
                key={item.id}
                item={item}
                onDelete={handleDelete}
                deleting={deleting === item.id}
                selectMode={selectMode}
                selected={selectedIds.has(item.id)}
                onSelect={() => toggleSelect(item.id, item.fullName)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NameCard({
  item,
  onDelete,
  deleting,
  selectMode,
  selected,
  onSelect,
}: {
  item: NameFavorite;
  onDelete: (id: string) => void;
  deleting: boolean;
  selectMode?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const { t } = useLocale();
  const analysis = item.analysis as {
    wuxing?: { likes?: string[] };
    phonetic?: { score?: number };
    uniqueness?: { riskLevel?: string };
    classic?: { score?: number };
  } | null;

  const likes = analysis?.wuxing?.likes || item.wuxing || [];

  return (
    <div
      className={`bg-white rounded-xl border p-5 shadow-sm hover:shadow-md transition-all cursor-pointer ${
        selectMode
          ? selected
            ? "border-amber-500 ring-2 ring-amber-200"
            : "border-amber-100 hover:border-amber-300"
          : "border-amber-100"
      }`}
      onClick={selectMode ? onSelect : undefined}
    >
      {/* 选择指示器 + 名字 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* 选择框 */}
          {selectMode && (
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                selected
                  ? "bg-amber-500 border-amber-500"
                  : "border-gray-300 hover:border-amber-400"
              }`}
            >
              {selected && (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          )}
          <div>
            <div className="text-2xl font-bold text-gray-900">{item.fullName}</div>
            <div className="text-sm text-gray-400 mt-0.5">
              {item.gender === "M" ? t("naming.form.male") : t("naming.form.female")}
              {item.score !== null && ` · ${t("collection.columns.score")} ${item.score}`}
            </div>
          </div>
        </div>
        {!selectMode && (
          <button
            onClick={() => onDelete(item.id)}
            disabled={deleting}
            className="p-1.5 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-50"
            title={t("collection.delete")}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* 五行 */}
      {likes.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {likes.map((wx) => (
            <span
              key={wx}
              className={`text-xs px-2 py-0.5 rounded-full ${
                WUXING_COLORS[wx] || "bg-gray-100 text-gray-600"
              }`}
            >
              {wx}
            </span>
          ))}
        </div>
      )}

      {/* 备注 */}
      {item.note && (
        <p className="text-sm text-gray-500 mb-3 italic">"{item.note}"</p>
      )}

      {/* 底部 */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-400">
          {new Date(item.createdAt).toLocaleDateString()}
        </span>
        <Link
          href={`/collection/${item.id}`}
          className="text-xs text-amber-600 hover:text-amber-700"
        >
          查看详情 →
        </Link>
      </div>
    </div>
  );
}

function EmptyState() {
  const { t } = useLocale();
  return (
    <div className="text-center py-24">
      <div className="text-6xl mb-4">📖</div>
      <h3 className="text-xl font-semibold text-gray-700 mb-2">
        {t("collection.empty")}
      </h3>
      <p className="text-gray-400 mb-6">
        {t("collection.emptyDesc")}
      </p>
      <Link
        href="/naming"
        className="inline-block px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
      >
        {t("collection.goNaming")}
      </Link>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-amber-100 p-5 animate-pulse"
        >
          <div className="h-8 bg-amber-100 rounded w-32 mb-2" />
          <div className="h-4 bg-amber-50 rounded w-20 mb-4" />
          <div className="flex gap-1.5 mb-3">
            <div className="h-5 bg-amber-50 rounded-full w-10" />
            <div className="h-5 bg-amber-50 rounded-full w-10" />
          </div>
          <div className="h-3 bg-amber-50 rounded w-full mt-4" />
        </div>
      ))}
    </div>
  );
}
