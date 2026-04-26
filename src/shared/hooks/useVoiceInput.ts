import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capgo/capacitor-speech-recognition';
import { supabase } from '@/shared/lib/supabase';
import { logError } from '@/shared/lib/logger';
import { detectCrisis, getCrisisResources } from '@/shared/lib/crisisDetection';
import { useStore } from '@/store';
import { notifyAchievement } from '@/shared/lib/notify';
import { getToneCopy } from '@/shared/lib/uiTone';
import { ACHIEVEMENT_DEFINITIONS } from '@/types';
import type { TaskType, TaskCategory } from '@/types';

// Voice input strategy:
//   1. On native (Capacitor Android/iOS): use @capgo/capacitor-speech-recognition
//      plugin which bridges to Android SpeechRecognizer / iOS SFSpeechRecognizer.
//      Requires RECORD_AUDIO permission (declared in AndroidManifest.xml).
//   2. On web (browser): use Web Speech API (webkitSpeechRecognition) — works
//      in Chrome desktop and mobile Chrome PWA contexts.
//   3. Otherwise: voiceSupported = false, mic button hidden / disabled.
//
// This is the fix for Session 125 P0: voice was silently broken on Android
// because Capacitor WebView does not expose webkitSpeechRecognition globally.
// Native plugin bridges the gap.

// SpeechRecognition browser compatibility (web fallback)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionInstance = any;
const SpeechRecognitionAPI: (new () => SpeechRecognitionInstance) | null =
  (typeof window !== 'undefined' &&
    ((window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ??
     (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition)) || null;

const IS_NATIVE = Capacitor.isNativePlatform();

export type VoiceState = 'idle' | 'listening' | 'classifying';

const VALID_TASK_TYPES: readonly TaskType[] = ['task', 'idea', 'reminder', 'meeting'] as const;
const VALID_CATEGORIES: readonly TaskCategory[] = ['work', 'personal', 'health', 'learning', 'finance'] as const;

interface VoiceResult {
  title: string;
  difficulty?: 1 | 2 | 3;
  minutes?: number;
  dueDate?: string;
  dueTime?: string;
  taskType?: TaskType;
  category?: TaskCategory;
  confidence?: number;
}

interface UseVoiceInputOptions {
  locale: string;
  onResult: (result: VoiceResult) => void;
}

interface UseVoiceInputReturn {
  voiceState: VoiceState;
  voiceError: string | null;
  classifyConfidence: number | null;
  voiceSupported: boolean;
  handleVoiceTap: () => void;
  reset: () => void;
}

export function useVoiceInput({ locale, onResult }: UseVoiceInputOptions): UseVoiceInputReturn {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [classifyConfidence, setClassifyConfidence] = useState<number | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  // Native platform always supported via plugin; web depends on browser API
  const voiceSupported = IS_NATIVE || !!SpeechRecognitionAPI;

  const classifyTranscript = useCallback(async (transcript: string) => {
    if (!transcript.trim()) { setVoiceState('idle'); return; }

    // Crisis detection — show resources, skip AI, use raw text
    if (detectCrisis(transcript)) {
      const resources = getCrisisResources(locale);
      toast(resources.primary, { duration: 10_000 });
      toast(resources.international, { duration: 10_000 });
      onResultRef.current({ title: transcript.trim().slice(0, 80) });
      setVoiceState('idle');
      return;
    }

    setVoiceState('classifying');
    try {
      // 10s timeout for AI classification — race against a timeout promise
      const VOICE_TIMEOUT_MS = 10_000;
      const timeoutPromise = new Promise<'timeout'>((resolve) =>
        setTimeout(() => resolve('timeout'), VOICE_TIMEOUT_MS)
      );

      const invokePromise = supabase.functions.invoke('classify-voice-input', {
        body: { text: transcript.trim(), language: locale },
      });

      const raceResult = await Promise.race([invokePromise, timeoutPromise]);

      if (raceResult === 'timeout') {
        toast('Voice input timed out. Try typing instead.', { duration: 3000 });
        onResultRef.current({ title: transcript.trim().slice(0, 80) });
        setVoiceState('idle');
        return;
      }

      const { data } = raceResult;

      if (data?.title) {
        const result: VoiceResult = { title: data.title as string };

        if (data.difficulty && [1, 2, 3].includes(Number(data.difficulty))) {
          result.difficulty = Number(data.difficulty) as 1 | 2 | 3;
        }

        const aiMinutes = Number(data.estimatedMinutes);
        if (aiMinutes > 0) {
          result.minutes = aiMinutes;
        }

        if (data.dueDate && typeof data.dueDate === 'string') {
          result.dueDate = data.dueDate;
        }

        if (data.dueTime && typeof data.dueTime === 'string') {
          result.dueTime = data.dueTime;
        }

        if (typeof data.type === 'string' && VALID_TASK_TYPES.includes(data.type as TaskType)) {
          result.taskType = data.type as TaskType;
        }

        if (typeof data.category === 'string' && VALID_CATEGORIES.includes(data.category as TaskCategory)) {
          result.category = data.category as TaskCategory;
        }

        result.confidence = typeof data.confidence === 'number' ? data.confidence : undefined;
        setClassifyConfidence(result.confidence ?? null);
        onResultRef.current(result);

        // Achievement: voice_input — add a task by voice
        const s = useStore.getState();
        if (!s.hasAchievement('voice_input')) {
          s.unlockAchievement('voice_input');
          const toneCopy = getToneCopy(s.uiTone);
          const def = ACHIEVEMENT_DEFINITIONS.find(a => a.key === 'voice_input');
          if (def) notifyAchievement(toneCopy.badgeUnlocked(def.name), def.emoji, def.description);
        }
      }
    } catch (err) {
      logError('useVoiceInput.classifyTranscript', err);
      // Fallback: use raw transcript as title
      onResultRef.current({ title: transcript.trim().slice(0, 80) });
    } finally {
      setVoiceState('idle');
    }
  }, [locale]);

  // ── Native (Capacitor Android/iOS) speech recognition ──────────────────
  const handleVoiceTapNative = useCallback(async () => {
    if (voiceState === 'listening') {
      try { await SpeechRecognition.stop(); } catch { /* ignore */ }
      return;
    }
    if (voiceState === 'classifying') return;

    setVoiceError(null);
    setClassifyConfidence(null);

    try {
      // Check / request permission (RECORD_AUDIO on Android, microphone on iOS)
      const avail = await SpeechRecognition.available();
      if (!avail.available) {
        setVoiceError('Voice input is not available on this device.');
        return;
      }
      const perm = await SpeechRecognition.checkPermissions();
      if (perm.speechRecognition !== 'granted') {
        const req = await SpeechRecognition.requestPermissions();
        if (req.speechRecognition !== 'granted') {
          setVoiceError('Microphone permission denied.');
          return;
        }
      }

      setVoiceState('listening');
      const result = await SpeechRecognition.start({
        language: locale + '-' + locale.toUpperCase(),
        maxResults: 1,
        prompt: '',
        partialResults: false,
        popup: false,
      });

      const transcript = (result.matches?.[0] ?? '').trim();
      if (!transcript) {
        setVoiceError('Could not hear you. Try again?');
        setVoiceState('idle');
        return;
      }
      void classifyTranscript(transcript);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logError('useVoiceInput.native', err);
      setVoiceError(msg.includes('denied') ? 'Microphone permission denied.' : 'Could not hear you. Try again?');
      setVoiceState('idle');
    }
  }, [voiceState, locale, classifyTranscript]);

  // ── Web (browser) speech recognition fallback ──────────────────────────
  const handleVoiceTapWeb = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      setVoiceError('Voice input not supported on this browser.');
      return;
    }

    if (voiceState === 'listening') {
      recognitionRef.current?.stop();
      return;
    }

    if (voiceState === 'classifying') return;

    setVoiceError(null);
    setClassifyConfidence(null);
    const rec = new SpeechRecognitionAPI();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = locale + '-' + locale.toUpperCase(); // e.g. en-EN (browser normalises)

    rec.onstart = () => setVoiceState('listening');

    rec.onresult = (e: { results: { [index: number]: { transcript: string }[] } & { length: number } }) => {
      const transcript = Array.from({ length: e.results.length }, (_, i) => e.results[i])
        .map((r: { transcript: string }[]) => r[0].transcript)
        .join(' ');
      void classifyTranscript(transcript);
    };

    rec.onerror = (e: { error: string }) => {
      if (e.error !== 'aborted') {
        setVoiceError(e.error === 'not-allowed'
          ? 'Microphone permission denied.'
          : 'Could not hear you. Try again?'
        );
      }
      setVoiceState('idle');
    };

    rec.onend = () => {
      setVoiceState((prev) => prev === 'listening' ? 'idle' : prev);
    };

    recognitionRef.current = rec;
    rec.start();
  }, [voiceState, locale, classifyTranscript]);

  const handleVoiceTap = useCallback(() => {
    if (IS_NATIVE) {
      void handleVoiceTapNative();
    } else {
      handleVoiceTapWeb();
    }
  }, [handleVoiceTapNative, handleVoiceTapWeb]);

  const reset = useCallback(() => {
    if (IS_NATIVE) {
      void SpeechRecognition.stop().catch(() => { /* ignore */ });
    } else {
      recognitionRef.current?.abort();
    }
    setVoiceState('idle');
    setVoiceError(null);
    setClassifyConfidence(null);
  }, []);

  return {
    voiceState,
    voiceError,
    classifyConfidence,
    voiceSupported,
    handleVoiceTap,
    reset,
  };
}
