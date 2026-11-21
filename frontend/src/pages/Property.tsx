import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Building2, House, Layers3, Pencil, Plus, UserPlus, UserMinus } from 'lucide-react'
import type { Apartment, Block, Flat, Floor } from '../api'
import { occupancyApi, propertyApi, residentApi } from '../services'
import { useAuth } from '../auth'
import { ConfirmDialog, Empty, ErrorBanner, Field, PageHeading, ResponsiveSheet, Status, useToast } from '../components/UI'
import { apiError } from '../lib/format'

type CreateKind = 'apartment' | 'block' | 'floor' | 'flat' | null
type EditTarget =
  | { kind: 'apartment'; item: Apartment }
  | { kind: 'block'; item: Block }
  | { kind: 'floor'; item: Floor }
  | { kind: 'flat'; item: Flat }
  | null
type BlockTree = Block & { floors: (Floor & { flats: Flat[] })[] }

export default function Property() {
  const { can, user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const [createKind, setCreateKind] = useState<CreateKind>(null)
  const [editTarget, setEditTarget] = useState<EditTarget>(null)
  const [error, setError] = useState('')
  const [allocateFlat, setAllocateFlat] = useState<Flat | null>(null)
  const [historyFlat, setHistoryFlat] = useState<Flat | null>(null)
  const [releaseFlatId, setReleaseFlatId] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'OCCUPIED'>('ALL')

  const { data: apartments = [], isLoading: loadingApartments, isError } = useQuery({
    queryKey: ['apartments'],
    queryFn: propertyApi.apartments,
  })

  const [selectedApartmentId, setSelectedApartmentId] = useState<string | null>(null)
  const apartment = apartments.find((a) => a.id === selectedApartmentId) ?? apartments[0]

  const { data: blocks = [], isLoading: loadingBlocks } = useQuery({
    queryKey: ['blocks', apartment?.id],
    queryFn: () => propertyApi.blocks(apartment!.id),
    enabled: Boolean(apartment?.id),
  })

  const { data: residents = [] } = useQuery({
    queryKey: ['residents', apartment?.id],
    queryFn: () => residentApi.list(apartment?.id),
    enabled: Boolean(apartment?.id) && can('occupancy.manage'),
  })

  const floorQueries = useQueries({
    queries: blocks.map((block) => ({
      queryKey: ['floors', block.id],
      queryFn: () => propertyApi.floors(block.id),
      enabled: Boolean(block.id),
    })),
  })

  const floorsByBlock = blocks.map((block, i) => ({
    block,
    floors: floorQueries[i]?.data ?? [],
  }))

  const allFloors = useMemo(
    () => floorsByBlock.flatMap(({ floors }) => floors),
    [floorsByBlock],
  )

  const flatQueries = useQueries({
    queries: allFloors.map((floor) => ({
      queryKey: ['flats', floor.id],
      queryFn: () => propertyApi.flatsByFloor(floor.id),
      enabled: Boolean(floor.id),
    })),
  })

  const tree: BlockTree[] = floorsByBlock.map(({ block, floors }) => ({
    ...block,
    floors: floors.map((floor) => {
      const index = allFloors.findIndex((f) => f.id === floor.id)
      let flats = flatQueries[index]?.data ?? []
      if (statusFilter === 'AVAILABLE') flats = flats.filter((f) => f.status === 'AVAILABLE')
      if (statusFilter === 'OCCUPIED') flats = flats.filter((f) => f.status !== 'AVAILABLE')
      if (q.trim()) {
        const t = q.toLowerCase()
        flats = flats.filter((f) => f.flatNumber.toLowerCase().includes(t)
          || block.name.toLowerCase().includes(t)
          || floor.name.toLowerCase().includes(t))
      }
      return { ...floor, flats }
    }).filter((floor) => !q.trim() || floor.flats.length > 0 || floor.name.toLowerCase().includes(q.toLowerCase())),
  })).filter((block) => !q.trim() || block.floors.some((f) => f.flats.length) || block.name.toLowerCase().includes(q.toLowerCase()))

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['occupancy-history', historyFlat?.id],
    queryFn: () => occupancyApi.history(historyFlat!.id),
    enabled: Boolean(historyFlat?.id),
  })

  const invalidateProperty = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['apartments'] }),
      qc.invalidateQueries({ queryKey: ['blocks'] }),
      qc.invalidateQueries({ queryKey: ['floors'] }),
      qc.invalidateQueries({ queryKey: ['flats'] }),
      qc.invalidateQueries({ queryKey: ['residents'] }),
      qc.invalidateQueries({ queryKey: ['occupancy-history'] }),
      qc.invalidateQueries({ queryKey: ['dashboard'] }),
    ])
  }

  const createApartment = useMutation({
    mutationFn: (body: object) => propertyApi.createApartment(body),
    onSuccess: async () => { await invalidateProperty(); setCreateKind(null); setError(''); toast.success('Society created') },
    onError: (err) => setError(apiError(err, 'Could not create apartment')),
  })

  const createBlock = useMutation({
    mutationFn: (body: object) => propertyApi.createBlock(body),
    onSuccess: async () => { await invalidateProperty(); setCreateKind(null); setError(''); toast.success('Block created') },
    onError: (err) => setError(apiError(err, 'Could not create block')),
  })

  const createFloor = useMutation({
    mutationFn: (body: object) => propertyApi.createFloor(body),
    onSuccess: async () => { await invalidateProperty(); setCreateKind(null); setError(''); toast.success('Floor created') },
    onError: (err) => setError(apiError(err, 'Could not create floor')),
  })

  const createFlat = useMutation({
    mutationFn: (body: object) => propertyApi.createFlat(body),
    onSuccess: async () => { await invalidateProperty(); setCreateKind(null); setError(''); toast.success('Flat created') },
    onError: (err) => setError(apiError(err, 'Could not create flat')),
  })

  const updateApartment = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => propertyApi.updateApartment(id, body),
    onSuccess: async () => { await invalidateProperty(); setEditTarget(null); setError(''); toast.success('Society updated') },
    onError: (err) => setError(apiError(err, 'Could not update society')),
  })
  const updateBlock = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => propertyApi.updateBlock(id, body),
    onSuccess: async () => { await invalidateProperty(); setEditTarget(null); setError(''); toast.success('Block updated') },
    onError: (err) => setError(apiError(err, 'Could not update block')),
  })
  const updateFloor = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => propertyApi.updateFloor(id, body),
    onSuccess: async () => { await invalidateProperty(); setEditTarget(null); setError(''); toast.success('Floor updated') },
    onError: (err) => setError(apiError(err, 'Could not update floor')),
  })
  const updateFlat = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => propertyApi.updateFlat(id, body),
    onSuccess: async () => { await invalidateProperty(); setEditTarget(null); setError(''); toast.success('Flat updated') },
    onError: (err) => setError(apiError(err, 'Could not update flat')),
  })

  const allocate = useMutation({
    mutationFn: ({ flatId, body }: { flatId: string; body: object }) =>
      occupancyApi.allocate(flatId, body),
    onSuccess: async () => {
      await invalidateProperty()
      setAllocateFlat(null)
      setError('')
      toast.success('Occupancy allocated')
    },
    onError: (err) => setError(apiError(err, 'Could not allocate occupancy')),
  })

  const release = useMutation({
    mutationFn: (flatId: string) => occupancyApi.release(flatId),
    onSuccess: async () => {
      await invalidateProperty()
      setReleaseFlatId(null)
      setError('')
      toast.success('Occupancy released')
    },
    onError: (err) => toast.error(apiError(err, 'Could not release occupancy')),
  })

  function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (createKind === 'apartment') {
      createApartment.mutate({
        name: fd.get('name'),
        address: fd.get('address'),
        timezone: fd.get('timezone') || 'Asia/Kolkata',
      })
      return
    }
    if (createKind === 'block') {
      createBlock.mutate({
        apartmentId: apartment?.id || fd.get('apartmentId'),
        name: fd.get('name'),
        code: fd.get('code'),
      })
      return
    }
    if (createKind === 'floor') {
      createFloor.mutate({
        blockId: fd.get('blockId'),
        floorNumber: Number(fd.get('floorNumber')),
        name: fd.get('name'),
      })
      return
    }
    if (createKind === 'flat') {
      createFlat.mutate({
        floorId: fd.get('floorId'),
        flatNumber: fd.get('flatNumber'),
        areaSqft: Number(fd.get('areaSqft') || 0),
        bedroomCount: Number(fd.get('bedroomCount') || 0),
      })
    }
  }

  function onAllocate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!allocateFlat) return
    const fd = new FormData(e.currentTarget)
    allocate.mutate({
      flatId: allocateFlat.id,
      body: {
        residentUserId: fd.get('residentUserId'),
        occupancyType: fd.get('occupancyType'),
        notes: fd.get('notes') || null,
      },
    })
  }

  function onEdit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editTarget) return
    const fd = new FormData(e.currentTarget)
    if (editTarget.kind === 'apartment') {
      updateApartment.mutate({
        id: editTarget.item.id,
        body: { name: fd.get('name'), address: fd.get('address'), timezone: fd.get('timezone') || 'Asia/Kolkata' },
      })
      return
    }
    if (editTarget.kind === 'block') {
      updateBlock.mutate({ id: editTarget.item.id, body: { name: fd.get('name'), code: fd.get('code') } })
      return
    }
    if (editTarget.kind === 'floor') {
      updateFloor.mutate({
        id: editTarget.item.id,
        body: { floorNumber: Number(fd.get('floorNumber')), name: fd.get('name') },
      })
      return
    }
    updateFlat.mutate({
      id: editTarget.item.id,
      body: {
        flatNumber: fd.get('flatNumber'),
        areaSqft: fd.get('areaSqft') ? Number(fd.get('areaSqft')) : null,
        bedroomCount: fd.get('bedroomCount') ? Number(fd.get('bedroomCount')) : null,
      },
    })
  }

  const loading = loadingApartments || loadingBlocks || floorQueries.some((q) => q.isLoading) || flatQueries.some((q) => q.isLoading)
  const totalHomes = tree.reduce((sum, b) => sum + b.floors.reduce((s, f) => s + f.flats.length, 0), 0)
  const saving = createApartment.isPending || createBlock.isPending || createFloor.isPending || createFlat.isPending
    || updateApartment.isPending || updateBlock.isPending || updateFloor.isPending || updateFlat.isPending
  const unassignedResidents = residents.filter((r) => r.active && !r.flatId)
  const canEdit = can('property.create') || can('apartment.create')

  return (
    <>
      <PageHeading
        eyebrow="Property"
        title="Property & flats"
        subtitle={user?.role === 'RESIDENT'
          ? 'Your home and neighbouring flats in the community.'
          : 'Build the society hierarchy and allocate residents with occupancy history.'}
        action={(can('property.create') || can('apartment.create')) ? (
          <div className="heading-action">
            {can('apartment.create') && (
              <button className="button button-primary" type="button" onClick={() => { setError(''); setCreateKind('apartment') }}>
                <Plus size={17} /> Add society
              </button>
            )}
            {can('property.create') && apartment && (
              <>
                <button className="button button-secondary" type="button" onClick={() => { setError(''); setCreateKind('block') }}>
                  <Plus size={16} /> Block
                </button>
                <button className="button button-secondary" type="button" onClick={() => { setError(''); setCreateKind('floor') }}>
                  <Plus size={16} /> Floor
                </button>
                <button className="button button-primary" type="button" onClick={() => { setError(''); setCreateKind('flat') }}>
                  <Plus size={17} /> Flat
                </button>
              </>
            )}
          </div>
        ) : undefined}
      />

      {error && !createKind && !editTarget && !allocateFlat && <ErrorBanner message={error} />}
      {isError && <ErrorBanner message="Could not load property directory." />}

      <div className="panel" style={{ marginBottom: 16, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        {apartments.length > 1 && (
          <Field label="Society">
            <select value={apartment?.id ?? ''} onChange={(e) => setSelectedApartmentId(e.target.value)}>
              {apartments.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="Search flats / blocks">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" />
        </Field>
        <Field label="Occupancy filter">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
            <option value="ALL">All flats</option>
            <option value="AVAILABLE">Available</option>
            <option value="OCCUPIED">Occupied</option>
          </select>
        </Field>
      </div>

      {!loading && !apartment && (
        <div className="panel placeholder-panel">
          <Empty title="No society linked" description={can('apartment.create')
            ? 'Create a society apartment to start building blocks, floors and flats.'
            : 'Ask a platform super admin to create and assign a society.'} />
        </div>
      )}

      {apartment && (
        <>
          <div className="property-summary">
            <div>
              <Building2 />
              <span>
                <b>{apartment.name}</b>
                <small>{tree.length} blocks · {totalHomes} homes · {apartment.address}</small>
              </span>
            </div>
            <div className="property-legend" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <span><i className="key-occupied" /> Occupied</span>
              <span><i className="key-available" /> Available</span>
              <button className="button button-ghost button-sm" type="button" onClick={() => navigate(`/property/${apartment.id}`)}>
                View details
              </button>
              {canEdit && (
                <button className="button button-secondary button-sm" type="button" onClick={() => { setError(''); setEditTarget({ kind: 'apartment', item: apartment }) }}>
                  <Pencil size={14} /> Edit society
                </button>
              )}
            </div>
          </div>

          {loading && <div className="panel"><div className="empty">Loading property tree…</div></div>}

          {!loading && tree.map((block) => (
            <section className="block-section" key={block.id}>
              <div className="block-title">
                <div className="block-icon"><Building2 /></div>
                <div>
                  <h2>{block.name}</h2>
                  <p>Code {block.code}</p>
                </div>
                <span className="block-count">{block.floors.reduce((a, f) => a + f.flats.length, 0)} homes</span>
                {canEdit && (
                  <button className="button button-ghost button-sm" type="button" onClick={() => { setError(''); setEditTarget({ kind: 'block', item: block }) }}>
                    <Pencil size={14} /> Edit
                  </button>
                )}
              </div>
              {block.floors.map((floor) => (
                <div className="floor-row" key={floor.id}>
                  <div className="floor-heading">
                    <Layers3 size={16} />
                    <b>{floor.name}</b>
                    <small>{floor.flats.length} homes</small>
                    {canEdit && (
                      <button className="button button-ghost button-sm" type="button" onClick={() => { setError(''); setEditTarget({ kind: 'floor', item: floor }) }}>
                        <Pencil size={14} /> Edit
                      </button>
                    )}
                  </div>
                  <div className="flat-grid">
                    {floor.flats.map((flat) => (
                      <div className={`flat-card ${flat.status === 'AVAILABLE' ? 'flat-free' : ''}`} key={flat.id}>
                        <div className="flat-card-top">
                          <Link to={`/property/flats/${flat.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <House size={17} /><b>{flat.flatNumber}</b>
                          </Link>
                          <Status value={flat.status} />
                        </div>
                        <small>{flat.status === 'AVAILABLE' ? 'Ready to occupy' : 'Resident assigned'}</small>
                        <div className="heading-action" style={{ marginTop: 8, flexWrap: 'wrap' }}>
                          {canEdit && (
                            <button className="button button-ghost button-sm" type="button" onClick={() => { setError(''); setEditTarget({ kind: 'flat', item: flat }) }}>
                              <Pencil size={14} /> Edit
                            </button>
                          )}
                          {can('occupancy.manage') && (
                            <>
                              {flat.status === 'AVAILABLE' ? (
                                <button className="button button-secondary button-sm" type="button" onClick={() => { setError(''); setAllocateFlat(flat) }}>
                                  <UserPlus size={14} /> Allocate
                                </button>
                              ) : (
                                <button
                                  className="button button-secondary button-sm"
                                  type="button"
                                  disabled={release.isPending}
                                  onClick={() => setReleaseFlatId(flat.id)}
                                >
                                  <UserMinus size={14} /> Release
                                </button>
                              )}
                              <button className="button button-secondary button-sm" type="button" onClick={() => setHistoryFlat(flat)}>
                                History
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {!floor.flats.length && <div className="empty"><p>No flats on this floor.</p></div>}
                  </div>
                </div>
              ))}
              {!block.floors.length && <div className="floor-row"><Empty title="No floors yet" description="Add a floor to this block." /></div>}
            </section>
          ))}

          {!loading && !tree.length && (
            <div className="panel placeholder-panel">
              <Empty title="No blocks yet" description="Add Block A / B to start organizing homes." />
            </div>
          )}
        </>
      )}

      <ResponsiveSheet
        open={Boolean(createKind)}
        title={
          createKind === 'apartment' ? 'Add society'
            : createKind === 'block' ? 'Add block'
              : createKind === 'floor' ? 'Add floor' : 'Add flat'
        }
        subtitle={apartment?.name ?? 'Property setup'}
        onClose={() => setCreateKind(null)}
      >
          <form className="form-grid" onSubmit={onCreate}>
            {createKind === 'apartment' && (
              <>
                <Field label="Society name"><input name="name" required placeholder="Green Valley Residency" /></Field>
                <Field label="Address"><input name="address" required placeholder="12 Palm Avenue, Bengaluru" /></Field>
                <Field label="Timezone"><input name="timezone" defaultValue="Asia/Kolkata" /></Field>
              </>
            )}
            {createKind === 'block' && (
              <>
                <Field label="Block name"><input name="name" required placeholder="Block B" /></Field>
                <Field label="Code"><input name="code" required maxLength={20} placeholder="B" /></Field>
              </>
            )}
            {createKind === 'floor' && (
              <>
                <Field label="Block">
                  <select name="blockId" required defaultValue="">
                    <option value="" disabled>Select block</option>
                    {blocks.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
                  </select>
                </Field>
                <Field label="Floor number"><input name="floorNumber" type="number" required defaultValue={2} /></Field>
                <Field label="Floor name"><input name="name" required placeholder="Second floor" /></Field>
              </>
            )}
            {createKind === 'flat' && (
              <>
                <Field label="Floor">
                  <select name="floorId" required defaultValue="">
                    <option value="" disabled>Select floor</option>
                    {floorsByBlock.flatMap(({ block, floors }) =>
                      floors.map((f) => (
                        <option key={f.id} value={f.id}>{block.code} · {f.name}</option>
                      )),
                    )}
                  </select>
                </Field>
                <Field label="Flat number"><input name="flatNumber" required placeholder="A-301" /></Field>
                <Field label="Area (sqft)"><input name="areaSqft" type="number" min="0" step="0.01" defaultValue={1100} /></Field>
                <Field label="Bedrooms"><input name="bedroomCount" type="number" min="0" max="20" defaultValue={2} /></Field>
              </>
            )}
            <ErrorBanner message={error} />
            <div className="form-actions">
              <button type="button" className="button button-secondary" onClick={() => setCreateKind(null)}>Cancel</button>
              <button type="submit" className="button button-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
      </ResponsiveSheet>

      <ResponsiveSheet
        open={Boolean(editTarget)}
        title={
          editTarget?.kind === 'apartment' ? 'Edit society'
            : editTarget?.kind === 'block' ? 'Edit block'
              : editTarget?.kind === 'floor' ? 'Edit floor' : 'Edit flat'
        }
        onClose={() => setEditTarget(null)}
      >
          {editTarget && (
          <form className="form-grid" onSubmit={onEdit}>
            {editTarget.kind === 'apartment' && (
              <>
                <Field label="Society name"><input name="name" required defaultValue={editTarget.item.name} /></Field>
                <Field label="Address"><input name="address" required defaultValue={editTarget.item.address} /></Field>
                <Field label="Timezone"><input name="timezone" defaultValue={editTarget.item.timezone || 'Asia/Kolkata'} /></Field>
              </>
            )}
            {editTarget.kind === 'block' && (
              <>
                <Field label="Block name"><input name="name" required defaultValue={editTarget.item.name} /></Field>
                <Field label="Code"><input name="code" required maxLength={20} defaultValue={editTarget.item.code} /></Field>
              </>
            )}
            {editTarget.kind === 'floor' && (
              <>
                <Field label="Floor number"><input name="floorNumber" type="number" required defaultValue={editTarget.item.floorNumber} /></Field>
                <Field label="Floor name"><input name="name" required defaultValue={editTarget.item.name} /></Field>
              </>
            )}
            {editTarget.kind === 'flat' && (
              <>
                <Field label="Flat number"><input name="flatNumber" required defaultValue={editTarget.item.flatNumber} /></Field>
                <Field label="Area (sqft)"><input name="areaSqft" type="number" min="0" step="0.01" defaultValue={editTarget.item.areaSqft ?? ''} /></Field>
                <Field label="Bedrooms"><input name="bedroomCount" type="number" min="0" max="20" defaultValue={editTarget.item.bedroomCount ?? ''} /></Field>
              </>
            )}
            <ErrorBanner message={error} />
            <div className="form-actions">
              <button type="button" className="button button-secondary" onClick={() => setEditTarget(null)}>Cancel</button>
              <button type="submit" className="button button-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
          )}
      </ResponsiveSheet>

      <ResponsiveSheet
        open={Boolean(allocateFlat)}
        title={`Allocate · ${allocateFlat?.flatNumber ?? ''}`}
        subtitle="One active assignment per flat and resident."
        onClose={() => setAllocateFlat(null)}
      >
          <form className="form-grid" onSubmit={onAllocate}>
            <Field label="Resident">
              <select name="residentUserId" required defaultValue="">
                <option value="" disabled>Select unassigned resident</option>
                {unassignedResidents.map((r) => (
                  <option key={r.id} value={r.id}>{r.fullName} ({r.email})</option>
                ))}
              </select>
            </Field>
            <Field label="Occupancy type">
              <select name="occupancyType" defaultValue="OWNER">
                <option value="OWNER">Owner</option>
                <option value="TENANT">Tenant</option>
              </select>
            </Field>
            <Field label="Notes"><input name="notes" placeholder="Optional" /></Field>
            {!unassignedResidents.length && (
              <div className="form-error">No unassigned active residents. Register a resident first.</div>
            )}
            <ErrorBanner message={error} />
            <div className="form-actions">
              <button type="button" className="button button-secondary" onClick={() => setAllocateFlat(null)}>Cancel</button>
              <button type="submit" className="button button-primary" disabled={allocate.isPending || !unassignedResidents.length}>
                {allocate.isPending ? 'Saving…' : 'Allocate'}
              </button>
            </div>
          </form>
      </ResponsiveSheet>

      <ResponsiveSheet
        open={Boolean(historyFlat)}
        title={`Occupancy history · ${historyFlat?.flatNumber ?? ''}`}
        subtitle="Active and ended assignments"
        onClose={() => setHistoryFlat(null)}
        wide
      >
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th>RESIDENT</th><th>TYPE</th><th>STATUS</th><th>STARTED</th><th>ENDED</th></tr>
              </thead>
              <tbody>
                {historyLoading ? (
                  <tr><td colSpan={5}>Loading…</td></tr>
                ) : history.map((h) => (
                  <tr key={h.id}>
                    <td>{h.residentName || h.residentEmail}</td>
                    <td>{h.occupancyType}</td>
                    <td><Status value={h.status} /></td>
                    <td>{new Date(h.startedAt).toLocaleString()}</td>
                    <td>{h.endedAt ? new Date(h.endedAt).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!historyLoading && !history.length && <Empty title="No history" description="No occupancy records for this flat yet." />}
          </div>
      </ResponsiveSheet>

      <ConfirmDialog
        open={Boolean(releaseFlatId)}
        title="Release occupancy"
        message="Ends the active assignment, clears the resident flat link, and marks the flat available."
        confirmLabel="Release"
        danger
        busy={release.isPending}
        onClose={() => setReleaseFlatId(null)}
        onConfirm={() => releaseFlatId && release.mutate(releaseFlatId)}
      />
    </>
  )
}
