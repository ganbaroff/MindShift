/**
 * VAPID public key for Web Push subscriptions.
 *
 * This key is safe to expose client-side — it identifies the app server.
 * The private key is stored only in Supabase env vars (VAPID_PRIVATE_KEY).
 *
 * Generated with: npx web-push generate-vapid-keys
 */
export const VAPID_PUBLIC_KEY = 'BFcL702uYDK6deRQY9xgKsCZN-d-MJ2RviPcco91hLrjkyCRlcscKe4i4d7yuiw5q-bqxL0oUfLorzz76heFfuY'
