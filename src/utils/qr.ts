export const EXTRA_ALLOWED = 3

export const calculateAllowedCount = (membersCount: number): number => {
  return membersCount + EXTRA_ALLOWED
}

export const generateQRUrl = (data: string, size = 500): string => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`
}

export const sanitizeText = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  return String(value).replace(/[\r\n]+/g, ' ').trim()
}

export const sanitizeEmail = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  return String(value).replace(/\s+/g, '').trim()
}

export const parseMembersCount = (value: unknown): number => {
  if (value === null || value === undefined) return 0

  const text = String(value).trim()
  if (!text) return 0

  const num = parseInt(text, 10)
  if (!Number.isNaN(num) && num.toString() === text) {
    return num
  }

  if (text.includes('\n')) {
    return text.split('\n').filter((item) => item.trim() !== '').length
  }

  if (text.includes(',')) {
    return text.split(',').filter((item) => item.trim() !== '').length
  }

  return 1
}

export const formatFirestoreDate = (value: unknown): string => {
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toLocaleString()
  }

  return '—'
}

export const getMappedValue = (
  row: Record<string, unknown>,
  key: string,
  mapping: Partial<Record<string, string>>
): unknown => {
  const column = mapping[key]
  if (!column || column === '__NA__') return undefined
  return row[column]
}