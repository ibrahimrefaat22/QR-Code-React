import { Navigate } from 'react-router-dom'
import { useAuthState, useAuthLoading } from '../../context/AuthContext'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

const PublicRoute = ({ children }: Props) => {
  const { user } = useAuthState()
  const { loading } = useAuthLoading()

  if (loading) {
    return (
      <div className="auth-loading-screen">
        <span className="spinner large" />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/admin" replace />
  }

  return <>{children}</>
}

export default PublicRoute