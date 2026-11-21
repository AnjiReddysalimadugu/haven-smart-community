import { useEffect, useState } from 'react'

function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false
  const mq = window.matchMedia('(display-mode: standalone)').matches
  const ios = 'standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  return mq || ios
}

/** Admin mobile shell: narrow viewport or installed PWA / iOS Home Screen. */
export function useIsMobileAdmin() {
  const [mobile, setMobile] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 960px)').matches || isStandaloneDisplay()
  })

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 960px)')
    const update = () => setMobile(mq.matches || isStandaloneDisplay())
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return mobile
}
