/**
 * features/today/DayPlanReview.jsx
 * Human-in-the-loop review panel for a proposed daily plan.
 *
 * Bolt 2.2 — adhd-aware-planning Principle 11 (human-in-the-loop).
 * User sees every proposed task, can deselect any, then confirms.
 *
 * Exports: DayPlanReview
 */

import { C, P_COLOR } from "../../skeleton/design-system/tokens.js";

/** Maps estimated_minutes to a range string (±25%, rounded to 5 min). */
function timeRange(minutes) {
  const m = minutes || 25;
  const lo = Math.max(5, Math.round(m * 0.75 / 5) * 5);
  const hi = Math.round(m * 1.25 / 5) * 5;
  return `${lo}–${hi}`;
}

function PriorityBadge({ priority, lang }) {
  const color = P_COLOR[priority] || C.textSub;
  const label =
    priority === "high"   ? (lang === "ru" ? "Высокий" : lang === "az" ? "Yüksək" : "High")
    : priority === "low"  ? (lang === "ru" ? "Низкий"  : lang === "az" ? "Aşağı"  : "Low")
    :                       (lang === "ru" ? "Средний" : lang === "az" ? "Orta"   : "Medium");
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      background: `${color}15`,
      border: `1px solid ${color}33`,
      borderRadius: 6, padding: "2px 8px",
      color, fontSize: 11, fontWeight: 600,
      flexShrink: 0,
    }}>
      {label}
    </span>
  );
}

/**
 * @param {object}     props
 * @param {Array}      props.proposed     — ProposedTask[]
 * @param {Function}   props.onToggle     — (index) => void
 * @param {Function}   props.onAcceptAll  — () => void
 * @param {Function}   props.onConfirm    — () => void
 * @param {Function}   props.onCancel     — () => void
 * @param {string}     props.lang
 */
export function DayPlanReview({ proposed, onToggle, onAcceptAll, onConfirm, onCancel, lang }) {
  const acceptedCount = proposed.filter(p => p.accepted).length;
  const allAccepted   = acceptedCount === proposed.length;

  const headingText =
    lang === "ru" ? "Проверь план на день"
    : lang === "az" ? "Gündəlik planı yoxla"
    : "Review your day plan";

  const confirmLabel =
    lang === "ru" ? `Добавить ${acceptedCount} задач${acceptedCount === 1 ? "у" : acceptedCount < 5 ? "и" : ""}`
    : lang === "az" ? `${acceptedCount} tapşırığı əlavə et`
    : `Add ${acceptedCount} task${acceptedCount !== 1 ? "s" : ""}`;

  const cancelLabel =
    lang === "ru" ? "Отмена" : lang === "az" ? "Ləğv et" : "Cancel";

  const acceptAllLabel =
    lang === "ru" ? "Выбрать все" : lang === "az" ? "Hamısını seç" : "Select all";

  if (!proposed.length) {
    return (
      <div style={{
        background: C.surface, borderRadius: 16, padding: 16,
        border: `1px solid ${C.border}`, color: C.textSub, fontSize: 14,
        textAlign: "center",
      }}>
        {lang === "ru" ? "AI не нашёл задач в тексте. Попробуй написать подробнее."
         : lang === "az" ? "AI heç bir tapşırıq tapmadı. Ətraflı yazmağa cəhd et."
         : "No tasks found in your text. Try writing in more detail."}
        <br />
        <button
          onClick={onCancel}
          style={{
            marginTop: 12, background: "none", border: "none",
            color: C.accent, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
          }}
        >
          ← {cancelLabel}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Heading row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ color: C.textSub, fontSize: 12, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>
          {headingText}
        </div>
        {!allAccepted && (
          <button
            onClick={onAcceptAll}
            style={{
              background: "none", border: "none",
              color: C.accent, fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {acceptAllLabel}
          </button>
        )}
      </div>

      {/* Task rows */}
      {proposed.map(({ task, accepted }, i) => (
        <button
          key={i}
          onClick={() => onToggle(i)}
          style={{
            background: accepted ? `${C.accent}10` : C.surface,
            border: `1px solid ${accepted ? C.accent + "40" : C.border}`,
            borderRadius: 14,
            padding: "12px 14px",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            cursor: "pointer",
            textAlign: "left",
            transition: "background .15s, border-color .15s",
            width: "100%",
            fontFamily: "inherit",
          }}
        >
          {/* Checkbox */}
          <div style={{
            width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
            background: accepted ? C.accent : "transparent",
            border: `2px solid ${accepted ? C.accent : C.textSub}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all .15s",
          }}>
            {accepted && (
              <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>

          {/* Task content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Title row */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
              marginBottom: task.microsteps?.[0] ? 6 : 0,
            }}>
              <span style={{
                color: accepted ? C.text : C.textSub,
                fontSize: 14, fontWeight: 600, lineHeight: 1.3,
                textDecoration: accepted ? "none" : "line-through",
                transition: "color .15s",
              }}>
                {task.title}
              </span>
              <PriorityBadge priority={task.priority} lang={lang} />
              <span style={{ color: C.textSub, fontSize: 11, flexShrink: 0 }}>
                ⏱ {timeRange(task.estimated_minutes)} min
              </span>
            </div>

            {/* First microstep (step_one hint) */}
            {task.microsteps?.[0] && (
              <div style={{
                color: C.accentLit, fontSize: 12,
                display: "flex", alignItems: "flex-start", gap: 5,
                opacity: accepted ? 1 : 0.5,
              }}>
                <span style={{ color: C.accent, flexShrink: 0 }}>→</span>
                <span>{task.microsteps[0]}</span>
              </div>
            )}
          </div>
        </button>
      ))}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button
          onClick={onConfirm}
          disabled={acceptedCount === 0}
          style={{
            flex: 1, height: 46,
            background: acceptedCount > 0
              ? `linear-gradient(135deg, ${C.accent}, ${C.accentLit})`
              : C.surface,
            color: acceptedCount > 0 ? "white" : C.textSub,
            border: "none", borderRadius: 12,
            fontSize: 14, fontWeight: 700,
            cursor: acceptedCount > 0 ? "pointer" : "not-allowed",
            fontFamily: "inherit",
            boxShadow: acceptedCount > 0 ? `0 4px 16px ${C.accentGlow}` : "none",
            transition: "all .2s",
            minHeight: 44,
          }}
        >
          {confirmLabel}
        </button>
        <button
          onClick={onCancel}
          style={{
            height: 46, padding: "0 16px",
            background: "none",
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            color: C.textSub, fontSize: 13, fontWeight: 500,
            cursor: "pointer", fontFamily: "inherit",
            minHeight: 44,
          }}
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}
