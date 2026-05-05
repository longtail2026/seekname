"use client";

import { useState, useEffect } from "react";

interface NavItem {
  id: number;
  label: string;
  href: string | null;
  icon: string | null;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  parentId: number | null;
  children: NavItem[];
}

export default function AdminNavPage() {
  const [items, setItems] = useState<NavItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingItem, setEditingItem] = useState<NavItem | null>(null);
  const [form, setForm] = useState({ label: "", href: "", icon: "", description: "", isActive: true, parentId: null as number | null });

  const fetchNav = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/navigation");
      const data = await res.json();
      setItems(data.items || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchNav(); }, []);

  const handleSave = async () => {
    const method = editingItem ? "PUT" : "POST";
    const body = editingItem ? { ...form, id: editingItem.id } : form;
    try {
      const res = await fetch("/api/admin/navigation", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowEditor(false);
        setEditingItem(null);
        setForm({ label: "", href: "", icon: "", description: "", isActive: true, parentId: null });
        fetchNav();
      }
    } catch (e) { console.error(e); }
  };

  const toggleActive = async (item: NavItem) => {
    try {
      await fetch("/api/admin/navigation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, isActive: !item.isActive }),
      });
      fetchNav();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除该导航项？")) return;
    try {
      await fetch(`/api/admin/navigation?id=${id}`, { method: "DELETE" });
      fetchNav();
    } catch (e) { console.error(e); }
  };

  const moveUp = async (item: NavItem, parentChildren: NavItem[]) => {
    const idx = parentChildren.findIndex((i) => i.id === item.id);
    if (idx <= 0) return;
    const prev = parentChildren[idx - 1];
    await fetch("/api/admin/navigation", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, sortOrder: prev.sortOrder - 1 }),
    });
    fetchNav();
  };

  const moveDown = async (item: NavItem, parentChildren: NavItem[]) => {
    const idx = parentChildren.findIndex((i) => i.id === item.id);
    if (idx >= parentChildren.length - 1) return;
    const next = parentChildren[idx + 1];
    await fetch("/api/admin/navigation", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, sortOrder: next.sortOrder + 1 }),
    });
    fetchNav();
  };

  const renderNavItem = (item: NavItem, parentChildren: NavItem[]) => (
    <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: "1px solid #f0f0f0" }}>
      <span style={{ color: item.isActive ? "#52c41a" : "#999", fontSize: 16 }}>{item.isActive ? "🟢" : "⭕"}</span>
      <span style={{ flex: 1, fontSize: 14 }}><strong>{item.label}</strong> {item.href && <span style={{ color: "#999", fontSize: 12 }}>({item.href})</span>}</span>
      {item.icon && <span style={{ fontSize: 16 }}>{item.icon}</span>}
      <div style={{ display: "flex", gap: 4 }}>
        <button onClick={() => moveUp(item, parentChildren)} style={btnStyle}>↑</button>
        <button onClick={() => moveDown(item, parentChildren)} style={btnStyle}>↓</button>
        <button onClick={() => toggleActive(item)} style={btnStyle}>{item.isActive ? "隐藏" : "显示"}</button>
        <button onClick={() => { setEditingItem(item); setForm({ label: item.label, href: item.href || "", icon: item.icon || "", description: item.description || "", isActive: item.isActive, parentId: item.parentId }); setShowEditor(true); }} style={btnStyle}>编辑</button>
        <button onClick={() => handleDelete(item.id)} style={{ ...btnStyle, color: "#ff4d4f" }}>删除</button>
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: "bold", margin: 0 }}>导航栏管理</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => { setEditingItem(null); setForm({ label: "", href: "", icon: "", description: "", isActive: true, parentId: null }); setShowEditor(true); }}
            style={{ padding: "8px 20px", background: "#1890ff", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
            + 新增主导航
          </button>
        </div>
      </div>

      {/* 编辑器弹窗 */}
      {showEditor && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 8, width: 500, padding: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 18 }}>{editingItem ? "编辑导航" : "新增导航"}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input placeholder="导航名称" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}
                style={{ padding: "8px 12px", border: "1px solid #d9d9d9", borderRadius: 4, fontSize: 14 }} />
              <input placeholder="链接地址（可选，子导航可不填）" value={form.href} onChange={(e) => setForm({ ...form, href: e.target.value })}
                style={{ padding: "8px 12px", border: "1px solid #d9d9d9", borderRadius: 4, fontSize: 14 }} />
              <input placeholder="图标 Emoji（可选）" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}
                style={{ padding: "8px 12px", border: "1px solid #d9d9d9", borderRadius: 4, fontSize: 14 }} />
              <input placeholder="描述（可选）" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                style={{ padding: "8px 12px", border: "1px solid #d9d9d9", borderRadius: 4, fontSize: 14 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 4 }}>
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                  显示
                </label>
                {!editingItem && (
                  <select value={form.parentId ?? ""} onChange={(e) => setForm({ ...form, parentId: e.target.value ? parseInt(e.target.value) : null })}
                    style={{ padding: "8px 12px", border: "1px solid #d9d9d9", borderRadius: 4, fontSize: 14 }}>
                    <option value="">作为主导航</option>
                    {items.map((p) => (
                      <option key={p.id} value={p.id}>{`作为 "${p.label}" 的子导航`}</option>
                    ))}
                  </select>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
                <button onClick={() => { setShowEditor(false); setEditingItem(null); }}
                  style={{ padding: "8px 20px", background: "#fff", border: "1px solid #d9d9d9", borderRadius: 4, cursor: "pointer" }}>取消</button>
                <button onClick={handleSave}
                  style={{ padding: "8px 20px", background: "#1890ff", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>
                  {editingItem ? "保存修改" : "创建"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 导航列表 */}
      <div style={{ background: "#fff", borderRadius: 8, overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#999" }}>加载中...</div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#999" }}>暂无导航，点击上方按钮新增</div>
        ) : (
          items.map((parent) => (
            <div key={parent.id} style={{ margin: 0 }}>
              {/* 主导航行 */}
              <div style={{ background: "#fafafa", fontWeight: "bold" }}>
                {renderNavItem(parent, items)}
              </div>
              {/* 子导航 */}
              {parent.children && parent.children.length > 0 && (
                <div style={{ paddingLeft: 40 }}>
                  {parent.children.map((child) => renderNavItem(child, parent.children))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = { padding: "4px 10px", background: "#fff", border: "1px solid #d9d9d9", borderRadius: 4, cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" };