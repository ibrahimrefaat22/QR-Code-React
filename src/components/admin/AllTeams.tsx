import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  writeBatch
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useToast } from '../../context/ToastContext'
import { calculateAllowedCount } from '../../utils/qr'
import type { Team } from '../../types'
import EditTeamModal from './EditTeamModal'

interface Props {
  setPageLoading: (value: boolean) => void
}

const AllTeams = ({ setPageLoading }: Props) => {
  const { showToast } = useToast()

  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const teamsQuery = query(collection(db, 'teams'), orderBy('createdAt', 'desc'))

    const unsubscribe = onSnapshot(
      teamsQuery,
      (snapshot) => {
        setTeams(
          snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Team, 'id'>)
          }))
        )
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error(err)
        showToast('Error loading teams', 'error')
        setError('Failed to load teams. Please refresh.')
        setLoading(false)
      }
    )

    return unsubscribe
  }, [])

  const filteredTeams = useMemo(() => {
    const term = search.toLowerCase().trim()
    if (!term) return teams

    return teams.filter((team) =>
      [team.academyName, team.teamName, team.teamNumber]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    )
  }, [teams, search])

  const handleDeleteTeam = useCallback(async (teamId: string) => {
    if (!window.confirm('Delete this team?')) return

    try {
      await deleteDoc(doc(db, 'teams', teamId))
      showToast('Team deleted', 'success')
    } catch (err) {
      console.error(err)
      showToast('Error deleting team', 'error')
    }
  }, [showToast])

  const handleDeleteAll = useCallback(async () => {
    if (!window.confirm('🚨 DANGER: Are you sure you want to delete ALL teams?')) return
    if (window.prompt('Type "DELETE" to confirm:') !== 'DELETE') {
      showToast('Deletion cancelled', 'warning')
      return
    }

    try {
      setDeleting(true)
      setPageLoading(true)

      const batchSize = 500
      for (let i = 0; i < teams.length; i += batchSize) {
        const batch = writeBatch(db)
        teams.slice(i, i + batchSize).forEach((team) => {
          batch.delete(doc(db, 'teams', team.id))
        })
        await batch.commit()
      }

      showToast('All teams deleted', 'success')
    } catch (err) {
      console.error(err)
      showToast('Error deleting all teams', 'error')
    } finally {
      setDeleting(false)
      setPageLoading(false)
    }
  }, [teams, showToast, setPageLoading])

  const renderTableBody = () => {
    if (loading) {
      return (
        <tr className="loading-row">
          <td colSpan={8} className="text-center">
            <span className="spinner" /> Loading teams...
          </td>
        </tr>
      )
    }

    if (error) {
      return (
        <tr>
          <td colSpan={8} className="text-center">
            <span style={{ color: 'var(--danger)' }}>{error}</span>
          </td>
        </tr>
      )
    }

    if (!teams.length) {
      return (
        <tr>
          <td colSpan={8} className="text-center">No teams yet.</td>
        </tr>
      )
    }

    if (!filteredTeams.length) {
      return (
        <tr>
          <td colSpan={8} className="text-center">No teams match your search.</td>
        </tr>
      )
    }

    return filteredTeams.map((team) => (
      <tr key={team.id}>
        <td>{team.teamNumber ?? '—'}</td>
        <td>{team.academyName}</td>
        <td>{team.academyEmail}</td>
        <td>{team.teamName}</td>
        <td>{team.membersCount}</td>
        <td>{team.allowedCount ?? calculateAllowedCount(team.membersCount)}</td>
        <td>
          <span className={`status-indicator ${team.qrSent ? 'sent' : 'pending'}`} />
          {team.qrSent ? 'Sent' : 'Pending'}
        </td>
        <td>
          <div className="table-actions">
            <button
              type="button"
              className="action-btn edit"
              onClick={() => setSelectedTeam(team)}
            >
              ✏️ Edit
            </button>
            <button
              type="button"
              className="action-btn delete"
              onClick={() => handleDeleteTeam(team.id)}
            >
              🗑️ Delete
            </button>
          </div>
        </td>
      </tr>
    ))
  }

  return (
    <section>
      <h2>All Teams</h2>

      <div className="card">
        <div className="section-controls">
          <input
            type="text"
            className="search-input"
            placeholder="Search by academy, team name, or team number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <button
            type="button"
            className="btn btn-danger"
            onClick={handleDeleteAll}
            disabled={deleting || loading}
          >
            {deleting ? 'Deleting...' : '🗑️ Delete All Teams'}
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Team #</th>
                <th>Academy Name</th>
                <th>Email</th>
                <th>Team Name</th>
                <th>Members</th>
                <th>Allowed Entry</th>
                <th>QR Sent</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>{renderTableBody()}</tbody>
          </table>
        </div>
      </div>

      {selectedTeam && (
        <EditTeamModal team={selectedTeam} onClose={() => setSelectedTeam(null)} />
      )}
    </section>
  )
}

export default AllTeams