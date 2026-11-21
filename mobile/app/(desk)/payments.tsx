import { useState } from 'react'
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { apiError, billingApi, formatDate, money } from '../../src/api'
import { useAuth } from '../../src/auth'
import {
  Button, Chip, ChipRow, Empty, ErrorText, FadeIn, Field, GlassSheet, ListRow,
  LoadingBlock, PageHeader, Screen, Section, StatusPill,
} from '../../src/components/ui'
import { SocietyRequired, SocietyScopeBar, useScopeApartmentId, useSociety } from '../../src/society'
import { colors, space } from '../../src/theme'

const METHODS = ['CASH', 'UPI', 'CARD'] as const

export default function DeskPayments() {
  const { user } = useAuth()
  const isSuper = user?.role === 'SUPER_ADMIN'
  return (
    <SocietyRequired isSuper={isSuper}>
      <DeskPaymentsBody />
    </SocietyRequired>
  )
}

function DeskPaymentsBody() {
  const { user } = useAuth()
  const isSuper = user?.role === 'SUPER_ADMIN'
  const { selected } = useSociety()
  const scopeId = useScopeApartmentId(user?.apartmentId, isSuper)
  const qc = useQueryClient()
  const bills = useQuery({
    queryKey: ['bills', scopeId],
    queryFn: () => billingApi.list(scopeId),
    enabled: !isSuper || !!scopeId,
  })
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [reference, setReference] = useState('')
  const [method, setMethod] = useState<(typeof METHODS)[number]>('CASH')
  const [error, setError] = useState('')

  const due = (bills.data ?? []).filter((b) => Number(b.balance) > 0)
  const selectedBill = due.find((b) => b.id === selectedBillId)

  const pay = useMutation({
    mutationFn: () =>
      billingApi.pay(selectedBillId!, {
        amount: Number(amount),
        method,
        reference: reference.trim() || `MOBILE-${method}-${Date.now()}`,
      }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['bills'] }),
        qc.invalidateQueries({ queryKey: ['receipts'] }),
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
      ])
      setSelectedBillId(null)
      setAmount('')
      setReference('')
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert('Recorded', 'Payment posted to the bill.')
    },
    onError: (err) => setError(apiError(err, 'Payment failed')),
  })

  return (
    <Screen>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.pad}
          keyboardShouldPersistTaps="handled"
          refreshControl={(
            <RefreshControl
              refreshing={bills.isFetching && !bills.isLoading}
              onRefresh={() => { void bills.refetch() }}
              tintColor={colors.accent}
            />
          )}
        >
          <PageHeader
            eyebrow="Collections"
            title="Payments"
            subtitle={selected ? `Dues for ${selected.name}` : 'Collect cash, UPI or card.'}
          />

          <SocietyScopeBar isSuper={isSuper} />

          <Section label={`Outstanding (${due.length})`} />
          {bills.isLoading ? <LoadingBlock /> : null}
          {!bills.isLoading && !due.length ? (
            <Empty title="All clear" body="No dues to collect." icon="cash-outline" />
          ) : null}
          {due.map((b, i) => (
            <FadeIn key={b.id} index={i}>
              <ListRow
                icon="receipt-outline"
                title={`Flat ${b.flatNumber}`}
                subtitle={`${b.billType} · ${b.billingPeriod}`}
                meta={money(b.balance)}
                right={<StatusPill value={b.status} />}
                onPress={() => {
                  setSelectedBillId(b.id)
                  setAmount(String(b.balance))
                  setError('')
                }}
              />
            </FadeIn>
          ))}
        </ScrollView>

        <GlassSheet
          visible={!!selectedBill}
          onClose={() => { setSelectedBillId(null); setError('') }}
          title="Record payment"
          subtitle={selectedBill ? `Flat ${selectedBill.flatNumber} · ${selectedBill.billType}` : undefined}
          icon="cash"
          footer={(
            <Button
              label={pay.isPending ? 'Posting…' : 'Record payment'}
              icon="checkmark"
              loading={pay.isPending}
              disabled={!Number(amount) || Number(amount) <= 0}
              onPress={() => { setError(''); pay.mutate() }}
            />
          )}
        >
          {selectedBill ? (
            <>
              <Text style={styles.balanceHint}>
                Balance {money(selectedBill.balance)} · due {formatDate(selectedBill.dueDate)}
              </Text>
              <Text style={styles.label}>Method</Text>
              <ChipRow>
                {METHODS.map((m) => (
                  <Chip key={m} label={m} active={method === m} onPress={() => setMethod(m)} />
                ))}
              </ChipRow>
              <Field
                label="Amount"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                placeholder={String(selectedBill.balance)}
              />
              <Field label="Reference" value={reference} onChangeText={setReference} placeholder="UPI / receipt no." />
              <ErrorText message={error} />
            </>
          ) : null}
        </GlassSheet>
      </SafeAreaView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  pad: { padding: space.md, paddingBottom: 120 },
  label: { fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: 6 },
  balanceHint: {
    color: colors.brandDeep,
    fontWeight: '700',
    fontSize: 14,
    marginBottom: space.md,
  },
})
