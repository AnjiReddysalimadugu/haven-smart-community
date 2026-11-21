import { Platform } from 'react-native'
import * as Google from 'expo-auth-session/providers/google'
import type { AuthSessionResult } from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import Constants from 'expo-constants'

WebBrowser.maybeCompleteAuthSession()

function extra(key: string): string {
  const fromEnv = (process.env as Record<string, string | undefined>)[key]
  if (fromEnv?.trim()) return fromEnv.trim()
  const ex = Constants.expoConfig?.extra as Record<string, string | undefined> | undefined
  return (ex?.[key] || '').trim()
}

export function googleClientIds() {
  return {
    webClientId: extra('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID') || extra('googleWebClientId'),
    androidClientId: extra('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID') || extra('googleAndroidClientId'),
    iosClientId: extra('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID') || extra('googleIosClientId'),
  }
}

/** True when at least the platform-appropriate client ID is present. */
export function isGoogleSignInConfigured(): boolean {
  const { webClientId, androidClientId, iosClientId } = googleClientIds()
  if (Platform.OS === 'ios') return Boolean(iosClientId || webClientId)
  if (Platform.OS === 'android') return Boolean(androidClientId || webClientId)
  return Boolean(webClientId)
}

/**
 * Prefer ID-token flow for backend GoogleIdTokenVerifier.
 * expo-auth-session requires webClientId on web — use a non-functional placeholder
 * when unset so Login can still render; real sign-in stays gated by isGoogleSignInConfigured().
 */
const PLACEHOLDER_WEB_CLIENT_ID = '000000000000-haven-placeholder.apps.googleusercontent.com'

export function useHavenGoogleAuthRequest() {
  const { webClientId, androidClientId, iosClientId } = googleClientIds()
  const web = webClientId || PLACEHOLDER_WEB_CLIENT_ID
  return Google.useIdTokenAuthRequest({
    webClientId: web,
    androidClientId: androidClientId || web,
    iosClientId: iosClientId || web,
    scopes: ['openid', 'profile', 'email'],
    selectAccount: true,
  })
}

export function extractGoogleIdToken(result: AuthSessionResult | null): string | null {
  if (!result || result.type !== 'success') return null
  const params = result.params as Record<string, string | undefined>
  const idToken = params.id_token
    || ('authentication' in result ? result.authentication?.idToken : null)
    || null
  if (!idToken || idToken.split('.').length !== 3 || idToken.length < 80) return null
  return idToken
}

export function googleAuthErrorMessage(result: AuthSessionResult | null): string | null {
  if (!result) return null
  if (result.type === 'dismiss' || result.type === 'cancel') {
    return 'Google sign-in was cancelled'
  }
  if (result.type === 'error') {
    return result.error?.message || 'Google sign-in failed'
  }
  if (result.type === 'success' && !extractGoogleIdToken(result)) {
    return 'Google did not return an ID token. Check OAuth client IDs.'
  }
  return null
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateLoginEmail(email: string): string | null {
  const v = email.trim().toLowerCase()
  if (!v) return 'Enter your registered email'
  if (v.length > 254) return 'Email is too long'
  if (!EMAIL_RE.test(v)) return 'Enter a valid email address'
  return null
}

export function validateOtp(otp: string): string | null {
  const v = otp.trim()
  if (!/^\d{6}$/.test(v)) return 'Enter the 6-digit OTP'
  return null
}
