import { useState } from 'react'
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { useLock } from '../LockGate'
import { colors, fonts, radius, space } from '../theme'
import { Button, Card, Field, GlassSheet } from './ui'
import { IconCircle } from '../icons'

function PremiumToggle({
  value, onChange, disabled,
}: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  const x = useSharedValue(value ? 22 : 0)
  x.value = withSpring(value ? 22 : 0, { damping: 16, stiffness: 220 })
  const knob = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }))

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        if (disabled) return
        void Haptics.selectionAsync().catch(() => {})
        onChange(!value)
      }}
      style={[
        styles.toggleTrack,
        value && styles.toggleTrackOn,
        disabled && { opacity: 0.4 },
      ]}
    >
      <Animated.View style={[styles.toggleKnob, knob]} />
    </Pressable>
  )
}

export function SecuritySettings({ dark }: { dark?: boolean }) {
  const {
    needsSetup, bio, bioEnabled, enableBiometric, changeMpin, removeMpin, lockNow, setupMpin,
  } = useLock()

  const [sheet, setSheet] = useState<'change' | 'remove' | 'create' | null>(null)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function close() {
    setSheet(null)
    setCurrent('')
    setNext('')
    setConfirm('')
    setError('')
  }

  async function onToggleBio(on: boolean) {
    if (!bio.enrolled && !bio.webFallback) {
      Alert.alert(
        bio.label,
        Platform.OS === 'web'
          ? 'Open Haven on your phone to use fingerprint / Face ID.'
          : bio.hint || 'Add a fingerprint in your phone Settings, then try again.',
      )
      return
    }
    try {
      await enableBiometric(on)
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (err) {
      Alert.alert('Biometrics', err instanceof Error ? err.message : 'Could not update')
    }
  }

  async function onChange() {
    setError('')
    if (!/^\d{4}$/.test(next) || next !== confirm) {
      setError('New MPIN must be 4 matching digits')
      return
    }
    setBusy(true)
    try {
      await changeMpin(current, next)
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      close()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change MPIN')
    } finally {
      setBusy(false)
    }
  }

  async function onRemove() {
    setError('')
    setBusy(true)
    try {
      await removeMpin(current)
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      close()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove MPIN')
    } finally {
      setBusy(false)
    }
  }

  async function onCreate() {
    setError('')
    if (!/^\d{4}$/.test(next) || next !== confirm) {
      setError('Enter matching 4-digit MPINs')
      return
    }
    setBusy(true)
    try {
      await setupMpin(next, bio.enrolled || bio.webFallback)
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      close()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create MPIN')
    } finally {
      setBusy(false)
    }
  }

  const canToggleBio = bio.enrolled || bio.webFallback

  return (
    <>
      <Card style={dark ? { backgroundColor: colors.inkSoft } : undefined}>
        <Text style={[styles.section, dark && { color: colors.onInkMuted }]}>App lock</Text>

        {needsSetup ? (
          <Pressable onPress={() => setSheet('create')} style={[styles.row, { borderBottomWidth: 0 }]}>
            <IconCircle name="keypad" size={46} tone={dark ? 'dark' : 'mist'} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, dark && { color: colors.onInk }]}>Set up MPIN</Text>
              <Text style={[styles.sub, dark && { color: colors.onInkMuted }]}>4-digit unlock for this device</Text>
            </View>
            <IconCircle name="chevron-forward" size={28} tone={dark ? 'dark' : 'mist'} filled={false} />
          </Pressable>
        ) : (
          <>
            <View style={styles.row}>
              <IconCircle name="finger-print" size={46} tone={bioEnabled ? 'ink' : dark ? 'dark' : 'mist'} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, dark && { color: colors.onInk }]}>{bio.label}</Text>
                <Text style={[styles.sub, dark && { color: colors.onInkMuted }]}>
                  {bioEnabled ? 'On · unlock without typing MPIN' : bio.hint}
                </Text>
              </View>
              <PremiumToggle
                value={bioEnabled}
                disabled={!canToggleBio}
                onChange={(v) => { void onToggleBio(v) }}
              />
            </View>

            <Pressable onPress={() => setSheet('change')} style={styles.row}>
              <IconCircle name="keypad" size={46} tone={dark ? 'dark' : 'mist'} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, dark && { color: colors.onInk }]}>Change MPIN</Text>
                <Text style={[styles.sub, dark && { color: colors.onInkMuted }]}>Update your 4-digit code</Text>
              </View>
              <IconCircle name="chevron-forward" size={28} tone={dark ? 'dark' : 'mist'} filled={false} />
            </Pressable>

            <Pressable onPress={lockNow} style={styles.row}>
              <IconCircle name="lock-closed" size={46} tone={dark ? 'dark' : 'mist'} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, dark && { color: colors.onInk }]}>Lock now</Text>
                <Text style={[styles.sub, dark && { color: colors.onInkMuted }]}>
                  {bioEnabled ? `Require MPIN / ${bio.label.toLowerCase()}` : 'Require MPIN'}
                </Text>
              </View>
            </Pressable>

            <Pressable onPress={() => setSheet('remove')} style={[styles.row, { borderBottomWidth: 0 }]}>
              <IconCircle name="trash" size={46} tone="danger" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.danger }]}>Remove MPIN</Text>
                <Text style={[styles.sub, dark && { color: colors.onInkMuted }]}>You’ll set a new one next open</Text>
              </View>
            </Pressable>
          </>
        )}
      </Card>

      <GlassSheet
        visible={sheet === 'change'}
        onClose={close}
        title="Change MPIN"
        subtitle="Enter current and new 4-digit codes"
        icon="keypad"
        footer={(
          <>
            <Button label={busy ? 'Saving…' : 'Save MPIN'} loading={busy} onPress={onChange} />
            <Button label="Cancel" variant="ghost" onPress={close} />
          </>
        )}
      >
        <Field label="Current MPIN" value={current} onChangeText={(v) => setCurrent(v.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" secureTextEntry placeholder="••••" />
        <Field label="New MPIN" value={next} onChangeText={(v) => setNext(v.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" secureTextEntry placeholder="••••" />
        <Field label="Confirm new" value={confirm} onChangeText={(v) => setConfirm(v.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" secureTextEntry placeholder="••••" />
        {error ? <Text style={styles.err}>{error}</Text> : null}
      </GlassSheet>

      <GlassSheet
        visible={sheet === 'remove'}
        onClose={close}
        title="Remove MPIN"
        subtitle="Confirm with your current MPIN"
        icon="trash"
        footer={(
          <>
            <Button label={busy ? 'Removing…' : 'Remove'} variant="danger" loading={busy} onPress={onRemove} />
            <Button label="Cancel" variant="ghost" onPress={close} />
          </>
        )}
      >
        <Field label="Current MPIN" value={current} onChangeText={(v) => setCurrent(v.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" secureTextEntry placeholder="••••" />
        {error ? <Text style={styles.err}>{error}</Text> : null}
      </GlassSheet>

      <GlassSheet
        visible={sheet === 'create'}
        onClose={close}
        title="Create MPIN"
        subtitle="4 digits for quick unlock"
        icon="keypad"
        footer={(
          <>
            <Button label={busy ? 'Saving…' : 'Save MPIN'} loading={busy} onPress={onCreate} />
            <Button label="Cancel" variant="ghost" onPress={close} />
          </>
        )}
      >
        <Field label="MPIN" value={next} onChangeText={(v) => setNext(v.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" secureTextEntry placeholder="••••" />
        <Field label="Confirm" value={confirm} onChangeText={(v) => setConfirm(v.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" secureTextEntry placeholder="••••" />
        {error ? <Text style={styles.err}>{error}</Text> : null}
      </GlassSheet>
    </>
  )
}

const styles = StyleSheet.create({
  section: {
    fontSize: 13,
    fontFamily: fonts.sansBold,
    color: colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.text, letterSpacing: -0.2 },
  sub: { marginTop: 4, fontSize: 13, color: colors.muted, fontFamily: fonts.sans, lineHeight: 18 },
  err: { color: colors.danger, fontFamily: fonts.sansMed, marginBottom: space.sm },
  toggleTrack: {
    width: 52,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.secondaryFill,
    padding: 3,
    justifyContent: 'center',
  },
  toggleTrackOn: {
    backgroundColor: colors.brand,
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
})
