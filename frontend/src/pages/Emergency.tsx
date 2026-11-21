import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Phone, Plus } from 'lucide-react'
import type { EmergencyContact } from '../api'
import { emergencyApi } from '../services'
import { useAuth } from '../auth'
import { useSociety } from '../society'
import {
  ConfirmDialog, DataToolbar, Empty, ErrorBanner, Field, PageHeading, Pagination,
  ResponsiveSheet, Status, useToast,
} from '../components/UI'
import { apiError, paginate } from '../lib/format'

export default function Emergency() {
  const { can, user } = useAuth()
  const { scopeParam, apartmentId } = useSociety()
  const toast = useToast()
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<EmergencyContact | null>(null)
  const [deactivateId, setDeactivateId] = useState<{ id: string; name: string } | null>(null)
  const [error, setError] = useState('')
  const mobile = user?.role === 'SECURITY'

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['emergency', scopeParam],
    queryFn: () => emergencyApi.list(scopeParam),
  })

  const rows = useMemo(() => {
    let list = data.filter((c) => c.active || can('emergency.manage'))
    if (statusFilter === 'ACTIVE') list = list.filter((c) => c.active)
    if (statusFilter === 'INACTIVE') list = list.filter((c) => !c.active)
    if (q.trim()) {
      const t = q.toLowerCase()
      list = list.filter((c) => `${c.name} ${c.roleLabel} ${c.phone}`.toLowerCase().includes(t))
    }
    return list
  }, [data, q, can, statusFilter])
  const paged = paginate(rows, page, 12)

  const create = useMutation({
    mutationFn: (body: object) => emergencyApi.create(body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['emergency'] })
      setOpen(false)
      toast.success('Contact added')
    },
    onError: (err) => setError(apiError(err, 'Could not add contact')),
  })

  const deactivate = useMutation({
    mutationFn: (id: string) => emergencyApi.deactivate(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['emergency'] })
      setDeactivateId(null)
      toast.success('Contact deactivated')
    },
    onError: (err) => toast.error(apiError(err, 'Deactivate failed')),
  })

  function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const name = String(fd.get('name') || '').trim()
    const roleLabel = String(fd.get('roleLabel') || '').trim()
    const phone = String(fd.get('phone') || '').trim()
    if (!name || !roleLabel || !phone) {
      setError('Name, role and phone are required')
      return
    }
    setError('')
    create.mutate({
      apartmentId: apartmentId || undefined,
      name,
      roleLabel,
      phone,
      sortOrder: Number(fd.get('sortOrder') || 0),
    })
  }

  return (
    <>
      {!mobile && (
        <PageHeading
          eyebrow="Safety"
          title="Emergency contacts"
          subtitle="Gate and resident quick-dial numbers for the society."
          action={can('emergency.manage') ? (
            <button type="button" className="button button-primary" onClick={() => { setError(''); setOpen(true) }}>
              <Plus size={16} /> Add contact
            </button>
          ) : undefined}
        />
      )}
      {mobile && (
        <div className="mobile-hero ink">
          <div className="eyebrow">Haven gate</div>
          <h1>Emergency</h1>
          <p>Quick contacts for incidents at the gate.</p>
        </div>
      )}

      {isError && <ErrorBanner message="Could not load emergency contacts." />}

      <div className="table-panel">
        <DataToolbar title="Contacts" count={rows.length} search={q} onSearch={(v) => { setQ(v); setPage(1) }} placeholder="Search…">
          {can('emergency.manage') && (
            <select className="select" style={{ width: 'auto' }} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1) }}>
              <option value="ALL">All status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          )}
        </DataToolbar>
        <div className="stack-list" style={{ padding: 12 }}>
          {isLoading && <p style={{ color: 'var(--text-muted)' }}>Loading…</p>}
          {paged.slice.map((c) => (
            <div key={c.id} className="glass-card" style={{ padding: 14, marginBottom: 10, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <div>
                <b>{c.name}</b>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{c.roleLabel}</div>
                <Status value={c.active ? 'ACTIVE' : 'INACTIVE'} />
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <button type="button" className="button button-ghost button-sm" onClick={() => setView(c)}>
                  <Eye size={14} /> View
                </button>
                <a className="button button-primary button-sm" href={`tel:${c.phone}`}>
                  <Phone size={14} /> {c.phone}
                </a>
                {can('emergency.manage') && c.active && (
                  <button type="button" className="button button-danger button-sm" onClick={() => setDeactivateId({ id: c.id, name: c.name })}>
                    Deactivate
                  </button>
                )}
              </div>
            </div>
          ))}
          {!isLoading && !paged.slice.length && <Empty title="No contacts" description="Administrators can publish emergency numbers." />}
        </div>
        <Pagination page={page} pageSize={12} total={rows.length} onPageChange={setPage} />
      </div>

      <ResponsiveSheet open={open} title="Add emergency contact" onClose={() => setOpen(false)}>
        <form className="form-grid" onSubmit={onCreate}>
          <Field label="Name"><input name="name" required /></Field>
          <Field label="Role"><input name="roleLabel" placeholder="Fire / Police / Ambulance" required /></Field>
          <Field label="Phone"><input name="phone" required /></Field>
          <Field label="Sort order"><input name="sortOrder" type="number" defaultValue={0} /></Field>
          <ErrorBanner message={error} />
          <div className="form-actions">
            <button type="button" className="button button-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="button button-primary" disabled={create.isPending}>
              {create.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </ResponsiveSheet>

      <ResponsiveSheet open={Boolean(view)} title={view?.name ?? 'Contact'} subtitle={view?.roleLabel} onClose={() => setView(null)}>
        {view && (
          <div className="profile-meta-grid">
            <div><div className="eyebrow">Phone</div><b>{view.phone}</b></div>
            <div><div className="eyebrow">Role</div><b>{view.roleLabel}</b></div>
            <div><div className="eyebrow">Status</div><Status value={view.active ? 'ACTIVE' : 'INACTIVE'} /></div>
            <div><div className="eyebrow">Sort</div><b>{view.sortOrder}</b></div>
          </div>
        )}
      </ResponsiveSheet>

      <ConfirmDialog
        open={Boolean(deactivateId)}
        title="Deactivate contact"
        message={`Deactivate ${deactivateId?.name}? The number will stop appearing for residents and gate.`}
        confirmLabel="Deactivate"
        danger
        busy={deactivate.isPending}
        onClose={() => setDeactivateId(null)}
        onConfirm={() => deactivateId && deactivate.mutate(deactivateId.id)}
      />
    </>
  )
}
