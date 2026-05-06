import { useNavigate } from 'react-router-dom'
import { useAuthActions } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useState } from 'react'

export const useLogout = () => {
  const { logout } = useAuthActions()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
      showToast('Logged out successfully', 'success')
      navigate('/login', { replace: true })
    } catch (error) {
      console.error(error)
      showToast('Error logging out', 'error')
      setLoggingOut(false)
    }
  }

  return { handleLogout, loggingOut }
}