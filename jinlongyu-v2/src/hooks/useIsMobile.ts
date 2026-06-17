import { useEffect, useState } from 'react'

export const MOBILE_BREAKPOINT_PX = 768

const QUERY = `(max-width: ${MOBILE_BREAKPOINT_PX}px)`

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(QUERY).matches
  })

  useEffect(() => {
    const mq = window.matchMedia(QUERY)
    const onChange = () => setIsMobile(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return isMobile
}

export function syncPlatformMobileClass(isMobile: boolean) {
  document.documentElement.classList.toggle('platform-mobile', isMobile)
}
