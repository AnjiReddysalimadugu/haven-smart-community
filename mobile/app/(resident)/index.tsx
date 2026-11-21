import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { billingApi, complaintApi, formatDate, money, visitorApi } from '../../src/api'
import { useAuth } from '../../src/auth'
import {
  ActionTile, Card, Empty, ErrorText, FadeIn, InkHero, LoadingBlock, Notice, Screen, Section, StatRow, StatusPill,
} from '../../src/components/ui'
import { TileIcon } from '../../src/icons'
import { colors, fonts, space } from '../../src/theme'

export default function ResidentHome() {
  const { user } = useAuth()
  const router = useRouter()
  const bills = useQuery({ queryKey: ['bills'], queryFn: () => billingApi.list() })
  const visitors = useQuery({ queryKey: ['visitors'], queryFn: () => visitorApi.list() })
  const complaints = useQuery({ queryKey: ['complaints'], queryFn: () => complaintApi.list() })

  const due = (bills.data ?? []).filter((b) => Number(b.balance) > 0)
  const outstanding = due.reduce((s, b) => s + Number(b.balance), 0)
  const openTickets = (complaints.data ?? []).filter((c) => !['RESOLVED', 'CLOSED'].includes(c.status))
  const passes = (visitors.data ?? []).filter((v) => !v.used)
  const loading = bills.isLoading || visitors.isLoading || complaints.isLoading
  const errored = bills.isError || visitors.isError || complaints.isError
  const refreshing = bills.isFetching || visitors.isFetching || complaints.isFetching

  return (
    <Screen>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.pad}
          showsVerticalScrollIndicator={false}
          refreshControl={(
            <RefreshControl
              refreshing={refreshing && !loading}
              onRefresh={() => {
                void bills.refetch()
                void visitors.refetch()
                void complaints.refetch()
              }}
              tintColor={colors.accent}
            />
          )}
        >
          <InkHero
            eyebrow="Haven"
            title={user?.fullName?.split(' ')[0] || 'Resident'}
            subtitle={`${user?.flatNumber ? `Flat ${user.flatNumber}` : 'Your home'}${user?.apartmentName ? ` · ${user.apartmentName}` : ''}`}
          />

          {errored ? <ErrorText message="Could not load your home snapshot. Pull to retry." /> : null}
          {!user?.flatId ? (
            <Notice message="Your account is not linked to a flat yet. Ask society admin to assign occupancy." />
          ) : null}

          <StatRow items={[
            { label: 'Due', value: money(outstanding) },
            { label: 'Tickets', value: String(openTickets.length) },
            { label: 'Passes', value: String(passes.length) },
          ]} />

          <View style={styles.actions}>
            <ActionTile
              accent
              icon={<TileIcon name="wallet" accent />}
              title="Pay bills"
              subtitle={`${due.length} open invoice${due.length === 1 ? '' : 's'}`}
              onPress={() => router.push('/(resident)/bills')}
            />
            <ActionTile
              icon={<TileIcon name="person-add" />}
              title="Invite guest"
              subtitle={user?.flatId ? 'Create a visitor pass' : 'Flat required'}
              onPress={() => router.push('/(resident)/guests')}
            />
          </View>
          <View style={[styles.actions, { marginTop: 0 }]}>
            <ActionTile
              icon={<TileIcon name="construct" />}
              title="Get help"
              subtitle={openTickets.length ? `${openTickets.length} open` : 'Raise a request'}
              onPress={() => router.push('/(resident)/help')}
            />
            <ActionTile
              icon={<TileIcon name="receipt" />}
              title="Receipts"
              subtitle="Paid invoices"
              onPress={() => router.push('/(resident)/receipts')}
            />
          </View>

          <Section label="Due soon" />
          {loading ? <LoadingBlock /> : null}
          {!loading && !due.length ? <Empty title="All clear" body="No outstanding invoices." /> : null}
          {due.slice(0, 5).map((b, i) => (
            <FadeIn key={b.id} index={i}>
              <Card>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{b.billType}</Text>
                    <Text style={styles.muted}>{b.billingPeriod} · due {formatDate(b.dueDate)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Text style={styles.amount}>{money(b.balance)}</Text>
                    <StatusPill value={b.status} />
                  </View>
                </View>
              </Card>
            </FadeIn>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  pad: { padding: space.md, paddingBottom: 120 },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardTitle: { fontFamily: fonts.sansBold, fontSize: 17, color: colors.text, letterSpacing: -0.2 },
  muted: { color: colors.muted, fontSize: 14, marginTop: 4, fontFamily: fonts.sans },
  amount: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.text, letterSpacing: -0.5 },
})
