/**
 * features/today/DayPlanDump.jsx
 * Free-form textarea for day planning brain dump.
 *
 * Bolt 2.2 — adhd-aware-planning Principle 4 (Dump first, structure later).
 * No char limit, no required fields, no category picker.
 *
 * Exports: DayPlanDump
 */

import { useRef, useEffect } from "react";
import { C }       from "../../skeleton/design-system/tokens.js";
import { Spinner } from "../../shared/ui/primitives.jsx";

/**
 * @param {object}   props
 * @param {string}   props.text
 * @param {Function} props.setText
 * @param {Function} props.onSubmit  — () => void
 * @param {boolean}  props.isProcessing
 * @param {string}   props.errorMsg
 * @param {string}   props.lang
 */
export function DayPlanDump({ text, setText, onSubmit, isProcessing, errorMsg, lang }) {
  const taRef = useRef(null);

  useEffect(() => {
    if (taRef.current && !isProcessing) taRef.current.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const placeholder =
    lang === "ru"
      ? "Что нужно сделать сегодня?\nПиши как угодно — задачи, встречи, дедлайны, всё подряд.\n⌘+Enter чтобы разобрать."
      : lang === "az"
      ? "Bu gün nə etmək lazımdır?\nİstənilən formatda yaz — tapşırıqlar, görüşlər, son tarixlər.\n⌘+Enter ilə göndər."
      : "What do you need to do today?\nWrite freely — tasks, meetings, deadlines, whatever's on your mind.\n⌘+Enter to plan.";

  const btnLabel =
    lang === "ru" ? "Разобрать день"
    : lang === "az" ? "Günü planlaşdır"
    : "Plan my day";

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") onSubmit();
  };

  const isActive = text.trim().length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Heading */}
      <div style={{ color: C.textSub, fontSize: 12, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>
        {lang === "ru" ? "Планируем день" : lang === "az" ? "Günü planlaşdıraq" : "Plan today"}
      </div>

      {/* Textarea */}
      <div style={{
        background: C.surface,
        borderRadius: 18,
        border: `1.5px solid ${isActive ? C.borderHi : C.border}`,
        transition: "border-color .2s, box-shadow .2s",
        boxShadow: isActive ? `0 0 0 3px ${C.accentGlow}` : "none",
      }}>
        <textarea
          ref={taRef}
          data-testid="day-plan-input"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={5}
          disabled={isProcessing}
          aria-label={lang === "ru" ? "Что делаем сегодня?" : lang === "az" ? "Bu gün nə edirik?" : "What are we doing today?"}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            color: C.text,
            fontSize: 15,
            lineHeight: 1.7,
            padding: "16px 18px",
            resize: "none",
            fontFamily: "inherit",
            boxSizing: "border-box",
            opacity: isProcessing ? 0.6 : 1,
          }}
        />
      </div>

      {/* Submit button */}
      <button
        data-testid="day-plan-btn"
        onClick={onSubmit}
        disabled={isProcessing || !isActive}
        style={{
          height: 50,
          background: isProcessing
            ? C.surfaceHi
            : isActive
              ? `linear-gradient(135deg, ${C.accent}, ${C.accentLit})`
              : C.surface,
          color: isActive && !isProcessing ? "white" : C.textSub,
          border: "none",
          borderRadius: 14,
          fontSize: 15,
          fontWeight: 700,
          cursor: !isActive || isProcessing ? "not-allowed" : "pointer",
          transition: "all .2s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          fontFamily: "inherit",
          letterSpacing: 0.3,
          boxShadow: isActive && !isProcessing ? `0 4px 20px ${C.accentGlow}` : "none",
          minHeight: 44, // WCAG touch target
        }}
      >
        {isProcessing
          ? <><Spinner /> {lang === "ru" ? "Думаю..." : lang === "az" ? "Düşünürəm..." : "Thinking..."}</>
          : btnLabel}
      </button>

      {/* Error message */}
      {errorMsg && (
        <div style={{
          background: `${C.high}15`,
          border: `1px solid ${C.high}33`,
          borderRadius: 10,
          padding: "10px 14px",
          color: C.high,
          fontSize: 13,
          fontWeight: 500,
        }}>
          {errorMsg}
        </div>
      )}

      {/* Keyboard hint */}
      {text.length > 15 && !isProcessing && (
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 4px" }}>
          <span style={{ color: C.textSub, fontSize: 11 }}>
            {lang === "ru" ? "⌘+Enter для отправки"
             : lang === "az" ? "⌘+Enter göndər"
             : "⌘+Enter to send"}
          </span>
        </div>
      )}
    </div>
  );
}
