/**
 * shared/lib/thought-types.js
 * Configuration for thought types (task, idea, reminder, expense, memory, note).
 * Maps each type to its color, icon key, and localized label.
 *
 * Bolt 1.2: extracted from mindflow.jsx lines 510–517.
 */

import { C } from "../../skeleton/design-system/tokens.js";

export const TYPE_CFG = {
  task:     { color: C.task,     icon: "task",     label: { en: "task",     ru: "задача",     az: "tapşırıq"   } },
  idea:     { color: C.idea,     icon: "idea",     label: { en: "idea",     ru: "идея",       az: "fikir"      } },
  reminder: { color: C.reminder, icon: "reminder", label: { en: "reminder", ru: "напомни",    az: "xatırlatma" } },
  expense:  { color: C.expense,  icon: "expense",  label: { en: "expense",  ru: "расход",     az: "xərc"       } },
  memory:   { color: C.memory,   icon: "memory",   label: { en: "memory",   ru: "память",     az: "yaddaş"     } },
  note:     { color: C.note,     icon: "note",     label: { en: "note",     ru: "заметка",    az: "qeyd"       } },
};
