import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../../app/providers/AuthProvider'

interface Props {
  children: ReactNode
  requiredRole?: 'admin' | 'staff' | 'viewer'
}

export default function ProtectedRoute({ children, requiredRole }: Props) {
  const { user, isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  // Wait for silent refresh to complete before making auth decisions
  if (isLoading) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Force password change before anything else
  if (user?.must_change_password && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }

  // Role check
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
