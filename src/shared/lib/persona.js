/**
 * shared/lib/persona.js
 * Pure data transformation for user persona patterns (ADR 0006).
 * No React, no side effects.
 *
 * Bolt 1.2: extracted from mindflow.jsx lines 303–319.
 */

/**
 * Updates persona patterns based on new thoughts or an archived task.
 *
 * @param {object|null} persona  — current persona object
 * @param {object[]} newThoughts — freshly parsed thoughts
 * @param {string|null} archivedId — uid of just-archived task, or null
 * @returns {object} new persona object (immutable update)
 */
export function updatePersona(persona, newThoughts, archivedId) {
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
