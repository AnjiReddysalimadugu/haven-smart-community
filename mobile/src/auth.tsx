import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  authApi, clearToken, getToken, saveToken, setUnauthorizedHandler, type AuthUser, type Role,
} from './api'

type AuthState = {
  user: AuthUser | null
  loading: boolean
  /** True right after OTP verify — skip device lock once */
  freshLogin: boolean
  consumeFreshLogin: () => void
  requestOtp: (email: string) => Promise<{ message: string; devOtp?: string | null }>
  login: (email: string, otp: string) => Promise<AuthUser>
  loginWithGoogle: (idToken: string) => Promise<AuthUser>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function homeRouteFor(role: Role) {
  if (role === 'SECURITY') return '/(gate)'
  if (role === 'RESIDENT') return '/(resident)'
  if (role === 'STAFF') return '/(desk)'
  return '/(desk)'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [freshLogin, setFreshLogin] = useState(false)

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null))
    return () => setUnauthorizedHandler(null)
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const token = await getToken()
        if (!token) {
          if (active) setLoading(false)
          return
        }
        const me = await authApi.me()
        if (active) setUser(me)
        void import('./push').then((m) => m.registerForPush()).catch(() => {})
      } catch {
        await clearToken()
        if (active) setUser(null)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  const requestOtp = useCallback(async (email: string) => authApi.requestOtp(email), [])

  const consumeFreshLogin = useCallback(() => setFreshLogin(false), [])

  const login = useCallback(async (email: string, otp: string) => {
    const data = await authApi.login(email, otp)
    await saveToken(data.accessToken)
    setFreshLogin(true)
    setUser(data.user)
    // Never block / crash navigation on push setup
    void import('./push').then((m) => m.registerForPush()).catch(() => {})
    return data.user
  }, [])

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const data = await authApi.loginWithGoogle(idToken)
    await saveToken(data.accessToken)
    setFreshLogin(true)
    setUser(data.user)
    void import('./push').then((m) => m.registerForPush()).catch(() => {})
    return data.user
  }, [])

  const logout = useCallback(async () => {
    await clearToken()
    setFreshLogin(false)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, loading, freshLogin, consumeFreshLogin, requestOtp, login, loginWithGoogle, logout }),
    [user, loading, freshLogin, consumeFreshLogin, requestOtp, login, loginWithGoogle, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth requires AuthProvider')
  return ctx
}
