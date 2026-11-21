import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { formatDate, visitorApi } from '../../src/api'
import { Button, Empty, FadeIn, LoadingBlock, Screen, StatusPill } from '../../src/components/ui'
import { colors, fonts, radius, space } from '../../src/theme'

export default function GatePasses() {
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['visitors'], queryFn: () => visitorApi.list() })
  const exit = useMutation({
    mutationFn: (id: string) => visitorApi.exit(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['visitors'] })
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    },
  })

  const active = (list.data ?? []).filter((v) => !v.used || (v.entryAt && !v.exitAt))

  return (
    <Screen dark>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.pad}
          refreshControl={(
            <RefreshControl
              refreshing={list.isFetching && !list.isLoading}
              onRefresh={() => { void list.refetch() }}
              tintColor={colors.gateAccent}
            />
          )}
        >
          <Text style={styles.eyebrow}>Live board</Text>
          <Text style={styles.title}>Passes</Text>
          <Text style={styles.sub}>Recent visitor tokens — mark exit when they leave.</Text>

          {list.isLoading ? <LoadingBlock label="Loading passes…" /> : null}
          {!list.isLoading && !(list.data ?? []).length ? (
            <Empty dark title="No passes yet" body="Residents create guest tokens from their app." />
          ) : null}

          {(list.data ?? []).slice(0, 30).map((v, i) => {
            const status = v.exitAt ? 'EXITED' : v.used || v.entryAt ? 'INSIDE' : 'PENDING'
            const canExit = !v.exitAt && (v.used || !!v.entryAt)
            return (
              <FadeIn key={v.id} index={i}>
                <View style={styles.card}>
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{v.visitorName}</Text>
                      <Text style={styles.meta}>
                        Flat {v.flatNumber} · {v.visitType} · exp {formatDate(v.expiresAt)}
                      </Text>
                    </View>
                    <StatusPill value={status} />
                  </View>
                  {canExit ? (
                    <>
                      <View style={{ height: 12 }} />
                      <Button
                        label={exit.isPending ? 'Logging…' : 'Mark exit'}
                        variant="lime"
                        loading={exit.isPending}
                        onPress={() => exit.mutate(v.id)}
                      />
                    </>
                  ) : null}
                </View>
              </FadeIn>
            )
          })}

          {active.length ? (
            <Text style={styles.footer}>{active.length} active / pending</Text>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  pad: { padding: space.md, paddingBottom: 100 },
  eyebrow: {
    color: colors.champagne,
    fontSize: 11,
    fontFamily: fonts.sansBold,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.onInk,
    fontSize: 36,
    fontFamily: fonts.displayBold,
    letterSpacing: -1.2,
    marginTop: 8,
  },
  sub: { color: colors.onInkMuted, marginTop: 8, marginBottom: 18, fontFamily: fonts.sans },
  card: {
    backgroundColor: colors.inkSoft,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: space.md,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { color: colors.onInk, fontFamily: fonts.sansBold, fontSize: 15 },
  meta: { color: colors.onInkMuted, fontSize: 12, marginTop: 4, fontFamily: fonts.sans },
  footer: { marginTop: 12, color: colors.onInkMuted, fontSize: 12, fontFamily: fonts.sansBold },
})
