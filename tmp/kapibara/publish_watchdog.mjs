// publish_watchdog.mjs — "preview sent but nothing published" guard (FIX 2, 2026-07-20).
// A green daily run that posts the Telegram preview but writes NO publish_journal row (e.g. the
// content_critic gate fail-closed — incident 2026-07-13) used to pass SILENTLY: the workflow stayed
// green while IG/TikTok got nothing. This is the pure decision used by make-clip.mjs to alert the CEO.
//
//   previewPosted: true if the TG preview step ran (not --no-preview)
//   published:     true  = publish_journal row exists (all good)
//                  false = no row (silent miss → ALERT)
//                  null  = journal unreachable (don't guess, never false-alarm)
export function shouldAlert({ previewPosted, published }) {
  return previewPosted === true && published === false
}
