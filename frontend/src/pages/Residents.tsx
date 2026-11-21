import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ban, Eye, History, Pencil, Plus, UserMinus, UserPlus } from 'lucide-react'
import type { Resident } from '../api'
import { occupancyApi, propertyApi, residentApi } from '../services'
import { useAuth } from '../auth'
import { useSociety } from '../society'
import {
  ConfirmDialog, DataToolbar, Empty, ErrorBanner, Field, PageHeading, Pagination,
  ResponsiveSheet, Status, useToast,
} from '../components/UI'
import { apiError, formatDateTime, paginate } from '../lib/format'

export default function Residents() {
  const { can, user } = useAuth()
  const { scopeParam } = useSociety()
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [edit, setEdit] = useState<Resident | null>(null)
  const [allocateFor, setAllocateFor] = useState<Resident | null>(null)
  const [historyFor, setHistoryFor] = useState<Resident | null>(null)
  const [releaseId, setReleaseId] = useState<string | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<{ id: string; name: string } | null>(null)
  const [error, setError] = useState('')

  const { data: apartments = [] } = useQuery({
    queryKey: ['apartments'],
    queryFn: propertyApi.apartments,
    enabled: user?.role === 'SUPER_ADMIN',
  })

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['residents', scopeParam],
    queryFn: () => residentApi.list(scopeParam),
  })

  const { data: flats = [] } = useQuery({
    queryKey: ['flats', scopeParam],
    queryFn: () => propertyApi.flats(scopeParam),
    enabled: Boolean(allocateFor) && can('occupancy.manage'),
  })

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['occupancy-history', historyFor?.flatId],
    queryFn: () => occupancyApi.history(historyFor!.flatId!),
    enabled: Boolean(historyFor?.flatId),
  })

  const rows = useMemo(
    () => data.filter((r) => `${r.fullName} ${r.email} ${r.flatNumber ?? ''}`.toLowerCase().includes(q.toLowerCase())),
    [data, q],
  )
  const paged = paginate(rows, page, 8)
  const activeCount = data.filter((r) => r.active).length
  const availableFlats = flats.filter((f) => f.status === 'AVAILABLE')

  const invalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['residents'] }),
      qc.invalidateQueries({ queryKey: ['flats'] }),
      qc.invalidateQueries({ queryKey: ['occupancies'] }),
      qc.invalidateQueries({ queryKey: ['occupancy-history'] }),
      qc.invalidateQueries({ queryKey: ['dashboard'] }),
    ])
  }

  const register = useMutation({
    mutationFn: (body: object) => residentApi.register(body),
    onSuccess: async () => {
      await invalidate()
      setCreateOpen(false)
      setError('')
      toast.success('Resident registered')
    },
    onError: (err) => setError(apiError(err, 'Could not register resident')),
  })

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => residentApi.update(id, body),
    onSuccess: async () => {
      await invalidate()
      setEdit(null)
      setError('')
      toast.success('Resident updated')
    },
    onError: (err) => setError(apiError(err, 'Could not update resident')),
  })

  const deactivate = useMutation({
    mutationFn: (id: string) => residentApi.deactivate(id),
    onSuccess: async () => {
      await invalidate()
      setDeactivateTarget(null)
      toast.success('Resident deactivated')
    },
    onError: (err) => toast.error(apiError(err, 'Could not deactivate resident')),
  })

  const allocate = useMutation({
    mutationFn: ({ flatId, body }: { flatId: string; body: object }) => occupancyApi.allocate(flatId, body),
    onSuccess: async () => {
      await invalidate()
      setAllocateFor(null)
      setError('')
      toast.success('Flat allocated')
    },
    onError: (err) => setError(apiError(err, 'Could not allocate flat')),
  })

  const release = useMutation({
    mutationFn: (flatId: string) => occupancyApi.release(flatId),
    onSuccess: async () => {
      await invalidate()
      setReleaseId(null)
      toast.success('Flat released')
    },
    onError: (err) => toast.error(apiError(err, 'Could not release flat')),
  })

  function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    register.mutate({
      email: fd.get('email'),
      password: fd.get('password'),
      fullName: fd.get('fullName'),
      apartmentId: user?.role === 'SUPER_ADMIN' ? (fd.get('apartmentId') || user.apartmentId) : user?.apartmentId,
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

  function onAllocate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!allocateFor) return
    const fd = new FormData(e.currentTarget)
    const flatId = String(fd.get('flatId') || '')
    if (!flatId) { setError('Select a flat'); return }
    setError('')
    allocate.mutate({
      flatId,
      body: {
        residentUserId: allocateFor.id,
        occupancyType: fd.get('occupancyType'),
        notes: fd.get('notes') || null,
      },
    })
  }

  return (
    <>
      <PageHeading
        eyebrow="People"
        title="Residents"
        subtitle="Register residents, edit profiles, allocate flats, and keep occupancy history."
        action={can('resident.manage') ? (
          <button className="button button-primary" type="button" onClick={() => { setError(''); setCreateOpen(true) }}>
            <Plus size={17} /> Add resident
          </button>
        ) : undefined}
      />

      <div className="mini-stats">
        <div><small>Total</small><b>{data.length}</b></div>
        <div><small>Active</small><b>{activeCount}</b></div>
        <div><small>Inactive</small><b>{data.length - activeCount}</b></div>
      </div>

      {error && !createOpen && !edit && !allocateFor && <ErrorBanner message={error} />}
      {isError && <div className="form-error">Could not load residents.</div>}

      <div className="table-panel">
        <DataToolbar title="Resident directory" count={rows.length} search={q} onSearch={(v) => { setQ(v); setPage(1) }} placeholder="Search residents…" />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Flat</th><th>Status</th>
                {can('resident.manage') && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={5}>Loading residents…</td></tr> : paged.slice.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="person">
                      <div className="avatar">{r.fullName.slice(0, 2).toUpperCase()}</div>
                      <b>{r.fullName}</b>
                    </div>
                  </td>
                  <td>{r.email}</td>
                  <td>{r.flatNumber || '—'}</td>
                  <td><Status value={r.active ? 'ACTIVE' : 'INACTIVE'} /></td>
                  {can('resident.manage') && (
                    <td>
                      <div className="row-actions">
                        <button className="button button-ghost button-sm" type="button" onClick={() => navigate(`/residents/${r.id}`)}>
                          <Eye size={14} /> View
                        </button>
                        <button className="button button-secondary button-sm" type="button" onClick={() => { setError(''); setEdit(r) }}>
                          <Pencil size={14} /> Edit
                        </button>
                        {can('occupancy.manage') && r.active && !r.flatId && (
                          <button className="button button-secondary button-sm" type="button" onClick={() => { setError(''); setAllocateFor(r) }}>
                            <UserPlus size={14} /> Allocate
                          </button>
                        )}
                        {can('occupancy.manage') && r.flatId && (
                          <>
                            <button className="button button-secondary button-sm" type="button" onClick={() => setHistoryFor(r)}>
                              <History size={14} /> History
                            </button>
                            <button className="button button-danger button-sm" type="button" onClick={() => setReleaseId(r.flatId)}>
                              <UserMinus size={14} /> Release
                            </button>
                          </>
                        )}
                        {r.active && (
                          <button
                            className="button button-danger button-sm"
                            type="button"
                            disabled={deactivate.isPending || Boolean(r.flatId)}
                            title={r.flatId ? 'Release occupancy before deactivation' : 'Deactivate'}
                            onClick={() => setDeactivateTarget({ id: r.id, name: r.fullName })}
                          >
                            <Ban size={14} /> Deactivate
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && !paged.slice.length && <Empty title="No residents found" description="Register a resident to get started." />}
        </div>
        <Pagination page={page} pageSize={8} total={rows.length} onPageChange={setPage} />
      </div>

      <ResponsiveSheet open={createOpen} title="Register resident" subtitle="Creates a RESIDENT login for this society." onClose={() => setCreateOpen(false)}>
        <form className="form-grid" onSubmit={onCreate}>
          <Field label="Full name"><input name="fullName" required /></Field>
          <Field label="Email"><input name="email" type="email" required /></Field>
          <Field label="Temporary password"><input name="password" type="password" minLength={8} required /></Field>
          {user?.role === 'SUPER_ADMIN' && (
            <Field label="Apartment">
              <select name="apartmentId" required defaultValue={apartments[0]?.id ?? ''}>
                {apartments.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
          )}
          <ErrorBanner message={error} />
          <div className="form-actions">
            <button type="button" className="button button-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button type="submit" className="button button-primary" disabled={register.isPending}>
              {register.isPending ? 'Saving…' : 'Register'}
            </button>
          </div>
        </form>
      </ResponsiveSheet>

      <ResponsiveSheet open={Boolean(edit)} title={`Edit · ${edit?.fullName ?? ''}`} subtitle={edit?.email} onClose={() => setEdit(null)}>
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

      <ResponsiveSheet open={Boolean(allocateFor)} title={`Allocate flat · ${allocateFor?.fullName ?? ''}`} onClose={() => setAllocateFor(null)}>
        {allocateFor && (
          <form className="form-grid" onSubmit={onAllocate}>
            <Field label="Available flat">
              <select name="flatId" required defaultValue="">
                <option value="" disabled>Select flat</option>
                {availableFlats.map((f) => <option key={f.id} value={f.id}>{f.flatNumber}</option>)}
              </select>
            </Field>
            <Field label="Type">
              <select name="occupancyType" defaultValue="OWNER">
                <option value="OWNER">Owner</option>
                <option value="TENANT">Tenant</option>
              </select>
            </Field>
            <Field label="Notes"><input name="notes" /></Field>
            {!availableFlats.length && <ErrorBanner message="No available flats in this society." />}
            <ErrorBanner message={error} />
            <div className="form-actions">
              <button type="button" className="button button-secondary" onClick={() => setAllocateFor(null)}>Cancel</button>
              <button type="submit" className="button button-primary" disabled={allocate.isPending || !availableFlats.length}>
                {allocate.isPending ? 'Saving…' : 'Allocate'}
              </button>
            </div>
          </form>
        )}
      </ResponsiveSheet>

      <ResponsiveSheet open={Boolean(historyFor)} title={`History · ${historyFor?.flatNumber || historyFor?.fullName || ''}`} onClose={() => setHistoryFor(null)}>
        {historyLoading && <p style={{ color: 'var(--text-muted)' }}>Loading…</p>}
        <div className="table-scroll">
          <table>
            <thead><tr><th>Resident</th><th>Type</th><th>Status</th><th>Started</th><th>Ended</th></tr></thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>{h.residentName}</td>
                  <td>{h.occupancyType}</td>
                  <td><Status value={h.status} /></td>
                  <td>{formatDateTime(h.startedAt)}</td>
                  <td>{formatDateTime(h.endedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!historyLoading && !history.length && <Empty title="No history" description="No occupancy records for this flat yet." />}
        </div>
      </ResponsiveSheet>

      <ConfirmDialog
        open={Boolean(releaseId)}
        title="Release flat"
        message="Ends the active occupancy, clears the resident flat link, and marks the flat available."
        confirmLabel="Release"
        danger
        busy={release.isPending}
        onClose={() => setReleaseId(null)}
        onConfirm={() => releaseId && release.mutate(releaseId)}
      />

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        title="Deactivate resident"
        message={`Deactivate ${deactivateTarget?.name}? They will lose login access until reactivated.`}
        confirmLabel="Deactivate"
        danger
        busy={deactivate.isPending}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={() => deactivateTarget && deactivate.mutate(deactivateTarget.id)}
      />
    </>
  )
}
