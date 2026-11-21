import { useState } from 'react'
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { apiError, billingApi, formatDate, money } from '../../src/api'
import { openUpiPay } from '../../src/upi'
import {
  Button, Card, Empty, ErrorText, FadeIn, IconButton, ListRow, LoadingBlock, PageHeader, Screen, Section, StatusPill,
} from '../../src/components/ui'
import { colors, space } from '../../src/theme'

export default function BillsScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const bills = useQuery({ queryKey: ['bills'], queryFn: () => billingApi.list() })
  const [payingId, setPayingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const due = (bills.data ?? []).filter((b) => Number(b.balance) > 0)
  const paid = (bills.data ?? []).filter((b) => Number(b.balance) <= 0)

  const pay = useMutation({
    mutationFn: async (bill: { id: string; balance: number; billType: string; billingPeriod: string }) => {
      const ref = `UPI-${Date.now().toString(36).toUpperCase()}`
      await openUpiPay({
        amount: Number(bill.balance),
        note: `${bill.billType} ${bill.billingPeriod}`,
        transactionRef: ref,
      })
      return new Promise<{ id: string; balance: number; billType: string; billingPeriod: string; ref: string }>((resolve, reject) => {
        Alert.alert(
          'Did you complete UPI?',
          `Confirm only if ₹${Number(bill.balance).toLocaleString('en-IN')} was paid successfully.`,
          [
            { text: 'Not yet', style: 'cancel', onPress: () => reject(new Error('Payment cancelled')) },
            { text: 'Yes, paid', onPress: () => resolve({ ...bill, ref }) },
          ],
          { cancelable: true, onDismiss: () => reject(new Error('Payment cancelled')) },
        )
      }).then((confirmed) =>
        billingApi.pay(confirmed.id, {
          amount: Number(confirmed.balance),
          method: 'UPI',
          reference: confirmed.ref,
        }),
      )
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['bills'] }),
        qc.invalidateQueries({ queryKey: ['receipts'] }),
      ])
      setPayingId(null)
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert('Payment recorded', 'Receipt posted for this bill.')
    },
    onError: (err) => {
      setPayingId(null)
      const msg = apiError(err, 'Could not complete payment')
      if (!/cancelled/i.test(String((err as Error)?.message || msg))) {
        setError(msg)
      }
    },
  })

  return (
    <Screen>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.pad}
          refreshControl={(
            <RefreshControl
              refreshing={bills.isFetching && !bills.isLoading}
              onRefresh={() => { void bills.refetch() }}
              tintColor={colors.accent}
            />
          )}
        >
          <PageHeader
            eyebrow="Billing"
            title="Invoices"
            subtitle="Pay with UPI — Haven records the receipt."
            right={(
              <IconButton
                name="receipt-outline"
                accessibilityLabel="Receipts"
                onPress={() => router.push('/(resident)/receipts')}
              />
            )}
          />
          <ErrorText message={error} />

          <Section label={`Outstanding (${due.length})`} />
          {bills.isLoading ? <LoadingBlock /> : null}
          {!bills.isLoading && !due.length ? (
            <Empty title="Nothing due" body="You're all paid up." icon="checkmark-circle-outline" />
          ) : null}
          {due.map((b, i) => (
            <FadeIn key={b.id} index={i}>
              <Card>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{b.billType}</Text>
                    <Text style={styles.muted}>{b.billingPeriod} · due {formatDate(b.dueDate)}</Text>
                    <Text style={styles.amount}>{money(b.balance)}</Text>
                  </View>
                  <StatusPill value={b.status} />
                </View>
                <View style={{ height: 14 }} />
                <Button
                  label={payingId === b.id ? 'Opening UPI…' : 'Pay with UPI'}
                  icon="phone-portrait-outline"
                  loading={payingId === b.id}
                  onPress={() => {
                    setError('')
                    setPayingId(b.id)
                    pay.mutate(b)
                  }}
                />
              </Card>
            </FadeIn>
          ))}

          <Section label="Paid recently" />
          {!bills.isLoading && !paid.length ? <Empty title="No paid bills yet" icon="wallet-outline" /> : null}
          {paid.slice(0, 8).map((b, i) => (
            <FadeIn key={b.id} index={i}>
              <ListRow
                icon="checkmark-circle-outline"
                title={b.billType}
                subtitle={b.billingPeriod}
                right={<StatusPill value="PAID" />}
              />
            </FadeIn>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  pad: { padding: space.md, paddingBottom: 120 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { fontWeight: '800', fontSize: 17, color: colors.text, letterSpacing: -0.3 },
  muted: { color: colors.muted, fontSize: 13, marginTop: 4 },
  amount: { marginTop: 10, fontWeight: '900', fontSize: 24, color: colors.text, letterSpacing: -0.8 },
})
