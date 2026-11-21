import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Plus } from 'lucide-react'
import type { Notice } from '../api'
import { noticeApi } from '../services'
import { useAuth } from '../auth'
import { useSociety } from '../society'
import {
  ConfirmDialog, DataToolbar, Empty, ErrorBanner, Field, PageHeading, Pagination,
  ResponsiveSheet, Status, useToast,
} from '../components/UI'
import { apiError, formatDateTime, paginate } from '../lib/format'

export default function Notices() {
  const { can } = useAuth()
  const { scopeParam, apartmentId } = useSociety()
  const toast = useToast()
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<Notice | null>(null)
  const [deactivateId, setDeactivateId] = useState<{ id: string; title: string } | null>(null)
  const [error, setError] = useState('')

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['notices', scopeParam],
    queryFn: () => noticeApi.list(scopeParam),
  })

  const rows = useMemo(() => {
    let list = data
    if (statusFilter === 'ACTIVE') list = list.filter((n) => n.active)
    if (statusFilter === 'INACTIVE') list = list.filter((n) => !n.active)
    if (q.trim()) {
      const t = q.toLowerCase()
      list = list.filter((n) => `${n.title} ${n.body}`.toLowerCase().includes(t))
    }
    return list
  }, [data, q, statusFilter])
  const paged = paginate(rows, page, 8)

  const create = useMutation({
    mutationFn: (body: object) => noticeApi.create(body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['notices'] })
      setOpen(false)
      toast.success('Notice published')
    },
    onError: (err) => setError(apiError(err, 'Could not publish notice')),
  })

  const deactivate = useMutation({
    mutationFn: (id: string) => noticeApi.deactivate(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['notices'] })
      setDeactivateId(null)
      toast.success('Notice deactivated')
    },
    onError: (err) => toast.error(apiError(err, 'Deactivate failed')),
  })

  function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const title = String(fd.get('title') || '').trim()
    const body = String(fd.get('body') || '').trim()
    if (title.length < 3 || body.length < 5) {
      setError('Title and body are required')
      return
    }
    const expires = String(fd.get('expiresAt') || '').trim()
    setError('')
    create.mutate({
      apartmentId: apartmentId || undefined,
      title,
      body,
      expiresAt: expires ? new Date(expires).toISOString() : null,
    })
  }

  return (
    <>
      <PageHeading
        eyebrow="Communications"
        title="Notices"
        subtitle="Society announcements visible to residents and gate staff."
        action={can('notice.manage') ? (
          <button type="button" className="button button-primary" onClick={() => { setError(''); setOpen(true) }}>
            <Plus size={16} /> Publish
          </button>
        ) : undefined}
      />

      {isError && <ErrorBanner message="Could not load notices." />}

      <div className="table-panel">
        <DataToolbar title="Board" count={rows.length} search={q} onSearch={(v) => { setQ(v); setPage(1) }} placeholder="Search notices…">
          <select className="select" style={{ width: 'auto' }} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1) }}>
            <option value="ALL">All status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </DataToolbar>
        <div className="stack-list">
          {isLoading && <p style={{ padding: 16, color: 'var(--text-muted)' }}>Loading…</p>}
          {paged.slice.map((n) => (
            <article key={n.id} className="glass-card" style={{ padding: 16, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start' }}>
                <div>
                  <b>{n.title}</b>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {formatDateTime(n.publishedAt)}
                    {n.expiresAt ? ` · expires ${formatDateTime(n.expiresAt)}` : ''}
                  </div>
                </div>
                <Status value={n.active ? 'ACTIVE' : 'INACTIVE'} />
              </div>
              <p style={{ marginTop: 10, whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>{n.body.length > 180 ? `${n.body.slice(0, 180)}…` : n.body}</p>
              <div className="row-actions" style={{ marginTop: 8 }}>
                <button type="button" className="button button-ghost button-sm" onClick={() => setView(n)}>
                  <Eye size={14} /> View
                </button>
                {can('notice.manage') && n.active && (
                  <button type="button" className="button button-danger button-sm" onClick={() => setDeactivateId({ id: n.id, title: n.title })}>
                    Deactivate
                  </button>
                )}
              </div>
            </article>
          ))}
          {!isLoading && !paged.slice.length && <Empty title="No notices" description="Published notices will appear here." />}
        </div>
        <Pagination page={page} pageSize={8} total={rows.length} onPageChange={setPage} />
      </div>

      <ResponsiveSheet open={open} title="Publish notice" onClose={() => setOpen(false)}>
        <form className="form-grid" onSubmit={onCreate}>
          <Field label="Title"><input name="title" required minLength={3} maxLength={160} /></Field>
          <Field label="Body"><textarea name="body" rows={5} required minLength={5} maxLength={4000} /></Field>
          <Field label="Expires (optional)"><input name="expiresAt" type="datetime-local" /></Field>
          <ErrorBanner message={error} />
          <div className="form-actions">
            <button type="button" className="button button-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="button button-primary" disabled={create.isPending}>
              {create.isPending ? 'Publishing…' : 'Publish'}
            </button>
          </div>
        </form>
      </ResponsiveSheet>

      <ResponsiveSheet open={Boolean(view)} title={view?.title ?? 'Notice'} subtitle={view ? formatDateTime(view.publishedAt) : undefined} onClose={() => setView(null)}>
        {view && (
          <>
            <Status value={view.active ? 'ACTIVE' : 'INACTIVE'} />
            {view.expiresAt && <p className="muted" style={{ marginTop: 8 }}>Expires {formatDateTime(view.expiresAt)}</p>}
            <p style={{ marginTop: 12, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{view.body}</p>
          </>
        )}
      </ResponsiveSheet>

      <ConfirmDialog
        open={Boolean(deactivateId)}
        title="Deactivate notice"
        message={`Deactivate “${deactivateId?.title}”? It will no longer show on the board.`}
        confirmLabel="Deactivate"
        danger
        busy={deactivate.isPending}
        onClose={() => setDeactivateId(null)}
        onConfirm={() => deactivateId && deactivate.mutate(deactivateId.id)}
      />
    </>
  )
}
