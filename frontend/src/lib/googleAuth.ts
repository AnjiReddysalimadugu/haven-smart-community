const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void
          prompt: (cb?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void
          cancel: () => void
        }
        oauth2: {
          initTokenClient: (config: Record<string, unknown>) => { requestAccessToken: () => void }
        }
      }
    }
  }
}

export function googleWebClientId(): string {
  return (import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID as string | undefined)?.trim() || ''
}

export function isGoogleWebConfigured(): boolean {
  return Boolean(googleWebClientId())
}

export function validateLoginEmail(email: string): string | null {
  const v = email.trim().toLowerCase()
  if (!v) return 'Enter your registered email'
  if (v.length > 254) return 'Email is too long'
  if (!EMAIL_RE.test(v)) return 'Enter a valid email address'
  return null
}

export function validateOtp(otp: string): string | null {
  if (!/^\d{6}$/.test(otp.trim())) return 'Enter the 6-digit OTP'
  return null
}

export function isLikelyJwt(token: string): boolean {
  return token.split('.').length === 3 && token.length >= 80 && token.length <= 4096
}

let gisPromise: Promise<void> | null = null

export function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('No window'))
  if (window.google?.accounts?.id) return Promise.resolve()
  if (gisPromise) return gisPromise
  gisPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-haven-gis="1"]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity')))
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.dataset.havenGis = '1'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Identity'))
    document.head.appendChild(script)
  })
  return gisPromise
}

/**
 * Opens Google One Tap / credential picker and resolves with an ID token.
 */
export async function promptGoogleIdToken(): Promise<string> {
  const clientId = googleWebClientId()
  if (!clientId) throw new Error('Google Web client ID is not configured (VITE_GOOGLE_WEB_CLIENT_ID)')

  await loadGoogleIdentityScript()
  if (!window.google?.accounts?.id) throw new Error('Google Identity Services unavailable')

  return new Promise((resolve, reject) => {
    let settled = false
    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      fn()
    }

    window.google!.accounts.id.initialize({
      client_id: clientId,
      callback: (response: { credential?: string }) => {
        const token = response.credential?.trim() || ''
        if (!isLikelyJwt(token)) {
          finish(() => reject(new Error('Google did not return a valid ID token')))
          return
        }
        finish(() => resolve(token))
      },
      auto_select: false,
      cancel_on_tap_outside: true,
      context: 'signin',
      ux_mode: 'popup',
      itp_support: true,
    })

    window.google!.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // Fallback: use a temporary button click via oauth popup style — render hidden button
        const host = document.createElement('div')
        host.style.position = 'fixed'
        host.style.left = '-9999px'
        document.body.appendChild(host)
        try {
          window.google!.accounts.id.renderButton(host, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            shape: 'pill',
            width: 280,
          })
          const btn = host.querySelector('div[role="button"]') as HTMLElement | null
          btn?.click()
        } catch (e) {
          finish(() => reject(e instanceof Error ? e : new Error('Google prompt unavailable')))
        } finally {
          setTimeout(() => host.remove(), 4000)
        }
      }
    })

    // Safety timeout so UI does not hang forever
    setTimeout(() => {
      finish(() => reject(new Error('Google sign-in timed out. Try again.')))
    }, 120_000)
  })
}
