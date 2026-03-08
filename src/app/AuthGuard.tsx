import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { supabase } from '@/shared/lib/supabase'
import { LoadingScreen } from '@/shared/ui/LoadingScreen'

export function AuthGuard() {
  const [checking, setChecking] = useState(true)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session)
      setChecking(false)
    })
  }, [])

  if (checking) return <LoadingScreen />
  if (!authed)  return <Navigate to="/auth" replace />
  return <Outlet />
}
