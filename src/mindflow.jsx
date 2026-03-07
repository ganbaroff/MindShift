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

// ─────────────────────────────────────────────────────────────────────────────
// PRO BANNER — shown when hitting freemium limits
// ─────────────────────────────────────────────────────────────────────────────
function ProBanner({ lang, reason, onUpgrade, onDismiss }) {
  const msgs = {
    dumps: {
      en: { title: "Monthly limit reached", body: "You've used all 30 free AI dumps this month. Upgrade for unlimited.", cta: "Get Pro — $8/mo" },
      ru: { title: "Лимит месяца исчерпан", body: "Вы использовали все 30 бесплатных AI-дампов в этом месяце. Обновитесь для безлимита.", cta: "Получить Pro — $8/мес" },
      az: { title: "Aylıq limit doldu", body: "Bu ay 30 pulsuz AI dempinqinizi istifadə etdiniz. Limitsiz üçün yüksəldin.", cta: "Pro al — $8/ay" },
    },
    thoughts: {
      en: { title: "Storage limit reached", body: "Free plan stores up to 50 thoughts. Archive some or upgrade for unlimited.", cta: "Get Pro — $8/mo" },
      ru: { title: "Лимит хранилища", body: "Бесплатный план хранит до 50 мыслей. Архивируй часть или обновись.", cta: "Получить Pro — $8/мес" },
      az: { title: "Saxlama limiti doldu", body: "Pulsuz plan 50 fikrə qədər saxlayır. Bir qismini arxivləyin və ya yüksəldin.", cta: "Pro al — $8/ay" },
    },
  };
  const m = (msgs[reason] || msgs.dumps)[lang] || (msgs[reason] || msgs.dumps).en;

  return (
    <div style={{ margin: "12px 0", borderRadius: 16, overflow: "hidden", border: `1px solid ${C.idea}33`, background: `linear-gradient(135deg, ${C.idea}08, ${C.accent}08)` }}>
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ fontSize: 24, flexShrink: 0 }}>⚡</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: C.text, fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{m.title}</div>
            <div style={{ color: C.textSub, fontSize: 13, lineHeight: 1.5 }}>{m.body}</div>
          </div>
          {onDismiss && (
            <button onClick={onDismiss} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 16, padding: 0, lineHeight: 1, flexShrink: 0 }}>✕</button>
          )}
        </div>
        <button onClick={onUpgrade} style={{
          marginTop: 12, width: "100%", height: 42,
          background: `linear-gradient(135deg, ${C.idea}, #e09000)`,
          color: "white", border: "none", borderRadius: 12,
          fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          letterSpacing: 0.2,
        }}>
          {m.cta} →
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRICING SCREEN — full pricing page (no Stripe yet, waitlist mode)
// ─────────────────────────────────────────────────────────────────────────────
function PricingScreen({ lang, user, onClose, onWaitlist }) {
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState(user?.email || "");
  const [loading, setLoading] = useState(false);

  const TL = {
    en: {
      title: "Upgrade MindFlow",
      sub: "Remove limits. Sync everywhere. Stay in flow.",
      freeTitle: "Free", proTitle: "Pro", coachTitle: "Coach",
      freeSub: "Get started", proSub: "Most popular", coachSub: "For coaches",
      perMonth: "/mo", perYear: "billed annually",
      waitlistBtn: "Join Pro Waitlist →",
      waitlistDone: "✓ You're on the waitlist!",
      waitlistSub: "We'll notify you when Pro launches.",
      features: {
        free: ["30 AI dumps / month", "50 thoughts stored", "Basic AI parsing", "3 languages"],
        pro: ["Unlimited dumps & thoughts", "Cloud sync (all devices)", "Telegram capture bot", "Evening review history", "Priority support", "All free features"],
        coach: ["Everything in Pro", "Up to 10 client accounts", "Usage analytics", "White-label option", "Bulk invite links"],
      },
    },
    ru: {
      title: "Обновить MindFlow",
      sub: "Без лимитов. Синхронизация везде. Оставайся в потоке.",
      freeTitle: "Free", proTitle: "Pro", coachTitle: "Coach",
      freeSub: "Начать", proSub: "Популярный", coachSub: "Для коучей",
      perMonth: "/мес", perYear: "при годовой оплате",
      waitlistBtn: "Попасть в ожидание Pro →",
      waitlistDone: "✓ Ты в списке ожидания!",
      waitlistSub: "Уведомим когда Pro запустится.",
      features: {
        free: ["30 AI-дампов в месяц", "50 мыслей в хранилище", "Базовый AI-разбор", "3 языка"],
        pro: ["Неограниченные дампы", "Синхронизация везде", "Telegram бот", "История вечерних обзоров", "Приоритетная поддержка", "Всё из Free"],
        coach: ["Всё из Pro", "До 10 клиентских аккаунтов", "Аналитика использования", "White-label", "Массовые ссылки"],
      },
    },
    az: {
      title: "MindFlow-u yüksəldin",
      sub: "Limitsiz. Hər yerdə sinxronizasiya. Axışda qal.",
      freeTitle: "Pulsuz", proTitle: "Pro", coachTitle: "Koç",
      freeSub: "Başla", proSub: "Ən populyar", coachSub: "Koçlar üçün",
      perMonth: "/ay", perYear: "illik ödənişlə",
      waitlistBtn: "Pro gözləmə siyahısına qoşul →",
      waitlistDone: "✓ Siyahıdasınız!",
      waitlistSub: "Pro başlayanda bildirəcəyik.",
      features: {
        free: ["Ayda 30 AI dempinqi", "50 fikir saxlanır", "Əsas AI analizi", "3 dil"],
        pro: ["Limitsiz dempinq", "Hər yerdə sinxronizasiya", "Telegram botu", "Axşam icmalı tarixi", "Prioritet dəstək", "Pulsuzdakı hər şey"],
        coach: ["Pro-dakı hər şey", "10 müştəri hesabı", "İstifadə analitikası", "White-label", "Toplu dəvət linkləri"],
      },
    },
  };
  const tx = TL[lang] || TL.en;

  const handleWaitlist = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const sb = getSupabase();
      if (sb) await sb.from("waitlist").upsert({ email: email.trim(), source: "pricing", lang }, { onConflict: "email" });
    } catch (e) { logError("PricingModal.waitlistUpsert", e); }
    setLoading(false);
    setSubmitted(true);
  };

  const plans = [
    {
      id: "free", title: tx.freeTitle, sub: tx.freeSub,
      price: "0", features: tx.features.free, cta: null, highlight: false,
    },
    {
      id: "pro", title: tx.proTitle, sub: tx.proSub,
      price: "8", features: tx.features.pro, highlight: true,
    },
    {
      id: "coach", title: tx.coachTitle, sub: tx.coachSub,
      price: "49", features: tx.features.coach, highlight: false,
    },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.82)", zIndex: 200, display: "flex", alignItems: "flex-end", backdropFilter: "blur(8px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: "100%", maxWidth: 480, margin: "0 auto", background: C.bg, borderRadius: "24px 24px 0 0", maxHeight: "92vh", overflowY: "auto", paddingBottom: 44 }}>

        {/* Header */}
        <div style={{ padding: "24px 24px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: -0.8 }}>{tx.title}</div>
            <div style={{ color: C.textSub, fontSize: 13, marginTop: 4 }}>{tx.sub}</div>
          </div>
          <button onClick={onClose} aria-label="Close pricing" style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 20, padding: 4, lineHeight: 1 }}>✕</button>
        </div>

        {/* Plans */}
        <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
          {plans.map(plan => (
            <div key={plan.id} style={{
              borderRadius: 18, padding: "16px 18px",
              background: plan.highlight ? `linear-gradient(135deg, ${C.accent}18, ${C.accentLit}10)` : C.surface,
              border: `1.5px solid ${plan.highlight ? C.accent : C.border}`,
              position: "relative",
            }}>
              {plan.highlight && (
                <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: `linear-gradient(90deg, ${C.accent}, ${C.accentLit})`, color: "white", fontSize: 10, fontWeight: 800, padding: "3px 12px", borderRadius: 20, letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap" }}>
                  {lang === "ru" ? "★ Популярный" : lang === "az" ? "★ Məşhur" : "★ Most Popular"}
                </div>
              )}

              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 12, marginTop: plan.highlight ? 6 : 0 }}>
                <div>
                  <div style={{ color: C.text, fontSize: 16, fontWeight: 800, fontFamily: "Syne, sans-serif" }}>{plan.title}</div>
                  <div style={{ color: C.textDim, fontSize: 11, marginTop: 2 }}>{plan.sub}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: plan.highlight ? C.accentLit : C.text, fontSize: 22, fontWeight: 800, lineHeight: 1 }}>
                    {plan.price === "0" ? (lang === "ru" ? "Бесплатно" : lang === "az" ? "Pulsuz" : "Free") : `$${plan.price}`}
                    {plan.price !== "0" && <span style={{ fontSize: 12, fontWeight: 500, color: C.textSub }}>{tx.perMonth}</span>}
                  </div>
                  {plan.price !== "0" && <div style={{ color: C.textDim, fontSize: 10, marginTop: 2 }}>{tx.perYear}</div>}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: plan.id !== "free" ? 14 : 0 }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", background: plan.highlight ? `${C.done}20` : `${C.textDim}20`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="8" height="8" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" stroke={plan.highlight ? C.done : C.textSub} strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
                    </div>
                    <span style={{ color: plan.highlight ? C.text : C.textSub, fontSize: 13 }}>{f}</span>
                  </div>
                ))}
              </div>

              {plan.id !== "free" && !submitted && (
                <div>
                  {plan.id === "pro" && (
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && handleWaitlist()}
                      placeholder="your@email.com" autoComplete="email"
                      style={{ width: "100%", background: `${C.bg}`, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, padding: "10px 14px", outline: "none", fontFamily: "inherit", boxSizing: "border-box", marginBottom: 8 }} />
                  )}
                  <button onClick={plan.id === "pro" ? handleWaitlist : undefined}
                    disabled={plan.id === "pro" && loading}
                    style={{ width: "100%", height: 42, background: plan.highlight ? `linear-gradient(135deg, ${C.accent}, ${C.accentLit})` : C.surfaceHi, color: plan.highlight ? "white" : C.textSub, border: plan.highlight ? "none" : `1px solid ${C.border}`, borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", boxShadow: plan.highlight ? `0 4px 18px ${C.accentGlow}` : "none" }}>
                    {loading && plan.id === "pro" ? "..." : tx.waitlistBtn}
                  </button>
                </div>
              )}
            </div>
          ))}

          {submitted && (
            <div style={{ textAlign: "center", padding: "16px 0", animation: "fadeIn .3s ease" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
              <div style={{ color: C.text, fontWeight: 700, marginBottom: 4 }}>{tx.waitlistDone}</div>
              <div style={{ color: C.textSub, fontSize: 13 }}>{tx.waitlistSub}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
// EXPORT PANEL
// ─────────────────────────────────────────────────────────────────────────────
function ExportPanel({ thoughts, lang, onClose }) {
  const [copied, setCopied] = useState(false);
  const md = exportToMarkdown(thoughts, lang);
  const tx = T[lang] || T.en;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(md);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = md;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const TG_BOT = "MindFlowCaptureBot";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 500, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.surface, borderRadius: "20px 20px 0 0", padding: "24px 20px 40px", width: "100%", maxWidth: 480 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ color: C.text, fontSize: 18, fontWeight: 700 }}>{tx.exportData}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textSub, fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ background: C.bg, borderRadius: 12, padding: "12px 14px", marginBottom: 16, maxHeight: 200, overflowY: "auto", border: `1px solid ${C.border}` }}>
          <pre style={{ color: C.textSub, fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-wrap", margin: 0, fontFamily: "monospace" }}>
            {md.slice(0, 600)}{md.length > 600 ? "..." : ""}
          </pre>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={copy} style={{ height: 48, background: copied ? `${C.done}22` : C.accent, color: copied ? C.done : "white", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all .2s" }}>
            {copied ? "✓ " + (lang === "ru" ? "Скопировано!" : lang === "az" ? "Kopyalandı!" : "Copied!") : "📋 " + (lang === "ru" ? "Копировать Markdown" : lang === "az" ? "Markdown kopyala" : "Copy as Markdown")}
          </button>
          <button onClick={() => {
            const json = JSON.stringify(thoughts.filter(t => !t.archived), null, 2);
            const blob = new Blob([json], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `mindflow-${new Date().toISOString().slice(0,10)}.json`;
            a.click();
          }} style={{ height: 48, background: C.surfaceHi, color: C.text, border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            ⬇️ {lang === "ru" ? "Скачать JSON" : lang === "az" ? "JSON yüklə" : "Download JSON"}
          </button>
          <button onClick={() => window.open(`https://t.me/${TG_BOT}`, "_blank")} style={{ height: 48, background: "#2AABEE22", color: "#2AABEE", border: "1px solid #2AABEE44", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            ✈️ {lang === "ru" ? "Открыть Telegram-бот" : lang === "az" ? "Telegram bot aç" : "Open Telegram Bot"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: SETTINGS
// ─────────────────────────────────────────────────────────────────────────────
function SettingsScreen({ thoughts, lang, onChangeLang, onClearAll, user, syncOn, onToggleSync, onShowAuth, onSignOut, persona, onExport, onNotif, onNotion, isPro, onShowPricing }) {
  const tx = T[lang] || T.en;
  const total       = thoughts.length;
  const archived    = thoughts.filter(t => t.archived).length;
  const todayActive = thoughts.filter(t => t.isToday && !t.archived).length;
  const todayDone   = thoughts.filter(t => t.archived && isToday(t.archivedAt || t.updatedAt)).length;
  const streak      = getStreakData(thoughts);
  const p           = persona?.patterns;
  const dumpCount   = getDumpCount();

  return (
    <div style={{ overflowY: "auto", height: "100%", padding: "18px 16px 80px" }}>
      <div style={{ fontFamily: "Syne, sans-serif", color: C.text, fontSize: 26, fontWeight: 800, letterSpacing: -1, marginBottom: 16 }}>{tx.settings}</div>

      {/* Pro status banner */}
      {!isPro ? (
        <div onClick={() => onShowPricing?.("dumps")} style={{ marginBottom: 16, borderRadius: 16, padding: "14px 16px", background: `linear-gradient(135deg, ${C.accent}18, ${C.accentLit}10)`, border: `1.5px solid ${C.accent}33`, cursor: "pointer", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 26 }}>⚡</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: C.text, fontSize: 14, fontWeight: 700, fontFamily: "Syne, sans-serif" }}>
              {lang === "ru" ? "Перейти на Pro" : lang === "az" ? "Pro-ya keç" : "Upgrade to Pro"}
            </div>
            <div style={{ color: C.textSub, fontSize: 12, marginTop: 2 }}>
              {lang === "ru" ? `${dumpCount}/${FREE_LIMITS.dumpsPerMonth} AI-дампов этого месяца` :
               lang === "az" ? `Bu ay ${dumpCount}/${FREE_LIMITS.dumpsPerMonth} demp` :
               `${dumpCount}/${FREE_LIMITS.dumpsPerMonth} dumps this month`}
            </div>
          </div>
          {/* mini progress bar */}
          <div style={{ width: 40, height: 40, position: "relative", flexShrink: 0 }}>
            <svg viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="18" cy="18" r="15" fill="none" stroke={`${C.accent}20`} strokeWidth="3" />
              <circle cx="18" cy="18" r="15" fill="none" stroke={C.accentLit} strokeWidth="3"
                strokeDasharray={`${Math.min(dumpCount / FREE_LIMITS.dumpsPerMonth * 94, 94)} 94`}
                strokeLinecap="round" />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: C.accentLit, fontWeight: 700 }}>
              {Math.round(dumpCount / FREE_LIMITS.dumpsPerMonth * 100)}%
            </div>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 16, borderRadius: 16, padding: "10px 16px", background: `${C.done}10`, border: `1px solid ${C.done}25`, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>✓</span>
          <span style={{ color: C.done, fontSize: 13, fontWeight: 700 }}>
            {lang === "ru" ? "Pro план активен" : lang === "az" ? "Pro plan aktivdir" : "Pro plan active"}
          </span>
        </div>
      )}

      <Card title={tx.account} icon={Icon.user(C.textSub, 14)}>
        {user ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: C.text, fontSize: 14 }}>{user.email}</div>
              <div style={{ color: C.done, fontSize: 12, marginTop: 2 }}>● {tx.signedIn}</div>
            </div>
            <button onClick={onSignOut} style={{ background: `${C.high}18`, color: C.high, border: `1px solid ${C.high}33`, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              {tx.signOut}
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ color: C.textSub, fontSize: 14 }}>{tx.notSignedIn}</div>
            <button onClick={onShowAuth} style={{ background: C.accentDim, color: C.accent, border: `1px solid ${C.accent}44`, borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              {tx.signIn}
            </button>
          </div>
        )}
      </Card>

      {user ? (
        <Card title={tx.cloudSync} icon={Icon.cloud(C.textSub, 14)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: C.text, fontSize: 14 }}>{tx.syncThoughts}</div>
              <div style={{ color: C.textSub, fontSize: 12, marginTop: 2 }}>{user.email} · Supabase</div>
            </div>
            <Toggle on={syncOn} onChange={onToggleSync} />
          </div>
        </Card>
      ) : (
        <Card title={tx.cloudSync} icon={Icon.cloud(C.textSub, 14)}>
          <div style={{ color: C.textSub, fontSize: 13, marginBottom: 12, lineHeight: 1.6 }}>
            {lang === "ru" ? "Войди чтобы синхронизировать мысли между устройствами и Telegram-ботом." : lang === "az" ? "Fikirlərini cihazlar arasında sinxronlaşdırmaq üçün daxil ol." : "Sign in to sync thoughts across devices and Telegram."}
          </div>
          <button onClick={onShowAuth} style={{ width: "100%", height: 44, background: `linear-gradient(135deg, ${C.accent}, ${C.accentLit})`, color: "white", border: "none", borderRadius: 11, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {Icon.user("white", 15)}
            {lang === "ru" ? "Войти через email" : lang === "az" ? "Email ilə daxil ol" : "Sign in with email"}
          </button>
        </Card>
      )}

      {p?.topTags?.length > 0 && (
        <Card title={tx.patterns} icon={Icon.sparkle(C.textSub, 14)}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {p.topTags.map(tag => (
              <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: C.accentDim, color: C.accentLit, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 7, border: `1px solid ${C.accent}22` }}>
                {Icon.tag(C.accent, 9)}{tag}
              </span>
            ))}
          </div>
          {p.completionRate !== undefined && (
            <div style={{ color: C.textSub, fontSize: 13 }}>
              {lang === "ru" ? "Выполнение:" : "Completion:"} <strong style={{ color: C.done }}>{Math.round(p.completionRate * 100)}%</strong>
            </div>
          )}
        </Card>
      )}

      <Card title={tx.langLabel}>
        <div style={{ display: "flex", gap: 8 }}>
          {LANGS.map(l => (
            <button key={l.id} onClick={() => onChangeLang(l.id)} style={{ flex: 1, padding: "12px 8px", borderRadius: 12, border: `1.5px solid ${lang === l.id ? C.accent : C.border}`, background: lang === l.id ? C.accentDim : "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, transition: "all .2s", boxShadow: lang === l.id ? `0 0 16px ${C.accentGlow}` : "none" }}>
              <span style={{ fontSize: 22 }}>{l.flag}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: lang === l.id ? C.accentLit : C.textSub, fontFamily: "Syne, sans-serif" }}>{l.name}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Streak Card — Duolingo-style loss aversion */}
      {streak.current > 0 && (
        <div style={{ background: streak.doneToday ? `${C.done}12` : `${C.high}12`, border: `1px solid ${streak.doneToday ? C.done : C.high}33`, borderRadius: 16, padding: "16px 18px", marginBottom: 4, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 40, lineHeight: 1 }}>🔥</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "Syne, sans-serif", fontSize: 28, fontWeight: 800, color: streak.doneToday ? C.done : C.high, lineHeight: 1 }}>
              {streak.current} <span style={{ fontSize: 14, fontWeight: 600, color: C.textSub }}>{lang === "ru" ? "дней" : lang === "az" ? "gün" : "days"}</span>
            </div>
            <div style={{ color: streak.doneToday ? C.done : C.high, fontSize: 12, fontWeight: 600, marginTop: 3 }}>
              {streak.doneToday
                ? (lang === "ru" ? "Серия жива — отличная работа" : lang === "az" ? "Seriya davam edir — əla iş" : "Streak alive — great work")
                : (lang === "ru" ? "⚠️ Сделай дамп сегодня — не теряй серию!" : lang === "az" ? "⚠️ Bu gün dump et — seriyani itirmə!" : "⚠️ Dump today — don't break the streak!")}
            </div>
            {streak.longest > streak.current && (
              <div style={{ color: C.textSub, fontSize: 11, marginTop: 2 }}>
                {lang === "ru" ? `Рекорд: ${streak.longest} дней` : lang === "az" ? `Rekord: ${streak.longest} gün` : `Best: ${streak.longest} days`}
              </div>
            )}
          </div>
        </div>
      )}

      <Card title={tx.stats} icon={Icon.focus(C.textSub, 14)}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[{ l: tx.total, v: total }, { l: tx.totalDone, v: archived }, { l: tx.todayActive, v: todayActive, c: C.accentLit }, { l: tx.todayDone, v: todayDone, c: C.done }].map(s => (
            <div key={s.l} style={{ background: C.surfaceHi, borderRadius: 12, padding: "12px", textAlign: "center", border: `1px solid ${C.border}` }}>
              <div style={{ fontFamily: "Syne, sans-serif", fontSize: 24, fontWeight: 800, color: s.c || C.text }}>{s.v}</div>
              <div style={{ fontSize: 10, color: C.textSub, marginTop: 2, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title={lang === "ru" ? "Напоминания" : lang === "az" ? "Xatırlatmalar" : "Reminders"} icon={Icon.bell(C.textSub, 14)}>
        <div style={{ color: C.textSub, fontSize: 13, marginBottom: 12, lineHeight: 1.6 }}>
          {lang === "ru" ? "Утренний ритуал и вечерний обзор по расписанию." : lang === "az" ? "Səhər ritualu və axşam icmalı." : "Morning ritual and evening review on schedule."}
        </div>
        <button onClick={onNotif} style={{ width: "100%", height: 44, background: C.accentDim, color: C.accentLit, border: `1px solid ${C.accent}33`, borderRadius: 11, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, letterSpacing: 0.2 }}>
          {Icon.bell(C.accentLit, 15)}
          {lang === "ru" ? "Настроить напоминания" : lang === "az" ? "Xatırlatmaları tənzimləyin" : "Set up reminders"}
        </button>
      </Card>

      <Card title={tx.exportData} icon={Icon.export(C.textSub, 14)}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={onExport} style={{ width: "100%", height: 44, background: C.accentDim, color: C.accentLit, border: `1px solid ${C.accent}33`, borderRadius: 11, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {Icon.export(C.accentLit, 15)}
            {tx.exportThoughts}
          </button>
          <button onClick={onNotion} style={{ width: "100%", height: 44, background: "transparent", color: C.text, border: `1px solid ${C.border}`, borderRadius: 11, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "border-color .15s, background .15s" }}>
            📝 {lang === "ru" ? "Экспорт в Notion" : lang === "az" ? "Notion-a ixrac" : "Export to Notion"}
          </button>
        </div>
      </Card>

      <Card title={tx.about}>
        <div style={{ color: C.textSub, fontSize: 13, lineHeight: 1.8, marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: C.text, fontWeight: 700, fontFamily: "Syne, sans-serif" }}>MindFlow</span>
            <span style={{ background: `${C.accent}20`, color: C.accentLit, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 5, letterSpacing: 0.5, border: `1px solid ${C.accent}30` }}>BETA · v0.7</span>
          </div>
          <span style={{ color: C.textDim, fontSize: 11 }}>React + AI + Supabase · ADHD OS</span>
        </div>
        <button onClick={() => window.confirm(tx.clearAll + "?") && onClearAll()} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `${C.high}12`, color: C.high, border: `1px solid ${C.high}22`, borderRadius: 9, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          {Icon.trash(C.high, 13)}
          {tx.clearAll}
        </button>
      </Card>
    </div>
  );
}

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
// NOTIFICATION SETTINGS PANEL
// ─────────────────────────────────────────────────────────────────────────────
function NotifPanel({ lang, onClose }) {
  const tx = T[lang] || T.en;
  const [prefs, setPrefs] = useState(loadNotifPrefs);
  const [permission, setPermission] = useState(
    "Notification" in window ? Notification.permission : "unsupported"
  );
  const [saved, setSaved] = useState(false);

  const requestPerm = async () => {
    const result = await requestNotifPermission();
    setPermission(result);
    if (result === "granted") {
      const next = { ...prefs, enabled: true };
      setPrefs(next);
    }
  };

  const save = () => {
    saveNotifPrefs(prefs);
    applyNotifSchedule(prefs, lang);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1200);
  };

  const TL = {
    en: {
      title: "Ritual Reminders",
      permNeeded: "Allow notifications to get daily reminders.",
      allow: "Allow Notifications",
      denied: "Notifications blocked. Enable in browser settings.",
      unsupported: "Notifications not supported in this browser.",
      enableAll: "Enable daily reminders",
      morning: "Morning Ritual",
      evening: "Evening Review",
      saved: "✓ Saved!",
      save: "Save Schedule",
    },
    ru: {
      title: "Напоминания о ритуалах",
      permNeeded: "Разреши уведомления для ежедневных напоминаний.",
      allow: "Разрешить уведомления",
      denied: "Уведомления заблокированы. Включи в настройках браузера.",
      unsupported: "Уведомления не поддерживаются в этом браузере.",
      enableAll: "Включить ежедневные напоминания",
      morning: "Утренний ритуал",
      evening: "Вечерний обзор",
      saved: "✓ Сохранено!",
      save: "Сохранить расписание",
    },
    az: {
      title: "Ritual xatırlatmaları",
      permNeeded: "Gündəlik xatırlatmalar üçün bildirişlərə icazə ver.",
      allow: "Bildirişlərə icazə ver",
      denied: "Bildirişlər bloklanıb. Brauzer parametrlərindən aktiv et.",
      unsupported: "Bu brauzerdə bildirişlər dəstəklənmir.",
      enableAll: "Gündəlik xatırlatmaları aktiv et",
      morning: "Səhər ritualu",
      evening: "Axşam icmalı",
      saved: "✓ Saxlandı!",
      save: "Cədvəli saxla",
    },
  };
  const tl = TL[lang] || TL.en;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 600, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.surface, borderRadius: "20px 20px 0 0", padding: "24px 20px 44px", width: "100%", maxWidth: 480 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ color: C.text, fontSize: 18, fontWeight: 700 }}>🔔 {tl.title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textSub, fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        {permission === "unsupported" && (
          <div style={{ background: `${C.textDim}18`, borderRadius: 12, padding: "12px 14px", color: C.textSub, fontSize: 14, marginBottom: 16 }}>{tl.unsupported}</div>
        )}

        {permission === "denied" && (
          <div style={{ background: `${C.high}15`, borderRadius: 12, padding: "12px 14px", color: C.high, fontSize: 14, marginBottom: 16 }}>{tl.denied}</div>
        )}

        {permission === "default" && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: C.textSub, fontSize: 14, marginBottom: 12 }}>{tl.permNeeded}</div>
            <button onClick={requestPerm} style={{ width: "100%", height: 44, background: C.accent, color: "white", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              {tl.allow}
            </button>
          </div>
        )}

        {(permission === "granted") && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Master toggle */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: C.surfaceHi, borderRadius: 12, border: `1px solid ${C.border}` }}>
              <span style={{ color: C.text, fontSize: 14, fontWeight: 600 }}>{tl.enableAll}</span>
              <Toggle on={prefs.enabled} onChange={() => setPrefs(p => ({ ...p, enabled: !p.enabled }))} />
            </div>

            {prefs.enabled && (
              <>
                {/* Morning */}
                <div style={{ padding: "12px 14px", background: C.surfaceHi, borderRadius: 12, border: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: prefs.morningOn ? 10 : 0 }}>
                    <span style={{ color: C.text, fontSize: 14 }}>☀️ {tl.morning}</span>
                    <Toggle on={prefs.morningOn} onChange={() => setPrefs(p => ({ ...p, morningOn: !p.morningOn }))} />
                  </div>
                  {prefs.morningOn && (
                    <input type="time" value={prefs.morningTime}
                      onChange={e => setPrefs(p => ({ ...p, morningTime: e.target.value }))}
                      style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 22, fontWeight: 700, padding: "6px 10px", fontFamily: "inherit", outline: "none", width: "100%" }} />
                  )}
                </div>

                {/* Evening */}
                <div style={{ padding: "12px 14px", background: C.surfaceHi, borderRadius: 12, border: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: prefs.eveningOn ? 10 : 0 }}>
                    <span style={{ color: C.text, fontSize: 14 }}>🌙 {tl.evening}</span>
                    <Toggle on={prefs.eveningOn} onChange={() => setPrefs(p => ({ ...p, eveningOn: !p.eveningOn }))} />
                  </div>
                  {prefs.eveningOn && (
                    <input type="time" value={prefs.eveningTime}
                      onChange={e => setPrefs(p => ({ ...p, eveningTime: e.target.value }))}
                      style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 22, fontWeight: 700, padding: "6px 10px", fontFamily: "inherit", outline: "none", width: "100%" }} />
                  )}
                </div>
              </>
            )}

            <button onClick={save} style={{ height: 48, background: saved ? `${C.done}22` : C.accent, color: saved ? C.done : "white", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all .2s" }}>
              {saved ? tl.saved : tl.save}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NOTION CONFIG PANEL
// ─────────────────────────────────────────────────────────────────────────────
function NotionPanel({ thoughts, lang, onClose }) {
  const [copied, setCopied] = useState(false);
  const activeTasks = thoughts.filter(t => !t.archived && t.type === "task");

  const TL = {
    en: { title: "Export to Notion", hint: "Notion blocks direct API calls from browsers. Export as CSV and import it into any Notion database via Settings → Import.", btn: "Copy CSV for Notion", copied: "✓ Copied!", download: "Download CSV", count: (n) => `${n} tasks ready` },
    ru: { title: "Экспорт в Notion", hint: "Notion блокирует прямые запросы из браузера. Экспортируй как CSV и импортируй в Notion через Настройки → Импорт.", btn: "Копировать CSV для Notion", copied: "✓ Скопировано!", download: "Скачать CSV", count: (n) => `${n} задач готово` },
    az: { title: "Notion-a ixrac", hint: "Notion brauzerdən birbaşa API çağırışlarını bloklayır. CSV olaraq ixrac et və Notion-a Parametrlər → İdxal vasitəsilə yüklə.", btn: "Notion üçün CSV kopyala", copied: "✓ Kopyalandı!", download: "CSV yüklə", count: (n) => `${n} tapşırıq hazırdır` },
  };
  const tl = TL[lang] || TL.en;

  const toCSV = () => {
    const header = "Name,Status,Priority,Tags,Created\n";
    const rows = activeTasks.map(t =>
      `"${t.text.replace(/"/g, '""')}","Not started","${t.priority || "none"}","${(t.tags || []).join("; ")}","${t.createdAt?.slice(0, 10) || ""}"`
    ).join("\n");
    return header + rows;
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(toCSV()); }
    catch { const ta = document.createElement("textarea"); ta.value = toCSV(); document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    const blob = new Blob([toCSV()], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `mindflow-notion-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 600, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.surface, borderRadius: "20px 20px 0 0", padding: "24px 20px 44px", width: "100%", maxWidth: 480 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ color: C.text, fontSize: 18, fontWeight: 700 }}>📝 {tl.title}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textSub, fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ color: C.textSub, fontSize: 13, marginBottom: 16, lineHeight: 1.6, background: `${C.accent}10`, padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.accent}20` }}>
          💡 {tl.hint}
        </div>

        <div style={{ color: C.textDim, fontSize: 12, marginBottom: 16 }}>{tl.count(activeTasks.length)}</div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={copy} style={{ height: 48, background: copied ? `${C.done}22` : C.accent, color: copied ? C.done : "white", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all .2s" }}>
            {copied ? tl.copied : tl.btn}
          </button>
          <button onClick={download} style={{ height: 48, background: C.surfaceHi, color: C.text, border: `1px solid ${C.border}`, borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            ⬇️ {tl.download}
          </button>
        </div>
      </div>
    </div>
  );
}

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
