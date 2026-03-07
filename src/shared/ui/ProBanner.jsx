/**
 * shared/ui/ProBanner.jsx
 * Freemium gate banner and full pricing modal.
 *
 * Exports: ProBanner, PricingScreen
 *
 * Bolt 1.6: extracted from mindflow.jsx lines 44–253.
 */

import { useState } from "react";
import { C }        from "../../skeleton/design-system/tokens.js";
import { getSupabase } from "../../shared/services/supabase.js";
import { logError }  from "../../shared/lib/logger.js";

// ─────────────────────────────────────────────────────────────────────────────
export function ProBanner({ lang, reason, onUpgrade, onDismiss }) {
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
export function PricingScreen({ lang, user, onClose, onWaitlist }) {
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
