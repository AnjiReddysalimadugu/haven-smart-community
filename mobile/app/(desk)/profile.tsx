import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAuth } from '../../src/auth'
import { SecuritySettings } from '../../src/components/SecuritySettings'
import { Button, Card, PageHeader, Screen } from '../../src/components/ui'
import { IconCircle } from '../../src/icons'
import { colors, fonts, space } from '../../src/theme'

export default function DeskProfile() {
  const { user, logout } = useAuth()
  const router = useRouter()

  return (
    <Screen>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.pad}
          showsVerticalScrollIndicator={false}
        >
          <PageHeader eyebrow="Desk account" title="You" subtitle="Ops identity & session" />

          <View style={styles.identity}>
            <IconCircle name="briefcase" size={72} tone="ink" />
            <Text style={styles.name}>{user?.fullName || 'Staff'}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{user?.role?.replace(/_/g, ' ') || 'STAFF'}</Text>
            </View>
          </View>

          <Card>
            <Meta
              icon="business"
              label="Society"
              value={user?.apartmentName || (user?.role === 'SUPER_ADMIN' ? 'All societies' : '—')}
              last
            />
          </Card>

          <View style={{ height: space.md }} />
          <SecuritySettings />

          <View style={{ height: space.md }} />
          <Button
            label="Sign out"
            variant="danger"
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
      <IconCircle name={icon} size={44} tone="mist" />
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  pad: { padding: space.md, paddingBottom: 120 },
  identity: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    marginBottom: space.md,
    backgroundColor: colors.ink,
    borderRadius: 28,
    gap: 8,
  },
  name: {
    marginTop: 8,
    color: colors.onInk,
    fontSize: 28,
    fontFamily: fonts.displayBold,
    letterSpacing: -0.8,
  },
  email: { color: colors.onInkMuted, fontSize: 14, fontFamily: fonts.sans },
  badge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(52,211,168,0.16)',
  },
  badgeText: {
    color: colors.gateAccent,
    fontSize: 11,
    fontFamily: fonts.sansBold,
    letterSpacing: 1.2,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  metaBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  label: {
    fontSize: 11,
    fontFamily: fonts.sansBold,
    color: colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  value: { marginTop: 3, fontSize: 16, fontFamily: fonts.sansBold, color: colors.text },
})
