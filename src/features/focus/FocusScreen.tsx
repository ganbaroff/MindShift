/**
 * FocusScreen — thin orchestrator (Block 2d refactor)
 *
 * Responsibilities:
 *   - Route between screen states from useFocusSession FSM
 *   - Render setup, session, interrupt-confirm, bookmark-capture, hard-stop screens
 *   - Delegate nature-buffer + recovery-lock to PostSessionFlow
 *   - Delegate active-session controls to SessionControls
 *
 * All timer/session logic lives in useFocusSession.ts
 * Post-session screens live in PostSessionFlow.tsx
 * Session controls (audio/stop/park) live in SessionControls.tsx
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Link } from 'react-router-dom'
import { ArcTimer } from './ArcTimer'
import { MochiSessionCompanion } from './MochiSessionCompanion'
import { SessionControls } from './SessionControls'
import { NatureBuffer, RecoveryLock } from './PostSessionFlow'
import { useFocusSession, clearBookmark, PHASE_LABELS } from './useFocusSession'
import { BreathworkRitual } from './BreathworkRitual'
import { nativeStatusBarHide, nativeStatusBarShow } from '@/shared/lib/native'

export default function FocusScreen() {
  const session = useFocusSession()
  const [showBreathwork, setShowBreathwork] = useState(false)

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
    progress, isFlow, elapsedMin, timerSize, energyLabel,
    timerStyle, sessionPhase,
    handleStart, handleStop, handleResume, handleConfirmStop,
    handleBookmarkSave, handleBookmarkSkip, handleSkipBuffer,
    handleAudioToggle, handleParkThought,
    handleSessionEnd, handleBypassRecovery, handleBypassHardStop,
    handlePostEnergy,
    isPlaying,
    shouldAnimate, t,
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
          Leave focus session?
        </h2>
        <p className="text-sm mb-8 max-w-xs leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          You've been focused for {elapsedMin}m. Your progress will be saved.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={handleResume}
            className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200"
            style={{
              background: 'var(--color-primary-alpha)',
              border: '1.5px solid var(--color-primary)',
              color: 'var(--color-primary)',
            }}
          >
            Keep going 🌿
          </button>
          <button
            onClick={handleConfirmStop}
            className="w-full py-3 rounded-2xl font-medium text-sm transition-all duration-200"
            style={{
              background: 'transparent',
              border: '1px solid var(--color-border-subtle)',
              color: 'var(--color-muted)',
            }}
          >
            End session
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
          transition={t()}
          className="flex flex-col items-center w-full max-w-xs"
        >
          <div className="text-4xl mb-4">📌</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
            Park your progress
          </h2>
          <p className="text-sm mb-6 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
            What were you working on? We'll remind you next time.
          </p>
          <input
            value={bookmarkText}
            onChange={e => setBookmarkText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && bookmarkText.trim()) handleBookmarkSave() }}
            placeholder="e.g. Finishing the header layout..."
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
              Save & Exit 📌
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
              Skip
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
          transition={t()}
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
            Two hours of deep work
          </h2>
          <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--color-muted)' }}>
            That's a serious session. Your brain consolidates everything during rest —
            even 10 minutes away will help you do better next time.
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
            End session & rest 🌿
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
            I know — let me keep going
          </button>
        </motion.div>
      </div>
    )
  }

  // ── Setup Screen ───────────────────────────────────────────────────────────
  if (screen === 'setup') {
    return (
      <div className="flex flex-col pb-28" style={{ background: 'var(--color-bg)' }}>
        <div className="px-5 pt-10 pb-4">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            Focus Session ⏱️
          </h1>
          <p className="text-sm mt-1" style={{ color: energyLabel.color }}>
            {energyLabel.text}
          </p>
        </div>

        {/* Interrupt bookmark anchor */}
        {savedBookmark && (
          <div
            className="mx-5 mb-5 p-4 rounded-2xl"
            style={{ background: 'var(--color-card)', border: '1.5px solid var(--color-primary-alpha)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span>📌</span>
              <p className="text-xs font-medium" style={{ color: 'var(--color-muted)' }}>
                PICK UP WHERE YOU LEFT OFF
              </p>
            </div>
            <p className="text-sm font-medium mb-3" style={{ color: 'var(--color-text)' }}>
              {savedBookmark.text}
            </p>
            <div className="flex gap-2">
              {savedBookmark.taskId && allTasks.find(t => t.id === savedBookmark.taskId) && (
                <button
                  onClick={() => {
                    const task = allTasks.find(t => t.id === savedBookmark.taskId)
                    if (task) setSelectedTask(task)
                    clearBookmark()
                  }}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold"
                  style={{ background: 'var(--color-primary-alpha)', border: '1.5px solid var(--color-primary)', color: 'var(--color-primary)' }}
                >
                  Continue task →
                </button>
              )}
              <button
                onClick={clearBookmark}
                className="py-2 px-4 rounded-xl text-xs"
                style={{ color: 'var(--color-muted)', border: '1px solid var(--color-border-subtle)' }}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Task picker / empty state */}
        {allTasks.length === 0 ? (
          <div className="mx-5 mb-6 p-6 rounded-2xl flex flex-col items-center text-center"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border-subtle)' }}
          >
            <span style={{ fontSize: 40 }} className="mb-3">🎯</span>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>No tasks yet</p>
            <p className="text-xs mb-4 leading-relaxed" style={{ color: 'var(--color-muted)' }}>
              Pick a task to focus on — it gives your session direction.
            </p>
            <Link
              to="/tasks"
              className="px-5 py-2.5 rounded-xl text-xs font-semibold transition-all"
              style={{ background: 'var(--color-primary-alpha)', border: '1.5px solid var(--color-primary)', color: 'var(--color-primary)' }}
            >
              Go to Tasks →
            </Link>
          </div>
        ) : (
          <div className="px-5 mb-6">
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-muted)' }}>TASK (OPTIONAL)</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setSelectedTask(null)}
                className="flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200"
                style={{
                  background: selectedTask === null ? 'var(--color-primary-alpha)' : 'var(--color-card)',
                  border: `1.5px solid ${selectedTask === null ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
                }}
              >
                <span>🧠</span>
                <span className="text-sm" style={{ color: selectedTask === null ? 'var(--color-primary)' : 'var(--color-text)' }}>
                  Open focus — no specific task
                </span>
              </button>

              {allTasks.slice(0, 5).map(task => {
                const isSelected = selectedTask?.id === task.id
                return (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200"
                    style={{
                      background: isSelected ? 'var(--color-primary-alpha)' : 'var(--color-card)',
                      border: `1.5px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
                    }}
                  >
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                      style={{ background: 'var(--color-elevated)', color: 'var(--color-muted)' }}
                    >
                      {task.pool === 'now' ? 'NOW' : 'NEXT'}
                    </span>
                    <span className="text-sm flex-1" style={{ color: isSelected ? 'var(--color-primary)' : 'var(--color-text)' }}>
                      {task.title}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Duration presets */}
        <div className="px-5 mb-6">
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-muted)' }}>
            DURATION
            <span className="ml-2 font-normal" style={{ color: 'var(--color-primary)' }}>
              (smart: {smartDuration}m)
            </span>
          </p>
          <div className="flex gap-2">
            {TIMER_PRESETS.map(min => {
              const isActive = selectedDuration === min && !showCustom
              const isRecommended = min === smartDuration
              return (
                <button
                  key={min}
                  onClick={() => { setSelectedDuration(min); setShowCustom(false) }}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all duration-200 relative"
                  style={{
                    background:  isActive ? 'var(--color-primary-alpha)' : 'var(--color-card)',
                    border:      `1.5px solid ${isActive ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
                    color:       isActive ? 'var(--color-primary)' : 'var(--color-text)',
                  }}
                >
                  {min}m
                  {isRecommended && (
                    <span
                      className="absolute -top-1.5 -right-1.5 text-xs w-4 h-4 flex items-center justify-center rounded-full"
                      style={{ background: 'var(--color-primary)', color: 'white', fontSize: '8px' }}
                    >
                      ✦
                    </span>
                  )}
                </button>
              )
            })}
            <button
              onClick={() => setShowCustom(true)}
              className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all duration-200"
              style={{
                background: showCustom ? 'var(--color-primary-alpha)' : 'var(--color-card)',
                border:     `1.5px solid ${showCustom ? 'var(--color-primary)' : 'var(--color-border-subtle)'}`,
                color:      showCustom ? 'var(--color-primary)' : 'var(--color-muted)',
              }}
            >
              ✎
            </button>
          </div>

          {showCustom && (
            <div className="mt-3 flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="180"
                value={customDuration}
                onChange={e => setCustomDuration(e.target.value)}
                placeholder="Minutes..."
                autoFocus
                className="flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none"
                style={{ background: 'var(--color-card)', border: '1.5px solid var(--color-primary)', color: 'var(--color-text)' }}
              />
              <span className="text-sm" style={{ color: 'var(--color-muted)' }}>min</span>
            </div>
          )}
        </div>

        {/* Sound anchor indicator */}
        {focusAnchor && (
          <div
            className="mx-5 mb-6 p-3 rounded-xl flex items-center gap-3"
            style={{ background: 'var(--color-card)', border: '1px solid var(--color-border-subtle)' }}
          >
            <span>🎯</span>
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>Sound Anchor ready</p>
              <p className="text-xs" style={{ color: 'var(--color-muted)' }}>
                {focusAnchor} noise will play automatically
              </p>
            </div>
          </div>
        )}

        {/* Start button */}
        <div className="px-5 space-y-2">
          <button
            onClick={() => setShowBreathwork(true)}
            className="w-full py-4 rounded-2xl font-bold text-base transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #7B72FF, #8B7FF7)',
              color: 'white',
              boxShadow: '0 8px 32px rgba(123,114,255,0.3)',
            }}
          >
            Start Focus →
          </button>
          <button
            onClick={() => handleStart()}
            className="w-full py-2 text-[12px]"
            style={{ color: '#8B8BA7' }}
          >
            Skip ritual & jump in
          </button>
        </div>
      </div>

      {/* Breathwork ritual overlay */}
      <AnimatePresence>
        {showBreathwork && (
          <div className="fixed inset-0 z-50">
            <BreathworkRitual
              onComplete={() => {
                setShowBreathwork(false)
                handleStart()
              }}
              onSkip={() => {
                setShowBreathwork(false)
                handleStart()
              }}
            />
          </div>
        )}
      </AnimatePresence>
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
            transition={t()}
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
          animate={{ opacity: isFlow ? 0.3 : 1 }}
          transition={t()}
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
      />
    </div>
  )
}
