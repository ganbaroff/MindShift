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

const ALLOWED_PREVIEW_ORIGINS = new Set([
  'https://mind-shift-git-main-yusifg27-3093s-projects.vercel.app',
  'https://mind-shift-gilt.vercel.app',
  'https://mind-shift-yusifg27-3093s-projects.vercel.app',
])

/** Check if origin matches a known Vercel deployment for this project. */
function isVercelPreview(origin: string): boolean {
  if (ALLOWED_PREVIEW_ORIGINS.has(origin)) return true
  // Allow PR preview deployments — but only exact hash-based URLs (not arbitrary subdomains)
  return /^https:\/\/mind-shift-[a-z0-9]{12,}-yusifg27-3093s-projects\.vercel\.app$/.test(origin)
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
