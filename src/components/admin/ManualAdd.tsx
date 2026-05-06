import { useState, type ChangeEvent, type FormEvent } from 'react'
import { collection, doc, serverTimestamp, setDoc, type FieldValue } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useToast } from '../../context/ToastContext'
import { calculateAllowedCount, generateQRUrl } from '../../utils/qr'
import type { TeamPayload } from '../../types'

interface ManualFormState {
  academyName: string
  academyEmail: string
  teamNumber: string
  teamName: string
  membersCount: string
  managerName: string
  managerEmail: string
}

const initialState: ManualFormState = {
  academyName: '',
  academyEmail: '',
  teamNumber: '',
  teamName: '',
  membersCount: '',
  managerName: '',
  managerEmail: ''
}

const ManualAdd = () => {
  const { showToast } = useToast()
  const [form, setForm] = useState<ManualFormState>(initialState)
  const [submitting, setSubmitting] = useState(false)

  const handleChange =
    (field: keyof ManualFormState) => (event: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }))
    }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true)

    try {
      const membersCount = parseInt(form.membersCount, 10) || 1
      const newDocRef = doc(collection(db, 'teams'))
      const qrCode = generateQRUrl(newDocRef.id)
      const managerQrCode = form.managerName.trim()
        ? generateQRUrl(`manager_${newDocRef.id}`)
        : ''

      const payload: TeamPayload = {
        academyName: form.academyName.trim(),
        academyEmail: form.academyEmail.trim(),
        teamNumber: form.teamNumber.trim(),
        teamName: form.teamName.trim(),
        membersCount,
        allowedCount: calculateAllowedCount(membersCount),
        managerName: form.managerName.trim(),
        managerEmail: form.managerEmail.trim(),
        qrCode,
        managerQrCode,
        qrSent: false,
        createdAt: serverTimestamp() as FieldValue
      }

      await setDoc(newDocRef, payload)

      showToast('Team added successfully', 'success')
      setForm(initialState)
    } catch (error) {
      console.error(error)
      showToast('Error adding team', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="card">
      <h3>Add Team Manually</h3>

      <form className="form" onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="manualAcademyName">Academy Name *</label>
            <input
              id="manualAcademyName"
              type="text"
              required
              placeholder="E.g., Tech Academy"
              value={form.academyName}
              onChange={handleChange('academyName')}
            />
          </div>

          <div className="form-group">
            <label htmlFor="manualAcademyEmail">Academy Email *</label>
            <input
              id="manualAcademyEmail"
              type="email"
              required
              placeholder="info@academy.com"
              value={form.academyEmail}
              onChange={handleChange('academyEmail')}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="manualTeamNumber">Team Number</label>
            <input
              id="manualTeamNumber"
              type="text"
              placeholder="E.g., 001"
              value={form.teamNumber}
              onChange={handleChange('teamNumber')}
            />
          </div>

          <div className="form-group">
            <label htmlFor="manualTeamName">Team Name *</label>
            <input
              id="manualTeamName"
              type="text"
              required
              placeholder="E.g., Team A"
              value={form.teamName}
              onChange={handleChange('teamName')}
            />
          </div>

          <div className="form-group">
            <label htmlFor="manualMembersCount">Members Count *</label>
            <input
              id="manualMembersCount"
              type="number"
              required
              min="1"
              max="100"
              placeholder="E.g., 5"
              value={form.membersCount}
              onChange={handleChange('membersCount')}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="manualManagerName">
              Manager Name <span className="optional-label">(optional)</span>
            </label>
            <input
              id="manualManagerName"
              type="text"
              placeholder="E.g., Ahmed Hassan"
              value={form.managerName}
              onChange={handleChange('managerName')}
            />
          </div>

          <div className="form-group">
            <label htmlFor="manualManagerEmail">
              Manager Email <span className="optional-label">(optional)</span>
            </label>
            <input
              id="manualManagerEmail"
              type="email"
              placeholder="manager@academy.com"
              value={form.managerEmail}
              onChange={handleChange('managerEmail')}
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? <span className="spinner" /> : '✓ Add Team'}
        </button>
      </form>
    </div>
  )
}

export default ManualAdd