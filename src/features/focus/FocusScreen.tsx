/**
 * FocusScreen — thin orchestrator (Block 2d refactor)
 *
 * Responsibilities:
 *   - Route between screen states from useFocusSession FSM
 *   - Render setup, session, interrupt-confirm, bookmark-capture, hard-stop screens
 *   - Delegate nature-buffer + recovery-lock to PostSessionFlow
 *   - Delegate active-session controls to SessionControls
 *   - Delegate setup UI to FocusSetup
 *
 * All timer/session logic lives in useFocusSession.ts
 * Post-session screens live in PostSessionFlow.tsx
 * Session controls (audio/stop/park) live in SessionControls.tsx
 * Setup/pre-session UI lives in FocusSetup.tsx
 */

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { ArcTimer } from './ArcTimer'
import { MochiSessionCompanion } from './MochiSessionCompanion'
import { SessionControls } from './SessionControls'
import { NatureBuffer, RecoveryLock } from './PostSessionFlow'
import { FocusSetup } from './FocusSetup'
import { useFocusSession, PHASE_LABELS } from './useFocusSession'
import { useFocusRoom, ROOM_ENCOURAGEMENTS } from '@/shared/hooks/useFocusRoom'
import { nativeStatusBarHide, nativeStatusBarShow } from '@/shared/lib/native'
import { supabase } from '@/shared/lib/supabase'
import { useSessionHistory } from '@/shared/hooks/useSessionHistory'
import { useUserBehavior } from '@/shared/hooks/useUserBehavior'
import { useStore } from '@/store'

// ── Ambient Orbit (S-2) ───────────────────────────────────────────────────────
// Shows how many people are currently in a focus session — body-doubling signal.
// Queries focus_sessions started in the last 30 min as a proxy for active sessions.
function useAmbientOrbit(active: boolean) {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    if (!active) { setCount(null); return }

    let cancelled = false
    const fetch = async () => {
      const since = new Date(Date.now() - 30 * 60_000).toISOString()
      const { count: n } = await supabase
        .from('focus_sessions')
        .select('id', { count: 'exact', head: true })
        .gte('started_at', since)
      if (!cancelled && n !== null) setCount(Math.max(1, n))
    }
    void fetch()
    const id = setInterval(() => void fetch(), 5 * 60_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [active])

  return count
}

export default function FocusScreen() {
  const session = useFocusSession()
  const { t } = useTranslation()
  const { emotionalReactivity } = useStore()
  const orbitCount = useAmbientOrbit(session.screen === 'session')
  const room = useFocusRoom()

  // User behavior profile for AI Mochi — feeds context to mochi-respond edge fn
  const { sessions: historySessions } = useSessionHistory()
  const behaviorProfile = useUserBehavior(historySessions)

  // Broadcast phase changes to room peers
  useEffect(() => {
    if (room.status === 'connected' && session.sessionPhase !== 'idle') {
      room.broadcast(session.sessionPhase)
    }
  }, [session.sessionPhase, room.status, room])

  // Leave room when session ends
  useEffect(() => {
    if (session.screen !== 'session' && session.screen !== 'setup') {
      room.leave()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.screen])

  // Anonymous encouragement — rotate every 5 min during session
  const encouragement = useMemo(() => {
    if (room.status !== 'connected' || room.peers.length === 0) return null
    return ROOM_ENCOURAGEMENTS[Math.floor(Date.now() / 300_000) % ROOM_ENCOURAGEMENTS.length]
  }, [room.status, room.peers.length])

  // Immersive status bar — hide during active session, restore otherwise
  useEffect(() => {
    const inSession = session.screen === 'session'
    if (inSession) { nativeStatusBarHide() }
    else { nativeStatusBarShow() }
    return () => { nativeStatusBarShow() }
  }, [session.screen])

  const {
    screen,
    selectedTask, setSelectedTask,
    selectedDuration, setSelectedDuration,
    customDuration, setCustomDuration,
    showCustom, setShowCustom,
    smartDuration, allTasks, savedBookmark,
    elapsedSeconds, remainingSeconds,
    showDigits, setShowDigits,
    recoverySeconds, bufferSeconds,
    postEnergyLogged,
    bookmarkText, setBookmarkText,
    parkOpen, setParkOpen,
    parkText, setParkText,
    parkedThoughtsCount,
    progress, isFlow, elapsedMin, timerSize, energyLabel,
    timerStyle, sessionPhase,
    handleStart, handleStop, handleResume, handleConfirmStop,
    handleBookmarkSave, handleBookmarkSkip, handleSkipBuffer,
    handleAudioToggle, handleParkThought,
    handleSessionEnd, handleBypassRecovery, handleBypassHardStop,
    handlePostEnergy, handleAutopsyPick,
    isPlaying, audioVolume, handleVolumeChange,
    shouldAnimate, t: motionT,
    TIMER_PRESETS,
    focusAnchor,
  } = session

  // ── Nature Buffer ──────────────────────────────────────────────────────────
  if (screen === 'nature-buffer') {
    return (
      <NatureBuffer
        bufferSeconds={bufferSeconds}
        postEnergyLogged={postEnergyLogged}
        onSetEnergyLevel={handlePostEnergy}
        onSkip={handleSkipBuffer}
        sessionMinutes={elapsedMin}
        emotionalReactivity={emotionalReactivity}
        sessionPhase={sessionPhase}
        parkedThoughtsCount={parkedThoughtsCount}
        onAutopsyPick={handleAutopsyPick}
      />
    )
  }

  // ── Recovery Lock ──────────────────────────────────────────────────────────
  if (screen === 'recovery-lock') {
    return (
      <RecoveryLock
        recoverySeconds={recoverySeconds}
        onBypass={handleBypassRecovery}
      />
    )
  }

  // ── Interrupt Confirm ──────────────────────────────────────────────────────
  if (screen === 'interrupt-confirm') {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen px-6 text-center"
        style={{ background: 'var(--color-bg)' }}
      >
        <div className="text-4xl mb-4">⏸️</div>
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
          {t('focus.leaveSession')}
        </h2>
        <p className="text-sm mb-8 max-w-xs leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          {t('focus.focusedFor', { min: elapsedMin })}
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={handleResume}
            aria-label="Resume focus session"
            className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200"
            style={{
              background: 'var(--color-primary-alpha)',
              border: '1.5px solid var(--color-primary)',
              color: 'var(--color-primary)',
            }}
          >
            {t('focus.keepGoing')}
          </button>
          <button
            onClick={handleConfirmStop}
            aria-label="End focus session"
            className="w-full py-3 rounded-2xl font-medium text-sm transition-all duration-200"
            style={{
              background: 'transparent',
              border: '1px solid var(--color-border-subtle)',
              color: 'var(--color-muted)',
            }}
          >
            {t('focus.endSession')}
          </button>
        </div>
      </div>
    )
  }

  // ── Bookmark Capture ───────────────────────────────────────────────────────
  if (screen === 'bookmark-capture') {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen px-6 text-center"
        style={{ background: 'var(--color-bg)' }}
      >
        <motion.div
          initial={shouldAnimate ? { opacity: 0, scale: 0.95 } : {}}
          animate={{ opacity: 1, scale: 1 }}
          transition={motionT()}
          className="flex flex-col items-center w-full max-w-xs"
        >
          <div className="text-4xl mb-4">📌</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
            {t('focus.parkProgress')}
          </h2>
          <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
            {t('focus.parkProgressDesc')}
          </p>
          <input
            value={bookmarkText}
            onChange={e => setBookmarkText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && bookmarkText.trim()) handleBookmarkSave() }}
            placeholder={t('focus.parkPlaceholder')}
            autoFocus
            className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-4"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text)' }}
          />
          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={handleBookmarkSave}
              disabled={!bookmarkText.trim()}
              className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200"
              style={{
                background: bookmarkText.trim() ? 'var(--color-primary-alpha)' : 'var(--color-card)',
                border: `1.5px solid ${bookmarkText.trim() ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
                color: bookmarkText.trim() ? 'var(--color-primary)' : 'var(--color-muted)',
              }}
            >
              {t('focus.saveAndExit')}
            </button>
            <button
              onClick={handleBookmarkSkip}
              className="w-full py-3 rounded-2xl font-medium text-sm transition-all duration-200"
              style={{
                background: 'transparent',
                border: '1px solid var(--color-border-subtle)',
                color: 'var(--color-muted)',
              }}
            >
              {t('common.skip')}
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // ── Hard-Stop Half-Sheet (120 min) ─────────────────────────────────────────
  if (screen === 'hard-stop') {
    return (
      <div
        className="flex flex-col items-center justify-end min-h-screen px-6 pb-12"
        style={{ background: 'rgba(15,17,23,0.92)' }}
      >
        <motion.div
          initial={shouldAnimate ? { opacity: 0, y: 40 } : {}}
          animate={{ opacity: 1, y: 0 }}
          transition={motionT()}
          className="w-full max-w-xs flex flex-col items-center text-center"
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border-accent)',
            borderRadius: 24,
            padding: '32px 24px',
          }}
        >
          <div className="text-5xl mb-4">🧘</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
            {t('focus.twoHours')}
          </h2>
          <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--color-muted)' }}>
            {t('focus.twoHoursDesc')}
          </p>

          <button
            onClick={() => handleSessionEnd(true)}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm mb-3 transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #7B72FF, #8B7FF7)',
              color: 'white',
              boxShadow: '0 8px 24px rgba(123,114,255,0.28)',
            }}
          >
            {t('focus.endAndRest')}
          </button>

          <button
            onClick={handleBypassHardStop}
            className="text-xs px-5 py-2.5 rounded-xl transition-all duration-200"
            style={{
              background: 'transparent',
              border: '1px solid var(--color-border-subtle)',
              color: 'var(--color-muted)',
            }}
          >
            {t('focus.letMeKeepGoing')}
          </button>
        </motion.div>
      </div>
    )
  }

  // ── Setup Screen ───────────────────────────────────────────────────────────
  if (screen === 'setup') {
    return (
      <FocusSetup
        selectedTask={selectedTask}
        setSelectedTask={setSelectedTask}
        selectedDuration={selectedDuration}
        setSelectedDuration={setSelectedDuration}
        customDuration={customDuration}
        setCustomDuration={setCustomDuration}
        showCustom={showCustom}
        setShowCustom={setShowCustom}
        smartDuration={smartDuration}
        allTasks={allTasks}
        savedBookmark={savedBookmark}
        timerStyle={timerStyle}
        energyLabel={energyLabel}
        focusAnchor={focusAnchor}
        TIMER_PRESETS={TIMER_PRESETS}
        handleStart={handleStart}
        room={room}
      />
    )
  }

  // ── Active Session Screen ──────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen px-6"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Phase label — hidden in flow mode */}
      <AnimatePresence mode="wait">
        {!isFlow && PHASE_LABELS[sessionPhase] && (
          <motion.p
            key={sessionPhase}
            initial={shouldAnimate ? { opacity: 0, y: -8 } : {}}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={motionT()}
            className="text-sm mb-6 text-center"
            style={{ color: 'var(--color-muted)' }}
          >
            {PHASE_LABELS[sessionPhase]}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Arc timer */}
      <ArcTimer
        progress={progress}
        remainingSeconds={remainingSeconds}
        elapsedSeconds={elapsedSeconds}
        timerStyle={timerStyle}
        phase={sessionPhase}
        showDigits={isFlow ? false : showDigits}
        onToggleDigits={() => setShowDigits(d => !d)}
        disableToggle={isFlow}
        size={timerSize}
      />

      {/* Task title — fades to 30% in flow */}
      {selectedTask && (
        <motion.p
          animate={shouldAnimate ? { opacity: isFlow ? 0.3 : 1 } : { opacity: isFlow ? 0.3 : 1 }}
          transition={shouldAnimate ? motionT() : { duration: 0 }}
          className="text-base font-semibold mt-6 text-center max-w-xs leading-snug"
          style={{ color: 'var(--color-text)' }}
        >
          {selectedTask.title}
        </motion.p>
      )}

      {/* Session controls (audio/stop/park) */}
      <SessionControls
        isFlow={isFlow}
        isPlaying={isPlaying}
        audioVolume={audioVolume}
        onVolumeChange={handleVolumeChange}
        parkOpen={parkOpen}
        parkText={parkText}
        onAudioToggle={handleAudioToggle}
        onStop={handleStop}
        onParkToggle={() => setParkOpen(p => !p)}
        onParkTextChange={setParkText}
        onParkSave={() => void handleParkThought()}
        onParkDismiss={() => { setParkOpen(false); setParkText('') }}
      />

      {/* Mochi body-double companion — Block 5a */}
      <MochiSessionCompanion
        elapsedSeconds={elapsedSeconds}
        sessionPhase={sessionPhase}
        behaviorProfile={behaviorProfile}
      />

      {/* Focus Room — in-session peer indicator (replaces Ambient Orbit when in room) */}
      {room.status === 'connected' ? (
        <AnimatePresence>
          <motion.div
            initial={shouldAnimate ? { opacity: 0, y: 8 } : false}
            animate={shouldAnimate ? { opacity: 0.75, y: 0 } : { opacity: 0.75 }}
            exit={shouldAnimate ? { opacity: 0 } : undefined}
            transition={shouldAnimate ? { delay: 2, duration: 1 } : { duration: 0 }}
            className="absolute bottom-40 left-0 right-0 flex flex-col items-center gap-1 pointer-events-none"
          >
            {/* Peer phase dots */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ backgroundColor: 'rgba(78,205,196,0.08)', border: '1px solid rgba(78,205,196,0.15)' }}
            >
              <span className="text-[11px]" style={{ color: '#4ECDC4' }}>{t('focus.inRoom', { count: room.peers.length + 1 })}</span>
              {room.peers.map(p => (
                <div key={p.userId} className="flex items-center gap-1">
                  <span className="text-[11px]">{p.emoji}</span>
                  <div className="w-1.5 h-1.5 rounded-full"
                    style={{ background: p.phase === 'flow' ? '#4ECDC4' : p.phase === 'release' ? '#F59E0B' : '#7B72FF' }}
                  />
                </div>
              ))}
            </div>
            {/* Anonymous encouragement — S-11 */}
            {encouragement && room.peers.length > 0 && (
              <p className="text-[10px] mt-0.5" style={{ color: '#5A5B72' }}>{encouragement}</p>
            )}
          </motion.div>
        </AnimatePresence>
      ) : (
        /* Ambient Orbit (S-2) — body-doubling social signal, fades in after 10s */
        <AnimatePresence>
          {orbitCount !== null && (
            <motion.div
              initial={shouldAnimate ? { opacity: 0, y: 8 } : false}
              animate={shouldAnimate ? { opacity: 0.55, y: 0 } : { opacity: 0.55 }}
              exit={shouldAnimate ? { opacity: 0 } : undefined}
              transition={shouldAnimate ? { delay: 10, duration: 1.5 } : { duration: 0 }}
              className="absolute bottom-40 left-0 right-0 flex justify-center pointer-events-none"
            >
              <span
                className="text-[11px] px-3 py-1 rounded-full"
                style={{
                  backgroundColor: 'rgba(78,205,196,0.08)',
                  border: '1px solid rgba(78,205,196,0.15)',
                  color: '#4ECDC4',
                }}
              >
                {orbitCount === 1 ? t('focus.peopleFocusing', { count: orbitCount }) : t('focus.peopleFocusingPlural', { count: orbitCount })}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}
