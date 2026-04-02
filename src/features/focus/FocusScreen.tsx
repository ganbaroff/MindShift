/**
 * FocusScreen — thin orchestrator (Block 2d refactor)
 *
 * Responsibilities:
 *   - Route between screen states from useFocusSession FSM
 *   - Delegate each screen to a dedicated component
 *
 * Sub-modules:
 *   FocusSetup            — setup/pre-session UI
 *   FocusInterruptConfirm — "are you sure?" pause screen
 *   FocusBookmarkCapture  — "where did you leave off?" screen
 *   FocusHardStop         — 120-min hard-stop half-sheet
 *   PostSessionFlow       — nature buffer + recovery lock
 *   SessionControls       — audio / stop / park FAB
 *   MochiSessionCompanion — body-double AI bubbles
 *   useAmbientOrbit       — S-2 social signal hook
 */

import { useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { ArcTimer } from './ArcTimer'
import { MochiSessionCompanion } from './MochiSessionCompanion'
import { SessionControls } from './SessionControls'
import { NatureBuffer, RecoveryLock } from './PostSessionFlow'
import { FocusSetup } from './FocusSetup'
import { FocusInterruptConfirm } from './FocusInterruptConfirm'
import { FocusBookmarkCapture } from './FocusBookmarkCapture'
import { FocusHardStop } from './FocusHardStop'
import { useFocusSession, PHASE_LABELS } from './useFocusSession'
import { useFocusRoom, ROOM_ENCOURAGEMENTS } from '@/shared/hooks/useFocusRoom'
import { useAmbientOrbit } from '@/shared/hooks/useAmbientOrbit'
import { nativeStatusBarHide, nativeStatusBarShow } from '@/shared/lib/native'
import { useSessionHistory } from '@/shared/hooks/useSessionHistory'
import { useUserBehavior } from '@/shared/hooks/useUserBehavior'
import { useStore } from '@/store'
import { isVolauraConfigured } from '@/shared/lib/volaura-bridge'

export default function FocusScreen() {
  const session = useFocusSession()
  const { t } = useTranslation()
  const { emotionalReactivity, userId } = useStore()
  const orbitCount = useAmbientOrbit(session.screen === 'session')
  const room = useFocusRoom()

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
    if (room.status !== 'connected' || (room.peers.length === 0 && !room.peerGrace)) return null
    return ROOM_ENCOURAGEMENTS[Math.floor(Date.now() / 300_000) % ROOM_ENCOURAGEMENTS.length]
  }, [room.status, room.peers.length, room.peerGrace])

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

  if (screen === 'nature-buffer') {
    const crystalEarned =
      isVolauraConfigured() && userId && !userId.startsWith('guest_')
        ? Math.floor(elapsedMin * 5)
        : undefined
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
        crystalEarned={crystalEarned}
      />
    )
  }

  if (screen === 'recovery-lock') {
    return <RecoveryLock recoverySeconds={recoverySeconds} onBypass={handleBypassRecovery} />
  }

  if (screen === 'interrupt-confirm') {
    return <FocusInterruptConfirm elapsedMin={elapsedMin} onResume={handleResume} onConfirmStop={handleConfirmStop} />
  }

  if (screen === 'bookmark-capture') {
    return (
      <FocusBookmarkCapture
        bookmarkText={bookmarkText}
        setBookmarkText={setBookmarkText}
        onSave={handleBookmarkSave}
        onSkip={handleBookmarkSkip}
      />
    )
  }

  if (screen === 'hard-stop') {
    return <FocusHardStop onEndAndRest={() => handleSessionEnd(true)} onKeepGoing={handleBypassHardStop} />
  }

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
      <AnimatePresence mode="wait">
        {!isFlow && PHASE_LABELS[sessionPhase] && (
          <motion.p
            key={sessionPhase}
            initial={shouldAnimate ? { opacity: 0, y: -8 } : {}}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldAnimate ? { opacity: 0, y: -8 } : {}}
            transition={motionT()}
            className="text-sm mb-6 text-center"
            style={{ color: 'var(--color-muted)' }}
          >
            {PHASE_LABELS[sessionPhase]}
          </motion.p>
        )}
      </AnimatePresence>

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

      <MochiSessionCompanion
        elapsedSeconds={elapsedSeconds}
        sessionPhase={sessionPhase}
        behaviorProfile={behaviorProfile}
      />

      {/* Focus Room peers (S-3) or Ambient Orbit (S-2) */}
      {room.status === 'connected' ? (
        <AnimatePresence>
          <motion.div
            initial={shouldAnimate ? { opacity: 0, y: 8 } : false}
            animate={shouldAnimate ? { opacity: 0.75, y: 0 } : { opacity: 0.75 }}
            exit={shouldAnimate ? { opacity: 0 } : undefined}
            transition={shouldAnimate ? { delay: 2, duration: 1 } : { duration: 0 }}
            className="absolute bottom-40 left-0 right-0 flex flex-col items-center gap-1 pointer-events-none"
          >
            {/* S-5: Ghosting Grace — warm message when partner steps away */}
            {room.peerGrace && room.peers.length === 0 ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}
              >
                <span className="text-[11px]" style={{ color: 'var(--color-gold)' }}>
                  {t('focusRoom.partnerSteppedAway')}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{ backgroundColor: 'rgba(78,205,196,0.08)', border: '1px solid rgba(78,205,196,0.15)' }}
              >
                <span className="text-[11px]" style={{ color: 'var(--color-teal)' }}>{t('focus.inRoom', { count: room.peers.length + 1 })}</span>
                {room.peers.map(p => (
                  <div key={p.userId} className="flex items-center gap-1">
                    <span className="text-[11px]">{p.emoji}</span>
                    <div className="w-1.5 h-1.5 rounded-full"
                      style={{ background: p.phase === 'flow' ? 'var(--color-teal)' : p.phase === 'release' ? 'var(--color-gold)' : 'var(--color-primary)' }}
                    />
                  </div>
                ))}
              </div>
            )}
            {encouragement && room.peers.length > 0 && (
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{encouragement}</p>
            )}
          </motion.div>
        </AnimatePresence>
      ) : (
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
