import { useEffect, useRef, useState, type ElementRef } from 'react'
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { BlurView } from 'expo-blur'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  ZoomIn,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { Ionicons } from '@expo/vector-icons'
import { colors, fonts, radius } from '../theme'
import { ErrorText } from './ui'

type Props = {
  email: string
  otp: string
  onChangeOtp: (v: string) => void
  busy: boolean
  error: string
  devOtp?: string | null
  verified: boolean
  onVerify: () => void
  onResend: () => Promise<void> | void
  onBack: () => void
  resendSeconds?: number
}

function formatTimer(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.glassOuter}>
      <View style={styles.shardTL} />
      <View style={styles.shardBR} />
      {Platform.OS === 'web' ? (
        <View style={[styles.glassInner, styles.glassWebFallback]}>{children}</View>
      ) : (
        <BlurView intensity={42} tint="dark" style={styles.glassInner}>
          {children}
        </BlurView>
      )}
    </View>
  )
}

function OtpCell({
  digit, focused, filled, index,
}: {
  digit: string
  focused: boolean
  filled: boolean
  index: number
}) {
  const scale = useSharedValue(filled ? 1 : 0.92)
  useEffect(() => {
    scale.value = withSpring(filled || focused ? 1 : 0.94, { damping: 14, stiffness: 220 })
  }, [filled, focused, scale])

  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: focused
      ? 'rgba(50,184,150,0.95)'
      : filled
        ? 'rgba(50,184,150,0.45)'
        : 'rgba(255,255,255,0.14)',
    backgroundColor: focused
      ? 'rgba(23,107,85,0.28)'
      : filled
        ? 'rgba(255,255,255,0.1)'
        : 'rgba(255,255,255,0.05)',
    shadowOpacity: focused ? 0.45 : 0,
  }))

  return (
    <Animated.View entering={FadeInDown.delay(80 + index * 45).duration(320)} style={[styles.otpCell, anim]}>
      <Text style={styles.otpDigit}>{digit}</Text>
      {focused && !digit ? <View style={styles.caret} /> : null}
    </Animated.View>
  )
}

export function GlassyOtpPanel({
  email,
  otp,
  onChangeOtp,
  busy,
  error,
  devOtp,
  verified,
  onVerify,
  onResend,
  onBack,
  resendSeconds = 45,
}: Props) {
  const inputRef = useRef<ElementRef<typeof TextInput>>(null)
  const [seconds, setSeconds] = useState(resendSeconds)
  const [resending, setResending] = useState(false)
  const glow = useSharedValue(0)
  const check = useSharedValue(0)

  useEffect(() => {
    setSeconds(resendSeconds)
  }, [email, resendSeconds])

  useEffect(() => {
    if (seconds <= 0) return
    const id = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(id)
  }, [seconds])

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.35, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    )
  }, [glow])

  useEffect(() => {
    if (!verified) {
      check.value = 0
      return
    }
    check.value = withDelay(40, withSpring(1, { damping: 12, stiffness: 160 }))
  }, [verified, check])

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0.35, 0.85]),
    transform: [{ scale: interpolate(glow.value, [0, 1], [0.96, 1.06]) }],
  }))

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: check.value }],
    opacity: check.value,
  }))

  async function handleResend() {
    if (seconds > 0 || resending || busy) return
    setResending(true)
    try {
      await onResend()
      setSeconds(resendSeconds)
    } finally {
      setResending(false)
    }
  }

  if (verified) {
    return (
      <Animated.View entering={FadeIn.duration(280)} exiting={FadeOut.duration(180)}>
        <GlassCard>
          <View style={styles.successHead}>
            <View style={styles.successBadge}>
              <Ionicons name="shield-checkmark" size={18} color="#34D3A8" />
            </View>
            <Text style={styles.successTitle}>
              Verified <Text style={styles.successEmph}>Successfully</Text>
            </Text>
          </View>
          <Text style={styles.successSub}>Your security verification code has been confirmed.</Text>

          <View style={styles.successMarkWrap}>
            <Animated.View style={[styles.successGlow, glowStyle]} />
            <Animated.View entering={ZoomIn.springify().damping(12)} style={[styles.successMark, checkStyle]}>
              <Ionicons name="checkmark" size={42} color="#fff" />
            </Animated.View>
          </View>

          <View style={styles.successBtn}>
            <LinearGradient
              colors={['#32B896', '#176B55', '#0E4F3E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.successBtnGrad}
            >
              <Ionicons name="shield-checkmark" size={18} color="#fff" />
              <Text style={styles.successBtnText}>Verified & Secured</Text>
            </LinearGradient>
          </View>
        </GlassCard>
      </Animated.View>
    )
  }

  return (
    <Animated.View entering={FadeInDown.duration(420).easing(Easing.out(Easing.cubic))}>
      <GlassCard>
        <View style={styles.iconRing}>
          <Animated.View style={[styles.iconGlow, glowStyle]} />
          <Ionicons name="key" size={22} color="#34D3A8" />
        </View>

        <Text style={styles.title}>
          Verify <Text style={styles.titleEmph}>OTP</Text>
        </Text>
        <Text style={styles.sub}>
          Enter the 6-digit security code sent to{'\n'}
          <Text style={styles.email}>{email}</Text>
        </Text>

        <Pressable onPress={() => inputRef.current?.focus()} style={styles.otpRow}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <OtpCell
              key={i}
              index={i}
              digit={otp[i] || ''}
              focused={otp.length === i}
              filled={Boolean(otp[i])}
            />
          ))}
        </Pressable>

        <TextInput
          ref={inputRef}
          value={otp}
          onChangeText={(v) => onChangeOtp(v.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          style={styles.hidden}
          maxLength={6}
          autoFocus
          caretHidden
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
        />

        {devOtp ? (
          <View style={styles.devBox}>
            <Text style={styles.devLabel}>Dev OTP</Text>
            <Text style={styles.devCode}>{devOtp}</Text>
          </View>
        ) : null}

        <ErrorText message={error} />

        <Text style={styles.resend}>
          Didn&apos;t receive the code?{' '}
          {seconds > 0 ? (
            <Text style={styles.resendTimer}>Resend in {formatTimer(seconds)}</Text>
          ) : (
            <Text style={styles.resendAction} onPress={() => { void handleResend() }}>
              {resending ? 'Sending…' : 'Resend now'}
            </Text>
          )}
        </Text>

        <Pressable
          disabled={busy || otp.length !== 6}
          onPress={onVerify}
          style={({ pressed }) => [
            styles.primaryBtn,
            (busy || otp.length !== 6) && styles.primaryDisabled,
            pressed && otp.length === 6 && !busy && { opacity: 0.92, transform: [{ scale: 0.99 }] },
          ]}
        >
          <LinearGradient
            colors={otp.length === 6 ? ['#32B896', '#176B55'] : ['#2A3A34', '#24322C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryGrad}
          >
            {busy ? (
              <Text style={styles.primaryText}>Verifying code…</Text>
            ) : (
              <>
                <Text style={styles.primaryText}>Verify & Proceed</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </>
            )}
          </LinearGradient>
        </Pressable>

        <Pressable onPress={onBack} style={styles.back}>
          <Text style={styles.backText}>Use a different email</Text>
        </Pressable>
      </GlassCard>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  glassOuter: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(16,24,40,0.35)',
  },
  glassInner: {
    padding: 22,
    paddingBottom: 18,
    overflow: 'hidden',
  },
  glassWebFallback: {
    backgroundColor: 'rgba(16,24,40,0.72)',
    // @ts-expect-error web-only
    backdropFilter: 'blur(22px)',
  },
  shardTL: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 54,
    height: 54,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: 'rgba(255,255,255,0.28)',
    borderTopLeftRadius: 26,
    zIndex: 2,
  },
  shardBR: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 54,
    height: 54,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: 'rgba(50,184,150,0.35)',
    borderBottomRightRadius: 26,
    zIndex: 2,
  },
  iconRing: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(50,184,150,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(50,184,150,0.35)',
    marginBottom: 16,
    overflow: 'hidden',
  },
  iconGlow: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(50,184,150,0.22)',
  },
  title: {
    textAlign: 'center',
    color: colors.onInk,
    fontSize: 30,
    fontFamily: fonts.displayBold,
    letterSpacing: -0.8,
  },
  titleEmph: { color: '#34D3A8' },
  sub: {
    marginTop: 10,
    textAlign: 'center',
    color: colors.onInkMuted,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: fonts.sans,
    marginBottom: 22,
  },
  email: { color: colors.onInk, fontFamily: fonts.sansMed },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  otpCell: {
    flex: 1,
    aspectRatio: 0.82,
    maxHeight: 58,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#32B896',
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  otpDigit: {
    color: colors.onInk,
    fontSize: 22,
    fontFamily: fonts.sansBold,
  },
  caret: {
    width: 2,
    height: 22,
    borderRadius: 1,
    backgroundColor: '#34D3A8',
  },
  hidden: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
  },
  devBox: {
    marginBottom: 10,
    paddingVertical: 10,
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
  devCode: { color: '#34D3A8', fontSize: 20, fontFamily: fonts.sansBold, letterSpacing: 3 },
  resend: {
    textAlign: 'center',
    color: 'rgba(244,255,251,0.55)',
    fontSize: 13,
    fontFamily: fonts.sans,
    marginTop: 4,
    marginBottom: 16,
  },
  resendTimer: { color: '#34D3A8', fontFamily: fonts.sansBold },
  resendAction: { color: '#34D3A8', fontFamily: fonts.sansBold, textDecorationLine: 'underline' },
  primaryBtn: { borderRadius: 16, overflow: 'hidden' },
  primaryDisabled: { opacity: 0.7 },
  primaryGrad: {
    minHeight: 56,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryText: { color: '#fff', fontFamily: fonts.sansBold, fontSize: 16 },
  back: { marginTop: 14, alignItems: 'center', paddingVertical: 8 },
  backText: { color: colors.onInkMuted, fontFamily: fonts.sansBold, fontSize: 14 },
  successHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  successBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(50,184,150,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(50,184,150,0.4)',
  },
  successTitle: {
    flex: 1,
    color: colors.onInk,
    fontSize: 22,
    fontFamily: fonts.displayBold,
    letterSpacing: -0.4,
  },
  successEmph: { color: '#34D3A8' },
  successSub: {
    color: colors.onInkMuted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.sans,
    marginBottom: 22,
  },
  successMarkWrap: {
    alignSelf: 'center',
    width: 108,
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successGlow: {
    position: 'absolute',
    width: 108,
    height: 108,
    borderRadius: 28,
    backgroundColor: 'rgba(50,184,150,0.35)',
  },
  successMark: {
    width: 88,
    height: 88,
    borderRadius: 24,
    backgroundColor: '#176B55',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  successBtn: { borderRadius: 16, overflow: 'hidden' },
  successBtnGrad: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  successBtnText: { color: '#fff', fontFamily: fonts.sansBold, fontSize: 16 },
})
