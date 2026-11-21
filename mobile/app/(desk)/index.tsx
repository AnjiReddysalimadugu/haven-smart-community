import { useState } from 'react'
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import {
  apiError, billingApi, complaintApi, dashboardApi, formatDate, money, platformApi, propertyApi, visitorApi,
  type Apartment,
} from '../../src/api'
import { useAuth } from '../../src/auth'
import { IncomeAnalyticsPanel } from '../../src/components/charts'
import {
  ActionTile, Button, Card, Empty, ErrorText, FadeIn, Field, GlassSheet, IconButton, InkHero, LoadingBlock, PressScale, Screen, Section, StatRow, StatusPill,
} from '../../src/components/ui'
import {
  CommandPalette, FoldDown, GooeyFab, KebabPopover, PushBackShell,
} from '../../src/components/MotionMenus'
import { IconCircle, TileIcon } from '../../src/icons'
import { useSociety } from '../../src/society'
import { colors, fonts, radius, space } from '../../src/theme'
import { SocietyHubView } from './society'

const ADMIN = new Set(['ADMIN', 'APARTMENT_ADMIN', 'SUPER_ADMIN'])

export default function DeskHome() {
  const { user } = useAuth()
  const isSuper = user?.role === 'SUPER_ADMIN'
  if (isSuper) return <SuperAdminSocietiesHome />
  return <SocietyOpsHome />
}

/** Platform home — manage many societies (apartments), not one building's desk. */
function SuperAdminSocietiesHome() {
  const { selected, select, clear } = useSociety()
  // Local mirror so Manage always opens the hub even if context update is delayed.
  const [opened, setOpened] = useState<Apartment | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const society = opened ?? selected

  const openSociety = (apt: Apartment) => {
    setOpened(apt)
    select(apt)
    setMenuOpen(false)
  }

  const closeSociety = () => {
    setOpened(null)
    clear()
    setMenuOpen(false)
  }

  if (society) {
    return (
      <PushBackShell
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        menu={(
          <View style={{ gap: 10 }}>
            <Text style={{ fontFamily: fonts.sansMed, fontSize: 12, color: colors.onInkMuted, letterSpacing: 0.8 }}>
              SOCIETY
            </Text>
            <Text style={{ fontFamily: fonts.displayBold, fontSize: 22, color: colors.onInk }}>{society.name}</Text>
            {[
              { label: 'Overview', onPress: () => setMenuOpen(false) },
              { label: 'Users', onPress: () => { setMenuOpen(false) } },
              { label: 'Flats', onPress: () => { setMenuOpen(false) } },
              { label: 'Close society', onPress: closeSociety },
            ].map((row) => (
              <Pressable
                key={row.label}
                onPress={row.onPress}
                style={({ pressed }) => [{ paddingVertical: 12, opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={{ fontFamily: fonts.sansBold, fontSize: 17, color: colors.onInk }}>{row.label}</Text>
              </Pressable>
            ))}
          </View>
        )}
      >
        <SocietyHubView
          apartment={society}
          onBack={closeSociety}
          onMenu={() => setMenuOpen(true)}
        />
      </PushBackShell>
    )
  }
  return <SuperAdminSocietiesList onManage={openSociety} />
}

function SuperAdminSocietiesList({ onManage }: { onManage: (apt: Apartment) => void }) {
  const qc = useQueryClient()
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [error, setError] = useState('')

  const apartments = useQuery({ queryKey: ['apartments'], queryFn: () => propertyApi.apartments() })
  const platform = useQuery({ queryKey: ['platform-summary'], queryFn: () => platformApi.summary() })

  const create = useMutation({
    mutationFn: () => propertyApi.createApartment({
      name: name.trim(),
      address: address.trim(),
      timezone: 'Asia/Kolkata',
    }),
    onSuccess: async (apt) => {
      await qc.invalidateQueries({ queryKey: ['apartments'] })
      await qc.invalidateQueries({ queryKey: ['platform-summary'] })
      setCreating(false)
      setName('')
      setAddress('')
      setError('')
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      onManage(apt)
    },
    onError: (err) => setError(apiError(err, 'Could not create society')),
  })

  const archive = useMutation({
    mutationFn: (id: string) => propertyApi.archiveApartment(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['apartments'] })
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    },
    onError: (err) => Alert.alert('Archive failed', apiError(err, 'Could not archive')),
  })

  const active = (apartments.data ?? []).filter((a) => a.status !== 'ARCHIVED')
  const archived = (apartments.data ?? []).filter((a) => a.status === 'ARCHIVED')
  const p = platform.data

  return (
    <Screen>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.pad}
          keyboardShouldPersistTaps="handled"
          refreshControl={(
            <RefreshControl
              refreshing={(apartments.isFetching || platform.isFetching) && !apartments.isLoading}
              onRefresh={() => {
                void apartments.refetch()
                void platform.refetch()
              }}
              tintColor={colors.accent}
            />
          )}
        >
          <InkHero
            eyebrow="Platform owner"
            title="Haven SaaS"
            subtitle="Societies · seats · subscription revenue (not flat utilities)"
            compact
          >
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <IconButton
                name="search"
                tone="dark"
                accessibilityLabel="Jump to society"
                onPress={() => setCmdOpen(true)}
              />
            </View>
          </InkHero>

          <StatRow items={[
            { label: 'Societies', value: String(p?.societiesActive ?? active.length) },
            { label: 'Users', value: String(p?.usersActive ?? '—') },
            { label: 'Flats', value: String(p?.flatsTotal ?? '—') },
          ]} />

          {platform.isError ? (
            <ErrorText message="Could not load platform revenue. Pull to retry." />
          ) : null}

          {platform.isLoading ? <LoadingBlock label="Loading platform…" /> : (
            <FoldDown index={0}>
              <Card>
                <Text style={styles.meta}>SAAS REVENUE</Text>
                <Text style={styles.bigMoney}>{money(p?.collectedTotal ?? 0)}</Text>
                <Text style={styles.muted}>Collected from societies · MRR {money(p?.mrr ?? 0)}</Text>
                <Text style={[styles.muted, { marginTop: 6 }]}>
                  Due estimate {money(p?.outstandingEstimate ?? 0)} · Plans active {p?.subscriptionsActive ?? 0} · Trial {p?.subscriptionsTrial ?? 0}
                </Text>
              </Card>
            </FoldDown>
          )}

          <Section label={`Active societies (${active.length})`} />
          {apartments.isLoading ? <LoadingBlock /> : null}
          {!apartments.isLoading && !active.length ? (
            <Empty
              title="No societies yet"
              body="Create the first apartment society to onboard."
              icon="business-outline"
              actionLabel="Add society"
              onAction={() => { setCreating(true); setError('') }}
            />
          ) : null}

          {active.map((a, i) => (
            <FoldDown key={a.id} index={i + 1}>
              <Card style={{ marginBottom: 4 }}>
                <View style={styles.societyRow}>
                  <IconCircle name="business" size={44} tone="brand" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{a.name}</Text>
                    <Text style={styles.muted} numberOfLines={2}>{a.address}</Text>
                    <Text style={styles.meta}>{a.status} · {a.timezone || 'Asia/Kolkata'}</Text>
                  </View>
                  <KebabPopover
                    actions={[
                      {
                        key: 'manage',
                        label: 'Manage',
                        icon: 'open-outline',
                        onPress: () => onManage(a),
                      },
                      {
                        key: 'revenue',
                        label: 'Revenue',
                        icon: 'cash-outline',
                        onPress: () => router.push('/(desk)/revenue'),
                      },
                      {
                        key: 'archive',
                        label: 'Archive',
                        icon: 'trash-outline',
                        tone: 'danger',
                        onPress: () => {
                          Alert.alert('Archive society?', a.name, [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Archive', style: 'destructive', onPress: () => archive.mutate(a.id) },
                          ])
                        },
                      },
                    ]}
                  />
                </View>
                <View style={{ height: 12 }} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Manage ${a.name}`}
                  onPress={() => onManage(a)}
                  style={({ pressed }) => [styles.manageBtn, pressed && { opacity: 0.85 }]}
                >
                  <Text style={styles.manageBtnText}>Manage society →</Text>
                </Pressable>
              </Card>
            </FoldDown>
          ))}

          {archived.length ? <Section label={`Archived (${archived.length})`} /> : null}
          {archived.map((a, i) => (
            <FoldDown key={a.id} index={i}>
              <Card>
                <Text style={styles.title}>{a.name}</Text>
                <Text style={styles.muted}>{a.address}</Text>
                <StatusPill value="ARCHIVED" />
              </Card>
            </FoldDown>
          ))}
        </ScrollView>

        <GooeyFab
          label="Create"
          actions={[
            {
              key: 'society',
              label: 'Society',
              icon: 'business-outline',
              onPress: () => { setCreating(true); setError('') },
            },
            {
              key: 'user',
              label: 'User',
              icon: 'person-add-outline',
              onPress: () => router.push('/(desk)/users'),
            },
            {
              key: 'revenue',
              label: 'Pay',
              icon: 'cash-outline',
              onPress: () => router.push('/(desk)/revenue'),
            },
          ]}
        />
        <CommandPalette
          visible={cmdOpen}
          onClose={() => setCmdOpen(false)}
          items={active.map((a) => ({ id: a.id, title: a.name, subtitle: a.address }))}
          onSelect={(id) => {
            const apt = active.find((a) => a.id === id)
            if (apt) onManage(apt)
          }}
        />
        <GlassSheet
          visible={creating}
          onClose={() => { setCreating(false); setError('') }}
          title="Add society"
          subtitle="Onboard a new apartment community"
          icon="business"
          footer={(
            <Button
              label={create.isPending ? 'Creating…' : 'Create society'}
              icon="checkmark"
              loading={create.isPending}
              disabled={name.trim().length < 2 || address.trim().length < 3}
              onPress={() => create.mutate()}
            />
          )}
        >
          <Field label="Society name" value={name} onChangeText={setName} placeholder="Green Valley Residency" autoCapitalize="words" />
          <Field label="Address" value={address} onChangeText={setAddress} placeholder="Hyderabad" multiline />
          <ErrorText message={error} />
        </GlassSheet>
      </SafeAreaView>
    </Screen>
  )
}

/** Single-society desk for STAFF / APARTMENT_ADMIN / ADMIN */
function SocietyOpsHome() {
  const { user } = useAuth()
  const router = useRouter()
  const isAdmin = !!user && ADMIN.has(user.role)

  const bills = useQuery({ queryKey: ['bills'], queryFn: () => billingApi.list() })
  const complaints = useQuery({ queryKey: ['complaints'], queryFn: () => complaintApi.list() })
  const visitors = useQuery({ queryKey: ['visitors'], queryFn: () => visitorApi.list() })
  const summary = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.summary(),
    enabled: isAdmin,
  })

  const due = (bills.data ?? []).filter((b) => Number(b.balance) > 0)
  const outstanding = due.reduce((s, b) => s + Number(b.balance), 0)
  const openTickets = (complaints.data ?? []).filter((c) => !['RESOLVED', 'CLOSED'].includes(c.status))
  const pendingPasses = (visitors.data ?? []).filter((v) => !v.used)
  const loading = bills.isLoading || complaints.isLoading || visitors.isLoading
  const errored = bills.isError || complaints.isError || visitors.isError

  return (
    <Screen>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.pad}
          refreshControl={(
            <RefreshControl
              refreshing={(bills.isFetching || complaints.isFetching) && !loading}
              onRefresh={() => {
                void bills.refetch()
                void complaints.refetch()
                void visitors.refetch()
                if (isAdmin) void summary.refetch()
              }}
              tintColor={colors.accent}
            />
          )}
        >
          <InkHero
            eyebrow={isAdmin ? 'Society ops' : 'Desk'}
            title={isAdmin ? 'Admin desk' : 'Collections'}
            subtitle={`${user?.apartmentName || 'Society'} · ${user?.fullName?.split(' ')[0] || 'Staff'}`}
          />

          {errored ? <ErrorText message="Could not load desk snapshot." /> : null}

          <StatRow items={[
            { label: 'Due', value: money(summary.data?.pending ?? outstanding) },
            { label: 'Tickets', value: String(summary.data?.openComplaints ?? openTickets.length) },
            { label: 'Passes', value: String(pendingPasses.length) },
          ]} />

          {isAdmin ? (
            <>
              <View style={styles.actions}>
                <ActionTile accent icon={<TileIcon name="people" accent />} title="Users" subtitle="Access" onPress={() => router.push('/(desk)/users')} />
                <ActionTile icon={<TileIcon name="home" />} title="Residents" subtitle="Directory" onPress={() => router.push('/(desk)/tenants')} />
              </View>
              <View style={[styles.actions, { marginTop: 0 }]}>
                <ActionTile icon={<TileIcon name="business" />} title="Flats" subtitle="Occupancy" onPress={() => router.push('/(desk)/flats')} />
                <ActionTile icon={<TileIcon name="cash" />} title="Payments" subtitle={`${due.length} dues`} onPress={() => router.push('/(desk)/payments')} />
              </View>

              {summary.data ? (
                <IncomeAnalyticsPanel
                  title="Society income"
                  bills={bills.data ?? []}
                  collected={Number(summary.data.collected)}
                  pending={Number(summary.data.pending)}
                  totalBilled={Number(summary.data.totalBilled)}
                />
              ) : null}
            </>
          ) : (
            <View style={styles.actions}>
              <ActionTile accent icon={<TileIcon name="cash" accent />} title="Take payment" subtitle={`${due.length} open`} onPress={() => router.push('/(desk)/payments')} />
              <ActionTile icon={<TileIcon name="construct" />} title="Tickets" subtitle={`${openTickets.length} open`} onPress={() => router.push('/(desk)/complaints')} />
            </View>
          )}

          <Section label="Outstanding dues" />
          {loading ? <LoadingBlock /> : null}
          {!loading && !due.length ? <Empty title="All clear" body="No outstanding invoices." /> : null}
          {due.slice(0, 6).map((b, i) => (
            <FadeIn key={b.id} index={i}>
              <PressScale onPress={() => router.push('/(desk)/payments')}>
                <Card>
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.title}>Flat {b.flatNumber} · {b.billType}</Text>
                      <Text style={styles.muted}>{b.billingPeriod} · due {formatDate(b.dueDate)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <Text style={styles.amount}>{money(b.balance)}</Text>
                      <StatusPill value={b.status} />
                    </View>
                  </View>
                </Card>
              </PressScale>
            </FadeIn>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  pad: { padding: space.md, paddingBottom: 120 },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  societyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  societyMark: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  societyMarkText: { color: colors.lime, fontWeight: '900', fontSize: 18 },
  rowActions: { flexDirection: 'row', gap: 8 },
  manageBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  manageBtnText: { color: '#fff', fontFamily: fonts.sansBold, fontSize: 16 },
  title: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.text },
  muted: { color: colors.muted, fontSize: 13, marginTop: 3, fontFamily: fonts.sans },
  meta: { color: colors.soft, fontSize: 12, marginTop: 4, fontFamily: fonts.sansMed, letterSpacing: 0.6 },
  bigMoney: { fontFamily: fonts.displayBold, fontSize: 28, color: colors.text, letterSpacing: -0.8, marginTop: 6 },
  amount: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.text },
})
