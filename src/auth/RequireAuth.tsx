import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from './useAuth.ts'

/** Layout route: everything inside needs a signed-in user (when accounts are enabled). */
export default function RequireAuth() {
  const { enabled, status } = useAuth()
  const location = useLocation()

  if (!enabled) return <Outlet />
  if (status === 'loading') {
    return (
      <main className="grid min-h-dvh place-items-center">
        <p className="font-mono text-ink-soft">Loading…</p>
      </main>
    )
  }
  if (status === 'signed_out') {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    )
  }
  return <Outlet />
}
