import { useMemo, useState, type ChangeEvent } from 'react'
import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
  writeBatch,
  type FieldValue
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useToast } from '../../context/ToastContext'
import {
  calculateAllowedCount,
  generateQRUrl,
  getMappedValue,
  parseMembersCount,
  sanitizeEmail,
  sanitizeText
} from '../../utils/qr'
import type {
  ColumnMapping,
  ExcelFieldKey,
  ExcelRow,
  ProgressState,
  TeamPayload
} from '../../types'

interface Props {
  setPageLoading: (value: boolean) => void
}

const OPTIONAL_FIELDS: ExcelFieldKey[] = ['teamNumber', 'managerName', 'managerEmail']

const ALL_FIELDS: { key: ExcelFieldKey; label: string; required: boolean }[] = [
  { key: 'academyName', label: 'Academy Name', required: true },
  { key: 'academyEmail', label: 'Academy Email', required: true },
  { key: 'teamNumber', label: 'Team Number', required: false },
  { key: 'teamName', label: 'Team Name', required: true },
  { key: 'membersCount', label: 'Members Count', required: true },
  { key: 'managerName', label: 'Manager Name', required: false },
  { key: 'managerEmail', label: 'Manager Email', required: false }
]

const ImportExcel = ({ setPageLoading }: Props) => {
  const { showToast } = useToast()

  const [excelRows, setExcelRows] = useState<ExcelRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [progress, setProgress] = useState<ProgressState | null>(null)
  const [importing, setImporting] = useState(false)

  const canPreview = useMemo(
    () =>
      Boolean(
        mapping.academyName &&
          mapping.academyEmail &&
          mapping.teamName &&
          mapping.membersCount
      ),
    [mapping]
  )

  const previewRows = useMemo(() => {
    if (!canPreview) return []

    return excelRows.slice(0, 5).map((row) => {
      const members = parseMembersCount(getMappedValue(row, 'membersCount', mapping))
      return {
        academyName: sanitizeText(getMappedValue(row, 'academyName', mapping)),
        academyEmail: sanitizeEmail(getMappedValue(row, 'academyEmail', mapping)),
        teamNumber:
          mapping.teamNumber && mapping.teamNumber !== '__NA__'
            ? sanitizeText(getMappedValue(row, 'teamNumber', mapping))
            : '—',
        teamName: sanitizeText(getMappedValue(row, 'teamName', mapping)),
        membersCount: members,
        allowedCount: calculateAllowedCount(members),
        managerName:
          mapping.managerName && mapping.managerName !== '__NA__'
            ? sanitizeText(getMappedValue(row, 'managerName', mapping))
            : '—'
      }
    })
  }, [canPreview, excelRows, mapping])

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const XLSX = await import('xlsx')
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(firstSheet) as ExcelRow[]

      if (!data.length) {
        showToast('Excel file is empty', 'error')
        return
      }

      setExcelRows(data)
      setHeaders(Object.keys(data[0]))
      setMapping({})
    } catch (error) {
      console.error(error)
      showToast('Error reading Excel file', 'error')
    }
  }

  const handleImport = async () => {
    if (importing) return

    try {
      setImporting(true)
      setPageLoading(true)

      const teamsToImport: TeamPayload[] = []
      let currentTeam: TeamPayload | null = null

      for (const row of excelRows) {
        const academyName = sanitizeText(getMappedValue(row, 'academyName', mapping))
        const academyEmail = sanitizeEmail(getMappedValue(row, 'academyEmail', mapping))
        const teamName = sanitizeText(getMappedValue(row, 'teamName', mapping))
        const teamNumber = sanitizeText(getMappedValue(row, 'teamNumber', mapping))
        const managerName = sanitizeText(getMappedValue(row, 'managerName', mapping))
        const managerEmail = sanitizeEmail(getMappedValue(row, 'managerEmail', mapping))
        const membersRaw = getMappedValue(row, 'membersCount', mapping)

        if (academyName && teamName) {
          currentTeam = {
            academyName,
            academyEmail,
            teamName,
            teamNumber,
            membersCount: 0,
            allowedCount: 0,
            managerName,
            managerEmail,
            qrCode: '',
            managerQrCode: '',
            qrSent: false,
            createdAt: serverTimestamp() as FieldValue
          }
          teamsToImport.push(currentTeam)
        }

        if (currentTeam && membersRaw !== undefined) {
          currentTeam.membersCount += parseMembersCount(membersRaw)
        }
      }

      const validTeams = teamsToImport
        .map((team) => ({ ...team, allowedCount: calculateAllowedCount(team.membersCount) }))
        .filter((team) => team.academyName && team.teamName && team.membersCount > 0)

      if (!validTeams.length) {
        showToast('No valid teams found to import', 'warning')
        return
      }

      const batchSize = 500
      let processed = 0

      for (let i = 0; i < validTeams.length; i += batchSize) {
        const batch = writeBatch(db)
        const chunk = validTeams.slice(i, i + batchSize)

        chunk.forEach((team) => {
          const newDocRef = doc(collection(db, 'teams'))
          const qrCode = generateQRUrl(newDocRef.id)
          const managerQrCode = team.managerName
            ? generateQRUrl(`manager_${newDocRef.id}`)
            : ''
          batch.set(newDocRef, { ...team, qrCode, managerQrCode })
        })

        await batch.commit()
        processed += chunk.length

        setProgress({
          current: processed,
          total: validTeams.length,
          text: `Importing teams... ${processed}/${validTeams.length}`
        })
      }

      showToast(`Successfully imported ${validTeams.length} teams`, 'success')
      setExcelRows([])
      setHeaders([])
      setMapping({})
    } catch (error) {
      console.error(error)
      showToast('Error importing teams', 'error')
    } finally {
      setImporting(false)
      setPageLoading(false)
      setProgress(null)
    }
  }

  const handleCancel = () => {
    setExcelRows([])
    setHeaders([])
    setMapping({})
  }

  return (
    <div className="card">
      <h3>Import Teams from Excel</h3>

      <div className="form-group">
        <label htmlFor="excelFile">Select Excel File (.xlsx, .xls)</label>
        <input
          id="excelFile"
          type="file"
          accept=".xlsx,.xls"
          className="file-input"
          onChange={handleFileChange}
        />
      </div>

      {headers.length > 0 && (
        <div className="column-mapper">
          <h4>Map Your Columns</h4>
          <p className="text-muted">Select which column corresponds to each field</p>

          {ALL_FIELDS.map((field) => (
            <div className="mapper-row" key={field.key}>
              <label>
                {field.label}
                {field.required ? (
                  <span className="required-star"> *</span>
                ) : (
                  <span className="optional-label"> (optional)</span>
                )}
              </label>

              <select
                className="form-control"
                value={mapping[field.key] ?? ''}
                onChange={(e) =>
                  setMapping((prev) => ({ ...prev, [field.key]: e.target.value }))
                }
              >
                <option value="">-- Select Column --</option>
                {headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
                {OPTIONAL_FIELDS.includes(field.key) && (
                  <option value="__NA__">-- Not in file --</option>
                )}
              </select>
            </div>
          ))}

          {canPreview && (
            <div className="table-preview">
              <h4>Preview Data</h4>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Academy</th>
                      <th>Email</th>
                      <th>Team #</th>
                      <th>Team Name</th>
                      <th>Members</th>
                      <th>Allowed Entry</th>
                      <th>Manager</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, index) => (
                      <tr key={`${row.teamName}-${index}`}>
                        <td>{row.academyName}</td>
                        <td>{row.academyEmail}</td>
                        <td>{row.teamNumber}</td>
                        <td>{row.teamName}</td>
                        <td>{row.membersCount}</td>
                        <td>
                          {row.allowedCount} <small>(+3)</small>
                        </td>
                        <td>{row.managerName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="import-actions">
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handleImport}
                  disabled={importing}
                >
                  {importing ? 'Importing...' : '✓ Import Teams'}
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCancel}
                  disabled={importing}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {progress && (
            <div className="progress-container">
              <p>{progress.text}</p>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${(progress.current / progress.total) * 100}%`
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ImportExcel