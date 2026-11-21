import { useEffect, useState } from 'react'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isIos() {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
}

/** Chromium install prompt + iOS Add-to-Home-Screen guidance (no false iOS BIP claims). */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [iosGuide, setIosGuide] = useState(false)

  useEffect(() => {
    const onBip = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBip)
    return () => window.removeEventListener('beforeinstallprompt', onBip)
  }, [])

  const installed = isStandalone()
  const showAndroidInstall = Boolean(deferred) && !installed
  const showIosGuide = isIos() && !installed

  return {
    installed,
    showAndroidInstall,
    showIosGuide,
    iosGuide,
    openIosGuide: () => setIosGuide(true),
    closeIosGuide: () => setIosGuide(false),
    installAndroid: async () => {
      if (!deferred) return
      await deferred.prompt()
      await deferred.userChoice
      setDeferred(null)
    },
  }
}
