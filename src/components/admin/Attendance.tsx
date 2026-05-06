import { useEffect, useMemo, useState } from 'react'
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  writeBatch
} from 'firebase/firestore'
import type { DocumentData, FirestoreError, QuerySnapshot } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useToast } from '../../context/ToastContext'
import { useTeams } from '../../context/TeamsContext'
import { calculateAllowedCount, formatFirestoreDate } from '../../utils/qr'
import type { AttendanceRecord, Team } from '../../types'

type AttendanceFilter = 'all' | 'checked-in' | 'not-checked-in'
type AttendanceTableRow = AttendanceRecord | Team

const isAttendanceRecord = (row: AttendanceTableRow): row is AttendanceRecord => {
  return 'teamId' in row
}

const Attendance = () => {
  const { showToast } = useToast()
  const { teams } = useTeams()

  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [loadingAttendance, setLoadingAttendance] = useState(true)
  const [filter, setFilter] = useState<AttendanceFilter>('all')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const attendanceQuery = query(
      collection(db, 'attendance'),
      orderBy('scannedAt', 'desc')
    )

    const unsubscribe = onSnapshot(
      attendanceQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        setAttendance(
          snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<AttendanceRecord, 'id'>)
          }))
        )
        setLoadingAttendance(false)
      },
      (error: FirestoreError) => {
        console.error(error)
        showToast('Error loading attendance', 'error')
        setLoadingAttendance(false)
      }
    )

    return unsubscribe
  }, [])

  const checkedInTeamIds = useMemo(() => {
    return new Set(
      attendance.filter((r) => !r.isManager).map((r) => r.teamId)
    )
  }, [attendance])

  const notCheckedInTeams = useMemo(() => {
    return teams.filter((team) => !checkedInTeamIds.has(team.id))
  }, [teams, checkedInTeamIds])

  const displayedRows = useMemo<AttendanceTableRow[]>(() => {
    if (filter === 'not-checked-in') return notCheckedInTeams
    return attendance
  }, [attendance, filter, notCheckedInTeams])

  const handleDeleteAll = async () => {
    if (!window.confirm('🚨 Delete ALL attendance records?')) return

    try {
      setDeleting(true)
      const batchSize = 500
      for (let i = 0; i < attendance.length; i += batchSize) {
        const batch = writeBatch(db)
        attendance.slice(i, i + batchSize).forEach((record) => {
          batch.delete(doc(db, 'attendance', record.id))
        })
        await batch.commit()
      }
      showToast('All attendance records deleted', 'success')
    } catch (error) {
      console.error(error)
      showToast('Error deleting attendance', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const exportToExcel = async () => {
    try {
      const XLSX = await import('xlsx')

      const exportRows = attendance.map((record) => ({
        'Team Number': record.teamNumber ?? '—',
        'Academy Name': record.academyName,
        'Team Name': record.teamName,
        Type: record.isManager ? 'Manager' : 'Team',
        Members: record.membersCount,
        'Allowed Entry': record.allowedCount ?? calculateAllowedCount(record.membersCount),
        'Check-in Time': formatFirestoreDate(record.scannedAt)
      }))

      const worksheet = XLSX.utils.json_to_sheet(exportRows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance')
      XLSX.writeFile(
        workbook,
        `GRC_Attendance_${new Date().toISOString().split('T')[0]}.xlsx`
      )

      showToast('Exported successfully', 'success')
    } catch (error) {
      console.error(error)
      showToast('Error exporting attendance', 'error')
    }
  }

  return (
    <section>
      <h2>Attendance Report</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{teams.length}</div>
          <div className="stat-label">Total Teams</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{checkedInTeamIds.size}</div>
          <div className="stat-label">Checked In</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{notCheckedInTeams.length}</div>
          <div className="stat-label">Not Yet</div>
        </div>
      </div>

      <div className="card">
        <div className="section-controls">
          <select
            className="form-control"
            value={filter}
            onChange={(e) => setFilter(e.target.value as AttendanceFilter)}
          >
            <option value="all">All</option>
            <option value="checked-in">Checked In</option>
            <option value="not-checked-in">Not Yet Checked In</option>
          </select>

          <button
            type="button"
            className="btn btn-success"
            onClick={exportToExcel}
          >
            📊 Export to Excel
          </button>

          <button
            type="button"
            className="btn btn-danger"
            onClick={handleDeleteAll}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : '🗑️ Delete All Attendance'}
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Team #</th>
                <th>Academy Name</th>
                <th>Team / Person</th>
                <th>Members</th>
                <th>Allowed Entry</th>
                <th>Check-in Time</th>
              </tr>
            </thead>

            <tbody>
              {loadingAttendance ? (
                <tr>
                  <td colSpan={6} className="text-center">
                    <span className="spinner" /> Loading...
                  </td>
                </tr>
              ) : !displayedRows.length ? (
                <tr>
                  <td colSpan={6} className="text-center">
                    No records found.
                  </td>
                </tr>
              ) : (
                displayedRows.map((item) => (
                  <tr key={item.id}>
                    <td>{item.teamNumber ?? '—'}</td>
                    <td>{item.academyName ?? ''}</td>
                    <td>
                      {item.teamName ?? ''}
                      {isAttendanceRecord(item) && item.isManager && (
                        <span className="badge badge-manager">Manager</span>
                      )}
                    </td>
                    <td>{item.membersCount ?? 0}</td>
                    <td className="allowed-count">
                      {item.allowedCount ?? calculateAllowedCount(item.membersCount)}
                    </td>
                    <td>
                      {isAttendanceRecord(item)
                        ? formatFirestoreDate(item.scannedAt)
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

export default Attendance