import { useMemo, useState } from 'react'
import { doc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useToast } from '../../context/ToastContext'
import { useTeams } from '../../context/TeamsContext'
import { sendQREmail } from '../../services/emailService'
import type { ProgressState, Team } from '../../types'

type SendingState = 'idle' | 'all' | 'academy' | 'team'

const markTeamsAsSent = async (teamIds: string[]): Promise<void> => {
  const batchSize = 500
  for (let i = 0; i < teamIds.length; i += batchSize) {
    const batch = writeBatch(db)
    teamIds.slice(i, i + batchSize).forEach((id) => {
      batch.update(doc(db, 'teams', id), { qrSent: true })
    })
    await batch.commit()
  }
}

const SendQR = () => {
  const { showToast } = useToast()
  const { teams } = useTeams()

  const [selectedAcademy, setSelectedAcademy] = useState('')
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [sending, setSending] = useState<SendingState>('idle')
  const [progress, setProgress] = useState<ProgressState | null>(null)
  const [results, setResults] = useState<{ success: number; failed: number } | null>(null)

  const academyOptions = useMemo(() => {
    const academyMap = new Map<string, string>()
    teams.forEach((team) => {
      if (team.academyName) academyMap.set(team.academyName, team.academyEmail)
    })
    return Array.from(academyMap.entries())
      .map(([name, email]) => ({ name, email }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [teams])

  const teamOptions = useMemo(() => {
    return [...teams]
      .sort((a, b) => a.academyName.localeCompare(b.academyName))
      .map((team) => ({
        id: team.id,
        label: `${team.academyName} - ${team.teamName}`
      }))
  }, [teams])

  const sendToAll = async () => {
    setSending('all')
    setResults(null)
    setProgress(null)

    try {
      const grouped = new Map<string, { email: string; teams: Team[] }>()
      teams.forEach((team) => {
        if (!grouped.has(team.academyName)) {
          grouped.set(team.academyName, { email: team.academyEmail, teams: [] })
        }
        grouped.get(team.academyName)?.teams.push(team)
      })

      let success = 0
      let failed = 0
      let done = 0

      for (const [academyName, academyData] of grouped.entries()) {
        try {
          await sendQREmail(academyData.email, academyName, academyData.teams)
          await markTeamsAsSent(academyData.teams.map((t) => t.id))
          success++
        } catch (error) {
          console.error(`Send failed for ${academyName}:`, error)
          failed++
        }

        done++
        setProgress({
          current: done,
          total: grouped.size,
          text: `Sending emails... ${done}/${grouped.size}`
        })
      }

      setResults({ success, failed })
      showToast(`Done. Success: ${success}, Failed: ${failed}`, 'success')
    } catch (error) {
      console.error(error)
      showToast('Error sending QR codes', 'error')
    } finally {
      setSending('idle')
    }
  }

  const sendToAcademy = async () => {
    if (!selectedAcademy) {
      showToast('Please select an academy', 'warning')
      return
    }

    const academy = academyOptions.find((a) => a.name === selectedAcademy)
    const academyTeams = teams.filter((t) => t.academyName === selectedAcademy)

    if (!academy || !academyTeams.length) {
      showToast('No teams found for this academy', 'warning')
      return
    }

    setSending('academy')
    try {
      await sendQREmail(academy.email, academy.name, academyTeams)
      await markTeamsAsSent(academyTeams.map((t) => t.id))
      showToast(`QR codes sent to ${academy.name}`, 'success')
      setSelectedAcademy('')
    } catch (error) {
      console.error(error)
      showToast('Error sending QR codes', 'error')
    } finally {
      setSending('idle')
    }
  }

  const sendToTeam = async () => {
    if (!selectedTeamId) {
      showToast('Please select a team', 'warning')
      return
    }

    const team = teams.find((t) => t.id === selectedTeamId)
    if (!team) {
      showToast('Team not found', 'error')
      return
    }

    setSending('team')
    try {
      await sendQREmail(team.academyEmail, team.academyName, [team])
      await updateDoc(doc(db, 'teams', team.id), { qrSent: true })
      showToast('QR code sent', 'success')
      setSelectedTeamId('')
    } catch (error) {
      console.error(error)
      showToast('Error sending QR code', 'error')
    } finally {
      setSending('idle')
    }
  }

  const isSending = sending !== 'idle'

  return (
    <section>
      <h2>Send QR Codes</h2>

      <div className="card">
        <h3>📤 Send to All Academies</h3>
        <p className="text-muted">Sends QR codes to all academies + manager QR (if available)</p>

        <button
          type="button"
          className="btn btn-primary"
          onClick={sendToAll}
          disabled={isSending}
        >
          {sending === 'all' ? (
            <><span className="spinner" /> Sending...</>
          ) : (
            'Send to All'
          )}
        </button>

        {progress && (
          <div className="progress-container">
            <p>{progress.text}</p>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>

            {results && (
              <div className="results">
                <p>✅ {results.success} sent</p>
                <p>❌ {results.failed} failed</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h3>📤 Send to Specific Academy</h3>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="academySelect">Select Academy:</label>
            <select
              id="academySelect"
              className="form-control"
              value={selectedAcademy}
              onChange={(e) => setSelectedAcademy(e.target.value)}
            >
              <option value="">-- Select an Academy --</option>
              {academyOptions.map((academy) => (
                <option key={academy.name} value={academy.name}>
                  {academy.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <button
              type="button"
              className="btn btn-primary"
              onClick={sendToAcademy}
              disabled={isSending}
            >
              {sending === 'academy' ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>📤 Send to Specific Team</h3>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="teamSelect">Select Team:</label>
            <select
              id="teamSelect"
              className="form-control"
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
            >
              <option value="">-- Select a Team --</option>
              {teamOptions.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <button
              type="button"
              className="btn btn-primary"
              onClick={sendToTeam}
              disabled={isSending}
            >
              {sending === 'team' ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default SendQR