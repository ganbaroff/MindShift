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
import {
  parseDump,
  generateEveningReview,
  aiFocusSuggest,
  buildPersonaContext,
} from "./shared/services/claude.js";
// Bolt 1.2: pure utilities extracted to shared/lib/
import { uid }                       from "./shared/lib/id.js";
import { isToday, todayLabel }       from "./shared/lib/date.js";
import { getStreakData, saveStreak } from "./shared/lib/streak.js";

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
    } catch {}
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
  componentDidCatch(error, info) { console.error("[MindFlow ErrorBoundary]", error, info); }
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
// FREEMIUM LIMITS (saas-monetization skill)
// ─────────────────────────────────────────────────────────────────────────────
const FREE_LIMITS = {
  dumpsPerMonth: 30,   // AI calls per month
  thoughtsStored: 50,  // max active (non-archived) thoughts
};

function getMonthKey() {
  const d = new Date();
  return `mf_dumps_${d.getFullYear()}_${d.getMonth()}`;
}

function getDumpCount() {
  try { return parseInt(localStorage.getItem(getMonthKey()) || "0", 10); } catch { return 0; }
}

function incrementDumpCount() {
  try {
    const key = getMonthKey();
    const n = getDumpCount() + 1;
    localStorage.setItem(key, String(n));
    return n;
  } catch { return 0; }
}

function isProUser(user, subscription) {
  if (!user) return false;
  if (subscription?.plan === "pro" || subscription?.plan === "coach") return true;
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE — client + DB ops moved to shared/services/supabase.js (Bolt 1.1)
// getSupabase, waitForSupabase, sbPush/Pull/Save/Load imported above.
// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
// PERSONA v1
// buildPersonaContext moved to shared/services/claude.js (Bolt 1.1)
// updatePersona stays here — it's UI state logic, not a service.
// ─────────────────────────────────────────────────────────────────────────────
function updatePersona(persona, newThoughts, archivedId) {
  const p = persona?.patterns || {};
  const tagFreq = { ...(p.tagFreq || {}) };
  newThoughts.forEach(t => (t.tags || []).forEach(tag => { tagFreq[tag] = (tagFreq[tag] || 0) + 1; }));
  const topTags = Object.entries(tagFreq).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t);
  const total = (p.totalTasks || 0) + newThoughts.filter(t => t.type === "task").length;
  const done  = (p.doneTasks  || 0) + (archivedId ? 1 : 0);
  const completionRate = total > 0 ? done / total : 0;
  const hour = new Date().getHours();
  const hourCounts = { ...(p.hourCounts || {}) };
  hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  const mostActiveHour = parseInt(Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "9");
  return {
    updatedAt: new Date().toISOString(),
    patterns: { tagFreq, topTags, totalTasks: total, doneTasks: done, completionRate, hourCounts, mostActiveHour },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  bg:        "#07070D",
  surface:   "#0F0F18",
  surfaceHi: "#171724",
  border:    "#1E1E2E",
  borderHi:  "#2E2E48",
  accent:    "#6C5CE7",
  accentLit: "#8B7FFF",
  accentDim: "#6C5CE715",
  accentGlow:"#6C5CE740",
  text:      "#F0F0F8",
  textSub:   "#6868A0",
  textDim:   "#2E2E48",
  task:      "#6C5CE7",
  idea:      "#F0A500",
  reminder:  "#9B7FE8",
  expense:   "#FF6B6B",
  memory:    "#00CEC9",
  note:      "#636380",
  done:      "#00B894",
  high:      "#FF6B6B",
  medium:    "#FDCB6E",
  low:       "#00B894",
  // glow colors for cards
  glowTask:    "rgba(108,92,231,0.12)",
  glowIdea:    "rgba(240,165,0,0.10)",
  glowDone:    "rgba(0,184,148,0.10)",
};

const P_COLOR = { critical: C.high, high: C.high, medium: C.medium, low: C.low, none: "transparent" };

// ─────────────────────────────────────────────────────────────────────────────
// SVG ICONS — crisp, consistent, production-grade
// ─────────────────────────────────────────────────────────────────────────────
const Icon = {
  // Nav
  dump: (c,s=22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z"/>
      <circle cx="12" cy="9" r="2.5"/>
    </svg>
  ),
  today: (c,s=22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  evening: (c,s=22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  ),
  settings: (c,s=22) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  // Types
  task: (c,s=14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  idea: (c,s=14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      <circle cx="12" cy="12" r="4"/>
    </svg>
  ),
  reminder: (c,s=14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  expense: (c,s=14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
  memory: (c,s=14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a5 5 0 0 1 5 5v3a5 5 0 0 1-10 0V7a5 5 0 0 1 5-5z"/>
      <path d="M8 13.5A4 4 0 0 0 4 17v1h16v-1a4 4 0 0 0-4-3.5"/>
    </svg>
  ),
  note: (c,s=14) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  ),
  // UI
  mic: (c,s=18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  ),
  stop: (c,s=18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={c} stroke="none">
      <rect x="4" y="4" width="16" height="16" rx="3"/>
    </svg>
  ),
  send: (c,s=18) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  ),
  check: (c,s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  star: (c,s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  tag: (c,s=11) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  ),
  brain: (c,s=32) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.44-4.14A2.5 2.5 0 0 1 9.5 2"/>
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.44-4.14A2.5 2.5 0 0 0 14.5 2"/>
    </svg>
  ),
  sparkle: (c,s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/>
      <path d="M5 3l.75 2.25L8 6l-2.25.75L5 9l-.75-2.25L2 6l2.25-.75L5 3z"/>
      <path d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75L19 15z"/>
    </svg>
  ),
  focus: (c,s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M3 9V5h4M3 15v4h4M21 9V5h-4M21 15v4h-4"/>
    </svg>
  ),
  close: (c,s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  export: (c,s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
  bell: (c,s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  user: (c,s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  cloud: (c,s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
    </svg>
  ),
  trash: (c,s=16) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
    </svg>
  ),
};

const TYPE_CFG = {
  task:     { color: C.task,     icon: "task",     label: { en: "task",     ru: "задача",     az: "tapşırıq"   } },
  idea:     { color: C.idea,     icon: "idea",     label: { en: "idea",     ru: "идея",       az: "fikir"      } },
  reminder: { color: C.reminder, icon: "reminder", label: { en: "reminder", ru: "напомни",    az: "xatırlatma" } },
  expense:  { color: C.expense,  icon: "expense",  label: { en: "expense",  ru: "расход",     az: "xərc"       } },
  memory:   { color: C.memory,   icon: "memory",   label: { en: "memory",   ru: "память",     az: "yaddaş"     } },
  note:     { color: C.note,     icon: "note",     label: { en: "note",     ru: "заметка",    az: "qeyd"       } },
};

// ─────────────────────────────────────────────────────────────────────────────
// I18N — FIX: added todayShort for BottomNav
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  en: {
    appName: "MindFlow",
    dumpPlaceholder: "Dump everything here — tasks, worries, ideas...\n\nJust write or speak. AI will sort it out. ⌘+Enter to process.",
    process: "Process thoughts",
    processing: "Processing...",
    captured: "thoughts captured",
    errorRetry: "⚠ Error — try again",
    today: "Today's Focus",
    todayShort: "Today",         // FIX: nav label
    evening: "Evening Review",
    eveningShort: "Review",
    settings: "Settings",
    settingsShort: "Settings",
    dump: "Dump",
    noThoughts: "Your mind is clear.",
    noThoughtsSub: "Type or speak what's on your mind.",
    noToday: "Nothing planned yet.",
    noTodaySub: "Go to Dump and tap + Today on tasks.",
    allDone: "All done for today!",
    addToday: "+ Today",
    todayMark: "Today ✓",
    done: "✓ Done",
    completedToday: "Completed today",
    doneOf: "done",
    of: "of",
    greeting_morning: "Good morning ☀️",
    greeting_day: "Good afternoon",
    greeting_evening: "Good evening 🌙",
    howFeel: "How do you feel?",
    aiReflection: "AI Reflection",
    generate: "Generate ✨",
    thinking: "Thinking...",
    yourNote: "Your note (optional)",
    notePlaceholder: "Anything to remember about today...",
    saveDay: "Save & Close Day",
    savedDay: "✓ Saved — see you tomorrow!",
    completed: "completed",
    carryOver: "carry over",
    stats: "Session Stats",
    clearAll: "Clear all thoughts",
    clearSub: "Only clears this session",
    clear: "Clear",
    about: "About",
    items: "items",
    item: "item",
    filterAll: "all",
    chooseLanguage: "Choose your language",
    langSub: "You can change this later in Settings",
    continue: "Continue",
    onboardingTitle: "Welcome to MindFlow",
    onboardingDesc: "Dump everything on your mind.\nAI turns chaos into clarity.",
    recentReviews: "Recent reviews",
    total: "Total",
    totalDone: "Completed",
    todayActive: "Today active",
    todayDone: "Today done",
    local: "local",
    aiResponse: "AI sorted your thoughts",
    langLabel: "Language",
    account: "Account",
    signedIn: "Connected",
    notSignedIn: "Not signed in",
    signIn: "Sign in",
    signOut: "Sign out",
    cloudSync: "Cloud Sync",
    syncThoughts: "Sync thoughts",
    patterns: "Your patterns (AI Persona)",
    exportData: "Export data",
    exportThoughts: "Export thoughts",
  },
  ru: {
    appName: "MindFlow",
    dumpPlaceholder: "Выгружай всё сюда — задачи, мысли, идеи, тревоги...\n\nПросто пиши или говори. AI сам разберёт. ⌘+Enter для отправки.",
    process: "Обработать мысли",
    processing: "Обрабатываю...",
    captured: "мыслей сохранено",
    errorRetry: "⚠ Ошибка — попробуй ещё",
    today: "Фокус на сегодня",
    todayShort: "Сегодня",
    evening: "Вечерний обзор",
    eveningShort: "Обзор",
    settings: "Настройки",
    settingsShort: "Настройки",
    dump: "Дамп",
    noThoughts: "В голове чисто.",
    noThoughtsSub: "Напиши или скажи что на уме.",
    noToday: "Ничего не запланировано.",
    noTodaySub: "Перейди в Дамп и отметь задачи как «Сегодня».",
    allDone: "Всё сделано на сегодня!",
    addToday: "+ Сегодня",
    todayMark: "Сегодня ✓",
    done: "✓ Готово",
    completedToday: "Выполнено сегодня",
    doneOf: "выполнено",
    of: "из",
    greeting_morning: "Доброе утро ☀️",
    greeting_day: "Добрый день",
    greeting_evening: "Добрый вечер 🌙",
    howFeel: "Как ты себя чувствуешь?",
    aiReflection: "AI Рефлексия",
    generate: "Сгенерировать ✨",
    thinking: "Думаю...",
    yourNote: "Твоя заметка (необязательно)",
    notePlaceholder: "Что хочешь запомнить об этом дне...",
    saveDay: "Сохранить и закрыть день",
    savedDay: "✓ Сохранено — до завтра!",
    completed: "выполнено",
    carryOver: "переносится",
    stats: "Статистика сессии",
    clearAll: "Очистить все мысли",
    clearSub: "Только текущая сессия",
    clear: "Очистить",
    about: "О приложении",
    items: "элементов",
    item: "элемент",
    filterAll: "все",
    chooseLanguage: "Выбери язык",
    langSub: "Можно изменить позже в Настройках",
    continue: "Продолжить",
    onboardingTitle: "Добро пожаловать в MindFlow",
    onboardingDesc: "Выгружай всё что на уме.\nAI превращает хаос в ясность.",
    recentReviews: "Недавние обзоры",
    total: "Всего",
    totalDone: "Завершено",
    todayActive: "Активных сегодня",
    todayDone: "Сделано сегодня",
    local: "локально",
    aiResponse: "AI разобрал твои мысли",
    langLabel: "Язык",
    account: "Аккаунт",
    signedIn: "Подключён",
    notSignedIn: "Не вошёл",
    signIn: "Войти",
    signOut: "Выйти",
    cloudSync: "Облачная синхронизация",
    syncThoughts: "Синхронизировать мысли",
    patterns: "Твои паттерны (AI Персона)",
    exportData: "Экспорт данных",
    exportThoughts: "Экспортировать мысли",
  },
  az: {
    appName: "MindFlow",
    dumpPlaceholder: "Hər şeyi buraya yaz — tapşırıqlar, fikirlər, ideyalar...\n\nSadəcə yaz və ya danış. AI özü sıralayacaq. ⌘+Enter göndər.",
    process: "Fikirləri emal et",
    processing: "Emal edilir...",
    captured: "fikir saxlanıldı",
    errorRetry: "⚠ Xəta — yenidən cəhd et",
    today: "Bu günün fokus",
    todayShort: "Bu gün",
    evening: "Axşam icmalı",
    eveningShort: "İcmal",
    settings: "Parametrlər",
    settingsShort: "Parametr",
    dump: "Dump",
    noThoughts: "Zehin təmizdir.",
    noThoughtsSub: "Ağlında nə varsa yaz və ya danış.",
    noToday: "Hələ heç nə planlaşdırılmayıb.",
    noTodaySub: "Dump-a get və tapşırıqları Bu gün kimi işarələ.",
    allDone: "Bu gün hər şey hazırdır!",
    addToday: "+ Bu gün",
    todayMark: "Bu gün ✓",
    done: "✓ Hazır",
    completedToday: "Bu gün tamamlandı",
    doneOf: "tamamlandı",
    of: "/-dən",
    greeting_morning: "Sabahınız xeyir ☀️",
    greeting_day: "Günortanız xeyir",
    greeting_evening: "Axşamınız xeyir 🌙",
    howFeel: "Özünü necə hiss edirsən?",
    aiReflection: "AI Refleksiya",
    generate: "Yarat ✨",
    thinking: "Düşünürəm...",
    yourNote: "Qeydiniz (istəyə bağlı)",
    notePlaceholder: "Bu gün yadda saxlamaq istədiklərin...",
    saveDay: "Saxla və günü bağla",
    savedDay: "✓ Saxlandı — sabahkı görüşə!",
    completed: "tamamlandı",
    carryOver: "keçirilir",
    stats: "Sessiya statistikası",
    clearAll: "Bütün fikirləri sil",
    clearSub: "Yalnız bu sessiya",
    clear: "Sil",
    about: "Haqqında",
    items: "element",
    item: "element",
    filterAll: "hamısı",
    chooseLanguage: "Dilinizi seçin",
    langSub: "Bunu sonra Parametrlərdə dəyişə bilərsiniz",
    continue: "Davam et",
    onboardingTitle: "MindFlow-a xoş gəlmisiniz",
    onboardingDesc: "Ağlındakı hər şeyi töküb aşkar et.\nAI xaosu aydınlığa çevirir.",
    recentReviews: "Son icmallar",
    total: "Cəmi",
    totalDone: "Tamamlandı",
    todayActive: "Bu gün aktiv",
    todayDone: "Bu gün edildi",
    local: "yerli",
    aiResponse: "AI fikirlərinizi sıraladı",
    langLabel: "Dil",
    account: "Hesab",
    signedIn: "Qoşuldu",
    notSignedIn: "Daxil olunmayıb",
    signIn: "Daxil ol",
    signOut: "Çıxış",
    cloudSync: "Bulud sinxronizasiyası",
    syncThoughts: "Fikirləri sinxronlaşdır",
    patterns: "Sizin nümunələr (AI Persona)",
    exportData: "Məlumatları ixrac et",
    exportThoughts: "Fikirləri ixrac et",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILS — moved to shared/lib/ (Bolt 1.2)
// uid        → shared/lib/id.js
// isToday    → shared/lib/date.js
// todayLabel → shared/lib/date.js
// getStreakData, saveStreak → shared/lib/streak.js
// All imported above.
//
// greeting(lang) — stays here: depends on T[lang] translation object.
// TODO: move to shared/lib/i18n.js once T is extracted (Sprint 1.3+)
// ─────────────────────────────────────────────────────────────────────────────
function greeting(lang) {
  const h = new Date().getHours();
  const t = T[lang] || T.en;
  return h < 12 ? t.greeting_morning : h < 18 ? t.greeting_day : t.greeting_evening;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI — all functions moved to shared/services/claude.js (Bolt 1.1)
// callClaude, parseDump, generateEveningReview, aiFocusSuggest imported above.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────────────────────────────────────
function exportToMarkdown(thoughts, lang) {
  const groups = {};
  thoughts.filter(t => !t.archived).forEach(t => {
    if (!groups[t.type]) groups[t.type] = [];
    groups[t.type].push(t);
  });
  const date = new Date().toLocaleDateString(lang === "ru" ? "ru-RU" : "en-US");
  let md = `# MindFlow Export — ${date}\n\n`;
  for (const [type, items] of Object.entries(groups)) {
    const cfg = TYPE_CFG[type];
    md += `## ${(cfg?.label[lang] || type).toUpperCase()}\n\n`;
    items.forEach(t => {
      const pri = t.priority !== "none" ? ` [${t.priority}]` : "";
      const tags = t.tags?.length ? " " + t.tags.map(x => `#${x}`).join(" ") : "";
      md += `- ${t.text}${pri}${tags}\n`;
    });
    md += "\n";
  }
  return md;
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPABASE SYNC — all moved to shared/services/supabase.js (Bolt 1.1)
// setupRetryListeners, sbPushThought, sbPullThoughts, sbSavePersona,
// sbLoadPersona, getSupabase, waitForSupabase — all imported above.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// SHARED UI
// ─────────────────────────────────────────────────────────────────────────────
function Spinner({ size = 16, color = "white" }) {
  return (
    <div style={{
      width: size, height: size, flexShrink: 0,
      border: `2px solid ${color}33`, borderTopColor: color,
      borderRadius: "50%", animation: "spin .7s linear infinite",
    }} />
  );
}

// FIX: separate Toast animation from inline fadeIn
function Toast({ msg, type = "success" }) {
  const bg = type === "error" ? C.high : type === "info" ? C.surfaceHi : C.accent;
  return (
    <div role="alert" aria-live="polite" style={{
      position: "fixed", top: 14, left: "50%", transform: "translateX(-50%)",
      background: bg, color: "white", padding: "9px 20px", borderRadius: 11,
      fontSize: 13, fontWeight: 600, zIndex: 9999, whiteSpace: "nowrap",
      boxShadow: `0 4px 24px ${bg}55`, animation: "toastIn .2s ease",
      border: type === "info" ? `1px solid ${C.border}` : "none",
      maxWidth: "90vw", overflow: "hidden", textOverflow: "ellipsis",
    }}>
      {msg}
    </div>
  );
}

function Card({ title, children, action, icon }) {
  return (
    <div style={{ marginBottom: 10, background: C.surface, borderRadius: 16, padding: 16, border: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          {icon && <div style={{ opacity: 0.6 }}>{icon}</div>}
          <div style={{ color: C.textSub, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{title}</div>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Toggle({ on, onChange }) {
  return (
    <div onClick={onChange} style={{ width: 46, height: 26, borderRadius: 13, background: on ? C.accent : C.surfaceHi, border: `1px solid ${on ? C.accent : C.border}`, cursor: "pointer", position: "relative", transition: "all .2s", flexShrink: 0, boxShadow: on ? `0 0 12px ${C.accentGlow}` : "none" }}>
      <div style={{ position: "absolute", top: 3, left: on ? 22 : 3, width: 18, height: 18, borderRadius: "50%", background: "white", transition: "left .2s cubic-bezier(.34,1.56,.64,1)", boxShadow: "0 1px 4px rgba(0,0,0,.4)" }} />
    </div>
  );
}

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
const LANGS = [
  { id: "en", flag: "🇬🇧", name: "English" },
  { id: "ru", flag: "🇷🇺", name: "Русский" },
  { id: "az", flag: "🇦🇿", name: "Azərbaycan" },
];

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
// THOUGHT CARD
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// CLARIFY INLINE — answer AI clarification question inside card
// ─────────────────────────────────────────────────────────────────────────────
function ClarifyInline({ thought: t, lang, onUpdate }) {
  const [ans, setAns] = useState("");
  const [done, setDone] = useState(false);

  // FIX: save answer to thought via onUpdate, was discarded before
  const submit = () => {
    if (ans.trim() && onUpdate) {
      onUpdate(t.id, {
        clarifyAnswer: ans.trim(),
        clarifyAnswered: true,
        text: `${t.text} → ${ans.trim()}`,
        updatedAt: new Date().toISOString(),
      });
    }
    setDone(true);
  };

  const dismiss = () => setDone(true);
  if (done) return null;
  return (
    <div style={{ marginTop: 9, borderRadius: 9, background: `${C.idea}10`, border: `1px solid ${C.idea}25`, overflow: "hidden" }}>
      <div style={{ padding: "8px 11px", display: "flex", gap: 7, alignItems: "flex-start" }}>
        {Icon.sparkle(C.idea, 13)}
        <span style={{ color: C.idea, fontSize: 12.5, lineHeight: 1.5 }}>{t.clarify}</span>
      </div>
      <div style={{ display: "flex", borderTop: `1px solid ${C.idea}15` }}>
        <input
          value={ans} onChange={e => setAns(e.target.value)}
          onKeyDown={e => e.key === "Enter" && ans.trim() && submit()}
          placeholder={lang === "ru" ? "Ответить…" : lang === "az" ? "Cavabla…" : "Answer…"}
          style={{ flex: 1, background: "transparent", border: "none", outline: "none",
            color: C.text, fontSize: 12.5, padding: "7px 11px", fontFamily: "inherit" }} />
        {ans.trim() && (
          <button onClick={submit}
            style={{ background: "none", border: "none", color: C.done, padding: "0 10px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
            ✓
          </button>
        )}
        <button onClick={dismiss}
          style={{ background: "none", border: "none", color: C.textDim, padding: "0 10px", cursor: "pointer", fontSize: 12 }}>
          ✕
        </button>
      </div>
    </div>
  );
}

const ThoughtCard = memo(function ThoughtCard({ thought: t, lang, onToggleToday, onArchive, onUpdate, onTagClick, showDone = false }) {
  const cfg = TYPE_CFG[t.type] || TYPE_CFG.note;
  const tx = T[lang] || T.en;
  const [leaving, setLeaving] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const touchStartX = useRef(null);

  const handleDone = () => {
    setLeaving(true);
    setTimeout(() => onArchive?.(t.id), 280);
  };

  // Swipe-to-done on mobile (swipe left ≥ 60px)
  const onTouchStart = e => { touchStartX.current = e.touches[0].clientX; };
  const onTouchMove  = e => {
    if (touchStartX.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    if (dx < 0) setSwipeX(Math.max(dx, -80));
  };
  const onTouchEnd   = () => {
    if (swipeX < -55 && showDone) handleDone();
    else setSwipeX(0);
    touchStartX.current = null;
  };

  const typeIcon = Icon[cfg.icon];
  const hasPriority = t.priority !== "none";

  return (
    <div
      data-testid="thought-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{
        background: hovered ? C.surfaceHi : C.surface,
        borderRadius: 16,
        padding: "14px 16px",
        marginBottom: 10,
        border: `1px solid ${hasPriority ? P_COLOR[t.priority] + "44" : hovered ? C.borderHi : C.border}`,
        position: "relative", overflow: "hidden",
        opacity: leaving ? 0 : 1,
        transform: leaving ? "translateX(40px) scale(.96)" : swipeX !== 0 ? `translateX(${swipeX}px)` : hovered ? "translateY(-1px)" : "none",
        transition: swipeX !== 0 ? "none" : "opacity .28s, transform .2s, background .15s, border-color .15s",
        boxShadow: hovered && hasPriority ? `0 4px 20px ${P_COLOR[t.priority]}22` : hovered ? `0 4px 20px ${C.accentGlow}` : "none",
      }}>
      {/* Swipe hint background — shows green check as you swipe */}
      {swipeX < -10 && showDone && (
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 80, background: `linear-gradient(270deg, ${C.done}22, transparent)`, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 16, borderRadius: "0 16px 16px 0", pointerEvents: "none" }}>
          {Icon.check(C.done, 20)}
        </div>
      )}
      {/* Priority accent bar */}
      {hasPriority && (
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
          background: `linear-gradient(180deg, ${P_COLOR[t.priority]}, ${P_COLOR[t.priority]}88)`,
          borderRadius: "16px 0 0 16px",
        }} />
      )}

      <div style={{ paddingLeft: hasPriority ? 12 : 0 }}>
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
          {/* Type badge with SVG icon */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            background: `${cfg.color}18`, color: cfg.color,
            fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 7,
            letterSpacing: 0.3, textTransform: "uppercase",
          }}>
            {typeIcon && typeIcon(cfg.color, 12)}
            {cfg.label[lang] || cfg.label.en}
          </div>

          {/* Priority dot */}
          {hasPriority && (
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: P_COLOR[t.priority],
              boxShadow: `0 0 6px ${P_COLOR[t.priority]}`,
              flexShrink: 0,
            }} />
          )}

          <div style={{ flex: 1 }} />

          {/* Today toggle */}
          {t.type === "task" && !t.archived && onToggleToday && (
            <button onClick={() => onToggleToday(t.id)} style={{
              fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 7,
              border: `1px solid ${t.isToday ? C.accent : C.border}`,
              background: t.isToday ? `${C.accent}20` : "transparent",
              color: t.isToday ? C.accentLit : C.textSub,
              cursor: "pointer", transition: "all .15s", fontFamily: "inherit",
              letterSpacing: 0.2,
            }}>
              {t.isToday ? "⚡ today" : tx.addToday}
            </button>
          )}

          {/* Done button */}
          {showDone && !t.archived && (
            <button onClick={handleDone}
              aria-label={lang === "ru" ? "Отметить выполненным" : lang === "az" ? "Tamamlandı kimi işarələ" : "Mark as done"}
              title={lang === "ru" ? "Готово" : lang === "az" ? "Hazır" : "Done"}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 7,
                border: `1px solid ${C.done}44`, background: `${C.done}12`,
                color: C.done, cursor: "pointer", marginLeft: 4, fontFamily: "inherit",
                transition: "all .15s",
              }}>
              {Icon.check(C.done, 13)}
            </button>
          )}
        </div>

        {/* Text */}
        <p style={{ color: C.text, fontSize: 14.5, lineHeight: 1.55, margin: 0, letterSpacing: 0.1 }}>{t.text}</p>

        {/* Clarify question — interactive */}
        {t.clarify && !t.clarifyAnswered && (
          <ClarifyInline thought={t} lang={lang} onUpdate={onUpdate} />
        )}

        {/* Reminder time */}
        {/* Recurrence badge */}
        {t.recurrence && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, background: `${C.memory}15`, border: `1px solid ${C.memory}30`, borderRadius: 6, padding: "2px 7px" }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.memory} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            <span style={{ color: C.memory, fontSize: 10, fontWeight: 700, letterSpacing: 0.3 }}>
              {t.recurrence === "daily" ? (lang === "ru" ? "Ежедневно" : lang === "az" ? "Hər gün" : "Daily") :
               t.recurrence === "monthly" ? (lang === "ru" ? "Ежемесячно" : lang === "az" ? "Hər ay" : "Monthly") :
               t.recurrence?.startsWith("weekly:") ? (lang === "ru" ? `Еженед. ${t.recurrence.split(":")[1]}` : `Weekly ${t.recurrence.split(":")[1]}`) : t.recurrence}
            </span>
          </div>
        )}

        {t.reminderAt && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8,
            background: `${C.reminder}15`, border: `1px solid ${C.reminder}30`,
            borderRadius: 7, padding: "3px 9px", fontSize: 11, color: C.reminder, fontWeight: 600 }}>
            {Icon.bell(C.reminder, 11)}
            {new Date(t.reminderAt).toLocaleString(lang === "ru" ? "ru-RU" : lang === "az" ? "az-AZ" : "en-US",
              { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </div>
        )}

        {/* Tags — clickable for filter */}
        {t.tags?.length > 0 && (
          <div style={{ display: "flex", gap: 5, marginTop: 9, flexWrap: "wrap" }}>
            {t.tags.map(tag => (
              <button key={tag} onClick={e => { e.stopPropagation(); onTagClick?.(tag); }} style={{
                display: "inline-flex", alignItems: "center", gap: 3,
                fontSize: 11, color: C.textSub,
                background: C.bg, padding: "2px 7px", borderRadius: 5,
                border: `1px solid ${C.border}`,
                cursor: onTagClick ? "pointer" : "default",
                fontFamily: "inherit", fontWeight: 500,
                transition: "all .12s",
              }}
              onMouseEnter={e => { if (onTagClick) { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accentLit; }}}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSub; }}>
                {Icon.tag(C.textDim, 9)}
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}, (prev, next) =>
  prev.thought === next.thought &&
  prev.lang === next.lang &&
  prev.showDone === next.showDone
);

// ─────────────────────────────────────────────────────────────────────────────
// VOICE BUTTON
// ─────────────────────────────────────────────────────────────────────────────
function VoiceBtn({ onResult, disabled, lang }) {
  const [on, setOn] = useState(false);
  const recRef = useRef(null);
  const supported = "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
  const sttLang = lang === "ru" ? "ru-RU" : lang === "az" ? "az-AZ" : "en-US";

  const toggle = () => {
    if (!supported) { alert("Voice input not supported. Try Chrome."); return; }
    if (on) { recRef.current?.stop(); setOn(false); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = sttLang;
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = e => { onResult(e.results[0][0].transcript); setOn(false); };
    rec.onerror = rec.onend = () => setOn(false);
    rec.start();
    recRef.current = rec;
    setOn(true);
  };

  const ariaLabel = on
    ? (lang === "ru" ? "Остановить запись" : lang === "az" ? "Qeydiyyatı dayandır" : "Stop recording")
    : (lang === "ru" ? "Голосовой ввод" : lang === "az" ? "Səs girişi" : "Voice input");

  return (
    <button onClick={toggle} disabled={disabled} aria-label={ariaLabel} style={{
      width: 48, height: 48, borderRadius: 14, flexShrink: 0,
      border: `1px solid ${on ? C.high + "88" : C.border}`,
      background: on ? `${C.high}18` : C.surfaceHi,
      color: on ? C.high : C.textSub,
      cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: on ? "micPulse 1.4s infinite" : "none",
      transition: "all .2s",
      boxShadow: on ? `0 0 16px ${C.high}44` : "none",
    }}>
      {on ? Icon.stop(C.high, 16) : Icon.mic(C.textSub, 18)}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: DUMP
// ─────────────────────────────────────────────────────────────────────────────
function DumpScreen({ thoughts, onProcess, onToggleToday, onArchive, onUpdate, lang, persona, isPro, onShowPricing }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("idle");
  const [aiMsg, setAiMsg] = useState("");
  const [filter, setFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState(null);
  const tx = T[lang] || T.en;

  // useMemo: don't recompute on every render
  const visible = useMemo(() =>
    thoughts.filter(t => !t.archived &&
      (filter === "all" || t.type === filter) &&
      (!tagFilter || t.tags?.includes(tagFilter))
    ), [thoughts, filter, tagFilter]);

  // All unique tags across active thoughts for filter UI
  const allTags = useMemo(() => {
    const s = new Set();
    thoughts.forEach(t => { if (!t.archived) t.tags?.forEach(tag => s.add(tag)); });
    return [...s].slice(0, 12);
  }, [thoughts]);

  const process = async () => {
    if (!text.trim() || text.trim().length < 2 || status === "processing") return;

    // Freemium: check dump limit (non-pro users)
    if (!isPro) {
      const dumpCount = getDumpCount();
      const activeCount = thoughts.filter(t => !t.archived).length;
      if (dumpCount >= FREE_LIMITS.dumpsPerMonth) {
        onShowPricing?.("dumps");
        return;
      }
      if (activeCount >= FREE_LIMITS.thoughtsStored) {
        onShowPricing?.("thoughts");
        return;
      }
    }
    incrementDumpCount();
    setStatus("processing");
    setAiMsg("");
    try {
      const raw = await parseDump(text, lang, persona);
      let { items, response } = raw;
      // Verification: score AI output quality (adapted from ruflo verification-quality)
      const validTypes = ['task','note','idea','reminder','expense','memory'];
      const validPrios = ['none','low','medium','high','critical'];
      items = (items || []).filter(i => i.text?.trim().length > 1);
      items = items.map(i => ({
        ...i,
        type: validTypes.includes(i.type) ? i.type : "note",
        priority: validPrios.includes(i.priority) ? i.priority : "none",
        tags: Array.isArray(i.tags) ? i.tags.slice(0,3).map(t => t.toLowerCase()) : [],
      }));
      // Fallback: if AI returned nothing, save as single note
      if (!items.length) {
        items = [{ text: text.trim(), type: "note", priority: "none", tags: [], clarify: null }];
        response = lang === "ru" ? "Сохранил как заметку." : lang === "az" ? "Qeyd kimi saxladım." : "Saved as note.";
      }
      await onProcess(text, items);
      setAiMsg(response);
      setText("");
      setStatus("done");
      setTimeout(() => { setStatus("idle"); setAiMsg(""); }, 5000);
    } catch (e) {
      console.error(e);
      setStatus("error");
      // FIX: specific error messages for timeout and auth failures
      if (e.message === "timeout") {
        setAiMsg(lang === "ru" ? "⏱ Таймаут — попробуй снова" : lang === "az" ? "⏱ Vaxt bitdi — yenidən cəhd et" : "⏱ Timeout — try again");
      } else if (e.message?.includes(":auth")) {
        setAiMsg(lang === "ru" ? "🔑 Ошибка API ключа" : "🔑 API key error");
      } else if (e.message?.includes(":rate_limit")) {
        setAiMsg(lang === "ru" ? "⏳ Лимит запросов — подожди минуту" : "⏳ Rate limit — wait a moment");
      }
      setTimeout(() => { setStatus("idle"); setAiMsg(""); }, 4000);
    }
  };

  const FILTERS = ["all", "task", "idea", "note", "reminder", "expense", "memory"];
  // visible + allTags computed above via useMemo

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Ambient background glow */}
      <div style={{ position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)", width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, ${C.accentGlow} 0%, transparent 70%)`, pointerEvents: "none", zIndex: 0 }} />

      {/* Header */}
      <div style={{ padding: "20px 20px 14px", display: "flex", alignItems: "center", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {Icon.brain(C.accentLit, 28)}
          <div>
            <div style={{ color: C.text, fontSize: 20, fontWeight: 800, letterSpacing: -0.8, lineHeight: 1 }}>{tx.appName}</div>
            <div style={{ color: C.textSub, fontSize: 10, fontWeight: 500, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 2 }}>BETA</div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {!isPro && (() => {
            const left = FREE_LIMITS.dumpsPerMonth - getDumpCount();
            if (left <= 5) return (
              <button onClick={() => onShowPricing?.("dumps")} style={{ background: `${C.idea}15`, border: `1px solid ${C.idea}30`, color: C.idea, fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.3 }}>
                {left <= 0 ? (lang === "ru" ? "Лимит" : "Limit") : `${left} ${lang === "ru" ? "дампов" : lang === "az" ? "demp" : "dumps"}`} ⚡
              </button>
            );
            return null;
          })()}
          <span style={{ color: C.textSub, fontSize: 13 }}>{greeting(lang)}</span>
        </div>
      </div>

      {/* Input area */}
      <div style={{ padding: "0 16px", flexShrink: 0, position: "relative", zIndex: 1 }}>
        <div style={{
          background: C.surface, borderRadius: 18,
          border: `1px solid ${text.trim() ? C.borderHi : C.border}`,
          marginBottom: 10,
          transition: "border-color .2s, box-shadow .2s",
          boxShadow: text.trim() ? `0 0 0 3px ${C.accentGlow}` : "none",
        }}>
          <textarea data-testid="dump-input" value={text} onChange={e => setText(e.target.value.slice(0, 3000))}
            onKeyDown={e => (e.metaKey || e.ctrlKey) && e.key === "Enter" && process()}
            placeholder={tx.dumpPlaceholder} rows={5}
            aria-label={tx.dumpPlaceholder?.split("\n")[0]}
            style={{ width: "100%", background: "transparent", border: "none", outline: "none", color: C.text, fontSize: 15, lineHeight: 1.65, padding: "16px 18px", resize: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <VoiceBtn lang={lang} disabled={status === "processing"} onResult={t => setText(prev => prev ? `${prev} ${t}` : t)} />
          <button data-testid="process-btn" onClick={process} disabled={status === "processing" || !text.trim()}
            style={{
              flex: 1, height: 48,
              background: status === "processing" ? C.surfaceHi : text.trim() ? `linear-gradient(135deg, ${C.accent}, ${C.accentLit})` : C.surface,
              color: text.trim() ? "white" : C.textSub,
              border: "none", borderRadius: 14,
              fontSize: 14, fontWeight: 700,
              cursor: !text.trim() || status === "processing" ? "not-allowed" : "pointer",
              transition: "all .2s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontFamily: "inherit", letterSpacing: 0.3,
              boxShadow: text.trim() && status !== "processing" ? `0 4px 20px ${C.accentGlow}` : "none",
            }}>
            {status === "processing" && <Spinner />}
            {status === "processing" && tx.processing}
            {status === "idle" && text.trim() && <>{Icon.send("white", 15)}{tx.process}</>}
            {status === "idle" && !text.trim() && tx.process}
            {status === "done" && <>{Icon.check(C.done, 15)}<span style={{ color: C.done }}>{tx.aiResponse}</span></>}
            {status === "error" && tx.errorRetry}
          </button>
        </div>

        {/* char count hint — visible when typing */}
        {text.length > 20 && status === "idle" && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4, padding: "0 4px" }}>
            <span style={{ color: C.textDim, fontSize: 11 }}>
              {lang === "ru" ? "⌘+Enter для отправки" : lang === "az" ? "⌘+Enter göndər" : "⌘+Enter to send"}
            </span>
            <span style={{ color: text.length > 1500 ? C.medium : C.textDim, fontSize: 11 }}>{text.length}</span>
          </div>
        )}

        {aiMsg && (
          <div style={{ marginTop: 10, padding: "11px 14px", background: `${C.accent}10`, borderRadius: 14, border: `1px solid ${C.accent}22`, color: C.text, fontSize: 14, lineHeight: 1.6, animation: "fadeIn .3s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
              {Icon.sparkle(C.accent, 13)}
              <span style={{ color: C.accent, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>MindFlow</span>
            </div>
            {aiMsg}
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 6, padding: "12px 16px 0", overflowX: "auto", flexShrink: 0, position: "relative", zIndex: 1 }}>
        {FILTERS.map(f => {
          const cfg = TYPE_CFG[f];
          return (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "5px 11px", borderRadius: 9, flexShrink: 0,
              border: `1px solid ${filter === f ? C.accent : C.border}`,
              background: filter === f ? `${C.accent}18` : "transparent",
              color: filter === f ? C.accentLit : C.textSub,
              fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 5,
              transition: "all .15s",
            }}>
              {f !== "all" && cfg && Icon[cfg.icon] && Icon[cfg.icon](filter === f ? C.accentLit : C.textSub, 12)}
              {f === "all" ? tx.filterAll : (cfg?.label[lang] || f)}
            </button>
          );
        })}
      </div>

      {/* Tag filter chips — only when there are tags */}
      {allTags.length > 0 && (
        <div style={{ display: "flex", gap: 5, padding: "7px 16px 0", overflowX: "auto", flexShrink: 0 }}>
          {allTags.map(tag => (
            <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? null : tag)} style={{
              padding: "3px 9px", borderRadius: 7, flexShrink: 0,
              border: `1px solid ${tagFilter === tag ? C.accentLit : C.border}`,
              background: tagFilter === tag ? `${C.accentLit}18` : "transparent",
              color: tagFilter === tag ? C.accentLit : C.textDim,
              fontSize: 11, fontWeight: tagFilter === tag ? 700 : 500,
              cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4,
              transition: "all .15s",
            }}>
              {Icon.tag(tagFilter === tag ? C.accentLit : C.textDim, 9)}
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 16px 90px", position: "relative", zIndex: 1 }}>
        {visible.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: 60 }}>
            <div style={{ marginBottom: 16 }}>{Icon.brain(C.textDim, 48)}</div>
            <div style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 6, letterSpacing: -0.3 }}>
              {filter === "all" && !tagFilter ? tx.noThoughts : `No ${tagFilter ? `#${tagFilter}` : filter + "s"} yet.`}
            </div>
            <div style={{ color: C.textSub, fontSize: 13 }}>{filter === "all" && !tagFilter ? tx.noThoughtsSub : "Try a different filter."}</div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ color: C.textSub, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>
                {visible.length} {visible.length === 1 ? tx.item : tx.items}
                {tagFilter && <span style={{ color: C.accentLit, marginLeft: 5 }}>#{tagFilter}</span>}
              </span>
              {(filter !== "all" || tagFilter) && (
                <button onClick={() => { setFilter("all"); setTagFilter(null); }} style={{ background: "none", border: "none", color: C.textDim, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>✕ clear</button>
              )}
            </div>
            {visible.map(t => <ThoughtCard key={t.id} thought={t} lang={lang} onToggleToday={onToggleToday} onArchive={onArchive} onUpdate={onUpdate} onTagClick={tag => setTagFilter(tagFilter === tag ? null : tag)} showDone />)}
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: TODAY
// ─────────────────────────────────────────────────────────────────────────────
function TodayScreen({ thoughts, onArchive, onToggleToday, onUpdate, lang, persona }) {
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
    catch { setAiSuggestion(null); }
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

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN: EVENING REVIEW — FIX: receives persona prop
// ─────────────────────────────────────────────────────────────────────────────
function EveningScreen({ thoughts, lang, persona, user }) {
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
    catch { setReview(lang === "ru" ? "Ты появился сегодня. Это всегда считается." : "You showed up today. That always counts."); }
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
      } catch (e) { console.error("review save:", e); }
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
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────
const NOTIF_STORAGE_KEY = "mf_notif_prefs";

function defaultNotifPrefs() {
  return {
    enabled: false,
    morningTime: "09:00",
    eveningTime: "21:00",
    morningOn: true,
    eveningOn: true,
  };
}

function loadNotifPrefs() {
  // FIX: localStorage persists across reloads (was window.__mf_notif which reset on refresh)
  try {
    const raw = localStorage.getItem("mf_notif_prefs");
    return raw ? JSON.parse(raw) : defaultNotifPrefs();
  } catch { return defaultNotifPrefs(); }
}

function saveNotifPrefs(prefs) {
  try { localStorage.setItem("mf_notif_prefs", JSON.stringify(prefs)); } catch {}
}

async function requestNotifPermission() {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  const result = await Notification.requestPermission();
  return result;
}

function scheduleNotification(title, body, timeStr) {
  if (!("Notification" in window) || Notification.permission !== "granted") return null;
  const [h, m] = timeStr.split(":").map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(h, m, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  const delay = target.getTime() - now.getTime();
  const timerId = setTimeout(() => {
    new Notification(title, { body, icon: "🧠", tag: `mf_${timeStr}` });
    // reschedule for next day
    scheduleNotification(title, body, timeStr);
  }, delay);
  return timerId;
}

// Store active timer IDs so we can cancel them
window.__mf_timers = window.__mf_timers || {};

function applyNotifSchedule(prefs, lang) {
  const tx = T[lang] || T.en;
  // Cancel existing timers
  Object.values(window.__mf_timers).forEach(id => clearTimeout(id));
  window.__mf_timers = {};
  if (!prefs.enabled || Notification.permission !== "granted") return;

  const morningMessages = {
    en: { title: "🌅 Morning Ritual", body: "Good morning! Time to dump your thoughts and plan your day." },
    ru: { title: "🌅 Утренний ритуал", body: "Доброе утро! Время выгрузить мысли и спланировать день." },
    az: { title: "🌅 Səhər ritualu", body: "Sabahınız xeyir! Fikirlərini tök və günü planla." },
  };
  const eveningMessages = {
    en: { title: "🌙 Evening Review", body: "How did today go? Take 2 minutes for your evening check-in." },
    ru: { title: "🌙 Вечерний обзор", body: "Как прошёл день? Потрать 2 минуты на вечерний обзор." },
    az: { title: "🌙 Axşam icmalı", body: "Bu gün necə keçdi? Axşam yoxlaması üçün 2 dəqiqə ayır." },
  };

  if (prefs.morningOn) {
    const msg = morningMessages[lang] || morningMessages.en;
    window.__mf_timers.morning = scheduleNotification(msg.title, msg.body, prefs.morningTime);
  }
  if (prefs.eveningOn) {
    const msg = eveningMessages[lang] || eveningMessages.en;
    window.__mf_timers.evening = scheduleNotification(msg.title, msg.body, prefs.eveningTime);
  }
}

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
    try { localStorage.setItem("mf_persona", JSON.stringify(persona)); } catch {}
  }, [persona]);

  // FIX: auto-save thoughts to localStorage for unauthenticated users
  // When logged in + sync on, Supabase is source of truth; localStorage is backup
  useEffect(() => {
    if (user && syncOn) return; // Supabase handles persistence
    try {
      localStorage.setItem("mf_thoughts_local", JSON.stringify(thoughts.slice(0, 200)));
    } catch {}
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
