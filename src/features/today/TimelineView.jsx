/**
 * features/today/TimelineView.jsx
 * Vertical day-schedule timeline for MindFocus.
 *
 * Bolt 5.1 (ADR 0017): Custom CSS implementation — no calendar library.
 * Receives tasks from useDayPlan.savedTasks, schedules them via
 * scheduleTimeline(), renders a scrollable vertical strip.
 *
 * ADHD design rules enforced:
 *   - No red colour for late/overdue tasks (auto-shift shows them neutral)
 *   - Completed tasks are dimmed (opacity), not removed — visible progress
 *   - Buffer blocks = "breathing room", not "lost time"
 *   - Touch targets ≥ 44×44px on all interactive elements
 *   - Empty state = mentor invitation, not an accusation
 *
 * Bolt 5.2 hook point: <BufferBlock> renders data-buffer-slot="true" so the
 * Focus Audio module can attach Web Audio playback to break intervals.
 */

import { useMemo } from "react";
import { C }       from "../../skeleton/design-system/tokens.js";
import { scheduleTimeline, formatHHMM, formatDuration } from "./lib/scheduleTimeline.js";

// ── Priority badge config ──────────────────────────────────────────────────
const PRIORITY_COLORS = {
  high:   { bg: `${C.high}20`,   border: `${C.high}55`,   text: C.high   },
  medium: { bg: `${C.medium}20`, border: `${C.medium}55`, text: C.medium },
  low:    { bg: `${C.done}20`,   border: `${C.done}55`,   text: C.done   },
};

// ── Pixel scale: 1 minute = 2px, min height = 48px ────────────────────────
const PX_PER_MIN = 2;
const MIN_HEIGHT  = 48;

function blockHeight(minutes) {
  return Math.max(MIN_HEIGHT, (minutes ?? 25) * PX_PER_MIN);
}

// ── Sub-components ────────────────────────────────────────────────────────

/**
 * Left-aligned time label column.
 * @param {{ time: string }} props
 */
function TimeLabel({ time }) {
  return (
    <div
      style={{
        width:       48,
        flexShrink:  0,
        paddingTop:  14,
        paddingRight: 8,
        textAlign:   "right",
        color:        C.textSub,
        fontSize:     11,
        fontWeight:   600,
        letterSpacing: 0.3,
        userSelect:  "none",
      }}
    >
      {time}
    </div>
  );
}

/**
 * Priority badge pill.
 * @param {{ priority: string, lang: string }} props
 */
function PriorityBadge({ priority, lang }) {
  const cfg = PRIORITY_COLORS[priority];
  if (!cfg) return null;

  const labels = {
    high:   { en: "High",   ru: "Высокий",  az: "Yüksək" },
    medium: { en: "Medium", ru: "Средний",  az: "Orta"   },
    low:    { en: "Low",    ru: "Низкий",   az: "Aşağı"  },
  };
  const label = labels[priority]?.[lang] ?? labels[priority]?.en ?? priority;

  return (
    <div style={{
      display:      "inline-flex",
      alignItems:   "center",
      background:   cfg.bg,
      border:       `1px solid ${cfg.border}`,
      color:        cfg.text,
      borderRadius: 6,
      padding:      "2px 7px",
      fontSize:     10,
      fontWeight:   700,
      letterSpacing: 0.4,
      textTransform: "uppercase",
      flexShrink:   0,
    }}>
      {label}
    </div>
  );
}

/**
 * Connector line between blocks.
 */
function Connector() {
  return (
    <div style={{
      width:       2,
      height:     12,
      background:  C.border,
      marginLeft:  56, // aligns with center of TimeLabel column + connector
      flexShrink:  0,
    }} />
  );
}

/**
 * Task block — renders a single daily_tasks row on the timeline.
 *
 * @param {{
 *   item: import('./lib/scheduleTimeline.js').ScheduledItem,
 *   lang: string,
 *   onToggle: (taskId: string) => void,
 * }} props
 */
function TaskBlock({ item, lang, onToggle }) {
  const height  = blockHeight(item.estimated_minutes);
  const isDone  = !!item.completed;

  return (
    <div style={{ display: "flex", alignItems: "flex-start" }}>
      {/* Time label */}
      <TimeLabel time={formatHHMM(item.scheduledStart)} />

      {/* Card */}
      <div
        style={{
          flex:         1,
          minHeight:    height,
          background:   isDone ? `${C.surface}80` : C.surface,
          border:       `1px solid ${isDone ? C.border : C.borderHi}`,
          borderRadius: 12,
          padding:      "10px 14px",
          display:      "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          opacity:       isDone ? 0.5 : 1,
          transition:    "opacity .2s ease",
          cursor:        "default",
        }}
      >
        {/* Top row: checkbox + title */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          {/* Checkbox — ≥ 44×44px touch target */}
          <button
            onClick={() => onToggle?.(item.id)}
            aria-label={isDone
              ? (lang === "ru" ? "Отметить как невыполненное" : lang === "az" ? "Tamamlanmamış kimi işarələ" : "Mark as incomplete")
              : (lang === "ru" ? "Отметить как выполненное"   : lang === "az" ? "Tamamlanmış kimi işarələ"   : "Mark as complete")}
            style={{
              width:        28,
              height:       28,
              minWidth:     28,
              minHeight:    28,
              // Expanded tap area via padding so touch target ≥ 44px
              padding:      8,
              margin:       -8,
              background:   "transparent",
              border:       `2px solid ${isDone ? C.done : C.borderHi}`,
              borderRadius: 8,
              display:      "flex",
              alignItems:   "center",
              justifyContent: "center",
              cursor:       "pointer",
              flexShrink:   0,
              color:        C.done,
              fontSize:     14,
              fontFamily:   "inherit",
              transition:   "border-color .15s, background .15s",
            }}
          >
            {isDone ? "✓" : ""}
          </button>

          {/* Title */}
          <div style={{
            flex:          1,
            color:         isDone ? C.textSub : C.text,
            fontSize:      14,
            fontWeight:    isDone ? 400 : 600,
            lineHeight:    1.4,
            textDecoration: isDone ? "line-through" : "none",
            paddingTop:    2,
          }}>
            {isDone && <span style={{ marginRight: 6 }}>✅</span>}
            {item.title}
          </div>
        </div>

        {/* Bottom row: duration + priority badge */}
        <div style={{
          display:      "flex",
          alignItems:   "center",
          gap:           8,
          marginTop:     8,
          flexWrap:     "wrap",
        }}>
          {/* Duration chip */}
          <span style={{
            color:        C.textSub,
            fontSize:     11,
            fontWeight:   500,
          }}>
            ⏱ {formatDuration(item.estimated_minutes)}
          </span>

          {/* Priority badge */}
          {item.priority && <PriorityBadge priority={item.priority} lang={lang} />}
        </div>
      </div>
    </div>
  );
}

/**
 * Buffer (break) block — 15-min breathing room between tasks.
 * Bolt 5.2 hook: data-buffer-slot="true" + data-start/end timestamps.
 *
 * @param {{ item: import('./lib/scheduleTimeline.js').ScheduledItem }} props
 */
function BufferBlock({ item }) {
  return (
    <div
      style={{ display: "flex", alignItems: "flex-start" }}
      data-buffer-slot="true"
      data-start={item.scheduledStart.toISOString()}
      data-end={item.scheduledEnd.toISOString()}
    >
      {/* Dimmed time */}
      <TimeLabel time={formatHHMM(item.scheduledStart)} />

      {/* Break pill */}
      <div style={{
        flex:         1,
        minHeight:    MIN_HEIGHT,
        background:   `${C.accent}08`,
        border:       `1px dashed ${C.accent}30`,
        borderRadius: 10,
        padding:      "10px 14px",
        display:      "flex",
        alignItems:   "center",
        gap:           10,
      }}>
        <span style={{ fontSize: 18 }}>☕</span>
        <div>
          <div style={{
            color:      C.textSub,
            fontSize:   12,
            fontWeight: 600,
          }}>
            Пауза · Break
          </div>
          <div style={{
            color:    C.textDim,
            fontSize: 11,
          }}>
            {formatDuration(item.estimated_minutes)}
            {/* Bolt 5.2: Focus Audio attaches here */}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Empty state — shown when no tasks are scheduled today.
 * Soft, mentor-voice invitation — not an accusation or warning.
 *
 * @param {{ lang: string, onGoToDump?: () => void }} props
 */
function EmptyState({ lang, onGoToDump }) {
  const msgs = {
    ru: {
      title: "Расписание дня пусто",
      sub:   "Накидай мысли в Brain Dump, и ментор поможет разобрать их в план",
      cta:   "→ Brain Dump",
    },
    az: {
      title: "Günün planı boşdur",
      sub:   "Brain Dump-a fikirlər yaz, mentor plana çevirməkdə kömək edəcək",
      cta:   "→ Brain Dump",
    },
    en: {
      title: "No tasks scheduled today",
      sub:   "Dump your thoughts first — your mentor will help turn them into a plan",
      cta:   "→ Brain Dump",
    },
  };

  const m = msgs[lang] || msgs.en;

  return (
    <div style={{
      textAlign:    "center",
      padding:      "32px 16px",
      background:   `${C.accent}08`,
      border:       `1px dashed ${C.accent}30`,
      borderRadius: 14,
    }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>🗓️</div>
      <div style={{ color: C.text, fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
        {m.title}
      </div>
      <div style={{ color: C.textSub, fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>
        {m.sub}
      </div>
      {onGoToDump ? (
        <button
          onClick={onGoToDump}
          style={{
            background:   `${C.accent}20`,
            border:       `1px solid ${C.accent}55`,
            color:         C.accent,
            borderRadius:  10,
            padding:      "10px 20px",
            fontSize:      13,
            fontWeight:    700,
            cursor:       "pointer",
            fontFamily:   "inherit",
            minHeight:     44, // touch target
          }}
        >
          {m.cta}
        </button>
      ) : (
        <div style={{
          color:      C.accent,
          fontSize:   13,
          fontWeight: 700,
        }}>
          {m.cta}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

/**
 * TimelineView — vertical day-schedule strip for TodayScreen.
 *
 * @param {{
 *   tasks:       import('../useDayPlan.js').DailyTask[],
 *   lang:        string,
 *   onToggle:    (taskId: string) => void,
 *   onGoToDump?: () => void,
 * }} props
 */
export function TimelineView({ tasks = [], lang = "en", onToggle, onGoToDump }) {
  // Recompute schedule whenever tasks or the minute changes.
  // useMemo is keyed on tasks array identity — updated by useDayPlan on toggle.
  const scheduled = useMemo(
    () => scheduleTimeline(tasks),
    [tasks]  // eslint-disable-line react-hooks/exhaustive-deps
  );

  const sectionLabel = {
    ru: "Расписание дня",
    az: "Günün planı",
    en: "Day Schedule",
  }[lang] ?? "Day Schedule";

  return (
    <div style={{ marginTop: 8 }}>
      {/* Section header */}
      <div style={{
        display:       "flex",
        alignItems:    "center",
        gap:            8,
        marginBottom:  12,
      }}>
        <span style={{ fontSize: 15 }}>🗓️</span>
        <span style={{
          color:         C.textSub,
          fontSize:      12,
          fontWeight:    700,
          letterSpacing: 0.5,
          textTransform: "uppercase",
        }}>
          {sectionLabel}
        </span>
      </div>

      {/* Empty state */}
      {tasks.length === 0 && (
        <EmptyState lang={lang} onGoToDump={onGoToDump} />
      )}

      {/* Timeline strip */}
      {tasks.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {scheduled.map((item, idx) => (
            <div key={item.id}>
              {item.isBuffer
                ? <BufferBlock item={item} />
                : <TaskBlock   item={item} lang={lang} onToggle={onToggle} />
              }
              {/* Thin connector line between all items */}
              {idx < scheduled.length - 1 && <Connector />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
