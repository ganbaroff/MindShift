/**
 * features/settings/NotionPanel.jsx
 * Bottom-sheet modal: export tasks as CSV for Notion import.
 *
 * Exports: NotionPanel
 *
 * Bolt 1.6: extracted from mindflow.jsx lines 1133–1190.
 */

import { useState } from "react";
import { C }        from "../../skeleton/design-system/tokens.js";

export function NotionPanel({ thoughts, lang, onClose }) {
  const [copied, setCopied] = useState(false);
  const activeTasks = thoughts.filter(t => !t.archived && t.type === "task");

  const TL = {
    en: { title: "Export to Notion", hint: "Notion blocks direct API calls from browsers. Export as CSV and import it into any Notion database via Settings → Import.", btn: "Copy CSV for Notion", copied: "✓ Copied!", download: "Download CSV", count: (n) => `${n} tasks ready` },
    ru: { title: "Экспорт в Notion", hint: "Notion блокирует прямые запросы из браузера. Экспортируй как CSV и импортируй в Notion через Настройки → Импорт.", btn: "Копировать CSV для Notion", copied: "✓ Скопировано!", download: "Скачать CSV", count: (n) => `${n} задач готово` },
    az: { title: "Notion-a ixrac", hint: "Notion brauzerdən birbaşa API çağırışlarını bloklayır. CSV olaraq ixrac et və Notion-a Parametrlər → İdxal vasitəsilə yüklə.", btn: "Notion üçün CSV kopyala", copied: "✓ Kopyalandı!", download: "CSV yüklə", count: (n) => `${n} tapşırıq hazırdır` },
  };
  const tl = TL[lang] || TL.en;

  const toCSV = () => {
    const header = "Name,Status,Priority,Tags,Created\n";
    const rows = activeTasks.map(t =>
      `"${t.text.replace(/"/g, '""')}","Not started","${t.priority || "none"}","${(t.tags || []).join("; ")}","${t.createdAt?.slice(0, 10) || ""}"`
    ).join("\n");
    return header + rows;
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(toCSV()); }
    catch { const ta = document.createElement("textarea"); ta.value = toCSV(); document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    const blob = new Blob([toCSV()], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `mindflow-notion-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 600, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.surface, borderRadius: "20px 20px 0 0", padding: "24px 20px 44px", width: "100%", maxWidth: 480 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ color: C.text, fontSize: 18, fontWeight: 700 }}>📝 {tl.title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textSub, fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ color: C.textSub, fontSize: 13, marginBottom: 16, lineHeight: 1.6, background: `${C.accent}10`, padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.accent}20` }}>
          💡 {tl.hint}
        </div>

        <div style={{ color: C.textDim, fontSize: 12, marginBottom: 16 }}>{tl.count(activeTasks.length)}</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={copy} style={{ height: 48, background: copied ? `${C.done}22` : C.accent, color: copied ? C.done : "white", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all .2s" }}>
            {copied ? tl.copied : tl.btn}
          </button>
          <button onClick={download} style={{ height: 48, background: C.surfaceHi, color: C.text, border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            ⬇️ {tl.download}
          </button>
        </div>
      </div>
    </div>
  );
}
