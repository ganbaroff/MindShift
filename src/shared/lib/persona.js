/**
 * shared/lib/persona.js
 * Pure data transformation for user persona patterns (ADR 0006).
 * No React, no side effects.
 *
 * Bolt 1.2: extracted from mindflow.jsx lines 303–319.
 * Bolt 2.1: added avgPriority, moodTrend, lastActiveDate (spec 2026-03-07).
 * Bolt 4.1: added calcXpGain (ADR 0013).
 */

// ─── XP gain table (ADR 0013) ────────────────────────────────────────────────

/**
 * Returns the fixed XP gain for a given user action.
 * Activity-based per ADR 0008 — XP for doing, not for completing.
 *
 * @param {"brain_dump_submitted"|"day_plan_accepted"|"evening_review_completed"|"persona_chat_message"} action
 * @returns {number} XP to award (0 for unknown actions)
 */
export function calcXpGain(action) {
  const XP_TABLE = {
    brain_dump_submitted:     20,
    day_plan_accepted:        15,
    evening_review_completed: 25,
    persona_chat_message:      5,
  };
  return XP_TABLE[action] ?? 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Priority helpers
// ─────────────────────────────────────────────────────────────────────────────
const PRIO_NUM   = { none: 0, low: 1, medium: 2, high: 3, critical: 4 };
const PRIO_LABEL = ["none", "low", "medium", "high", "critical"];

/**
 * Returns today's date as YYYY-MM-DD (local time).
 * @returns {string}
 */
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Calculates avgPriority label from accumulated priorityCounts.
 * @param {{ [key: string]: number }} counts
 * @returns {string} one of PRIO_LABEL
 */
function calcAvgPriority(counts) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return "none";
  const weightedSum = Object.entries(counts).reduce(
    (sum, [k, v]) => sum + (PRIO_NUM[k] ?? 0) * v, 0
  );
  return PRIO_LABEL[Math.round(weightedSum / total)] ?? "none";
}

/**
 * Determines moodTrend from a rolling window of completion rates.
 * Compares the average of the last 2 values vs. the rest of the window.
 * @param {number[]} rates  — up to 5 recent completion rates
 * @param {string} fallback — previous moodTrend or "flat"
 * @returns {"up"|"down"|"flat"}
 */
function calcMoodTrend(rates, fallback = "flat") {
  if (rates.length < 2) return fallback;
  const recent = rates.slice(-2).reduce((a, b) => a + b, 0) / 2;
  const olderSlice = rates.slice(0, -2);
  if (olderSlice.length === 0) return fallback;
  const older = olderSlice.reduce((a, b) => a + b, 0) / olderSlice.length;
  if (recent - older > 0.05) return "up";
  if (older - recent > 0.05) return "down";
  return "flat";
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Updates persona patterns based on new thoughts or an archived task.
 *
 * Immutable — never mutates the input persona.
 *
 * @param {object|null} persona       — current persona object (may be null or old format)
 * @param {object[]}    newThoughts   — freshly parsed thoughts from this session
 * @param {string|null} archivedId    — uid of just-archived task, or null
 * @returns {object} new persona object
 */
export function updatePersona(persona, newThoughts, archivedId) {
  const p = persona?.patterns || {};

  // ── Tags ──────────────────────────────────────────────────────────────────
  const tagFreq = { ...(p.tagFreq || {}) };
  newThoughts.forEach(t => (t.tags || []).forEach(tag => {
    tagFreq[tag] = (tagFreq[tag] || 0) + 1;
  }));
  const topTags = Object.entries(tagFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([t]) => t);

  // ── Completion rate ────────────────────────────────────────────────────────
  const total = (p.totalTasks || 0) + newThoughts.filter(t => t.type === "task").length;
  const done  = (p.doneTasks  || 0) + (archivedId ? 1 : 0);
  const completionRate = total > 0 ? done / total : 0;

  // ── Active hour ───────────────────────────────────────────────────────────
  const hour = new Date().getHours();
  const hourCounts = { ...(p.hourCounts || {}) };
  hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  const mostActiveHour = parseInt(
    Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "9"
  );

  // ── avgPriority (Bolt 2.1) ─────────────────────────────────────────────────
  // Accumulate priority counts across all task-type thoughts.
  const priorityCounts = { ...(p.priorityCounts || { none: 0, low: 0, medium: 0, high: 0, critical: 0 }) };
  newThoughts.filter(t => t.type === "task").forEach(t => {
    const k = t.priority || "none";
    if (k in PRIO_NUM) priorityCounts[k] = (priorityCounts[k] || 0) + 1;
  });
  const avgPriority = calcAvgPriority(priorityCounts);

  // ── moodTrend (Bolt 2.1) ──────────────────────────────────────────────────
  // Rolling window of last 5 completion rates; trend = direction of change.
  const recentCompletionRates = [...(p.recentCompletionRates || []), completionRate].slice(-5);
  const moodTrend = calcMoodTrend(recentCompletionRates, p.moodTrend || "flat");

  // ── lastActiveDate (Bolt 2.1) ─────────────────────────────────────────────
  // Updated whenever updatePersona is called (meaningful user action).
  const lastActiveDate = todayISO();

  return {
    updatedAt: new Date().toISOString(),
    patterns: {
      // Original fields (unchanged)
      tagFreq, topTags,
      totalTasks: total, doneTasks: done, completionRate,
      hourCounts, mostActiveHour,
      // Bolt 2.1 additions
      priorityCounts, avgPriority,
      recentCompletionRates, moodTrend,
      lastActiveDate,
    },
  };
}
