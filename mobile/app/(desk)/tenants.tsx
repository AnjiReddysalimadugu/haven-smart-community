import { useMemo, useState } from 'react'
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { apiError, residentApi } from '../../src/api'
import { useAuth } from '../../src/auth'
import {
  Button, Card, CreateFab, Empty, ErrorText, FadeIn, Field, GlassSheet,
  LoadingBlock, PageHeader, Screen, Section, StatusPill,
} from '../../src/components/ui'
import { IconCircle } from '../../src/icons'
import { SocietyRequired, SocietyScopeBar, useScopeApartmentId, useSociety } from '../../src/society'
import { colors, space } from '../../src/theme'

export default function DeskTenants() {
  const { user } = useAuth()
  const isSuper = user?.role === 'SUPER_ADMIN'
  return (
    <SocietyRequired isSuper={isSuper}>
      <DeskTenantsBody />
    </SocietyRequired>
  )
}

function DeskTenantsBody() {
  const { user } = useAuth()
  const isSuper = user?.role === 'SUPER_ADMIN'
  const { selected } = useSociety()
  const scopeId = useScopeApartmentId(user?.apartmentId, isSuper)
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('HavenDemo!2026Rotate')
  const [error, setError] = useState('')
  const [q, setQ] = useState('')

  const list = useQuery({
    queryKey: ['residents', scopeId],
    queryFn: () => residentApi.list(scopeId),
    enabled: !isSuper || !!scopeId,
  })

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (list.data ?? []).filter((r) =>
      !needle || `${r.fullName} ${r.email} ${r.flatNumber || ''} ${r.apartmentName || ''}`.toLowerCase().includes(needle))
  }, [list.data, q])

  const create = useMutation({
    mutationFn: () => residentApi.register({
      email: email.trim().toLowerCase(),
      password,
      fullName: fullName.trim(),
      apartmentId: isSuper ? (selected?.id || scopeId) : user?.apartmentId,
    }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['residents'] }),
        qc.invalidateQueries({ queryKey: ['users'] }),
        qc.invalidateQueries({ queryKey: ['occupancies'] }),
      ])
      setOpen(false)
      setFullName('')
      setEmail('')
      setError('')
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert('Resident added', 'They can sign in with OTP. Link a flat from Flats.')
    },
    onError: (err) => setError(apiError(err, 'Could not register resident')),
  })

  const deactivate = useMutation({
    mutationFn: (id: string) => residentApi.deactivate(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['residents'] })
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    },
    onError: (err) => Alert.alert('Failed', apiError(err, 'Could not deactivate')),
  })

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
            eyebrow="Society"
            title="Residents"
            subtitle={selected
              ? `Directory for ${selected.name}`
              : 'Resident directory — add from +.'}
          />

          <SocietyScopeBar isSuper={isSuper} />

          <Field label="Search" value={q} onChangeText={setQ} placeholder="Name, email, flat…" autoCapitalize="none" />

          <Section label={`${rows.length} residents`} />
          {list.isLoading ? <LoadingBlock /> : null}
          {!list.isLoading && !rows.length ? (
            <Empty
              title="No residents"
              body="Register a resident for this society."
              icon="home-outline"
              actionLabel="Add resident"
              onAction={() => setOpen(true)}
            />
          ) : null}
          {rows.map((r, i) => (
            <FadeIn key={r.id} index={i}>
              <Card>
                <View style={styles.row}>
                  <IconCircle name="home-outline" size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{r.fullName}</Text>
                    <Text style={styles.muted}>{r.email}</Text>
                    <Text style={styles.meta}>
                      {r.apartmentName || selected?.name || 'Society'}
                      {r.flatNumber ? ` · Flat ${r.flatNumber}` : ' · No flat'}
                    </Text>
                  </View>
                  <StatusPill value={r.active ? 'ACTIVE' : 'INACTIVE'} />
                </View>
                {r.active ? (
                  <>
                    <View style={{ height: 10 }} />
                    <Button label="Deactivate" variant="danger" icon="ban-outline" onPress={() => deactivate.mutate(r.id)} />
                  </>
                ) : null}
              </Card>
            </FadeIn>
          ))}
        </ScrollView>

        <CreateFab onPress={() => { setError(''); setOpen(true) }} label="Add resident" />

        <GlassSheet
          visible={open}
          onClose={() => { setOpen(false); setError('') }}
          title="Add resident"
          subtitle={selected ? selected.name : 'Register for this society'}
          icon="home"
          footer={(
            <Button
              label={create.isPending ? 'Saving…' : 'Register resident'}
              icon="checkmark"
              loading={create.isPending}
              disabled={fullName.trim().length < 2 || !email.includes('@')}
              onPress={() => create.mutate()}
            />
          )}
        >
          <Field label="Full name" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
          <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Field label="Temp password" value={password} onChangeText={setPassword} secureTextEntry />
          <ErrorText message={error} />
        </GlassSheet>
      </SafeAreaView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  pad: { padding: space.md, paddingBottom: 120 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { fontWeight: '800', fontSize: 15, color: colors.text },
  muted: { color: colors.muted, fontSize: 12, marginTop: 3 },
  meta: { color: colors.soft, fontSize: 11, marginTop: 4, fontWeight: '600' },
})
