/**
 * features/today/DayPlanTaskList.jsx
 * Saved daily plan task list with real-time checkbox updates.
 *
 * Bolt 2.2 — ADHD-aware design:
 *   - Time shown as range (±25%, rounded to 5 min) — time blindness aware
 *   - Microsteps collapsed by default (progressive disclosure)
 *   - No shame for incomplete tasks: no red "overdue" states, no streaks
 *   - Quiet done state: strikethrough + opacity, no confetti
 *
 * Exports: DayPlanTaskList
 */

import { useState } from "react";
import { C, P_COLOR } from "../../skeleton/design-system/tokens.js";

/** Maps estimated_minutes to a human-readable range string. */
function timeRange(minutes) {
  const m = minutes || 25;
  const lo = Math.max(5, Math.round(m * 0.75 / 5) * 5);
  const hi = Math.round(m * 1.25 / 5) * 5;
  return `${lo}–${hi}`;
}

/**
 * @param {object}   props
 * @param {object[]} props.tasks          — DailyTask[] from useDayPlan
 * @param {Function} props.onToggle       — (taskId) => void
 * @param {Function} props.onClearPlan    — () => void — re-plan button
 * @param {string}   props.lang
 */
export function DayPlanTaskList({ tasks, onToggle, onClearPlan, lang }) {
  const doneCount = tasks.filter(t => t.completed).length;
  const allDone   = doneCount === tasks.length && tasks.length > 0;

  const replanlabel =
    lang === "ru" ? "Перепланировать"
    : lang === "az" ? "Yenidən planlaşdır"
    : "Re-plan";

  const headingLabel =
    lang === "ru" ? "Задачи на сегодня"
    : lang === "az" ? "Bu günün tapşırıqları"
    : "Today's tasks";

  if (allDone) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <DayPlanHeader lang={lang} onReplan={onClearPlan} doneCount={doneCount} total={tasks.length} replanlabel={replanlabel} headingLabel={headingLabel} />
        <div style={{ textAlign: "center", paddingTop: 24, paddingBottom: 16 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
          <div style={{ color: C.text, fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
            {lang === "ru" ? "Всё готово! Отличная работа."
             : lang === "az" ? "Hamısı hazırdır! Əla iş!"
             : "All done! Great work."}
          </div>
          <div style={{ color: C.textSub, fontSize: 13 }}>
            {lang === "ru" ? `${doneCount} задач${doneCount === 1 ? "а" : doneCount < 5 ? "и" : ""} выполнено`
             : lang === "az" ? `${doneCount} tapşırıq tamamlandı`
             : `${doneCount} task${doneCount !== 1 ? "s" : ""} completed`}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <DayPlanHeader lang={lang} onReplan={onClearPlan} doneCount={doneCount} total={tasks.length} replanlabel={replanlabel} headingLabel={headingLabel} />
      {tasks.map(task => (
        <TaskRow
          key={task.id}
          task={task}
          onToggle={onToggle}
          lang={lang}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DayPlanHeader — section heading + progress + re-plan button
// ─────────────────────────────────────────────────────────────────────────────
function DayPlanHeader({ lang, onReplan, doneCount, total, replanlabel, headingLabel }) {
  const pct = total > 0 ? Math.round(doneCount / total * 100) : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ color: C.textSub, fontSize: 12, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>
          {headingLabel}
        </div>
        <button
          onClick={onReplan}
          style={{
            background: "none", border: "none",
            color: C.textSub, fontSize: 11, fontWeight: 500,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          ↺ {replanlabel}
        </button>
      </div>
      {/* Thin progress bar */}
      {total > 0 && (
        <div style={{ background: C.border, borderRadius: 4, height: 3, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${pct}%`,
            background: pct === 100 ? C.done : C.accent,
            borderRadius: 4, transition: "width .5s ease",
          }} />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TaskRow — single task with checkbox + collapsed microsteps
// ─────────────────────────────────────────────────────────────────────────────
function TaskRow({ task, onToggle, lang }) {
  const [expanded, setExpanded] = useState(false);

  const color     = P_COLOR[task.priority] || C.textSub;
  const hasMicros = task.microsteps?.length > 0;

  const showMoreLabel =
    lang === "ru" ? "Микрошаги"
    : lang === "az" ? "Mikro addımlar"
    : "Steps";

  const hideLabel =
    lang === "ru" ? "Скрыть" : lang === "az" ? "Gizlət" : "Hide";

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${task.completed ? C.border : C.borderHi}`,
        borderRadius: 14,
        padding: "12px 14px",
        opacity: task.completed ? 0.55 : 1,
        transition: "opacity .3s, border-color .2s",
        animation: "slideUp .25s ease",
      }}
    >
      {/* Main row: checkbox + title + meta */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        {/* Checkbox — 44×44px touch target with visual 22px box */}
        <button
          onClick={() => onToggle(task.id)}
          aria-label={task.completed
            ? (lang === "ru" ? `Отметить незавершённой: ${task.title}` : `Mark incomplete: ${task.title}`)
            : (lang === "ru" ? `Отметить выполненной: ${task.title}` : `Mark complete: ${task.title}`)}
          style={{
            width: 44, height: 44, flexShrink: 0,
            background: "none", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginLeft: -12, marginTop: -8, marginBottom: -8,
          }}
        >
          <div style={{
            width: 22, height: 22, borderRadius: 7,
            background: task.completed ? C.done : "transparent",
            border: `2px solid ${task.completed ? C.done : C.textSub}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all .2s",
          }}>
            {task.completed && (
              <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                <path d="M1 5L4.5 8.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        </button>

        {/* Title + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            color: task.completed ? C.textSub : C.text,
            fontSize: 15, fontWeight: 600, lineHeight: 1.4,
            textDecoration: task.completed ? "line-through" : "none",
            transition: "color .2s, text-decoration .2s",
            letterSpacing: -0.2,
          }}>
            {task.title}
          </div>

          {/* Meta row: priority + time */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
            {task.priority !== "low" && (
              <span style={{
                display: "inline-flex", alignItems: "center",
                background: `${color}12`,
                border: `1px solid ${color}30`,
                borderRadius: 5, padding: "1px 6px",
                color, fontSize: 11, fontWeight: 600,
              }}>
                {task.priority === "high"
                  ? (lang === "ru" ? "Высокий" : lang === "az" ? "Yüksək" : "High")
                  : (lang === "ru" ? "Средний" : lang === "az" ? "Orta" : "Medium")}
              </span>
            )}
            <span style={{ color: C.textSub, fontSize: 11 }}>
              ⏱ {timeRange(task.estimated_minutes)} min
            </span>

            {/* Show/hide microsteps toggle */}
            {hasMicros && !task.completed && (
              <button
                onClick={() => setExpanded(e => !e)}
                style={{
                  background: "none", border: "none",
                  color: C.accent, fontSize: 11, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                  padding: 0,
                }}
              >
                {expanded ? hideLabel : `▸ ${showMoreLabel}`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Microsteps — collapsed by default (progressive disclosure) */}
      {expanded && hasMicros && !task.completed && (
        <div style={{ marginTop: 10, paddingLeft: 32, display: "flex", flexDirection: "column", gap: 4 }}>
          {task.microsteps.map((step, i) => (
            <div key={i} style={{
              color: i === 0 ? C.accentLit : C.textSub,
              fontSize: 13, lineHeight: 1.5,
              display: "flex", alignItems: "flex-start", gap: 6,
            }}>
              <span style={{ color: C.accent, flexShrink: 0, marginTop: 1, fontSize: 11 }}>
                {i + 1}.
              </span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
