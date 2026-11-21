import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { homePathFor, navAccess, useAuth } from '../auth'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--text-muted)' }}>
        Checking your session…
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  const allowed = navAccess[location.pathname]
  if (allowed && !allowed.includes(user.role)) {
    return <Navigate to={homePathFor(user.role)} replace />
  }

  return <Outlet />
}
