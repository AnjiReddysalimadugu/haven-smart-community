import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { SafeAreaView } from 'react-native-safe-area-context'
import { formatDate, money, receiptApi } from '../../src/api'
import {
  Card, Empty, ErrorText, FadeIn, LoadingBlock, PageHeader, Screen, Section, StatusPill,
} from '../../src/components/ui'
import { colors, space } from '../../src/theme'

export default function ResidentReceipts() {
  const receipts = useQuery({ queryKey: ['receipts'], queryFn: () => receiptApi.list() })

  return (
    <Screen>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.pad}
          refreshControl={(
            <RefreshControl
              refreshing={receipts.isFetching && !receipts.isLoading}
              onRefresh={() => { void receipts.refetch() }}
              tintColor={colors.accent}
            />
          )}
        >
          <PageHeader eyebrow="Payments" title="Receipts" subtitle="Confirmed payments posted against your bills." />
          {receipts.isError ? <ErrorText message="Could not load receipts." /> : null}
          {receipts.isLoading ? <LoadingBlock /> : null}
          {!receipts.isLoading && !(receipts.data ?? []).length ? (
            <Empty title="No receipts yet" body="Paid invoices will show up here." />
          ) : null}

          <Section label={`${(receipts.data ?? []).length} payments`} />
          {(receipts.data ?? []).map((r, i) => (
            <FadeIn key={r.id} index={i}>
              <Card>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{r.receiptNumber}</Text>
                    <Text style={styles.muted}>
                      {r.billType} · {r.billingPeriod} · {formatDate(r.paidAt)}
                    </Text>
                    <Text style={styles.meta}>{r.method} · {r.reference || '—'}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Text style={styles.amount}>{money(r.amount)}</Text>
                    <StatusPill value={r.billStatus || 'PAID'} />
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
  pad: { padding: space.md, paddingBottom: 96 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { fontWeight: '800', fontSize: 15, color: colors.text },
  muted: { color: colors.muted, fontSize: 12, marginTop: 3 },
  meta: { color: colors.soft, fontSize: 11, marginTop: 4, fontWeight: '600' },
  amount: { fontWeight: '800', fontSize: 16, color: colors.text },
})
