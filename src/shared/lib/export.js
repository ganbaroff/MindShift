/**
 * shared/lib/export.js
 * Export thoughts to Markdown format.
 *
 * Bolt 1.2: extracted from mindflow.jsx lines 760–779.
 */

import { TYPE_CFG } from "./thought-types.js";

export function exportToMarkdown(thoughts, lang) {
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
