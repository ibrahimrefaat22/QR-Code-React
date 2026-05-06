import { Navigate } from 'react-router-dom'
import { useAuthState, useAuthLoading } from '../../context/AuthContext'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  requireAdmin?: boolean
}

const ProtectedRoute = ({ children, requireAdmin = false }: Props) => {
  const { user, profile } = useAuthState()
  const { loading } = useAuthLoading()

  if (loading) {
    return (
      <div className="auth-loading-screen">
        <span className="spinner large" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requireAdmin && profile?.role !== 'admin') {
    return <Navigate to="/scanner" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute