import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useMemo, useState } from 'react'
import { Plus, Ban, Pencil, CircleCheck, Eye } from 'lucide-react'
import type { ManagedUser, Role } from '../api'
import { propertyApi, userApi } from '../services'
import { roleLabel, useAuth } from '../auth'
import {
  ConfirmDialog, DataToolbar, Empty, ErrorBanner, Field, PageHeading, Pagination,
  ResponsiveSheet, Status, useToast,
} from '../components/UI'
import { apiError, formatDateTime, paginate } from '../lib/format'

const ADMIN_CREATE_ROLES: Role[] = ['STAFF', 'SECURITY', 'RESIDENT']
const SUPER_CREATE_ROLES: Role[] = ['SUPER_ADMIN', 'APARTMENT_ADMIN', 'STAFF', 'SECURITY', 'RESIDENT']

export default function Users() {
  const { can, user } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()
  const isSuper = user?.role === 'SUPER_ADMIN'
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [roleFilter, setRoleFilter] = useState<Role | ''>('')
  const [apartmentFilter, setApartmentFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [edit, setEdit] = useState<ManagedUser | null>(null)
  const [view, setView] = useState<ManagedUser | null>(null)
  const [toggleUser, setToggleUser] = useState<{ id: string; active: boolean; name: string } | null>(null)
  const [error, setError] = useState('')
  const [createRole, setCreateRole] = useState<Role>(isSuper ? 'APARTMENT_ADMIN' : 'STAFF')

  const { data: apartments = [] } = useQuery({
    queryKey: ['apartments'],
    queryFn: propertyApi.apartments,
    enabled: isSuper,
  })

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['users', apartmentFilter || user?.apartmentId, roleFilter],
    queryFn: () => userApi.list({
      apartmentId: isSuper ? (apartmentFilter || null) : user?.apartmentId,
      role: roleFilter || null,
    }),
    enabled: can('user.manage'),
  })

  const creatableRoles = isSuper ? SUPER_CREATE_ROLES : ADMIN_CREATE_ROLES
  const needsApartment = createRole !== 'SUPER_ADMIN'

  const rows = useMemo(
    () => data.filter((r) =>
      `${r.fullName} ${r.email} ${r.role} ${r.apartmentName ?? ''} ${r.flatNumber ?? ''}`
        .toLowerCase()
        .includes(q.toLowerCase())),
    [data, q],
  )
  const paged = paginate(rows, page, 8)

  const create = useMutation({
    mutationFn: (body: object) => userApi.create(body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['users'] })
      await qc.invalidateQueries({ queryKey: ['residents'] })
      setCreateOpen(false)
      setError('')
      toast.success('User created')
    },
    onError: (err) => setError(apiError(err, 'Could not create user')),
  })

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => userApi.update(id, body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['users'] })
      setEdit(null)
      setError('')
      toast.success('User updated')
    },
    onError: (err) => setError(apiError(err, 'Could not update user')),
  })

  const deactivate = useMutation({
    mutationFn: (id: string) => userApi.deactivate(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['users'] })
      await qc.invalidateQueries({ queryKey: ['residents'] })
      setToggleUser(null)
      toast.success('User deactivated')
    },
    onError: (err) => toast.error(apiError(err, 'Could not deactivate user')),
  })

  const activate = useMutation({
    mutationFn: (id: string) => userApi.activate(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['users'] })
      setToggleUser(null)
      toast.success('User activated')
    },
    onError: (err) => toast.error(apiError(err, 'Could not activate user')),
  })

  function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const role = String(fd.get('role') || createRole) as Role
    create.mutate({
      email: fd.get('email'),
      password: fd.get('password'),
      fullName: fd.get('fullName'),
      role,
      apartmentId: role === 'SUPER_ADMIN'
        ? null
        : isSuper
          ? (fd.get('apartmentId') || null)
          : user?.apartmentId,
    })
  }

  function onUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!edit) return
    const fd = new FormData(e.currentTarget)
    const password = String(fd.get('password') || '')
    update.mutate({
      id: edit.id,
      body: {
        fullName: fd.get('fullName'),
        email: fd.get('email'),
        ...(password ? { password } : {}),
      },
    })
  }

  function canManageRow(row: ManagedUser) {
    if (!user) return false
    if (row.id === user.id) return false
    if (!isSuper && (row.role === 'SUPER_ADMIN' || row.role === 'APARTMENT_ADMIN' || row.role === 'ADMIN')) {
      return false
    }
    return true
  }

  return (
    <>
      <PageHeading
        eyebrow="Administration"
        title="Users"
        subtitle="Create apartment-scoped logins for admins, staff, security and residents."
        action={can('user.manage') ? (
          <button className="button button-primary" type="button" onClick={() => {
            setError('')
            setCreateRole(isSuper ? 'APARTMENT_ADMIN' : 'STAFF')
            setCreateOpen(true)
          }}>
            <Plus size={17} /> Create user
          </button>
        ) : undefined}
      />

      {error && !createOpen && !edit && <ErrorBanner message={error} />}
      {isError && <div className="form-error">Could not load users.</div>}

      <div className="table-panel">
        <DataToolbar
          title="User directory"
          count={rows.length}
          search={q}
          onSearch={(v) => { setQ(v); setPage(1) }}
          placeholder="Search users…"
        >
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value as Role | ''); setPage(1) }}
            aria-label="Filter by role"
          >
            <option value="">All roles</option>
            {SUPER_CREATE_ROLES.map((r) => (
              <option key={r} value={r}>{roleLabel(r)}</option>
            ))}
          </select>
          {isSuper && (
            <select
              value={apartmentFilter}
              onChange={(e) => { setApartmentFilter(e.target.value); setPage(1) }}
              aria-label="Filter by apartment"
            >
              <option value="">All apartments</option>
              {apartments.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          )}
        </DataToolbar>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Role</th><th>Apartment</th><th>Flat</th><th>Status</th>
                {can('user.manage') && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={6}>Loading users…</td></tr> : paged.slice.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="person">
                      <div className="avatar">{r.fullName.slice(0, 2).toUpperCase()}</div>
                      <div>
                        <b>{r.fullName}</b>
                        <div className="muted" style={{ fontSize: 12 }}>{r.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>{roleLabel(r.role)}</td>
                  <td>{r.apartmentName || '—'}</td>
                  <td>{r.flatNumber || '—'}</td>
                  <td><Status value={r.active ? 'ACTIVE' : 'INACTIVE'} /></td>
                  {can('user.manage') && (
                    <td>
                      {canManageRow(r) ? (
                        <div className="row-actions">
                          <button className="button button-ghost button-sm" type="button" onClick={() => setView(r)}>
                            <Eye size={14} /> View
                          </button>
                          <button className="button button-secondary button-sm" type="button" onClick={() => { setError(''); setEdit(r) }}>
                            <Pencil size={14} /> Edit
                          </button>
                          {r.active ? (
                            <button
                              className="button button-danger button-sm"
                              type="button"
                              disabled={r.role === 'RESIDENT' && Boolean(r.flatId)}
                              title={r.role === 'RESIDENT' && r.flatId ? 'Release occupancy before deactivation' : 'Deactivate'}
                              onClick={() => setToggleUser({ id: r.id, active: true, name: r.fullName })}
                            >
                              <Ban size={14} /> Deactivate
                            </button>
                          ) : (
                            <button
                              className="button button-secondary button-sm"
                              type="button"
                              onClick={() => setToggleUser({ id: r.id, active: false, name: r.fullName })}
                            >
                              <CircleCheck size={14} /> Activate
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && !paged.slice.length && (
            <Empty title="No users found" description="Create a user for this society to get started." />
          )}
        </div>
        <Pagination page={page} pageSize={8} total={rows.length} onPageChange={setPage} />
      </div>

      <div className="mini-stats">
        <div><small>Total</small><b>{data.length}</b></div>
        <div><small>Active</small><b>{data.filter((u) => u.active).length}</b></div>
        <div><small>Inactive</small><b>{data.filter((u) => !u.active).length}</b></div>
      </div>

      <ResponsiveSheet
        open={createOpen}
        title="Create user"
        subtitle="Users are scoped to one apartment (except platform super admins)."
        onClose={() => setCreateOpen(false)}
      >
          <form className="form-grid" onSubmit={onCreate}>
            <Field label="Full name"><input name="fullName" required /></Field>
            <Field label="Email"><input name="email" type="email" required /></Field>
            <Field label="Temporary password"><input name="password" type="password" minLength={8} required /></Field>
            <Field label="Role">
              <select
                name="role"
                required
                value={createRole}
                onChange={(e) => setCreateRole(e.target.value as Role)}
              >
                {creatableRoles.map((r) => (
                  <option key={r} value={r}>{roleLabel(r)}</option>
                ))}
              </select>
            </Field>
            {isSuper && needsApartment && (
              <Field label="Apartment">
                <select name="apartmentId" required defaultValue={apartments[0]?.id ?? ''}>
                  {apartments.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </Field>
            )}
            {!isSuper && (
              <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                Linked to your society{user?.apartmentName ? `: ${user.apartmentName}` : ''}.
              </p>
            )}
            <ErrorBanner message={error} />
            <div className="form-actions">
              <button type="button" className="button button-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
              <button type="submit" className="button button-primary" disabled={create.isPending}>
                {create.isPending ? 'Saving…' : 'Create user'}
              </button>
            </div>
          </form>
      </ResponsiveSheet>

      <ResponsiveSheet
        open={Boolean(edit)}
        title={`Edit · ${edit?.fullName ?? ''}`}
        subtitle={edit ? `${roleLabel(edit.role)} · ${edit.email}` : undefined}
        onClose={() => setEdit(null)}
      >
          {edit && (
          <form className="form-grid" onSubmit={onUpdate}>
            <Field label="Full name"><input name="fullName" required defaultValue={edit.fullName} /></Field>
            <Field label="Email"><input name="email" type="email" required defaultValue={edit.email} /></Field>
            <Field label="New password (optional)"><input name="password" type="password" minLength={8} /></Field>
            <ErrorBanner message={error} />
            <div className="form-actions">
              <button type="button" className="button button-secondary" onClick={() => setEdit(null)}>Cancel</button>
              <button type="submit" className="button button-primary" disabled={update.isPending}>
                {update.isPending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
          )}
      </ResponsiveSheet>

      <ResponsiveSheet open={Boolean(view)} title={view?.fullName ?? 'User'} subtitle={view?.email} onClose={() => setView(null)}>
        {view && (
          <div className="profile-meta-grid">
            <div><div className="eyebrow">Role</div><b>{roleLabel(view.role)}</b></div>
            <div><div className="eyebrow">Society</div><b>{view.apartmentName || 'Platform'}</b></div>
            <div><div className="eyebrow">Flat</div><b>{view.flatNumber || '—'}</b></div>
            <div><div className="eyebrow">Status</div><Status value={view.active ? 'ACTIVE' : 'INACTIVE'} /></div>
            <div><div className="eyebrow">Joined</div><b>{formatDateTime(view.createdAt)}</b></div>
          </div>
        )}
      </ResponsiveSheet>

      <ConfirmDialog
        open={Boolean(toggleUser)}
        title={toggleUser?.active ? 'Deactivate user' : 'Activate user'}
        message={toggleUser?.active
          ? `Deactivate ${toggleUser?.name}? They will lose access until reactivated.`
          : `Activate ${toggleUser?.name} and restore access?`}
        confirmLabel={toggleUser?.active ? 'Deactivate' : 'Activate'}
        danger={Boolean(toggleUser?.active)}
        busy={deactivate.isPending || activate.isPending}
        onClose={() => setToggleUser(null)}
        onConfirm={() => {
          if (!toggleUser) return
          if (toggleUser.active) deactivate.mutate(toggleUser.id)
          else activate.mutate(toggleUser.id)
        }}
      />
    </>
  )
}
