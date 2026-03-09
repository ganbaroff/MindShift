// ── CORS configuration ────────────────────────────────────────────────────────
// Restrict to known origins — never use '*' in production.
// Add your Vercel deployment URL(s) to ALLOWED_ORIGINS.

const ALLOWED_ORIGINS = [
  'https://mindshift.app',
  'https://mindshift.vercel.app',
  'http://localhost:5173',  // Vite dev server
  'http://localhost:4173',  // Vite preview
  // ngrok static domain for mobile testing
  'https://chordamesodermal-bette-inconstant.ngrok-free.dev',
]

/** Allow any *.ngrok-free.dev origin for local mobile testing. Remove in production. */
function isNgrokOrigin(origin: string): boolean {
  return /^https:\/\/[a-z0-9-]+\.ngrok-free\.dev$/.test(origin)
}

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  // Only reflect the origin if it's allowed — never default to a valid origin
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) || isNgrokOrigin(origin) ? origin : ''

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  }
}

// Legacy export for backward compatibility — prefer getCorsHeaders(req)
export const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
