import { useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { apiError, formatDate, propertyApi, visitorApi } from '../../src/api'
import { useAuth } from '../../src/auth'
import {
  Button, Card, Chip, ChipRow, CreateFab, Empty, ErrorText, FadeIn, Field, GlassSheet,
  LoadingBlock, PageHeader, Screen, Section, StatusPill,
} from '../../src/components/ui'
import { IconCircle } from '../../src/icons'
import { SocietyRequired, SocietyScopeBar, useScopeApartmentId, useSociety } from '../../src/society'
import { colors, space } from '../../src/theme'

export default function DeskVisitors() {
  const { user } = useAuth()
  const isSuper = user?.role === 'SUPER_ADMIN'
  return (
    <SocietyRequired isSuper={isSuper}>
      <DeskVisitorsBody />
    </SocietyRequired>
  )
}

function DeskVisitorsBody() {
  const { user } = useAuth()
  const isSuper = user?.role === 'SUPER_ADMIN'
  const { selected } = useSociety()
  const scopeId = useScopeApartmentId(user?.apartmentId, isSuper)
  const qc = useQueryClient()
  const flats = useQuery({
    queryKey: ['flats', scopeId],
    queryFn: () => propertyApi.flats(scopeId),
    enabled: !isSuper || !!scopeId,
  })
  const list = useQuery({
    queryKey: ['visitors', scopeId],
    queryFn: () => visitorApi.list(scopeId),
    enabled: !isSuper || !!scopeId,
  })
  const [open, setOpen] = useState(false)
  const [flatId, setFlatId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState('GUEST')
  const [token, setToken] = useState('')
  const [error, setError] = useState('')

  const create = useMutation({
    mutationFn: () => visitorApi.create({
      flatId,
      visitorName: name.trim(),
      visitType: type,
      validityMinutes: 120,
    }),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['visitors'] })
      setToken(res.qrToken)
      setName('')
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    },
    onError: (err) => setError(apiError(err, 'Could not create pass')),
  })

  const exit = useMutation({
    mutationFn: (id: string) => visitorApi.exit(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['visitors'] })
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    },
  })

  const pending = (list.data ?? []).filter((v) => !v.exitAt)

  return (
    <Screen>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.pad}
          keyboardShouldPersistTaps="handled"
          refreshControl={(
            <RefreshControl
              refreshing={list.isFetching && !list.isLoading}
              onRefresh={() => { void list.refetch() }}
              tintColor={colors.accent}
            />
          )}
        >
          <PageHeader
            eyebrow="Gate ops"
            title="Visitors"
            subtitle={selected ? `Passes for ${selected.name}` : 'Create passes from the + button.'}
          />
          <SocietyScopeBar isSuper={isSuper} />

          <Section label={`Active / pending (${pending.length})`} />
          {list.isLoading ? <LoadingBlock /> : null}
          {!list.isLoading && !pending.length ? (
            <Empty
              title="No active passes"
              body="Create one or wait for residents."
              icon="person-add-outline"
              actionLabel="New pass"
              onAction={() => { setToken(''); setOpen(true) }}
            />
          ) : null}
          {pending.slice(0, 20).map((v, i) => (
            <FadeIn key={v.id} index={i}>
              <Card>
                <View style={styles.row}>
                  <IconCircle name="id-card-outline" size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{v.visitorName}</Text>
                    <Text style={styles.muted}>
                      Flat {v.flatNumber} · {v.visitType} · exp {formatDate(v.expiresAt)}
                    </Text>
                  </View>
                  <StatusPill value={v.used || v.entryAt ? 'INSIDE' : 'PENDING'} />
                </View>
                {(v.used || v.entryAt) && !v.exitAt ? (
                  <>
                    <View style={{ height: 10 }} />
                    <Button
                      label={exit.isPending ? 'Logging…' : 'Mark exit'}
                      variant="ghost"
                      icon="exit-outline"
                      loading={exit.isPending}
                      onPress={() => exit.mutate(v.id)}
                    />
                  </>
                ) : null}
              </Card>
            </FadeIn>
          ))}
        </ScrollView>

        <CreateFab onPress={() => { setToken(''); setError(''); setOpen(true) }} label="Create pass" />

        <GlassSheet
          visible={open}
          onClose={() => { setOpen(false); setError('') }}
          title="New visitor pass"
          subtitle="Pick a flat and guest details"
          icon="person-add"
          footer={(
            <>
              {!token ? (
                <Button
                  label={create.isPending ? 'Creating…' : 'Create pass'}
                  icon="qr-code"
                  loading={create.isPending}
                  disabled={!flatId || name.trim().length < 2}
                  onPress={() => { setError(''); create.mutate() }}
                />
              ) : (
                <Button label="Done" icon="checkmark" onPress={() => setOpen(false)} />
              )}
            </>
          )}
        >
          {!token ? (
            <>
              <Text style={styles.label}>Flat</Text>
              <ChipRow>
                {(flats.data ?? []).slice(0, 12).map((f) => (
                  <Chip key={f.id} label={f.flatNumber} active={flatId === f.id} onPress={() => setFlatId(f.id)} />
                ))}
              </ChipRow>
              <Field label="Visitor name" value={name} onChangeText={setName} placeholder="Name" autoCapitalize="words" />
              <ChipRow>
                {['GUEST', 'DELIVERY', 'SERVICE'].map((t) => (
                  <Chip key={t} label={t} active={type === t} onPress={() => setType(t)} />
                ))}
              </ChipRow>
              <ErrorText message={error} />
            </>
          ) : (
            <View style={styles.tokenBox}>
              <Text style={styles.tokenLabel}>Pass token</Text>
              <Text selectable style={styles.token}>{token}</Text>
            </View>
          )}
        </GlassSheet>
      </SafeAreaView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  pad: { padding: space.md, paddingBottom: 120 },
  label: { fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: 6 },
  tokenBox: { padding: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.45)' },
  tokenLabel: { fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: 6 },
  token: { fontSize: 12, color: colors.text, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontWeight: '800', fontSize: 15, color: colors.text },
  muted: { color: colors.muted, fontSize: 12, marginTop: 3 },
})
