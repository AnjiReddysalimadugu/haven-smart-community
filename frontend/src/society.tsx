import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { propertyApi } from './services'
import { useAuth } from './auth'

const STORAGE_KEY = 'haven.societyId'

type SocietyState = {
  apartmentId: string | null
  setApartmentId: (id: string | null) => void
  apartments: { id: string; name: string; status: string }[]
  isSuperAdmin: boolean
  /** Query param helper — null when not super-admin or "all societies". */
  scopeParam: string | null
}

const SocietyContext = createContext<SocietyState | null>(null)

export function SocietyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'
  const [apartmentId, setApartmentIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY)
    } catch {
      return null
    }
  })

  const { data: apartments = [] } = useQuery({
    queryKey: ['apartments'],
    queryFn: propertyApi.apartments,
    enabled: Boolean(user) && (isSuperAdmin || Boolean(user?.apartmentId)),
  })

  const setApartmentId = useCallback((id: string | null) => {
    setApartmentIdState(id)
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id)
      else localStorage.removeItem(STORAGE_KEY)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (!isSuperAdmin) {
      setApartmentIdState(user?.apartmentId ?? null)
      return
    }
    if (apartmentId && apartments.length && !apartments.some((a) => a.id === apartmentId)) {
      setApartmentId(null)
    }
  }, [isSuperAdmin, user?.apartmentId, apartmentId, apartments, setApartmentId])

  const scopeParam = isSuperAdmin ? apartmentId : null

  const value = useMemo(
    () => ({ apartmentId: isSuperAdmin ? apartmentId : (user?.apartmentId ?? null), setApartmentId, apartments, isSuperAdmin, scopeParam }),
    [apartmentId, setApartmentId, apartments, isSuperAdmin, user?.apartmentId, scopeParam],
  )

  return <SocietyContext.Provider value={value}>{children}</SocietyContext.Provider>
}

export function useSociety() {
  const ctx = useContext(SocietyContext)
  if (!ctx) throw new Error('useSociety must be used within SocietyProvider')
  return ctx
}
