import { deviceApi } from '../services'

export function pushSupported() {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
}

export function webPushStatus() {
  if (!pushSupported()) return 'unsupported'
  return Notification.permission
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i)
  return out
}

export async function enableWebPush(): Promise<string> {
  if (!pushSupported()) return 'Web Push is not supported here.'
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'Permission denied.'

  const { publicKey } = await deviceApi.vapidPublicKey()
  if (!publicKey) return 'Server has no VAPID public key configured.'

  const reg = await navigator.serviceWorker.ready
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
  }
  await deviceApi.registerPush(JSON.stringify(sub.toJSON()), 'WEB')
  return 'Web push enabled for this browser.'
}

export async function updateAppBadge(count: number) {
  try {
    const nav = navigator as Navigator & {
      setAppBadge?: (n?: number) => Promise<void>
      clearAppBadge?: () => Promise<void>
    }
    if (count > 0 && nav.setAppBadge) await nav.setAppBadge(count)
    else if (nav.clearAppBadge) await nav.clearAppBadge()
  } catch {
    /* badge unsupported */
  }
}
