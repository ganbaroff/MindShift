/**
 * features/onboarding/index.jsx
 * Onboarding screens: language picker + welcome feature list.
 *
 * Exports: LangPickScreen, WelcomeScreen
 *
 * Bolt 1.7: extracted from mindflow.jsx lines 221–425.
 */

import { useState, useEffect } from "react";
import { C }                   from "../../skeleton/design-system/tokens.js";
import { T, LANGS }            from "../../shared/i18n/translations.js";
import { Icon }                from "../../shared/ui/icons.jsx";

// ─────────────────────────────────────────────────────────────────────────────
export function LangPickScreen({ onPick }) {
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

// ─────────────────────────────────────────────────────────────────────────────
export function WelcomeScreen({ lang, onDone }) {
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
