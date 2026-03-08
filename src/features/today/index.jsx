/**
 * features/today/index.jsx
 * Today screen — focus on today's tasks.
 *
 * Exports: TodayScreen
 *
 * Bolt 2.1: ADHD-aware-planning compliance (Principles 2, 5, 7).
 *   - Soft cap ≤ 5 visible tasks via useToday
 *   - WelcomeBack shown once per session when away > 2 days
 *   - Shame-free motiveLine: no loss-aversion streak language (⚠️ removed)
 *   - TodayList: step_one visible, decompose button, quiet done action
 *   - Streak badge is informational only, no warning color
 *
 * Bolt 2.2: AI Day Plan section added (DayPlanDump → DayPlanReview → DayPlanTaskList).
 *   - useDayPlan: idle → processing → review → saved
 *   - daily_tasks Supabase table (separate from thoughts)
 *   - Optimistic checkbox updates
 *
 * Bolt 1.5: originally extracted from mindflow.jsx lines 677–809.
 */

import { useState, useMemo } from "react";
import { C }              from "../../skeleton/design-system/tokens.js";
import { T }              from "../../shared/i18n/translations.js";
import { ThoughtCard }    from "../../shared/ui/ThoughtCard.jsx";
import { Spinner }        from "../../shared/ui/primitives.jsx";
import { isToday, todayLabel } from "../../shared/lib/date.js";
import { getStreakData }  from "../../shared/lib/streak.js";
import { aiFocusSuggest } from "../../shared/services/claude.js";
import { logError }       from "../../shared/lib/logger.js";
import { useUsageLimits } from "../../shared/hooks/useUsageLimits.js";
import { useToday }       from "./useToday.js";
import { WelcomeBack }    from "./WelcomeBack.jsx";
import { TodayList }      from "./TodayList.jsx";
import { useDayPlan }     from "./useDayPlan.js";
import { DayPlanDump }    from "./DayPlanDump.jsx";
import { DayPlanReview }  from "./DayPlanReview.jsx";
import { DayPlanTaskList } from "./DayPlanTaskList.jsx";
import { PersonaCard }    from "../../shared/ui/PersonaCard.jsx";
import { ChatBubble }       from "./ChatBubble.jsx";
import { ChatPanel }        from "./ChatPanel.jsx";
// Bolt 5.1 — Timeline View (ADR 0017)
import { TimelineView }     from "./TimelineView.jsx";
import { getGreeting, getTimePeriod } from "../../shared/lib/dialogues.js";
import { ARCHETYPE_COLORS } from "../../shared/lib/archetypes.js";
import { useCharacterProgress } from "../../shared/hooks/useCharacterProgress.js";
// Bolt 4.1 — XP system (ADR 0013)
import { calcXpGain }   from "../../shared/lib/persona.js";
import { LevelUpToast } from "../../shared/ui/LevelUpToast.jsx";

export function TodayScreen({ thoughts, onArchive, onToggleToday, onUpdate, lang, persona, user, personaArchetype, personaName }) {
  const tx = T[lang] || T.en;

  // ── useToday: soft cap, welcome-back, decompose ─────────────────────────────
  const {
    activeTasks,
    visibleTasks,
    hiddenCount,
    expandAll,
    setExpandAll,
    completeTask,
    archiveTask,
    decomposeTask,
    decomposing,
    shouldShowWelcome,
    dismissWelcome,
  } = useToday({ thoughts, onArchive, onUpdate, lang, persona });

  // ── useUsageLimits: freemium gate (Bolt 2.5) ───────────────────────────────
  const { checkAndIncrement } = useUsageLimits(user);

  // ── Character progress: level for persona dialogue context (Bolt 3.2) ──────
  // Bolt 4.1: also destructure addXp + levelUpPayload for XP call sites
  const { level, addXp, levelUpPayload } = useCharacterProgress(user);

  // ── Persona chat state (Bolt 3.2 — AC3) ────────────────────────────────────
  const [showChat, setShowChat] = useState(false);

  // ── useDayPlan: AI-powered daily plan (Bolt 2.2) ───────────────────────────
  const [dayPlanText, setDayPlanText] = useState("");
  const {
    status:         dayPlanStatus,
    proposed:       dayPlanProposed,
    errorMsg:       dayPlanError,
    limitMsg:       dayPlanLimitMsg,
    savedTasks:     dayPlanTasks,
    loadingTasks:   dayPlanLoading,
    submitDayPlan,
    toggleItem:     toggleDayPlanItem,
    acceptAll:      acceptAllDayPlan,
    confirmPlan,
    cancelReview:   cancelDayPlanReview,
    toggleSavedTask,
    clearPlan,
  } = useDayPlan({ lang, persona, user, checkAndIncrement });

  // ── Derived lists not covered by useToday ──────────────────────────────────
  const doneToday   = useMemo(() => thoughts.filter(t => t.archived && isToday(t.archivedAt || t.updatedAt)), [thoughts]);
  const tgThoughts  = useMemo(() => thoughts.filter(t => !t.archived && t.source === "telegram"), [thoughts]);
  const unscheduled = useMemo(() => thoughts.filter(t => !t.isToday && !t.archived && t.type === "task"), [thoughts]);
  const streak      = useMemo(() => getStreakData(thoughts), [thoughts]);

  const total = activeTasks.length + doneToday.length;
  const pct   = total > 0 ? Math.round(doneToday.length / total * 100) : 0;

  // ── AI Focus suggestion ────────────────────────────────────────────────────
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [aiLoading, setAiLoading]       = useState(false);

  const getSuggestions = async () => {
    const pool = [...activeTasks, ...unscheduled];
    if (!pool.length) return;
    setAiLoading(true);
    try { setAiSuggestion(await aiFocusSuggest(pool, lang, persona)); }
    catch (e) { logError("TodayScreen.getSuggestions", e); setAiSuggestion(null); }
    setAiLoading(false);
  };

  // ── Shame-free motivation line (Bolt 2.1: no loss-aversion streak language) ─
  // Principle 2: no ⚠️ "don't lose your streak" warnings.
  // Just calm, factual positive feedback when tasks are done.
  const motiveLine = () => {
    if (pct === 100 && doneToday.length > 0)
      return lang === "ru" ? "Отличная работа сегодня."
           : lang === "az" ? "Bu gün əla iş gördün."
           : "Great work today.";
    if (doneToday.length > 0 && activeTasks.length > 0)
      return lang === "ru" ? `${doneToday.length} выполнено.`
           : lang === "az" ? `${doneToday.length} tamamlandı.`
           : `${doneToday.length} done.`;
    return null;
  };
  const motive = motiveLine();

  // ── Persona: archetype color + auto-greeting (Bolt 3.2 — AC2) ─────────────
  const archetypeColor = personaArchetype ? (ARCHETYPE_COLORS[personaArchetype] || C.accent) : null;
  // "celebrated" when all tasks done; "active" when there are tasks in flight; "idle" otherwise
  const chatMood = pct === 100 && total > 0 ? "celebrated"
                 : activeTasks.length > 0   ? "active"
                 : "idle";
  // Greeting computed once per render — stable because getTimePeriod() uses hours (≤ 1hr drift)
  const greeting = personaArchetype
    ? getGreeting(personaArchetype, getTimePeriod(), chatMood, lang)
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Bolt 4.1 — Level Up toast (auto-dismissed by hook after 2.5s) */}
      {levelUpPayload && (
        <LevelUpToast
          newLevel={levelUpPayload.newLevel}
          color={archetypeColor || undefined}
          lang={lang}
        />
      )}

      {/* ── Header ── */}
      <div style={{ padding: "18px 18px 14px", flexShrink: 0 }}>
        <div style={{ color: C.textSub, fontSize: 13, marginBottom: 3 }}>{todayLabel(lang)}</div>

        <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
          <div style={{ color: C.text, fontSize: 24, fontWeight: 700, letterSpacing: -.5, flex: 1 }}>
            {tx.today}
          </div>

          {/* Streak badge — informational only, neutral color (no warning) */}
          {streak.current > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 5,
              background: `${C.accent}18`,
              border: `1px solid ${C.accent}33`,
              borderRadius: 10, padding: "4px 10px", marginRight: 8,
            }}>
              <span style={{ fontSize: 14 }}>🔥</span>
              <span style={{ color: C.accent, fontSize: 13, fontWeight: 700 }}>{streak.current}</span>
            </div>
          )}

          {/* AI Focus button */}
          <button
            onClick={getSuggestions}
            disabled={aiLoading}
            style={{
              background: C.accentDim, color: C.accent,
              border: `1px solid ${C.accent}44`,
              borderRadius: 10, padding: "6px 12px",
              fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {aiLoading ? <><Spinner size={12} color={C.accent} /> AI...</> : "🎯 AI Focus"}
          </button>
        </div>

        {/* Shame-free motive line — neutral text, no warning emoji */}
        {motive && (
          <div style={{ color: C.textSub, fontSize: 12, fontWeight: 500, marginBottom: 10 }}>
            {motive}
          </div>
        )}

        {/* Telegram captured thoughts badge */}
        {tgThoughts.length > 0 && (
          <div style={{
            background: "#2AABEE15", border: "1px solid #2AABEE33",
            borderRadius: 10, padding: "7px 12px", marginBottom: 12,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ color: "#2AABEE", fontSize: 13 }}>✈️</span>
            <span style={{ color: "#2AABEE", fontSize: 12, fontWeight: 600, flex: 1 }}>
              {lang === "ru"
                ? `${tgThoughts.length} мысл${tgThoughts.length === 1 ? "ь" : "и"} из Telegram`
                : lang === "az"
                ? `Telegram-dan ${tgThoughts.length} fikir`
                : `${tgThoughts.length} thought${tgThoughts.length !== 1 ? "s" : ""} from Telegram`}
            </span>
            <button
              onClick={() => tgThoughts.forEach(t => onToggleToday?.(t.id))}
              style={{
                background: "#2AABEE22", border: "1px solid #2AABEE44",
                color: "#2AABEE", borderRadius: 7, padding: "3px 10px",
                fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                flexShrink: 0,
              }}
            >
              {lang === "ru" ? "+ в сегодня" : lang === "az" ? "+ bu günə" : "+ add all"}
            </button>
          </div>
        )}

        {/* AI Focus suggestion panel */}
        {aiSuggestion?.picks?.length > 0 && (
          <div style={{
            background: `${C.accent}12`, border: `1px solid ${C.accent}33`,
            borderRadius: 12, padding: "10px 14px", marginBottom: 12,
          }}>
            <div style={{ color: C.accent, fontSize: 11, fontWeight: 600, marginBottom: 6 }}>
              🤖 {lang === "ru" ? "AI рекомендует:" : lang === "az" ? "AI tövsiyə edir:" : "AI suggests focusing on:"}
            </div>
            {aiSuggestion.picks.map((p, i) => (
              <div key={i} style={{ color: C.text, fontSize: 13, padding: "2px 0" }}>• {p}</div>
            ))}
            {aiSuggestion.reason && (
              <div style={{ color: C.textSub, fontSize: 12, marginTop: 6, fontStyle: "italic" }}>
                {aiSuggestion.reason}
              </div>
            )}
            <button
              onClick={() => setAiSuggestion(null)}
              style={{ background: "none", border: "none", color: C.textDim, fontSize: 11, cursor: "pointer", marginTop: 4, fontFamily: "inherit" }}
            >
              ✕ dismiss
            </button>
          </div>
        )}

        {/* Progress bar */}
        {total > 0 && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: C.textSub, fontSize: 12 }}>
                {doneToday.length} {tx.of} {total} {tx.doneOf}
              </span>
              <span style={{ color: pct === 100 ? C.done : C.accent, fontSize: 12, fontWeight: 600 }}>
                {pct}%
              </span>
            </div>
            <div style={{ background: C.surface, borderRadius: 4, height: 4, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${pct}%`,
                background: pct === 100 ? C.done : C.accent,
                borderRadius: 4, transition: "width .6s ease",
              }} />
            </div>
          </>
        )}
      </div>

      {/* ── Scrollable content ── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 80px" }}>

        {/* WelcomeBack — shown once per session when away > 2 days */}
        {shouldShowWelcome && (
          <WelcomeBack
            lang={lang}
            onDismiss={dismissWelcome}
          />
        )}

        {/* ── Persona Card (Bolt 3.1) — archetype avatar + level + phrase ── */}
        {personaArchetype && (
          <PersonaCard
            archetype={personaArchetype}
            name={personaName}
            user={user}
            lang={lang}
            mood={chatMood}
          />
        )}

        {/* ── Auto-greeting bubble (Bolt 3.2 — AC2) ── */}
        {personaArchetype && greeting && !showChat && (
          <ChatBubble
            text={greeting}
            senderName={personaName || personaArchetype}
            color={archetypeColor}
          />
        )}

        {/* ── Talk button (Bolt 3.2 — AC3) ── */}
        {personaArchetype && !showChat && (
          <button
            onClick={() => setShowChat(true)}
            style={{
              display:      "block",
              width:        "100%",
              background:   `${archetypeColor}18`,
              border:       `1px solid ${archetypeColor}44`,
              color:        archetypeColor,
              borderRadius: 12,
              padding:      "10px 14px",
              fontSize:     13,
              fontWeight:   600,
              cursor:       "pointer",
              fontFamily:   "inherit",
              marginBottom: 12,
              textAlign:    "center",
              transition:   "background .15s",
            }}
          >
            {lang === "ru" ? "Поговорить"
           : lang === "az" ? "Danış"
           : "Talk"}
          </button>
        )}

        {/* ── Chat panel (Bolt 3.2 — AC3, AC5–AC9) ── */}
        {personaArchetype && showChat && (
          <ChatPanel
            archetype={personaArchetype}
            archetypeName={personaName || personaArchetype}
            archetypeColor={archetypeColor}
            lang={lang}
            user={user}
            level={level}
            completedTasks={doneToday.length}
            totalTasks={total}
            checkAndIncrement={checkAndIncrement}
            onClose={() => setShowChat(false)}
            addXp={addXp}
          />
        )}

        {/* ── Day Plan section (Bolt 2.2) ── */}
        <div style={{ marginBottom: 24 }}>
          {/* Loading skeleton */}
          {dayPlanLoading && (
            <div style={{
              background: C.surface, borderRadius: 14,
              border: `1px solid ${C.border}`,
              padding: "14px 16px",
              display: "flex", alignItems: "center", gap: 10,
              color: C.textSub, fontSize: 13,
            }}>
              <Spinner size={14} color={C.textSub} />
              {lang === "ru" ? "Загружаю план..." : lang === "az" ? "Plan yüklənir..." : "Loading plan..."}
            </div>
          )}

          {/* Input — shown when no saved tasks and not in review */}
          {!dayPlanLoading && dayPlanTasks.length === 0 && dayPlanStatus !== "review" && (
            <DayPlanDump
              text={dayPlanText}
              setText={setDayPlanText}
              onSubmit={() => submitDayPlan(dayPlanText)}
              isProcessing={dayPlanStatus === "processing"}
              errorMsg={dayPlanError}
              limitMsg={dayPlanLimitMsg}
              lang={lang}
            />
          )}

          {/* Review panel — human-in-the-loop */}
          {dayPlanStatus === "review" && (
            <DayPlanReview
              proposed={dayPlanProposed}
              onToggle={toggleDayPlanItem}
              onAcceptAll={acceptAllDayPlan}
              onConfirm={async () => {
                await confirmPlan();
                setDayPlanText("");
                // Bolt 4.1 — XP for planning activity (ADR 0013, activity-based)
                if (user?.id) addXp(calcXpGain("day_plan_accepted"));
              }}
              onCancel={cancelDayPlanReview}
              lang={lang}
            />
          )}

          {/* Task checklist — shown once plan is saved */}
          {!dayPlanLoading && dayPlanTasks.length > 0 && dayPlanStatus !== "review" && (
            <DayPlanTaskList
              tasks={dayPlanTasks}
              onToggle={toggleSavedTask}
              onClearPlan={clearPlan}
              lang={lang}
            />
          )}
        </div>

        {/* ── Timeline View — Bolt 5.1 (ADR 0017) ── */}
        {/* Renders below the DayPlan section, receives saved tasks from useDayPlan. */}
        {/* onGoToDump intentionally omitted for MVP — see ADR 0017 note on navigation. */}
        <TimelineView
          tasks={dayPlanTasks}
          lang={lang}
          onToggle={toggleSavedTask}
        />

        {/* ── Separator between day plan and thought-based tasks ── */}
        {(activeTasks.length > 0 || dayPlanTasks.length > 0) && (
          <div style={{
            borderTop: `1px solid ${C.border}`,
            marginTop: 20,
            marginBottom: 16,
            opacity: 0.5,
          }} />
        )}

        {/* Task list — soft-capped by useToday, or all-done/empty state */}
        {activeTasks.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: 50 }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>
              {doneToday.length > 0 ? "🎉" : "✅"}
            </div>
            <div style={{ color: C.text, fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
              {doneToday.length > 0 ? tx.allDone : tx.noToday}
            </div>
            <div style={{ color: C.textSub, fontSize: 13 }}>
              {doneToday.length > 0 ? `${doneToday.length} ${tx.doneOf} 💪` : tx.noTodaySub}
            </div>
          </div>
        ) : (
          <TodayList
            tasks={visibleTasks}
            hiddenCount={hiddenCount}
            expandAll={expandAll}
            setExpandAll={setExpandAll}
            onComplete={completeTask}
            onArchive={archiveTask}
            onDecompose={decomposeTask}
            decomposing={decomposing}
            lang={lang}
          />
        )}

        {/* Done today — shown when some tasks remain active */}
        {doneToday.length > 0 && activeTasks.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{
              color: C.textDim, fontSize: 11, fontWeight: 600,
              letterSpacing: .5, textTransform: "uppercase", marginBottom: 8,
            }}>
              {tx.completedToday}
            </div>
            {doneToday.map(t => (
              <div key={t.id} style={{
                background: C.surface, borderRadius: 12,
                padding: "9px 14px", marginBottom: 8,
                opacity: .4, border: `1px solid ${C.border}`,
              }}>
                <span style={{ color: C.done, fontSize: 12, marginRight: 8 }}>✓</span>
                <span style={{ color: C.textSub, fontSize: 14, textDecoration: "line-through" }}>
                  {t.text}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
