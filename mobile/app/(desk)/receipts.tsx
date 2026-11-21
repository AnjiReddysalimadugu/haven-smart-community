import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { SafeAreaView } from 'react-native-safe-area-context'
import { formatDate, money, receiptApi } from '../../src/api'
import { useAuth } from '../../src/auth'
import {
  Card, Empty, ErrorText, FadeIn, LoadingBlock, PageHeader, Screen, Section, StatusPill,
} from '../../src/components/ui'
import { SocietyRequired, SocietyScopeBar, useScopeApartmentId, useSociety } from '../../src/society'
import { colors, space } from '../../src/theme'

export default function DeskReceipts() {
  const { user } = useAuth()
  const isSuper = user?.role === 'SUPER_ADMIN'
  return (
    <SocietyRequired isSuper={isSuper}>
      <DeskReceiptsBody />
    </SocietyRequired>
  )
}

function DeskReceiptsBody() {
  const { user } = useAuth()
  const isSuper = user?.role === 'SUPER_ADMIN'
  const { selected } = useSociety()
  const scopeId = useScopeApartmentId(user?.apartmentId, isSuper)
  const receipts = useQuery({
    queryKey: ['receipts', scopeId],
    queryFn: () => receiptApi.list(scopeId),
    enabled: !isSuper || !!scopeId,
  })

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
          <PageHeader
            eyebrow="Ledger"
            title="Receipts"
            subtitle={selected ? `Payments for ${selected.name}` : 'Society payment confirmations.'}
          />
          <SocietyScopeBar isSuper={isSuper} />
          {receipts.isError ? <ErrorText message="Could not load receipts." /> : null}
          {receipts.isLoading ? <LoadingBlock /> : null}
          {!receipts.isLoading && !(receipts.data ?? []).length ? (
            <Empty title="No receipts" body="Desk and resident payments appear here." />
          ) : null}

          <Section label={`${(receipts.data ?? []).length} payments`} />
          {(receipts.data ?? []).map((r, i) => (
            <FadeIn key={r.id} index={i}>
              <Card>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{r.receiptNumber}</Text>
                    <Text style={styles.muted}>
                      Flat {r.flatNumber} · {r.billType} · {formatDate(r.paidAt)}
                    </Text>
                    <Text style={styles.meta}>{r.method} · {r.reference || '—'}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Text style={styles.amount}>{money(r.amount)}</Text>
                    <StatusPill value="PAID" />
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