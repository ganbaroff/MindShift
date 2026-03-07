/**
 * features/today/WelcomeBack.jsx
 * Shown once per session when user returns after > 2 days away.
 *
 * Bolt 2.1: adhd-aware-planning Principle 2 (shame-loop prevention).
 *   - No statistics of missed days
 *   - No streak data shown
 *   - Warm, neutral welcome
 *   - Two paths: show one task, or just browse
 *   - Renders once per session (dismissed by parent via onDismiss)
 *
 * Exports: WelcomeBack
 */

import { C } from "../../skeleton/design-system/tokens.js";

/**
 * @param {object}   props
 * @param {string}   props.lang
 * @param {Function} props.onShowTask  — user chose "show me one task"
 * @param {Function} props.onBrowse   — user chose "just look around"
 * @param {Function} props.onDismiss  — any dismiss action (closes component)
 */
export function WelcomeBack({ lang, onShowTask, onBrowse, onDismiss }) {
  const heading =
    lang === "ru" ? "Ты вернулся."
    : lang === "az" ? "Xoş gəldin."
    : "Good to see you.";

  const sub =
    lang === "ru"
      ? "Без давления — начнём с одной задачи?"
      : lang === "az"
      ? "Heç bir təzyiq yoxdur. Bir tapşırıqdan başlayaq?"
      : "No pressure — want to start with just one task?";

  const yesLabel =
    lang === "ru" ? "Да, покажи одну задачу"
    : lang === "az" ? "Bəli, bir tapşırıq göstər"
    : "Yes, show me one";

  const browseLabel =
    lang === "ru" ? "Просто осмотреться"
    : lang === "az" ? "Sadəcə baxım"
    : "Just browsing";

  const handleShowTask = () => { onShowTask?.(); onDismiss?.(); };
  const handleBrowse   = () => { onBrowse?.();   onDismiss?.(); };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={heading}
      style={{
        background: C.surface,
        border: `1px solid ${C.borderHi}`,
        borderRadius: 20,
        padding: "20px 20px 16px",
        marginBottom: 16,
        animation: "slideUp .4s cubic-bezier(.22,1,.36,1)",
        position: "relative",
      }}
    >
      {/* Dismiss × */}
      <button
        onClick={onDismiss}
        aria-label={lang === "ru" ? "Закрыть" : "Dismiss"}
        style={{
          position: "absolute",
          top: 12,
          right: 14,
          background: "none",
          border: "none",
          color: C.textDim,
          fontSize: 18,
          cursor: "pointer",
          lineHeight: 1,
          padding: 4,
          fontFamily: "inherit",
        }}
      >
        ×
      </button>

      {/* Heading */}
      <div style={{
        fontSize: 22,
        fontWeight: 800,
        color: C.text,
        letterSpacing: -0.6,
        marginBottom: 6,
        fontFamily: "Syne, sans-serif",
        lineHeight: 1.2,
      }}>
        {heading}
      </div>

      {/* Sub-heading — calm invitation */}
      <div style={{
        color: C.textSub,
        fontSize: 14,
        lineHeight: 1.6,
        marginBottom: 20,
      }}>
        {sub}
      </div>

      {/* Two actions */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          onClick={handleShowTask}
          style={{
            flex: 1,
            height: 44,
            background: `linear-gradient(135deg, ${C.accent}, ${C.accentLit})`,
            color: "white",
            border: "none",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            letterSpacing: 0.2,
            boxShadow: `0 4px 16px ${C.accentGlow}`,
            minWidth: 160,
          }}
        >
          {yesLabel}
        </button>

        <button
          onClick={handleBrowse}
          style={{
            flex: 1,
            height: 44,
            background: "none",
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            color: C.textSub,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "inherit",
            minWidth: 120,
          }}
        >
          {browseLabel}
        </button>
      </div>
    </div>
  );
}
