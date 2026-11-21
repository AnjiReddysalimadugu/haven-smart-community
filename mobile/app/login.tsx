import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { homeRouteFor, useAuth } from '../src/auth'
import { apiError, authApi, getApiBaseUrl, initApiBaseUrl, setApiBaseUrl } from '../src/api'
import { DEMO_ACCOUNTS } from '../src/config'
import { GlassyOtpPanel } from '../src/components/GlassyOtpPanel'
import { Button, ErrorText } from '../src/components/ui'
import {
  extractGoogleIdToken,
  googleAuthErrorMessage,
  isGoogleSignInConfigured,
  useHavenGoogleAuthRequest,
  validateLoginEmail,
  validateOtp,
} from '../src/googleAuth'
import { colors, fonts, radius } from '../src/theme'

const ROLE_ICONS = {
  Resident: 'home-outline',
  Gate: 'shield-checkmark-outline',
  Desk: 'cash-outline',
  Admin: 'grid-outline',
  'Super Admin': 'business-outline',
} as const

export default function LoginScreen() {
  const { user, loading, requestOtp, login, loginWithGoogle } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('resident@haven.local')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [devOtp, setDevOtp] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [apiUrl, setApiUrl] = useState(getApiBaseUrl())
  const [showApi, setShowApi] = useState(false)
  const [serverGoogle, setServerGoogle] = useState(false)
  const [otpVerified, setOtpVerified] = useState(false)
  const pulse = useSharedValue(0)
  const googleConfigured = isGoogleSignInConfigured()
  const [googleRequest, , promptGoogle] = useHavenGoogleAuthRequest()

  const selected = useMemo(() => DEMO_ACCOUNTS.find((d) => d.email === email), [email])
  const showGoogle = googleConfigured || serverGoogle

  useEffect(() => {
    void initApiBaseUrl().then((url) => setApiUrl(url))
  }, [])

  useEffect(() => {
    void authApi.options()
      .then((o) => setServerGoogle(Boolean(o.googleEnabled)))
      .catch(() => setServerGoogle(false))
  }, [])

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 4200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    )
  }, [pulse])

  const orbA = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(pulse.value, [0, 1], [0, 18]) },
      { scale: interpolate(pulse.value, [0, 1], [1, 1.08]) },
    ],
    opacity: interpolate(pulse.value, [0, 1], [0.55, 0.85]),
  }))
  const orbB = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(pulse.value, [0, 1], [0, -14]) },
      { scale: interpolate(pulse.value, [0, 1], [1.05, 0.92]) },
    ],
    opacity: interpolate(pulse.value, [0, 1], [0.35, 0.55]),
  }))
  const shimmer = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 0.5, 1], [0.12, 0.28, 0.12]),
  }))

  async function applyApiUrl() {
    try {
      const next = await setApiBaseUrl(apiUrl)
      setApiUrl(next)
      return next
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid API URL')
      return null
    }
  }

  async function onSend() {
    const trimmed = email.trim().toLowerCase()
    const emailErr = validateLoginEmail(trimmed)
    if (emailErr) {
      setError(emailErr)
      return
    }
    setError('')
    setBusy(true)
    try {
      if (!(await applyApiUrl())) return
      const res = await requestOtp(trimmed)
      setEmail(trimmed)
      setOtpSent(true)
      setDevOtp(res.devOtp ?? null)
      if (res.devOtp) setOtp(res.devOtp)
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      // Glassy OTP panel auto-focuses its own input
    } catch (err) {
      setOtpSent(false)
      setError(isNetworkError(err)
        ? `Cannot reach API (${getApiBaseUrl().replace(/^https?:\/\//, '')}). Same Wi‑Fi as PC, VPN off.`
        : apiError(err, 'Only created Haven users can sign in.'))
    } finally {
      setBusy(false)
    }
  }

  async function onVerify() {
    const otpErr = validateOtp(otp)
    if (otpErr) {
      setError(otpErr)
      return
    }
    const emailErr = validateLoginEmail(email)
    if (emailErr) {
      setError(emailErr)
      return
    }
    setError('')
    setBusy(true)
    try {
      const next = await login(email.trim().toLowerCase(), otp.trim())
      setOtpVerified(true)
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setTimeout(() => {
        router.replace(homeRouteFor(next.role) as any)
      }, 1100)
    } catch (err) {
      setOtpVerified(false)
      setError(isNetworkError(err)
        ? `Cannot reach API at ${getApiBaseUrl().replace(/^https?:\/\//, '')}. Same Wi‑Fi + VPN off.`
        : apiError(err, 'Invalid OTP'))
    } finally {
      setBusy(false)
    }
  }

  async function onResendOtp() {
    const trimmed = email.trim().toLowerCase()
    const emailErr = validateLoginEmail(trimmed)
    if (emailErr) {
      setError(emailErr)
      return
    }
    setError('')
    const res = await requestOtp(trimmed)
    setDevOtp(res.devOtp ?? null)
    if (res.devOtp) setOtp(res.devOtp)
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  }

  async function onGoogle() {
    if (!googleConfigured) {
      setError('Add Google client IDs in Expo config (EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID).')
      return
    }
    if (!googleRequest) {
      setError('Google sign-in is still preparing. Try again in a moment.')
      return
    }
    setError('')
    setBusy(true)
    try {
      if (!(await applyApiUrl())) return
      const result = await promptGoogle()
      const soft = googleAuthErrorMessage(result)
      if (soft && result?.type !== 'success') {
        setError(soft)
        return
      }
      const idToken = extractGoogleIdToken(result)
      if (!idToken) {
        setError(soft || 'Google sign-in did not return a valid ID token')
        return
      }
      const next = await loginWithGoogle(idToken)
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      router.replace(homeRouteFor(next.role) as any)
    } catch (err) {
      setError(isNetworkError(err)
        ? `Cannot reach API (${getApiBaseUrl().replace(/^https?:\/\//, '')}).`
        : apiError(err, 'Google sign-in failed. Account must already exist in Haven.'))
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!loading && user) {
      router.replace(homeRouteFor(user.role) as any)
    }
  }, [loading, user, router])

  function pickRole(nextEmail: string) {
    setEmail(nextEmail)
    setError('')
    setOtpSent(false)
    setOtp('')
    setDevOtp(null)
    setOtpVerified(false)
    void Haptics.selectionAsync()
  }

  if (loading || user) {
    return (
      <View style={[styles.root, styles.center]}>
        <StatusBar style="light" />
        <ActivityIndicator color={colors.gateAccent} size="large" />
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#06120F', '#0C1C17', '#101A17', '#0A1612']}
        locations={[0, 0.35, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.orbA, orbA]} />
      <Animated.View style={[styles.orbB, orbB]} />
      <Animated.View style={[styles.sheen, shimmer]} />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View entering={FadeInDown.duration(480).easing(Easing.out(Easing.cubic))} style={styles.hero}>
              <Text style={styles.mark}>Haven</Text>
              <Text style={styles.tagline}>Community operating system</Text>
              <View style={styles.rule} />
              <Text style={styles.support}>
                One quiet login for residents, gate, desk, and society ops.
              </Text>
            </Animated.View>

            {otpSent ? (
              <Animated.View entering={FadeInUp.delay(80).duration(420)}>
                <GlassyOtpPanel
                  email={email}
                  otp={otp}
                  onChangeOtp={setOtp}
                  busy={busy}
                  error={error}
                  devOtp={devOtp}
                  verified={otpVerified}
                  onVerify={onVerify}
                  onResend={onResendOtp}
                  onBack={() => {
                    setOtpSent(false)
                    setOtp('')
                    setDevOtp(null)
                    setError('')
                    setOtpVerified(false)
                  }}
                />
              </Animated.View>
            ) : (
              <Animated.View entering={FadeInUp.delay(120).duration(420)} style={styles.panel}>
                <Text style={styles.panelEyebrow}>Sign in</Text>
                <Text style={styles.panelTitle}>Your society</Text>
                <Text style={styles.panelSub}>Choose a workspace, then receive a one-time code.</Text>

                <View style={styles.roleGrid}>
                  {DEMO_ACCOUNTS.map((d, i) => {
                    const active = email === d.email
                    const icon = ROLE_ICONS[d.label as keyof typeof ROLE_ICONS] || 'person-outline'
                    return (
                      <Animated.View
                        key={d.email}
                        entering={FadeIn.delay(160 + i * 40).duration(280)}
                        style={styles.roleCell}
                      >
                        <Pressable
                          onPress={() => pickRole(d.email)}
                          style={({ pressed }) => [
                            styles.rolePill,
                            active && styles.rolePillOn,
                            pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 },
                          ]}
                        >
                          <View style={[styles.roleIcon, active && styles.roleIconOn]}>
                            <Ionicons
                              name={icon as any}
                              size={17}
                              color={active ? '#06241C' : colors.gateAccent}
                            />
                          </View>
                          <Text
                            style={[styles.roleName, active && styles.roleNameOn]}
                            numberOfLines={1}
                          >
                            {d.label}
                          </Text>
                        </Pressable>
                      </Animated.View>
                    )
                  })}
                </View>

                <Text style={styles.label}>Email</Text>
                <View style={styles.fieldShell}>
                  <Ionicons name="mail-outline" size={18} color={colors.soft} style={{ marginRight: 10 }} />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="you@society.com"
                    placeholderTextColor="rgba(244,255,251,0.28)"
                    style={styles.input}
                  />
                </View>
                {selected ? (
                  <Text style={styles.selectedHint}>{selected.label} · {selected.blurb}</Text>
                ) : null}

                <ErrorText message={error} />
                <View style={{ height: 14 }} />
                <Button label={busy ? 'Sending…' : 'Send OTP'} icon="arrow-forward" loading={busy} onPress={onSend} />

                {showGoogle ? (
                  <>
                    <View style={styles.orRow}>
                      <View style={styles.orLine} />
                      <Text style={styles.orText}>or</Text>
                      <View style={styles.orLine} />
                    </View>
                    <Pressable
                      onPress={onGoogle}
                      disabled={busy || !googleConfigured}
                      style={({ pressed }) => [
                        styles.googleBtn,
                        (!googleConfigured || busy) && styles.googleBtnDisabled,
                        pressed && googleConfigured && !busy && { opacity: 0.9 },
                      ]}
                    >
                      <Ionicons name="logo-google" size={18} color={colors.onInk} />
                      <Text style={styles.googleBtnText}>
                        {busy ? 'Signing in…' : 'Continue with Google'}
                      </Text>
                    </Pressable>
                    {!googleConfigured && serverGoogle ? (
                      <Text style={styles.googleHint}>
                        Server Google is on — set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to finish client setup.
                      </Text>
                    ) : null}
                  </>
                ) : null}

                <Pressable onPress={() => setShowApi((v) => !v)} style={styles.apiToggle}>
                  <Text style={styles.apiToggleText}>{showApi ? 'Hide server' : 'API server'}</Text>
                  <Ionicons name={showApi ? 'chevron-up' : 'chevron-down'} size={16} color="rgba(244,255,251,0.4)" />
                </Pressable>
                {showApi ? (
                  <Animated.View entering={FadeIn.duration(200)}>
                    <View style={styles.fieldShell}>
                      <Ionicons name="server-outline" size={18} color={colors.soft} style={{ marginRight: 10 }} />
                      <TextInput
                        value={apiUrl}
                        onChangeText={setApiUrl}
                        autoCapitalize="none"
                        autoCorrect={false}
                        placeholder="http://10.0.2.2:8080/api/v1"
                        placeholderTextColor="rgba(244,255,251,0.28)"
                        style={[styles.input, { fontSize: 13 }]}
                      />
                    </View>
                    <Text style={styles.apiHint}>Emulator 10.0.2.2 · Phone: PC LAN IP</Text>
                  </Animated.View>
                ) : null}
              </Animated.View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

function isNetworkError(err: unknown) {
  const anyErr = err as { code?: string; message?: string; response?: unknown }
  if (anyErr?.response) return false
  const msg = String(anyErr?.message || '')
  return (
    anyErr?.code === 'ERR_NETWORK' ||
    anyErr?.code === 'ECONNABORTED' ||
    /network|timeout|ECONNREFUSED|Failed to connect/i.test(msg)
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#06120F', overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
  orbA: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(0,166,126,0.32)',
    top: -100,
    right: -90,
  },
  orbB: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(52,211,168,0.14)',
    bottom: '18%',
    left: -100,
  },
  sheen: {
    position: 'absolute',
    top: '22%',
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: 'rgba(244,255,251,0.5)',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingBottom: 28,
    justifyContent: 'space-between',
  },
  hero: {
    paddingTop: 28,
    paddingBottom: 28,
  },
  mark: {
    color: colors.onInk,
    fontSize: 64,
    fontFamily: fonts.displayBold,
    letterSpacing: -2.4,
    lineHeight: 68,
  },
  tagline: {
    marginTop: 10,
    color: colors.gateAccent,
    fontSize: 14,
    fontFamily: fonts.sansBold,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  rule: {
    marginTop: 22,
    width: 48,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.brand,
  },
  support: {
    marginTop: 16,
    color: colors.onInkMuted,
    fontSize: 17,
    lineHeight: 26,
    fontFamily: fonts.sans,
    maxWidth: 300,
  },
  panel: {
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(244,255,251,0.1)',
    padding: 22,
    paddingBottom: 18,
  },
  panelEyebrow: {
    color: colors.gateAccent,
    fontSize: 12,
    fontFamily: fonts.sansBold,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  panelTitle: {
    color: colors.onInk,
    fontSize: 32,
    fontFamily: fonts.displayBold,
    letterSpacing: -1,
  },
  panelSub: {
    marginTop: 8,
    marginBottom: 22,
    color: colors.onInkMuted,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: fonts.sans,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 22,
  },
  roleCell: {
    width: '47.5%',
    flexGrow: 1,
    minWidth: 140,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(244,255,251,0.1)',
    minHeight: 52,
  },
  rolePillOn: {
    backgroundColor: colors.gateAccent,
    borderColor: colors.gateAccent,
  },
  roleIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(52,211,168,0.12)',
  },
  roleIconOn: {
    backgroundColor: 'rgba(6,36,28,0.18)',
  },
  roleName: {
    flex: 1,
    color: colors.onInk,
    fontFamily: fonts.sansBold,
    fontSize: 13,
  },
  roleNameOn: {
    color: '#06241C',
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
    marginBottom: 14,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(244,255,251,0.16)',
  },
  orText: {
    color: 'rgba(244,255,251,0.4)',
    fontSize: 12,
    fontFamily: fonts.sansBold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 54,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(244,255,251,0.16)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  googleBtnDisabled: {
    opacity: 0.45,
  },
  googleBtnText: {
    color: colors.onInk,
    fontFamily: fonts.sansBold,
    fontSize: 15,
  },
  googleHint: {
    marginTop: 10,
    color: 'rgba(244,255,251,0.4)',
    fontSize: 12,
    lineHeight: 17,
    fontFamily: fonts.sans,
    textAlign: 'center',
  },
  label: {
    color: 'rgba(244,255,251,0.45)',
    fontSize: 12,
    fontFamily: fonts.sansBold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  fieldShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(244,255,251,0.08)',
    paddingHorizontal: 16,
    minHeight: 58,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.onInk,
    fontFamily: fonts.sans,
    paddingVertical: 14,
  },
  selectedHint: {
    color: colors.gateAccent,
    fontSize: 13,
    fontFamily: fonts.sansMed,
    marginBottom: 4,
    marginTop: 2,
  },
  otpShell: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  otpCell: {
    flex: 1,
    aspectRatio: 0.85,
    maxHeight: 58,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.28)',
    borderWidth: 1,
    borderColor: 'rgba(244,255,251,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpCellFocus: {
    borderColor: colors.gateAccent,
    backgroundColor: 'rgba(0,166,126,0.12)',
  },
  otpCellFilled: {
    borderColor: 'rgba(52,211,168,0.35)',
  },
  otpDigit: {
    color: colors.onInk,
    fontSize: 22,
    fontFamily: fonts.sansBold,
  },
  hiddenOtp: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
  },
  devBox: {
    marginTop: 4,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: 'rgba(0,166,126,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(52,211,168,0.28)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  devLabel: { color: colors.onInkMuted, fontSize: 12, fontFamily: fonts.sansBold },
  devCode: { color: colors.gateAccent, fontSize: 22, fontFamily: fonts.sansBold, letterSpacing: 4 },
  backLink: { marginTop: 16, alignItems: 'center', paddingVertical: 8 },
  backLinkText: { color: colors.onInkMuted, fontFamily: fonts.sansBold, fontSize: 14 },
  apiToggle: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  apiToggleText: {
    color: 'rgba(244,255,251,0.4)',
    fontSize: 12,
    fontFamily: fonts.sansBold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  apiHint: {
    marginTop: 6,
    textAlign: 'center',
    color: 'rgba(244,255,251,0.3)',
    fontSize: 11,
    fontFamily: fonts.sans,
  },
})
