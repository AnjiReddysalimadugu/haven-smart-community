import { ReactNode } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native'
import Animated, {
  FadeIn as ReFadeIn,
  FadeInDown,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import type { IonName } from '../icons'
import { IconCircle } from '../icons'
import { colors, fonts, radius, shadow, space } from '../theme'

export function Screen({ children, style, dark }: { children: ReactNode; style?: ViewStyle; dark?: boolean }) {
  return <View style={[styles.screen, dark && styles.screenDark, style]}>{children}</View>
}

export function FadeIn({ children, delay = 0, index = 0 }: { children: ReactNode; delay?: number; index?: number }) {
  return (
    <Animated.View entering={ReFadeIn.delay(Math.min(delay + index * 30, 160)).duration(220)}>
      {children}
    </Animated.View>
  )
}

export function Glass({
  children, style, dark,
}: {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  intensity?: number
  dark?: boolean
}) {
  // Kept as SoftSurface alias for existing call sites
  return <View style={[styles.surface, dark && styles.surfaceDark, style]}>{children}</View>
}

export function InkHero({
  eyebrow, title, subtitle, children, compact,
}: {
  eyebrow: string
  title: string
  subtitle?: string
  children?: ReactNode
  compact?: boolean
}) {
  return (
    <Animated.View entering={FadeInDown.duration(300)} style={[styles.hero, compact && styles.heroCompact]}>
      <View style={styles.heroAccent} />
      <Text style={styles.eyebrowOnDark}>{eyebrow}</Text>
      <Text style={[styles.heroTitle, compact && styles.heroTitleCompact]}>{title}</Text>
      {subtitle ? <Text style={styles.heroSub}>{subtitle}</Text> : null}
      {children}
    </Animated.View>
  )
}

export function PageHeader({
  eyebrow, title, subtitle, dark, right,
}: {
  eyebrow: string
  title: string
  subtitle?: string
  dark?: boolean
  right?: ReactNode
}) {
  return (
    <Animated.View entering={FadeInDown.duration(240)} style={styles.pageHeader}>
      <View style={{ flex: 1, paddingRight: 8 }}>
        <Text style={[styles.eyebrow, dark && { color: colors.gateAccent }]}>{eyebrow}</Text>
        <Text style={[styles.pageTitle, dark && { color: colors.onInk }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.pageSub, dark && { color: colors.onInkMuted }]}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </Animated.View>
  )
}

export function Section({ label, right }: { label: string; right?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.section}>{label}</Text>
      {right}
    </View>
  )
}

export function StatRow({ items }: { items: { label: string; value: string }[] }) {
  return (
    <View style={styles.statRow}>
      {items.map((item, i) => (
        <FadeIn key={item.label} index={i}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{item.label}</Text>
            <Text style={styles.statValue}>{item.value}</Text>
          </View>
        </FadeIn>
      ))}
    </View>
  )
}

export function ActionTile({
  title, subtitle, onPress, accent, icon,
}: {
  title: string
  subtitle: string
  onPress: () => void
  accent?: boolean
  icon?: ReactNode
}) {
  return (
    <PressScale onPress={onPress} style={{ flex: 1 }}>
      <View style={[styles.actionTile, accent && styles.actionTileAccent]}>
        {icon}
        <Text style={[styles.actionTitle, accent && { color: colors.onInk }]}>{title}</Text>
        <Text style={[styles.actionSub, accent && { color: colors.onInkMuted }]}>{subtitle}</Text>
      </View>
    </PressScale>
  )
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>
}

export function ListRow({
  icon, title, subtitle, meta, right, onPress, dark,
}: {
  icon?: IonName
  title: string
  subtitle?: string
  meta?: string
  right?: ReactNode
  onPress?: () => void
  dark?: boolean
}) {
  const body = (
    <View style={[styles.listRow, dark && styles.listRowDark]}>
      {icon ? <IconCircle name={icon} size={46} tone={dark ? 'dark' : 'glass'} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={[styles.listTitle, dark && { color: colors.onInk }]} numberOfLines={1}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.listSub, dark && { color: colors.onInkMuted }]} numberOfLines={2}>{subtitle}</Text>
        ) : null}
        {meta ? <Text style={styles.listMeta}>{meta}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.soft} /> : null)}
    </View>
  )
  if (!onPress) return body
  return <PressScale onPress={onPress}>{body}</PressScale>
}

export function Field({
  label, value, onChangeText, placeholder, keyboardType, secureTextEntry, multiline, inverted, autoCapitalize,
}: {
  label: string
  value: string
  onChangeText: (v: string) => void
  placeholder?: string
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'number-pad'
  secureTextEntry?: boolean
  multiline?: boolean
  inverted?: boolean
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, inverted && { color: colors.onInkMuted }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={inverted ? 'rgba(244,255,251,0.35)' : colors.soft}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        autoCapitalize={autoCapitalize ?? (keyboardType === 'email-address' ? 'none' : 'sentences')}
        style={[
          styles.input,
          inverted && styles.inputInverted,
          multiline && { minHeight: 100, textAlignVertical: 'top' },
        ]}
      />
    </View>
  )
}

/** 2026 expressive button — large, pill, morphing radius on press */
export function Button({
  label, onPress, variant = 'primary', disabled, loading, icon,
}: {
  label: string
  onPress: () => void
  variant?: 'primary' | 'lime' | 'ghost' | 'danger' | 'ghostDark'
  disabled?: boolean
  loading?: boolean
  icon?: IonName
}) {
  const scale = useSharedValue(1)
  const corner = useSharedValue(radius.full)
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderRadius: corner.value,
  }))
  const isSolid = variant === 'primary' || variant === 'lime'

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled || loading}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 16 })
        corner.value = withSpring(18, { damping: 14 })
      }}
      onPressOut={() => {
        scale.value = withSpring(1)
        corner.value = withSpring(radius.full)
      }}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
        onPress()
      }}
      style={(disabled || loading) ? { opacity: 0.45 } : undefined}
    >
      <Animated.View
        style={[
          styles.btn,
          isSolid && styles.btnSolid,
          variant === 'ghost' && styles.btnGhost,
          variant === 'ghostDark' && styles.btnGhostDark,
          variant === 'danger' && styles.btnDanger,
          anim,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={isSolid ? '#fff' : variant === 'danger' ? colors.danger : colors.brand} />
        ) : (
          <View style={styles.btnInner}>
            {icon ? (
              <Ionicons
                name={icon}
                size={20}
                color={isSolid ? '#fff' : variant === 'danger' ? colors.danger : variant === 'ghostDark' ? colors.onInk : colors.text}
              />
            ) : null}
            <Text
              style={[
                styles.btnText,
                isSolid && { color: '#fff' },
                variant === 'ghost' && { color: colors.text },
                variant === 'ghostDark' && { color: colors.onInk },
                variant === 'danger' && { color: colors.danger },
              ]}
            >
              {label}
            </Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  )
}

export function IconButton({
  name, onPress, tone = 'glass', accessibilityLabel,
}: {
  name: IonName
  onPress: () => void
  tone?: 'glass' | 'brand' | 'dark'
  accessibilityLabel?: string
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || name}
      onPress={() => {
        void Haptics.selectionAsync().catch(() => {})
        onPress()
      }}
      style={({ pressed }) => [
        styles.iconBtn,
        tone === 'brand' && styles.iconBtnBrand,
        tone === 'dark' && styles.iconBtnDark,
        pressed && { transform: [{ scale: 0.94 }] },
      ]}
    >
      <Ionicons
        name={name}
        size={22}
        color={tone === 'brand' ? '#fff' : tone === 'dark' ? colors.onInk : colors.brand}
      />
    </Pressable>
  )
}

export function CreateFab({ onPress, label = 'Create' }: { onPress: () => void; label?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
        onPress()
      }}
      style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.94 }] }]}
    >
      <Ionicons name="add" size={30} color="#fff" />
    </Pressable>
  )
}

/** 2026 modal bottom sheet */
export function GlassSheet({
  visible, onClose, title, subtitle, icon, children, footer,
}: {
  visible: boolean
  onClose: () => void
  title: string
  subtitle?: string
  icon?: IonName
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.sheetRoot}>
        <Pressable style={styles.sheetDim} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.sheetAvoid}>
          <Animated.View entering={SlideInDown.springify().damping(18)} style={[styles.sheet, shadow.sheet]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHead}>
              {icon ? <IconCircle name={icon} size={48} tone="brand" /> : null}
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>{title}</Text>
                {subtitle ? <Text style={styles.sheetSub}>{subtitle}</Text> : null}
              </View>
              <IconButton name="close" onPress={onClose} accessibilityLabel="Close" />
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: space.sm }}
            >
              {children}
            </ScrollView>
            {footer ? <View style={styles.sheetFooter}>{footer}</View> : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

export function Chip({
  label, active, onPress,
}: { label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  )
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <View style={styles.chipRow}>{children}</View>
}

export function ErrorText({ message }: { message?: string }) {
  if (!message) return null
  return (
    <View style={styles.errorBox}>
      <Ionicons name="alert-circle" size={18} color={colors.danger} style={{ marginRight: 8 }} />
      <Text style={styles.errorText}>{message}</Text>
    </View>
  )
}

export function Notice({ message, tone = 'warn' }: { message: string; tone?: 'warn' | 'info' }) {
  return (
    <View style={[styles.notice, tone === 'info' && styles.noticeInfo]}>
      <Ionicons
        name={tone === 'info' ? 'information-circle' : 'warning'}
        size={18}
        color={tone === 'info' ? colors.accent : colors.warning}
        style={{ marginRight: 8, marginTop: 1 }}
      />
      <Text style={[styles.noticeText, tone === 'info' && styles.noticeTextInfo]}>{message}</Text>
    </View>
  )
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.accent} size="large" />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  )
}

export function Empty({
  title, body, dark, actionLabel, onAction, icon = 'file-tray-outline',
}: {
  title: string
  body?: string
  dark?: boolean
  actionLabel?: string
  onAction?: () => void
  icon?: IonName
}) {
  return (
    <View style={[styles.empty, dark && styles.emptyDark]}>
      <IconCircle name={icon} size={56} tone={dark ? 'dark' : 'glass'} />
      <Text style={[styles.emptyTitle, dark && { color: colors.onInk }]}>{title}</Text>
      {body ? <Text style={[styles.emptyBody, dark && { color: colors.onInkMuted }]}>{body}</Text> : null}
      {actionLabel && onAction ? (
        <View style={{ marginTop: 16, alignSelf: 'stretch' }}>
          <Button label={actionLabel} onPress={onAction} icon="add" />
        </View>
      ) : null}
    </View>
  )
}

function formatStatusLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function StatusPill({ value }: { value: string }) {
  const raw = value || ''
  const tone = /^(PAID|RESOLVED|CLOSED|APPROVED|ALLOCATED|AVAILABLE|EXITED|ACTIVE)$/i.test(raw)
    ? colors.success
    : /OVERDUE|REJECT|DANGER|INACTIVE|DENIED|CANCEL/i.test(raw)
      ? colors.danger
      : /PENDING|PARTIAL|IN_PROGRESS|OPEN/i.test(raw)
        ? colors.warning
        : colors.accent
  return (
    <View style={[styles.pill, { backgroundColor: `${tone}18` }]}>
      <Text style={[styles.pillText, { color: tone }]}>{formatStatusLabel(raw)}</Text>
    </View>
  )
}

export function PressScale({ children, onPress, style }: { children: ReactNode; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  const scale = useSharedValue(1)
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }))
  const flat = StyleSheet.flatten(style)
  return (
    <Pressable
      style={style}
      onPressIn={() => { scale.value = withTiming(0.97, { duration: 90 }) }}
      onPressOut={() => { scale.value = withSpring(1) }}
      onPress={onPress}
    >
      <Animated.View style={[{ flex: flat?.flex === 1 ? 1 : undefined }, anim]}>{children}</Animated.View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.mist },
  screenDark: { backgroundColor: colors.ink },
  surface: {
    backgroundColor: colors.chalk,
    borderRadius: radius.lg,
    ...shadow.card,
  },
  surfaceDark: {
    backgroundColor: colors.inkSoft,
  },
  hero: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    padding: space.lg,
    minHeight: 156,
    justifyContent: 'flex-end',
    marginBottom: space.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  heroCompact: { minHeight: 112, paddingVertical: space.md },
  heroAccent: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(23,107,85,0.28)',
    top: -36,
    right: -28,
  },
  eyebrow: {
    color: colors.brand,
    fontSize: 12,
    fontFamily: fonts.sansBold,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  eyebrowOnDark: {
    color: colors.gateAccent,
    fontSize: 12,
    fontFamily: fonts.sansBold,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  heroTitle: {
    color: colors.onInk,
    fontSize: 32,
    fontFamily: fonts.displayBold,
    letterSpacing: -1,
    lineHeight: 36,
  },
  heroTitleCompact: { fontSize: 26, lineHeight: 30 },
  heroSub: {
    color: colors.onInkMuted,
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: fonts.sans,
    maxWidth: '94%',
  },
  pageHeader: {
    marginBottom: space.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  pageTitle: {
    color: colors.text,
    fontSize: 30,
    fontFamily: fonts.displayBold,
    letterSpacing: -0.9,
    marginTop: 2,
  },
  pageSub: {
    color: colors.muted,
    marginTop: 6,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: fonts.sans,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    marginTop: 10,
  },
  section: {
    fontSize: 13,
    fontFamily: fonts.sansBold,
    color: colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  statRow: { flexDirection: 'row', gap: 12, marginBottom: space.md },
  statCard: {
    flex: 1,
    backgroundColor: colors.chalk,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 11,
    fontFamily: fonts.sansBold,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  statValue: {
    marginTop: 8,
    fontSize: 22,
    fontFamily: fonts.displayBold,
    color: colors.text,
    letterSpacing: -0.6,
  },
  actionTile: {
    backgroundColor: colors.chalk,
    borderRadius: radius.md,
    padding: space.md,
    minHeight: 108,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  actionTileAccent: { backgroundColor: colors.ink, borderColor: 'transparent' },
  actionTitle: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.text, letterSpacing: -0.2 },
  actionSub: { marginTop: 5, fontSize: 13, color: colors.muted, lineHeight: 18, fontFamily: fonts.sans },
  card: {
    backgroundColor: colors.chalk,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 4,
    marginBottom: 4,
    minHeight: 72,
  },
  listRowDark: {},
  listTitle: { fontFamily: fonts.sansBold, fontSize: 17, color: colors.text, letterSpacing: -0.2 },
  listSub: { color: colors.muted, fontSize: 14, marginTop: 4, lineHeight: 20, fontFamily: fonts.sans },
  listMeta: { color: colors.brand, fontSize: 14, marginTop: 6, fontFamily: fonts.sansBold },
  field: { marginBottom: space.md },
  fieldLabel: {
    fontSize: 13,
    fontFamily: fonts.sansBold,
    color: colors.muted,
    marginBottom: 10,
  },
  input: {
    borderWidth: 0,
    borderRadius: radius.md,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 17,
    color: colors.text,
    backgroundColor: colors.secondaryFill,
    fontFamily: fonts.sans,
    minHeight: 56,
  },
  inputInverted: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    color: colors.onInk,
  },
  btn: {
    minHeight: 56,
    paddingVertical: 16,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  btnInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  btnSolid: { backgroundColor: colors.brand },
  btnGhost: { backgroundColor: colors.secondaryFill },
  btnGhostDark: { backgroundColor: 'rgba(255,255,255,0.1)' },
  btnDanger: { backgroundColor: '#FFE4E6' },
  btnText: { fontFamily: fonts.sansBold, fontSize: 17, letterSpacing: -0.2 },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandSoft,
  },
  iconBtnBrand: { backgroundColor: colors.brand },
  iconBtnDark: { backgroundColor: 'rgba(255,255,255,0.1)' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 84,
    zIndex: 20,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#101828',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  sheetDim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(16,24,40,0.45)' },
  sheetAvoid: { justifyContent: 'flex-end', maxHeight: '92%' },
  sheet: {
    backgroundColor: colors.chalk,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: space.lg,
    paddingTop: 12,
    paddingBottom: space.xl,
    maxHeight: '100%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.secondaryFill,
    marginBottom: 16,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: space.lg,
  },
  sheetTitle: {
    fontSize: 28,
    fontFamily: fonts.displayBold,
    color: colors.text,
    letterSpacing: -0.8,
  },
  sheetSub: {
    marginTop: 4,
    fontSize: 15,
    color: colors.muted,
    lineHeight: 22,
    fontFamily: fonts.sans,
  },
  sheetFooter: { marginTop: space.md, gap: 10 },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
    backgroundColor: colors.secondaryFill,
    borderRadius: radius.full,
    padding: 4,
  },
  chip: {
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  chipActive: { backgroundColor: colors.chalk, ...shadow.card },
  chipText: { color: colors.muted, fontFamily: fonts.sansMed, fontSize: 14 },
  chipTextActive: { color: colors.text, fontFamily: fonts.sansBold },
  errorBox: {
    backgroundColor: '#FFE4E6',
    borderRadius: radius.md,
    padding: 14,
    marginBottom: space.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: { color: colors.danger, fontSize: 14, fontFamily: fonts.sansMed, flex: 1 },
  notice: {
    backgroundColor: '#FFF7ED',
    borderRadius: radius.md,
    padding: 14,
    marginBottom: space.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  noticeInfo: { backgroundColor: colors.brandSoft },
  noticeText: { color: colors.warning, fontSize: 14, fontFamily: fonts.sansMed, lineHeight: 20, flex: 1 },
  noticeTextInfo: { color: colors.brandDeep },
  loading: { paddingVertical: 36, alignItems: 'center', gap: 12 },
  loadingText: { color: colors.muted, fontSize: 14, fontFamily: fonts.sansMed },
  empty: {
    padding: 36,
    alignItems: 'center',
    marginBottom: space.sm,
    gap: 10,
    backgroundColor: colors.chalk,
    borderRadius: radius.lg,
    ...shadow.card,
  },
  emptyDark: { backgroundColor: colors.inkSoft },
  emptyTitle: { fontFamily: fonts.sansBold, fontSize: 18, color: colors.text, marginTop: 4 },
  emptyBody: {
    marginTop: 2,
    color: colors.muted,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    fontFamily: fonts.sans,
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  pillText: { fontSize: 12, fontFamily: fonts.sansBold, letterSpacing: 0.2 },
})
