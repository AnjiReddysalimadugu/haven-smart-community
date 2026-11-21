import { useMemo, useState } from 'react'
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import {
  apiError, propertyApi, userApi, type Role,
} from '../../src/api'
import { useAuth } from '../../src/auth'
import {
  Button, Card, Chip, ChipRow, CreateFab, Empty, ErrorText, FadeIn, Field, GlassSheet,
  LoadingBlock, PageHeader, Screen, Section, StatusPill,
} from '../../src/components/ui'
import { IconCircle } from '../../src/icons'
import { SocietyRequired, SocietyScopeBar, useScopeApartmentId, useSociety } from '../../src/society'
import { colors, space } from '../../src/theme'

const ADMIN_ROLES: Role[] = ['STAFF', 'SECURITY', 'RESIDENT']
const SUPER_ROLES: Role[] = ['APARTMENT_ADMIN', 'STAFF', 'SECURITY', 'RESIDENT']
const PLATFORM_ROLES: Role[] = ['SUPER_ADMIN', 'APARTMENT_ADMIN', 'STAFF', 'SECURITY', 'RESIDENT']

export default function DeskUsers() {
  const { user } = useAuth()
  const isSuper = user?.role === 'SUPER_ADMIN'
  return (
    <SocietyRequired isSuper={isSuper}>
      <DeskUsersBody />
    </SocietyRequired>
  )
}

function DeskUsersBody() {
  const { user } = useAuth()
  const isSuper = user?.role === 'SUPER_ADMIN'
  const { selected } = useSociety()
  const scopeId = useScopeApartmentId(user?.apartmentId, isSuper)
  const qc = useQueryClient()
  const [roleFilter, setRoleFilter] = useState<Role | ''>('')
  const [open, setOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('HavenDemo!2026Rotate')
  const [role, setRole] = useState<Role>(isSuper ? 'APARTMENT_ADMIN' : 'STAFF')
  const [apartmentId, setApartmentId] = useState(scopeId || user?.apartmentId || '')
  const [error, setError] = useState('')

  const apartments = useQuery({
    queryKey: ['apartments'],
    queryFn: () => propertyApi.apartments(),
    enabled: isSuper && !selected,
  })

  const list = useQuery({
    queryKey: ['users', roleFilter, scopeId],
    queryFn: () => userApi.list({ role: roleFilter || null, apartmentId: scopeId }),
    enabled: !isSuper || !!scopeId,
  })

  const creatable = isSuper ? (selected ? SUPER_ROLES : PLATFORM_ROLES) : ADMIN_ROLES
  const rows = useMemo(() => list.data ?? [], [list.data])

  const create = useMutation({
    mutationFn: () => userApi.create({
      email: email.trim().toLowerCase(),
      password,
      fullName: fullName.trim(),
      role,
      apartmentId: role === 'SUPER_ADMIN'
        ? null
        : (isSuper ? (selected?.id || apartmentId || null) : user?.apartmentId),
    }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['users'] })
      await qc.invalidateQueries({ queryKey: ['residents'] })
      setOpen(false)
      setFullName('')
      setEmail('')
      setError('')
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      Alert.alert('User created', 'They can sign in with OTP (or the password you set).')
    },
    onError: (err) => setError(apiError(err, 'Could not create user')),
  })

  const toggle = useMutation({
    mutationFn: async (row: { id: string; active: boolean }) =>
      row.active ? userApi.deactivate(row.id) : userApi.activate(row.id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['users'] })
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    },
    onError: (err) => Alert.alert('Update failed', apiError(err, 'Could not update user')),
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
            title="Users"
            subtitle={selected
              ? `Access for ${selected.name}`
              : 'Create staff, security, residents from +.'}
          />

          <SocietyScopeBar isSuper={isSuper} />

          <Section label={`Directory (${rows.length})`} />
          <ChipRow>
            <Chip label="ALL" active={!roleFilter} onPress={() => setRoleFilter('')} />
            {(isSuper ? SUPER_ROLES : [...ADMIN_ROLES, 'APARTMENT_ADMIN', 'ADMIN'] as Role[]).map((r) => (
              <Chip key={r} label={r.split('_')[0]} active={roleFilter === r} onPress={() => setRoleFilter(r)} />
            ))}
          </ChipRow>

          {list.isLoading ? <LoadingBlock /> : null}
          {!list.isLoading && !rows.length ? (
            <Empty
              title="No users"
              body="Create your first society user."
              icon="people-outline"
              actionLabel="Create user"
              onAction={() => setOpen(true)}
            />
          ) : null}
          {rows.map((row, i) => (
            <FadeIn key={row.id} index={i}>
              <Card>
                <View style={styles.row}>
                  <IconCircle name="person-outline" size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.title}>{row.fullName}</Text>
                    <Text style={styles.muted}>{row.email}</Text>
                    <Text style={styles.meta}>
                      {row.role}
                      {row.apartmentName ? ` · ${row.apartmentName}` : ''}
                      {row.flatNumber ? ` · Flat ${row.flatNumber}` : ''}
                    </Text>
                  </View>
                  <StatusPill value={row.active ? 'ACTIVE' : 'INACTIVE'} />
                </View>
                <View style={{ height: 10 }} />
                <Button
                  label={row.active ? 'Deactivate' : 'Activate'}
                  variant={row.active ? 'danger' : 'primary'}
                  icon={row.active ? 'ban-outline' : 'checkmark-circle-outline'}
                  onPress={() => toggle.mutate(row)}
                />
              </Card>
            </FadeIn>
          ))}
        </ScrollView>

        <CreateFab onPress={() => { setError(''); setOpen(true) }} label="Create user" />

        <GlassSheet
          visible={open}
          onClose={() => { setOpen(false); setError('') }}
          title="Create user"
          subtitle="OTP login works once the account exists"
          icon="person-add"
          footer={(
            <Button
              label={create.isPending ? 'Creating…' : 'Save user'}
              icon="checkmark"
              loading={create.isPending}
              disabled={fullName.trim().length < 2 || !email.includes('@')}
              onPress={() => create.mutate()}
            />
          )}
        >
          <Field label="Full name" value={fullName} onChangeText={setFullName} autoCapitalize="words" placeholder="Anita Rao" />
          <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="user@haven.local" autoCapitalize="none" />
          <Field label="Temp password" value={password} onChangeText={setPassword} secureTextEntry />
          <Text style={styles.label}>Role</Text>
          <ChipRow>
            {creatable.map((r) => (
              <Chip key={r} label={r.replace('_', ' ')} active={role === r} onPress={() => setRole(r)} />
            ))}
          </ChipRow>
          {isSuper && role !== 'SUPER_ADMIN' && !selected ? (
            <>
              <Text style={styles.label}>Society</Text>
              <ChipRow>
                {(apartments.data ?? []).map((a) => (
                  <Chip key={a.id} label={a.name} active={apartmentId === a.id} onPress={() => setApartmentId(a.id)} />
                ))}
              </ChipRow>
            </>
          ) : null}
          <ErrorText message={error} />
        </GlassSheet>
      </SafeAreaView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  pad: { padding: space.md, paddingBottom: 120 },
  label: { fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  title: { fontWeight: '800', fontSize: 15, color: colors.text },
  muted: { color: colors.muted, fontSize: 12, marginTop: 3 },
  meta: { color: colors.soft, fontSize: 11, marginTop: 4, fontWeight: '600' },
})
