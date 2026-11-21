/**
 * Menu motion patterns (adapted from Menu Part 2 refs):
 * Push Back · Kebab Popover · Gooey · Fold Down · Button→Panel · Command Palette
 * Haven tokens only — no purple/glow clone.
 */
import { ReactNode, useEffect, useMemo, useState } from 'react'
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import type { IonName } from '../icons'
import { colors, fonts, radius, shadow, space } from '../theme'

export type MotionAction = {
  key: string
  label: string
  icon: IonName
  tone?: 'default' | 'danger'
  onPress: () => void
}

/** Fold Down — rows unfold one-by-one like folded paper. */
export function FoldDown({
  index, children,
}: { index: number; children: ReactNode }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index * 55, 360))
        .duration(320)
        .easing(Easing.out(Easing.cubic))}
    >
      {children}
    </Animated.View>
  )
}

/** Kebab Popover — dots expand into action rows. */
export function KebabPopover({
  actions, accessibilityLabel = 'More actions',
}: {
  actions: MotionAction[]
  accessibilityLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const progress = useSharedValue(0)

  useEffect(() => {
    progress.value = withSpring(open ? 1 : 0, { damping: 16, stiffness: 220 })
  }, [open, progress])

  const kebabAnim = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [1, 0.35]),
    transform: [{ rotate: `${interpolate(progress.value, [0, 1], [0, 90])}deg` }],
  }))

  return (
    <View style={styles.kebabWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        hitSlop={10}
        onPress={() => {
          void Haptics.selectionAsync().catch(() => {})
          setOpen((v) => !v)
        }}
        style={({ pressed }) => [styles.kebabBtn, pressed && { opacity: 0.7 }]}
      >
        <Animated.View style={kebabAnim}>
          <Ionicons name="ellipsis-vertical" size={18} color={colors.muted} />
        </Animated.View>
      </Pressable>

      {open ? (
        <>
          <Pressable style={styles.kebabScrim} onPress={() => setOpen(false)} />
          <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={styles.kebabMenu}>
            {actions.map((a, i) => (
              <Animated.View
                key={a.key}
                entering={FadeInDown.delay(40 + i * 45).duration(220)}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={a.label}
                  onPress={() => {
                    setOpen(false)
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
                    a.onPress()
                  }}
                  style={({ pressed }) => [
                    styles.kebabItem,
                    a.tone === 'danger' && styles.kebabItemDanger,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Ionicons
                    name={a.icon}
                    size={16}
                    color={a.tone === 'danger' ? colors.danger : colors.ink}
                  />
                  <Text style={[styles.kebabLabel, a.tone === 'danger' && { color: colors.danger }]}>
                    {a.label}
                  </Text>
                </Pressable>
              </Animated.View>
            ))}
          </Animated.View>
        </>
      ) : null}
    </View>
  )
}

function GooeyOrb({
  action, index, count, progress, open, onDone,
}: {
  action: MotionAction
  index: number
  count: number
  progress: SharedValue<number>
  open: boolean
  onDone: () => void
}) {
  const angle = (-100 + (index * (count <= 1 ? 0 : 55)) / Math.max(count - 1, 1)) * (Math.PI / 180)
  const dist = 82
  const orbStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [0, Math.cos(angle) * dist]) },
      { translateY: interpolate(progress.value, [0, 1], [0, Math.sin(angle) * dist]) },
      { scale: interpolate(progress.value, [0, 0.55, 1], [0.35, 1.1, 1]) },
    ],
  }))
  return (
    <Animated.View style={[styles.gooeyOrbWrap, orbStyle]} pointerEvents={open ? 'auto' : 'none'}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={action.label}
        onPress={() => {
          onDone()
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
          action.onPress()
        }}
        style={styles.gooeyOrb}
      >
        <Ionicons name={action.icon} size={20} color={colors.onInk} />
      </Pressable>
      <Text style={styles.gooeyOrbLabel}>{action.label}</Text>
    </Animated.View>
  )
}

/** Gooey Menu — orbs split from the FAB like drops. */
export function GooeyFab({
  actions, label = 'Create',
}: {
  actions: MotionAction[]
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const t = useSharedValue(0)

  useEffect(() => {
    t.value = withSpring(open ? 1 : 0, { damping: 14, stiffness: 180 })
  }, [open, t])

  const mainAnim = useAnimatedStyle(() => ({
    transform: [{ rotate: `${interpolate(t.value, [0, 1], [0, 45])}deg` }],
  }))

  return (
    <View pointerEvents="box-none" style={styles.gooeyRoot}>
      {open ? (
        <Pressable
          style={styles.gooeyDim}
          onPress={() => setOpen(false)}
          accessibilityLabel="Dismiss menu"
        />
      ) : null}

      {actions.map((a, i) => (
        <GooeyOrb
          key={a.key}
          action={a}
          index={i}
          count={actions.length}
          progress={t}
          open={open}
          onDone={() => setOpen(false)}
        />
      ))}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={open ? 'Close' : label}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
          setOpen((v) => !v)
        }}
        style={({ pressed }) => [styles.gooeyMain, pressed && { transform: [{ scale: 0.94 }] }]}
      >
        <Animated.View style={mainAnim}>
          <Ionicons name="add" size={30} color="#fff" />
        </Animated.View>
      </Pressable>
    </View>
  )
}

/** Button → Panel — + New grows into an options panel. */
export function ExpandCreatePanel({
  label = '+ New',
  options,
}: {
  label?: string
  options: MotionAction[]
}) {
  const [open, setOpen] = useState(false)
  const t = useSharedValue(0)

  useEffect(() => {
    t.value = withSpring(open ? 1 : 0, { damping: 18, stiffness: 200 })
  }, [open, t])

  const panelAnim = useAnimatedStyle(() => ({
    width: interpolate(t.value, [0, 1], [112, 248]),
    height: interpolate(t.value, [0, 1], [44, 44 + options.length * 48]),
    borderRadius: interpolate(t.value, [0, 1], [radius.full, radius.lg]),
  }))

  return (
    <View style={styles.expandWrap}>
      {open ? <Pressable style={styles.expandScrim} onPress={() => setOpen(false)} /> : null}
      <Animated.View style={[styles.expandPanel, panelAnim, shadow.sheet]}>
        {!open ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => {
              void Haptics.selectionAsync().catch(() => {})
              setOpen(true)
            }}
            style={styles.expandTrigger}
          >
            <Ionicons name="add" size={18} color={colors.onInk} />
            <Text style={styles.expandTriggerText}>{label.replace(/^\+\s*/, '')}</Text>
          </Pressable>
        ) : (
          <View style={{ paddingTop: 6 }}>
            {options.map((o, i) => (
              <Animated.View key={o.key} entering={FadeInDown.delay(60 + i * 50).duration(220)}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={o.label}
                  onPress={() => {
                    setOpen(false)
                    o.onPress()
                  }}
                  style={({ pressed }) => [styles.expandItem, pressed && { opacity: 0.8 }]}
                >
                  <Ionicons name={o.icon} size={18} color={o.tone === 'danger' ? colors.danger : colors.onInk} />
                  <Text style={styles.expandItemText}>{o.label}</Text>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        )}
      </Animated.View>
    </View>
  )
}

/** Command Palette — search drops in, results stagger. */
export function CommandPalette({
  visible, onClose, placeholder = 'Jump to society…', items, onSelect,
}: {
  visible: boolean
  onClose: () => void
  placeholder?: string
  items: { id: string; title: string; subtitle?: string }[]
  onSelect: (id: string) => void
}) {
  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return items.slice(0, 8)
    return items.filter((i) =>
      i.title.toLowerCase().includes(needle) || (i.subtitle || '').toLowerCase().includes(needle),
    ).slice(0, 8)
  }, [items, q])

  useEffect(() => {
    if (!visible) setQ('')
  }, [visible])

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.cmdDim} onPress={onClose} />
      <View style={styles.cmdWrap} pointerEvents="box-none">
        <Animated.View entering={FadeInDown.duration(280).easing(Easing.out(Easing.cubic))} style={styles.cmdPanel}>
          <View style={styles.cmdSearchRow}>
            <Ionicons name="search" size={18} color={colors.soft} />
            <TextInput
              autoFocus
              value={q}
              onChangeText={setQ}
              placeholder={placeholder}
              placeholderTextColor={colors.soft}
              style={styles.cmdInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          {filtered.map((item, i) => (
            <Animated.View key={item.id} entering={FadeInDown.delay(50 + i * 40).duration(220)}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  onSelect(item.id)
                  onClose()
                }}
                style={({ pressed }) => [styles.cmdRow, pressed && { backgroundColor: colors.brandSoft }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cmdTitle}>{item.title}</Text>
                  {item.subtitle ? <Text style={styles.cmdSub}>{item.subtitle}</Text> : null}
                </View>
                <Ionicons name="arrow-forward" size={16} color={colors.soft} />
              </Pressable>
            </Animated.View>
          ))}
          {!filtered.length ? (
            <Text style={styles.cmdEmpty}>No matches</Text>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  )
}

/**
 * Push Back shell — page shrinks & slides, revealing a side rail.
 * `open` drives the transform; put menu content in `menu`, page in `children`.
 */
export function PushBackShell({
  open, menu, children, onClose,
}: {
  open: boolean
  menu: ReactNode
  children: ReactNode
  onClose: () => void
}) {
  const t = useSharedValue(0)
  useEffect(() => {
    t.value = withSpring(open ? 1 : 0, { damping: 20, stiffness: 180 })
  }, [open, t])

  const pageAnim = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(t.value, [0, 1], [0, 210]) },
      { scale: interpolate(t.value, [0, 1], [1, 0.88]) },
    ],
    borderRadius: interpolate(t.value, [0, 1], [0, 24]),
  }))

  const menuAnim = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 1], [0, 1]),
    transform: [{ translateX: interpolate(t.value, [0, 1], [-40, 0]) }],
  }))

  return (
    <View style={styles.pushRoot}>
      <Animated.View style={[styles.pushMenu, menuAnim]} pointerEvents={open ? 'auto' : 'none'}>
        {menu}
      </Animated.View>
      <Animated.View style={[styles.pushPage, pageAnim]}>
        {children}
        {open ? (
          <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} accessibilityLabel="Close menu" />
        ) : null}
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  kebabWrap: { zIndex: 20, alignItems: 'flex-end' },
  kebabBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondaryFill,
  },
  kebabScrim: {
    position: 'absolute',
    top: -400,
    right: -200,
    width: 800,
    height: 800,
    zIndex: 25,
  },
  kebabMenu: {
    position: 'absolute',
    top: 40,
    right: 0,
    minWidth: 168,
    backgroundColor: colors.paper,
    borderRadius: radius.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
    zIndex: 30,
  },
  kebabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  kebabItemDanger: {},
  kebabLabel: { fontFamily: fonts.sansMed, fontSize: 14, color: colors.text },

  gooeyRoot: {
    position: 'absolute',
    right: space.md,
    bottom: 96,
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 40,
  },
  gooeyDim: {
    ...StyleSheet.absoluteFillObject,
    width: 400,
    height: 400,
    right: -160,
    bottom: -160,
  },
  gooeyMain: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.fab,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.sheet,
  },
  gooeyOrbWrap: {
    position: 'absolute',
    alignItems: 'center',
    width: 72,
  },
  gooeyOrb: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  gooeyOrbLabel: {
    marginTop: 4,
    fontFamily: fonts.sansMed,
    fontSize: 10,
    color: colors.muted,
  },

  expandWrap: { alignItems: 'flex-end', zIndex: 25 },
  expandScrim: { ...StyleSheet.absoluteFillObject, left: -400, top: -400, width: 800, height: 800 },
  expandPanel: {
    backgroundColor: colors.ink,
    overflow: 'hidden',
    alignSelf: 'flex-end',
  },
  expandTrigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
  },
  expandTriggerText: { fontFamily: fonts.sansBold, fontSize: 14, color: colors.onInk },
  expandItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  expandItemText: { fontFamily: fonts.sansMed, fontSize: 15, color: colors.onInk },

  cmdDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(16,24,40,0.45)' },
  cmdWrap: { ...StyleSheet.absoluteFillObject, paddingTop: 72, paddingHorizontal: space.md },
  cmdPanel: {
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    padding: space.sm,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sheet,
  },
  cmdSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.mist,
    marginBottom: 6,
  },
  cmdInput: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 16,
    color: colors.text,
    padding: 0,
  },
  cmdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: radius.sm,
  },
  cmdTitle: { fontFamily: fonts.sansBold, fontSize: 15, color: colors.text },
  cmdSub: { fontFamily: fonts.sans, fontSize: 12, color: colors.muted, marginTop: 2 },
  cmdEmpty: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.muted,
    padding: 14,
    textAlign: 'center',
  },

  pushRoot: { flex: 1, backgroundColor: colors.ink },
  pushMenu: {
    ...StyleSheet.absoluteFillObject,
    paddingTop: 64,
    paddingHorizontal: space.lg,
    width: 220,
  },
  pushPage: {
    flex: 1,
    backgroundColor: colors.mist,
    overflow: 'hidden',
  },
})
