import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Role } from '../../api'
import { userApi } from '../../services'
import { useAuth } from '../../auth'
import { useSociety } from '../../society'
import { Empty, ErrorBanner, Field, Skeleton, Status } from '../../components/UI'
import {
  BottomSheet, ConfirmDialog, PageHeader, PullToRefresh, SegmentedControl,
} from '../../components/mobile/primitives'
import SocietySwitcher from '../../components/SocietySwitcher'
import { apiError } from '../../lib/format'
import { haptic } from '../../lib/haptics'

const FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'APARTMENT_ADMIN', label: 'Admin' },
  { value: 'STAFF', label: 'Staff' },
  { value: 'SECURITY', label: 'Security' },
  { value: 'RESIDENT', label: 'Resident' },
]

export default function MobileUsers() {
  const { user, can } = useAuth()
  const isSuper = user?.role === 'SUPER_ADMIN'
  const { scopeParam, apartments } = useSociety()
  const qc = useQueryClient()
  const [roleFilter, setRoleFilter] = useState('')
  const [creating, setCreating] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('HavenDemo!2026Rotate')
  const [role, setRole] = useState<Role>(isSuper ? 'APARTMENT_ADMIN' : 'STAFF')
  const [apartmentId, setApartmentId] = useState(scopeParam || user?.apartmentId || '')
  const [error, setError] = useState('')
  const [toggleId, setToggleId] = useState<{ id: string; active: boolean; name: string } | null>(null)

  const list = useQuery({
    queryKey: ['users', scopeParam, roleFilter],
    queryFn: () => userApi.list({
      apartmentId: scopeParam,
      role: (roleFilter || null) as Role | null,
    }),
    enabled: can('user.manage'),
  })

  const rows = useMemo(() => list.data ?? [], [list.data])

  const create = useMutation({
    mutationFn: () => userApi.create({
      email: email.trim().toLowerCase(),
      password,
      fullName: fullName.trim(),
      role,
      apartmentId: role === 'SUPER_ADMIN' ? null : (apartmentId || scopeParam || user?.apartmentId),
    }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['users'] })
      setCreating(false)
      setFullName('')
      setEmail('')
      setError('')
      haptic('success')
    },
    onError: (err) => setError(apiError(err, 'Could not create user')),
  })

  const toggle = useMutation({
    mutationFn: async () => {
      if (!toggleId) return
      return toggleId.active ? userApi.deactivate(toggleId.id) : userApi.activate(toggleId.id)
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['users'] })
      setToggleId(null)
      haptic('medium')
    },
    onError: (err) => setError(apiError(err, 'Update failed')),
  })

  const creatable: Role[] = isSuper
    ? ['SUPER_ADMIN', 'APARTMENT_ADMIN', 'STAFF', 'SECURITY', 'RESIDENT']
    : ['STAFF', 'SECURITY', 'RESIDENT']

  return (
    <PullToRefresh onRefresh={() => qc.invalidateQueries({ queryKey: ['users'] })}>
      <PageHeader
        eyebrow="Access"
        title="Users"
        subtitle="Staff, security and admins"
        trailing={<SocietySwitcher />}
      />

      <button type="button" className="button lime full" style={{ marginBottom: 12 }} onClick={() => setCreating(true)}>
        Create user
      </button>

      <SegmentedControl
        value={roleFilter}
        onChange={setRoleFilter}
        options={FILTERS}
      />

      {list.isLoading ? <Skeleton style={{ height: 80 }} /> : null}
      {list.isError ? <ErrorBanner message="Could not load users." /> : null}
      {!list.isLoading && !rows.length ? <Empty title="No users" description="Create access for this society." /> : null}

      {rows.map((row) => (
        <div key={row.id} className="list-row glass-card stack-actions">
          <div className="list-row-main">
            <div>
              <b>{row.fullName}</b>
              <span>{row.email}</span>
              <span>{row.role}{row.apartmentName ? ` · ${row.apartmentName}` : ''}</span>
            </div>
            <Status value={row.active ? 'ACTIVE' : 'INACTIVE'} />
          </div>
          <button
            type="button"
            className={`button compact ${row.active ? 'danger' : 'primary'}`}
            onClick={() => setToggleId({ id: row.id, active: row.active, name: row.fullName })}
          >
            {row.active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      ))}

      <BottomSheet open={creating} title="Create user" onClose={() => setCreating(false)}>
        <Field label="Full name"><input value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
        <Field label="Email"><input value={email} onChange={(e) => setEmail(e.target.value)} autoCapitalize="none" /></Field>
        <Field label="Temp password"><input value={password} onChange={(e) => setPassword(e.target.value)} type="password" /></Field>
        <Field label="Role">
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {creatable.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        {isSuper && role !== 'SUPER_ADMIN' ? (
          <Field label="Society">
            <select value={apartmentId} onChange={(e) => setApartmentId(e.target.value)}>
              <option value="">Select…</option>
              {apartments.filter((a) => a.status !== 'ARCHIVED').map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </Field>
        ) : null}
        <ErrorBanner message={error} />
        <button
          type="button"
          className="button lime full"
          disabled={create.isPending || fullName.trim().length < 2 || !email.includes('@')}
          onClick={() => create.mutate()}
        >
          {create.isPending ? 'Saving…' : 'Save user'}
        </button>
      </BottomSheet>

      <ConfirmDialog
        open={!!toggleId}
        title={toggleId?.active ? 'Deactivate user?' : 'Activate user?'}
        message={toggleId?.name ?? ''}
        confirmLabel={toggleId?.active ? 'Deactivate' : 'Activate'}
        danger={!!toggleId?.active}
        onCancel={() => setToggleId(null)}
        onConfirm={() => toggle.mutate()}
      />
    </PullToRefresh>
  )
}
