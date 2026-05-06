import { memo } from 'react'

interface Props {
  show: boolean
  message?: string
}

const LoadingOverlay = ({ show, message }: Props) => {
  if (!show) return null

  return (
    <div
      className="loading-overlay"
      role="status"
      aria-live="polite"
      aria-label="Loading, please wait"
    >
      <div className="spinner large" />
      {message && <p className="loading-message">{message}</p>}
      <span className="sr-only">Loading...</span>
    </div>
  )
}

export default memo(LoadingOverlay)