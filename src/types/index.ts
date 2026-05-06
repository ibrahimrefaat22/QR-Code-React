import type { FieldValue, Timestamp } from 'firebase/firestore'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export type SectionId = 'add-teams' | 'all-teams' | 'send-qr' | 'attendance'

export interface UserProfile {
  name?: string
  role: string
  disabled?: boolean
}

export interface Team {
  id: string
  academyName: string
  academyEmail: string
  teamName: string
  teamNumber?: string
  membersCount: number
  allowedCount: number
  managerName?: string
  managerEmail?: string
  qrCode?: string
  managerQrCode?: string
  qrSent?: boolean
  createdAt?: Timestamp | FieldValue | null
}

export interface TeamPayload {
  academyName: string
  academyEmail: string
  teamName: string
  teamNumber?: string
  membersCount: number
  allowedCount: number
  managerName?: string
  managerEmail?: string
  qrCode: string
  managerQrCode: string
  qrSent: boolean
  createdAt: FieldValue
}

export interface AttendanceRecord {
  id: string
  teamId: string
  teamName: string
  academyName: string
  teamNumber?: string
  membersCount: number
  allowedCount: number
  isManager: boolean
  managerName?: string
  scannedAt?: Timestamp | FieldValue | null
  scannedBy?: string
}

export interface ToastState {
  id: number
  message: string
  type: ToastType
}

export interface ProgressState {
  current: number
  total: number
  text: string
}

export type ExcelFieldKey =
  | 'academyName'
  | 'academyEmail'
  | 'teamName'
  | 'teamNumber'
  | 'membersCount'
  | 'managerName'
  | 'managerEmail'

export type ExcelRow = Record<string, unknown>
export type ColumnMapping = Partial<Record<ExcelFieldKey, string>>