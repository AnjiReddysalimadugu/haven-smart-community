import { useCallback, useRef, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { apiError, visitorApi } from '../../src/api'
import { Button, ErrorText } from '../../src/components/ui'
import { colors, radius, space } from '../../src/theme'

export default function GateScan() {
  const [permission, requestPermission] = useCameraPermissions()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ ok: boolean; title: string; body: string; token?: string } | null>(null)
  const last = useRef('')
  const cooldown = useRef(0)

  const onBarcode = useCallback(async ({ data }: { data: string }) => {
    const token = (data || '').trim()
    if (!token || busy) return
    const now = Date.now()
    if (token === last.current && now - cooldown.current < 4000) return
    last.current = token
    cooldown.current = now

    setBusy(true)
    setError('')
    setResult(null)
    try {
      const res = await visitorApi.validate(token)
      if (res.valid) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        setResult({
          ok: true,
          title: 'Allow entry',
          body: `${res.visitorName || 'Visitor'} · Flat ${res.flatNumber || '—'}`,
          token,
        })
      } else {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
        setResult({ ok: false, title: 'Denied', body: res.message || 'Invalid pass' })
      }
    } catch (err) {
      setError(apiError(err, 'Scan failed'))
    } finally {
      setBusy(false)
    }
  }, [busy])

  async function onExit() {
    if (!result?.token) return
    setBusy(true)
    setError('')
    try {
      await visitorApi.exitByToken(result.token)
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      setResult({ ok: true, title: 'Exit logged', body: 'Visitor marked as exited.' })
    } catch (err) {
      setError(apiError(err, 'Exit failed'))
    } finally {
      setBusy(false)
    }
  }

  if (!permission) {
    return <View style={styles.root} />
  }

  if (!permission.granted) {
    return (
      <View style={styles.root}>
        <SafeAreaView style={styles.center}>
          <Text style={styles.title}>Camera access</Text>
          <Text style={styles.sub}>Needed to scan visitor QR tokens at the gate.</Text>
          <Button label="Allow camera" variant="lime" onPress={() => { void requestPermission() }} />
        </SafeAreaView>
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={busy ? undefined : onBarcode}
      />
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <Text style={styles.eyebrow}>Live scan</Text>
        <Text style={styles.title}>Point at QR</Text>
        <View style={styles.frame} />
        <ErrorText message={error} />
        {result ? (
          <View style={[styles.result, result.ok ? styles.ok : styles.bad]}>
            <Text style={styles.resultTitle}>{result.title}</Text>
            <Text style={styles.resultBody}>{result.body}</Text>
            {result.ok && result.token ? (
              <Button label={busy ? 'Logging…' : 'Mark exit'} variant="ghostDark" loading={busy} onPress={() => { void onExit() }} />
            ) : null}
            <Button label="Scan again" variant="lime" onPress={() => { setResult(null); last.current = '' }} />
          </View>
        ) : (
          <Text style={styles.hint}>{busy ? 'Validating…' : 'Hold steady — auto validates'}</Text>
        )}
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
  center: { flex: 1, justifyContent: 'center', padding: space.lg, gap: 12 },
  overlay: { flex: 1, padding: space.md, justifyContent: 'space-between' },
  eyebrow: { color: colors.gateAccent, fontSize: 11, fontWeight: '800', letterSpacing: 1.6, textTransform: 'uppercase' },
  title: { color: '#F4FFF0', fontSize: 28, fontWeight: '900', marginTop: 6 },
  sub: { color: 'rgba(244,255,240,0.7)', marginBottom: 16, lineHeight: 20 },
  frame: {
    alignSelf: 'center',
    width: 240,
    height: 240,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.gateAccent,
    backgroundColor: 'transparent',
  },
  hint: { color: 'rgba(244,255,240,0.7)', textAlign: 'center', marginBottom: 12 },
  result: { borderRadius: radius.lg, padding: 16, gap: 10 },
  ok: { backgroundColor: 'rgba(198,242,109,0.2)' },
  bad: { backgroundColor: 'rgba(192,53,43,0.35)' },
  resultTitle: { color: '#F4FFF0', fontWeight: '900', fontSize: 20 },
  resultBody: { color: 'rgba(244,255,240,0.85)', marginBottom: 4 },
})
