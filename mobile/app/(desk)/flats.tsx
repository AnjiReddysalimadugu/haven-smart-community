import { useMemo, useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { apiError, occupancyApi, propertyApi, userApi, type Occupancy } from '../../src/api'
import { useAuth } from '../../src/auth'
import { Button, Card, Chip, ChipRow, Empty, ErrorText, FadeIn, GlassSheet, LoadingBlock, PageHeader, Screen, StatusPill } from '../../src/components/ui'
import { IconCircle } from '../../src/icons'
import { SocietyRequired, SocietyScopeBar, useScopeApartmentId, useSociety } from '../../src/society'
import { colors, space } from '../../src/theme'

const ADMIN = new Set(['ADMIN', 'APARTMENT_ADMIN', 'SUPER_ADMIN'])

export default function DeskFlats() {
  const { user } = useAuth()
  const isSuper = user?.role === 'SUPER_ADMIN'
  return (
    <SocietyRequired isSuper={isSuper}>
      <DeskFlatsBody />
    </SocietyRequired>
  )
}

function DeskFlatsBody() {
  const { user } = useAuth()
  const isSuper = user?.role === 'SUPER_ADMIN'
  const { selected } = useSociety()
  const scopeId = useScopeApartmentId(user?.apartmentId, isSuper)
  const canEdit = !!user && ADMIN.has(user.role)
  const qc = useQueryClient()
  const flats = useQuery({
    queryKey: ['flats', scopeId],
    queryFn: () => propertyApi.flats(scopeId),
    enabled: !isSuper || !!scopeId,
  })
  const occ = useQuery({
    queryKey: ['occupancies', scopeId],
    queryFn: () => occupancyApi.list(scopeId),
    enabled: !isSuper || !!scopeId,
  })
  const residents = useQuery({
    queryKey: ['users', 'RESIDENT', scopeId],
    queryFn: () => userApi.list({ role: 'RESIDENT', apartmentId: scopeId }),
    enabled: canEdit && (!isSuper || !!scopeId),
  })

  const [filter, setFilter] = useState<'ALL' | 'VACANT' | 'OCCUPIED'>('ALL')
  const [pickFlat, setPickFlat] = useState<string | null>(null)
  const [residentId, setResidentId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const byFlat = useMemo(() => {
    const map = new Map<string, Occupancy>()
    for (const o of occ.data ?? []) {
      if (o.status === 'ACTIVE') map.set(o.flatId, o)
    }
    return map
  }, [occ.data])

  const rows = (flats.data ?? []).filter((f) => {
    const active = byFlat.get(f.id)
    if (filter === 'VACANT') return !active
    if (filter === 'OCCUPIED') return !!active
    return true
  })

  const allocate = useMutation({
    mutationFn: () => occupancyApi.allocate(pickFlat!, {
      residentUserId: residentId!,
      occupancyType: 'OWNER',
    }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['occupancies'] }),
        qc.invalidateQueries({ queryKey: ['flats'] }),
      ])
      setPickFlat(null)
      setResidentId(null)
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    },
    onError: (err) => setError(apiError(err, 'Allocate failed')),
  })

  const release = useMutation({
    mutationFn: (flatId: string) => occupancyApi.release(flatId),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['occupancies'] }),
        qc.invalidateQueries({ queryKey: ['flats'] }),
      ])
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    },
    onError: (err) => Alert.alert('Release failed', apiError(err, 'Could not release')),
  })

  return (
    <Screen>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
          <PageHeader
            eyebrow="Property"
            title="Flats"
            subtitle={selected ? `Occupancy for ${selected.name}` : 'Occupancy allocate / release for society ops.'}
          />

          <SocietyScopeBar isSuper={isSuper} />

          <ChipRow>
            {(['ALL', 'VACANT', 'OCCUPIED'] as const).map((f) => (
              <Chip key={f} label={f} active={filter === f} onPress={() => setFilter(f)} />
            ))}
          </ChipRow>

          {flats.isLoading ? <LoadingBlock /> : null}
          {!flats.isLoading && !rows.length ? (
            <Empty title="No flats" body="Create flats from the web admin first." icon="business-outline" />
          ) : null}
          {rows.map((f, i) => {
            const active = byFlat.get(f.id)
            return (
              <FadeIn key={f.id} index={i}>
                <Card>
                  <View style={styles.row}>
                    <IconCircle name="business-outline" size={40} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.title}>{f.flatNumber}</Text>
                      <Text style={styles.muted}>
                        {active ? `${active.residentName || 'Resident'} · ${active.occupancyType}` : 'Vacant'}
                      </Text>
                    </View>
                    <StatusPill value={active ? 'OCCUPIED' : f.status} />
                  </View>
                  {canEdit ? (
                    <View style={{ marginTop: 10, gap: 8 }}>
                      {active ? (
                        <Button label="Release" variant="danger" icon="exit-outline" onPress={() => release.mutate(f.id)} />
                      ) : (
                        <Button label="Allocate" icon="person-add-outline" onPress={() => { setPickFlat(f.id); setResidentId(null); setError('') }} />
                      )}
                    </View>
                  ) : null}
                </Card>
              </FadeIn>
            )
          })}
        </ScrollView>

        <GlassSheet
          visible={!!pickFlat && canEdit}
          onClose={() => { setPickFlat(null); setError('') }}
          title="Assign resident"
          subtitle="Pick an active resident for this flat"
          icon="home"
          footer={(
            <Button
              label={allocate.isPending ? 'Saving…' : 'Allocate'}
              icon="checkmark"
              loading={allocate.isPending}
              disabled={!residentId}
              onPress={() => { setError(''); allocate.mutate() }}
            />
          )}
        >
          <ChipRow>
            {(residents.data ?? []).filter((r) => r.active).slice(0, 40).map((r) => (
              <Chip
                key={r.id}
                label={`${r.fullName}${r.flatNumber ? ` · ${r.flatNumber}` : ''}`}
                active={residentId === r.id}
                onPress={() => setResidentId(r.id)}
              />
            ))}
          </ChipRow>
          <ErrorText message={error} />
        </GlassSheet>
      </SafeAreaView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  pad: { padding: space.md, paddingBottom: 120 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontWeight: '800', fontSize: 15, color: colors.text },
  muted: { color: colors.muted, fontSize: 12, marginTop: 3 },
})
