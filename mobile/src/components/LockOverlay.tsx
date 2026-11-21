import { useEffect, useState } from 'react'
import {
  Pressable, StyleSheet, Text, View,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../auth'
import { useLock } from '../LockGate'
import { colors, fonts, radius, space } from '../theme'
import { Button, ErrorText } from './ui'

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const

export function LockOverlay() {
  const { user, logout } = useAuth()
  const {
    needsSetup, locked, bio, bioEnabled,
    unlockWithMpin, unlockWithBiometric, setupMpin,
  } = useLock()

  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [phase, setPhase] = useState<'create' | 'confirm'>('create')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [enableBio, setEnableBio] = useState(true)

  useEffect(() => {
    setPin('')
    setConfirm('')
    setPhase('create')
    setError('')
  }, [needsSetup, locked])

  useEffect(() => {
    const canBio = bio.enrolled || bio.webFallback
    if (!locked || needsSetup || !bioEnabled || !canBio) return
    const t = setTimeout(() => {
      void unlockWithBiometric()
    }, 350)
    return () => clearTimeout(t)
  }, [locked, needsSetup, bioEnabled, bio.enrolled, bio.webFallback, unlockWithBiometric])

  function press(key: typeof DIGITS[number]) {
    if (busy) return
    void Haptics.selectionAsync().catch(() => {})
    setError('')
    if (key === '') return
    if (key === 'del') {
      if (needsSetup && phase === 'confirm') setConfirm((p) => p.slice(0, -1))
      else setPin((p) => p.slice(0, -1))
      return
    }
    if (needsSetup && phase === 'confirm') {
      if (confirm.length >= 4) return
      const next = confirm + key
      setConfirm(next)
      if (next.length === 4) void finishSetup(pin, next)
      return
    }
    if (pin.length >= 4) return
    const next = pin + key
    setPin(next)
    if (next.length === 4) {
      if (needsSetup) {
        setPhase('confirm')
        return
      }
      void tryUnlock(next)
    }
  }

  async function tryUnlock(value: string) {
    setBusy(true)
    try {
      const ok = await unlockWithMpin(value)
      if (!ok) {
        setError('Wrong MPIN')
        setPin('')
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      }
    } finally {
      setBusy(false)
    }
  }

  async function finishSetup(first: string, second: string) {
    if (first !== second) {
      setError('MPINs did not match. Try again.')
      setPin('')
      setConfirm('')
      setPhase('create')
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return
    }
    setBusy(true)
    try {
      await setupMpin(first, enableBio && (bio.enrolled || bio.webFallback))
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save MPIN')
      setPin('')
      setConfirm('')
      setPhase('create')
    } finally {
      setBusy(false)
    }
  }

  const dots = needsSetup && phase === 'confirm' ? confirm : pin
  const title = needsSetup
    ? (phase === 'confirm' ? 'Confirm MPIN' : 'Create MPIN')
    : 'Enter MPIN'
  const subtitle = needsSetup
    ? (phase === 'confirm'
      ? 'Re-enter the same 4 digits'
      : 'Quick unlock next time — no OTP every open')
    : `Welcome back, ${user?.fullName?.split(' ')[0] || 'there'}`

  return (
    <View style={styles.root} accessibilityViewIsModal>
      <StatusBar style="light" />
      <View style={styles.blobA} />
      <View style={styles.blobB} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <Animated.View entering={FadeIn.duration(220)} style={styles.inner}>
          <Text style={styles.brand}>Haven</Text>
          <Animated.View entering={FadeInDown.duration(280)}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.sub}>{subtitle}</Text>
          </Animated.View>

          <View style={styles.dots}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[styles.dot, i < dots.length && styles.dotOn]} />
            ))}
          </View>

          <ErrorText message={error} />

          {needsSetup && (bio.enrolled || bio.webFallback) ? (
            <Pressable
              onPress={() => setEnableBio((v) => !v)}
              style={styles.bioToggle}
            >
              <Ionicons
                name={enableBio ? 'checkbox' : 'square-outline'}
                size={22}
                color={colors.gateAccent}
              />
              <Text style={styles.bioToggleText}>Also unlock with {bio.label.toLowerCase()}</Text>
            </Pressable>
          ) : null}

          {!needsSetup && bioEnabled && (bio.enrolled || bio.webFallback) ? (
            <Pressable
              onPress={() => { void unlockWithBiometric() }}
              style={styles.bioBtn}
            >
              <Ionicons name="finger-print" size={36} color={colors.gateAccent} />
              <Text style={styles.bioBtnText}>Use {bio.label}</Text>
            </Pressable>
          ) : null}

          <View style={styles.pad}>
            {DIGITS.map((key, idx) => (
              <Pressable
                key={`${key}-${idx}`}
                onPress={() => press(key)}
                disabled={key === '' || busy}
                style={({ pressed }) => [
                  styles.key,
                  key === '' && styles.keyEmpty,
                  pressed && key !== '' && styles.keyPressed,
                ]}
              >
                {key === 'del' ? (
                  <Ionicons name="backspace-outline" size={26} color={colors.onInk} />
                ) : key !== '' ? (
                  <Text style={styles.keyText}>{key}</Text>
                ) : null}
              </Pressable>
            ))}
          </View>

          {needsSetup ? (
            <Text style={styles.hint}>4-digit MPIN stays on this device only.</Text>
          ) : null}
          <Button
            label="Sign out"
            variant="ghostDark"
            icon="log-out-outline"
            onPress={async () => { await logout() }}
          />
        </Animated.View>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    backgroundColor: colors.ink,
  },
  blobA: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(0,166,126,0.22)',
    top: -70,
    right: -50,
  },
  blobB: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(52,211,168,0.1)',
    bottom: 80,
    left: -60,
  },
  inner: {
    flex: 1,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    justifyContent: 'space-between',
    paddingBottom: space.md,
  },
  brand: {
    color: colors.gateAccent,
    fontFamily: fonts.sansBold,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    fontSize: 13,
  },
  title: {
    marginTop: space.md,
    color: colors.onInk,
    fontSize: 36,
    fontFamily: fonts.displayBold,
    letterSpacing: -1.2,
  },
  sub: {
    marginTop: 8,
    color: colors.onInkMuted,
    fontSize: 16,
    fontFamily: fonts.sans,
    lineHeight: 22,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginVertical: space.lg,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  dotOn: {
    backgroundColor: colors.gateAccent,
  },
  bioToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'center',
    marginBottom: space.sm,
    paddingVertical: 8,
  },
  bioToggleText: {
    color: colors.onInkMuted,
    fontFamily: fonts.sansMed,
    fontSize: 14,
  },
  bioBtn: {
    alignItems: 'center',
    gap: 8,
    marginBottom: space.sm,
  },
  bioBtnText: {
    color: colors.gateAccent,
    fontFamily: fonts.sansBold,
    fontSize: 14,
  },
  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginBottom: space.md,
  },
  key: {
    width: '28%',
    maxWidth: 96,
    aspectRatio: 1.35,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyEmpty: { backgroundColor: 'transparent' },
  keyPressed: { backgroundColor: 'rgba(0,166,126,0.35)', transform: [{ scale: 0.96 }] },
  keyText: {
    color: colors.onInk,
    fontSize: 28,
    fontFamily: fonts.sansBold,
  },
  hint: {
    textAlign: 'center',
    color: colors.onInkMuted,
    fontSize: 13,
    fontFamily: fonts.sans,
    marginBottom: 8,
  },
})
