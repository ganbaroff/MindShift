import { Outlet } from 'react-router-dom'

/**
 * Auth bypass — magic-link auth removed, Google OAuth coming soon.
 * All routes are accessible without sign-in.
 * Guest user ID is set in App.tsx so local features (tasks, sessions) work fully.
 */
export function AuthGuard() {
  return <Outlet />
}
