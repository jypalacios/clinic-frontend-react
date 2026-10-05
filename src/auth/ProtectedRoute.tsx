import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function ProtectedRoute({ permission, anyPermissions }: { permission?: string; anyPermissions?: string[] }) {
  const { user, hasPermission, hasAnyPermission, loading } = useAuth()
  if (loading) return <div className="screen-loader">Cargando tu espacio de trabajo…</div>
  if (!user) return <Navigate to="/login" replace />
  if (permission && !hasPermission(permission)) return <Navigate to="/dashboard" replace />
  if (anyPermissions && !hasAnyPermission(anyPermissions)) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
