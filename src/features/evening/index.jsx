/**
 * features/evening/index.jsx
 * Evening review screen — mood check, AI reflection, save to Supabase.
 *
 * Exports: EveningScreen
 *
 * Bolt 1.5: extracted from mindflow.jsx lines 814–939.
 */

import { useState, useEffect } from "react";
import { C }                   from "../../skeleton/design-system/tokens.js";
import { T }                   from "../../shared/i18n/translations.js";
import { Spinner, Card }       from "../../shared/ui/primitives.jsx";
import { isToday, todayLabel } from "../../shared/lib/date.js";
import { generateEveningReview } from "../../shared/services/claude.js";
import { getSupabase }         from "../../shared/services/supabase.js";
import { logError }            from "../../shared/lib/logger.js";

export function EveningScreen({ thoughts, lang, persona, user }) {
  const tx = T[lang] || T.en;
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mood, setMood] = useState(null);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [reviews, setReviews] = useState([]);

  // FIX: use archivedAt for accurate today filter
  const doneToday = thoughts.filter(t => t.archived && isToday(t.archivedAt || t.updatedAt));
  const missed    = thoughts.filter(t => t.isToday && !t.archived);

  // FIX: load reviews from Supabase on mount (was only in-memory before)
  useEffect(() => {
    if (!user) return;
    const sb = getSupabase();
    if (!sb) return;
    sb.from("reviews")
      .select("id, mood, note, ai_reflection, done_count, missed_count, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (data?.length) {
          setReviews(data.map(r => ({
            date: r.created_at,
            mood: r.mood != null ? r.mood - 1 : null,
            note: r.note,
            review: r.ai_reflection,
            done: r.done_count,
            missed: r.missed_count,
          })));
        }
      });
  }, [user]);

  const generate = async () => {
    setLoading(true);
    try { setReview(await generateEveningReview(doneToday, missed, lang, persona)); }
    catch (e) { logError("EveningScreen.generate", e); setReview(lang === "ru" ? "Ты появился сегодня. Это всегда считается." : "You showed up today. That always counts."); }
    setLoading(false);
  };

  const save = async () => {
    const entry = { date: new Date().toISOString(), mood, note, review, done: doneToday.length, missed: missed.length };
    setReviews(prev => [entry, ...prev.slice(0, 29)]);
    // Persist to Supabase if logged in
    if (user) {
      try {
        const sb = getSupabase();
        if (sb) await sb.from("reviews").insert({
          user_id: user.id, mood: mood !== null ? mood + 1 : null,
          note, ai_reflection: review,
          done_count: doneToday.length, missed_count: missed.length,
        });
      } catch (e) { logError("EveningScreen.save", e); }
    }
    setSaved(true);
  };

  const MOODS = ["😫", "😕", "😐", "🙂", "😊"];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "18px 18px 10px", flexShrink: 0 }}>
        <div style={{ color: C.textSub, fontSize: 13, marginBottom: 3 }}>{todayLabel(lang)}</div>
        <div style={{ color: C.text, fontSize: 24, fontWeight: 700, letterSpacing: -.5 }}>{tx.evening} 🌙</div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 80px" }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          {[{ v: doneToday.length, l: tx.completed, c: C.done }, { v: missed.length, l: tx.carryOver, c: C.textSub }].map(s => (
            <div key={s.l} style={{ flex: 1, background: C.surface, borderRadius: 14, padding: 16, textAlign: "center", border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: s.c }}>{s.v}</div>
              <div style={{ color: C.textSub, fontSize: 12, marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>

        <Card title={tx.howFeel}>
          <div style={{ display: "flex", justifyContent: "space-around" }}>
            {MOODS.map((m, i) => (
              <button key={i} onClick={() => setMood(i)} style={{ fontSize: 28, background: "none", border: "none", cursor: "pointer", padding: 4, opacity: mood === null ? 1 : mood === i ? 1 : .25, transform: mood === i ? "scale(1.35)" : "scale(1)", transition: "all .15s" }}>{m}</button>
            ))}
          </div>
        </Card>

        <Card title={tx.aiReflection} action={!review && (
          <button onClick={generate} disabled={loading} style={{ background: C.accentDim, color: C.accent, border: "none", borderRadius: 8, padding: "4px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>
            {loading ? <><Spinner size={12} color={C.accent} /> {tx.thinking}</> : tx.generate}
          </button>
        )}>
          {review
            ? <p style={{ color: C.text, fontSize: 14, lineHeight: 1.75, margin: 0 }}>{review}</p>
            : <p style={{ color: C.textDim, fontSize: 14, fontStyle: "italic", margin: 0 }}>
                {lang === "ru" ? "Нажми «Сгенерировать» для персональной рефлексии." : lang === "az" ? "Fərdi refleksiya üçün «Yarat» düyməsini bas." : "Tap Generate for your personalized reflection."}
              </p>}
        </Card>

        <Card title={tx.yourNote}>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder={tx.notePlaceholder} rows={3}
            style={{ width: "100%", background: C.surfaceHi, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, lineHeight: 1.6, padding: "10px 12px", resize: "none", outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
        </Card>

        <button onClick={save} disabled={saved} style={{ width: "100%", height: 48, background: saved ? `${C.done}22` : C.accent, color: saved ? C.done : "white", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: saved ? "default" : "pointer", fontFamily: "inherit", transition: "all .2s" }}>
          {saved ? tx.savedDay : tx.saveDay}
        </button>

        {reviews.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div style={{ color: C.textDim, fontSize: 11, fontWeight: 600, letterSpacing: .5, textTransform: "uppercase", marginBottom: 10 }}>{tx.recentReviews}</div>
            {reviews.slice(0, 3).map((r, i) => (
              <div key={i} style={{ background: C.surface, borderRadius: 12, padding: "10px 14px", marginBottom: 8, border: `1px solid ${C.border}` }}>
                <div style={{ color: C.textDim, fontSize: 11, marginBottom: 4 }}>
                  {new Date(r.date).toLocaleDateString()} · {r.done} {tx.doneOf} {r.mood !== null ? `· ${MOODS[r.mood]}` : ""}
                </div>
                {r.note && <p style={{ color: C.textSub, fontSize: 13, margin: 0 }}>{r.note}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
