import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import jsQR from 'jsqr'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where
} from 'firebase/firestore'
import { Link } from 'react-router-dom'
import { db } from '../lib/firebase'
import { calculateAllowedCount, EXTRA_ALLOWED } from '../utils/qr'
import type { Team } from '../types'

interface ScannableTeam {
  id: string
  academyName: string
  teamName: string
  teamNumber?: string
  membersCount: number
  allowedCount: number
  isManager: boolean
  managerName?: string
  managerEmail?: string
}

type SearchResult =
  | { type: 'error'; message: string }
  | { type: 'found'; team: Team }
  | null

const ScannerPage = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationRef = useRef<number | null>(null)
  const processingRef = useRef(false)
  const usingFrontRef = useRef(false)

  const [usingFront, setUsingFront] = useState(false)
  const [cameraError, setCameraError] = useState(false)
  const [scanError, setScanError] = useState('')
  const [scanWarning, setScanWarning] = useState('')
  const [manualInput, setManualInput] = useState('')
  const [teamNumberSearch, setTeamNumberSearch] = useState('')
  const [searchResult, setSearchResult] = useState<SearchResult>(null)
  const [successData, setSuccessData] = useState<ScannableTeam | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)

  const stopCamera = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  const resetScannerLater = (ms: number) => {
    window.setTimeout(() => {
      processingRef.current = false
    }, ms)
  }

  const findTeam = async (qrData: string): Promise<ScannableTeam | null> => {
    const isManagerQR = qrData.startsWith('manager_')
    const realId = isManagerQR ? qrData.replace('manager_', '') : qrData

    try {
      const teamSnap = await getDoc(doc(db, 'teams', realId))
      if (teamSnap.exists()) {
        const data = teamSnap.data() as Omit<Team, 'id'>
        if (isManagerQR) {
          return {
            id: teamSnap.id,
            academyName: data.academyName,
            teamName: data.managerName ?? 'Manager',
            teamNumber: data.teamNumber ?? '',
            membersCount: 1,
            allowedCount: 1,
            isManager: true,
            managerName: data.managerName,
            managerEmail: data.managerEmail
          }
        }
        return {
          id: teamSnap.id,
          academyName: data.academyName,
          teamName: data.teamName,
          teamNumber: data.teamNumber ?? '',
          membersCount: data.membersCount,
          allowedCount: data.allowedCount ?? calculateAllowedCount(data.membersCount),
          isManager: false,
          managerName: data.managerName,
          managerEmail: data.managerEmail
        }
      }
    } catch {
      // continue to next lookup
    }

    try {
      const exactSnap = await getDocs(
        query(collection(db, 'teams'), where('teamName', '==', qrData))
      )
      if (!exactSnap.empty) {
        const match = exactSnap.docs[0]
        const data = match.data() as Omit<Team, 'id'>
        return {
          id: match.id,
          academyName: data.academyName,
          teamName: data.teamName,
          teamNumber: data.teamNumber ?? '',
          membersCount: data.membersCount,
          allowedCount: data.allowedCount ?? calculateAllowedCount(data.membersCount),
          isManager: false,
          managerName: data.managerName,
          managerEmail: data.managerEmail
        }
      }
    } catch {
      // continue to next lookup
    }

    try {
      const allSnap = await getDocs(collection(db, 'teams'))
      const found = allSnap.docs.find(
        (d) =>
          String(d.data().teamName ?? '').toLowerCase() === qrData.toLowerCase()
      )
      if (found) {
        const data = found.data() as Omit<Team, 'id'>
        return {
          id: found.id,
          academyName: data.academyName,
          teamName: data.teamName,
          teamNumber: data.teamNumber ?? '',
          membersCount: data.membersCount,
          allowedCount: data.allowedCount ?? calculateAllowedCount(data.membersCount),
          isManager: false,
          managerName: data.managerName,
          managerEmail: data.managerEmail
        }
      }
    } catch {
      // not found
    }

    return null
  }

  const handleQRData = useCallback(async (qrData: string) => {
    processingRef.current = true
    setScanError('')
    setScanWarning('')

    try {
      const teamData = await findTeam(qrData)

      if (!teamData) {
        setScanError('❌ Team not found.')
        resetScannerLater(4000)
        return
      }

      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('teamId', '==', teamData.id),
        where('isManager', '==', teamData.isManager)
      )
      const attendanceSnap = await getDocs(attendanceQuery)

      if (!attendanceSnap.empty) {
        setScanWarning('⚠️ Already checked in earlier')
        resetScannerLater(4000)
        return
      }

      const allowedCount = teamData.allowedCount ?? calculateAllowedCount(teamData.membersCount)

      await addDoc(collection(db, 'attendance'), {
        teamId: teamData.id,
        teamName: teamData.teamName,
        academyName: teamData.academyName,
        teamNumber: teamData.teamNumber ?? '',
        membersCount: teamData.membersCount,
        allowedCount,
        isManager: teamData.isManager ?? false,
        managerName: teamData.managerName ?? '',
        scannedAt: serverTimestamp(),
        scannedBy: 'scanner'
      })

      setSuccessData({ ...teamData, allowedCount })
    } catch (error) {
      console.error(error)
      setScanError('❌ Error. Please try again.')
      resetScannerLater(3000)
    }
  }, [])

  const startCamera = useCallback(
    async (front: boolean) => {
      stopCamera()
      processingRef.current = false
      setScanError('')
      setScanWarning('')
      setCameraError(false)

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(true)
        return
      }

      const startLoop = () => {
        const tick = () => {
          const video = videoRef.current
          const canvas = canvasRef.current
          if (!video || !canvas || !video.srcObject) return
          if (processingRef.current) return

          const width = video.videoWidth
          const height = video.videoHeight
          if (!width || !height) {
            animationRef.current = requestAnimationFrame(tick)
            return
          }

          const scale = Math.min(640 / width, 640 / height, 1)
          const targetWidth = Math.floor(width * scale)
          const targetHeight = Math.floor(height * scale)

          if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
            canvas.width = targetWidth
            canvas.height = targetHeight
          }

          const ctx = canvas.getContext('2d')
          if (!ctx) return

          ctx.drawImage(video, 0, 0, targetWidth, targetHeight)
          const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight)
          const code = jsQR(imageData.data, targetWidth, targetHeight, {
            inversionAttempts: 'dontInvert'
          })

          if (code?.data?.trim()) {
            processingRef.current = true
            if (animationRef.current) {
              cancelAnimationFrame(animationRef.current)
              animationRef.current = null
            }
            void handleQRData(code.data.trim())
            return
          }

          animationRef.current = requestAnimationFrame(tick)
        }
        animationRef.current = requestAnimationFrame(tick)
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: front ? 'user' : { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.setAttribute('playsinline', 'true')
          videoRef.current.muted = true
          await videoRef.current.play()
        }
        startLoop()
      } catch {
        try {
          const fallback = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          })
          streamRef.current = fallback
          if (videoRef.current) {
            videoRef.current.srcObject = fallback
            videoRef.current.setAttribute('playsinline', 'true')
            videoRef.current.muted = true
            await videoRef.current.play()
          }
          startLoop()
        } catch {
          setCameraError(true)
        }
      }
    },
    [handleQRData, stopCamera]
  )

  useEffect(() => {
    usingFrontRef.current = usingFront
  }, [usingFront])

  useEffect(() => {
    void startCamera(false)
    return stopCamera
  }, [startCamera, stopCamera])

  const handleManualEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && manualInput.trim()) {
      void handleQRData(manualInput.trim())
      setManualInput('')
    }
  }

  const searchByTeamNumber = async () => {
    if (!teamNumberSearch.trim()) return
    setSearchLoading(true)
    setSearchResult(null)

    try {
      const snapshot = await getDocs(
        query(
          collection(db, 'teams'),
          where('teamNumber', '==', teamNumberSearch.trim())
        )
      )

      if (snapshot.empty) {
        setSearchResult({
          type: 'error',
          message: `❌ No team found with number "${teamNumberSearch.trim()}"`
        })
        return
      }

      const d = snapshot.docs[0]
      setSearchResult({
        type: 'found',
        team: { id: d.id, ...(d.data() as Omit<Team, 'id'>) }
      })
    } catch (error) {
      console.error(error)
      setSearchResult({ type: 'error', message: '❌ Error searching. Try again.' })
    } finally {
      setSearchLoading(false)
    }
  }

  const handleFoundTeamCheckin = async () => {
    if (!searchResult || searchResult.type !== 'found') return
    setSearchLoading(true)
    await handleQRData(searchResult.team.id)
    setTeamNumberSearch('')
    setSearchResult(null)
    setSearchLoading(false)
  }

  const handleSuccessClose = async () => {
    setSuccessData(null)
    processingRef.current = false
    await startCamera(usingFrontRef.current)
  }

  return (
    <div className="scanner-page">
      <div className="scanner-container">
        <div className="scanner-header">
          <h1>Team Check-in</h1>
          <p>Scan QR Code to Check In</p>
        </div>

        <div className="camera-wrapper">
          <video ref={videoRef} className="camera-feed" autoPlay muted playsInline />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {cameraError && (
            <div className="camera-error">
              <p>📷 Camera not available</p>
              <p className="text-muted">Please allow camera access</p>
            </div>
          )}

          <div className="scanning-indicator">
            <div className="scan-line" />
            <p>Position QR code in the frame</p>
          </div>
        </div>

        {scanError && (
          <div className="alert alert-error" role="alert">
            {scanError}
          </div>
        )}
        {scanWarning && (
          <div className="alert alert-warning" role="alert">
            {scanWarning}
          </div>
        )}

        {successData && (
          <div className="scan-success-modal">
            <div className="scan-success-card">
              <div className="scan-success-icon">✅</div>
              <h2>Check-in Successful!</h2>

              <div className="scan-success-details">
                <p className="scan-team-name">
                  {successData.isManager ? (
                    <>👤 {successData.managerName ?? 'Manager'}</>
                  ) : (
                    <>
                      {successData.teamNumber && (
                        <span className="team-number-badge">
                          #{successData.teamNumber}
                        </span>
                      )}
                      {successData.teamName}
                    </>
                  )}
                </p>

                <p className="scan-academy">
                  {successData.teamNumber
                    ? `${successData.academyName} — Team #${successData.teamNumber}`
                    : successData.academyName}
                </p>

                <p className="scan-members">
                  {successData.isManager
                    ? '👤 1 person — Academy Manager'
                    : `✅ ${successData.allowedCount} allowed to enter (${successData.membersCount} students + 1 coach + 2 supervisors)`}
                </p>

                <p className="scan-time">⏰ {new Date().toLocaleTimeString()}</p>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={() => void handleSuccessClose()}
              >
                ✅ OK — Scan Next
              </button>
            </div>
          </div>
        )}

        <div className="manual-input-section">
          <p className="text-muted text-center">OR enter manually</p>
          <input
            type="text"
            className="manual-qr-input"
            placeholder="Type Team Name and press Enter..."
            autoComplete="off"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={handleManualEnter}
          />
        </div>

        <div className="manual-input-section">
          <p className="text-muted text-center">OR search by team number</p>
          <div className="search-row">
            <input
              type="text"
              className="manual-qr-input"
              placeholder="Enter Team Number (e.g. 001)..."
              autoComplete="off"
              value={teamNumberSearch}
              onChange={(e) => setTeamNumberSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void searchByTeamNumber()
              }}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void searchByTeamNumber()}
            >
              🔍 Search
            </button>
          </div>

          {searchResult && (
            <div className="search-result-card">
              {searchResult.type === 'error' ? (
                <div className="search-error">{searchResult.message}</div>
              ) : (
                <>
                  <div className="search-team-info">
                    <span className="search-team-name">
                      {searchResult.team.teamNumber && (
                        <span className="team-number-badge">
                          #{searchResult.team.teamNumber}
                        </span>
                      )}
                      {searchResult.team.teamName}
                    </span>
                    <span className="search-academy">🏫 {searchResult.team.academyName}</span>
                    <span className="search-allowed">
                      ✅{' '}
                      {searchResult.team.allowedCount ??
                        calculateAllowedCount(searchResult.team.membersCount)}{' '}
                      allowed to enter
                    </span>
                  </div>

                  <button
                    type="button"
                    className="btn btn-success btn-block"
                    onClick={() => void handleFoundTeamCheckin()}
                    disabled={searchLoading}
                  >
                    {searchLoading ? '⏳ Processing...' : '✅ Check In This Team'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="scanner-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              const next = !usingFront
              setUsingFront(next)
              void startCamera(next)
            }}
          >
            🔄 Switch Camera
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void startCamera(usingFront)}
          >
            🔃 Refresh
          </button>
        </div>

        <div className="scanner-footer">
          <p>
            📋 <Link to="/login">Admin Login</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default ScannerPage