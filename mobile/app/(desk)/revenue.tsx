import { useState } from 'react'
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Redirect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { apiError, money, platformApi } from '../../src/api'
import { useAuth } from '../../src/auth'
import {
  Button, Empty, ErrorText, Field, GlassSheet, ListRow, LoadingBlock, PageHeader, Screen, Section, StatusPill,
} from '../../src/components/ui'
import { colors, fonts, space } from '../../src/theme'

const PLANS = [
  { code: 'STARTER', name: 'Starter', amount: 4999, seats: 50 },
  { code: 'GROWTH', name: 'Growth', amount: 9999, seats: 150 },
  { code: 'ENTERPRISE', name: 'Enterprise', amount: 19999, seats: 500 },
]

export default function PlatformRevenueScreen() {
  const { user } = useAuth()
  if (user?.role !== 'SUPER_ADMIN') return <Redirect href="/(desk)" />

  const qc = useQueryClient()
  const summary = useQuery({ queryKey: ['platform-summary'], queryFn: () => platformApi.summary() })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [payLink, setPayLink] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [payRef, setPayRef] = useState('')
  const [error, setError] = useState('')

  const rows = summary.data?.subscriptions ?? []
  const selected = rows.find((r) => r.apartmentId === selectedId)

  const upsert = useMutation({
    mutationFn: (plan: (typeof PLANS)[number]) => {
      if (!selected) throw new Error('No society')
      return platformApi.upsertSubscription(selected.apartmentId, {
        planCode: plan.code,
        planName: plan.name,
        status: selected.status === 'NONE' ? 'TRIAL' : selected.status,
        amountMonthly: plan.amount,
        seatsIncluded: plan.seats,
        featuresJson: '["property","billing","visitors","complaints","notices","parking"]',
        paymentLink: payLink || selected.paymentLink || null,
        nextDueOn: selected.nextDueOn || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      })
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['platform-summary'] })
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setError('')
    },
    onError: (err) => setError(apiError(err, 'Could not save plan')),
  })

  const saveLink = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error('No society')
      const plan = PLANS.find((p) => p.code === selected.planCode) || PLANS[0]
      return platformApi.upsertSubscription(selected.apartmentId, {
        planCode: plan.code,
        planName: selected.planName === 'No plan' ? plan.name : selected.planName,
        status: selected.status === 'NONE' ? 'TRIAL' : selected.status,
        amountMonthly: Number(selected.amountMonthly) || plan.amount,
        seatsIncluded: plan.seats,
        paymentLink: payLink || null,
        nextDueOn: selected.nextDueOn || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      })
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['platform-summary'] })
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setError('')
    },
    onError: (err) => setError(apiError(err, 'Could not save link')),
  })

  const recordPay = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error('No society')
      return platformApi.recordPayment(selected.apartmentId, {
        amount: Number(payAmount),
        paidOn: new Date().toISOString().slice(0, 10),
        method: 'UPI',
        reference: payRef || undefined,
      })
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['platform-summary'] })
      setPayAmount('')
      setPayRef('')
      setSelectedId(null)
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert('Recorded', 'Society SaaS payment saved.')
    },
    onError: (err) => setError(apiError(err, 'Could not record payment')),
  })

  const p = summary.data

  return (
    <Screen>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.pad}
          keyboardShouldPersistTaps="handled"
          refreshControl={(
            <RefreshControl
              refreshing={summary.isFetching && !summary.isLoading}
              onRefresh={() => { void summary.refetch() }}
              tintColor={colors.accent}
            />
          )}
        >
          <PageHeader
            eyebrow="Platform"
            title="Revenue"
            subtitle="What societies pay Haven — not flat utilities"
          />
          {summary.isError ? <ErrorText message="Could not load revenue." /> : null}
          {summary.isLoading ? <LoadingBlock label="Loading…" /> : (
            <View style={styles.kpis}>
              <Text style={styles.kpiLabel}>Collected</Text>
              <Text style={styles.kpiValue}>{money(p?.collectedTotal ?? 0)}</Text>
              <Text style={styles.muted}>MRR {money(p?.mrr ?? 0)} · Due {money(p?.outstandingEstimate ?? 0)}</Text>
            </View>
          )}

          <Section label={`Societies (${rows.length})`} />
          {!rows.length && !summary.isLoading ? (
            <Empty title="No societies" body="Create a society first." icon="business-outline" />
          ) : null}
          {rows.map((r) => (
            <ListRow
              key={r.apartmentId}
              title={r.apartmentName}
              subtitle={`${r.planName} · ${r.activeUsers}/${r.totalUsers} users · ${money(r.amountMonthly)}/mo`}
              right={<StatusPill value={r.status} />}
              onPress={() => {
                setSelectedId(r.apartmentId)
                setPayLink(r.paymentLink || '')
                setPayAmount(String(r.amountMonthly || ''))
                setError('')
              }}
            />
          ))}
        </ScrollView>

        <GlassSheet
          visible={!!selected}
          onClose={() => setSelectedId(null)}
          title={selected?.apartmentName || 'Society'}
          subtitle="Plan · payment link · record collection"
          icon="cash"
          footer={(
            <Button
              label={recordPay.isPending ? 'Saving…' : 'Record payment'}
              loading={recordPay.isPending}
              disabled={!payAmount || Number(payAmount) <= 0}
              onPress={() => recordPay.mutate()}
            />
          )}
        >
          {error ? <ErrorText message={error} /> : null}
          <Text style={styles.sectionLabel}>Assign plan</Text>
          <View style={styles.planRow}>
            {PLANS.map((plan) => (
              <Button
                key={plan.code}
                label={`${plan.name}`}
                variant="ghost"
                onPress={() => upsert.mutate(plan)}
              />
            ))}
          </View>
          <Field
            label="Payment link"
            value={payLink}
            onChangeText={setPayLink}
            placeholder="https://razorpay / UPI…"
            autoCapitalize="none"
          />
          <Button label="Save link" variant="ghost" onPress={() => saveLink.mutate()} />
          <Field
            label="Record amount (INR)"
            value={payAmount}
            onChangeText={setPayAmount}
            keyboardType="numeric"
          />
          <Field
            label="Reference"
            value={payRef}
            onChangeText={setPayRef}
            placeholder="UPI / txn id"
            autoCapitalize="none"
          />
        </GlassSheet>
      </SafeAreaView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  pad: { padding: space.md, paddingBottom: 120, gap: 8 },
  kpis: { marginBottom: 8 },
  kpiLabel: { fontFamily: fonts.sansMed, fontSize: 12, color: colors.soft, letterSpacing: 0.8 },
  kpiValue: { fontFamily: fonts.displayBold, fontSize: 32, color: colors.text, letterSpacing: -0.8 },
  muted: { fontFamily: fonts.sans, fontSize: 13, color: colors.muted, marginTop: 4 },
  sectionLabel: { fontFamily: fonts.sansMed, fontSize: 13, color: colors.muted, marginBottom: 8 },
  planRow: { gap: 8, marginBottom: 12 },
})
