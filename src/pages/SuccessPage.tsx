import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface LastScannedTeam {
  academyName: string
  teamName: string
  membersCount: number
}

const REDIRECT_SECONDS = 4

const SuccessPage = () => {
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(REDIRECT_SECONDS)
  const [teamData, setTeamData] = useState<LastScannedTeam | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('lastScannedTeam')
      if (!stored) return
      const parsed = JSON.parse(stored) as LastScannedTeam
      setTeamData(parsed)
      localStorage.removeItem('lastScannedTeam')
    } catch (error) {
      console.error(error)
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          navigate('/scanner', { replace: true })
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [navigate])

  return (
    <div className="success-page">
      <div className="success-container">
        <div className="success-card">
          <div className="success-icon">✅</div>

          <h1>Check-in Successful!</h1>

          <div className="success-details">
            <div className="detail-row">
              <span className="label">Academy:</span>
              <span className="value">{teamData?.academyName ?? '—'}</span>
            </div>
            <div className="detail-row">
              <span className="label">Team Name:</span>
              <span className="value">{teamData?.teamName ?? '—'}</span>
            </div>
            <div className="detail-row">
              <span className="label">Members Allowed:</span>
              <span className="value">{teamData?.membersCount ?? '—'}</span>
            </div>
            <div className="detail-row">
              <span className="label">Check-in Time:</span>
              <span className="value">{new Date().toLocaleTimeString()}</span>
            </div>
          </div>

          <p className="auto-redirect-text">
            Redirecting to scanner in <span>{countdown}</span> seconds...
          </p>

          <div className="success-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate('/scanner', { replace: true })}
            >
              📱 Scan Next Team
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SuccessPage