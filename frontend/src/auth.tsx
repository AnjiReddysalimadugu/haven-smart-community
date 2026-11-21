import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AuthUser, Role } from './api'
import { authApi } from './services'
import { canAccessPath, navAccessMap } from './lib/nav'

const TOKEN_KEY = 'haven.auth.token'
const USER_KEY = 'haven.auth.user'

type AuthState = {
  user: AuthUser | null
  token: string | null
  loading: boolean
  login: (email: string, otp: string) => Promise<AuthUser>
  loginWithGoogle: (idToken: string) => Promise<AuthUser>
  requestOtp: (email: string) => Promise<{ message: string; expiresAt: string; devOtp?: string | null }>
  refreshUser: () => Promise<AuthUser | null>
  logout: () => void
  hasRole: (...roles: Role[]) => boolean
  can: (action: ActionKey) => boolean
}

export type ActionKey =
  | 'bill.create'
  | 'bill.pay'
  | 'bill.refund'
  | 'visitor.create'
  | 'visitor.validate'
  | 'visitor.exit'
  | 'visitor.approve'
  | 'complaint.create'
  | 'complaint.status'
  | 'parking.create'
  | 'parking.allocate'
  | 'property.create'
  | 'apartment.create'
  | 'resident.manage'
  | 'user.manage'
  | 'occupancy.manage'
  | 'occupancy.release'
  | 'dashboard.view'
  | 'settings.view'
  | 'reports.view'
  | 'notice.manage'
  | 'family.manage'
  | 'emergency.manage'

const SOCIETY_ADMINS: Role[] = ['SUPER_ADMIN', 'APARTMENT_ADMIN', 'ADMIN']
const DESK: Role[] = [...SOCIETY_ADMINS, 'STAFF']

const actionRoles: Record<ActionKey, Role[]> = {
  'bill.create': [...DESK, 'RESIDENT'],
  'bill.pay': [...DESK, 'RESIDENT'],
  'bill.refund': [...DESK, 'RESIDENT'],
  'visitor.create': [...DESK, 'SECURITY', 'RESIDENT'],
  'visitor.validate': [...DESK, 'SECURITY'],
  'visitor.exit': [...SOCIETY_ADMINS, 'SECURITY'],
  'visitor.approve': [...SOCIETY_ADMINS, 'STAFF', 'RESIDENT'],
  'complaint.create': [...DESK, 'RESIDENT'],
  'complaint.status': [...DESK, 'SECURITY'],
  'parking.create': SOCIETY_ADMINS,
  'parking.allocate': SOCIETY_ADMINS,
  'property.create': SOCIETY_ADMINS,
  'apartment.create': ['SUPER_ADMIN'],
  'resident.manage': SOCIETY_ADMINS,
  'user.manage': SOCIETY_ADMINS,
  'occupancy.manage': SOCIETY_ADMINS,
  'occupancy.release': [...SOCIETY_ADMINS, 'RESIDENT'],
  'dashboard.view': DESK,
  'settings.view': SOCIETY_ADMINS,
  'reports.view': SOCIETY_ADMINS,
  'notice.manage': SOCIETY_ADMINS,
  'family.manage': [...SOCIETY_ADMINS, 'RESIDENT'],
  'emergency.manage': [...SOCIETY_ADMINS, 'RESIDENT'],
}

const AuthContext = createContext<AuthState | null>(null)

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) as AuthUser : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser())
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)) && !readStoredUser())

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
    setLoading(false)
  }, [])

  useEffect(() => {
    const onUnauthorized = () => {
      logout()
      if (!window.location.pathname.startsWith('/login')) window.location.assign('/login')
    }
    window.addEventListener('haven:unauthorized', onUnauthorized)
    return () => window.removeEventListener('haven:unauthorized', onUnauthorized)
  }, [logout])

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }
    let active = true
    authApi.me()
      .then((me) => {
        if (!active) return
        setUser(me)
        localStorage.setItem(USER_KEY, JSON.stringify(me))
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        logout()
      })
    return () => { active = false }
  }, [token, logout])

  const requestOtp = useCallback(async (email: string) => authApi.requestOtp(email), [])

  const login = useCallback(async (email: string, otp: string) => {
    const data = await authApi.login(email, otp)
    localStorage.setItem(TOKEN_KEY, data.accessToken)
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))
    setToken(data.accessToken)
    setUser(data.user)
    setLoading(false)
    return data.user
  }, [])

  const loginWithGoogle = useCallback(async (idToken: string) => {
    const data = await authApi.loginWithGoogle(idToken)
    localStorage.setItem(TOKEN_KEY, data.accessToken)
    localStorage.setItem(USER_KEY, JSON.stringify(data.user))
    setToken(data.accessToken)
    setUser(data.user)
    setLoading(false)
    return data.user
  }, [])

  const refreshUser = useCallback(async () => {
    if (!localStorage.getItem(TOKEN_KEY)) return null
    try {
      const me = await authApi.me()
      setUser(me)
      localStorage.setItem(USER_KEY, JSON.stringify(me))
      return me
    } catch {
      logout()
      return null
    }
  }, [logout])

  const hasRole = useCallback((...roles: Role[]) => {
    if (!user) return false
    return roles.includes(user.role)
  }, [user])

  const can = useCallback((action: ActionKey) => {
    if (!user) return false
    return actionRoles[action].includes(user.role)
  }, [user])

  const value = useMemo(
    () => ({ user, token, loading, login, loginWithGoogle, requestOtp, refreshUser, logout, hasRole, can }),
    [user, token, loading, login, loginWithGoogle, requestOtp, refreshUser, logout, hasRole, can],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function roleLabel(role: Role) {
  switch (role) {
    case 'SUPER_ADMIN': return 'Platform super admin'
    case 'APARTMENT_ADMIN': return 'Apartment administrator'
    case 'ADMIN': return 'Society administrator'
    case 'STAFF': return 'Operations staff'
    case 'SECURITY': return 'Gate security'
    case 'RESIDENT': return 'Resident'
    default: return role
  }
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || 'HV'
}

export function homePathFor(role: Role) {
  if (role === 'SECURITY') return '/security'
  if (role === 'RESIDENT') return '/m'
  return '/'
}

/** Prefer deep-link only when the signed-in role is allowed on that path. */
export function postLoginPath(role: Role, from?: string | null) {
  if (from && from !== '/login' && canAccessPath(from, role)) return from
  return homePathFor(role)
}

export const navAccess = navAccessMap()

export { routeTitle } from './lib/nav'
