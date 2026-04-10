// -- gdpr-delete Edge Function --------------------------------------------------
// POST /functions/v1/gdpr-delete
// Body: { confirmEmail: string } — must match the authenticated user's email
// Returns: { deleted: true, tablesCleared: string[] }
//
// GDPR Article 17 — Right to Erasure
// Deletes ALL user data across all tables. The user row itself triggers
// cascading deletes via ON DELETE CASCADE foreign keys.
//
// After deletion the Supabase Auth user is also removed via admin API.
//
// Auth: JWT required
// Safety: requires email confirmation to prevent accidental deletion
// Rate limit: none — this is a one-shot destructive action

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { checkDbRateLimit } from '../_shared/rateLimit.ts'

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  try {
    // -- Auth (user-level client) ----------------------------------------------
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

    // -- Rate limit: 3 attempts per hour — prevents scripted deletion probing --
    const { allowed, retryAfterSeconds } = await checkDbRateLimit(supabase, user.id, false, {
      fnName:    'gdpr-delete',
      limitFree: 3,
      windowMs:  3_600_000,
    })
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'Too many deletion attempts. Try again later.' }),
        { status: 429, headers: { ...cors, 'Content-Type': 'application/json', 'Retry-After': String(retryAfterSeconds ?? 3600) } }
      )
    }

    // -- Input validation — require email confirmation -------------------------
    const { confirmEmail } = await req.json() as { confirmEmail?: string }

    if (!confirmEmail || confirmEmail.toLowerCase() !== user.email?.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: 'Email confirmation does not match. Deletion aborted.' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      )
    }

    const userId = user.id

    // -- Admin client (service role — can delete auth users) ------------------
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // -- Delete user data from all tables --------------------------------------
    // Order: children first (FK constraints), then parent row.
    // ON DELETE CASCADE handles most of it, but explicit deletes ensure
    // tables without FK relationships are also cleaned.

    const tables = [
      'energy_logs',
      'achievements',
      'user_behavior',
      'focus_sessions',
      'edge_rate_limits',
      'subscriptions',
      'tasks',
      'push_subscriptions',
      'google_tokens',
      'telegram_links',
    ]

    const clearedTables: string[] = []

    // Revoke Google OAuth tokens before deletion (best-effort)
    try {
      const { data: tokenRow } = await adminClient
        .from('google_tokens')
        .select('refresh_token, access_token')
        .eq('user_id', userId)
        .single()
      if (tokenRow?.refresh_token) {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${tokenRow.refresh_token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }).catch(() => {/* best-effort */})
      }
    } catch {
      // No tokens to revoke — continue
    }

    for (const table of tables) {
      const { error } = await adminClient
        .from(table)
        .delete()
        .eq('user_id', userId)

      if (!error) {
        clearedTables.push(table)
      } else {
        // Log but continue — partial deletion is better than none
        console.warn(`[gdpr-delete] Failed to clear ${table}:`, error.message)
      }
    }

    // Delete the users row itself (this also triggers CASCADE for any FKs we missed)
    const { error: userDeleteError } = await adminClient
      .from('users')
      .delete()
      .eq('id', userId)

    if (!userDeleteError) {
      clearedTables.push('users')
    } else {
      console.error('[gdpr-delete] Failed to delete user row:', userDeleteError.message)
    }

    // -- Delete the Supabase Auth user -----------------------------------------
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId)

    if (authDeleteError) {
      console.error('[gdpr-delete] Failed to delete auth user:', authDeleteError.message)
      // Still return success for data deletion — auth cleanup can be retried
    }

    return new Response(
      JSON.stringify({
        deleted: true,
        tablesCleared: clearedTables,
        authDeleted: !authDeleteError,
        gdprArticle: 'Article 17 — Right to Erasure',
      }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[gdpr-delete]', msg)
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  }
})
