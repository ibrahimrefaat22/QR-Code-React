import { useEffect } from 'react'

let lockCount = 0

const lockScroll = () => {
  lockCount++
  document.body.style.overflow = 'hidden'
}

const unlockScroll = () => {
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount === 0) {
    document.body.style.overflow = ''
  }
}

export const useScrollLock = (active: boolean) => {
  useEffect(() => {
    if (!active) return
    lockScroll()
    return unlockScroll
  }, [active])
}