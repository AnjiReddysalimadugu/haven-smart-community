import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Link2, Pencil, Plus, Unlink, Ban } from 'lucide-react'
import type { ParkingSlot } from '../api'
import { parkingApi, propertyApi } from '../services'
import { useAuth } from '../auth'
import { useSociety } from '../society'
import {
  ConfirmDialog, DataToolbar, Empty, ErrorBanner, Field, PageHeading, Pagination,
  ResponsiveSheet, Status, useToast,
} from '../components/UI'
import { apiError, formatDateTime, money, paginate } from '../lib/format'

export default function Parking() {
  const { user, can } = useAuth()
  const { scopeParam } = useSociety()
  const toast = useToast()
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'ALL' | 'AVAILABLE' | 'ALLOCATED' | 'INACTIVE'>('ALL')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [createOpen, setCreateOpen] = useState(false)
  const [view, setView] = useState<ParkingSlot | null>(null)
  const [edit, setEdit] = useState<ParkingSlot | null>(null)
  const [allocateSlot, setAllocateSlot] = useState<ParkingSlot | null>(null)
  const [releaseId, setReleaseId] = useState<string | null>(null)
  const [deactivateId, setDeactivateId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['parking', scopeParam],
    queryFn: () => parkingApi.list(scopeParam),
  })

  const { data: flats = [] } = useQuery({
    queryKey: ['flats', scopeParam],
    queryFn: () => propertyApi.flats(scopeParam),
    enabled: can('parking.allocate'),
  })

  const { data: apartments = [] } = useQuery({
    queryKey: ['apartments'],
    queryFn: propertyApi.apartments,
    enabled: can('parking.create') && isSuperAdmin,
  })

  const rows = useMemo(() => {
    let list = data
    if (filter === 'AVAILABLE') list = list.filter((p) => p.active && !p.allocated)
    if (filter === 'ALLOCATED') list = list.filter((p) => p.allocated)
    if (filter === 'INACTIVE') list = list.filter((p) => !p.active)
    if (q.trim()) {
      const t = q.toLowerCase()
      list = list.filter((p) =>
        `${p.slotCode} ${p.vehicleType} ${p.flatNumber ?? ''} ${p.vehicleNumber ?? ''}`.toLowerCase().includes(t))
    }
    return list
  }, [data, q, filter])

  const paged = paginate(rows, page, 10)
  const allocated = data.filter((p) => p.allocated).length

  const invalidate = () => qc.invalidateQueries({ queryKey: ['parking'] })

  const create = useMutation({
    mutationFn: (body: object) => parkingApi.create(body),
    onSuccess: async () => {
      await invalidate()
      setCreateOpen(false)
      toast.success('Parking slot created')
    },
    onError: (err) => setError(apiError(err, 'Could not create slot')),
  })

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => parkingApi.update(id, body),
    onSuccess: async () => {
      await invalidate()
      setEdit(null)
      toast.success('Slot updated')
    },
    onError: (err) => setError(apiError(err, 'Could not update slot')),
  })

  const allocate = useMutation({
    mutationFn: ({ id, flatId, vehicleNumber }: { id: string; flatId: string; vehicleNumber?: string }) =>
      parkingApi.allocate(id, { flatId, vehicleNumber }),
    onSuccess: async () => {
      await invalidate()
      setAllocateSlot(null)
      toast.success('Slot allocated to flat')
    },
    onError: (err) => setError(apiError(err, 'Allocation failed')),
  })

  const release = useMutation({
    mutationFn: (id: string) => parkingApi.release(id),
    onSuccess: async () => {
      await invalidate()
      setReleaseId(null)
      toast.success('Slot released')
    },
    onError: (err) => toast.error(apiError(err, 'Release failed')),
  })

  const deactivate = useMutation({
    mutationFn: (id: string) => parkingApi.deactivate(id),
    onSuccess: async () => {
      await invalidate()
      setDeactivateId(null)
      toast.success('Slot deactivated')
    },
    onError: (err) => toast.error(apiError(err, 'Deactivate failed')),
  })

  function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const slotCode = String(fd.get('slotCode') || '').trim()
    const monthlyCharge = Number(fd.get('monthlyCharge'))
    const apartmentId = isSuperAdmin
      ? String(fd.get('apartmentId') || '')
      : (user?.apartmentId || '')
    if (!apartmentId) { setError('Select a society for this slot'); return }
    if (!slotCode) { setError('Slot code is required'); return }
    if (!(monthlyCharge >= 0)) { setError('Charge cannot be negative'); return }
    setError('')
    create.mutate({
      apartmentId,
      slotCode,
      vehicleType: fd.get('vehicleType'),
      monthlyCharge,
    })
  }

  function onEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!edit) return
    const fd = new FormData(e.currentTarget)
    const slotCode = String(fd.get('slotCode') || '').trim()
    const monthlyCharge = Number(fd.get('monthlyCharge'))
    if (!slotCode) { setError('Slot code is required'); return }
    if (!(monthlyCharge >= 0)) { setError('Charge cannot be negative'); return }
    setError('')
    update.mutate({
      id: edit.id,
      body: { slotCode, vehicleType: fd.get('vehicleType'), monthlyCharge },
    })
  }

  function onAllocate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!allocateSlot) return
    const fd = new FormData(e.currentTarget)
    const flatId = String(fd.get('flatId') || '')
    if (!flatId) { setError('Select a flat'); return }
    setError('')
    allocate.mutate({
      id: allocateSlot.id,
      flatId,
      vehicleNumber: String(fd.get('vehicleNumber') || '') || undefined,
    })
  }

  return (
    <>
      <PageHeading
        eyebrow="Operations"
        title="Parking"
        subtitle="Search, create, edit, allocate and release parking slots."
        action={can('parking.create') ? (
          <button className="button button-primary" type="button" onClick={() => { setError(''); setCreateOpen(true) }}>
            <Plus size={16} /> Add slot
          </button>
        ) : undefined}
      />

      <div className="mini-stats">
        <div><small>Slots</small><b>{data.length}</b></div>
        <div><small>Allocated</small><b>{allocated}</b></div>
        <div><small>Available</small><b>{data.filter((p) => p.active && !p.allocated).length}</b></div>
        <div><small>Monthly potential</small><b>{money(data.reduce((s, p) => s + Number(p.monthlyCharge || 0), 0))}</b></div>
      </div>

      {isError && <ErrorBanner message="Could not load parking slots." />}

      <div className="table-panel">
        <DataToolbar title="Slots" count={rows.length} search={q} onSearch={(v) => { setQ(v); setPage(1) }} placeholder="Search code, flat, vehicle…">
          <div className="hub-segment" style={{ marginBottom: 0 }}>
            <button type="button" className={viewMode === 'list' ? 'active' : undefined} onClick={() => setViewMode('list')}>List</button>
            <button type="button" className={viewMode === 'grid' ? 'active' : undefined} onClick={() => setViewMode('grid')}>Grid</button>
          </div>
          <select className="select" style={{ width: 'auto' }} value={filter} onChange={(e) => { setFilter(e.target.value as typeof filter); setPage(1) }}>
            <option value="ALL">All</option>
            <option value="AVAILABLE">Available</option>
            <option value="ALLOCATED">Allocated</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </DataToolbar>
        {viewMode === 'grid' ? (
          <>
            <div className="parking-grid">
              {isLoading && <p style={{ color: 'var(--text-muted)', padding: 8 }}>Loading…</p>}
              {rows.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`parking-slot-tile ${!p.active ? 'is-blocked' : p.allocated ? 'is-occupied' : 'is-free'}`}
                  onClick={() => setView(p)}
                >
                  <b>{p.slotCode}</b>
                  <small>{p.vehicleType} · {money(p.monthlyCharge)}</small>
                  <small>{p.flatNumber || 'Open'}{p.vehicleNumber ? ` · ${p.vehicleNumber}` : ''}</small>
                  <Status value={p.allocated ? 'ALLOCATED' : (p.active ? 'AVAILABLE' : 'INACTIVE')} />
                </button>
              ))}
            </div>
            {!isLoading && !rows.length && <Empty title="No slots" description="Add a parking slot or adjust filters." />}
          </>
        ) : (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Code</th><th>Vehicle</th><th>Charge</th><th>Flat</th><th>Reg. no.</th><th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && <tr><td colSpan={7}>Loading…</td></tr>}
                  {paged.slice.map((p) => (
                    <tr key={p.id}>
                      <td><b>{p.slotCode}</b></td>
                      <td>{p.vehicleType}</td>
                      <td>{money(p.monthlyCharge)}</td>
                      <td>{p.flatNumber || '—'}</td>
                      <td>{p.vehicleNumber || '—'}</td>
                      <td>
                        <Status value={p.allocated ? 'ALLOCATED' : (p.active ? 'AVAILABLE' : 'INACTIVE')} />
                      </td>
                      <td>
                        <div className="row-actions">
                          <button type="button" className="button button-ghost button-sm" onClick={() => setView(p)}>
                            <Eye size={14} /> View
                          </button>
                          {can('parking.create') && p.active && (
                            <button type="button" className="button button-secondary button-sm" onClick={() => { setError(''); setEdit(p) }}>
                              <Pencil size={14} /> Edit
                            </button>
                          )}
                          {can('parking.allocate') && p.active && (
                            p.allocated ? (
                              <button type="button" className="button button-ghost button-sm" onClick={() => setReleaseId(p.id)}>
                                <Unlink size={14} /> Release
                              </button>
                            ) : (
                              <button type="button" className="button button-secondary button-sm" onClick={() => { setError(''); setAllocateSlot(p) }}>
                                <Link2 size={14} /> Allocate
                              </button>
                            )
                          )}
                          {can('parking.create') && p.active && !p.allocated && (
                            <button type="button" className="button button-danger button-sm" onClick={() => setDeactivateId(p.id)}>
                              <Ban size={14} /> Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!isLoading && !paged.slice.length && <Empty title="No slots" description="Add a parking slot or adjust filters." />}
            </div>
            <Pagination page={page} pageSize={10} total={rows.length} onPageChange={setPage} />
          </>
        )}
      </div>

      <ResponsiveSheet open={createOpen} title="Add parking slot" onClose={() => setCreateOpen(false)}>
        <form className="form-grid" onSubmit={onCreate}>
          {isSuperAdmin && (
            <Field label="Society">
              <select name="apartmentId" required defaultValue={apartments[0]?.id ?? ''}>
                <option value="" disabled>Select society</option>
                {apartments.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
          )}
          <Field label="Slot code"><input name="slotCode" required placeholder="P-05" minLength={1} /></Field>
          <Field label="Vehicle type">
            <select name="vehicleType" defaultValue="CAR">
              <option value="CAR">Car</option>
              <option value="BIKE">Bike</option>
              <option value="EV">EV</option>
            </select>
          </Field>
          <Field label="Monthly charge"><input name="monthlyCharge" type="number" min="0" step="0.01" defaultValue={1000} required /></Field>
          <ErrorBanner message={error} />
          <div className="form-actions">
            <button type="button" className="button button-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button type="submit" className="button button-primary" disabled={create.isPending}>{create.isPending ? 'Saving…' : 'Create'}</button>
          </div>
        </form>
      </ResponsiveSheet>

      <ResponsiveSheet open={Boolean(edit)} title={`Edit · ${edit?.slotCode ?? ''}`} onClose={() => setEdit(null)}>
        {edit && (
          <form className="form-grid" onSubmit={onEdit}>
            <Field label="Slot code"><input name="slotCode" required defaultValue={edit.slotCode} /></Field>
            <Field label="Vehicle type">
              <select name="vehicleType" defaultValue={edit.vehicleType}>
                <option value="CAR">Car</option>
                <option value="BIKE">Bike</option>
                <option value="EV">EV</option>
              </select>
            </Field>
            <Field label="Monthly charge"><input name="monthlyCharge" type="number" min="0" step="0.01" defaultValue={edit.monthlyCharge} required /></Field>
            <ErrorBanner message={error} />
            <div className="form-actions">
              <button type="button" className="button button-secondary" onClick={() => setEdit(null)}>Cancel</button>
              <button type="submit" className="button button-primary" disabled={update.isPending}>{update.isPending ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        )}
      </ResponsiveSheet>

      <ResponsiveSheet open={Boolean(view)} title={`Slot · ${view?.slotCode ?? ''}`} onClose={() => setView(null)}>
        {view && (
          <div className="profile-meta-grid">
            <div><div className="eyebrow">Type</div><b>{view.vehicleType}</b></div>
            <div><div className="eyebrow">Charge</div><b>{money(view.monthlyCharge)}</b></div>
            <div><div className="eyebrow">Flat</div><b>{view.flatNumber || 'Unassigned'}</b></div>
            <div><div className="eyebrow">Vehicle</div><b>{view.vehicleNumber || '—'}</b></div>
            <div><div className="eyebrow">Status</div><Status value={view.allocated ? 'ALLOCATED' : (view.active ? 'AVAILABLE' : 'INACTIVE')} /></div>
            <div><div className="eyebrow">Allocated</div><b>{view.allocatedAt ? formatDateTime(view.allocatedAt) : '—'}</b></div>
          </div>
        )}
      </ResponsiveSheet>

      <ResponsiveSheet open={Boolean(allocateSlot)} title={`Allocate ${allocateSlot?.slotCode ?? ''}`} onClose={() => setAllocateSlot(null)}>
        {allocateSlot && (
          <form className="form-grid" onSubmit={onAllocate}>
            <Field label="Flat">
              <select name="flatId" required defaultValue="">
                <option value="" disabled>Select flat</option>
                {flats.map((f) => <option key={f.id} value={f.id}>{f.flatNumber}</option>)}
              </select>
            </Field>
            <Field label="Vehicle number" hint="Optional registration plate">
              <input name="vehicleNumber" placeholder="KA01AB1234" />
            </Field>
            <ErrorBanner message={error} />
            <div className="form-actions">
              <button type="button" className="button button-secondary" onClick={() => setAllocateSlot(null)}>Cancel</button>
              <button type="submit" className="button button-primary" disabled={allocate.isPending}>
                {allocate.isPending ? 'Allocating…' : 'Allocate'}
              </button>
            </div>
          </form>
        )}
      </ResponsiveSheet>

      <ConfirmDialog
        open={Boolean(releaseId)}
        title="Release parking slot"
        message="This clears the flat allocation and vehicle number. The slot becomes available again."
        confirmLabel="Release"
        danger
        busy={release.isPending}
        onClose={() => setReleaseId(null)}
        onConfirm={() => releaseId && release.mutate(releaseId)}
      />

      <ConfirmDialog
        open={Boolean(deactivateId)}
        title="Deactivate parking slot"
        message="Inactive slots cannot be allocated. Release any allocation first."
        confirmLabel="Deactivate"
        danger
        busy={deactivate.isPending}
        onClose={() => setDeactivateId(null)}
        onConfirm={() => deactivateId && deactivate.mutate(deactivateId)}
      />
    </>
  )
}
