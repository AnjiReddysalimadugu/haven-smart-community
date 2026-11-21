import { useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeInDown } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { apiError, visitorApi } from '../../src/api'
import { useAuth } from '../../src/auth'
import { Button, ErrorText, Field, Screen } from '../../src/components/ui'
import { IconCircle } from '../../src/icons'
import { colors, fonts, radius, space } from '../../src/theme'

export default function GateHome() {
  const { user } = useAuth()
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ ok: boolean; title: string; body: string } | null>(null)

  async function onValidate() {
    setError('')
    setResult(null)
    setBusy(true)
    try {
      const res = await visitorApi.validate(token.trim())
      if (res.valid) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        setResult({
          ok: true,
          title: 'Allow entry',
          body: `${res.visitorName || 'Visitor'} · Flat ${res.flatNumber || '—'}`,
        })
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        setResult({ ok: false, title: 'Denied', body: res.message || 'Invalid pass' })
      }
    } catch (err) {
      setError(apiError(err, 'Validation failed'))
    } finally {
      setBusy(false)
    }
  }

  async function onExit() {
    setError('')
    setBusy(true)
    try {
      await visitorApi.exitByToken(token.trim())
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      setResult({ ok: true, title: 'Exit logged', body: 'Visitor marked as exited.' })
      setToken('')
    } catch (err) {
      setError(apiError(err, 'Exit failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen dark>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
          <Animated.View entering={FadeInDown.duration(280)}>
            <Text style={styles.eyebrow}>Gate</Text>
            <Text style={styles.title}>Scan & allow</Text>
            <Text style={styles.sub}>{user?.apartmentName || 'Society gate'}</Text>
          </Animated.View>

          <View style={styles.panel}>
            <View style={styles.glow} />
            <View style={styles.panelHead}>
              <IconCircle name="shield-checkmark" size={52} tone="brand" />
              <View style={{ flex: 1 }}>
                <Text style={styles.panelTitle}>Pass check</Text>
                <Text style={styles.panelSub}>Validate entry or log exit</Text>
              </View>
            </View>
            <Field label="Pass token" value={token} onChangeText={setToken} placeholder="Paste QR token" inverted />
            <ErrorText message={error} />
            <Button
              label={busy ? 'Checking…' : 'Validate entry'}
              icon="enter-outline"
              loading={busy}
              disabled={token.trim().length < 6}
              onPress={onValidate}
            />
            <View style={{ height: 12 }} />
            <Button
              label="Mark exit"
              variant="ghostDark"
              icon="exit-outline"
              disabled={busy || token.trim().length < 6}
              onPress={onExit}
            />

            {result ? (
              <View style={[styles.result, result.ok ? styles.resultOk : styles.resultBad]}>
                <IconCircle
                  name={result.ok ? 'checkmark-circle' : 'close-circle'}
                  size={40}
                  tone={result.ok ? 'brand' : 'danger'}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultTitle}>{result.title}</Text>
                  <Text style={styles.resultBody}>{result.body}</Text>
                </View>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  pad: { padding: space.md, paddingBottom: 120 },
  eyebrow: {
    color: colors.gateAccent,
    fontSize: 13,
    fontFamily: fonts.sansBold,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  title: {
    color: colors.onInk,
    fontSize: 42,
    fontFamily: fonts.displayBold,
    letterSpacing: -1.4,
    lineHeight: 46,
  },
  sub: {
    color: colors.onInkMuted,
    marginTop: 10,
    marginBottom: space.lg,
    fontSize: 16,
    fontFamily: fonts.sans,
  },
  panel: {
    backgroundColor: colors.inkSoft,
    borderRadius: radius.xl,
    padding: space.lg,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(0,166,126,0.18)',
    top: -50,
    right: -40,
  },
  panelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: space.lg,
  },
  panelTitle: {
    color: colors.onInk,
    fontSize: 22,
    fontFamily: fonts.sansBold,
    letterSpacing: -0.3,
  },
  panelSub: {
    color: colors.onInkMuted,
    marginTop: 4,
    fontSize: 14,
    fontFamily: fonts.sans,
  },
  result: {
    marginTop: space.lg,
    borderRadius: radius.md,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultOk: { backgroundColor: 'rgba(0,166,126,0.18)' },
  resultBad: { backgroundColor: 'rgba(225,29,72,0.16)' },
  resultTitle: {
    color: colors.onInk,
    fontFamily: fonts.sansBold,
    fontSize: 17,
  },
  resultBody: {
    color: colors.onInkMuted,
    marginTop: 4,
    fontSize: 14,
    fontFamily: fonts.sans,
    lineHeight: 20,
  },
})
