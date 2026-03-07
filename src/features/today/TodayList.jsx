/**
 * features/today/TodayList.jsx
 * Today task list — ADHD-optimised.
 *
 * Bolt 2.1:
 *   - Soft cap ≤ 5 visible tasks (adhd-aware-planning Principle 5)
 *   - step_one always visible (micro-step, concrete first action)
 *   - Quiet "Done" archive (no confetti, no streak counters)
 *   - "I don't know where to start" → triggers AI decomposition
 *   - "Show more" expands, never auto-expands
 *   - Empty state is calm, not shaming
 *
 * Exports: TodayList
 */

import { C }       from "../../skeleton/design-system/tokens.js";
import { Spinner } from "../../shared/ui/primitives.jsx";
import { Icon }    from "../../shared/ui/icons.jsx";

/**
 * @param {object}   props
 * @param {object[]} props.tasks        — visible tasks (already soft-capped by useToday)
 * @param {number}   props.hiddenCount  — number of tasks hidden by soft cap
 * @param {boolean}  props.expandAll
 * @param {Function} props.setExpandAll — () => void
 * @param {Function} props.onComplete   — (id) => void — done, archive quietly
 * @param {Function} props.onArchive    — (id) => void — remove without questions
 * @param {Function} props.onDecompose  — (task) => void — "where to start" AI call
 * @param {string|null} props.decomposing — taskId currently being decomposed
 * @param {string}   props.lang
 */
export function TodayList({
  tasks,
  hiddenCount,
  expandAll,
  setExpandAll,
  onComplete,
  onArchive,
  onDecompose,
  decomposing,
  lang,
}) {
  // ── Empty state ────────────────────────────────────────────────────────────
  if (!tasks || tasks.length === 0) {
    const emptyMsg =
      lang === "ru" ? "Список пуст. Хочешь что-то добавить или просто отдохнуть?"
      : lang === "az" ? "Siyahı boşdur. Nə isə əlavə etmək istəyirsən?"
      : "Your list is clear. Want to add something, or just rest?";

    return (
      <div style={{
        textAlign: "center",
        paddingTop: 48,
        paddingBottom: 24,
        animation: "fadeIn .3s ease",
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <div style={{ color: C.text, fontSize: 16, fontWeight: 600, marginBottom: 6, letterSpacing: -0.2 }}>
          {emptyMsg}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {tasks.map(task => (
        <TaskRow
          key={task.id}
          task={task}
          lang={lang}
          onComplete={onComplete}
          onArchive={onArchive}
          onDecompose={onDecompose}
          decomposing={decomposing}
        />
      ))}

      {/* Show more button — not auto-expanded */}
      {hiddenCount > 0 && !expandAll && (
        <button
          onClick={() => setExpandAll(true)}
          style={{
            background: "none",
            border: `1px dashed ${C.border}`,
            borderRadius: 12,
            color: C.textSub,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            padding: "10px 16px",
            fontFamily: "inherit",
            letterSpacing: 0.2,
            transition: "border-color .2s",
          }}
        >
          {lang === "ru" ? `Показать ещё ${hiddenCount} задач${hiddenCount === 1 ? "у" : "и"}`
           : lang === "az" ? `Daha ${hiddenCount} tapşırıq göstər`
           : `Show ${hiddenCount} more task${hiddenCount !== 1 ? "s" : ""}`}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TaskRow — single task card
// ─────────────────────────────────────────────────────────────────────────────
function TaskRow({ task, lang, onComplete, onArchive, onDecompose, decomposing }) {
  const isDecomposing = decomposing === task.id;

  const doneLabel   = lang === "ru" ? "Готово" : lang === "az" ? "Hazır" : "Done";
  const removeLabel = lang === "ru" ? "Убрать" : lang === "az" ? "Sil"   : "Remove";
  const startLabel  = lang === "ru" ? "Не знаю с чего начать"
    : lang === "az" ? "Haradan başlamağı bilmirəm"
    : "Not sure where to start";

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        animation: "slideUp .3s ease",
      }}
    >
      {/* Task title */}
      <div style={{ color: C.text, fontSize: 15, fontWeight: 600, lineHeight: 1.4, letterSpacing: -0.2 }}>
        {task.text}
      </div>

      {/* step_one — first concrete action, always visible when available */}
      {task.step_one && (
        <div style={{
          color: C.accentLit,
          fontSize: 13,
          display: "flex",
          alignItems: "flex-start",
          gap: 6,
        }}>
          <span style={{ color: C.accent, flexShrink: 0, marginTop: 1 }}>→</span>
          <span>{task.step_one}</span>
        </div>
      )}

      {/* energy_required badge — low-contrast, not alarming */}
      {task.energy_required && task.energy_required !== "low" && (
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          background: task.energy_required === "high"
            ? `${C.high}15`
            : `${C.medium}15`,
          border: `1px solid ${task.energy_required === "high" ? C.high + "33" : C.medium + "33"}`,
          borderRadius: 6,
          padding: "2px 8px",
          alignSelf: "flex-start",
        }}>
          <span style={{
            color: task.energy_required === "high" ? C.high : C.medium,
            fontSize: 11,
            fontWeight: 600,
          }}>
            {task.energy_required === "high"
              ? (lang === "ru" ? "Много энергии" : lang === "az" ? "Çox enerji" : "High energy")
              : (lang === "ru" ? "Средне"        : lang === "az" ? "Orta"       : "Medium")}
          </span>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
        {/* Done — primary action */}
        <button
          onClick={() => onComplete(task.id)}
          aria-label={`${doneLabel}: ${task.text}`}
          style={{
            height: 36,
            padding: "0 16px",
            background: `${C.done}15`,
            border: `1px solid ${C.done}33`,
            borderRadius: 10,
            color: C.done,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            gap: 6,
            transition: "opacity .15s",
          }}
        >
          {Icon.check(C.done, 13)} {doneLabel}
        </button>

        {/* Remove — quiet, no confirmation */}
        <button
          onClick={() => onArchive(task.id)}
          aria-label={`${removeLabel}: ${task.text}`}
          style={{
            height: 36,
            padding: "0 12px",
            background: "none",
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            color: C.textSub,
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "border-color .15s",
          }}
        >
          {removeLabel}
        </button>

        {/* Decompose — shown when no step_one or explicitly requested */}
        {!task.step_one && (
          <button
            onClick={() => onDecompose(task)}
            disabled={isDecomposing}
            aria-label={startLabel}
            style={{
              height: 36,
              padding: "0 12px",
              background: `${C.accent}10`,
              border: `1px solid ${C.accent}30`,
              borderRadius: 10,
              color: C.accentLit,
              fontSize: 12,
              fontWeight: 600,
              cursor: isDecomposing ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "opacity .15s",
              flexShrink: 0,
            }}
          >
            {isDecomposing
              ? <><Spinner size={11} color={C.accentLit} /> {lang === "ru" ? "Разбиваю..." : "Breaking down..."}</>
              : startLabel}
          </button>
        )}
      </div>
    </div>
  );
}
