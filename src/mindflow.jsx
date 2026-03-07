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
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { logError("ErrorBoundary", error, { componentStack: info?.componentStack }); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "#07070D", padding: 32, textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
          <div style={{ color: "#F0F0F8", fontSize: 18, fontWeight: 700, marginBottom: 8, fontFamily: "Syne, sans-serif" }}>Something went wrong</div>
          <div style={{ color: "#6868A0", fontSize: 13, marginBottom: 24 }}>{this.state.error?.message || "Unexpected error"}</div>
          <button onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{ background: "#6C5CE7", color: "white", border: "none", borderRadius: 12, padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Reload app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
function AuthScreen({ lang, onSkip }) {
  const tx = T[lang] || T.en;
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const send = async () => {
    if (!email.includes("@")) { setErr(lang === "ru" ? "Введи корректный email" : lang === "az" ? "Düzgün email daxil edin" : "Enter a valid email"); return; }
    setLoading(true); setErr("");
    const sb = await waitForSupabase();
    if (!sb) { setErr("Supabase not loaded yet, try again"); setLoading(false); return; }
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href } });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    setSent(true);
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", background: C.bg }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>🔐</div>
      <div style={{ color: C.text, fontSize: 22, fontWeight: 700, marginBottom: 8, letterSpacing: -.5 }}>
        {lang === "ru" ? "Войти / Зарегистрироваться" : lang === "az" ? "Daxil ol / Qeydiyyat" : "Sign in / Register"}
      </div>
      <div style={{ color: C.textSub, fontSize: 14, marginBottom: 40, textAlign: "center", lineHeight: 1.6 }}>
        {lang === "ru" ? "Магическая ссылка — без пароля.\nДанные синхронизируются между устройствами." : lang === "az" ? "Sehrli keçid — şifrəsiz.\nMəlumatlar cihazlar arasında sinxronlaşır." : "Magic link — no password.\nData syncs across your devices."}
      </div>
      {!sent ? (
        <div style={{ width: "100%", maxWidth: 320 }}>
          <input type="email" autoComplete="email" autoFocus value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && send()}
            placeholder="your@email.com"
            aria-label="Email address"
            aria-invalid={!!err}
            style={{ width: "100%", background: C.surface, border: `1px solid ${err ? C.high : C.border}`, borderRadius: 12, color: C.text, fontSize: 15, padding: "12px 16px", outline: "none", fontFamily: "inherit", boxSizing: "border-box", marginBottom: 8 }} />
          {err && <div style={{ color: C.high, fontSize: 13, marginBottom: 8 }}>{err}</div>}
          <button onClick={send} disabled={loading}
            style={{ width: "100%", height: 48, background: C.accent, color: "white", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {loading ? <><Spinner /> {lang === "ru" ? "Отправляю..." : "Sending..."}</> : lang === "ru" ? "Отправить магическую ссылку" : lang === "az" ? "Sehrli keçid göndər" : "Send Magic Link"}
          </button>
          <div style={{ textAlign: "center" }}>
            <button onClick={onSkip} style={{ background: "none", border: "none", color: C.textSub, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              {lang === "ru" ? "Продолжить без аккаунта →" : lang === "az" ? "Hesabsız davam et →" : "Continue without account →"}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📬</div>
          <div style={{ color: C.text, fontSize: 17, fontWeight: 600, marginBottom: 8 }}>
            {lang === "ru" ? "Проверь почту" : lang === "az" ? "E-poçtunuzu yoxlayın" : "Check your email"}
          </div>
          <div style={{ color: C.textSub, fontSize: 14, marginBottom: 20 }}>
            {lang === "ru" ? "Ссылка отправлена на " : lang === "az" ? "Keçid göndərildi: " : "Link sent to "}<strong style={{ color: C.text }}>{email}</strong>
          </div>
          <button onClick={onSkip} style={{ background: "none", border: "none", color: C.textSub, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            {lang === "ru" ? "Пропустить пока →" : lang === "az" ? "Hələlik keç →" : "Skip for now →"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ONBOARDING
// ─────────────────────────────────────────────────────────────────────────────
// LANGS — moved to shared/i18n/translations.js (Bolt 1.2)

function LangPickScreen({ onPick }) {
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);

  const handlePick = (id) => {
    setSelected(id);
    setTimeout(() => onPick(id), 320);
  };

  // Detect user locale and pre-highlight matching language
  useEffect(() => {
    const loc = (navigator.language || "en").toLowerCase();
    if (loc.startsWith("ru")) setHovered("ru");
    else if (loc.startsWith("az")) setHovered("az");
    else setHovered("en");
    const t = setTimeout(() => setHovered(null), 1800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "32px 24px", background: C.bg,
      position: "relative", overflow: "hidden",
    }}>
      {/* Background: three subtle colour blobs, one per language */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "8%", left: "10%", width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle, rgba(108,92,231,0.10) 0%, transparent 70%)", filter: "blur(30px)" }} />
        <div style={{ position: "absolute", bottom: "10%", right: "8%", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,184,148,0.08) 0%, transparent 70%)", filter: "blur(30px)" }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 340, height: 340, borderRadius: "50%", background: `radial-gradient(circle, ${C.accentGlow} 0%, transparent 65%)`, filter: "blur(20px)" }} />
      </div>

      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12, animation: "slideUp .55s cubic-bezier(.22,1,.36,1) both" }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: `linear-gradient(135deg, ${C.accent}, ${C.accentLit})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 8px 32px ${C.accentGlow}` }}>
          {Icon.brain("#fff", 28)}
        </div>
        <div>
          <div style={{ fontFamily: "Syne, sans-serif", color: C.text, fontSize: 34, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1 }}>MindFlow</div>
          <div style={{ color: C.accent, fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", marginTop: 3, opacity: 0.7 }}>BETA</div>
        </div>
      </div>

      {/* Tagline */}
      <div style={{ color: C.textSub, fontSize: 14, marginBottom: 52, letterSpacing: 0.3, animation: "slideUp .55s cubic-bezier(.22,1,.36,1) .08s both", textAlign: "center", lineHeight: 1.6 }}>
        choose your language
      </div>

      {/* Language cards — large flags, world-class touch targets */}
      <div style={{ display: "flex", gap: 14, animation: "slideUp .55s cubic-bezier(.22,1,.36,1) .16s both" }}>
        {LANGS.map(l => {
          const isHovered = hovered === l.id;
          const isSelected = selected === l.id;
          return (
            <button
              key={l.id}
              onClick={() => handlePick(l.id)}
              onMouseEnter={() => setHovered(l.id)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(l.id)}
              onBlur={() => setHovered(null)}
              aria-label={`Select language: ${l.name}`}
              style={{
                width: 100, padding: "22px 10px 18px",
                background: isSelected
                  ? `linear-gradient(135deg, ${C.accent}30, ${C.accentLit}20)`
                  : isHovered ? `${C.accent}14` : C.surface,
                border: `1.5px solid ${isSelected ? C.accent : isHovered ? C.accent : C.border}`,
                borderRadius: 24, cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
                transition: "all .22s cubic-bezier(.34,1.56,.64,1)",
                transform: isSelected ? "scale(0.96)" : isHovered ? "translateY(-6px) scale(1.05)" : "none",
                boxShadow: isSelected
                  ? `0 0 0 3px ${C.accent}44`
                  : isHovered ? `0 12px 40px ${C.accentGlow}, 0 0 0 1px ${C.accent}33` : "none",
                outline: "none",
                position: "relative", overflow: "hidden",
              }}>
              {/* Shimmer on hover */}
              {isHovered && (
                <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, transparent 30%, ${C.accent}08 50%, transparent 70%)`, pointerEvents: "none", animation: "shimmer .6s ease" }} />
              )}

              {/* Flag — large, crisp */}
              <div style={{
                fontSize: 52, lineHeight: 1,
                filter: isHovered || isSelected ? "drop-shadow(0 4px 12px rgba(108,92,231,0.3))" : "none",
                transition: "filter .2s",
                userSelect: "none",
              }}>
                {l.flag}
              </div>

              {/* Language name */}
              <span style={{
                fontSize: 12, fontWeight: 700,
                color: isHovered || isSelected ? C.accentLit : C.textSub,
                fontFamily: "Syne, sans-serif", letterSpacing: 0.4,
                transition: "color .2s",
              }}>
                {l.name}
              </span>

              {/* Native hint */}
              <span style={{
                fontSize: 10, color: C.textDim,
                fontWeight: 500, letterSpacing: 0.2,
                lineHeight: 1,
              }}>
                {l.id === "en" ? "English" : l.id === "ru" ? "Русский" : "Azərbaycan"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bottom hint */}
      <div style={{ position: "absolute", bottom: 32, color: C.textDim, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", fontWeight: 500, animation: "slideUp .55s cubic-bezier(.22,1,.36,1) .28s both" }}>
        choose / выбери / seçin
      </div>
    </div>
  );
}

function WelcomeScreen({ lang, onDone }) {
  const tx = T[lang] || T.en;
  const l = LANGS.find(x => x.id === lang);
  const [visible, setVisible] = useState(false);

  useEffect(() => { const t = setTimeout(() => setVisible(true), 50); return () => clearTimeout(t); }, []);

  const features = {
    en: [
      { icon: "🧠", title: "Brain dump", text: "Dump everything — tasks, worries, random thoughts. No structure needed." },
      { icon: "⚡", title: "AI sorts it", text: "AI categorizes and prioritizes instantly. Zero setup." },
      { icon: "🎯", title: "Daily focus", text: "Pick 3–5 things to focus on. The rest waits." },
      { icon: "🌙", title: "Evening review", text: "2-minute check-in to close the day without guilt." },
    ],
    ru: [
      { icon: "🧠", title: "Мозговой дамп", text: "Выгружай всё — задачи, тревоги, случайные мысли. Без структуры." },
      { icon: "⚡", title: "AI сортирует", text: "AI расставляет приоритеты мгновенно. Никаких настроек." },
      { icon: "🎯", title: "Фокус дня", text: "Выбери 3–5 вещей. Остальное подождёт." },
      { icon: "🌙", title: "Вечерний обзор", text: "2 минуты чтобы закрыть день без чувства вины." },
    ],
    az: [
      { icon: "🧠", title: "Beyin dempinqi", text: "Hər şeyi tök — tapşırıqlar, narahatlıqlar, fikirlər." },
      { icon: "⚡", title: "AI sıralayır", text: "AI dərhal prioritetlər qoyur. Heç bir quraşdırma yoxdur." },
      { icon: "🎯", title: "Günün fokusu", text: "3–5 şey seç. Qalanı gözləyər." },
      { icon: "🌙", title: "Axşam icmalı", text: "2 dəqiqəlik yoxlama ilə günü günahsız bağla." },
    ],
  };

  const fList = features[lang] || features.en;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.bg, overflowY: "auto" }}>
      {/* Header */}
      <div style={{ padding: "44px 28px 0", opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(12px)", transition: "all .5s cubic-bezier(.22,1,.36,1)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 28, lineHeight: 1 }}>{l?.flag}</span>
          <div style={{ color: C.text, fontSize: 26, fontWeight: 800, letterSpacing: -0.8, fontFamily: "Syne, sans-serif" }}>{tx.onboardingTitle}</div>
        </div>
        <div style={{ color: C.textSub, fontSize: 15, lineHeight: 1.7, marginBottom: 36, whiteSpace: "pre-line" }}>{tx.onboardingDesc}</div>
      </div>

      {/* Feature list */}
      <div style={{ flex: 1, padding: "0 28px", display: "flex", flexDirection: "column", gap: 10 }}>
        {fList.map((f, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "flex-start", gap: 14,
            background: C.surface, borderRadius: 16, padding: "14px 16px",
            border: `1px solid ${C.border}`,
            opacity: visible ? 1 : 0,
            transform: visible ? "none" : "translateY(16px)",
            transition: `opacity .45s cubic-bezier(.22,1,.36,1) ${.1 + i * .07}s, transform .45s cubic-bezier(.22,1,.36,1) ${.1 + i * .07}s`,
          }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: `${C.accent}18`, border: `1px solid ${C.accent}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{f.icon}</div>
            <div>
              <div style={{ color: C.text, fontSize: 14, fontWeight: 700, marginBottom: 2, letterSpacing: -0.2 }}>{f.title}</div>
              <div style={{ color: C.textSub, fontSize: 13, lineHeight: 1.5 }}>{f.text}</div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ padding: "24px 28px 44px", flexShrink: 0, opacity: visible ? 1 : 0, transition: "opacity .5s .4s" }}>
        <button onClick={onDone} style={{
          width: "100%", height: 54,
          background: `linear-gradient(135deg, ${C.accent}, ${C.accentLit})`,
          color: "white", border: "none", borderRadius: 16,
          fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          boxShadow: `0 8px 28px ${C.accentGlow}`,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          letterSpacing: 0.2,
        }}>
          {tx.continue}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </button>
        <div style={{ color: C.textDim, fontSize: 11, textAlign: "center", marginTop: 10, letterSpacing: 0.3 }}>{tx.langSub}</div>
      </div>
    </div>
  );
}

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
// BOTTOM NAV — FIX: uses todayShort/eveningShort/settingsShort
// ─────────────────────────────────────────────────────────────────────────────
function BottomNav({ active, onChange, badge, lang }) {
  const tx = T[lang] || T.en;
  const items = [
    { id: "dump",     icon: Icon.dump,     label: tx.dump },
    { id: "today",    icon: Icon.today,    label: tx.todayShort, badge },
    { id: "evening",  icon: Icon.evening,  label: tx.eveningShort },
    { id: "settings", icon: Icon.settings, label: tx.settingsShort },
  ];
  return (
    <div style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 480,
      background: `${C.surface}F0`,
      backdropFilter: "blur(20px)",
      borderTop: `1px solid ${C.border}`,
      display: "flex", zIndex: 100,
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      {items.map(it => {
        const isActive = active === it.id;
        return (
          <button key={it.id} onClick={() => onChange(it.id)} onKeyDown={e => (e.key==="Enter"||e.key===" ") && onChange(it.id)} aria-label={it.label} aria-current={isActive ? "page" : undefined} style={{
            flex: 1, background: "none", border: "none", cursor: "pointer",
            padding: "11px 0 13px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
            position: "relative",
          }}>
            {/* Active glow pill */}
            {isActive && (
              <div style={{
                position: "absolute", top: 6, left: "50%", transform: "translateX(-50%)",
                width: 36, height: 36, borderRadius: 12,
                background: C.accentDim,
                animation: "navPop .2s ease",
              }} />
            )}

            <div style={{
              position: "relative", zIndex: 1,
              transform: isActive ? "translateY(-1px)" : "none",
              transition: "transform .2s",
            }}>
              {it.icon(isActive ? C.accentLit : C.textSub, 22)}
            </div>

            <span style={{
              fontSize: 10, fontWeight: isActive ? 700 : 500,
              fontFamily: "inherit",
              color: isActive ? C.accentLit : C.textSub,
              letterSpacing: 0.2,
              position: "relative", zIndex: 1,
              transition: "color .15s",
            }}>
              {it.label}
            </span>

            {it.badge > 0 && (
              <span style={{
                position: "absolute", top: 7, right: "calc(50% - 22px)",
                background: C.accent, color: "white",
                fontSize: 9, fontWeight: 800,
                minWidth: 16, height: 16, borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "0 3px",
                boxShadow: `0 0 8px ${C.accentGlow}`,
                animation: "badgePop .3s cubic-bezier(.34,1.56,.64,1)",
              }}>
                {it.badge > 9 ? "9+" : it.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

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
// CSS
// ─────────────────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
  
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }

  html, body {
    background: ${C.bg};
    font-family: 'DM Sans', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    scroll-behavior: smooth;
    overscroll-behavior: none;
  }

  h1, h2, h3, .font-display {
    font-family: 'Syne', system-ui, sans-serif;
  }

  textarea::placeholder, input::placeholder { color: ${C.textDim}; }

  /* Focus-visible: only show focus ring on keyboard navigation (WCAG 2.4.11) */
  :focus { outline: none; }
  :focus-visible {
    outline: 2px solid ${C.accent};
    outline-offset: 2px;
    border-radius: 4px;
  }

  /* Text selection */
  ::selection { background: ${C.accent}44; color: ${C.text}; }

  ::-webkit-scrollbar { width: 2px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${C.borderHi}; border-radius: 2px; }

  /* Prevent text size adjust on orientation change (mobile) */
  html { -webkit-text-size-adjust: 100%; }

  /* Touch action optimization for swipeable cards */
  [data-testid="thought-card"] { touch-action: pan-y; }

  button { -webkit-user-select: none; user-select: none; }
  button:active { opacity: 0.85; }

  @keyframes spin       { to { transform: rotate(360deg); } }
  @keyframes toastIn    { from { opacity:0; transform:translateX(-50%) translateY(-10px) scale(.95); } to { opacity:1; transform:translateX(-50%) translateY(0) scale(1); } }
  @keyframes fadeIn     { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
  @keyframes navPop     { from { opacity:0; transform:translateX(-50%) scale(.7); } to { opacity:1; transform:translateX(-50%) scale(1); } }
  @keyframes badgePop   { 0% { transform:scale(0); } 70% { transform:scale(1.2); } 100% { transform:scale(1); } }
  @keyframes micPulse   { 0%,100%{ box-shadow:0 0 0 0 ${C.high}66 } 50%{ box-shadow:0 0 0 8px transparent } }
  @keyframes shimmer    { from { transform: translateX(-100%); } to { transform: translateX(100%); } }
  @keyframes slideUp    { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
  @keyframes scaleIn    { from { opacity:0; transform:scale(.92); } to { opacity:1; transform:scale(1); } }
  @keyframes pulse      { 0%,100%{ opacity:1; } 50%{ opacity:0.5; } }

  input[type="time"]::-webkit-calendar-picker-indicator { filter: invert(0.6); }

  /* High contrast media query */
  @media (prefers-contrast: high) {
    :focus-visible { outline-width: 3px; }
  }

  /* Reduce motion */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
`;
