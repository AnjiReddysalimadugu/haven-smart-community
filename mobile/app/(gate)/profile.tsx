import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../src/auth'
import { SecuritySettings } from '../../src/components/SecuritySettings'
import { Button, Screen } from '../../src/components/ui'
import { IconCircle } from '../../src/icons'
import { colors, fonts, space } from '../../src/theme'

export default function GateProfile() {
  const { user, logout } = useAuth()
  const router = useRouter()

  return (
    <Screen dark>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.pad} showsVerticalScrollIndicator={false}>
          <Text style={styles.eyebrow}>Security</Text>
          <Text style={styles.title}>You</Text>
          <Text style={styles.sub}>Gate identity & session</Text>

          <View style={styles.identity}>
            <IconCircle name="shield-checkmark" size={72} tone="ink" />
            <Text style={styles.name}>{user?.fullName || 'Guard'}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>

          <View style={styles.card}>
            <Meta icon="business" label="Society" value={user?.apartmentName || '—'} last />
          </View>

          <SecuritySettings dark />

          <View style={{ height: space.md }} />
          <Button
            label="Sign out"
            icon="log-out-outline"
            onPress={async () => {
              await logout()
              router.replace('/login')
            }}
          />
        </ScrollView>
      </SafeAreaView>
    </Screen>
  )
}

function Meta({
  icon, label, value, last,
}: { icon: any; label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.metaRow, !last && styles.metaBorder]}>
      <IconCircle name={icon} size={44} tone="dark" />
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  pad: { padding: space.md, paddingBottom: 120 },
  eyebrow: {
    color: colors.gateAccent,
    fontSize: 12,
    fontFamily: fonts.sansBold,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.onInk,
    fontSize: 36,
    fontFamily: fonts.displayBold,
    marginTop: 8,
    letterSpacing: -1.2,
  },
  sub: { color: colors.onInkMuted, marginTop: 6, marginBottom: 22, fontSize: 14, fontFamily: fonts.sans },
  identity: {
    alignItems: 'center',
    paddingVertical: 28,
    marginBottom: space.md,
    backgroundColor: colors.inkSoft,
    borderRadius: 28,
    gap: 8,
  },
  name: {
    marginTop: 8,
    color: colors.onInk,
    fontSize: 26,
    fontFamily: fonts.displayBold,
  },
  email: { color: colors.onInkMuted, fontSize: 14, fontFamily: fonts.sans },
  card: {
    padding: space.md,
    marginBottom: 18,
    backgroundColor: colors.inkSoft,
    borderRadius: 22,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8 },
  metaBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  label: {
    color: 'rgba(247,250,248,0.45)',
    fontSize: 11,
    fontFamily: fonts.sansBold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  value: { color: colors.onInk, fontSize: 16, fontFamily: fonts.sansBold, marginTop: 3 },
})
