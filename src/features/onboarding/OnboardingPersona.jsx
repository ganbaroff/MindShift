/**
 * features/onboarding/OnboardingPersona.jsx
 * Bolt 3.1 — Persona / Character UI
 *
 * Step shown after auth on first login: user picks one of 4 archetypes
 * and optionally customises their character name.
 *
 * AC1: 4 archetype cards (Explorer / Builder / Dreamer / Guardian)
 * AC2: Geometric SVG icons — no faces, no human forms
 * AC7: ADHD P7 — no modals, no urgency, inline single-screen flow
 * neurodivergent-ux: progressive disclosure, 1 CTA, concrete labels
 *
 * Props:
 *   lang    — "en" | "ru" | "az"
 *   onDone  — (archetype: string, name: string) => void
 */

import { useState } from "react";
import { C }         from "../../skeleton/design-system/tokens.js";
import { T }         from "../../shared/i18n/translations.js";
import { ARCHETYPES, ARCHETYPE_LIST } from "../../shared/lib/archetypes.js";
import { ArchetypeSVG } from "../../shared/ui/ArchetypeSVG.jsx";

// ─── Static label map ──────────────────────────────────────────────────────

const LABELS = {
  heading: {
    en: "Choose your character",
    ru: "Выбери персонажа",
    az: "Personajını seç",
  },
  sub: {
    en: "Your character grows with you as you build daily rituals.",
    ru: "Персонаж растёт вместе с тобой по мере ежедневных ритуалов.",
    az: "Personajın gündəlik rituallar yaratdıqca səninlə böyüyür.",
  },
  namePlaceholder: {
    en: "Character name",
    ru: "Имя персонажа",
    az: "Personaj adı",
  },
  nameLabel: {
    en: "Name your character",
    ru: "Назови персонажа",
    az: "Personajına ad ver",
  },
  cta: {
    en: "Start my journey →",
    ru: "Начать путь →",
    az: "Səyahəti başlat →",
  },
  skip: {
    en: "Skip for now",
    ru: "Пропустить",
    az: "İndilik keç",
  },
};

function t(map, lang) {
  return map[lang] || map.en;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function OnboardingPersona({ lang, onDone }) {
  const [selected, setSelected]   = useState(null);
  const [name,     setName]       = useState("");
  const [hovered,  setHovered]    = useState(null);

  const handleSelect = (id) => {
    setSelected(id);
    // Pre-fill name with archetype default if name is empty or was the prev default
    const prev = selected ? ARCHETYPES[selected].defaultName[lang] || ARCHETYPES[selected].defaultName.en : "";
    if (!name || name === prev) {
      setName(ARCHETYPES[id].defaultName[lang] || ARCHETYPES[id].defaultName.en);
    }
  };

  const handleDone = () => {
    const archetype = selected || "explorer"; // AC9: default fallback
    const finalName = name.trim() || ARCHETYPES[archetype].defaultName[lang] || ARCHETYPES[archetype].defaultName.en;
    onDone(archetype, finalName);
  };

  const handleSkip = () => {
    onDone("explorer", ARCHETYPES.explorer.defaultName[lang] || ARCHETYPES.explorer.defaultName.en);
  };

  return (
    <div style={{
      minHeight:      "100vh",
      display:        "flex",
      flexDirection:  "column",
      alignItems:     "center",
      padding:        "48px 20px 32px",
      background:     C.bg,
      overflowY:      "auto",
    }}>
      {/* Heading */}
      <div style={{
        textAlign:    "center",
        marginBottom: 32,
        animation:    "slideUp .5s cubic-bezier(.22,1,.36,1) both",
      }}>
        <h1 style={{
          fontSize:     22,
          fontWeight:   700,
          color:        C.text,
          margin:       "0 0 8px",
        }}>
          {t(LABELS.heading, lang)}
        </h1>
        <p style={{
          fontSize:   15,
          color:      C.textSub,
          margin:     0,
          maxWidth:   300,
        }}>
          {t(LABELS.sub, lang)}
        </p>
      </div>

      {/* 2×2 Archetype grid */}
      <div style={{
        display:             "grid",
        gridTemplateColumns: "1fr 1fr",
        gap:                 12,
        width:               "100%",
        maxWidth:            400,
        marginBottom:        28,
        animation:           "slideUp .6s cubic-bezier(.22,1,.36,1) .08s both",
      }}>
        {ARCHETYPE_LIST.map((id) => {
          const arc       = ARCHETYPES[id];
          const isSelected = selected === id;
          const isHovered  = hovered  === id;
          const label      = arc.label[lang]       || arc.label.en;
          const desc       = arc.description[lang] || arc.description.en;

          return (
            <button
              key={id}
              onClick={() => handleSelect(id)}
              onMouseEnter={() => setHovered(id)}
              onMouseLeave={() => setHovered(null)}
              aria-pressed={isSelected}
              style={{
                display:       "flex",
                flexDirection: "column",
                alignItems:    "center",
                padding:       "20px 12px 16px",
                background:    isSelected
                  ? `${arc.color}18`
                  : isHovered
                    ? C.surfaceHi
                    : C.surface,
                borderRadius:  16,
                border:        `2px solid ${isSelected ? arc.color : "transparent"}`,
                cursor:        "pointer",
                transition:    "border-color .18s, background .18s",
                textAlign:     "center",
                // Touch target ≥ 44px (neurodivergent-ux)
                minHeight:     120,
              }}
            >
              {/* SVG avatar */}
              <div style={{
                color:        isSelected ? arc.color : C.textSub,
                marginBottom: 10,
                transition:   "color .18s",
              }}>
                <ArchetypeSVG id={id} size={48} />
              </div>

              <span style={{
                fontSize:   14,
                fontWeight: 600,
                color:      isSelected ? arc.color : C.text,
                marginBottom: 4,
                transition: "color .18s",
              }}>
                {label}
              </span>

              <span style={{
                fontSize: 12,
                color:    C.textDim,
                lineHeight: 1.4,
              }}>
                {desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* Name input — shown after archetype selected */}
      {selected && (
        <div style={{
          width:        "100%",
          maxWidth:     400,
          marginBottom: 20,
          animation:    "slideUp .35s cubic-bezier(.22,1,.36,1) both",
        }}>
          <label style={{
            display:      "block",
            fontSize:     13,
            color:        C.textSub,
            marginBottom: 6,
          }}>
            {t(LABELS.nameLabel, lang)}
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={t(LABELS.namePlaceholder, lang)}
            maxLength={48}
            aria-label={t(LABELS.nameLabel, lang)}
            style={{
              width:         "100%",
              padding:       "12px 14px",
              borderRadius:  12,
              border:        `1.5px solid ${C.border}`,
              background:    C.surface,
              color:         C.text,
              fontSize:      15,
              outline:       "none",
              boxSizing:     "border-box",
              transition:    "border-color .15s",
            }}
            onFocus={e => { e.target.style.borderColor = ARCHETYPES[selected].color; }}
            onBlur={e  => { e.target.style.borderColor = C.border; }}
          />
        </div>
      )}

      {/* Primary CTA */}
      <button
        onClick={handleDone}
        disabled={!selected}
        style={{
          width:         "100%",
          maxWidth:      400,
          padding:       "14px 20px",
          borderRadius:  12,
          background:    selected ? C.accent : C.border,
          color:         selected ? "#fff" : C.textDim,
          border:        "none",
          fontSize:      16,
          fontWeight:    600,
          cursor:        selected ? "pointer" : "not-allowed",
          marginBottom:  12,
          transition:    "background .18s",
          // Touch target ≥ 44px
          minHeight:     48,
        }}
        aria-label={t(LABELS.cta, lang)}
      >
        {t(LABELS.cta, lang)}
      </button>

      {/* Skip link — neurodivergent-ux: no pressure, always an out */}
      <button
        onClick={handleSkip}
        style={{
          background: "none",
          border:     "none",
          color:      C.textDim,
          fontSize:   13,
          cursor:     "pointer",
          padding:    "8px 16px",
        }}
        aria-label={t(LABELS.skip, lang)}
      >
        {t(LABELS.skip, lang)}
      </button>
    </div>
  );
}
