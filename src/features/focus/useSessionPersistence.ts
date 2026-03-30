/**
 * useSessionPersistence — DB writes for focus sessions
 *
 * Handles:
 * - Pending session recovery (tab-close recovery via localStorage)
 * - saveSession: insert focus_sessions row + Calendar sync
 * - handlePostEnergy: update energy_after + Volaura vitals
 * - handleAutopsyPick: update phase_reached for hyperfocus autopsy
 */

import { useEffect, useCallback } from 'react'
import type { MutableRefObject } from 'react'
import { supabase } from '@/shared/lib/supabase'
import { logError } from '@/shared/lib/logger'
import { sendVitals, isVolauraConfigured } from '@/shared/lib/volaura-bridge'
import { useStore } from '@/store'
import type { SessionPhase, AudioPreset, EnergyLevel } from '@/types'
import type { FocusSessionInsert } from '@/types/database'

interface ActiveSession {
  taskId: string | null
  startedAt: string
}

interface UseSessionPersistenceParams {
  activeSession: ActiveSession | null
  userId: string | null
  activePreset: AudioPreset | null
  energyLevel: EnergyLevel
  updateLastSession: () => void
  setEnergyLevel: (level: EnergyLevel) => void
  savedSessionIdRef: MutableRefObject<string | null>
  sessionSavedRef: MutableRefObject<boolean>
}

export function useSessionPersistence({
  activeSession, userId, activePreset, energyLevel,
  updateLastSession, setEnergyLevel,
  savedSessionIdRef, sessionSavedRef,
}: UseSessionPersistenceParams) {
  // Recover partial session saved by beforeunload handler on tab close
  useEffect(() => {
    if (!userId || userId.startsWith('guest_')) return
    const pending = localStorage.getItem('ms_pending_session')
    if (!pending) return
    try {
      const p = JSON.parse(pending) as { taskId: string; startedAt: string; elapsedMs: number; phase: string }
      localStorage.removeItem('ms_pending_session')
      const elapsedMin = Math.round(p.elapsedMs / 60_000)
      if (elapsedMin >= 1) {
        void supabase.from('focus_sessions').insert({
          user_id: userId,
          started_at: p.startedAt,
          duration_ms: p.elapsedMs,
          phase_reached: p.phase,
          energy_before: null,
          energy_after: null,
          audio_preset: null,
        } as never).then(({ error }: { error: unknown }) => {
          if (error) logError('useSessionPersistence.pendingRecovery', error)
        })
      }
    } catch { /* malformed JSON — discard */ }
  }, [userId])

  const saveSession = useCallback(async (elapsedMs: number, phaseReached: SessionPhase) => {
    if (sessionSavedRef.current || !activeSession || !userId) return
    try {
      const row: FocusSessionInsert = {
        task_id:       activeSession.taskId,
        user_id:       userId,
        started_at:    activeSession.startedAt,
        audio_preset:  activePreset,
        duration_ms:   elapsedMs,
        phase_reached: phaseReached === 'idle' ? null : phaseReached,
        energy_before: energyLevel ?? null,
      }
      const { data: saved } = await supabase
        .from('focus_sessions')
        .insert(row as never)
        .select('id')
        .single()
      // Only mark saved after confirmed insert — allows retry on network error
      sessionSavedRef.current = true
      savedSessionIdRef.current = (saved as { id?: string } | null)?.id ?? null
      localStorage.removeItem('ms_pending_session')
      updateLastSession()

      // Sync focus session to Google Calendar (fire-and-forget)
      import('@/shared/hooks/useCalendarSync').then(({ syncFocusSession }) => {
        const taskTitle = activeSession.taskId
          ? [...useStore.getState().nowPool, ...useStore.getState().nextPool]
              .find(t => t.id === activeSession.taskId)?.title ?? null
          : null
        void syncFocusSession(activeSession.startedAt, elapsedMs, taskTitle)
      })
    } catch (err) {
      logError('FocusScreen.handleSessionEnd.insert', err)
    }
  }, [activeSession, activePreset, energyLevel, updateLastSession, userId, savedSessionIdRef, sessionSavedRef])

  const handlePostEnergy = useCallback((level: EnergyLevel) => {
    setEnergyLevel(level)
    if (savedSessionIdRef.current && userId && !userId.startsWith('guest_')) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      void (supabase.from('focus_sessions') as any)
        .update({ energy_after: level })
        .eq('id', savedSessionIdRef.current)
        .then(({ error }: { error: unknown }) => { if (error) logError('useSessionPersistence.energy_after', error) })

      if (isVolauraConfigured()) {
        void supabase.auth.getSession().then(({ data }) => {
          const token = data.session?.access_token
          if (token) void sendVitals(token, level, useStore.getState().burnoutScore)
        })
      }
    }
  }, [setEnergyLevel, userId, savedSessionIdRef])

  const handleAutopsyPick = useCallback((pick: string) => {
    if (!savedSessionIdRef.current || !userId || userId.startsWith('guest_')) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void (supabase.from('focus_sessions') as any)
      .update({ phase_reached: pick })
      .eq('id', savedSessionIdRef.current)
      .then(({ error }: { error: unknown }) => { if (error) logError('useSessionPersistence.autopsy', error) })
  }, [userId, savedSessionIdRef])

  return { saveSession, handlePostEnergy, handleAutopsyPick }
}
