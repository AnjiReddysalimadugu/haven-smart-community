import Constants from 'expo-constants'
import { Platform } from 'react-native'

type Extra = {
  apiUrl?: string
  eas?: { projectId?: string }
}

const extra = (Constants.expoConfig?.extra ?? {}) as Extra

/**
 * Resolve API base URL.
 * Priority: EXPO_PUBLIC_API_URL → app config extra.apiUrl → platform defaults.
 * Android emulator uses 10.0.2.2 to reach the host machine; devices need LAN IP.
 */
function defaultApiUrl() {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8080/api/v1'
  }
  // iOS simulator can use localhost
  return 'http://127.0.0.1:8080/api/v1'
}

export const DEFAULT_API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_URL || '').trim() ||
  (extra.apiUrl || '').trim() ||
  defaultApiUrl()

/** Baked / env default — runtime override lives in SecureStore via api.ts */
export const API_BASE_URL = DEFAULT_API_BASE_URL

export const API_URL_STORAGE_KEY = 'haven.mobile.apiUrl'

export const EAS_PROJECT_ID =
  (process.env.EXPO_PUBLIC_EAS_PROJECT_ID || '').trim() ||
  (extra.eas?.projectId || '').trim() ||
  ''

export const DEMO_ACCOUNTS = [
  { email: 'resident@haven.local', label: 'Resident', blurb: 'Home & bills' },
  { email: 'security@haven.local', label: 'Gate', blurb: 'Check-in desk' },
  { email: 'staff@haven.local', label: 'Desk', blurb: 'Collections' },
  { email: 'admin@haven.local', label: 'Admin', blurb: 'Society ops' },
  { email: 'anji99121640@gmail.com', label: 'Super Admin', blurb: 'Platform ops' },
] as const

/** Society UPI collect VPA — override with EXPO_PUBLIC_UPI_VPA */
export const UPI_VPA = process.env.EXPO_PUBLIC_UPI_VPA || 'haven@upi'
export const UPI_PAYEE_NAME = process.env.EXPO_PUBLIC_UPI_PAYEE || 'Haven Society'
