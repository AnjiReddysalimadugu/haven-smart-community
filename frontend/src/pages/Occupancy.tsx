import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { occupancyApi, propertyApi, residentApi } from '../services'
import { useAuth } from '../auth'
import { useSociety } from '../society'
import {
  ConfirmDialog, DataToolbar, Empty, ErrorBanner, Field, PageHeading,
  Pagination, ResponsiveSheet, Status, useToast,
} from '../components/UI'
import { apiError, formatDateTime, paginate } from '../lib/format'

export default function Occupancy() {
  const { can } = useAuth()
  const { scopeParam, apartmentId } = useSociety()
  const toast = useToast()
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'ENDED'>('ACTIVE')
  const [page, setPage] = useState(1)
  const [allocateOpen, setAllocateOpen] = useState(false)
  const [releaseId, setReleaseId] = useState<string | null>(null)
  const [historyFlatId, setHistoryFlatId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const occupancyScope = scopeParam ?? apartmentId

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['occupancies', occupancyScope],
    queryFn: () => occupancyApi.list(occupancyScope),
  })

  const { data: flats = [] } = useQuery({
    queryKey: ['flats', scopeParam],
    queryFn: () => propertyApi.flats(scopeParam),
    enabled: can('occupancy.manage'),
  })

  const { data: residents = [] } = useQuery({
    queryKey: ['residents', scopeParam],
    queryFn: () => residentApi.list(scopeParam),
    enabled: can('occupancy.manage'),
  })

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['occupancy-history', historyFlatId],
    queryFn: () => occupancyApi.history(historyFlatId!),
    enabled: Boolean(historyFlatId),
  })

  const filtered = useMemo(() => {
    let rows = data
    if (status !== 'ALL') rows = rows.filter((o) => o.status === status)
    if (q.trim()) {
      const t = q.toLowerCase()
      rows = rows.filter((o) =>
        `${o.flatNumber} ${o.residentName} ${o.residentEmail} ${o.occupancyType}`.toLowerCase().includes(t))
    }
    return rows
  }, [data, status, q])

  const paged = paginate(filtered, page, 10)
  const availableFlats = flats.filter((f) => f.status === 'AVAILABLE')
  const unassigned = residents.filter((r) => r.active && !r.flatId)

  const allocate = useMutation({
    mutationFn: (body: { flatId: string; residentUserId: string; occupancyType: string; notes?: string }) =>
      occupancyApi.allocate(body.flatId, {
        residentUserId: body.residentUserId,
        occupancyType: body.occupancyType,
        notes: body.notes || null,
      }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['occupancies'] }),
        qc.invalidateQueries({ queryKey: ['flats'] }),
        qc.invalidateQueries({ queryKey: ['residents'] }),
      ])
      setAllocateOpen(false)
      toast.success('Occupancy allocated')
    },
    onError: (err) => setError(apiError(err, 'Allocation failed')),
  })

  const release = useMutation({
    mutationFn: (flatId: string) => occupancyApi.release(flatId),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['occupancies'] }),
        qc.invalidateQueries({ queryKey: ['flats'] }),
        qc.invalidateQueries({ queryKey: ['residents'] }),
        qc.invalidateQueries({ queryKey: ['parking'] }),
      ])
      setReleaseId(null)
      toast.success('Occupancy released')
    },
    onError: (err) => { toast.error(apiError(err, 'Release failed')); setReleaseId(null) },
  })

  function onAllocate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError('')
    allocate.mutate({
      flatId: String(fd.get('flatId')),
      residentUserId: String(fd.get('residentUserId')),
      occupancyType: String(fd.get('occupancyType')),
      notes: String(fd.get('notes') || ''),
    })
  }

  return (
    <>
      <PageHeading
        eyebrow="Property"
        title="Flat occupancy"
        subtitle="Active and historical resident assignments — one live assignment per flat and resident."
        action={can('occupancy.manage') ? (
          <button className="button button-primary" type="button" onClick={() => { setError(''); setAllocateOpen(true) }}>
            Allocate flat
          </button>
        ) : undefined}
      />

      {isError && <ErrorBanner message="Could not load occupancy records." />}

      <div className="table-panel">
        <DataToolbar title="Assignments" count={filtered.length} search={q} onSearch={(v) => { setQ(v); setPage(1) }}>
          <select className="select" style={{ width: 'auto' }} value={status} onChange={(e) => { setStatus(e.target.value as any); setPage(1) }}>
            <option value="ALL">All</option>
            <option value="ACTIVE">Active</option>
            <option value="ENDED">Ended</option>
          </select>
        </DataToolbar>
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Flat</th><th>Resident</th><th>Type</th><th>Status</th><th>Started</th><th>Ended</th>{(can('occupancy.manage') || can('occupancy.release')) && <th>Action</th>}</tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={7}>Loading…</td></tr>}
              {paged.slice.map((o) => (
                <tr key={o.id}>
                  <td><b>{o.flatNumber}</b></td>
                  <td>
                    <div className="person">
                      <div>
                        <b>{o.residentName || '—'}</b>
                        <span>{o.residentEmail}</span>
                      </div>
                    </div>
                  </td>
                  <td>{o.occupancyType}</td>
                  <td><Status value={o.status} /></td>
                  <td>{formatDateTime(o.startedAt)}</td>
                  <td>{formatDateTime(o.endedAt)}</td>
                  {(can('occupancy.manage') || can('occupancy.release')) && (
                    <td>
                      <div className="row-actions">
                        {can('occupancy.manage') ? (
                          <button className="button button-ghost button-sm" type="button" onClick={() => setHistoryFlatId(o.flatId)}>
                            History
                          </button>
                        ) : null}
                        {o.status === 'ACTIVE' && can('occupancy.release') ? (
                          <button className="button button-danger button-sm" type="button" onClick={() => setReleaseId(o.flatId)}>
                            Release
                          </button>
                        ) : null}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && !paged.slice.length && <Empty title="No occupancy rows" description="Allocate a resident to an available flat." />}
        </div>
        <Pagination page={page} pageSize={10} total={filtered.length} onPageChange={setPage} />
      </div>

      <ResponsiveSheet
        open={allocateOpen}
        title="Allocate occupancy"
        subtitle="Creates an ACTIVE assignment and updates flat status."
        onClose={() => setAllocateOpen(false)}
      >
        <form className="form-grid" onSubmit={onAllocate}>
          <Field label="Available flat">
            <select name="flatId" required defaultValue="">
              <option value="" disabled>Select flat</option>
              {availableFlats.map((f) => <option key={f.id} value={f.id}>{f.flatNumber}</option>)}
            </select>
          </Field>
          <Field label="Unassigned resident">
            <select name="residentUserId" required defaultValue="">
              <option value="" disabled>Select resident</option>
              {unassigned.map((r) => <option key={r.id} value={r.id}>{r.fullName} ({r.email})</option>)}
            </select>
          </Field>
          <Field label="Type">
            <select name="occupancyType" defaultValue="OWNER">
              <option value="OWNER">Owner</option>
              <option value="TENANT">Tenant</option>
            </select>
          </Field>
          <Field label="Notes"><input name="notes" /></Field>
          <ErrorBanner message={error} />
          <div className="form-actions">
            <button type="button" className="button button-secondary" onClick={() => setAllocateOpen(false)}>Cancel</button>
            <button type="submit" className="button button-primary" disabled={allocate.isPending || !availableFlats.length || !unassigned.length}>
              {allocate.isPending ? 'Saving…' : 'Allocate'}
            </button>
          </div>
        </form>
      </ResponsiveSheet>

      <ResponsiveSheet
        open={Boolean(historyFlatId)}
        title={`History · ${data.find((o) => o.flatId === historyFlatId)?.flatNumber || 'Flat'}`}
        onClose={() => setHistoryFlatId(null)}
      >
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
          {!historyLoading && !history.length && <Empty title="No history" description="No occupancy records for this flat." />}
        </div>
      </ResponsiveSheet>

      <ConfirmDialog
        open={Boolean(releaseId)}
        title="Release occupancy"
        message="This ends the active assignment, clears the resident flat link, and marks the flat available."
        confirmLabel="Release"
        danger
        busy={release.isPending}
        onClose={() => setReleaseId(null)}
        onConfirm={() => releaseId && release.mutate(releaseId)}
      />
    </>
  )
}
