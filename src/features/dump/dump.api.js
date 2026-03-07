/**
 * features/dump/dump.api.js
 * Domain API for the dump feature.
 *
 * Wraps the shared AI call with dump-specific output validation and
 * normalisation (ruflo verification-quality pattern). Keeps DumpScreen
 * free of raw AI output handling.
 *
 * Bolt 1.3: extracted from mindflow.jsx lines 993–1009.
 */

import { parseDump as _parseDump } from "../../shared/services/claude.js";

const VALID_TYPES = ["task", "note", "idea", "reminder", "expense", "memory"];
const VALID_PRIOS = ["none", "low", "medium", "high", "critical"];

/**
 * Parse a brain-dump string through the AI and return validated items.
 *
 * @param {string} text   - Raw user input
 * @param {string} lang   - UI language ("en" | "ru" | "az")
 * @param {object} persona - Current persona object (used for AI context)
 * @returns {Promise<{ items: object[], response: string }>}
 */
export async function parseDump(text, lang, persona) {
  const raw = await _parseDump(text, lang, persona);
  let { items, response } = raw;

  // Validate and normalise AI output
  items = (items || []).filter(i => i.text?.trim().length > 1);
  items = items.map(i => ({
    ...i,
    type:     VALID_TYPES.includes(i.type)     ? i.type     : "note",
    priority: VALID_PRIOS.includes(i.priority) ? i.priority : "none",
    tags:     Array.isArray(i.tags)            ? i.tags.slice(0, 3).map(t => t.toLowerCase()) : [],
  }));

  // Fallback: if AI returned nothing usable, save the raw text as a note
  if (!items.length) {
    items = [{ text: text.trim(), type: "note", priority: "none", tags: [], clarify: null }];
    response =
      lang === "ru" ? "Сохранил как заметку." :
      lang === "az" ? "Qeyd kimi saxladım."   :
                      "Saved as note.";
  }

  return { items, response };
}
