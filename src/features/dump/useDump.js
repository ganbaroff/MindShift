/**
 * features/dump/useDump.js
 * Hook for brain dump state machine.
 *
 * Bolt 2.1: human-in-the-loop dump pipeline.
 *   idle → processing → review → idle (confirmed or cancelled)
 *          ↓ on error
 *         error → idle
 *
 * Exports: useDump
 */

import { useState, useCallback } from "react";
import { parseDump }     from "./dump.api.js";
import { FREE_LIMITS, getDumpCount, incrementDumpCount } from "../../shared/lib/freemium.js";
import { logError }      from "../../shared/lib/logger.js";
import { sbSaveDump, sbUpdateDumpResult } from "../../shared/services/supabase.js";

/**
 * @typedef {Object} ProposedItem
 * @property {object}  item      — parsed thought item from AI
 * @property {boolean} accepted  — whether the user has accepted this item
 */

/**
 * @param {object} opts
 * @param {string}   opts.lang
 * @param {object}   opts.persona
 * @param {boolean}  opts.isPro
 * @param {object[]} opts.thoughts     — current thoughts array (for count check)
 * @param {Function} opts.onProcess    — (rawText, items) => void — commits accepted items
 * @param {Function} opts.onShowPricing — (reason) => void
 * @param {object|null} opts.user      — auth user or null
 */
export function useDump({ lang, persona, isPro, thoughts, onProcess, onShowPricing, user }) {
  // "idle" | "processing" | "review" | "done" | "error"
  const [status,      setStatus]      = useState("idle");
  const [proposed,    setProposed]    = useState(/** @type {ProposedItem[]} */ ([]));
  const [aiResponse,  setAiResponse]  = useState("");
  const [errorMsg,    setErrorMsg]    = useState("");
  const [dumpId,      setDumpId]      = useState(null); // Supabase dump record id

  /**
   * Submit a raw text dump for AI processing.
   * Sets status to "review" on success, "error" on failure.
   * @param {string} rawText
   */
  const submitDump = useCallback(async (rawText) => {
    const trimmed = rawText?.trim();
    if (!trimmed || status === "processing") return;

    // ── Freemium gate ────────────────────────────────────────────────────────
    if (!isPro) {
      const dumpCount   = getDumpCount();
      const activeCount = thoughts.filter(t => !t.archived).length;
      if (dumpCount >= FREE_LIMITS.dumpsPerMonth) {
        onShowPricing?.("dumps");
        return;
      }
      if (activeCount >= FREE_LIMITS.thoughtsStored) {
        onShowPricing?.("thoughts");
        return;
      }
    }

    incrementDumpCount();
    setStatus("processing");
    setErrorMsg("");

    // ── Save raw dump to Supabase (fire-and-forget; id needed for later update)
    let newDumpId = null;
    if (user?.id) {
      newDumpId = await sbSaveDump(trimmed, user.id);
      setDumpId(newDumpId);
    }

    // ── AI parse ─────────────────────────────────────────────────────────────
    try {
      const { items, response } = await parseDump(trimmed, lang, persona);

      // Mark all items accepted by default
      setProposed(items.map(item => ({ item, accepted: true })));
      setAiResponse(response);

      // Update dump record with AI result
      if (newDumpId && user?.id) {
        sbUpdateDumpResult(newDumpId, { items, response }, user.id)
          .catch(e => logError("useDump.updateDumpResult", e));
      }

      setStatus("review");
    } catch (e) {
      logError("useDump.submitDump", e);
      const msg =
        e.message === "timeout"
          ? (lang === "ru" ? "⏱ Таймаут — попробуй снова"
             : lang === "az" ? "⏱ Vaxt bitdi"
             : "⏱ Timeout — try again")
        : e.message?.includes(":auth")
          ? (lang === "ru" ? "🔑 Ошибка API ключа" : "🔑 API key error")
        : e.message?.includes(":rate_limit")
          ? (lang === "ru" ? "⏳ Лимит запросов — подожди минуту"
             : "⏳ Rate limit — wait a moment")
        : (lang === "ru" ? "Что-то пошло не так — попробуй снова"
           : lang === "az" ? "Xəta baş verdi — yenidən cəhd et"
           : "Something went wrong — try again");
      setErrorMsg(msg);
      setStatus("error");
      setTimeout(() => { setStatus("idle"); setErrorMsg(""); }, 4000);
    }
  }, [status, lang, persona, isPro, thoughts, onProcess, onShowPricing, user]);

  /**
   * Toggle accept/reject for a single proposed item.
   * @param {number} index
   */
  const toggleItem = useCallback((index) => {
    setProposed(prev =>
      prev.map((p, i) => i === index ? { ...p, accepted: !p.accepted } : p)
    );
  }, []);

  /** Accept all proposed items. */
  const acceptAll = useCallback(() => {
    setProposed(prev => prev.map(p => ({ ...p, accepted: true })));
  }, []);

  /**
   * Confirm: call onProcess with accepted items only, then reset.
   * @param {string} rawText — the original raw text (passed through to onProcess)
   */
  const confirmItems = useCallback(async (rawText) => {
    const accepted = proposed.filter(p => p.accepted).map(p => p.item);
    if (accepted.length) {
      await onProcess(rawText, accepted);
    }
    setProposed([]);
    setAiResponse("");
    setDumpId(null);
    setStatus("done");
    setTimeout(() => setStatus("idle"), 2500);
  }, [proposed, onProcess]);

  /** Cancel the review — discard all proposed items. */
  const cancelReview = useCallback(() => {
    setProposed([]);
    setAiResponse("");
    setDumpId(null);
    setStatus("idle");
  }, []);

  return {
    status,        // "idle" | "processing" | "review" | "done" | "error"
    proposed,      // ProposedItem[]
    aiResponse,    // string
    errorMsg,      // string
    submitDump,
    toggleItem,
    acceptAll,
    confirmItems,
    cancelReview,
  };
}
