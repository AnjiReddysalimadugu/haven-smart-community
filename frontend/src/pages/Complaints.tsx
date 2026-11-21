import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import type { Complaint } from '../api'
import { complaintApi, propertyApi, uploadApi, userApi } from '../services'
import { useAuth } from '../auth'
import { useSociety } from '../society'
import {
  DataToolbar, Empty, ErrorBanner, Field, PageHeading, Pagination, ResponsiveSheet, Status, useToast,
} from '../components/UI'
import { apiError, formatDateTime, paginate } from '../lib/format'

const STATUSES = ['RAISED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'REOPENED'] as const

export default function Complaints() {
  const { user, can } = useAuth()
  const { scopeParam, apartmentId } = useSociety()
  const toast = useToast()
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [detail, setDetail] = useState<Complaint | null>(null)
  const [error, setError] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const needsFlatPicker = user?.role !== 'RESIDENT'
  const residentMissingFlat = user?.role === 'RESIDENT' && !user.flatId

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['complaints', scopeParam],
    queryFn: () => complaintApi.list(scopeParam),
  })

  const { data: flats = [] } = useQuery({
    queryKey: ['flats', scopeParam],
    queryFn: () => propertyApi.flats(scopeParam),
    enabled: can('complaint.create') && needsFlatPicker,
  })

  const { data: staff = [] } = useQuery({
    queryKey: ['users', apartmentId, 'ops'],
    queryFn: () => userApi.list({ apartmentId }),
    enabled: Boolean(detail) && can('complaint.status'),
  })

  const rows = useMemo(() => {
    let list = data
    if (statusFilter !== 'ALL') list = list.filter((c) => c.status === statusFilter)
    if (q.trim()) {
      const t = q.toLowerCase()
      list = list.filter((c) => `${c.title} ${c.flatNumber} ${c.category}`.toLowerCase().includes(t))
    }
    return list
  }, [data, q, statusFilter])

  const paged = paginate(rows, page, 8)
  const liveDetail = detail ? (data.find((c) => c.id === detail.id) ?? detail) : null

  const create = useMutation({
    mutationFn: (body: object) => complaintApi.create(body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['complaints'] })
      setCreateOpen(false)
      toast.success('Complaint raised')
    },
    onError: (err) => setError(apiError(err, 'Could not raise complaint')),
  })

  const updateStatus = useMutation({
    mutationFn: (body: {
      id: string
      status: string
      assigneeUserId?: string | null
      resolutionNotes?: string | null
      evidenceUrl?: string | null
    }) =>
      complaintApi.updateStatus(body.id, {
        status: body.status,
        assigneeUserId: body.assigneeUserId,
        resolutionNotes: body.resolutionNotes,
        evidenceUrl: body.evidenceUrl,
      }),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['complaints'] })
      setDetail(res)
      setEvidenceUrl(res.evidenceUrl || '')
      toast.success('Ticket updated')
    },
    onError: (err) => toast.error(apiError(err, 'Update failed')),
  })

  const addComment = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => complaintApi.addComment(id, body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['complaints'] })
      toast.success('Comment added')
    },
    onError: (err) => toast.error(apiError(err, 'Comment failed')),
  })

  function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (residentMissingFlat) {
      setError('Your account is not linked to a flat yet. Ask your society admin.')
      return
    }
    const fd = new FormData(e.currentTarget)
    const title = String(fd.get('title') || '').trim()
    const description = String(fd.get('description') || '').trim()
    if (title.length < 3 || description.length < 5) {
      setError('Provide a clear title and description')
      return
    }
    const flatId = user?.role === 'RESIDENT' ? user.flatId : String(fd.get('flatId') || '')
    if (!flatId) { setError('Select a flat'); return }
    setError('')
    create.mutate({
      flatId,
      title,
      category: fd.get('category'),
      description,
    })
  }

  const assignees = staff.filter((u) => ['STAFF', 'APARTMENT_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(u.role) && u.active)

  return (
    <>
      <PageHeading
        eyebrow="Operations"
        title="Complaints"
        subtitle="Service requests with live status updates from your society APIs."
        action={can('complaint.create') ? (
          <button
            className="button button-primary"
            type="button"
            disabled={residentMissingFlat}
            title={residentMissingFlat ? 'Flat assignment required' : undefined}
            onClick={() => { setError(''); setCreateOpen(true) }}
          >
            <Plus size={16} /> Raise complaint
          </button>
        ) : undefined}
      />

      {residentMissingFlat && (
        <ErrorBanner message="Your account is not linked to a flat. Service requests unlock after occupancy assignment." />
      )}

      {isError && <ErrorBanner message="Could not load complaints." />}

      <div className="table-panel">
        <DataToolbar title="Tickets" count={rows.length} search={q} onSearch={(v) => { setQ(v); setPage(1) }}>
          <select className="select" style={{ width: 'auto' }} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}>
            <option value="ALL">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </DataToolbar>
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Title</th><th>Flat</th><th>Assignee</th><th>Created</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={6}>Loading…</td></tr>}
              {paged.slice.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.title}</b><div style={{ color: 'var(--text-muted)', fontSize: 12, maxWidth: 320 }}>{c.description}</div></td>
                  <td>{c.flatNumber}</td>
                  <td>{c.assigneeName || '—'}</td>
                  <td>{formatDateTime(c.createdAt)}</td>
                  <td><Status value={c.status} /></td>
                  <td>
                    <button type="button" className="button button-ghost button-sm" onClick={() => { setDetail(c); setEvidenceUrl(c.evidenceUrl || '') }}>Open</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && !paged.slice.length && <Empty title="No complaints" description="Raise a ticket to get started." />}
        </div>
        <Pagination page={page} pageSize={8} total={rows.length} onPageChange={setPage} />
      </div>

      <ResponsiveSheet open={createOpen} title="Raise complaint" onClose={() => setCreateOpen(false)}>
        <form className="form-grid" onSubmit={onCreate}>
          {needsFlatPicker && (
            <Field label="Flat">
              <select name="flatId" required defaultValue="">
                <option value="" disabled>Select flat</option>
                {flats.map((f) => <option key={f.id} value={f.id}>{f.flatNumber}</option>)}
              </select>
            </Field>
          )}
          <Field label="Title"><input name="title" required minLength={3} /></Field>
          <Field label="Category">
            <select name="category" defaultValue="PLUMBING">
              <option value="PLUMBING">Plumbing</option>
              <option value="ELECTRICAL">Electrical</option>
              <option value="HOUSEKEEPING">Housekeeping</option>
              <option value="SECURITY">Security</option>
              <option value="OTHER">Other</option>
            </select>
          </Field>
          <Field label="Description"><textarea name="description" required minLength={5} rows={4} /></Field>
          <ErrorBanner message={error} />
          <div className="form-actions">
            <button type="button" className="button button-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button type="submit" className="button button-primary" disabled={create.isPending}>{create.isPending ? 'Saving…' : 'Submit'}</button>
          </div>
        </form>
      </ResponsiveSheet>

      <ResponsiveSheet
        open={Boolean(liveDetail)}
        title={liveDetail?.title ?? 'Complaint'}
        subtitle={liveDetail ? `${liveDetail.flatNumber} · ${liveDetail.category}` : undefined}
        onClose={() => { setDetail(null); setEvidenceUrl('') }}
      >
        {liveDetail && (
          <div className="form-grid">
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13.5 }}>{liveDetail.description}</p>
            <div><Status value={liveDetail.status} /> {liveDetail.assigneeName ? `· ${liveDetail.assigneeName}` : ''}</div>

            {can('complaint.status') && (
              <form className="form-grid" onSubmit={(e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                updateStatus.mutate({
                  id: liveDetail.id,
                  status: String(fd.get('status')),
                  assigneeUserId: String(fd.get('assigneeUserId') || '') || null,
                  resolutionNotes: String(fd.get('resolutionNotes') || '') || null,
                  evidenceUrl: (evidenceUrl || String(fd.get('evidenceUrl') || '') || null),
                })
              }}>
                <Field label="Status">
                  <select name="status" defaultValue={liveDetail.status}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Assignee">
                  <select name="assigneeUserId" defaultValue={liveDetail.assigneeUserId ?? ''}>
                    <option value="">Unassigned</option>
                    {assignees.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                  </select>
                </Field>
                <Field label="Resolution notes">
                  <textarea name="resolutionNotes" rows={3} defaultValue={liveDetail.resolutionNotes ?? ''} />
                </Field>
                <Field label="Evidence photo" hint="JPEG / PNG / WebP / GIF · max 5 MB">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={async (ev) => {
                      const file = ev.target.files?.[0]
                      if (!file) return
                      setUploading(true)
                      try {
                        const res = await uploadApi.image(file)
                        setEvidenceUrl(res.url)
                        toast.success('Photo uploaded')
                      } catch (err) {
                        toast.error(apiError(err, 'Upload failed'))
                      } finally {
                        setUploading(false)
                      }
                    }}
                  />
                </Field>
                <Field label="Evidence URL" hint="Filled by upload, or paste an external link">
                  <input
                    name="evidenceUrl"
                    type="url"
                    placeholder="https://… or /api/v1/uploads/…"
                    value={evidenceUrl}
                    onChange={(e) => setEvidenceUrl(e.target.value)}
                  />
                </Field>
                {(evidenceUrl || liveDetail.evidenceUrl) && (
                  <a href={evidenceUrl || liveDetail.evidenceUrl || '#'} target="_blank" rel="noreferrer">
                    <img
                      src={evidenceUrl || liveDetail.evidenceUrl || ''}
                      alt="Evidence"
                      style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 8, objectFit: 'cover' }}
                    />
                  </a>
                )}
                <button type="submit" className="button button-primary" disabled={updateStatus.isPending || uploading}>
                  {uploading ? 'Uploading…' : updateStatus.isPending ? 'Saving…' : 'Save ticket'}
                </button>
              </form>
            )}

            {!!(liveDetail.statusHistory ?? []).length && (
              <div>
                <div className="eyebrow">Status history</div>
                <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13, color: 'var(--text-muted)' }}>
                  {liveDetail.statusHistory!.map((h) => (
                    <li key={h.id}>{formatDateTime(h.createdAt)} · {h.fromStatus || '—'} → {h.toStatus}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <div className="eyebrow">Comments</div>
              <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                {(liveDetail.comments ?? []).map((cm) => (
                  <div key={cm.id} style={{ padding: '8px 10px', background: 'var(--bg)', borderRadius: 8 }}>
                    <b style={{ fontSize: 13 }}>{cm.authorName}</b>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12, marginLeft: 8 }}>{formatDateTime(cm.createdAt)}</span>
                    <div style={{ fontSize: 13.5, marginTop: 4 }}>{cm.body}</div>
                  </div>
                ))}
                {!(liveDetail.comments ?? []).length && (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No comments yet.</div>
                )}
              </div>
            </div>

            <form className="form-grid" onSubmit={(e) => {
              e.preventDefault()
              const body = String(new FormData(e.currentTarget).get('body') || '').trim()
              if (body.length < 2) return
              addComment.mutate({ id: liveDetail.id, body })
              e.currentTarget.reset()
            }}>
              <Field label="Add comment"><textarea name="body" rows={2} required minLength={2} /></Field>
              <button type="submit" className="button button-secondary" disabled={addComment.isPending}>
                {addComment.isPending ? 'Posting…' : 'Post comment'}
              </button>
            </form>
          </div>
        )}
      </ResponsiveSheet>
    </>
  )
}
