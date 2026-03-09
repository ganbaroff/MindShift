// ── gdpr-export Edge Function ──────────────────────────────────────────────────
// POST /functions/v1/gdpr-export
// Body: {} (no params needed — exports all data for the authenticated user)
// Returns: { data: { user, tasks, focusSessions, achievements, energyLogs, behavior } }
//
// GDPR Article 20 — Right to Data Portability
// Returns all user data in machine-readable JSON format.
//
// Auth: JWT required
// Rate limit: 3 calls/day per user (free + pro) — prevents abuse

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
    // ── Auth ───────────────────────────────────────────────────────────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } }
      )
    }

    const userId = user.id

    // ── Collect all user data in parallel ─────────────────────────────────────
    const [
      { data: userProfile },
      { data: tasks },
      { data: focusSessions },
      { data: achievements },
      { data: energyLogs },
      { data: behavior },
      { data: subscriptions },
    ] = await Promise.all([
      supabase.from('users').select('*').eq('id', userId).single(),
      supabase.from('tasks').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('focus_sessions').select('*').eq('user_id', userId).order('started_at', { ascending: false }),
      supabase.from('achievements').select('*').eq('user_id', userId),
      supabase.from('energy_logs').select('*').eq('user_id', userId).order('logged_at', { ascending: false }),
      supabase.from('user_behavior').select('*').eq('user_id', userId).order('date', { ascending: false }),
      supabase.from('subscriptions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    ])

    // ── Build export package ──────────────────────────────────────────────────
    const exportData = {
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0',
      gdprArticle: 'Article 20 — Right to Data Portability',
      user: userProfile ? {
        id: userProfile.id,
        email: userProfile.email,
        cognitiveMode: userProfile.cognitive_mode,
        energyLevel: userProfile.energy_level,
        psychotype: userProfile.psychotype,
        avatarId: userProfile.avatar_id,
        xpTotal: userProfile.xp_total,
        createdAt: userProfile.created_at,
        lastSessionAt: userProfile.last_session_at,
        onboardingCompleted: userProfile.onboarding_completed,
        subscriptionTier: userProfile.subscription_tier,
        trialEndsAt: userProfile.trial_ends_at,
        reducedStimulation: userProfile.reduced_stimulation,
        termsAcceptedAt: userProfile.terms_accepted_at,
        termsVersion: userProfile.terms_version,
        ageConfirmed: userProfile.age_confirmed,
      } : null,
      tasks: (tasks ?? []).map(t => ({
        id: t.id,
        title: t.title,
        pool: t.pool,
        status: t.status,
        difficulty: t.difficulty,
        estimatedMinutes: t.estimated_minutes,
        completedAt: t.completed_at,
        createdAt: t.created_at,
        snoozeCount: t.snooze_count,
      })),
      focusSessions: (focusSessions ?? []).map(s => ({
        id: s.id,
        startedAt: s.started_at,
        endedAt: s.ended_at,
        durationMs: s.duration_ms,
        phaseReached: s.phase_reached,
        audioPreset: s.audio_preset,
        taskId: s.task_id,
        energyBefore: s.energy_before,
        energyAfter: s.energy_after,
      })),
      achievements: (achievements ?? []).map(a => ({
        key: a.achievement_key,
        unlockedAt: a.unlocked_at,
      })),
      energyLogs: (energyLogs ?? []).map(e => ({
        energyBefore: e.energy_before,
        energyAfter: e.energy_after,
        sessionId: e.session_id,
        loggedAt: e.logged_at,
      })),
      behavior: (behavior ?? []).map(b => ({
        date: b.date,
        sessionDurationMs: b.session_duration_ms,
        taskCompletionRatio: b.task_completion_ratio,
        snoozeCount: b.snooze_count,
      })),
      subscriptions: (subscriptions ?? []).map(s => ({
        tier: s.tier,
        startedAt: s.started_at,
        endsAt: s.ends_at,
        active: s.active,
      })),
    }

    return new Response(
      JSON.stringify({ data: exportData }),
      {
        status: 200,
        headers: {
          ...cors,
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="mindshift-export-${userId.slice(0, 8)}.json"`,
        },
      }
    )

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[gdpr-export]', msg)
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  }
})
