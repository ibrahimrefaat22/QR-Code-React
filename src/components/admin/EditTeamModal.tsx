import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useToast } from '../../context/ToastContext'
import { calculateAllowedCount } from '../../utils/qr'
import { useScrollLock } from '../../hooks/useScrollLock'
import type { Team } from '../../types'

interface Props {
  team: Team
  onClose: () => void
}

interface EditFormState {
  academyName: string
  academyEmail: string
  teamNumber: string
  teamName: string
  membersCount: string
  managerName: string
  managerEmail: string
}

const buildFormState = (team: Team): EditFormState => ({
  academyName: team.academyName ?? '',
  academyEmail: team.academyEmail ?? '',
  teamNumber: team.teamNumber ?? '',
  teamName: team.teamName ?? '',
  membersCount: String(team.membersCount ?? 1),
  managerName: team.managerName ?? '',
  managerEmail: team.managerEmail ?? ''
})

const EditTeamModal = ({ team, onClose }: Props) => {
  const { showToast } = useToast()
  const firstInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<EditFormState>(() => buildFormState(team))
  const [submitting, setSubmitting] = useState(false)

  useScrollLock(true)

  useEffect(() => {
    setForm(buildFormState(team))
  }, [team.id])

  useEffect(() => {
    firstInputRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleChange =
    (field: keyof EditFormState) => (event: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }))
    }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    try {
      setSubmitting(true)
      const membersCount = parseInt(form.membersCount, 10) || 1

      await updateDoc(doc(db, 'teams', team.id), {
        academyName: form.academyName.trim(),
        academyEmail: form.academyEmail.trim(),
        teamNumber: form.teamNumber.trim(),
        teamName: form.teamName.trim(),
        membersCount,
        allowedCount: calculateAllowedCount(membersCount),
        managerName: form.managerName.trim(),
        managerEmail: form.managerEmail.trim()
      })

      showToast('Team updated successfully', 'success')
      onClose()
    } catch (error) {
      console.error(error)
      showToast('Error updating team', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Team</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="editAcademyName">Academy Name</label>
            <input
              ref={firstInputRef}
              id="editAcademyName"
              type="text"
              required
              value={form.academyName}
              onChange={handleChange('academyName')}
            />
          </div>

          <div className="form-group">
            <label htmlFor="editAcademyEmail">Academy Email</label>
            <input
              id="editAcademyEmail"
              type="email"
              required
              value={form.academyEmail}
              onChange={handleChange('academyEmail')}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="editTeamNumber">Team Number</label>
              <input
                id="editTeamNumber"
                type="text"
                value={form.teamNumber}
                onChange={handleChange('teamNumber')}
              />
            </div>

            <div className="form-group">
              <label htmlFor="editTeamName">Team Name</label>
              <input
                id="editTeamName"
                type="text"
                required
                value={form.teamName}
                onChange={handleChange('teamName')}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="editMembersCount">Members Count</label>
            <input
              id="editMembersCount"
              type="number"
              min="1"
              required
              value={form.membersCount}
              onChange={handleChange('membersCount')}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="editManagerName">Manager Name</label>
              <input
                id="editManagerName"
                type="text"
                value={form.managerName}
                onChange={handleChange('managerName')}
              />
            </div>

            <div className="form-group">
              <label htmlFor="editManagerEmail">Manager Email</label>
              <input
                id="editManagerEmail"
                type="email"
                value={form.managerEmail}
                onChange={handleChange('managerEmail')}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditTeamModal