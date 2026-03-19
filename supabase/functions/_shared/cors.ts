// ── CORS configuration ────────────────────────────────────────────────────────
// Restrict to known origins — never use '*' in production.
// Add your Vercel deployment URL(s) to ALLOWED_ORIGINS.

const ALLOWED_ORIGINS = [
  'https://mindshift.app',
  'https://mindshift.vercel.app',
  'https://mind-shift-git-main-yusifg27-3093s-projects.vercel.app',
  'http://localhost:5173',  // Vite dev server
  'http://localhost:4173',  // Vite preview
]

/** Check if origin matches a Vercel preview deployment for this project. */
function isVercelPreview(origin: string): boolean {
  return /^https:\/\/mind-shift-[a-z0-9-]+\.vercel\.app$/.test(origin)
}

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') ?? ''
  // Only reflect the origin if it's allowed — never default to a valid origin
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) || isVercelPreview(origin) ? origin : ''

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
