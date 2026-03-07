/**
 * shared/ui/ThoughtCard.jsx
 * Reusable thought card — used by DumpScreen, TodayScreen (and future slices).
 * Includes ClarifyInline sub-component (only ever rendered inside a ThoughtCard).
 *
 * Props (ThoughtCard):
 *   thought       — thought object
 *   lang          — "en" | "ru" | "az"
 *   onToggleToday — (id) => void
 *   onArchive     — (id) => void
 *   onUpdate      — (id, patch) => void
 *   onTagClick    — (tag) => void  (optional)
 *   showDone      — bool (show Done button + swipe-to-done)
 *
 * Bolt 1.3: extracted from mindflow.jsx lines 674–901.
 */

import { useState, useRef, memo } from "react";
import { C, P_COLOR }    from "../../skeleton/design-system/tokens.js";
import { T }             from "../i18n/translations.js";
import { Icon }          from "./icons.jsx";
import { TYPE_CFG }      from "../lib/thought-types.js";

// ─────────────────────────────────────────────────────────────────────────────
// CLARIFY INLINE — inline answer widget rendered inside ThoughtCard
// ─────────────────────────────────────────────────────────────────────────────
function ClarifyInline({ thought: t, lang, onUpdate }) {
  const [ans, setAns] = useState("");
  const [done, setDone] = useState(false);

  // FIX: save answer to thought via onUpdate, was discarded before
  const submit = () => {
    if (ans.trim() && onUpdate) {
      onUpdate(t.id, {
        clarifyAnswer: ans.trim(),
        clarifyAnswered: true,
        text: `${t.text} → ${ans.trim()}`,
        updatedAt: new Date().toISOString(),
      });
    }
    setDone(true);
  };

  const dismiss = () => setDone(true);
  if (done) return null;
  return (
    <div style={{ marginTop: 9, borderRadius: 9, background: `${C.idea}10`, border: `1px solid ${C.idea}25`, overflow: "hidden" }}>
      <div style={{ padding: "8px 11px", display: "flex", gap: 7, alignItems: "flex-start" }}>
        {Icon.sparkle(C.idea, 13)}
        <span style={{ color: C.idea, fontSize: 12.5, lineHeight: 1.5 }}>{t.clarify}</span>
      </div>
      <div style={{ display: "flex", borderTop: `1px solid ${C.idea}15` }}>
        <input
          value={ans} onChange={e => setAns(e.target.value)}
          onKeyDown={e => e.key === "Enter" && ans.trim() && submit()}
          placeholder={lang === "ru" ? "Ответить…" : lang === "az" ? "Cavabla…" : "Answer…"}
          style={{ flex: 1, background: "transparent", border: "none", outline: "none",
            color: C.text, fontSize: 12.5, padding: "7px 11px", fontFamily: "inherit" }} />
        {ans.trim() && (
          <button onClick={submit}
            style={{ background: "none", border: "none", color: C.done, padding: "0 10px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
            ✓
          </button>
        )}
        <button onClick={dismiss}
          style={{ background: "none", border: "none", color: C.textDim, padding: "0 10px", cursor: "pointer", fontSize: 12 }}>
          ✕
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// THOUGHT CARD
// ─────────────────────────────────────────────────────────────────────────────
export const ThoughtCard = memo(function ThoughtCard({ thought: t, lang, onToggleToday, onArchive, onUpdate, onTagClick, showDone = false }) {
  const cfg = TYPE_CFG[t.type] || TYPE_CFG.note;
  const tx = T[lang] || T.en;
  const [leaving, setLeaving] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const touchStartX = useRef(null);

  const handleDone = () => {
    setLeaving(true);
    setTimeout(() => onArchive?.(t.id), 280);
  };

  // Swipe-to-done on mobile (swipe left ≥ 60px)
  const onTouchStart = e => { touchStartX.current = e.touches[0].clientX; };
  const onTouchMove  = e => {
    if (touchStartX.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    if (dx < 0) setSwipeX(Math.max(dx, -80));
  };
  const onTouchEnd   = () => {
    if (swipeX < -55 && showDone) handleDone();
    else setSwipeX(0);
    touchStartX.current = null;
  };

  const typeIcon = Icon[cfg.icon];
  const hasPriority = t.priority !== "none";

  return (
    <div
      data-testid="thought-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        background: hovered ? C.surfaceHi : C.surface,
        borderRadius: 16,
        padding: "14px 16px",
        marginBottom: 10,
        border: `1px solid ${hasPriority ? P_COLOR[t.priority] + "44" : hovered ? C.borderHi : C.border}`,
        position: "relative", overflow: "hidden",
        opacity: leaving ? 0 : 1,
        transform: leaving ? "translateX(40px) scale(.96)" : swipeX !== 0 ? `translateX(${swipeX}px)` : hovered ? "translateY(-1px)" : "none",
        transition: swipeX !== 0 ? "none" : "opacity .28s, transform .2s, background .15s, border-color .15s",
        boxShadow: hovered && hasPriority ? `0 4px 20px ${P_COLOR[t.priority]}22` : hovered ? `0 4px 20px ${C.accentGlow}` : "none",
      }}>
      {/* Swipe hint background — shows green check as you swipe */}
      {swipeX < -10 && showDone && (
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 80, background: `linear-gradient(270deg, ${C.done}22, transparent)`, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 16, borderRadius: "0 16px 16px 0", pointerEvents: "none" }}>
          {Icon.check(C.done, 20)}
        </div>
      )}
      {/* Priority accent bar */}
      {hasPriority && (
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
          background: `linear-gradient(180deg, ${P_COLOR[t.priority]}, ${P_COLOR[t.priority]}88)`,
          borderRadius: "16px 0 0 16px",
        }} />
      )}

      <div style={{ paddingLeft: hasPriority ? 12 : 0 }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
          {/* Type badge with SVG icon */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            background: `${cfg.color}18`, color: cfg.color,
            fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 7,
            letterSpacing: 0.3, textTransform: "uppercase",
          }}>
            {typeIcon && typeIcon(cfg.color, 12)}
            {cfg.label[lang] || cfg.label.en}
          </div>

          {/* Priority dot */}
          {hasPriority && (
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: P_COLOR[t.priority],
              boxShadow: `0 0 6px ${P_COLOR[t.priority]}`,
              flexShrink: 0,
            }} />
          )}

          <div style={{ flex: 1 }} />

          {/* Today toggle */}
          {t.type === "task" && !t.archived && onToggleToday && (
            <button onClick={() => onToggleToday(t.id)} style={{
              fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 7,
              border: `1px solid ${t.isToday ? C.accent : C.border}`,
              background: t.isToday ? `${C.accent}20` : "transparent",
              color: t.isToday ? C.accentLit : C.textSub,
              cursor: "pointer", transition: "all .15s", fontFamily: "inherit",
              letterSpacing: 0.2,
            }}>
              {t.isToday ? "⚡ today" : tx.addToday}
            </button>
          )}

          {/* Done button */}
          {showDone && !t.archived && (
            <button onClick={handleDone}
              aria-label={lang === "ru" ? "Отметить выполненным" : lang === "az" ? "Tamamlandı kimi işarələ" : "Mark as done"}
              title={lang === "ru" ? "Готово" : lang === "az" ? "Hazır" : "Done"}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 7,
                border: `1px solid ${C.done}44`, background: `${C.done}12`,
                color: C.done, cursor: "pointer", marginLeft: 4, fontFamily: "inherit",
                transition: "all .15s",
              }}>
              {Icon.check(C.done, 13)}
            </button>
          )}
        </div>

        {/* Text */}
        <p style={{ color: C.text, fontSize: 14.5, lineHeight: 1.55, margin: 0, letterSpacing: 0.1 }}>{t.text}</p>

        {/* Clarify question — interactive */}
        {t.clarify && !t.clarifyAnswered && (
          <ClarifyInline thought={t} lang={lang} onUpdate={onUpdate} />
        )}

        {/* Recurrence badge */}
        {t.recurrence && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, background: `${C.memory}15`, border: `1px solid ${C.memory}30`, borderRadius: 6, padding: "2px 7px" }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.memory} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            <span style={{ color: C.memory, fontSize: 10, fontWeight: 700, letterSpacing: 0.3 }}>
              {t.recurrence === "daily" ? (lang === "ru" ? "Ежедневно" : lang === "az" ? "Hər gün" : "Daily") :
               t.recurrence === "monthly" ? (lang === "ru" ? "Ежемесячно" : lang === "az" ? "Hər ay" : "Monthly") :
               t.recurrence?.startsWith("weekly:") ? (lang === "ru" ? `Еженед. ${t.recurrence.split(":")[1]}` : `Weekly ${t.recurrence.split(":")[1]}`) : t.recurrence}
            </span>
          </div>
        )}

        {t.reminderAt && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8,
            background: `${C.reminder}15`, border: `1px solid ${C.reminder}30`,
            borderRadius: 7, padding: "3px 9px", fontSize: 11, color: C.reminder, fontWeight: 600 }}>
            {Icon.bell(C.reminder, 11)}
            {new Date(t.reminderAt).toLocaleString(lang === "ru" ? "ru-RU" : lang === "az" ? "az-AZ" : "en-US",
              { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </div>
        )}

        {/* Tags — clickable for filter */}
        {t.tags?.length > 0 && (
          <div style={{ display: "flex", gap: 5, marginTop: 9, flexWrap: "wrap" }}>
            {t.tags.map(tag => (
              <button key={tag} onClick={e => { e.stopPropagation(); onTagClick?.(tag); }} style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                fontSize: 11, color: C.textSub,
                background: C.bg, padding: "2px 7px", borderRadius: 5,
                border: `1px solid ${C.border}`,
                cursor: onTagClick ? "pointer" : "default",
                fontFamily: "inherit", fontWeight: 500,
                transition: "all .12s",
              }}
              onMouseEnter={e => { if (onTagClick) { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accentLit; }}}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSub; }}>
                {Icon.tag(C.textDim, 9)}
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}, (prev, next) =>
  prev.thought === next.thought &&
  prev.lang === next.lang &&
  prev.showDone === next.showDone
);
