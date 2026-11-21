import { useOnlineSync } from '../pwa/online'

export default function OnlineBanner() {
  const online = useOnlineSync()
  if (online) return null
  return (
    <div className="offline-banner" role="status">
      You're offline — reconnect to sync. Some screens may show a last saved snapshot when available.
    </div>
  )
}
