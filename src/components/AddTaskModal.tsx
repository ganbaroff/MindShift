import { motion, AnimatePresence } from 'motion/react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Mic, MicOff, Loader2 } from 'lucide-react';
import { useStore } from '@/store';
import { DIFFICULTY_MAP } from '@/types';
import type { Task } from '@/types';
import { getNowPoolMax } from '@/shared/lib/constants';
import { reminders } from '@/shared/lib/reminders';
import { supabase } from '@/shared/lib/supabase';
import { logError } from '@/shared/lib/logger';
import { todayISO, tomorrowISO } from '@/shared/lib/dateUtils';
import { useMotion } from '@/shared/hooks/useMotion';

const durationOptions = [5, 15, 25, 45, 60];

// Smart duration defaults — Research: difficulty predicts time needed
// Easy tasks are often underestimated; hard tasks overestimated. These are
// conservative midpoints that match ADHD task-time perception research.
const SMART_DURATION: Record<1 | 2 | 3, number> = { 1: 15, 2: 25, 3: 45 };

// SpeechRecognition browser compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionInstance = any
const SpeechRecognitionAPI: (new () => SpeechRecognitionInstance) | null =
  (typeof window !== 'undefined' &&
    ((window as unknown as { SpeechRecognition?: new () => SpeechRecognitionInstance }).SpeechRecognition ??
     (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionInstance }).webkitSpeechRecognition)) || null

type VoiceState = 'idle' | 'listening' | 'classifying'

interface AddTaskModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AddTaskModal({ open, onClose }: AddTaskModalProps) {
  const { shouldAnimate } = useMotion();
  const { addTask, nowPool, nextPool, appMode, seasonalMode, locale } = useStore();
  const maxNow = getNowPoolMax(appMode, seasonalMode);
  const today = todayISO();
  const tomorrow = tomorrowISO();
  const nowCount = nowPool.filter(t => t.status === 'active').length;
  const nextCount = nextPool.filter(t => t.status === 'active').length;
  const isFull = nowCount >= maxNow;
  // Two-Thirds guardrail (B-9): NEXT pool >= 4 of 6 = filling up
  const nextNearFull = isFull && nextCount >= 4;

  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [difficulty, setDifficulty] = useState<1 | 2 | 3>(1);
  const [minutes, setMinutes] = useState(SMART_DURATION[1]);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [repeat, setRepeat] = useState<'none' | 'daily' | 'weekly'>('none');
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [classifyConfidence, setClassifyConfidence] = useState<number | null>(null)

  // Track whether the user manually picked a duration (prevents smart override)
  const minutesManuallySet = useRef(false);

  // Smart duration: auto-update when difficulty changes unless user picked manually
  useEffect(() => {
    if (!minutesManuallySet.current) {
      setMinutes(SMART_DURATION[difficulty]);
    }
  }, [difficulty]);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Reset form when modal closes/opens
  useEffect(() => {
    if (!open) {
      setTitle('');
      setNote('');
      setShowNote(false);
      setDifficulty(1);
      setMinutes(SMART_DURATION[1]);
      setDueDate(null);
      setRepeat('none');
      setVoiceState('idle');
      setVoiceError(null);
      setClassifyConfidence(null);
      minutesManuallySet.current = false;
      recognitionRef.current?.abort();
    }
  }, [open]);

  const handleClose = () => {
    recognitionRef.current?.abort();
    onClose();
  };

  // ── Voice classification ──────────────────────────────────────────────────
  const classifyTranscript = useCallback(async (transcript: string) => {
    if (!transcript.trim()) { setVoiceState('idle'); return; }

    setVoiceState('classifying');
    try {
      const { data } = await supabase.functions.invoke('classify-voice-input', {
        body: { text: transcript.trim(), language: locale },
      });

      if (data?.title) {
        setTitle(data.title as string);
        if (data.difficulty && [1, 2, 3].includes(Number(data.difficulty))) {
          const d = Number(data.difficulty) as 1 | 2 | 3;
          setDifficulty(d);
          // Smart duration: use AI estimated minutes if provided, else SMART_DURATION
          const aiMinutes = Number(data.estimatedMinutes);
          if (aiMinutes > 0 && durationOptions.includes(aiMinutes)) {
            setMinutes(aiMinutes);
            minutesManuallySet.current = true;
          } else {
            setMinutes(SMART_DURATION[d]);
          }
        }
        if (data.dueDate && typeof data.dueDate === 'string') {
          setDueDate(data.dueDate);
        }
        setClassifyConfidence(typeof data.confidence === 'number' ? data.confidence : null);
      }
    } catch (err) {
      logError('AddTaskModal.classifyVoice', err);
      // Fallback: use raw transcript as title
      setTitle(transcript.trim().slice(0, 80));
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

  const handleSubmit = () => {
    if (!title.trim()) return;
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      pool: isFull ? 'next' : 'now',
      status: 'active',
      difficulty,
      estimatedMinutes: minutes,
      createdAt: new Date().toISOString(),
      completedAt: null,
      snoozeCount: 0,
      parentTaskId: null,
      position: 0,
      dueDate: dueDate,
      dueTime: null,
      taskType: 'task',
      reminderSentAt: null,
      repeat,
      note: note.trim() || undefined,
    };
    addTask(newTask);
    // Auto-schedule reminder 15 min before due date if permission granted
    if (newTask.dueDate && 'Notification' in window && Notification.permission === 'granted') {
      reminders.schedule(newTask, 15);
    }
    onClose();
  };

  const voiceSupported = !!SpeechRecognitionAPI;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={shouldAnimate ? { opacity: 0 } : {}}
            animate={{ opacity: 1 }}
            exit={shouldAnimate ? { opacity: 0 } : undefined}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={handleClose}
          />
          <motion.div
            initial={shouldAnimate ? { y: '100%' } : {}}
            animate={{ y: 0 }}
            exit={shouldAnimate ? { y: '100%' } : undefined}
            transition={shouldAnimate ? { type: 'spring', damping: 28, stiffness: 300 } : { duration: 0 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-ms-card rounded-t-3xl p-5 safe-bottom max-h-[85vh] overflow-y-auto"
          >
            <div className="w-10 h-1 rounded-full bg-ms-muted/30 mx-auto mb-4" />
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-title text-ms-text">Add a task</h2>
              <button onClick={handleClose} aria-label="Close modal" className="p-2 text-ms-muted">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              {/* Title + mic button */}
              <div className="relative">
                <input
                  value={title}
                  onChange={e => { setTitle(e.target.value); setClassifyConfidence(null); }}
                  placeholder={voiceState === 'listening' ? 'Listening...' : "What's on your mind?"}
                  className="w-full bg-ms-raised rounded-xl px-4 h-12 text-body text-ms-text placeholder:text-ms-muted border border-transparent focus:border-ms-primary outline-none transition-colors pr-12"
                  style={{
                    borderColor: voiceState === 'listening' ? '#7B72FF' : undefined,
                  }}
                />

                {/* Voice mic button */}
                {voiceSupported && (
                  <button
                    type="button"
                    onClick={handleVoiceTap}
                    disabled={voiceState === 'classifying'}
                    aria-label={voiceState === 'listening' ? 'Stop recording' : 'Start voice input'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
                    style={{
                      background: voiceState === 'listening'
                        ? 'rgba(123,114,255,0.25)'
                        : 'rgba(255,255,255,0.04)',
                      color: voiceState === 'listening' ? '#7B72FF'
                        : voiceState === 'classifying' ? '#4ECDC4'
                        : '#8B8BA7',
                    }}
                  >
                    {voiceState === 'classifying'
                      ? <Loader2 size={15} className="animate-spin motion-reduce:animate-none" />
                      : voiceState === 'listening'
                        ? <MicOff size={15} />
                        : <Mic size={15} />
                    }
                  </button>
                )}
              </div>

              {/* Voice feedback */}
              <AnimatePresence>
                {voiceState === 'listening' && (
                  <motion.p
                    initial={shouldAnimate ? { opacity: 0, y: -4 } : {}}
                    animate={{ opacity: 1, y: 0 }}
                    exit={shouldAnimate ? { opacity: 0 } : undefined}
                    className="text-xs flex items-center gap-1.5 -mt-3"
                    style={{ color: '#7B72FF' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse motion-reduce:opacity-80" />
                    Listening — say your task...
                  </motion.p>
                )}
                {classifyConfidence !== null && classifyConfidence >= 0.7 && (
                  <motion.p
                    initial={shouldAnimate ? { opacity: 0, y: -4 } : {}}
                    animate={{ opacity: 1, y: 0 }}
                    exit={shouldAnimate ? { opacity: 0 } : undefined}
                    className="text-xs -mt-3"
                    style={{ color: '#4ECDC4' }}
                  >
                    ✓ AI filled in the details — adjust if needed
                  </motion.p>
                )}
                {voiceError && (
                  <motion.p
                    initial={shouldAnimate ? { opacity: 0, y: -4 } : {}}
                    animate={{ opacity: 1, y: 0 }}
                    exit={shouldAnimate ? { opacity: 0 } : undefined}
                    className="text-xs -mt-3"
                    style={{ color: '#F59E0B' }}
                  >
                    ⚠ {voiceError}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Optional note / context */}
              <div>
                {!showNote ? (
                  <button
                    type="button"
                    onClick={() => setShowNote(true)}
                    className="text-xs flex items-center gap-1 -mt-1"
                    style={{ color: '#5A5B72' }}
                    aria-expanded={false}
                  >
                    <span>+</span> Add context (optional)
                  </button>
                ) : (
                  <AnimatePresence>
                    <motion.textarea
                      initial={shouldAnimate ? { opacity: 0, height: 0 } : {}}
                      animate={{ opacity: 1, height: 'auto' }}
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="Any extra detail, links, or context…"
                      rows={2}
                      className="w-full bg-ms-raised rounded-xl px-4 py-3 text-body text-ms-text placeholder:text-ms-muted border border-transparent focus:border-ms-primary outline-none transition-colors resize-none text-[13px]"
                    />
                  </AnimatePresence>
                )}
              </div>

              {/* Difficulty */}
              <div>
                <label className="text-caption text-ms-muted uppercase tracking-widest mb-2 block">Difficulty</label>
                <div className="flex gap-2">
                  {([1, 2, 3] as const).map(d => {
                    const c = DIFFICULTY_MAP[d];
                    const sel = difficulty === d;
                    return (
                      <motion.button
                        key={d}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => { setDifficulty(d); }}
                        aria-pressed={sel}
                        aria-label={`Difficulty: ${c.label}`}
                        className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2 text-secondary font-medium transition-all"
                        style={{
                          backgroundColor: sel ? `${c.color}20` : '#252840',
                          borderWidth: sel ? 1.5 : 1,
                          borderColor: sel ? c.color : 'rgba(255,255,255,0.06)',
                          color: sel ? c.color : '#8B8BA7',
                        }}
                      >
                        <div className="flex gap-0.5">
                          {Array.from({ length: d }).map((_, i) => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sel ? c.color : '#8B8BA7' }} />
                          ))}
                        </div>
                        {c.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Time */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-caption text-ms-muted uppercase tracking-widest">Time</label>
                  {!minutesManuallySet.current && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(123,114,255,0.12)', color: '#7B72FF' }}>
                      ✨ smart
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {durationOptions.map(d => {
                    const sel = minutes === d;
                    return (
                      <motion.button
                        key={d}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => { setMinutes(d); minutesManuallySet.current = true; }}
                        aria-pressed={sel}
                        aria-label={`${d} minutes`}
                        className="flex-1 h-10 rounded-full text-secondary font-medium transition-all"
                        style={{
                          background: sel ? 'linear-gradient(135deg, #7B72FF, #8B7FF7)' : '#252840',
                          color: sel ? '#fff' : '#8B8BA7',
                          borderWidth: sel ? 0 : 1,
                          borderColor: 'rgba(255,255,255,0.06)',
                        }}
                      >
                        {d}m
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Due date */}
              <div>
                <label className="text-caption text-ms-muted uppercase tracking-widest mb-2 block">Due date <span style={{ color: '#4ECDC4' }}>(optional)</span></label>
                <div className="flex gap-2 mb-2">
                  {[
                    { label: 'Today', value: today },
                    { label: 'Tomorrow', value: tomorrow },
                  ].map(({ label, value }) => {
                    const sel = dueDate === value;
                    return (
                      <motion.button
                        key={value}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setDueDate(sel ? null : value)}
                        aria-pressed={sel}
                        aria-label={`Due date: ${label}`}
                        className="flex-1 h-9 rounded-xl text-secondary font-medium transition-all"
                        style={{
                          backgroundColor: sel ? 'rgba(78,205,196,0.15)' : '#252840',
                          borderWidth: sel ? 1.5 : 1,
                          borderStyle: 'solid',
                          borderColor: sel ? '#4ECDC4' : 'rgba(255,255,255,0.06)',
                          color: sel ? '#4ECDC4' : '#8B8BA7',
                        }}
                      >
                        {label}
                      </motion.button>
                    );
                  })}
                  <input
                    type="date"
                    value={dueDate ?? ''}
                    min={today}
                    onChange={e => setDueDate(e.target.value || null)}
                    className="flex-1 h-9 rounded-xl px-2 text-secondary outline-none transition-all"
                    style={{
                      backgroundColor: (dueDate && dueDate !== today && dueDate !== tomorrow) ? 'rgba(123,114,255,0.15)' : '#252840',
                      border: `${(dueDate && dueDate !== today && dueDate !== tomorrow) ? 1.5 : 1}px solid ${(dueDate && dueDate !== today && dueDate !== tomorrow) ? '#7B72FF' : 'rgba(255,255,255,0.06)'}`,
                      color: (dueDate && dueDate !== today && dueDate !== tomorrow) ? '#7B72FF' : '#8B8BA7',
                      colorScheme: 'dark',
                    }}
                  />
                </div>
                {dueDate && (
                  <motion.p
                    initial={shouldAnimate ? { opacity: 0, y: -4 } : {}}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs"
                    style={{ color: '#4ECDC4' }}
                  >
                    📅 Will appear in Upcoming tab
                  </motion.p>
                )}
              </div>

              {/* Repeat — auto-recreate on completion */}
              <div>
                <p className="text-[12px] mb-1.5" style={{ color: '#8B8BA7' }}>Repeat</p>
                <div className="flex gap-2">
                  {(['none', 'daily', 'weekly'] as const).map(r => (
                    <motion.button
                      key={r}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setRepeat(r)}
                      aria-pressed={repeat === r}
                      aria-label={`Repeat: ${r === 'none' ? 'once' : r}`}
                      className="flex-1 h-8 rounded-full text-[12px] font-medium capitalize"
                      style={{
                        backgroundColor: repeat === r ? 'rgba(123,114,255,0.15)' : '#252840',
                        border: `${repeat === r ? 1.5 : 1}px solid ${repeat === r ? '#7B72FF' : 'rgba(255,255,255,0.06)'}`,
                        color: repeat === r ? '#7B72FF' : '#8B8BA7',
                      }}
                    >
                      {r === 'none' ? 'Once' : r}
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="text-secondary text-ms-muted">
                {isFull ? '💙 NOW is full — landing in NEXT' : '→ Adding to NOW'}
              </div>
              {/* Two-Thirds guardrail (B-9) — gentle nudge, never blocking */}
              {nextNearFull && (
                <p className="text-xs -mt-2" style={{ color: '#F59E0B' }}>
                  🌿 Your queue is getting full — maybe park one before adding?
                </p>
              )}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSubmit}
                disabled={!title.trim()}
                aria-label={isFull ? 'Add task to Next pool' : 'Add task to Now pool'}
                className="w-full h-[52px] rounded-xl gradient-primary text-primary-foreground font-semibold text-body shadow-primary disabled:opacity-40"
              >
                {isFull ? 'Add to Next →' : 'Add to Now →'}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
