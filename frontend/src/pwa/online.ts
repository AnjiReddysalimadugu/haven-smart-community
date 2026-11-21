import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

/** Sync-on-reconnect for browsers that fire `online` (not Background Sync dependent). */
export function useOnlineSync() {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )
  const qc = useQueryClient()

  useEffect(() => {
    const on = () => {
      setOnline(true)
      void qc.invalidateQueries()
    }
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [qc])

  return online
}
