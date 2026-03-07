/**
 * features/dump/index.jsx
 * Dump screen — brain dump input + thought list.
 *
 * Exports: DumpScreen
 *
 * Bolt 1.3: extracted from mindflow.jsx lines 906–1191.
 *   VoiceBtn     — lines 906–945 (dump-only, not shared)
 *   DumpScreen   — lines 951–1191
 */

import { useState, useMemo, useRef } from "react";
import { C }              from "../../skeleton/design-system/tokens.js";
import { T }              from "../../shared/i18n/translations.js";
import { Icon }           from "../../shared/ui/icons.jsx";
import { TYPE_CFG }       from "../../shared/lib/thought-types.js";
import { ThoughtCard }    from "../../shared/ui/ThoughtCard.jsx";
import { FREE_LIMITS, getDumpCount, incrementDumpCount } from "../../shared/lib/freemium.js";
import { greeting }       from "../../shared/lib/greeting.js";
import { logError }       from "../../shared/lib/logger.js";
import { Spinner }        from "../../shared/ui/primitives.jsx";
import { parseDump }      from "./dump.api.js";

// ─────────────────────────────────────────────────────────────────────────────
// VOICE BUTTON — dump-only component (not shared across screens)
// ─────────────────────────────────────────────────────────────────────────────
function VoiceBtn({ onResult, disabled, lang }) {
  const [on, setOn] = useState(false);
  const recRef = useRef(null);
  const supported = "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
  const sttLang = lang === "ru" ? "ru-RU" : lang === "az" ? "az-AZ" : "en-US";

  const toggle = () => {
    if (!supported) { alert("Voice input not supported. Try Chrome."); return; }
    if (on) { recRef.current?.stop(); setOn(false); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = sttLang;
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = e => { onResult(e.results[0][0].transcript); setOn(false); };
    rec.onerror = rec.onend = () => setOn(false);
    rec.start();
    recRef.current = rec;
    setOn(true);
  };

  const ariaLabel = on
    ? (lang === "ru" ? "Остановить запись" : lang === "az" ? "Qeydiyyatı dayandır" : "Stop recording")
    : (lang === "ru" ? "Голосовой ввод"    : lang === "az" ? "Səs girişi"          : "Voice input");

  return (
    <button onClick={toggle} disabled={disabled} aria-label={ariaLabel} style={{
      width: 48, height: 48, borderRadius: 14, flexShrink: 0,
      border: `1px solid ${on ? C.high + "88" : C.border}`,
      background: on ? `${C.high}18` : C.surfaceHi,
      color: on ? C.high : C.textSub,
      cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: on ? "micPulse 1.4s infinite" : "none",
      transition: "all .2s",
      boxShadow: on ? `0 0 16px ${C.high}44` : "none",
    }}>
      {on ? Icon.stop(C.high, 16) : Icon.mic(C.textSub, 18)}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DUMP SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export function DumpScreen({ thoughts, onProcess, onToggleToday, onArchive, onUpdate, lang, persona, isPro, onShowPricing }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("idle");
  const [aiMsg, setAiMsg] = useState("");
  const [filter, setFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState(null);
  const tx = T[lang] || T.en;

  // useMemo: don't recompute on every render
  const visible = useMemo(() =>
    thoughts.filter(t => !t.archived &&
      (filter === "all" || t.type === filter) &&
      (!tagFilter || t.tags?.includes(tagFilter))
    ), [thoughts, filter, tagFilter]);

  // All unique tags across active thoughts for filter UI
  const allTags = useMemo(() => {
    const s = new Set();
    thoughts.forEach(t => { if (!t.archived) t.tags?.forEach(tag => s.add(tag)); });
    return [...s].slice(0, 12);
  }, [thoughts]);

  const process = async () => {
    if (!text.trim() || text.trim().length < 2 || status === "processing") return;

    // Freemium: check dump limit (non-pro users)
    if (!isPro) {
      const dumpCount = getDumpCount();
      const activeCount = thoughts.filter(t => !t.archived).length;
      if (dumpCount >= FREE_LIMITS.dumpsPerMonth) {
        onShowPricing?.("dumps");
        return;
      }
      if (activeCount >= FREE_LIMITS.thoughtsStored) {
        onShowPricing?.("thoughts");
        return;
      }
    }
    incrementDumpCount();
    setStatus("processing");
    setAiMsg("");
    try {
      const { items, response } = await parseDump(text, lang, persona);
      await onProcess(text, items);
      setAiMsg(response);
      setText("");
      setStatus("done");
      setTimeout(() => { setStatus("idle"); setAiMsg(""); }, 5000);
    } catch (e) {
      logError("DumpScreen.process", e);
      setStatus("error");
      // FIX: specific error messages for timeout and auth failures
      if (e.message === "timeout") {
        setAiMsg(lang === "ru" ? "⏱ Таймаут — попробуй снова" : lang === "az" ? "⏱ Vaxt bitdi — yenidən cəhd et" : "⏱ Timeout — try again");
      } else if (e.message?.includes(":auth")) {
        setAiMsg(lang === "ru" ? "🔑 Ошибка API ключа" : "🔑 API key error");
      } else if (e.message?.includes(":rate_limit")) {
        setAiMsg(lang === "ru" ? "⏳ Лимит запросов — подожди минуту" : "⏳ Rate limit — wait a moment");
      }
      setTimeout(() => { setStatus("idle"); setAiMsg(""); }, 4000);
    }
  };

  const FILTERS = ["all", "task", "idea", "note", "reminder", "expense", "memory"];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Ambient background glow */}
      <div style={{ position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)", width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, ${C.accentGlow} 0%, transparent 70%)`, pointerEvents: "none", zIndex: 0 }} />

      {/* Header */}
      <div style={{ padding: "20px 20px 14px", display: "flex", alignItems: "center", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {Icon.brain(C.accentLit, 28)}
          <div>
            <div style={{ color: C.text, fontSize: 20, fontWeight: 800, letterSpacing: -0.8, lineHeight: 1 }}>{tx.appName}</div>
            <div style={{ color: C.textSub, fontSize: 10, fontWeight: 500, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 2 }}>BETA</div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {!isPro && (() => {
            const left = FREE_LIMITS.dumpsPerMonth - getDumpCount();
            if (left <= 5) return (
              <button onClick={() => onShowPricing?.("dumps")} style={{ background: `${C.idea}15`, border: `1px solid ${C.idea}30`, color: C.idea, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.3 }}>
                {left <= 0 ? (lang === "ru" ? "Лимит" : "Limit") : `${left} ${lang === "ru" ? "дампов" : lang === "az" ? "demp" : "dumps"}`} ⚡
              </button>
            );
            return null;
          })()}
          <span style={{ color: C.textSub, fontSize: 13 }}>{greeting(lang)}</span>
        </div>
      </div>

      {/* Input area */}
      <div style={{ padding: "0 16px", flexShrink: 0, position: "relative", zIndex: 1 }}>
        <div style={{
          background: C.surface, borderRadius: 18,
          border: `1px solid ${text.trim() ? C.borderHi : C.border}`,
          marginBottom: 10,
          transition: "border-color .2s, box-shadow .2s",
          boxShadow: text.trim() ? `0 0 0 3px ${C.accentGlow}` : "none",
        }}>
          <textarea data-testid="dump-input" value={text} onChange={e => setText(e.target.value.slice(0, 3000))}
            onKeyDown={e => (e.metaKey || e.ctrlKey) && e.key === "Enter" && process()}
            placeholder={tx.dumpPlaceholder} rows={5}
            aria-label={tx.dumpPlaceholder?.split("\n")[0]}
            style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: C.text, fontSize: 15, lineHeight: 1.65, padding: "16px 18px", resize: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <VoiceBtn lang={lang} disabled={status === "processing"} onResult={t => setText(prev => prev ? `${prev} ${t}` : t)} />
          <button data-testid="process-btn" onClick={process} disabled={status === "processing" || !text.trim()}
            style={{
              flex: 1, height: 48,
              background: status === "processing" ? C.surfaceHi : text.trim() ? `linear-gradient(135deg, ${C.accent}, ${C.accentLit})` : C.surface,
              color: text.trim() ? "white" : C.textSub,
              border: "none", borderRadius: 14,
              fontSize: 14, fontWeight: 700,
              cursor: !text.trim() || status === "processing" ? "not-allowed" : "pointer",
              transition: "all .2s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontFamily: "inherit", letterSpacing: 0.3,
              boxShadow: text.trim() && status !== "processing" ? `0 4px 20px ${C.accentGlow}` : "none",
            }}>
            {status === "processing" && <Spinner />}
            {status === "processing" && tx.processing}
            {status === "idle" && text.trim() && <>{Icon.send("white", 15)}{tx.process}</>}
            {status === "idle" && !text.trim() && tx.process}
            {status === "done" && <>{Icon.check(C.done, 15)}<span style={{ color: C.done }}>{tx.aiResponse}</span></>}
            {status === "error" && tx.errorRetry}
          </button>
        </div>

        {/* char count hint — visible when typing */}
        {text.length > 20 && status === "idle" && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, padding: "0 4px" }}>
            <span style={{ color: C.textDim, fontSize: 11 }}>
              {lang === "ru" ? "⌘+Enter для отправки" : lang === "az" ? "⌘+Enter göndər" : "⌘+Enter to send"}
            </span>
            <span style={{ color: text.length > 1500 ? C.medium : C.textDim, fontSize: 11 }}>{text.length}</span>
          </div>
        )}

        {aiMsg && (
          <div style={{ marginTop: 10, padding: "11px 14px", background: `${C.accent}10`, borderRadius: 14, border: `1px solid ${C.accent}22`, color: C.text, fontSize: 14, lineHeight: 1.6, animation: "fadeIn .3s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
              {Icon.sparkle(C.accent, 13)}
              <span style={{ color: C.accent, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>MindFlow</span>
            </div>
            {aiMsg}
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 6, padding: "12px 16px 0", overflowX: "auto", flexShrink: 0, position: "relative", zIndex: 1 }}>
        {FILTERS.map(f => {
          const cfg = TYPE_CFG[f];
          return (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "5px 11px", borderRadius: 9, flexShrink: 0,
              border: `1px solid ${filter === f ? C.accent : C.border}`,
              background: filter === f ? `${C.accent}18` : "transparent",
              color: filter === f ? C.accentLit : C.textSub,
              fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 5,
              transition: "all .15s",
            }}>
              {f !== "all" && cfg && Icon[cfg.icon] && Icon[cfg.icon](filter === f ? C.accentLit : C.textSub, 12)}
              {f === "all" ? tx.filterAll : (cfg?.label[lang] || f)}
            </button>
          );
        })}
      </div>

      {/* Tag filter chips — only when there are tags */}
      {allTags.length > 0 && (
        <div style={{ display: "flex", gap: 5, padding: "7px 16px 0", overflowX: "auto", flexShrink: 0 }}>
          {allTags.map(tag => (
            <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? null : tag)} style={{
              padding: "3px 9px", borderRadius: 7, flexShrink: 0,
              border: `1px solid ${tagFilter === tag ? C.accentLit : C.border}`,
              background: tagFilter === tag ? `${C.accentLit}18` : "transparent",
              color: tagFilter === tag ? C.accentLit : C.textDim,
              fontSize: 11, fontWeight: tagFilter === tag ? 700 : 500,
              cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4,
              transition: "all .15s",
            }}>
              {Icon.tag(tagFilter === tag ? C.accentLit : C.textDim, 9)}
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 16px 90px", position: "relative", zIndex: 1 }}>
        {visible.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: 60 }}>
            <div style={{ marginBottom: 16 }}>{Icon.brain(C.textDim, 48)}</div>
            <div style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 6, letterSpacing: -0.3 }}>
              {filter === "all" && !tagFilter ? tx.noThoughts : `No ${tagFilter ? `#${tagFilter}` : filter + "s"} yet.`}
            </div>
            <div style={{ color: C.textSub, fontSize: 13 }}>{filter === "all" && !tagFilter ? tx.noThoughtsSub : "Try a different filter."}</div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ color: C.textSub, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>
                {visible.length} {visible.length === 1 ? tx.item : tx.items}
                {tagFilter && <span style={{ color: C.accentLit, marginLeft: 5 }}>#{tagFilter}</span>}
              </span>
              {(filter !== "all" || tagFilter) && (
                <button onClick={() => { setFilter("all"); setTagFilter(null); }} style={{ background: "none", border: "none", color: C.textDim, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>✕ clear</button>
              )}
            </div>
            {visible.map(t => <ThoughtCard key={t.id} thought={t} lang={lang} onToggleToday={onToggleToday} onArchive={onArchive} onUpdate={onUpdate} onTagClick={tag => setTagFilter(tagFilter === tag ? null : tag)} showDone />)}
          </>
        )}
      </div>
    </div>
  );
}
