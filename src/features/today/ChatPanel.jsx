/**
 * features/today/ChatPanel.jsx
 * Bolt 3.2 — AI Persona Dialogue
 *
 * Inline chat panel that opens when the user taps "Поговорить".
 * NOT a modal — renders inline below PersonaCard (AC3).
 *
 * AC3:  Opens / closes inline. Closes on × and Escape.
 * AC5:  Chat history stored in localStorage, key mf_persona_chat_{userId}.
 *        Last 6 messages sent to API (trim on save, not on load).
 * AC6:  Calls checkAndIncrement("persona") before each AI call.
 * AC7:  Limit reached → silent fallback from getLimitFallback() (no "limit" text).
 * AC8:  Typing indicator — animated 3-dot bounce; prefers-reduced-motion → static "…"
 * AC9:  Closes on Escape key + × button.
 *
 * ADHD principles enforced:
 *   P1  — no shame: limit fallback is in-character, never accusatory.
 *   P7  — no pressure: no "X messages left" counter shown.
 *   P12 — no countdown timers or looping animations (typing indicator
 *          is a brief transient state, not a loop the user can stare at).
 *
 * Props:
 *   archetype       — "explorer" | "builder" | "dreamer" | "guardian"
 *   archetypeName   — display name string (shown as sender in bubbles)
 *   archetypeColor  — hex color string (from ARCHETYPE_COLORS)
 *   lang            — "en" | "ru" | "az"
 *   user            — Supabase User object
 *   level           — character level (int)
 *   completedTasks  — count of done tasks today (int)
 *   totalTasks      — total tasks today (int)
 *   checkAndIncrement — from useUsageLimits (feature "persona")
 *   onClose         — callback to hide the panel
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { C }                from "../../skeleton/design-system/tokens.js";
import { personaDialogue }  from "../../shared/services/claude.js";
import { getLimitFallback } from "../../shared/lib/dialogues.js";
import { logError }         from "../../shared/lib/logger.js";
import { ChatBubble }       from "./ChatBubble.jsx";

// ─── localStorage helpers ───────────────────────────────────────────────────

/** Returns the localStorage key for a user's chat history. */
function historyKey(userId) {
  return `mf_persona_chat_${userId}`;
}

/** Loads chat history from localStorage. Returns [] on parse error. */
function loadHistory(userId) {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(historyKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Saves chat history to localStorage, capped at MAX_STORED messages. */
const MAX_STORED = 30; // keep more than we send — user can scroll back
function saveHistory(userId, messages) {
  if (!userId) return;
  try {
    const trimmed = messages.slice(-MAX_STORED);
    localStorage.setItem(historyKey(userId), JSON.stringify(trimmed));
  } catch (e) {
    // localStorage full or private browsing — silently skip (INVARIANT 7 via logError)
    logError("ChatPanel.saveHistory", e);
  }
}

// ─── Typing indicator ────────────────────────────────────────────────────────

/**
 * TypingIndicator — 3-dot bounce animation while Claude is responding.
 * prefers-reduced-motion: renders a static "…" instead.
 *
 * Uses a scoped <style> keyframe (dotBounce) per ADR 0011 pattern.
 * The animation is NOT looping — it loops while `isTyping` is true but
 * the whole component unmounts when typing ends, so there's no zombie loop.
 */
function TypingIndicator({ color }) {
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reducedMotion) {
    return (
      <div style={{
        display:     "flex",
        alignItems:  "center",
        marginBottom: 8,
      }}>
        <div style={{
          background:   C.surface,
          border:       `1px solid ${C.border}`,
          borderLeft:   `3px solid ${color || C.accent}`,
          borderRadius: "4px 14px 14px 14px",
          padding:      "8px 14px",
          fontSize:     18,
          color:        C.textSub,
          letterSpacing: 2,
        }}>
          …
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes dotBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: .4; }
          40%            { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
      <div style={{
        display:     "flex",
        alignItems:  "center",
        marginBottom: 8,
      }}>
        <div style={{
          display:      "flex",
          alignItems:   "center",
          gap:          5,
          background:   C.surface,
          border:       `1px solid ${C.border}`,
          borderLeft:   `3px solid ${color || C.accent}`,
          borderRadius: "4px 14px 14px 14px",
          padding:      "10px 14px",
        }}>
          {[0, 1, 2].map(i => (
            <span
              key={i}
              style={{
                display:         "inline-block",
                width:           6,
                height:          6,
                borderRadius:    "50%",
                background:      color || C.accent,
                animation:       `dotBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}

// ─── i18n labels ────────────────────────────────────────────────────────────

const TX = {
  placeholder: {
    en: "Type a message…",
    ru: "Напишите сообщение…",
    az: "Mesaj yazın…",
  },
  send: {
    en: "Send",
    ru: "Отправить",
    az: "Göndər",
  },
  closeLabel: {
    en: "Close chat",
    ru: "Закрыть чат",
    az: "Çatı bağla",
  },
};

function t(key, lang) {
  return TX[key]?.[lang] ?? TX[key]?.en ?? "";
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ChatPanel({
  archetype      = "explorer",
  archetypeName  = "Explorer",
  archetypeColor,
  lang           = "en",
  user,
  level          = 1,
  completedTasks = 0,
  totalTasks     = 0,
  checkAndIncrement,
  onClose,
}) {
  const color = archetypeColor || C.accent;

  // ── State ──────────────────────────────────────────────────────────────────
  const [messages,  setMessages]  = useState(() => loadHistory(user?.id));
  const [input,     setInput]     = useState("");
  const [isTyping,  setIsTyping]  = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────────
  const scrollRef  = useRef(null); // bottom anchor for auto-scroll
  const inputRef   = useRef(null); // auto-focus on open

  // ── Escape key → onClose (AC9) ─────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // ── Auto-focus input on mount ──────────────────────────────────────────────
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ── Auto-scroll to bottom when messages or typing state changes ────────────
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    // 1. Append user message and clear input
    const userMsg  = { role: "user", content: text };
    const updated  = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setIsTyping(true);

    // 2. Persist history immediately (so it survives even on error)
    saveHistory(user?.id, updated);

    try {
      // 3. Check daily limit before calling API (AC6)
      const { allowed } = await checkAndIncrement("persona");

      let replyText;
      if (allowed) {
        // 4a. Send last 6 messages to Claude API (AC5)
        const apiMessages = updated
          .slice(-6)
          .map(m => ({ role: m.role, content: m.content }));

        replyText = await personaDialogue(apiMessages, {
          archetype,
          archetypeName,
          lang,
          level,
          completedTasks,
          totalTasks,
        });
      } else {
        // 4b. Limit reached — silent in-character fallback (AC7)
        replyText = getLimitFallback(archetype, lang);
      }

      // 5. Append assistant reply
      const assistantMsg  = { role: "assistant", content: replyText };
      const withReply     = [...updated, assistantMsg];
      setMessages(withReply);
      saveHistory(user?.id, withReply);

    } catch (e) {
      logError("ChatPanel.sendMessage", e);
      // On unexpected error — silent in-character fallback (same as limit, P1: no shame)
      const fallback     = getLimitFallback(archetype, lang);
      const withFallback = [...updated, { role: "assistant", content: fallback }];
      setMessages(withFallback);
      saveHistory(user?.id, withFallback);
    } finally {
      setIsTyping(false);
      // Re-focus input after response
      inputRef.current?.focus();
    }
  }, [
    input, isTyping, messages, user?.id,
    archetype, archetypeName, lang, level, completedTasks, totalTasks,
    checkAndIncrement,
  ]);

  // ── Enter key → send (Shift+Enter inserts newline) ─────────────────────────
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{
      background:   C.surface,
      border:       `1px solid ${C.border}`,
      borderTop:    `3px solid ${color}`,
      borderRadius: "0 0 16px 16px",
      marginBottom: 12,
      display:      "flex",
      flexDirection:"column",
      maxHeight:    420,
    }}>

      {/* ── Panel header ── */}
      <div style={{
        display:      "flex",
        alignItems:   "center",
        padding:      "10px 14px 8px",
        borderBottom: `1px solid ${C.border}`,
        flexShrink:   0,
      }}>
        <span style={{
          fontSize:   12,
          fontWeight: 700,
          color:      color,
          flex:       1,
          letterSpacing: .2,
        }}>
          {archetypeName}
        </span>

        {/* × close button (AC9) */}
        <button
          onClick={onClose}
          aria-label={t("closeLabel", lang)}
          style={{
            background:   "none",
            border:       "none",
            color:        C.textDim,
            fontSize:     18,
            lineHeight:   1,
            cursor:       "pointer",
            padding:      "2px 4px",
            borderRadius: 6,
            fontFamily:   "inherit",
            flexShrink:   0,
            // Touch target ≥ 44px (WCAG 2.5.5 / neurodivergent-ux)
            minWidth:     44,
            minHeight:    44,
            display:      "flex",
            alignItems:   "center",
            justifyContent: "center",
          }}
        >
          ✕
        </button>
      </div>

      {/* ── Message list ── */}
      <div style={{
        flex:      1,
        overflowY: "auto",
        padding:   "12px 14px 0",
        minHeight: 80,
      }}>
        {messages.length === 0 && (
          <div style={{
            textAlign:  "center",
            color:      C.textDim,
            fontSize:   12,
            padding:    "24px 0 12px",
            fontStyle:  "italic",
          }}>
            {lang === "ru" ? "Начни разговор…"
           : lang === "az" ? "Söhbətə başla…"
           : "Start the conversation…"}
          </div>
        )}

        {messages.map((msg, i) => (
          <ChatBubble
            key={i}
            text={msg.content}
            senderName={msg.role === "assistant" ? archetypeName : undefined}
            color={color}
            isUser={msg.role === "user"}
          />
        ))}

        {/* Typing indicator (AC8) */}
        {isTyping && <TypingIndicator color={color} />}

        {/* Scroll anchor */}
        <div ref={scrollRef} />
      </div>

      {/* ── Input row ── */}
      <div style={{
        display:      "flex",
        gap:          8,
        padding:      "10px 14px",
        borderTop:    `1px solid ${C.border}`,
        flexShrink:   0,
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isTyping}
          placeholder={t("placeholder", lang)}
          rows={1}
          style={{
            flex:         1,
            background:   C.bg,
            border:       `1px solid ${C.border}`,
            borderRadius: 10,
            padding:      "8px 12px",
            fontSize:     14,
            color:        C.text,
            fontFamily:   "inherit",
            lineHeight:   1.4,
            resize:       "none",
            outline:      "none",
            // Visible focus state (WCAG 2.4.7, neurodivergent-ux)
            transition:   "border-color .15s",
          }}
          onFocus={e => { e.target.style.borderColor = `${color}88`; }}
          onBlur={e  => { e.target.style.borderColor = C.border; }}
        />

        <button
          onClick={sendMessage}
          disabled={!input.trim() || isTyping}
          aria-label={t("send", lang)}
          style={{
            background:   input.trim() && !isTyping ? color : C.border,
            color:        input.trim() && !isTyping ? "#fff" : C.textDim,
            border:       "none",
            borderRadius: 10,
            padding:      "8px 14px",
            fontSize:     13,
            fontWeight:   700,
            cursor:       input.trim() && !isTyping ? "pointer" : "default",
            fontFamily:   "inherit",
            flexShrink:   0,
            transition:   "background .15s, color .15s",
            // Touch target ≥ 44px
            minHeight:    44,
            minWidth:     44,
            display:      "flex",
            alignItems:   "center",
            justifyContent: "center",
          }}
        >
          ↑
        </button>
      </div>
    </div>
  );
}
