import { Redirect, useRouter } from 'expo-router'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { SafeAreaView } from 'react-native-safe-area-context'
import { billingApi, dashboardApi, money, residentApi, userApi, type Apartment } from '../../src/api'
import { useAuth } from '../../src/auth'
import { IncomeAnalyticsPanel } from '../../src/components/charts'
import {
  ActionTile, Button, ErrorText, IconButton, InkHero, LoadingBlock, Screen, StatRow,
} from '../../src/components/ui'
import { TileIcon } from '../../src/icons'
import { useSociety } from '../../src/society'
import { colors, space } from '../../src/theme'

/** Shared society ops hub — used from Societies tab when a society is selected. */
export function SocietyHubView({
  apartment,
  onBack,
  onMenu,
}: {
  apartment?: Apartment | null
  onBack?: () => void
  onMenu?: () => void
}) {
  const { selected, clear } = useSociety()
  const router = useRouter()
  const society = apartment ?? selected

  const summary = useQuery({
    queryKey: ['dashboard', society?.id],
    queryFn: () => dashboardApi.summary(society!.id),
    enabled: !!society?.id,
  })
  const users = useQuery({
    queryKey: ['users', society?.id],
    queryFn: () => userApi.list({ apartmentId: society!.id }),
    enabled: !!society?.id,
  })
  const tenants = useQuery({
    queryKey: ['residents', society?.id],
    queryFn: () => residentApi.list(society!.id),
    enabled: !!society?.id,
  })
  const bills = useQuery({
    queryKey: ['bills', society?.id],
    queryFn: () => billingApi.list(society!.id),
    enabled: !!society?.id,
  })

  if (!society) return null

  const due = (bills.data ?? []).filter((b) => Number(b.balance) > 0)
  const activeUsers = (users.data ?? []).filter((u) => u.active).length
  const activeTenants = (tenants.data ?? []).filter((t) => t.active).length

  const goBack = () => {
    clear()
    onBack?.()
    router.replace('/(desk)')
  }

  return (
    <Screen>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.pad}
          refreshControl={(
            <RefreshControl
              refreshing={summary.isFetching}
              onRefresh={() => {
                void summary.refetch()
                void users.refetch()
                void tenants.refetch()
                void bills.refetch()
              }}
              tintColor={colors.accent}
            />
          )}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <Button label="← All societies" variant="ghost" onPress={goBack} />
            {onMenu ? (
              <IconButton name="menu" accessibilityLabel="Society menu" onPress={onMenu} />
            ) : null}
          </View>

          <InkHero
            eyebrow="Society"
            title={society.name}
            subtitle={society.address || society.status}
          />

          {summary.isError ? <ErrorText message="Could not load society snapshot." /> : null}
          {summary.isLoading ? <LoadingBlock /> : null}

          <StatRow items={[
            { label: 'Users', value: String(activeUsers) },
            { label: 'Residents', value: String(activeTenants) },
            { label: 'Due', value: money(summary.data?.pending ?? due.reduce((s, b) => s + Number(b.balance), 0)) },
          ]} />
          {summary.data ? (
            <StatRow items={[
              { label: 'Flats', value: String(summary.data.flats) },
              { label: 'Occupied', value: String(summary.data.occupiedFlats) },
              { label: 'Collected', value: money(summary.data.collected) },
            ]} />
          ) : null}

          {summary.data ? (
            <IncomeAnalyticsPanel
              title="Society income"
              bills={bills.data ?? []}
              collected={Number(summary.data.collected)}
              pending={Number(summary.data.pending)}
              totalBilled={Number(summary.data.totalBilled)}
            />
          ) : null}

          <Text style={styles.section}>Manage this society</Text>
          <View style={styles.actions}>
            <ActionTile
              accent
              icon={<TileIcon name="people" accent />}
              title="Users"
              subtitle="Staff, security, admins"
              onPress={() => router.push('/(desk)/users')}
            />
            <ActionTile
              icon={<TileIcon name="home" />}
              title="Residents"
              subtitle="Tenant directory"
              onPress={() => router.push('/(desk)/tenants')}
            />
          </View>
          <View style={[styles.actions, { marginTop: 0 }]}>
            <ActionTile
              icon={<TileIcon name="business" />}
              title="Flats"
              subtitle="Occupancy"
              onPress={() => router.push('/(desk)/flats')}
            />
            <ActionTile
              icon={<TileIcon name="cash" />}
              title="Payments"
              subtitle={`${due.length} open dues`}
              onPress={() => router.push('/(desk)/payments')}
            />
          </View>
          <View style={[styles.actions, { marginTop: 0 }]}>
            <ActionTile
              icon={<TileIcon name="receipt" />}
              title="Receipts"
              subtitle="Payment ledger"
              onPress={() => router.push('/(desk)/receipts')}
            />
            <ActionTile
              icon={<TileIcon name="car" />}
              title="Parking"
              subtitle="Slots"
              onPress={() => router.push('/(desk)/parking')}
            />
          </View>
          <View style={[styles.actions, { marginTop: 0 }]}>
            <ActionTile
              icon={<TileIcon name="construct" />}
              title="Tickets"
              subtitle={`${summary.data?.openComplaints ?? 0} open`}
              onPress={() => router.push('/(desk)/complaints')}
            />
            <ActionTile
              icon={<TileIcon name="person-add" />}
              title="Visitors"
              subtitle="Guest passes"
              onPress={() => router.push('/(desk)/visitors')}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Screen>
  )
}

export default function SocietyHub() {
  const { user } = useAuth()
  const { selected } = useSociety()
  const isSuper = user?.role === 'SUPER_ADMIN'

  if (!isSuper) return <Redirect href="/(desk)" />
  if (!selected) return <Redirect href="/(desk)" />
  return <SocietyHubView apartment={selected} />
}

const styles = StyleSheet.create({
  pad: { padding: space.md, paddingBottom: 96 },
  section: {
    marginTop: 4,
    marginBottom: 10,
    fontSize: 12,
    fontWeight: '800',
    color: colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 10 },
})
