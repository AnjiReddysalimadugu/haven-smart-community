import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode,
} from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { useAuth } from './auth'
import {
  authenticateBiometric,
  clearMpin,
  getBiometricInfo,
  hasMpin,
  isBiometricEnabled,
  isMpinForUser,
  setBiometricEnabled,
  setMpin,
  verifyMpin,
  type BioInfo,
} from './lock'
import { LockOverlay } from './components/LockOverlay'

type LockState = {
  ready: boolean
  locked: boolean
  needsSetup: boolean
  bio: BioInfo
  bioEnabled: boolean
  unlockWithMpin: (pin: string) => Promise<boolean>
  unlockWithBiometric: () => Promise<boolean>
  setupMpin: (pin: string, enableBio?: boolean) => Promise<void>
  enableBiometric: (on: boolean) => Promise<void>
  changeMpin: (current: string, next: string) => Promise<void>
  removeMpin: (pin: string) => Promise<void>
  lockNow: () => void
}

const LockContext = createContext<LockState | null>(null)

const BACKGROUND_LOCK_MS = 20_000

export function LockProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, freshLogin, consumeFreshLogin } = useAuth()
  const [ready, setReady] = useState(false)
  const [locked, setLocked] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [bio, setBio] = useState<BioInfo>({
    available: false, enrolled: false, webFallback: false, label: 'Biometrics', hint: '',
  })
  const [bioEnabled, setBioEnabledState] = useState(false)
  const bgAt = useRef<number | null>(null)
  const sessionChecked = useRef(false)

  const refreshBio = useCallback(async () => {
    const info = await getBiometricInfo()
    const enabled = await isBiometricEnabled()
    setBio(info)
    setBioEnabledState(enabled && (info.enrolled || info.webFallback))
  }, [])

  useEffect(() => {
    if (authLoading) return
    let active = true
    ;(async () => {
      await refreshBio()
      if (!user) {
        if (active) {
          sessionChecked.current = false
          setLocked(false)
          setNeedsSetup(false)
          setReady(true)
        }
        return
      }

      const configured = await isMpinForUser(user.id)
      const anyMpin = await hasMpin()
      // Different user signed in — wipe previous device lock
      if (anyMpin && !configured) {
        await clearMpin()
      }

      if (active) {
        if (!configured) {
          setNeedsSetup(true)
          setLocked(false)
          sessionChecked.current = true
        } else if (freshLogin) {
          setNeedsSetup(false)
          setLocked(false)
          sessionChecked.current = true
          consumeFreshLogin()
        } else if (!sessionChecked.current) {
          setNeedsSetup(false)
          setLocked(true)
          sessionChecked.current = true
        }
        setReady(true)
      }
    })()
    return () => { active = false }
  }, [user, authLoading, freshLogin, consumeFreshLogin, refreshBio])

  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        bgAt.current = Date.now()
        return
      }
      if (next === 'active' && bgAt.current && user && !needsSetup) {
        if (Date.now() - bgAt.current >= BACKGROUND_LOCK_MS) {
          void hasMpin().then((ok) => { if (ok) setLocked(true) })
        }
      }
      if (next === 'active') bgAt.current = null
    }
    const sub = AppState.addEventListener('change', onChange)
    return () => sub.remove()
  }, [user, needsSetup])

  const unlockWithMpin = useCallback(async (pin: string) => {
    const ok = await verifyMpin(pin)
    if (ok) setLocked(false)
    return ok
  }, [])

  const unlockWithBiometric = useCallback(async () => {
    if (!bioEnabled) return false
    const ok = await authenticateBiometric('Unlock Haven')
    if (ok) setLocked(false)
    return ok
  }, [bioEnabled])

  const setupMpin = useCallback(async (pin: string, enableBio = false) => {
    if (!user) throw new Error('Not signed in')
    await setMpin(user.id, pin)
    if (enableBio) {
      const info = await getBiometricInfo()
      if (info.enrolled || info.webFallback) {
        const ok = await authenticateBiometric(`Enable ${info.label}`)
        await setBiometricEnabled(ok)
        setBioEnabledState(ok)
      }
    }
    setNeedsSetup(false)
    setLocked(false)
    await refreshBio()
  }, [user, refreshBio])

  const enableBiometric = useCallback(async (on: boolean) => {
    if (on) {
      const info = await getBiometricInfo()
      if (!info.enrolled && !info.webFallback) {
        throw new Error(info.hint || 'No fingerprint / face enrolled on this device')
      }
      const ok = await authenticateBiometric(`Enable ${info.label}`)
      if (!ok) throw new Error('Cancelled')
      await setBiometricEnabled(true)
      setBioEnabledState(true)
    } else {
      await setBiometricEnabled(false)
      setBioEnabledState(false)
    }
    await refreshBio()
  }, [refreshBio])

  const changeMpin = useCallback(async (current: string, next: string) => {
    if (!user) throw new Error('Not signed in')
    const ok = await verifyMpin(current)
    if (!ok) throw new Error('Current MPIN is wrong')
    await setMpin(user.id, next)
  }, [user])

  const removeMpin = useCallback(async (pin: string) => {
    const ok = await verifyMpin(pin)
    if (!ok) throw new Error('MPIN is wrong')
    await clearMpin()
    setBioEnabledState(false)
    setNeedsSetup(true)
    setLocked(false)
    await refreshBio()
  }, [refreshBio])

  const lockNow = useCallback(() => {
    void hasMpin().then((ok) => { if (ok) setLocked(true) })
  }, [])

  const value = useMemo(
    () => ({
      ready,
      locked,
      needsSetup,
      bio,
      bioEnabled,
      unlockWithMpin,
      unlockWithBiometric,
      setupMpin,
      enableBiometric,
      changeMpin,
      removeMpin,
      lockNow,
    }),
    [
      ready, locked, needsSetup, bio, bioEnabled,
      unlockWithMpin, unlockWithBiometric, setupMpin,
      enableBiometric, changeMpin, removeMpin, lockNow,
    ],
  )

  const showOverlay = Boolean(user) && ready && (needsSetup || locked)

  return (
    <LockContext.Provider value={value}>
      {children}
      {showOverlay ? <LockOverlay /> : null}
    </LockContext.Provider>
  )
}

export function useLock() {
  const ctx = useContext(LockContext)
  if (!ctx) throw new Error('useLock requires LockProvider')
  return ctx
}
