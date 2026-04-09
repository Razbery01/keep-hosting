import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function RequireAdmin() {
  const { user, profile, loading } = useAuth()

  // Still resolving initial session + profile — render nothing to avoid flash
  if (loading) return null

  // Not signed in OR not an admin — bounce to home
  if (!user || profile?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
