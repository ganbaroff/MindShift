/**
 * features/today/ChatBubble.jsx
 * Bolt 3.2 — AI Persona Dialogue
 *
 * A single character speech bubble. Used to display:
 *   - the auto-greeting when TodayScreen loads (AC2)
 *   - individual messages in ChatPanel (AC1, AC3)
 *
 * Props:
 *   text        — message text
 *   senderName  — character name shown above the bubble
 *   color       — archetype colour (for sender name + left border accent)
 *   isUser      — boolean, true for user messages (right-aligned)
 */

import { C } from "../../skeleton/design-system/tokens.js";

export function ChatBubble({ text, senderName, color, isUser = false }) {
  if (!text) return null;

  if (isUser) {
    return (
      <div style={{
        display:       "flex",
        justifyContent:"flex-end",
        marginBottom:  8,
      }}>
        <div style={{
          maxWidth:     "78%",
          background:   `${C.accent}22`,
          border:       `1px solid ${C.accent}44`,
          borderRadius: "14px 14px 4px 14px",
          padding:      "8px 12px",
          fontSize:     14,
          color:        C.text,
          lineHeight:   1.5,
        }}>
          {text}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display:       "flex",
      flexDirection: "column",
      alignItems:    "flex-start",
      marginBottom:  8,
      animation:     "slideUp .3s cubic-bezier(.22,1,.36,1) both",
    }}>
      {senderName && (
        <span style={{
          fontSize:    11,
          fontWeight:  600,
          color:       color || C.accent,
          marginBottom: 3,
          marginLeft:   2,
        }}>
          {senderName}
        </span>
      )}
      <div style={{
        maxWidth:     "82%",
        background:   C.surface,
        border:       `1px solid ${C.border}`,
        borderLeft:   `3px solid ${color || C.accent}`,
        borderRadius: "4px 14px 14px 14px",
        padding:      "8px 12px",
        fontSize:     14,
        color:        C.text,
        lineHeight:   1.55,
      }}>
        {text}
      </div>
    </div>
  );
}
