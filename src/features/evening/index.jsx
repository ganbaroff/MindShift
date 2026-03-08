/**
 * features/evening/index.jsx
 * Evening Review screen — daily task list, AI reflection, XP award.
 *
 * Bolt 2.4:
 *   - Loads today's daily_tasks from Supabase (completed vs incomplete)
 *   - Optional free-text textarea (not required)
 *   - "Как прошёл день?" → generateEveningReview → { reflection, xpEarned }
 *   - CharacterCard shows level + XP bar + +XP animation
 *   - No red for incomplete tasks — neutral grey only (ADHD P1, P2)
 *   - No streaks (ADHD P2)
 *   - EN / RU / AZ strings
 *
 * Exports: EveningScreen
 */

import { useState, useEffect, useCallback } from "react";
import { C }                        from "../../skeleton/design-system/tokens.js";
import { Spinner }                  from "../../shared/ui/primitives.jsx";
import { todayLabel }               from "../../shared/lib/date.js";
import { generateEveningReview }    from "../../shared/services/claude.js";
import { sbGetDailyTasks }          from "../../shared/services/supabase.js";
import { logError }                 from "../../shared/lib/logger.js";
import { useUsageLimits }           from "../../shared/hooks/useUsageLimits.js";
import { useCharacterProgress }     from "./useCharacterProgress.js";
import { CharacterCard }            from "./CharacterCard.jsx";
// Bolt 4.1 — XP system (ADR 0013)
import { calcXpGain }   from "../../shared/lib/persona.js";
import { LevelUpToast } from "../../shared/ui/LevelUpToast.jsx";

// ─────────────────────────────────────────────────────────────────────────────
// Strings
// ─────────────────────────────────────────────────────────────────────────────
const S = {
  en: {
    heading:       "Evening review",
    sub:           "End of day — no pressure.",
    todayTasks:    "Today's tasks",
    noTasks:       "No tasks were planned today.",
    noteLabel:     "Anything else on your mind? (optional)",
    notePH:        "Thoughts, observations, anything…",
    generateBtn:   "How did the day go?",
    thinking:      "Thinking…",
    reflectionHed: "Reflection",
    reflPH:        "Tap the button above for a personal reflection.",
    saveBtn:       "Save the day",
    savedBtn:      "Saved ✓",
    xpLabel:       "XP earned today",
  },
  ru: {
    heading:       "Вечерний обзор",
    sub:           "Конец дня — без давления.",
    todayTasks:    "Задачи дня",
    noTasks:       "Сегодня задачи не планировались.",
    noteLabel:     "Что ещё на уме? (необязательно)",
    notePH:        "Мысли, наблюдения, всё что угодно…",
    generateBtn:   "Как прошёл день?",
    thinking:      "Думаю…",
    reflectionHed: "Рефлексия",
    reflPH:        "Нажми кнопку выше для персональной рефлексии.",
    saveBtn:       "Сохранить день",
    savedBtn:      "Сохранено ✓",
    xpLabel:       "XP за день",
  },
  az: {
    heading:       "Axşam icmalı",
    sub:           "Günün sonu — heç bir təzyiq yoxdur.",
    todayTasks:    "Günün tapşırıqları",
    noTasks:       "Bu gün heç bir tapşırıq planlaşdırılmayıb.",
    noteLabel:     "Başqa düşüncələrin var? (istəyə görə)",
    notePH:        "Fikirlər, müşahidələr, istənilən şey…",
    generateBtn:   "Gün necə keçdi?",
    thinking:      "Düşünürəm…",
    reflectionHed: "Refleksiya",
    reflPH:        "Fərdi refleksiya üçün yuxarıdakı düyməni bas.",
    saveBtn:       "Günü saxla",
    savedBtn:      "Saxlanıldı ✓",
    xpLabel:       "Bu günkü XP",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// EveningScreen
// ─────────────────────────────────────────────────────────────────────────────
export function EveningScreen({ lang, persona, user }) {
  const tx = S[lang] || S.en;

  // Daily tasks
  const [tasks,        setTasks]        = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  // Review flow
  const [note,            setNote]            = useState("");
  const [reflection,      setReflection]      = useState(null);
  const [xpEarned,        setXpEarned]        = useState(null);
  const [aiLoading,       setAiLoading]       = useState(false);
  const [saved,           setSaved]           = useState(false);
  const [eveningLimitMsg, setEveningLimitMsg] = useState("");

  // Freemium gate (Bolt 2.5)
  const { checkAndIncrement } = useUsageLimits(user);

  // Character progress — Bolt 4.1: use addXp + levelUpPayload (replaces awardXp)
  const { totalXp, level, progressLoading, addXp, levelUpPayload } = useCharacterProgress(user);

  // ── Load today's tasks ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) { setTasksLoading(false); return; }
    sbGetDailyTasks(user.id, todayStr())
      .then(data => setTasks(data || []))
      .catch(e => logError("EveningScreen.loadTasks", e))
      .finally(() => setTasksLoading(false));
  }, [user?.id]);

  const doneTasks    = tasks.filter(t => t.completed);
  const pendingTasks = tasks.filter(t => !t.completed);

  // ── Generate AI reflection ────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (aiLoading || reflection) return;

    // Freemium gate (Bolt 2.5, ADR 0009) — increment BEFORE API call
    const { allowed } = await checkAndIncrement("evening_review");
    if (!allowed) {
      setEveningLimitMsg(
        lang === "ru" ? "Вечерний обзор — 1 раз в день. Завтра снова доступно."
        : lang === "az" ? "Axşam icmalı — gündə 1 dəfə. Sabah yenidən əlçatan."
        : "Evening review is once per day. Available again tomorrow."
      );
      return;
    }
    setEveningLimitMsg("");

    setAiLoading(true);
    try {
      const result = await generateEveningReview(
        doneTasks,
        pendingTasks,
        lang,
        persona,
        { plannedCount: tasks.length, noteWritten: note.trim().length > 0 }
      );
      setReflection(result.reflection);
      setXpEarned(result.xpEarned);
    } catch (e) {
      logError("EveningScreen.generate", e);
      const fallback = lang === "ru"
        ? "Что-то пошло не так. Ты всё равно молодец."
        : lang === "az"
        ? "Bir şey yanlış getdi. Yenə də əlindən gələni etdin."
        : "Something went wrong. You still showed up.";
      setReflection(fallback);
      setXpEarned(10);
    }
    setAiLoading(false);
  }, [aiLoading, reflection, doneTasks, pendingTasks, lang, persona, note, tasks.length, checkAndIncrement]);

  // ── Save day ──────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (saved) return;
    setSaved(true);
    // Bolt 4.1 — fixed 25 XP for evening review completion (ADR 0013)
    // Replaces variable xpEarned from AI (which is still displayed in UI for flavor)
    if (user?.id) {
      await addXp(calcXpGain("evening_review_completed"));
    }
  }, [saved, user?.id, addXp]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Bolt 4.1 — Level Up toast (auto-dismissed by hook after 2.5s) */}
      {levelUpPayload && (
        <LevelUpToast newLevel={levelUpPayload.newLevel} lang={lang} />
      )}

      {/* Header */}
      <div style={{ padding: "18px 18px 10px", flexShrink: 0 }}>
        <div style={{ color: C.textSub, fontSize: 13, marginBottom: 3 }}>{todayLabel(lang)}</div>
        <div style={{ color: C.text, fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>
          {tx.heading} 🌙
        </div>
        <div style={{ color: C.textSub, fontSize: 13, marginTop: 2 }}>{tx.sub}</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 100px" }}>

        {/* Character card */}
        {!progressLoading && (
          <CharacterCard
            level={level}
            totalXp={totalXp}
            xpEarned={saved ? xpEarned : null}
            lang={lang}
          />
        )}

        {/* ── Task list ─────────────────────────────────────────────────── */}
        <SectionLabel label={tx.todayTasks} />

        {tasksLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
            <Spinner size={20} color={C.accent} />
          </div>
        ) : tasks.length === 0 ? (
          <div style={{
            background: C.surface, borderRadius: 12, padding: "14px 16px",
            color: C.textSub, fontSize: 14, marginBottom: 12,
            border: `1px solid ${C.border}`,
          }}>
            {tx.noTasks}
          </div>
        ) : (
          <div style={{ marginBottom: 12 }}>
            {doneTasks.map(t => <TaskRow key={t.id} task={t} done />)}
            {/* Incomplete tasks — neutral grey, never red (ADHD P1, P2) */}
            {pendingTasks.map(t => <TaskRow key={t.id} task={t} done={false} />)}
          </div>
        )}

        {/* ── Optional note ──────────────────────────────────────────────── */}
        <SectionLabel label={tx.noteLabel} />
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder={tx.notePH}
          rows={3}
          style={{
            width: "100%", background: C.surface,
            border: `1px solid ${C.border}`, borderRadius: 12,
            color: C.text, fontSize: 14, lineHeight: 1.6,
            padding: "11px 14px", resize: "none", outline: "none",
            fontFamily: "inherit", boxSizing: "border-box", marginBottom: 12,
          }}
        />

        {/* ── Freemium limit banner (Bolt 2.5) ──────────────────────────── */}
        {eveningLimitMsg && (
          <div style={{
            background: C.surfaceHi,
            border: `1px solid ${C.borderHi}`,
            borderRadius: 10,
            padding: "10px 14px",
            color: C.textSub,
            fontSize: 13,
            fontWeight: 500,
            lineHeight: 1.5,
            marginBottom: 12,
          }}>
            {eveningLimitMsg}
          </div>
        )}

        {/* ── Generate button ────────────────────────────────────────────── */}
        <button
          onClick={handleGenerate}
          disabled={aiLoading || !!reflection || !!eveningLimitMsg}
          aria-label={tx.generateBtn}
          style={{
            width: "100%", minHeight: 48,
            background: reflection || eveningLimitMsg
              ? C.surface
              : aiLoading
              ? C.surfaceHi
              : `linear-gradient(135deg, ${C.accent}, ${C.accentLit})`,
            color:        reflection || eveningLimitMsg ? C.textSub : "white",
            border:       reflection || eveningLimitMsg ? `1px solid ${C.border}` : "none",
            borderRadius: 12, fontSize: 15, fontWeight: 700,
            cursor:       reflection || eveningLimitMsg ? "default" : aiLoading ? "not-allowed" : "pointer",
            fontFamily:   "inherit",
            display:      "flex", alignItems: "center", justifyContent: "center", gap: 8,
            boxShadow:    reflection || aiLoading || eveningLimitMsg ? "none" : `0 4px 20px ${C.accentGlow}`,
            transition:   "all .2s", marginBottom: 12,
          }}
        >
          {aiLoading
            ? <><Spinner size={14} color="white" /> {tx.thinking}</>
            : reflection
            ? `${tx.reflectionHed} ✓`
            : tx.generateBtn}
        </button>

        {/* ── Reflection result ──────────────────────────────────────────── */}
        {reflection && (
          <div style={{
            background: C.surface, borderRadius: 12, padding: "14px 16px",
            border: `1px solid ${C.border}`, marginBottom: 12,
          }}>
            <div style={{
              color: C.textSub, fontSize: 11, fontWeight: 600,
              letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8,
            }}>
              {tx.reflectionHed}
            </div>
            <p style={{ color: C.text, fontSize: 14, lineHeight: 1.75, margin: 0 }}>
              {reflection}
            </p>
            {xpEarned && (
              <div style={{
                marginTop: 10, display: "flex", alignItems: "center", gap: 6,
                color: C.accentLit, fontSize: 13, fontWeight: 700,
              }}>
                <span>+{xpEarned} xp</span>
                <span style={{ color: C.textSub, fontWeight: 400 }}>— {tx.xpLabel}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Save button ────────────────────────────────────────────────── */}
        {reflection && (
          <button
            onClick={handleSave}
            disabled={saved}
            aria-label={saved ? tx.savedBtn : tx.saveBtn}
            style={{
              width: "100%", minHeight: 48,
              background:   saved ? `${C.done}18` : C.accent,
              color:        saved ? C.done : "white",
              border:       saved ? `1px solid ${C.done}44` : "none",
              borderRadius: 12, fontSize: 15, fontWeight: 700,
              cursor:       saved ? "default" : "pointer",
              fontFamily:   "inherit", transition: "all .2s", marginBottom: 4,
            }}
          >
            {saved ? tx.savedBtn : tx.saveBtn}
          </button>
        )}

        {/* ── Reflection placeholder ─────────────────────────────────────── */}
        {!reflection && (
          <p style={{
            color: C.textDim, fontSize: 13, fontStyle: "italic",
            textAlign: "center", margin: "4px 0 16px",
          }}>
            {tx.reflPH}
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SectionLabel({ label }) {
  return (
    <div style={{
      color: C.textSub, fontSize: 11, fontWeight: 600,
      letterSpacing: 0.5, textTransform: "uppercase",
      marginBottom: 8, marginTop: 4,
    }}>
      {label}
    </div>
  );
}

/**
 * Single task row — done tasks in C.done green, incomplete in neutral grey.
 * Never red for incomplete (ADHD P1 — no shame, no urgency colour for missed tasks).
 */
function TaskRow({ task, done }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 14px", background: C.surface,
      borderRadius: 10, marginBottom: 6, border: `1px solid ${C.border}`,
    }}>
      <div style={{
        width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
        background: done ? C.done : C.textSub,
        opacity:    done ? 1 : 0.35,
      }} />
      <span style={{
        color: done ? C.text : C.textSub, fontSize: 14, lineHeight: 1.4, flex: 1,
      }}>
        {task.title || task.text}
      </span>
    </div>
  );
}
