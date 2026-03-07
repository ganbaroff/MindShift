/**
 * features/today/index.jsx
 * Today screen — focus on today's tasks, streak, AI focus suggestions.
 *
 * Exports: TodayScreen
 *
 * Bolt 1.5: extracted from mindflow.jsx lines 677–809.
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

export function TodayScreen({ thoughts, onArchive, onToggleToday, onUpdate, lang, persona }) {
  const tx = T[lang] || T.en;

  // useMemo: avoid recomputing on every render
  const active      = useMemo(() => thoughts.filter(t => t.isToday && !t.archived), [thoughts]);
  const doneToday   = useMemo(() => thoughts.filter(t => t.archived && isToday(t.archivedAt || t.updatedAt)), [thoughts]);
  const tgThoughts  = useMemo(() => thoughts.filter(t => !t.archived && t.source === "telegram"), [thoughts]);
  const unscheduled = useMemo(() => thoughts.filter(t => !t.isToday && !t.archived && t.type === "task"), [thoughts]);
  const streak      = useMemo(() => getStreakData(thoughts), [thoughts]);

  const total = active.length + doneToday.length;
  const pct   = total > 0 ? Math.round(doneToday.length / total * 100) : 0;

  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [aiLoading, setAiLoading]       = useState(false);

  const getSuggestions = async () => {
    const pool = [...active, ...unscheduled];
    if (!pool.length) return;
    setAiLoading(true);
    try { setAiSuggestion(await aiFocusSuggest(pool, lang, persona)); }
    catch (e) { logError("TodayScreen.getSuggestions", e); setAiSuggestion(null); }
    setAiLoading(false);
  };

  // Streak motivational line — loss aversion (Duolingo-style)
  const motiveLine = () => {
    if (!streak.doneToday && streak.current > 0) {
      return lang === "ru"
        ? `⚠️ Не потеряй ${streak.current}-дневную серию — сделай дамп сегодня`
        : lang === "az"
        ? `⚠️ ${streak.current} günlük seriyani itirmə — bu gün dump et`
        : `⚠️ Don't lose your ${streak.current}-day streak — dump something today`;
    }
    if (pct === 100 && doneToday.length > 0) return lang === "ru" ? "Всё готово. Серия продолжается 🔥" : lang === "az" ? "Hər şey hazırdır. Seriya davam edir 🔥" : "All done. Streak alive 🔥";
    if (doneToday.length > 0 && active.length > 0) return lang === "ru" ? `${doneToday.length} выполнено — серия жива 🔥` : lang === "az" ? `${doneToday.length} tamamlandı — seriya davam edir 🔥` : `${doneToday.length} done — streak alive 🔥`;
    return null;
  };
  const motive = motiveLine();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "18px 18px 14px", flexShrink: 0 }}>
        <div style={{ color: C.textSub, fontSize: 13, marginBottom: 3 }}>{todayLabel(lang)}</div>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
          <div style={{ color: C.text, fontSize: 24, fontWeight: 700, letterSpacing: -.5, flex: 1 }}>{tx.today}</div>
          {streak.current > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, background: streak.doneToday ? `${C.done}18` : `${C.high}18`, border: `1px solid ${streak.doneToday ? C.done : C.high}44`, borderRadius: 10, padding: "4px 10px", marginRight: 8 }}>
              <span style={{ fontSize: 14 }}>🔥</span>
              <span style={{ color: streak.doneToday ? C.done : C.high, fontSize: 13, fontWeight: 700 }}>{streak.current}</span>
            </div>
          )}
          <button onClick={getSuggestions} disabled={aiLoading} style={{ background: C.accentDim, color: C.accent, border: `1px solid ${C.accent}44`, borderRadius: 10, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
            {aiLoading ? <><Spinner size={12} color={C.accent} /> AI...</> : "🎯 AI Focus"}
          </button>
        </div>

        {motive && (
          <div style={{ color: streak.doneToday ? C.done : C.high, fontSize: 12, fontWeight: 600, marginBottom: 10 }}>{motive}</div>
        )}

        {/* Telegram captured thoughts badge */}
        {tgThoughts.length > 0 && (
          <div style={{ background: "#2AABEE15", border: "1px solid #2AABEE33", borderRadius: 10, padding: "7px 12px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#2AABEE", fontSize: 13 }}>✈️</span>
            <span style={{ color: "#2AABEE", fontSize: 12, fontWeight: 600, flex: 1 }}>
              {lang === "ru"
                ? `${tgThoughts.length} мысл${tgThoughts.length === 1 ? "ь" : "и"} из Telegram`
                : lang === "az"
                ? `Telegram-dan ${tgThoughts.length} fikir`
                : `${tgThoughts.length} thought${tgThoughts.length !== 1 ? "s" : ""} from Telegram`}
            </span>
            <button onClick={() => tgThoughts.forEach(t => onToggleToday?.(t.id))} style={{
              background: "#2AABEE22", border: "1px solid #2AABEE44",
              color: "#2AABEE", borderRadius: 7, padding: "3px 10px",
              fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              flexShrink: 0,
            }}>
              {lang === "ru" ? "+ в сегодня" : lang === "az" ? "+ bu günə" : "+ add all"}
            </button>
          </div>
        )}

        {aiSuggestion?.picks?.length > 0 && (
          <div style={{ background: `${C.accent}12`, border: `1px solid ${C.accent}33`, borderRadius: 12, padding: "10px 14px", marginBottom: 12 }}>
            <div style={{ color: C.accent, fontSize: 11, fontWeight: 600, marginBottom: 6 }}>
              🤖 {lang === "ru" ? "AI рекомендует:" : lang === "az" ? "AI tövsiyə edir:" : "AI suggests focusing on:"}
            </div>
            {aiSuggestion.picks.map((p, i) => <div key={i} style={{ color: C.text, fontSize: 13, padding: "2px 0" }}>• {p}</div>)}
            {aiSuggestion.reason && <div style={{ color: C.textSub, fontSize: 12, marginTop: 6, fontStyle: "italic" }}>{aiSuggestion.reason}</div>}
            <button onClick={() => setAiSuggestion(null)} style={{ background: "none", border: "none", color: C.textDim, fontSize: 11, cursor: "pointer", marginTop: 4, fontFamily: "inherit" }}>✕ dismiss</button>
          </div>
        )}

        {total > 0 && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: C.textSub, fontSize: 12 }}>{doneToday.length} {tx.of} {total} {tx.doneOf}</span>
              <span style={{ color: pct === 100 ? C.done : C.accent, fontSize: 12, fontWeight: 600 }}>{pct}%</span>
            </div>
            <div style={{ background: C.surface, borderRadius: 4, height: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? C.done : C.accent, borderRadius: 4, transition: "width .6s ease" }} />
            </div>
          </>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 80px" }}>
        {active.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: 50 }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>{doneToday.length > 0 ? "🎉" : "✅"}</div>
            <div style={{ color: C.text, fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{doneToday.length > 0 ? tx.allDone : tx.noToday}</div>
            <div style={{ color: C.textSub, fontSize: 13 }}>{doneToday.length > 0 ? `${doneToday.length} ${tx.doneOf} 💪` : tx.noTodaySub}</div>
          </div>
        ) : (
          active.map(t => <ThoughtCard key={t.id} thought={t} lang={lang} onArchive={onArchive} onToggleToday={onToggleToday} onUpdate={onUpdate} showDone />)
        )}

        {doneToday.length > 0 && active.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ color: C.textDim, fontSize: 11, fontWeight: 600, letterSpacing: .5, textTransform: "uppercase", marginBottom: 8 }}>{tx.completedToday}</div>
            {doneToday.map(t => (
              <div key={t.id} style={{ background: C.surface, borderRadius: 12, padding: "9px 14px", marginBottom: 8, opacity: .4, border: `1px solid ${C.border}` }}>
                <span style={{ color: C.done, fontSize: 12, marginRight: 8 }}>✓</span>
                <span style={{ color: C.textSub, fontSize: 14, textDecoration: "line-through" }}>{t.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
