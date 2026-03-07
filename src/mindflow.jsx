import { useState, useEffect, useRef, useCallback, useMemo, memo, Component } from "react";
// Bolt 1.1: createClient moved to shared/services/supabase.js
import {
  getSupabase,
  waitForSupabase,
  setupRetryListeners,
  sbPushThought,
  sbPullThoughts,
  sbSavePersona,
  sbLoadPersona,
} from "./shared/services/supabase.js";
// generateEveningReview → features/evening/index.jsx (Bolt 1.5)
// aiFocusSuggest        → features/today/index.jsx (Bolt 1.5)
// buildPersonaContext   → shared/services/claude.js (Bolt 1.1, used via persona prop)
// Bolt 1.3: first vertical slice
import { DumpScreen }    from "./features/dump/index.jsx";
import { ThoughtCard }   from "./shared/ui/ThoughtCard.jsx";
// Bolt 1.5: shared UI atoms + today/evening screens
import { Spinner, Toast, Card, Toggle } from "./shared/ui/primitives.jsx";
import { TodayScreen }   from "./features/today/index.jsx";
import { EveningScreen } from "./features/evening/index.jsx";
// Bolt 1.6: settings + freemium UI
import { ProBanner, PricingScreen } from "./shared/ui/ProBanner.jsx";
import { SettingsScreen } from "./features/settings/index.jsx";
import { ExportPanel }    from "./features/settings/ExportPanel.jsx";
import { NotifPanel }     from "./features/settings/NotifPanel.jsx";
import { NotionPanel }    from "./features/settings/NotionPanel.jsx";
// Bolt 1.7: skeleton + onboarding
import { ErrorBoundary }              from "./skeleton/ErrorBoundary.jsx";
import { BottomNav }                  from "./skeleton/BottomNav.jsx";
import { CSS }                        from "./skeleton/design-system/global.css.js";
import { AuthScreen }                 from "./features/auth/index.jsx";
import { LangPickScreen, WelcomeScreen } from "./features/onboarding/index.jsx";
// Bolt 1.2: pure utilities extracted to shared/lib/
import { uid }                       from "./shared/lib/id.js";
import { isToday, todayLabel }       from "./shared/lib/date.js";
import { getStreakData, saveStreak }  from "./shared/lib/streak.js";
import { FREE_LIMITS, getDumpCount, incrementDumpCount, isProUser } from "./shared/lib/freemium.js";
import { updatePersona }             from "./shared/lib/persona.js";
import { exportToMarkdown }          from "./shared/lib/export.js";
import { greeting }                  from "./shared/lib/greeting.js";
import {
  defaultNotifPrefs, loadNotifPrefs, saveNotifPrefs,
  requestNotifPermission, scheduleNotification,
} from "./shared/lib/notifications.js";
import { applyNotifSchedule }        from "./shared/lib/notif-schedule.js";
// Bolt 1.4: centralised error logging (INVARIANT 7)
import { logError }                  from "./shared/lib/logger.js";
// Bolt 1.2: constants extracted to shared modules
import { C, P_COLOR }               from "./skeleton/design-system/tokens.js";
import { T, LANGS }                 from "./shared/i18n/translations.js";
import { Icon }                      from "./shared/ui/icons.jsx";
import { TYPE_CFG }                  from "./shared/lib/thought-types.js";

// ProBanner → shared/ui/ProBanner.jsx (Bolt 1.6)
// PricingScreen → shared/ui/ProBanner.jsx (Bolt 1.6)
// (imported above)
// (both imported from ./shared/ui/ProBanner.jsx above)

// ─────────────────────────────────────────────────────────────────────────────
// ERROR BOUNDARY — catches render crashes silently (cto-advisor: H priority)
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// ErrorBoundary → skeleton/ErrorBoundary.jsx (Bolt 1.7)
// (imported above)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// FREEMIUM LIMITS — moved to shared/lib/freemium.js (Bolt 1.2)
// FREE_LIMITS, getMonthKey, getDumpCount, incrementDumpCount, isProUser
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE — client + DB ops moved to shared/services/supabase.js (Bolt 1.1)
// getSupabase, waitForSupabase, sbPush/Pull/Save/Load imported above.
// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
// PERSONA v1 — moved to shared/lib/persona.js (Bolt 1.2)
// buildPersonaContext → shared/services/claude.js (Bolt 1.1)
// updatePersona → shared/lib/persona.js (Bolt 1.2)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS — moved to skeleton/design-system/tokens.js (Bolt 1.2)
// C, P_COLOR imported above.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// SVG ICONS — moved to shared/ui/icons.jsx (Bolt 1.2)
// Icon imported above.
// ─────────────────────────────────────────────────────────────────────────────

// TYPE_CFG — moved to shared/lib/thought-types.js (Bolt 1.2)

// ─────────────────────────────────────────────────────────────────────────────
// I18N — moved to shared/i18n/translations.js (Bolt 1.2)
// T, LANGS imported above.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// UTILS — moved to shared/lib/ (Bolt 1.2)
// uid        → shared/lib/id.js
// isToday    → shared/lib/date.js
// todayLabel → shared/lib/date.js
// getStreakData, saveStreak → shared/lib/streak.js
// All imported above.
//
// greeting(lang) — moved to shared/lib/greeting.js (Bolt 1.2)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// AI — all functions moved to shared/services/claude.js (Bolt 1.1)
// parseDump            — features/dump/dump.api.js (Bolt 1.3)
// generateEveningReview — features/evening/index.jsx (Bolt 1.5)
// aiFocusSuggest       — features/today/index.jsx (Bolt 1.5)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT — moved to shared/lib/export.js (Bolt 1.2)
// exportToMarkdown imported above.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE SYNC — all moved to shared/services/supabase.js (Bolt 1.1)
// setupRetryListeners, sbPushThought, sbPullThoughts, sbSavePersona,
// sbLoadPersona, getSupabase, waitForSupabase — all imported above.
// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
// SHARED UI — Spinner, Toast, Card, Toggle moved to shared/ui/primitives.jsx (Bolt 1.5)
// Spinner, Toast, Card, Toggle imported above.
// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
// AUTH SCREEN
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// AuthScreen     → features/auth/index.jsx (Bolt 1.7)
// LangPickScreen → features/onboarding/index.jsx (Bolt 1.7)
// WelcomeScreen  → features/onboarding/index.jsx (Bolt 1.7)
// (all imported above)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// CLARIFY INLINE + THOUGHT CARD — moved to shared/ui/ThoughtCard.jsx (Bolt 1.3)
// ThoughtCard imported above.
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: TODAY — moved to features/today/index.jsx (Bolt 1.5)
// TodayScreen imported above.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: EVENING — moved to features/evening/index.jsx (Bolt 1.5)
// EveningScreen imported above.
// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
// ExportPanel   → features/settings/ExportPanel.jsx (Bolt 1.6)
// SettingsScreen → features/settings/index.jsx (Bolt 1.6)
// (both imported above)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// BottomNav → skeleton/BottomNav.jsx (Bolt 1.7)
// (imported above)
// ─────────────────────────────────────────────────────────────────────────────

// Load Supabase CDN
// Supabase loaded via npm import

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS — moved to shared/lib/notifications.js + notif-schedule.js (Bolt 1.2)
// defaultNotifPrefs, loadNotifPrefs, saveNotifPrefs, requestNotifPermission,
// scheduleNotification, applyNotifSchedule imported above.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// NotifPanel  → features/settings/NotifPanel.jsx (Bolt 1.6)
// NotionPanel → features/settings/NotionPanel.jsx (Bolt 1.6)
// (both imported above)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  // FIX: persist lang + step to localStorage so they survive page reload
  const [step, setStep]           = useState(() => {
    try { return localStorage.getItem("mf_step") || "lang"; } catch { return "lang"; }
  });
  const [lang, setLang]           = useState(() => {
    try { return localStorage.getItem("mf_lang") || "en"; } catch { return "en"; }
  });
  const [screen, setScreen]       = useState("dump");
  // FIX: persist thoughts to localStorage for unauthenticated users (cto-advisor: offline-capable)
  const [thoughts, setThoughts]   = useState(() => {
    try {
      const saved = localStorage.getItem("mf_thoughts_local");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [toast, setToast]         = useState(null);
  const [user, setUser]           = useState(null);
  const [syncOn, setSyncOn]       = useState(false);
  const [showAuth, setShowAuth]   = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showNotif, setShowNotif]   = useState(false);
  const [showNotion, setShowNotion] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [pricingReason, setPricingReason] = useState("dumps");
  const [subscription, setSubscription] = useState(null); // null = free
  const [undoPending, setUndoPending] = useState(null); // { id, thought, timer }
  const [persona, setPersona]     = useState(() => {
    try {
      const p = localStorage.getItem("mf_persona");
      return p ? JSON.parse(p) : null;
    } catch { return null; }
  });
  const langRef = useRef(lang); // FIX: ref for stale closure in auth listener

  // Setup retry queue listeners once on mount
  useEffect(() => { setupRetryListeners(); }, []);

  useEffect(() => {
    langRef.current = lang;
    try { localStorage.setItem("mf_lang", lang); } catch {}
  }, [lang]);

  useEffect(() => {
    try { localStorage.setItem("mf_step", step); } catch {}
  }, [step]);

  // Persist persona locally (supplements Supabase)
  useEffect(() => {
    if (!persona) return;
    try { localStorage.setItem("mf_persona", JSON.stringify(persona)); } catch (e) { logError("App.persistPersona", e); }
  }, [persona]);

  // FIX: auto-save thoughts to localStorage for unauthenticated users
  // When logged in + sync on, Supabase is source of truth; localStorage is backup
  useEffect(() => {
    if (user && syncOn) return; // Supabase handles persistence
    try {
      localStorage.setItem("mf_thoughts_local", JSON.stringify(thoughts.slice(0, 200)));
    } catch (e) { logError("App.persistThoughtsLocal", e); }
  }, [thoughts, user, syncOn]);

  // Apply saved notification schedule whenever lang changes
  useEffect(() => {
    const prefs = loadNotifPrefs();
    if (prefs.enabled) applyNotifSchedule(prefs, lang);
  }, [lang]);

  // FIX: re-apply notif schedule when app comes to foreground (hooks-mindflow)
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        const prefs = loadNotifPrefs();
        if (prefs.enabled) applyNotifSchedule(prefs, langRef.current);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // FIX: wait for Supabase CDN before registering auth listener
  useEffect(() => {
    let sub;
    waitForSupabase().then(sb => {
      if (!sb) return;
      sb.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
      const { data } = sb.auth.onAuthStateChange((_, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) { setShowAuth(false); notify(langRef.current === "ru" ? "Вошёл в аккаунт!" : "Signed in!"); }
      });
      sub = data.subscription;
    });
    return () => sub?.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !syncOn) return;

    // FIX: subscribe BEFORE pulling to avoid race condition where
    // Telegram inserts arrive between pull end and subscribe start
    const sb = getSupabase();
    if (!sb) return;

    let pullCompleted = false;
    const channel = sb
      .channel("thoughts-realtime")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "thoughts",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        // Buffer events received before pull is done are handled by dedup below
        const r = payload.new;
        if (!r) return;
        const incoming = {
          id: r.uid || r.id, rawText: r.raw_text, text: r.text,
          type: r.type, priority: r.priority, tags: r.tags || [],
          reminderAt: r.reminder_at, isToday: r.is_today,
          archived: r.archived, createdAt: r.created_at,
          updatedAt: r.updated_at, synced: true, source: r.source || "app",
          recurrence: r.recurrence || null,
        };
        setThoughts(prev => {
          if (prev.some(t => t.id === incoming.id)) return prev; // dedup
          if (r.source === "telegram") {
            const tMsg = lang === "ru" ? "Новая мысль из Telegram ✈️" : "New thought from Telegram ✈️";
            setTimeout(() => notify(tMsg, "info"), 100);
          }
          return [incoming, ...prev];
        });
      })
      .subscribe();

    // Pull after subscription is registered
    sbPullThoughts(user.id).then(remote => {
      if (remote.length) {
        setThoughts(remote);
        notify(lang === "ru" ? `Загружено ${remote.length} мыслей` : `Loaded ${remote.length} thoughts`);
      }
      pullCompleted = true;
    });

    sbLoadPersona(user.id).then(p => { if (p) setPersona(p); });

    // Load subscription status
    const sbSub = getSupabase();
    if (sbSub) {
      sbSub.from("subscriptions").select("plan, status, current_period_end").eq("user_id", user.id).maybeSingle()
        .then(({ data }) => { if (data?.status === "active") setSubscription(data); });
    }

    // Drain any queued failed pushes now that we're online
    drainRetryQueue();

    return () => sb.removeChannel(channel);
  }, [user, syncOn]);

  const notify = useCallback((msg, type = "success") => {
    setToast({ msg, type, k: Date.now() });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleProcess = useCallback(async (rawText, items) => {
    const now = new Date().toISOString();
    const fresh = items.map(p => {
      // Pre-save hook: normalize and validate (ruflo hooks-automation pattern)
      const text = (p.text || rawText).trim();
      if (!text) return null;
      const validTypes = ['task','note','idea','reminder','expense','memory'];
      const validPrios = ['none','low','medium','high','critical'];
      return {
        id: uid(), rawText, text,
        type: validTypes.includes(p.type) ? p.type : "note",
        priority: validPrios.includes(p.priority) ? p.priority : "none",
        tags: Array.isArray(p.tags) ? p.tags.slice(0,3).map(t => String(t).toLowerCase()) : [],
        reminderAt: p.reminderAt || null, clarify: p.clarify || null,
        recurrence: p.recurrence || null,
        isToday: false, archived: false, synced: false, source: "app",
        createdAt: now, updatedAt: now, archivedAt: null,
      };
    }).filter(Boolean);
    setThoughts(prev => [...fresh, ...prev]);
    const newPersona = updatePersona(persona, fresh, null);
    setPersona(newPersona);
    if (user && syncOn) {
      const results = await Promise.all(fresh.map(t => sbPushThought(t, user.id)));
      const syncedIds = fresh.filter((_, i) => results[i]).map(t => t.id);
      if (syncedIds.length) setThoughts(prev => prev.map(t => syncedIds.includes(t.id) ? { ...t, synced: true } : t));
      sbSavePersona(newPersona, user.id);
    }
  }, [persona, user, syncOn]);

  const toggleToday = useCallback((id) => {
    setThoughts(prev => prev.map(t => t.id === id ? { ...t, isToday: !t.isToday, updatedAt: new Date().toISOString() } : t));
  }, []);

  // FIX: set archivedAt timestamp + undo window (5s before committing to Supabase)
  const archive = useCallback((id) => {
    const now = new Date().toISOString();
    const thought = thoughts.find(x => x.id === id);
    if (!thought) return;
    const newPersona = updatePersona(persona, [], id);
    setPersona(newPersona);
    setThoughts(prev => prev.map(t => t.id === id ? { ...t, archived: true, isToday: false, updatedAt: now, archivedAt: now } : t));
    // Clear previous undo if any
    setUndoPending(prev => { if (prev?.timer) clearTimeout(prev.timer); return prev; });
    const timer = setTimeout(() => {
      setUndoPending(null);
      if (user && syncOn) sbPushThought({ ...thought, archived: true, isToday: false, updatedAt: now, archivedAt: now }, user.id);
    }, 5000);
    setUndoPending({ id, thought, timer });
  }, [persona, user, syncOn, thoughts]);

  const undoArchive = useCallback(() => {
    setUndoPending(prev => {
      if (!prev) return null;
      clearTimeout(prev.timer);
      setThoughts(ts => ts.map(t => t.id === prev.id ? { ...prev.thought } : t));
      return null;
    });
  }, []);

  // FIX: update thought fields (e.g. after ClarifyInline answer)
  const handleUpdate = useCallback((id, fields) => {
    setThoughts(prev => prev.map(t => t.id === id ? { ...t, ...fields } : t));
    if (user && syncOn) {
      // Push updated thought to Supabase
      setThoughts(prev => {
        const updated = prev.find(t => t.id === id);
        if (updated) sbPushThought({ ...updated, ...fields }, user.id);
        return prev;
      });
    }
  }, [user, syncOn]);

  const handleSignOut = async () => {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    setUser(null); setSyncOn(false);
    notify(lang === "ru" ? "Вышел из аккаунта" : "Signed out", "info");
  };

  const badge = thoughts.filter(t => t.isToday && !t.archived).length;

  const wrapper = (children) => (
    <ErrorBoundary>
      <style>{CSS}</style>
      <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: C.bg }}>{children}</div>
    </ErrorBoundary>
  );

  if (step === "lang")    return wrapper(<LangPickScreen onPick={l => { setLang(l); setStep("welcome"); }} />);
  if (step === "welcome") return wrapper(<WelcomeScreen lang={lang} onDone={() => setStep("app")} />);
  if (showAuth)           return wrapper(<AuthScreen lang={lang} onSkip={() => setShowAuth(false)} />);

  return (
    <>
      <style>{CSS}</style>
      <div style={{ maxWidth: 480, margin: "0 auto", height: "100vh", background: C.bg, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
        {toast && <Toast key={toast.k} msg={toast.msg} type={toast.type} />}

        {/* Undo archive toast — 5s window */}
        {undoPending && (
          <div style={{
            position: "fixed", bottom: 90, left: "50%", transform: "translateX(-50%)",
            background: C.surface, border: `1px solid ${C.borderHi}`,
            borderRadius: 14, padding: "10px 16px",
            display: "flex", alignItems: "center", gap: 12,
            zIndex: 9990, boxShadow: "0 8px 32px rgba(0,0,0,.4)",
            animation: "toastIn .2s ease", whiteSpace: "nowrap",
            maxWidth: "92vw",
          }}>
            <span style={{ color: C.textSub, fontSize: 13 }}>
              {lang === "ru" ? "Архивировано" : lang === "az" ? "Arxivləndi" : "Archived"}
            </span>
            <button onClick={undoArchive} style={{
              background: `${C.accent}20`, border: `1px solid ${C.accent}44`,
              color: C.accentLit, borderRadius: 8, padding: "4px 12px",
              fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>
              {lang === "ru" ? "Отменить" : lang === "az" ? "Geri al" : "Undo"}
            </button>
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto" }}>
          {screen === "dump"     && <DumpScreen thoughts={thoughts} onProcess={handleProcess} onToggleToday={toggleToday} onArchive={archive} onUpdate={handleUpdate} lang={lang} persona={persona} isPro={isProUser(user, subscription)} onShowPricing={reason => { setPricingReason(reason); setShowPricing(true); }} />}
          {screen === "today"    && <TodayScreen thoughts={thoughts} onArchive={archive} onToggleToday={toggleToday} onUpdate={handleUpdate} lang={lang} persona={persona} />}
          {screen === "evening"  && <EveningScreen thoughts={thoughts} lang={lang} persona={persona} user={user} />}
          {screen === "settings" && <SettingsScreen thoughts={thoughts} lang={lang} onChangeLang={setLang} onClearAll={() => { setThoughts([]); setPersona(null); try { localStorage.removeItem("mf_thoughts_local"); localStorage.removeItem("mf_persona"); } catch {} notify(lang === "ru" ? "Очищено" : "Cleared", "info"); }} user={user} syncOn={syncOn} onToggleSync={() => setSyncOn(v => !v)} onShowAuth={() => setShowAuth(true)} onSignOut={handleSignOut} persona={persona} onExport={() => setShowExport(true)} onNotif={() => setShowNotif(true)} onNotion={() => setShowNotion(true)} isPro={isProUser(user, subscription)} onShowPricing={reason => { setPricingReason(reason); setShowPricing(true); }} />}
        </div>

        <BottomNav active={screen} onChange={setScreen} badge={badge} lang={lang} />
        {showExport   && <ExportPanel thoughts={thoughts} lang={lang} onClose={() => setShowExport(false)} />}
        {showPricing  && <PricingScreen lang={lang} user={user} onClose={() => setShowPricing(false)} />}
        {showNotif  && <NotifPanel lang={lang} onClose={() => setShowNotif(false)} />}
        {showNotion && <NotionPanel thoughts={thoughts} lang={lang} onClose={() => setShowNotion(false)} />}
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// CSS → skeleton/design-system/global.css.js (Bolt 1.7)
// (imported above)
// ─────────────────────────────────────────────────────────────────────────────