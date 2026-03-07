/**
 * shared/lib/dialogues.js
 * Bolt 3.2 — AI Persona Dialogue
 *
 * Hardcoded greeting phrases for the persona character.
 * 3 time periods × 3 mood states × 4 archetypes = 36 variants.
 * Each variant has EN / RU / AZ strings.
 *
 * ADHD P1: no shame, no judgement, no performance metrics in phrases.
 * ADHD P6: warm, soft, anchor-style. Short (≤ 15 words).
 * Tone: supportive friend, not a productivity coach.
 *
 * Usage:
 *   getGreeting(archetype, timePeriod, mood, lang) → string
 *
 * timePeriod: "morning" (5–11h) | "afternoon" (12–17h) | "evening" (18–23h+0–4h)
 * mood:       "idle" | "active" | "celebrated"
 */

// ─── Greeting data ─────────────────────────────────────────────────────────
// Structure: GREETINGS[archetype][timePeriod][mood] = { en, ru, az }

const GREETINGS = {

  // ── Explorer ──────────────────────────────────────────────────────────────
  explorer: {
    morning: {
      idle:       { en: "Morning. Anything on your mind yet?",
                    ru: "Утро. Что-нибудь уже крутится в голове?",
                    az: "Sabah. Ağlına nə gəlir?" },
      active:     { en: "Morning! You've got things in motion.",
                    ru: "Доброе утро! Дело уже движется.",
                    az: "Sabahınız xeyir! İşlər irəliləyir." },
      celebrated: { en: "Morning, explorer. You already won something today.",
                    ru: "Доброе утро, путник. Ты уже чего-то добился сегодня.",
                    az: "Sabahınız xeyir, kəşfiyyatçı. Bu gün artıq bir şey qazandın." },
    },
    afternoon: {
      idle:       { en: "Afternoon. What's worth exploring today?",
                    ru: "День. Что стоит исследовать сегодня?",
                    az: "Günorta. Bu gün nəyi kəşf etmək olar?" },
      active:     { en: "You're in the thick of it. Good.",
                    ru: "Ты в самой гуще. Хорошо.",
                    az: "İşin ortasındasın. Yaxşı." },
      celebrated: { en: "Look at that — you mapped new ground today.",
                    ru: "Смотри — ты нанёс новую территорию на карту сегодня.",
                    az: "Bax — bu gün yeni ərazi kəşf etdin." },
    },
    evening: {
      idle:       { en: "Evening. The day's still here if you need it.",
                    ru: "Вечер. День ещё здесь, если понадобится.",
                    az: "Axşam. Lazım olsa, gün hələ buradır." },
      active:     { en: "End of the journey for today. You covered ground.",
                    ru: "Конец дневного пути. Ты прошёл немало.",
                    az: "Bu günün sonu. Yaxşı yol getdin." },
      celebrated: { en: "Solid day, explorer. Rest and go again tomorrow.",
                    ru: "Крепкий день, путник. Отдохни и снова в путь завтра.",
                    az: "Möhkəm gün, kəşfiyyatçı. İstirah et, sabah yenidən yola çıx." },
    },
  },

  // ── Builder ───────────────────────────────────────────────────────────────
  builder: {
    morning: {
      idle:       { en: "Morning. What are we building today?",
                    ru: "Утро. Что строим сегодня?",
                    az: "Sabah. Bu gün nə qururuq?" },
      active:     { en: "Morning, builder. You've already laid the first bricks.",
                    ru: "Доброе утро, мастер. Первые кирпичи уже заложены.",
                    az: "Sabahınız xeyir, qurucusu. İlk kərpicləri artıq qoymusan." },
      celebrated: { en: "Morning. You built something real. Keep going.",
                    ru: "Утро. Ты построил что-то настоящее. Продолжай.",
                    az: "Sabah. Həqiqi bir şey qurdun. Davam et." },
    },
    afternoon: {
      idle:       { en: "Afternoon. The blueprint is ready — what's first?",
                    ru: "День. Чертёж готов — с чего начнём?",
                    az: "Günorta. Plan hazırdır — nədən başlayaq?" },
      active:     { en: "Piece by piece. You're making it happen.",
                    ru: "Кирпич за кирпичом. Ты делаешь это реальным.",
                    az: "Addım-addım. Gerçəkləşdirirsən." },
      celebrated: { en: "That's solid work. One more thing shipped.",
                    ru: "Крепкая работа. Ещё одно дело закрыто.",
                    az: "Möhkəm iş. Daha bir iş tamamlandı." },
    },
    evening: {
      idle:       { en: "Evening. The site's quiet now — rest is part of building.",
                    ru: "Вечер. Стройка затихла — отдых тоже часть работы.",
                    az: "Axşam. İndi sakit — istirah da işin bir hissəsidir." },
      active:     { en: "Good work today. Things moved forward.",
                    ru: "Хорошая работа сегодня. Дело двинулось вперёд.",
                    az: "Bu gün yaxşı iş. İşlər irəlilədi." },
      celebrated: { en: "Builder, you shipped real things today. That counts.",
                    ru: "Мастер, ты закрыл настоящие дела сегодня. Это считается.",
                    az: "Qurucusu, bu gün həqiqi işlər tamamladın. Bu sayılır." },
    },
  },

  // ── Dreamer ───────────────────────────────────────────────────────────────
  dreamer: {
    morning: {
      idle:       { en: "Morning. What ideas are floating around?",
                    ru: "Утро. Какие идеи витают в голове?",
                    az: "Sabah. Hansı fikirlər dolanır?" },
      active:     { en: "Morning, dreamer. Your ideas are already in motion.",
                    ru: "Доброе утро, мечтатель. Идеи уже в движении.",
                    az: "Sabahınız xeyir, xəyalçı. Fikirlər artıq hərəkətdədir." },
      celebrated: { en: "Morning! You made something real from a dream. Nice.",
                    ru: "Утро! Ты превратил мечту во что-то реальное. Хорошо.",
                    az: "Sabah! Xəyaldan real bir şey yaratdın. Əla." },
    },
    afternoon: {
      idle:       { en: "Afternoon. The best ideas come in quiet moments.",
                    ru: "День. Лучшие идеи приходят в тихие моменты.",
                    az: "Günorta. Ən yaxşı fikirlər sakit anlarda gəlir." },
      active:     { en: "Every idea is worth catching. You're catching them.",
                    ru: "Каждая идея заслуживает внимания. Ты их замечаешь.",
                    az: "Hər fikir tutulmağa layiqdir. Sən tutursan." },
      celebrated: { en: "Dreamer, you turned imagination into action today.",
                    ru: "Мечтатель, ты превратил воображение в действие сегодня.",
                    az: "Xəyalçı, bu gün xəyalı hərəkətə çevirmisən." },
    },
    evening: {
      idle:       { en: "Evening. Let the mind wander — that's valid too.",
                    ru: "Вечер. Пусть мысли блуждают — это тоже нормально.",
                    az: "Axşam. Ağlın gəzsin — bu da normaldır." },
      active:     { en: "Dreamer, you did the work and the dreaming. Good day.",
                    ru: "Мечтатель, ты и работал, и мечтал. Хороший день.",
                    az: "Xəyalçı, həm işlədin, həm xəyal etdin. Yaxşı gün." },
      celebrated: { en: "Stars aligned today. Idea captured, things done.",
                    ru: "Звёзды сошлись сегодня. Идея поймана, дела сделаны.",
                    az: "Bu gün ulduzlar bir araya gəldi. Fikir tutuldu, işlər göründü." },
    },
  },

  // ── Guardian ──────────────────────────────────────────────────────────────
  guardian: {
    morning: {
      idle:       { en: "Morning. What needs protecting today?",
                    ru: "Утро. Что нужно защитить сегодня?",
                    az: "Sabah. Bu gün nəyi qorumaq lazımdır?" },
      active:     { en: "Morning, guardian. Holding the line already.",
                    ru: "Доброе утро, хранитель. Уже держишь позицию.",
                    az: "Sabahınız xeyir, qoruyucu. Artıq mövqeyini saxlayırsan." },
      celebrated: { en: "Morning. You protected what matters. That's the job.",
                    ru: "Утро. Ты защитил важное. Вот в чём работа.",
                    az: "Sabah. Vacib olanı qorudun. Bu işdir." },
    },
    afternoon: {
      idle:       { en: "Afternoon. Steady as ever.",
                    ru: "День. Стабильно, как всегда.",
                    az: "Günorta. Həmişəki kimi sabit." },
      active:     { en: "Steady. One thing at a time. You've got this.",
                    ru: "Спокойно. Шаг за шагом. Ты справишься.",
                    az: "Sakit. Bir şey eyni anda. Öhdəsindən gələcəksən." },
      celebrated: { en: "You held it together today. Solid.",
                    ru: "Ты справился сегодня. Крепко.",
                    az: "Bu gün dözdün. Möhkəm." },
    },
    evening: {
      idle:       { en: "Evening. The perimeter is safe. Rest.",
                    ru: "Вечер. Периметр в безопасности. Отдыхай.",
                    az: "Axşam. Perimetr təhlükəsizdir. İstirah et." },
      active:     { en: "You guarded what mattered today. Good.",
                    ru: "Сегодня ты защитил важное. Хорошо.",
                    az: "Bu gün vacib olanı qorudun. Yaxşı." },
      celebrated: { en: "Guardian, steady progress is everything. Well done.",
                    ru: "Хранитель, устойчивый прогресс — это всё. Отличная работа.",
                    az: "Qoruyucu, sabit irəliləyiş hər şeydir. Əla iş." },
    },
  },
};

// ─── Helper: get time period ────────────────────────────────────────────────

/**
 * Returns the time period for the current hour.
 * @returns {"morning"|"afternoon"|"evening"}
 */
export function getTimePeriod() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12)  return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "evening"; // 18–23 and 0–4
}

// ─── Helper: get greeting ───────────────────────────────────────────────────

/**
 * Returns the greeting phrase for a given archetype, time period, mood, and language.
 * Falls back gracefully if any argument is invalid.
 *
 * @param {"explorer"|"builder"|"dreamer"|"guardian"} archetype
 * @param {"morning"|"afternoon"|"evening"} timePeriod
 * @param {"idle"|"active"|"celebrated"} mood
 * @param {"en"|"ru"|"az"} lang
 * @returns {string}
 */
export function getGreeting(archetype, timePeriod, mood, lang) {
  const arcData = GREETINGS[archetype] || GREETINGS.explorer;
  const timeData = arcData[timePeriod] || arcData.morning;
  const moodData = timeData[mood] || timeData.idle;
  return moodData[lang] || moodData.en;
}

// ─── Limit-reached fallbacks (AC7) ─────────────────────────────────────────
// When the daily AI limit is reached, the character responds with one of these.
// Rotated by hour parity (same deterministic approach as archetypes.js).

const LIMIT_FALLBACKS = {
  explorer: {
    en: ["Still here. Taking a quiet moment.",
         "My words are resting. I'm still with you."],
    ru: ["Здесь. Просто помолчу немного.",
         "Слова отдыхают. Но я рядом."],
    az: ["Buradadam. Bir az susmaq lazımdır.",
         "Sözlər istirahət edir. Amma yanındayam."],
  },
  builder: {
    en: ["Conserving energy. Some things build in silence.",
         "Taking a breather. The work continues tomorrow."],
    ru: ["Берегу силы. Кое-что строится в тишине.",
         "Небольшая пауза. Завтра работа продолжится."],
    az: ["Enerji qoruyuram. Bəzi şeylər sükutda qurulur.",
         "Bir az nəfəs alıram. İş sabah davam edər."],
  },
  dreamer: {
    en: ["Dreaming quietly for now.",
         "Ideas are still there. Just resting."],
    ru: ["Пока просто мечтаю в тишине.",
         "Идеи никуда не делись. Просто отдыхают."],
    az: ["İndilik sakitcə xəyal edirəm.",
         "Fikirlər hələ burada. Sadəcə dincəlirlər."],
  },
  guardian: {
    en: ["Holding steady. No words needed right now.",
         "Quiet vigil. Still here."],
    ru: ["Держу позицию. Слова сейчас не нужны.",
         "Тихое дежурство. Всё ещё здесь."],
    az: ["Sabit dururam. İndilik söz lazım deyil.",
         "Sakit gözlüyüm. Hələ buradayam."],
  },
};

/**
 * Returns a soft fallback phrase when the daily AI limit is reached.
 * Never reveals the word "limit" — just the character being quiet.
 *
 * @param {"explorer"|"builder"|"dreamer"|"guardian"} archetype
 * @param {"en"|"ru"|"az"} lang
 * @returns {string}
 */
export function getLimitFallback(archetype, lang) {
  const data = LIMIT_FALLBACKS[archetype] || LIMIT_FALLBACKS.explorer;
  const phrases = data[lang] || data.en;
  const hour = new Date().getHours();
  return phrases[hour % 2] ?? phrases[0];
}
