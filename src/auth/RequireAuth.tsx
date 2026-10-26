import { Navigate, Outlet } from 'react-router'
import { useAuth } from './authContext'

// A "layout route": wrap routes in <Route element={<RequireAuth />}> and they
// only render for signed-in users. <Outlet /> is where the matched child page goes.
//
// This is for user experience, not security: someone could bypass it in their
// own browser, but they'd still get nothing back, because RLS is the real gate.
export function RequireAuth() {
  const { session, loading } = useAuth()

  // Don't decide yet: on first load we're still restoring the session, and
  // redirecting now would bounce signed-in users to /login for a split second.
  if (loading) return <p>Loading…</p>

  // replace: swap the history entry, so the Back button doesn't return here.
  if (!session) return <Navigate to="/login" replace />

  return <Outlet />
}
