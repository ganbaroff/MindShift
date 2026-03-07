/**
 * features/settings/ExportPanel.jsx
 * Bottom-sheet modal: copy as Markdown, download JSON, open Telegram bot.
 *
 * Exports: ExportPanel
 *
 * Bolt 1.6: extracted from mindflow.jsx lines 644–702.
 */

import { useState }          from "react";
import { C }                 from "../../skeleton/design-system/tokens.js";
import { T }                 from "../../shared/i18n/translations.js";
import { exportToMarkdown }  from "../../shared/lib/export.js";

export function ExportPanel({ thoughts, lang, onClose }) {
  const [copied, setCopied] = useState(false);
  const md = exportToMarkdown(thoughts, lang);
  const tx = T[lang] || T.en;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(md);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = md;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const TG_BOT = "MindFlowCaptureBot";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 500, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.surface, borderRadius: "20px 20px 0 0", padding: "24px 20px 40px", width: "100%", maxWidth: 480 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ color: C.text, fontSize: 18, fontWeight: 700 }}>{tx.exportData}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textSub, fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ background: C.bg, borderRadius: 12, padding: "12px 14px", marginBottom: 16, maxHeight: 200, overflowY: "auto", border: `1px solid ${C.border}` }}>
          <pre style={{ color: C.textSub, fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0, fontFamily: "monospace" }}>
            {md.slice(0, 600)}{md.length > 600 ? "..." : ""}
          </pre>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={copy} style={{ height: 48, background: copied ? `${C.done}22` : C.accent, color: copied ? C.done : "white", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all .2s" }}>
            {copied ? "✓ " + (lang === "ru" ? "Скопировано!" : lang === "az" ? "Kopyalandı!" : "Copied!") : "📋 " + (lang === "ru" ? "Копировать Markdown" : lang === "az" ? "Markdown kopyala" : "Copy as Markdown")}
          </button>
          <button onClick={() => {
            const json = JSON.stringify(thoughts.filter(t => !t.archived), null, 2);
            const blob = new Blob([json], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `mindflow-${new Date().toISOString().slice(0,10)}.json`;
            a.click();
          }} style={{ height: 48, background: C.surfaceHi, color: C.text, border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            ⬇️ {lang === "ru" ? "Скачать JSON" : lang === "az" ? "JSON yüklə" : "Download JSON"}
          </button>
          <button onClick={() => window.open(`https://t.me/${TG_BOT}`, "_blank")} style={{ height: 48, background: "#2AABEE22", color: "#2AABEE", border: "1px solid #2AABEE44", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            ✈️ {lang === "ru" ? "Открыть Telegram-бот" : lang === "az" ? "Telegram bot aç" : "Open Telegram Bot"}
          </button>
        </div>
      </div>
    </div>
  );
}
