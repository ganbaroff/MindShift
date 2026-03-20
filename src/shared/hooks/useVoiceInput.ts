import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/shared/lib/supabase';
import { logError } from '@/shared/lib/logger';

// SpeechRecognition browser compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionInstance = any;
const SpeechRecognitionAPI: (new () => SpeechRecognitionInstance) | null =
  (typeof window !== 'undefined' &&
    ((window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ??
     (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition)) || null;

export type VoiceState = 'idle' | 'listening' | 'classifying';

interface VoiceResult {
  title: string;
  difficulty?: 1 | 2 | 3;
  minutes?: number;
  dueDate?: string;
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

  const voiceSupported = !!SpeechRecognitionAPI;

  const classifyTranscript = useCallback(async (transcript: string) => {
    if (!transcript.trim()) { setVoiceState('idle'); return; }

    setVoiceState('classifying');
    try {
      const { data } = await supabase.functions.invoke('classify-voice-input', {
        body: { text: transcript.trim(), language: locale },
      });

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

        result.confidence = typeof data.confidence === 'number' ? data.confidence : undefined;
        setClassifyConfidence(result.confidence ?? null);
        onResultRef.current(result);
      }
    } catch (err) {
      logError('useVoiceInput.classifyTranscript', err);
      // Fallback: use raw transcript as title
      onResultRef.current({ title: transcript.trim().slice(0, 80) });
    } finally {
      setVoiceState('idle');
    }
  }, [locale]);

  const handleVoiceTap = useCallback(() => {
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

  const reset = useCallback(() => {
    recognitionRef.current?.abort();
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
