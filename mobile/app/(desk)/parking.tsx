import { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { apiError, money, parkingApi, propertyApi } from '../../src/api'
import { useAuth } from '../../src/auth'
import { Button, Card, Chip, ChipRow, Empty, ErrorText, FadeIn, Field, LoadingBlock, PageHeader, Screen, StatusPill } from '../../src/components/ui'
import { SocietyRequired, SocietyScopeBar, useScopeApartmentId, useSociety } from '../../src/society'
import { colors, space } from '../../src/theme'

const ADMIN = new Set(['ADMIN', 'APARTMENT_ADMIN', 'SUPER_ADMIN'])

export default function DeskParking() {
  const { user } = useAuth()
  const isSuper = user?.role === 'SUPER_ADMIN'
  return (
    <SocietyRequired isSuper={isSuper}>
      <DeskParkingBody />
    </SocietyRequired>
  )
}

function DeskParkingBody() {
  const { user } = useAuth()
  const isSuper = user?.role === 'SUPER_ADMIN'
  const { selected } = useSociety()
  const scopeId = useScopeApartmentId(user?.apartmentId, isSuper)
  const canEdit = !!user && ADMIN.has(user.role)
  const qc = useQueryClient()
  const slots = useQuery({
    queryKey: ['parking', scopeId],
    queryFn: () => parkingApi.list(scopeId),
    enabled: !isSuper || !!scopeId,
  })
  const flats = useQuery({
    queryKey: ['flats', scopeId],
    queryFn: () => propertyApi.flats(scopeId),
    enabled: canEdit && (!isSuper || !!scopeId),
  })

  const [slotId, setSlotId] = useState<string | null>(null)
  const [flatId, setFlatId] = useState<string | null>(null)
  const [vehicle, setVehicle] = useState('')
  const [error, setError] = useState('')

  const allocate = useMutation({
    mutationFn: () => parkingApi.allocate(slotId!, { flatId: flatId!, vehicleNumber: vehicle.trim() || undefined }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['parking'] })
      setSlotId(null)
      setFlatId(null)
      setVehicle('')
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    },
    onError: (err) => setError(apiError(err, 'Allocate failed')),
  })

  const release = useMutation({
    mutationFn: (id: string) => parkingApi.release(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['parking'] })
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    },
    onError: (err) => Alert.alert('Release failed', apiError(err, 'Could not release')),
  })

  const free = (slots.data ?? []).filter((s) => !s.allocated)
  const taken = (slots.data ?? []).filter((s) => s.allocated)

  return (
    <Screen>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
          <PageHeader
            eyebrow="Parking"
            title="Slots"
            subtitle={selected
              ? `${selected.name} · ${free.length} free · ${taken.length} allocated`
              : `${free.length} free · ${taken.length} allocated`}
          />

          <SocietyScopeBar isSuper={isSuper} />

          {slotId && canEdit ? (
            <Card>
              <Text style={styles.title}>Allocate slot</Text>
              <Field label="Vehicle number" value={vehicle} onChangeText={setVehicle} placeholder="TS09AB1234" autoCapitalize="characters" />
              <Text style={styles.label}>Flat</Text>
              <ChipRow>
                {(flats.data ?? []).slice(0, 40).map((f) => (
                  <Chip key={f.id} label={f.flatNumber} active={flatId === f.id} onPress={() => setFlatId(f.id)} />
                ))}
              </ChipRow>
              <ErrorText message={error} />
              <Button
                label={allocate.isPending ? 'Saving…' : 'Allocate'}
                variant="lime"
                loading={allocate.isPending}
                disabled={!flatId}
                onPress={() => { setError(''); allocate.mutate() }}
              />
              <View style={{ height: 8 }} />
              <Button label="Cancel" variant="ghost" onPress={() => { setSlotId(null); setError('') }} />
            </Card>
          ) : null}

          {slots.isLoading ? <LoadingBlock /> : null}
          {!slots.isLoading && !(slots.data ?? []).length ? (
            <Empty title="No slots" body="Create parking slots from the web admin." />
          ) : null}

          {(slots.data ?? []).map((s, i) => (
            <FadeIn key={s.id} index={i}>
              <Card>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{s.slotCode}</Text>
                    <Text style={styles.muted}>
                      {s.vehicleType} · {money(s.monthlyCharge)}/mo
                      {s.allocated ? ` · Flat ${s.flatNumber}${s.vehicleNumber ? ` · ${s.vehicleNumber}` : ''}` : ''}
                    </Text>
                  </View>
                  <StatusPill value={s.allocated ? 'ALLOCATED' : 'AVAILABLE'} />
                </View>
                {canEdit ? (
                  <View style={{ marginTop: 10 }}>
                    {s.allocated ? (
                      <Button label="Release" variant="danger" onPress={() => release.mutate(s.id)} />
                    ) : (
                      <Button label="Allocate" onPress={() => { setSlotId(s.id); setError('') }} />
                    )}
                  </View>
                ) : null}
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
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { fontWeight: '800', fontSize: 15, color: colors.text },
  muted: { color: colors.muted, fontSize: 12, marginTop: 3 },
  label: { fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: 6 },
})
