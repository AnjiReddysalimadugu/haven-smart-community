import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { Redirect, useRouter } from 'expo-router'
import { Text, View } from 'react-native'
import type { Apartment } from './api'
import { Button, Notice } from './components/ui'
import { colors } from './theme'

type SocietyState = {
  selected: Apartment | null
  select: (apartment: Apartment) => void
  clear: () => void
}

const SocietyContext = createContext<SocietyState | null>(null)

export function SocietyProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<Apartment | null>(null)
  const select = useCallback((apartment: Apartment) => setSelected(apartment), [])
  const clear = useCallback(() => setSelected(null), [])
  const value = useMemo(() => ({ selected, select, clear }), [selected, select, clear])
  return <SocietyContext.Provider value={value}>{children}</SocietyContext.Provider>
}

export function useSociety() {
  const ctx = useContext(SocietyContext)
  if (!ctx) throw new Error('useSociety requires SocietyProvider')
  return ctx
}

/** Scope id for API calls: selected society for SUPER_ADMIN, else user's apartment. */
export function useScopeApartmentId(userApartmentId: string | null | undefined, isSuper: boolean) {
  const { selected } = useSociety()
  if (isSuper) return selected?.id ?? null
  return userApartmentId ?? null
}

/** Super Admin must pick a society before society-ops screens. */
export function SocietyRequired({ isSuper, children }: { isSuper: boolean; children: ReactNode }) {
  const { selected } = useSociety()
  if (isSuper && !selected) return <Redirect href="/(desk)" />
  return <>{children}</>
}

export function SocietyScopeBar({ isSuper }: { isSuper: boolean }) {
  const { selected, clear } = useSociety()
  const router = useRouter()
  if (!isSuper || !selected) return null
  return (
    <View style={{ marginBottom: 12, gap: 8 }}>
      <Notice tone="info" message={`Working in ${selected.name}`} />
      <Button
        label="← Switch society"
        variant="ghost"
        onPress={() => {
          clear()
          router.replace('/(desk)')
        }}
      />
      <Text style={{ fontSize: 11, color: colors.muted, fontWeight: '600' }}>
        Users, residents, flats and payments for this society only
      </Text>
    </View>
  )
}
