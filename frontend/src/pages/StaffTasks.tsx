import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Complaint } from '../api'
import { complaintApi, uploadApi } from '../services'
import {
  DataToolbar, Empty, ErrorBanner, Field, PageHeading, Pagination, ResponsiveSheet, Status, useToast,
} from '../components/UI'
import { apiError, formatDateTime, paginate } from '../lib/format'

const WORK_STATUSES = ['ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const

export default function StaffTasks() {
  const toast = useToast()
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<Complaint | null>(null)
  const [error, setError] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')
  const [uploading, setUploading] = useState(false)

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['complaints', 'mine'],
    queryFn: () => complaintApi.list(undefined, true),
  })

  const rows = useMemo(() => {
    let list = data
    if (q.trim()) {
      const t = q.toLowerCase()
      list = list.filter((c) => `${c.title} ${c.flatNumber} ${c.status}`.toLowerCase().includes(t))
    }
    return list
  }, [data, q])
  const paged = paginate(rows, page, 8)
  const openCount = data.filter((c) => !['RESOLVED', 'CLOSED'].includes(c.status)).length
  const live = detail ? (data.find((c) => c.id === detail.id) ?? detail) : null

  const update = useMutation({
    mutationFn: (body: { id: string; status: string; resolutionNotes?: string; evidenceUrl?: string }) =>
      complaintApi.updateStatus(body.id, {
        status: body.status,
        resolutionNotes: body.resolutionNotes,
        evidenceUrl: body.evidenceUrl,
      }),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['complaints'] })
      setDetail(res)
      setEvidenceUrl(res.evidenceUrl || '')
      setError('')
      toast.success('Task updated')
    },
    onError: (err) => setError(apiError(err, 'Update failed')),
  })

  const comment = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => complaintApi.addComment(id, body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['complaints'] })
      toast.success('Work note added')
    },
    onError: (err) => toast.error(apiError(err, 'Comment failed')),
  })

  function onUpdate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!live) return
    const fd = new FormData(e.currentTarget)
    update.mutate({
      id: live.id,
      status: String(fd.get('status')),
      resolutionNotes: String(fd.get('resolutionNotes') || '').trim() || undefined,
      evidenceUrl: evidenceUrl.trim() || String(fd.get('evidenceUrl') || '').trim() || undefined,
    })
  }

  function onComment(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!live) return
    const fd = new FormData(e.currentTarget)
    const body = String(fd.get('body') || '').trim()
    if (!body) return
    comment.mutate({ id: live.id, body })
    e.currentTarget.reset()
  }

  return (
    <>
      <PageHeading
        eyebrow="Staff desk"
        title="My tasks"
        subtitle="Complaints assigned to you — update progress and attach completion evidence."
      />

      <div className="mini-stats">
        <div><small>Assigned</small><b>{data.length}</b></div>
        <div><small>Open</small><b>{openCount}</b></div>
      </div>

      {isError && <ErrorBanner message="Could not load assigned tasks." />}

      <div className="table-panel">
        <DataToolbar title="Work queue" count={rows.length} search={q} onSearch={(v) => { setQ(v); setPage(1) }} placeholder="Search tasks…" />
        <div className="table-scroll">
          <table>
            <thead><tr><th>Title</th><th>Flat</th><th>Status</th><th>Created</th><th /></tr></thead>
            <tbody>
              {isLoading && <tr><td colSpan={5}>Loading…</td></tr>}
              {paged.slice.map((c) => (
                <tr key={c.id}>
                  <td><b>{c.title}</b><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.category}</div></td>
                  <td>{c.flatNumber}</td>
                  <td><Status value={c.status} /></td>
                  <td>{formatDateTime(c.createdAt)}</td>
                  <td><button type="button" className="button button-ghost button-sm" onClick={() => { setDetail(c); setEvidenceUrl(c.evidenceUrl || ''); setError('') }}>Open</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && !paged.slice.length && <Empty title="No assigned tasks" description="Ask an admin to assign complaints to you." />}
        </div>
        <Pagination page={page} pageSize={8} total={rows.length} onPageChange={setPage} />
      </div>

      <ResponsiveSheet
        open={Boolean(live)}
        title={live?.title ?? 'Task'}
        subtitle={live ? `Flat ${live.flatNumber} · ${live.status}` : undefined}
        onClose={() => setDetail(null)}
      >
        {live && (
          <>
            <p style={{ marginBottom: 12, whiteSpace: 'pre-wrap' }}>{live.description}</p>
            {(evidenceUrl || live.evidenceUrl) && (
              <p style={{ fontSize: 13, marginBottom: 12 }}>
                <a href={evidenceUrl || live.evidenceUrl || '#'} target="_blank" rel="noreferrer">
                  <img
                    src={evidenceUrl || live.evidenceUrl || ''}
                    alt="Evidence"
                    style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 8, objectFit: 'cover', display: 'block' }}
                  />
                </a>
              </p>
            )}

            <form className="form-grid" onSubmit={onUpdate}>
              <Field label="Status">
                <select name="status" defaultValue={live.status}>
                  {WORK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Work notes"><textarea name="resolutionNotes" rows={3} defaultValue={live.resolutionNotes || ''} /></Field>
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
                      setError(apiError(err, 'Upload failed'))
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
              <ErrorBanner message={error} />
              <button type="submit" className="button button-primary" disabled={update.isPending || uploading}>
                {uploading ? 'Uploading…' : update.isPending ? 'Saving…' : 'Update task'}
              </button>
            </form>

            <div style={{ marginTop: 16 }}>
              <b>Status history</b>
              <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: 13, color: 'var(--text-muted)' }}>
                {(live.statusHistory ?? []).map((h) => (
                  <li key={h.id}>{formatDateTime(h.createdAt)} · {h.fromStatus || '—'} → {h.toStatus} {h.actorName ? `(${h.actorName})` : ''}</li>
                ))}
                {!live.statusHistory?.length && <li>No history yet</li>}
              </ul>
            </div>

            <form className="form-grid" style={{ marginTop: 16 }} onSubmit={onComment}>
              <Field label="Work update comment"><textarea name="body" rows={2} required /></Field>
              <button type="submit" className="button button-ghost" disabled={comment.isPending}>Add note</button>
            </form>
          </>
        )}
      </ResponsiveSheet>
    </>
  )
}
