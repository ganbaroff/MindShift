/**
 * shared/lib/archetypes.js
 * Bolt 3.1 — Persona / Character UI
 *
 * Pure data: archetype definitions, mood phrases, and helper utilities.
 * No React, no side effects.
 *
 * Archetype colors are the source of truth for the persona palette.
 * They are NOT in tokens.js (app-wide design tokens) because they are
 * feature-specific — used only within the persona system.
 */

// ─── Archetype colours ─────────────────────────────────────────────────────

export const ARCHETYPE_COLORS = {
  explorer: "#4A9EFF",
  builder:  "#FF8C42",
  dreamer:  "#C084FC",
  guardian: "#34D399",
};

// Mood ring colours (shared across all archetypes)
export const MOOD_COLORS = {
  idle:       "#888888",
  active:     null, // → ARCHETYPE_COLORS[archetype]
  celebrated: "#FFD700",
};

// ─── Archetype list ────────────────────────────────────────────────────────

export const ARCHETYPE_LIST = ["explorer", "builder", "dreamer", "guardian"];

// ─── Archetype metadata ────────────────────────────────────────────────────

export const ARCHETYPES = {
  explorer: {
    id:    "explorer",
    color: ARCHETYPE_COLORS.explorer,
    label: { en: "Explorer", ru: "Исследователь", az: "Kəşfiyyatçı" },
    description: {
      en: "Curious, adaptable, and always seeking new ideas.",
      ru: "Любопытный, гибкий и всегда ищущий новые идеи.",
      az: "Maraqlı, uyğunlaşan və həmişə yeni ideyalar axtaran.",
    },
    defaultName: { en: "Explorer", ru: "Путник", az: "Kəşfiyyatçı" },
    phrases: {
      idle: {
        en: ["Ready when you are.", "What's on your mind?"],
        ru: ["Готов, когда ты готов.", "О чём думаешь?"],
        az: ["Hazıram, sən hazır olanda.", "Fikrin nədir?"],
      },
      active: {
        en: ["Let's chart the unknown.", "New territory ahead."],
        ru: ["Картируем неизведанное.", "Впереди новые горизонты."],
        az: ["Naməlumu kəşf edək.", "Qarşıda yeni üfüqlər."],
      },
      celebrated: {
        en: ["Milestone reached. Keep going.", "You mapped new ground today."],
        ru: ["Веха достигнута. Продолжай.", "Сегодня ты открыл новые горизонты."],
        az: ["Mərhələ keçildi. Davam et.", "Bu gün yeni zirvə fəth etdin."],
      },
    },
  },

  builder: {
    id:    "builder",
    color: ARCHETYPE_COLORS.builder,
    label: { en: "Builder", ru: "Строитель", az: "Qurucusu" },
    description: {
      en: "Methodical, creative, and driven to make things happen.",
      ru: "Методичный, творческий, нацеленный на результат.",
      az: "Metodiki, yaradıcı və nəticəyə yönlənmiş.",
    },
    defaultName: { en: "Builder", ru: "Мастер", az: "Qurucusu" },
    phrases: {
      idle: {
        en: ["What are we building today?", "Ready to lay the next brick."],
        ru: ["Что строим сегодня?", "Готов к следующему шагу."],
        az: ["Bu gün nə qururuq?", "Növbəti addıma hazıram."],
      },
      active: {
        en: ["Piece by piece, it takes shape.", "Focus. Build. Ship."],
        ru: ["Кирпичик за кирпичиком.", "Фокус. Строй. Отправляй."],
        az: ["Addım-addım formalaşır.", "Fokus. Qur. Çatdır."],
      },
      celebrated: {
        en: ["Solid work. You built something real.", "Another thing shipped. Nice."],
        ru: ["Крепкая работа. Ты построил что-то настоящее.", "Ещё одно дело завершено."],
        az: ["Möhkəm iş. Həqiqi bir şey qurdun.", "Daha bir iş tamamlandı."],
      },
    },
  },

  dreamer: {
    id:    "dreamer",
    color: ARCHETYPE_COLORS.dreamer,
    label: { en: "Dreamer", ru: "Мечтатель", az: "Xəyalçı" },
    description: {
      en: "Imaginative, intuitive, and full of possibilities.",
      ru: "Воображаемый, интуитивный, полный возможностей.",
      az: "Xəyalpərəst, intuitiv və imkanlarla dolu.",
    },
    defaultName: { en: "Dreamer", ru: "Мечтатель", az: "Xəyalçı" },
    phrases: {
      idle: {
        en: ["What ideas are floating around?", "Dream it first, then do it."],
        ru: ["Какие идеи витают?", "Сначала мечтай, потом делай."],
        az: ["Hansı fikirlər dolanır?", "Əvvəl xəyal et, sonra et."],
      },
      active: {
        en: ["Imagination in motion.", "Every idea is worth catching."],
        ru: ["Воображение в движении.", "Каждая идея заслуживает внимания."],
        az: ["Xəyal hərəkətdədir.", "Hər fikir tutulmağa layiqdir."],
      },
      celebrated: {
        en: ["You made the dream tangible today.", "Idea captured. Well done."],
        ru: ["Сегодня мечта стала реальностью.", "Идея поймана. Отличная работа."],
        az: ["Bu gün xəyal gerçəkləşdi.", "Fikir tutuldu. Əla iş."],
      },
    },
  },

  guardian: {
    id:    "guardian",
    color: ARCHETYPE_COLORS.guardian,
    label: { en: "Guardian", ru: "Хранитель", az: "Qoruyucu" },
    description: {
      en: "Steady, reliable, and focused on what matters most.",
      ru: "Стабильный, надёжный, сфокусированный на главном.",
      az: "Sabit, etibarlı və ən vacib olana fokuslanmış.",
    },
    defaultName: { en: "Guardian", ru: "Страж", az: "Qoruyucu" },
    phrases: {
      idle: {
        en: ["Holding the line.", "What needs protecting today?"],
        ru: ["Держу позицию.", "Что нужно защитить сегодня?"],
        az: ["Mövqeyimi saxlayıram.", "Bu gün nəyi qorumaq lazımdır?"],
      },
      active: {
        en: ["Steady. One thing at a time.", "Protecting what matters."],
        ru: ["Спокойно. Шаг за шагом.", "Защищаю то, что важно."],
        az: ["Sakit. Bir şey eyni anda.", "Vacib olanı qoruyuram."],
      },
      celebrated: {
        en: ["You held it together. Good work.", "Steady progress. That's what counts."],
        ru: ["Ты справился. Хорошая работа.", "Устойчивый прогресс. Это главное."],
        az: ["Dözdün. Yaxşı iş. ", "Sabit irəliləyiş. Bu əsasdır."],
      },
    },
  },
};

// ─── Helper: get mood phrase ───────────────────────────────────────────────

/**
 * getPhrase(archetype, mood, lang) → string
 *
 * Rotates between 2 phrases per combination using hour-of-day parity:
 *   hour % 2 === 0  → phrase[0]  (AM feel)
 *   hour % 2 === 1  → phrase[1]  (PM feel)
 *
 * Gracefully falls back to 'explorer' and 'en' if values are invalid.
 */
export function getPhrase(archetype, mood, lang) {
  const arc  = ARCHETYPES[archetype] || ARCHETYPES.explorer;
  const moodPhrases = arc.phrases[mood] || arc.phrases.idle;
  const langPhrases = moodPhrases[lang]  || moodPhrases.en;
  const hour  = new Date().getHours();
  const index = hour % 2;
  return langPhrases[index] ?? langPhrases[0];
}

/**
 * getMoodColor(archetype, mood) → hex string
 */
export function getMoodColor(archetype, mood) {
  if (mood === "idle")       return MOOD_COLORS.idle;
  if (mood === "celebrated") return MOOD_COLORS.celebrated;
  return ARCHETYPE_COLORS[archetype] || ARCHETYPE_COLORS.explorer;
}
