/**
 * features/dump/DumpInput.jsx
 * Free-form brain dump input — mobile-first, no required fields.
 *
 * Bolt 2.1: dedicated input component.
 *   Design: adhd-aware-planning Principle 4 (Dump first, structure later).
 *   No tags, no priority picker, no category selector — just text.
 *
 * Exports: DumpInput
 */

import { useState, useRef, useEffect } from "react";
import { C }       from "../../skeleton/design-system/tokens.js";
import { Icon }    from "../../shared/ui/icons.jsx";
import { Spinner } from "../../shared/ui/primitives.jsx";

// ─────────────────────────────────────────────────────────────────────────────
// Voice button — dump-local sub-component
// ─────────────────────────────────────────────────────────────────────────────
function VoiceBtn({ onResult, disabled, lang }) {
  const [recording, setRecording] = useState(false);
  const recRef    = useRef(null);
  const supported = "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
  const sttLang   = lang === "ru" ? "ru-RU" : lang === "az" ? "az-AZ" : "en-US";

  const toggle = () => {
    if (!supported) {
      alert(lang === "ru"
        ? "Голосовой ввод не поддерживается в этом браузере. Попробуй Chrome."
        : "Voice input not supported. Try Chrome.");
      return;
    }
    if (recording) {
      recRef.current?.stop();
      recRef.current = null;
      setRecording(false);
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = sttLang;
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = e => {
      onResult(e.results[0][0].transcript);
      recRef.current = null;
      setRecording(false);
    };
    rec.onerror = rec.onend = () => {
      recRef.current = null;
      setRecording(false);
    };
    rec.start();
    recRef.current = rec;
    setRecording(true);
  };

  const ariaLabel = recording
    ? (lang === "ru" ? "Остановить запись" : "Stop recording")
    : (lang === "ru" ? "Голосовой ввод"   : lang === "az" ? "Səs girişi" : "Voice input");

  return (
    <button
      onClick={toggle}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{
        width: 52, height: 52, borderRadius: 14, flexShrink: 0,
        border: `1px solid ${recording ? C.high + "88" : C.border}`,
        background: recording ? `${C.high}18` : C.surfaceHi,
        color: recording ? C.high : C.textSub,
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: recording ? "micPulse 1.4s infinite" : "none",
        transition: "all .2s",
        boxShadow: recording ? `0 0 16px ${C.high}44` : "none",
      }}
    >
      {recording ? Icon.stop(C.high, 16) : Icon.mic(C.textSub, 20)}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DumpInput
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @param {object}   props
 * @param {string}   props.text         — controlled value
 * @param {Function} props.setText      — setter
 * @param {Function} props.onSubmit     — () => void — called when user submits
 * @param {boolean}  props.isProcessing — disables input + shows spinner
 * @param {string}   props.lang
 * @param {string}   props.status       — "idle"|"processing"|"review"|"done"|"error"
 */
export function DumpInput({ text, setText, onSubmit, isProcessing, lang, status }) {
  const taRef = useRef(null);

  // Auto-focus on mount
  useEffect(() => {
    if (taRef.current && !isProcessing) taRef.current.focus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const placeholder =
    lang === "ru"
      ? "Что у тебя в голове сейчас?\nПиши как угодно — задачи, тревоги, идеи, всё подряд.\n⌘+Enter чтобы разобрать."
      : lang === "az"
      ? "İndi nə düşünürsən?\nİstənilən formatda yaz — tapşırıqlar, narahatlıqlar, fikirlər.\n⌘+Enter ilə göndər."
      : "What's on your mind right now?\nWrite freely — tasks, worries, ideas, anything.\n⌘+Enter to process.";

  const btnLabel =
    lang === "ru" ? "Разобрать"
    : lang === "az" ? "Təhlil et"
    : "Process";

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") onSubmit();
  };

  const isActive = text.trim().length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Textarea — occupies most of the screen on mobile */}
      <div style={{
        background: C.surface,
        borderRadius: 20,
        border: `1.5px solid ${isActive ? C.borderHi : C.border}`,
        transition: "border-color .2s, box-shadow .2s",
        boxShadow: isActive ? `0 0 0 3px ${C.accentGlow}` : "none",
      }}>
        <textarea
          ref={taRef}
          data-testid="dump-input"
          value={text}
          onChange={e => setText(e.target.value.slice(0, 3000))}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={6}
          aria-label={lang === "ru" ? "Поле для мыслей" : lang === "az" ? "Düşüncə sahəsi" : "Brain dump input"}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            color: C.text,
            fontSize: 15,
            lineHeight: 1.7,
            padding: "18px 20px",
            resize: "none",
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Actions row */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <VoiceBtn
          lang={lang}
          disabled={isProcessing}
          onResult={t => setText(prev => prev ? `${prev} ${t}` : t)}
        />

        <button
          data-testid="process-btn"
          onClick={onSubmit}
          disabled={isProcessing || !isActive}
          aria-label={btnLabel}
          style={{
            flex: 1,
            height: 52,
            background: isProcessing
              ? C.surfaceHi
              : isActive
                ? `linear-gradient(135deg, ${C.accent}, ${C.accentLit})`
                : C.surface,
            color: isActive && !isProcessing ? "white" : C.textSub,
            border: "none",
            borderRadius: 16,
            fontSize: 15,
            fontWeight: 700,
            cursor: !isActive || isProcessing ? "not-allowed" : "pointer",
            transition: "all .2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontFamily: "inherit",
            letterSpacing: 0.3,
            boxShadow: isActive && !isProcessing ? `0 4px 20px ${C.accentGlow}` : "none",
          }}
        >
          {isProcessing && (
            <><Spinner />
              {" "}{lang === "ru" ? "Думаю..." : lang === "az" ? "Düşünürəm..." : "Thinking..."}
            </>
          )}
          {!isProcessing && isActive  && <>{Icon.send("white", 15)} {btnLabel}</>}
          {!isProcessing && !isActive && btnLabel}
        </button>
      </div>

      {/* Char count / keyboard hint */}
      {text.length > 20 && (status === "idle" || !status) && (
        <div style={{
          display: "flex", justifyContent: "space-between", padding: "0 4px",
        }}>
          <span style={{ color: C.textSub, fontSize: 11 }}>
            {lang === "ru" ? "⌘+Enter для отправки"
             : lang === "az" ? "⌘+Enter göndər"
             : "⌘+Enter to send"}
          </span>
          <span style={{ color: text.length > 1500 ? C.medium : C.textDim, fontSize: 11 }}>
            {text.length}
          </span>
        </div>
      )}
    </div>
  );
}
