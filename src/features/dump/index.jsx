/**
 * features/dump/index.jsx
 * Dump screen — brain dump input + human-in-the-loop review + thought list.
 *
 * Exports: DumpScreen
 *
 * Bolt 2.1: human-in-the-loop review panel (adhd-aware-planning Principle 11).
 *   - useDump manages state machine (idle → processing → review → done/error)
 *   - DumpInput provides textarea + voice button
 *   - ReviewPanel: user accepts/rejects each AI item before commit
 *
 * Bolt 1.3: originally extracted from mindflow.jsx lines 906–1191.
 */

import { useState, useMemo } from "react";
import { C }              from "../../skeleton/design-system/tokens.js";
import { T }              from "../../shared/i18n/translations.js";
import { Icon }           from "../../shared/ui/icons.jsx";
import { TYPE_CFG }       from "../../shared/lib/thought-types.js";
import { ThoughtCard }    from "../../shared/ui/ThoughtCard.jsx";
import { FREE_LIMITS, getDumpCount } from "../../shared/lib/freemium.js";
import { greeting }       from "../../shared/lib/greeting.js";
import { useDump }        from "./useDump.js";
import { DumpInput }      from "./DumpInput.jsx";
// Bolt 4.1 — XP system (ADR 0013)
import { useCharacterProgress } from "../../shared/hooks/useCharacterProgress.js";
import { calcXpGain }           from "../../shared/lib/persona.js";
import { LevelUpToast }         from "../../shared/ui/LevelUpToast.jsx";

// =============================================================================
// REVIEW PANEL — human-in-the-loop item review (Bolt 2.1)
// =============================================================================

/**
 * Shown after AI processes a dump. User accepts/rejects each item before commit.
 * @param {object}   props
 * @param {Array}    props.proposed      — ProposedItem[] from useDump
 * @param {string}   props.aiResponse    — AI summary message
 * @param {string}   props.lang
 * @param {Function} props.onToggle      — (index) => void
 * @param {Function} props.onAcceptAll
 * @param {Function} props.onConfirm     — commits accepted items
 * @param {Function} props.onCancel      — discards all, back to idle
 */
function ReviewPanel({ proposed, aiResponse, lang, onToggle, onAcceptAll, onConfirm, onCancel }) {
  const acceptedCount = proposed.filter(p => p.accepted).length;

  const headingText =
    lang === "ru" ? "Вот что я нашёл:"
    : lang === "az" ? "Tapdım:"
    : "Here's what I found:";

  const acceptAllLabel =
    lang === "ru" ? "Принять всё"
    : lang === "az" ? "Hamısını qəbul et"
    : "Accept all";

  const confirmLabel =
    lang === "ru" ? `Добавить выбранное (${acceptedCount})`
    : lang === "az" ? `Seçilmişləri əlavə et (${acceptedCount})`
    : `Add selected (${acceptedCount})`;

  const cancelLabel =
    lang === "ru" ? "Отмена"
    : lang === "az" ? "Ləğv et"
    : "Cancel";

  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.borderHi}`,
      borderRadius: 20,
      padding: "16px",
      animation: "slideUp .35s cubic-bezier(.22,1,.36,1)",
    }}>
      {/* AI response message */}
      {aiResponse && (
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          marginBottom: 12,
          padding: "8px 12px",
          background: `${C.accent}10`,
          borderRadius: 10,
          border: `1px solid ${C.accent}22`,
        }}>
          {Icon.sparkle(C.accent, 13)}
          <span style={{ color: C.accentLit, fontSize: 12, fontWeight: 700, letterSpacing: 0.3, textTransform: "uppercase" }}>MindFlow</span>
          <span style={{ color: C.textSub, fontSize: 13 }}>{aiResponse}</span>
        </div>
      )}

      {/* Heading */}
      <div style={{ color: C.text, fontSize: 15, fontWeight: 700, marginBottom: 10, letterSpacing: -0.2 }}>
        {headingText}
      </div>

      {/* Proposed items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        {proposed.map((p, i) => (
          <button
            key={i}
            onClick={() => onToggle(i)}
            style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              background: p.accepted ? `${C.accent}10` : "transparent",
              border: `1px solid ${p.accepted ? C.accent + "44" : C.border}`,
              borderRadius: 12,
              padding: "10px 14px",
              cursor: "pointer",
              fontFamily: "inherit",
              textAlign: "left",
              transition: "all .15s",
            }}
          >
            {/* Checkbox indicator */}
            <span style={{
              width: 20, height: 20,
              borderRadius: 6,
              border: `1.5px solid ${p.accepted ? C.accent : C.border}`,
              background: p.accepted ? C.accent : "transparent",
              flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginTop: 1,
              transition: "all .15s",
            }}>
              {p.accepted && (
                <span style={{ color: "white", fontSize: 11, fontWeight: 800, lineHeight: 1 }}>✓</span>
              )}
            </span>

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Type chip */}
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
                color: p.accepted ? C.accentLit : C.textDim,
                textTransform: "uppercase",
                marginRight: 6,
              }}>
                {p.item.type}
              </span>
              {/* Text */}
              <span style={{
                color: p.accepted ? C.text : C.textDim,
                fontSize: 14,
                lineHeight: 1.4,
                textDecoration: p.accepted ? "none" : "line-through",
                transition: "color .15s",
              }}>
                {p.item.text}
              </span>

              {/* step_one hint — tasks only, when accepted */}
              {p.item.step_one && p.item.type === "task" && p.accepted && (
                <div style={{
                  color: C.textSub,
                  fontSize: 12,
                  marginTop: 4,
                  display: "flex", alignItems: "flex-start", gap: 4,
                }}>
                  <span style={{ color: C.accent, flexShrink: 0 }}>→</span>
                  <span>{p.item.step_one}</span>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {/* Accept all — only shown when some are deselected */}
        {proposed.some(p => !p.accepted) && (
          <button
            onClick={onAcceptAll}
            style={{
              height: 44, padding: "0 14px",
              background: "none",
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              color: C.textSub,
              fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
              transition: "border-color .15s",
            }}
          >
            {acceptAllLabel}
          </button>
        )}

        {/* Confirm — primary */}
        <button
          onClick={onConfirm}
          disabled={acceptedCount === 0}
          style={{
            flex: 1,
            height: 44,
            background: acceptedCount > 0
              ? `linear-gradient(135deg, ${C.accent}, ${C.accentLit})`
              : C.surfaceHi,
            color: acceptedCount > 0 ? "white" : C.textDim,
            border: "none",
            borderRadius: 12,
            fontSize: 14, fontWeight: 700,
            cursor: acceptedCount > 0 ? "pointer" : "not-allowed",
            fontFamily: "inherit",
            letterSpacing: 0.2,
            boxShadow: acceptedCount > 0 ? `0 4px 16px ${C.accentGlow}` : "none",
            transition: "all .2s",
          }}
        >
          {confirmLabel}
        </button>

        {/* Cancel */}
        <button
          onClick={onCancel}
          style={{
            height: 44, padding: "0 14px",
            background: "none",
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            color: C.textSub,
            fontSize: 13, fontWeight: 500,
            cursor: "pointer", fontFamily: "inherit",
          }}
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// DUMP SCREEN
// =============================================================================

/**
 * @param {object}   props
 * @param {object[]} props.thoughts
 * @param {Function} props.onProcess       — (rawText, items) => void
 * @param {Function} props.onToggleToday
 * @param {Function} props.onArchive
 * @param {Function} props.onUpdate
 * @param {string}   props.lang
 * @param {object}   props.persona
 * @param {boolean}  props.isPro
 * @param {Function} props.onShowPricing
 * @param {object|null} props.user         — auth user (needed for Supabase dump record)
 */
export function DumpScreen({ thoughts, onProcess, onToggleToday, onArchive, onUpdate, lang, persona, isPro, onShowPricing, user }) {
  const [text, setText] = useState("");
  const [filter, setFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState(null);
  const tx = T[lang] || T.en;

  // Bolt 4.1 — XP + Level Up toast for brain_dump_submitted
  const { addXp, levelUpPayload } = useCharacterProgress(user);

  // ── Dump state machine ──────────────────────────────────────────────────────
  const {
    status, proposed, aiResponse, errorMsg,
    submitDump, toggleItem, acceptAll, confirmItems, cancelReview,
  } = useDump({ lang, persona, isPro, thoughts, onProcess, onShowPricing, user });

  // ── Derived lists for the thought list below ────────────────────────────────
  const visible = useMemo(() =>
    thoughts.filter(t => !t.archived &&
      (filter === "all" || t.type === filter) &&
      (!tagFilter || t.tags?.includes(tagFilter))
    ), [thoughts, filter, tagFilter]);

  const allTags = useMemo(() => {
    const s = new Set();
    thoughts.forEach(t => { if (!t.archived) t.tags?.forEach(tag => s.add(tag)); });
    return [...s].slice(0, 12);
  }, [thoughts]);

  const FILTERS = ["all", "task", "idea", "note", "reminder", "expense", "memory"];

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSubmit  = () => submitDump(text);

  const handleConfirm = async () => {
    await confirmItems(text);  // passes rawText to useDump → onProcess
    setText("");
    // Bolt 4.1 — award XP for brain dump activity (ADR 0013, activity-based)
    if (user?.id) addXp(calcXpGain("brain_dump_submitted"));
  };

  // cancelReview: text is NOT cleared so user can continue editing
  const handleCancel  = () => cancelReview();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Bolt 4.1 — Level Up toast (auto-dismissed by hook after 2.5s) */}
      {levelUpPayload && (
        <LevelUpToast newLevel={levelUpPayload.newLevel} lang={lang} />
      )}

      {/* Ambient background glow */}
      <div style={{
        position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)",
        width: 300, height: 300, borderRadius: "50%",
        background: `radial-gradient(circle, ${C.accentGlow} 0%, transparent 70%)`,
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* Header */}
      <div style={{ padding: "20px 20px 14px", display: "flex", alignItems: "center", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {Icon.brain(C.accentLit, 28)}
          <div>
            <div style={{ color: C.text, fontSize: 20, fontWeight: 800, letterSpacing: -0.8, lineHeight: 1 }}>{tx.appName}</div>
            <div style={{ color: C.textSub, fontSize: 10, fontWeight: 500, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 2 }}>BETA</div>
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {!isPro && (() => {
            const left = FREE_LIMITS.dumpsPerMonth - getDumpCount();
            if (left <= 5) return (
              <button onClick={() => onShowPricing?.("dumps")} style={{
                background: `${C.idea}15`, border: `1px solid ${C.idea}30`,
                color: C.idea, fontSize: 10, fontWeight: 700,
                padding: "3px 8px", borderRadius: 6,
                cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.3,
              }}>
                {left <= 0
                  ? (lang === "ru" ? "Лимит" : "Limit")
                  : `${left} ${lang === "ru" ? "дампов" : lang === "az" ? "demp" : "dumps"}`} ⚡
              </button>
            );
            return null;
          })()}
          <span style={{ color: C.textSub, fontSize: 13 }}>{greeting(lang)}</span>
        </div>
      </div>

      {/* Input area OR review panel */}
      <div style={{ padding: "0 16px", flexShrink: 0, position: "relative", zIndex: 1 }}>
        {status !== "review" ? (
          <>
            <DumpInput
              text={text}
              setText={setText}
              onSubmit={handleSubmit}
              isProcessing={status === "processing"}
              lang={lang}
              status={status}
            />

            {/* Error message */}
            {status === "error" && errorMsg && (
              <div style={{
                marginTop: 10, padding: "11px 14px",
                background: `${C.high}10`,
                borderRadius: 14, border: `1px solid ${C.high}22`,
                color: C.high, fontSize: 14, lineHeight: 1.5,
                animation: "fadeIn .3s ease",
              }}>
                {errorMsg}
              </div>
            )}

            {/* Done confirmation */}
            {status === "done" && (
              <div style={{
                marginTop: 10, padding: "11px 14px",
                background: `${C.done}10`,
                borderRadius: 14, border: `1px solid ${C.done}22`,
                color: C.done, fontSize: 14, lineHeight: 1.5,
                animation: "fadeIn .3s ease",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                {Icon.check(C.done, 14)}
                {lang === "ru" ? "Добавлено в список."
                 : lang === "az" ? "Siyahıya əlavə edildi."
                 : "Added to your list."}
              </div>
            )}
          </>
        ) : (
          <ReviewPanel
            proposed={proposed}
            aiResponse={aiResponse}
            lang={lang}
            onToggle={toggleItem}
            onAcceptAll={acceptAll}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        )}
      </div>

      {/* Type filter chips */}
      <div style={{ display: "flex", gap: 6, padding: "12px 16px 0", overflowX: "auto", flexShrink: 0, position: "relative", zIndex: 1 }}>
        {FILTERS.map(f => {
          const cfg = TYPE_CFG[f];
          return (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "5px 11px", borderRadius: 9, flexShrink: 0,
              border: `1px solid ${filter === f ? C.accent : C.border}`,
              background: filter === f ? `${C.accent}18` : "transparent",
              color: filter === f ? C.accentLit : C.textSub,
              fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              display: "flex", alignItems: "center", gap: 5,
              transition: "all .15s",
            }}>
              {f !== "all" && cfg && Icon[cfg.icon] && Icon[cfg.icon](filter === f ? C.accentLit : C.textSub, 12)}
              {f === "all" ? tx.filterAll : (cfg?.label[lang] || f)}
            </button>
          );
        })}
      </div>

      {/* Tag filter chips — only when there are tags */}
      {allTags.length > 0 && (
        <div style={{ display: "flex", gap: 5, padding: "7px 16px 0", overflowX: "auto", flexShrink: 0 }}>
          {allTags.map(tag => (
            <button key={tag} onClick={() => setTagFilter(tagFilter === tag ? null : tag)} style={{
              padding: "3px 9px", borderRadius: 7, flexShrink: 0,
              border: `1px solid ${tagFilter === tag ? C.accentLit : C.border}`,
              background: tagFilter === tag ? `${C.accentLit}18` : "transparent",
              color: tagFilter === tag ? C.accentLit : C.textDim,
              fontSize: 11, fontWeight: tagFilter === tag ? 700 : 500,
              cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4,
              transition: "all .15s",
            }}>
              {Icon.tag(tagFilter === tag ? C.accentLit : C.textDim, 9)}
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Thought list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "10px 16px 90px", position: "relative", zIndex: 1 }}>
        {visible.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: 60 }}>
            <div style={{ marginBottom: 16 }}>{Icon.brain(C.textDim, 48)}</div>
            <div style={{ color: C.text, fontSize: 16, fontWeight: 700, marginBottom: 6, letterSpacing: -0.3 }}>
              {filter === "all" && !tagFilter ? tx.noThoughts : `No ${tagFilter ? `#${tagFilter}` : filter + "s"} yet.`}
            </div>
            <div style={{ color: C.textSub, fontSize: 13 }}>
              {filter === "all" && !tagFilter ? tx.noThoughtsSub : "Try a different filter."}
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ color: C.textSub, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>
                {visible.length} {visible.length === 1 ? tx.item : tx.items}
                {tagFilter && <span style={{ color: C.accentLit, marginLeft: 5 }}>#{tagFilter}</span>}
              </span>
              {(filter !== "all" || tagFilter) && (
                <button onClick={() => { setFilter("all"); setTagFilter(null); }} style={{ background: "none", border: "none", color: C.textDim, fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>✕ clear</button>
              )}
            </div>
            {visible.map(t => (
              <ThoughtCard
                key={t.id}
                thought={t}
                lang={lang}
                onToggleToday={onToggleToday}
                onArchive={onArchive}
                onUpdate={onUpdate}
                onTagClick={tag => setTagFilter(tagFilter === tag ? null : tag)}
                showDone
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
