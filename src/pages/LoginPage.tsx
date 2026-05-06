import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthActions, useAuthState, useAuthLoading } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { getAuthErrorMessage } from '../utils/authErrors'

const LoginPage = () => {
  const { login } = useAuthActions()
  const { user } = useAuthState()
  const { loading: authLoading } = useAuthLoading()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/admin', { replace: true })
    }
  }, [user, authLoading, navigate])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading) return

    setError('')
    setLoading(true)

    try {
      await login(email.trim(), password)
      navigate('/admin', { replace: true })
    } catch (err) {
      const errorCode = (err as { code?: string })?.code
      const message = getAuthErrorMessage(errorCode)
      setError(message)
      showToast(`Login failed: ${message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>QR Attendance System</h1>
            <p>Programming &amp; Robotics Competition</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                required
                placeholder="admin@competition.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : 'Sign In'}
            </button>
          </form>

          <div className="login-footer">
            <p>Are you a team member checking in?</p>
            <Link to="/scanner" className="btn btn-secondary btn-block">
              📱 Go to Scanner
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage