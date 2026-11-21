import type { ComponentProps, ReactNode } from 'react'
import type { ColorValue } from 'react-native'
import { StyleSheet, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { useEffect } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius } from './theme'

export type IonName = ComponentProps<typeof Ionicons>['name']

/** Prefer filled glyphs when a matching filled name exists */
function preferFilled(name: IonName): IonName {
  if (typeof name !== 'string') return name
  if (name.endsWith('-outline')) {
    const filled = name.replace(/-outline$/, '') as IonName
    return filled
  }
  return name
}

/**
 * Bounce tab icon — active glyph lifts into a soft glass bubble (Haven emerald).
 * Adapted from “Bounce” glass menu ref; no neon / dark clone.
 */
export function tabIcon(name: IonName, focusedName?: IonName) {
  return function BounceTabIcon({
    color, size, focused,
  }: { color: ColorValue; size: number; focused: boolean }) {
    const lift = useSharedValue(focused ? 1 : 0)

    useEffect(() => {
      lift.value = withSpring(focused ? 1 : 0, { damping: 14, stiffness: 220, mass: 0.7 })
    }, [focused, lift])

    const bubble = useAnimatedStyle(() => ({
      transform: [
        { translateY: -10 * lift.value },
        { scale: 1 + 0.12 * lift.value },
      ],
      opacity: 0.35 + 0.65 * lift.value,
    }))

    const glyph = useAnimatedStyle(() => ({
      transform: [{ translateY: -10 * lift.value }],
    }))

    return (
      <View style={styles.tabIconRoot}>
        <Animated.View style={[styles.bounceBubble, bubble]} />
        <Animated.View style={[styles.tabIconWrap, focused && styles.tabIconWrapOn, glyph]}>
          <Ionicons
            name={focused ? preferFilled(focusedName || name) : name}
            size={focused ? 22 : (size ?? 21)}
            color={focused ? colors.brandDeep : (typeof color === 'string' ? color : colors.soft)}
          />
        </Animated.View>
      </View>
    )
  }
}

export function TileIcon({ name, accent }: { name: IonName; accent?: boolean }) {
  return (
    <View style={[styles.tileIcon, accent && styles.tileIconAccent]}>
      <Ionicons name={preferFilled(name)} size={22} color={accent ? '#fff' : colors.ink} />
    </View>
  )
}

export function IconCircle({
  name, size = 44, tone = 'mist', filled = true,
}: {
  name: IonName
  size?: number
  tone?: 'mist' | 'glass' | 'brand' | 'danger' | 'dark' | 'ink'
  filled?: boolean
}) {
  const glyph = filled ? preferFilled(name) : name
  const bg =
    tone === 'brand' || tone === 'ink' ? colors.ink
      : tone === 'danger' ? '#FCE8EB'
        : tone === 'dark' ? 'rgba(255,255,255,0.08)'
          : colors.mist
  const fg =
    tone === 'brand' || tone === 'ink' ? colors.gateAccent
      : tone === 'danger' ? colors.danger
        : tone === 'dark' ? colors.onInk
          : colors.ink
  const border =
    tone === 'brand' || tone === 'ink' || tone === 'dark'
      ? 'transparent'
      : tone === 'danger'
        ? 'rgba(225,29,72,0.12)'
        : 'rgba(16,26,23,0.06)'

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size * 0.36,
          backgroundColor: bg,
          borderColor: border,
          borderWidth: tone === 'mist' || tone === 'glass' || tone === 'danger' ? 1 : 0,
        },
      ]}
    >
      <Ionicons name={glyph} size={Math.round(size * 0.42)} color={fg} />
    </View>
  )
}

export function RowIcon({ name, children }: { name: IonName; children?: ReactNode }) {
  return (
    <View style={styles.rowIcon}>
      <IconCircle name={name} size={44} />
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  tabIconRoot: {
    width: 52,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bounceBubble: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: 'rgba(23,107,85,0.18)',
  },
  tabIconWrap: {
    minWidth: 40,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    paddingHorizontal: 8,
  },
  tabIconWrapOn: {
    backgroundColor: 'transparent',
  },
  tileIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: colors.mist,
    borderWidth: 1,
    borderColor: 'rgba(16,26,23,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  tileIconAccent: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
})
