import { motion, AnimatePresence } from 'motion/react';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { X, Mic, MicOff, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store';
import { TASK_TYPE_CONFIG } from '@/types';
import type { Task, TaskType, TaskCategory } from '@/types';
import { getNowPoolMax } from '@/shared/lib/constants';
import { reminders } from '@/shared/lib/reminders';
import { todayISO, tomorrowISO } from '@/shared/lib/dateUtils';
import { detectCrisis, getCrisisResources } from '@/shared/lib/crisisDetection';
import { useMotion } from '@/shared/hooks/useMotion';
import { useVoiceInput } from '@/shared/hooks/useVoiceInput';
import { syncTaskUpsert } from '@/shared/hooks/useTaskSync';
import {
  FIELD_VISIBILITY, getPoolForType, durationOptions,
  DifficultyPicker, DurationPicker, CategoryPicker,
  RepeatPicker, DueDatePicker, DueTimePicker,
} from '@/components/addTaskFields';

// Smart duration defaults — difficulty predicts time needed (ADHD task-time perception)
const SMART_DURATION: Record<1 | 2 | 3, number> = { 1: 15, 2: 25, 3: 45 };

interface AddTaskModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AddTaskModal({ open, onClose }: AddTaskModalProps) {
  const { shouldAnimate } = useMotion();
  const { t } = useTranslation();
  const { addTask, nowPool, nextPool, appMode, seasonalMode, locale, userId } = useStore();
  const maxNow = getNowPoolMax(appMode, seasonalMode);
  const today = todayISO();
  const tomorrow = tomorrowISO();
  const nowCount = nowPool.filter(t => t.status === 'active').length;
  const nextCount = nextPool.filter(t => t.status === 'active').length;
  const isFull = nowCount >= maxNow;
  const nextNearFull = isFull && nextCount >= 4;

  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | undefined>(2);
  const [minutes, setMinutes] = useState<number | undefined>(SMART_DURATION[2]);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [dueTime, setDueTime] = useState<string | null>(null);
  const [repeat, setRepeat] = useState<'none' | 'daily' | 'weekly'>('none');
  const [taskType, setTaskType] = useState<TaskType>('task');
  const [category, setCategory] = useState<TaskCategory | undefined>(undefined);
  const [showCategory, setShowCategory] = useState(false);
  const minutesManuallySet = useRef(false);

  const fields = useMemo(() => FIELD_VISIBILITY[taskType], [taskType]);

  // Smart duration: auto-update when difficulty changes (task type only)
  useEffect(() => {
    if (!minutesManuallySet.current && difficulty && fields.duration) {
      setMinutes(SMART_DURATION[difficulty]);
    }
  }, [difficulty, fields.duration]);

  // Reset irrelevant fields when task type changes
  const handleTypeChange = useCallback((newType: TaskType) => {
    const prev = taskType;
    if (newType === prev) return;
    setTaskType(newType);
    const nf = FIELD_VISIBILITY[newType];
    const pf = FIELD_VISIBILITY[prev];
    if (!nf.difficulty) setDifficulty(undefined);
    else if (!pf.difficulty || difficulty === undefined) { setDifficulty(2); }
    if (!nf.duration) { setMinutes(undefined); minutesManuallySet.current = false; }
    else if (!pf.duration || minutes === undefined) { setMinutes(SMART_DURATION[2]); minutesManuallySet.current = false; }
    if (!nf.dueDate) { setDueDate(null); setDueTime(null); }
    if (!nf.dueTime) setDueTime(null);
    if (!nf.repeat) setRepeat('none');
    if (!nf.category) { setCategory(undefined); setShowCategory(false); }
  }, [taskType, difficulty, minutes]);

  const handleVoiceResult = useCallback((result: { title: string; difficulty?: 1 | 2 | 3; minutes?: number; dueDate?: string; dueTime?: string; taskType?: TaskType; category?: TaskCategory }) => {
    // Apply task type first so field visibility updates for subsequent assignments
    if (result.taskType) {
      handleTypeChange(result.taskType);
    }

    setTitle(result.title);

    const effectiveType = result.taskType ?? taskType;
    const effectiveFields = FIELD_VISIBILITY[effectiveType];

    // Only apply difficulty/duration when the type supports them
    if (effectiveFields.difficulty && result.difficulty) {
      setDifficulty(result.difficulty);
      if (effectiveFields.duration && result.minutes && result.minutes > 0 && durationOptions.includes(result.minutes)) {
        setMinutes(result.minutes);
        minutesManuallySet.current = true;
      } else if (effectiveFields.duration) {
        setMinutes(SMART_DURATION[result.difficulty]);
      }
    }

    if (result.dueDate && effectiveFields.dueDate) setDueDate(result.dueDate);
    if (result.dueTime && effectiveFields.dueTime) setDueTime(result.dueTime);
    if (result.category && effectiveFields.category) setCategory(result.category);
  }, [taskType, handleTypeChange]);

  const { voiceState, voiceError, classifyConfidence, voiceSupported, handleVoiceTap, reset: resetVoice } =
    useVoiceInput({ locale, onResult: handleVoiceResult });

  useEffect(() => {
    if (!open) {
      setTitle(''); setNote(''); setShowNote(false);
      setDifficulty(2); setMinutes(SMART_DURATION[2]);
      setDueDate(null); setDueTime(null); setRepeat('none');
      setTaskType('task'); setCategory(undefined); setShowCategory(false);
      minutesManuallySet.current = false;
      resetVoice();
    }
  }, [open, resetVoice]);

  const handleClose = () => { resetVoice(); onClose(); };

  const pool = getPoolForType(taskType, isFull);
  const dueDateMissing = fields.dueDateRequired && !dueDate;
  const dueTimeMissing = fields.dueTimeRequired && !dueTime;
  const canSubmit = title.trim() && !dueDateMissing && !dueTimeMissing;

  // Crisis detection — show resources if user types concerning content
  const showCrisisCard = useMemo(() => detectCrisis(title), [title]);
  const crisisResources = useMemo(() => getCrisisResources(locale), [locale]);

  const handleSubmit = () => {
    if (!canSubmit) return;
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      pool,
      status: 'active',
      difficulty: difficulty ?? 2,
      estimatedMinutes: minutes ?? 25,
      createdAt: new Date().toISOString(),
      completedAt: null,
      snoozeCount: 0,
      parentTaskId: null,
      position: 0,
      dueDate, dueTime, taskType,
      reminderSentAt: null, repeat,
      note: note.trim() || undefined,
      category,
    };
    addTask(newTask);
    // Sync to Supabase for logged-in users (fire-and-forget)
    if (userId && !userId.startsWith('guest_')) {
      syncTaskUpsert(newTask, userId);
    }
    if (newTask.dueDate && 'Notification' in window && Notification.permission === 'granted') {
      reminders.schedule(newTask, 15);
      toast('Reminder set', { description: '15 min before due date', duration: 2500, icon: '🔔' });
    }
    onClose();
  };

  const poolLabel = pool === 'now' ? 'NOW' : pool === 'next' ? 'NEXT' : 'SOMEDAY';
  const poolIcon = pool === 'someday' ? '💡' : pool === 'next' ? '💙' : '→';

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
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-task-title"
            initial={shouldAnimate ? { y: '100%' } : {}}
            animate={{ y: 0 }}
            exit={shouldAnimate ? { y: '100%' } : undefined}
            transition={shouldAnimate ? { type: 'spring', damping: 28, stiffness: 300 } : { duration: 0 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-ms-card rounded-t-3xl p-5 safe-bottom max-h-[85vh] overflow-y-auto"
          >
            <div className="w-10 h-1 rounded-full bg-ms-muted/30 mx-auto mb-4" />
            <div className="flex items-center justify-between mb-6">
              <h2 id="add-task-title" className="text-title text-ms-text">{t('addTask.title')}</h2>
              <button onClick={handleClose} aria-label="Close modal" className="p-3 text-ms-muted focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded-xl">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5">
              {/* Title + mic */}
              <div className="relative">
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={voiceState === 'listening' ? t('addTask.placeholderListening') : t('addTask.placeholder')}
                  className="w-full bg-ms-raised rounded-xl px-4 h-12 text-body text-ms-text placeholder:text-ms-muted border border-transparent focus:border-ms-primary outline-none transition-colors pr-12"
                  style={{ borderColor: voiceState === 'listening' ? 'var(--color-primary)' : undefined }}
                />
                {voiceSupported && (
                  <button
                    type="button"
                    onClick={handleVoiceTap}
                    disabled={voiceState === 'classifying'}
                    aria-label={voiceState === 'listening' ? 'Stop recording' : 'Start voice input'}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 rounded-lg flex items-center justify-center transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                    style={{
                      background: voiceState === 'listening' ? 'rgba(123,114,255,0.25)' : 'rgba(255,255,255,0.04)',
                      color: voiceState === 'listening' ? 'var(--color-primary)' : voiceState === 'classifying' ? 'var(--color-teal)' : 'var(--color-text-muted)',
                    }}
                  >
                    {voiceState === 'classifying'
                      ? <Loader2 size={15} className="animate-spin motion-reduce:animate-none" />
                      : voiceState === 'listening' ? <MicOff size={15} /> : <Mic size={15} />}
                  </button>
                )}
              </div>

              {/* Voice feedback */}
              <AnimatePresence>
                {voiceState === 'listening' && (
                  <motion.p initial={shouldAnimate ? { opacity: 0, y: -4 } : {}} animate={{ opacity: 1, y: 0 }}
                    exit={shouldAnimate ? { opacity: 0 } : undefined} className="text-xs flex items-center gap-1.5 -mt-3" style={{ color: 'var(--color-primary)' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse motion-reduce:animate-none" />
                    {t('addTask.listening')}
                  </motion.p>
                )}
                {classifyConfidence !== null && classifyConfidence >= 0.7 && (
                  <motion.p initial={shouldAnimate ? { opacity: 0, y: -4 } : {}} animate={{ opacity: 1, y: 0 }}
                    exit={shouldAnimate ? { opacity: 0 } : undefined} className="text-xs -mt-3" style={{ color: 'var(--color-teal)' }}>
                    ✓ {t('addTask.aiFilled')}
                  </motion.p>
                )}
                {voiceError && (
                  <motion.p initial={shouldAnimate ? { opacity: 0, y: -4 } : {}} animate={{ opacity: 1, y: 0 }}
                    exit={shouldAnimate ? { opacity: 0 } : undefined} className="text-xs -mt-3" style={{ color: 'var(--color-gold)' }}>
                    ⚠ {voiceError}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Task type picker */}
              <div>
                <label className="text-caption text-ms-muted uppercase tracking-widest mb-2 block">{t('addTask.typeLabel')}</label>
                <div className="flex gap-2">
                  {(['task', 'idea', 'reminder', 'meeting'] as const).map(t => {
                    const cfg = TASK_TYPE_CONFIG[t];
                    const sel = taskType === t;
                    return (
                      <motion.button key={t} whileTap={{ scale: 0.97 }} onClick={() => handleTypeChange(t)}
                        aria-pressed={sel} aria-label={`Type: ${cfg.label}`}
                        className="flex-1 h-10 rounded-xl flex items-center justify-center gap-1.5 text-[12px] font-medium transition-all"
                        style={{
                          backgroundColor: sel ? `${cfg.color}20` : 'var(--color-surface-raised)',
                          borderWidth: sel ? 1.5 : 1, borderStyle: 'solid',
                          borderColor: sel ? cfg.color : 'rgba(255,255,255,0.06)',
                          color: sel ? cfg.color : 'var(--color-text-muted)',
                        }}
                      >
                        <span>{cfg.emoji}</span>
                        {cfg.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Category */}
              {fields.category && (
                <CategoryPicker
                  category={category} showCategory={showCategory}
                  onToggle={() => setShowCategory(true)}
                  onSelect={setCategory} shouldAnimate={shouldAnimate}
                />
              )}

              {/* "When is this?" hint for meeting/reminder */}
              {(taskType === 'meeting' || taskType === 'reminder') && !dueDate && (
                <motion.p initial={shouldAnimate ? { opacity: 0, y: -4 } : {}} animate={{ opacity: 1, y: 0 }}
                  className="text-xs -mt-2" style={{ color: 'var(--color-teal)' }}>
                  {taskType === 'meeting' ? '🤝' : '🔔'} {taskType === 'meeting' ? t('addTask.whenMeeting') : t('addTask.whenReminder')}
                </motion.p>
              )}

              {/* Note */}
              <div>
                {!showNote ? (
                  <button type="button" onClick={() => setShowNote(true)}
                    className="text-xs flex items-center gap-1 -mt-1 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] rounded" style={{ color: 'var(--color-text-muted)' }} aria-expanded={showNote}>
                    {t('addTask.addContext')}
                  </button>
                ) : (
                  <AnimatePresence>
                    <motion.textarea
                      initial={shouldAnimate ? { opacity: 0, height: 0 } : {}} animate={{ opacity: 1, height: 'auto' }}
                      value={note} onChange={e => setNote(e.target.value)}
                      placeholder={t('addTask.notePlaceholder')} rows={2}
                      className="w-full bg-ms-raised rounded-xl px-4 py-3 text-body text-ms-text placeholder:text-ms-muted border border-transparent focus:border-ms-primary outline-none transition-colors resize-none text-[13px]"
                    />
                  </AnimatePresence>
                )}
              </div>

              {fields.difficulty && <DifficultyPicker difficulty={difficulty} onSelect={setDifficulty} />}

              {fields.duration && (
                <DurationPicker
                  minutes={minutes}
                  onSelect={m => { setMinutes(m); minutesManuallySet.current = true; }}
                  isSmartMode={!minutesManuallySet.current}
                />
              )}

              {fields.dueDate && (
                <DueDatePicker
                  dueDate={dueDate} required={fields.dueDateRequired}
                  today={today} tomorrow={tomorrow}
                  shouldAnimate={shouldAnimate} onSelect={setDueDate}
                />
              )}

              {fields.dueTime && (
                <DueTimePicker dueTime={dueTime} required={fields.dueTimeRequired} onSelect={setDueTime} />
              )}

              {fields.repeat && <RepeatPicker repeat={repeat} onSelect={setRepeat} />}

              <div className="text-secondary text-ms-muted">
                {taskType === 'task' && isFull
                  ? `💙 ${t('addTask.nowFullNext')}`
                  : `${poolIcon} ${t('addTask.addingTo', { pool: poolLabel })}`}
              </div>
              {pool === 'next' && nextNearFull && (
                <p className="text-xs -mt-2" style={{ color: 'var(--color-gold)' }}>
                  🌿 {t('addTask.queueFull')}
                </p>
              )}

              {/* Crisis resource card — warm, non-blocking */}
              <AnimatePresence>
                {showCrisisCard && (
                  <motion.div
                    initial={shouldAnimate ? { opacity: 0, y: 8 } : {}}
                    animate={{ opacity: 1, y: 0 }}
                    exit={shouldAnimate ? { opacity: 0, y: 8 } : undefined}
                    className="rounded-xl p-4 space-y-2"
                    style={{
                      backgroundColor: 'rgba(78,205,196,0.08)',
                      border: '1px solid rgba(78,205,196,0.25)',
                    }}
                  >
                    <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
                      {t('addTask.crisisMessage')}
                    </p>
                    <p className="text-[12px] font-medium" style={{ color: 'var(--color-teal)' }}>
                      {crisisResources.primary}
                    </p>
                    <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                      {crisisResources.international}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={!canSubmit}
                aria-label={`Add ${TASK_TYPE_CONFIG[taskType].label.toLowerCase()} to ${poolLabel} pool`}
                className="w-full h-[52px] rounded-xl gradient-primary text-primary-foreground font-semibold text-body shadow-primary disabled:opacity-40"
              >
                {t('addTask.addToPool', { pool: poolLabel })}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
