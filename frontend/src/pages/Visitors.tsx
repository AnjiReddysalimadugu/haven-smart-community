import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Plus, ShieldCheck } from 'lucide-react'
import type { Visitor } from '../api'
import { propertyApi, visitorApi } from '../services'
import { useAuth } from '../auth'
import { useSociety } from '../society'
import QrCode from '../components/QrCode'
import {
  ConfirmDialog, DataToolbar, Empty, ErrorBanner, Field, PageHeading, Pagination,
  ResponsiveSheet, Status, useToast,
} from '../components/UI'
import { apiError, formatDateTime, paginate } from '../lib/format'

export default function Visitors() {
  const { user, can } = useAuth()
  const { scopeParam } = useSociety()
  const toast = useToast()
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [validateOpen, setValidateOpen] = useState(false)
  const [createdToken, setCreatedToken] = useState('')
  const [validationMsg, setValidationMsg] = useState('')
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [view, setView] = useState<Visitor | null>(null)
  const [rejectTarget, setRejectTarget] = useState<Visitor | null>(null)

  const needsFlatPicker = user?.role !== 'RESIDENT'
  const residentMissingFlat = user?.role === 'RESIDENT' && !user.flatId

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['visitors', scopeParam],
    queryFn: () => visitorApi.list(scopeParam),
  })

  const { data: flats = [] } = useQuery({
    queryKey: ['flats', scopeParam],
    queryFn: () => propertyApi.flats(scopeParam),
    enabled: can('visitor.create') && needsFlatPicker,
  })

  const rows = useMemo(() => {
    let list = data
    if (statusFilter === 'PENDING') list = list.filter((v) => (v.approvalStatus || 'APPROVED') === 'PENDING')
    if (statusFilter === 'USED') list = list.filter((v) => v.used)
    if (statusFilter === 'ACTIVE') list = list.filter((v) => !v.used && (v.approvalStatus || 'APPROVED') === 'APPROVED')
    if (statusFilter === 'DELIVERY') list = list.filter((v) => v.visitType === 'DELIVERY')
    if (q.trim()) {
      const t = q.toLowerCase()
      list = list.filter((v) => `${v.visitorName} ${v.flatNumber} ${v.visitType}`.toLowerCase().includes(t))
    }
    return list
  }, [data, q, statusFilter])

  const paged = paginate(rows, page, 8)

  const createPass = useMutation({
    mutationFn: (body: object) => visitorApi.create(body),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['visitors'] })
      setCreatedToken(res.qrToken)
      toast.success(res.approvalStatus === 'PENDING' ? 'Awaiting resident approval' : 'Visitor pass created')
      setError('')
    },
    onError: (err) => setError(apiError(err, 'Could not create pass')),
  })

  const approve = useMutation({
    mutationFn: (id: string) => visitorApi.approve(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['visitors'] })
      toast.success('Visitor approved')
    },
    onError: (err) => toast.error(apiError(err, 'Approve failed')),
  })

  const reject = useMutation({
    mutationFn: (id: string) => visitorApi.reject(id, 'Declined by host'),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['visitors'] })
      setRejectTarget(null)
      toast.success('Visitor rejected')
    },
    onError: (err) => toast.error(apiError(err, 'Reject failed')),
  })

  const validate = useMutation({
    mutationFn: (qrToken: string) => visitorApi.validate(qrToken),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['visitors'] })
      setValidationMsg(`${res.valid ? 'Approved' : 'Rejected'}: ${res.message}`)
      toast[res.valid ? 'success' : 'error'](res.valid ? 'Entry approved' : 'Entry rejected', res.message)
    },
    onError: (err) => setError(apiError(err, 'Validation failed')),
  })

  function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (residentMissingFlat) {
      setError('Your account is not linked to a flat yet. Ask your society admin.')
      return
    }
    const fd = new FormData(e.currentTarget)
    const visitorName = String(fd.get('visitorName') || '').trim()
    if (visitorName.length < 2) { setError('Visitor name is required'); return }
    const flatId = user?.role === 'RESIDENT' ? user.flatId : String(fd.get('flatId') || '')
    if (!flatId) { setError('Select a flat'); return }
    setError('')
    createPass.mutate({
      flatId,
      visitorName,
      mobile: fd.get('mobile') || null,
      visitType: fd.get('visitType'),
      validityMinutes: Number(fd.get('validityMinutes') || 120),
      requiresApproval: user?.role === 'SECURITY' || fd.get('requiresApproval') === 'on',
    })
  }

  const pendingApprovals = data.filter((v) => (v.approvalStatus || 'APPROVED') === 'PENDING' && !v.used)

  return (
    <>
      <PageHeading
        eyebrow="Operations"
        title="Visitors"
        subtitle={user?.role === 'SECURITY' ? 'Validate gate passes for entry.' : 'Issue guest passes and track entry activity.'}
        action={(
          <>
            {can('visitor.validate') && (
              <button className="button button-secondary" type="button" onClick={() => { setError(''); setValidationMsg(''); setValidateOpen(true) }}>
                <ShieldCheck size={16} /> Validate
              </button>
            )}
            {can('visitor.create') && (
              <button
                className="button button-primary"
                type="button"
                disabled={residentMissingFlat}
                title={residentMissingFlat ? 'Flat assignment required' : undefined}
                onClick={() => { setError(''); setCreatedToken(''); setCreateOpen(true) }}
              >
                <Plus size={16} /> Create pass
              </button>
            )}
          </>
        )}
      />

      {residentMissingFlat && (
        <ErrorBanner message="Your account is not linked to a flat. Visitor passes will unlock after occupancy assignment." />
      )}

      <div className="mini-stats">
        <div><small>Total</small><b>{data.length}</b></div>
        <div><small>Awaiting approval</small><b>{pendingApprovals.length}</b></div>
        <div><small>Used</small><b>{data.filter((v) => v.used).length}</b></div>
      </div>

      {isError && <ErrorBanner message="Could not load visitors." />}

      {can('visitor.approve') && pendingApprovals.length > 0 && (
        <div className="table-panel" style={{ marginBottom: 16 }}>
          <DataToolbar title="Approval queue" count={pendingApprovals.length} />
          <div className="table-scroll">
            <table>
              <thead><tr><th>Visitor</th><th>Flat</th><th>Type</th><th>Expires</th><th>Actions</th></tr></thead>
              <tbody>
                {pendingApprovals.map((v) => (
                  <tr key={v.id}>
                    <td><b>{v.visitorName}</b></td>
                    <td>{v.flatNumber}</td>
                    <td>{v.visitType}</td>
                    <td>{formatDateTime(v.expiresAt)}</td>
                    <td className="row-actions">
                      <button type="button" className="button button-primary button-sm" disabled={approve.isPending} onClick={() => approve.mutate(v.id)}>Approve</button>
                      <button type="button" className="button button-ghost button-sm" disabled={reject.isPending} onClick={() => setRejectTarget(v)}>Reject</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="table-panel">
        <DataToolbar title="Visitor passes" count={rows.length} search={q} onSearch={(v) => { setQ(v); setPage(1) }}>
          <select className="select" style={{ width: 'auto' }} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}>
            <option value="ALL">All</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="USED">Used</option>
            <option value="DELIVERY">Deliveries</option>
          </select>
        </DataToolbar>
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Visitor</th><th>Flat</th><th>Type</th><th>Expires</th><th>Entry</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={7}>Loading…</td></tr>}
              {paged.slice.map((v) => (
                <tr key={v.id}>
                  <td><b>{v.visitorName}</b>{v.mobile ? <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{v.mobile}</div> : null}</td>
                  <td>{v.flatNumber}</td>
                  <td>{v.visitType}</td>
                  <td>{formatDateTime(v.expiresAt)}</td>
                  <td>{formatDateTime(v.entryAt)}</td>
                  <td><Status value={v.used ? 'USED' : (v.approvalStatus || 'APPROVED')} /></td>
                  <td>
                    <button type="button" className="button button-ghost button-sm" onClick={() => setView(v)}>
                      <Eye size={14} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && !paged.slice.length && <Empty title="No passes" description="Create a visitor pass to get started." />}
        </div>
        <Pagination page={page} pageSize={8} total={rows.length} onPageChange={setPage} />
      </div>

      <ResponsiveSheet open={createOpen} title="Create visitor pass" onClose={() => setCreateOpen(false)}>
        {createdToken ? (
          <div className="form-grid">
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>Share this token once — it is not stored in plaintext.</p>
            <QrCode value={createdToken} />
            <Field label="QR token"><textarea readOnly value={createdToken} rows={4} /></Field>
            <div className="form-actions">
              <button type="button" className="button button-primary" onClick={() => { navigator.clipboard?.writeText(createdToken); toast.info('Token copied') }}>Copy token</button>
              <button type="button" className="button button-secondary" onClick={() => setCreateOpen(false)}>Done</button>
            </div>
          </div>
        ) : (
          <form className="form-grid" onSubmit={onCreate}>
            {needsFlatPicker && (
              <Field label="Flat">
                <select name="flatId" required defaultValue="">
                  <option value="" disabled>Select flat</option>
                  {flats.map((f) => <option key={f.id} value={f.id}>{f.flatNumber}</option>)}
                </select>
              </Field>
            )}
            <Field label="Visitor name"><input name="visitorName" required minLength={2} /></Field>
            <Field label="Mobile"><input name="mobile" /></Field>
            <Field label="Visit type">
              <select name="visitType" defaultValue="GUEST">
                <option value="GUEST">Guest</option>
                <option value="DELIVERY">Delivery</option>
                <option value="SERVICE">Service</option>
              </select>
            </Field>
            <Field label="Validity (minutes)"><input name="validityMinutes" type="number" min={15} defaultValue={120} /></Field>
            {user?.role !== 'RESIDENT' && user?.role !== 'SECURITY' && (
              <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                <input type="checkbox" name="requiresApproval" /> Require resident approval
              </label>
            )}
            {user?.role === 'SECURITY' && (
              <div className="info-callout">Walk-in guests require resident approval before entry.</div>
            )}
            <ErrorBanner message={error} />
            <div className="form-actions">
              <button type="button" className="button button-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
              <button type="submit" className="button button-primary" disabled={createPass.isPending}>{createPass.isPending ? 'Creating…' : 'Create'}</button>
            </div>
          </form>
        )}
      </ResponsiveSheet>

      <ResponsiveSheet open={validateOpen} title="Validate pass" onClose={() => setValidateOpen(false)}>
        <form className="form-grid" onSubmit={(e) => {
          e.preventDefault()
          const token = String(new FormData(e.currentTarget).get('qrToken') || '').trim()
          if (!token) { setError('Token required'); return }
          setError('')
          validate.mutate(token)
        }}>
          <Field label="QR token"><input name="qrToken" required /></Field>
          {validationMsg && <div className="info-callout ok">{validationMsg}</div>}
          <ErrorBanner message={error} />
          <div className="form-actions">
            <button type="button" className="button button-secondary" onClick={() => setValidateOpen(false)}>Close</button>
            <button type="submit" className="button button-primary" disabled={validate.isPending}>{validate.isPending ? 'Checking…' : 'Validate'}</button>
          </div>
        </form>
      </ResponsiveSheet>

      <ResponsiveSheet open={Boolean(view)} title={view?.visitorName ?? 'Visitor'} subtitle={view?.flatNumber} onClose={() => setView(null)}>
        {view && (
          <div className="profile-meta-grid">
            <div><div className="eyebrow">Type</div><b>{view.visitType}</b></div>
            <div><div className="eyebrow">Mobile</div><b>{view.mobile || '—'}</b></div>
            <div><div className="eyebrow">Expires</div><b>{formatDateTime(view.expiresAt)}</b></div>
            <div><div className="eyebrow">Entry</div><b>{formatDateTime(view.entryAt)}</b></div>
            <div><div className="eyebrow">Status</div><Status value={view.used ? 'USED' : (view.approvalStatus || 'APPROVED')} /></div>
          </div>
        )}
      </ResponsiveSheet>

      <ConfirmDialog
        open={Boolean(rejectTarget)}
        title="Reject visitor"
        message={`Reject ${rejectTarget?.visitorName}? They will not be allowed entry with this pass.`}
        confirmLabel="Reject"
        danger
        busy={reject.isPending}
        onClose={() => setRejectTarget(null)}
        onConfirm={() => rejectTarget && reject.mutate(rejectTarget.id)}
      />
    </>
  )
}
