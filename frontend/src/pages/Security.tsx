import { FormEvent, useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, LogOut, Megaphone, ShieldCheck } from 'lucide-react'
import { noticeApi, visitorApi } from '../services'
import { useAuth } from '../auth'
import { useSociety } from '../society'
import QrScanner from '../components/QrScanner'
import {
  DataToolbar, Empty, ErrorBanner, Field, PageHeading, Pagination, Status, useToast,
} from '../components/UI'
import { apiError, formatDateTime, paginate } from '../lib/format'

export default function Security() {
  const { can, user } = useAuth()
  const { scopeParam } = useSociety()
  const toast = useToast()
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [token, setToken] = useState('')
  const [exitToken, setExitToken] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [scanOpen, setScanOpen] = useState(false)
  const mobile = user?.role === 'SECURITY'

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['visitors', scopeParam],
    queryFn: () => visitorApi.list(scopeParam),
  })

  const notices = useQuery({
    queryKey: ['notices', scopeParam],
    queryFn: () => noticeApi.list(scopeParam),
    enabled: mobile,
  })

  const rows = useMemo(() => {
    let list = data
    if (q.trim()) {
      const t = q.toLowerCase()
      list = list.filter((v) => `${v.visitorName} ${v.flatNumber} ${v.visitType}`.toLowerCase().includes(t))
    }
    return [...list].sort((a, b) => String(b.expiresAt).localeCompare(String(a.expiresAt)))
  }, [data, q])

  const paged = paginate(rows, page, 8)
  const inside = data.filter((v) => v.used && !v.exitAt)

  const validate = useMutation({
    mutationFn: (qrToken: string) => visitorApi.validate(qrToken),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['visitors'] })
      setMessage(`${res.valid ? 'Approved' : 'Rejected'}: ${res.message}${res.flatNumber ? ` · ${res.flatNumber}` : ''}`)
      if (res.valid) {
        toast.success('Entry approved', res.visitorName || undefined)
        setToken('')
      } else {
        toast.error('Entry rejected', res.message)
      }
      setError('')
    },
    onError: (err) => setError(apiError(err, 'Validation failed')),
  })

  const checkout = useMutation({
    mutationFn: (id: string) => visitorApi.exit(id),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['visitors'] })
      toast.success('Checked out', res.visitorName)
    },
    onError: (err) => toast.error(apiError(err, 'Check-out failed')),
  })

  const checkoutToken = useMutation({
    mutationFn: (qrToken: string) => visitorApi.exitByToken(qrToken),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['visitors'] })
      toast.success('Checked out', res.visitorName)
      setExitToken('')
      setError('')
    },
    onError: (err) => setError(apiError(err, 'Check-out failed')),
  })

  const onScanned = useCallback((value: string) => {
    setToken(value)
    setScanOpen(false)
    validate.mutate(value)
  }, [validate])

  function onValidate(e: FormEvent) {
    e.preventDefault()
    const value = token.trim()
    if (!value) { setError('QR token is required'); return }
    validate.mutate(value)
  }

  function onExitToken(e: FormEvent) {
    e.preventDefault()
    const value = exitToken.trim()
    if (!value) { setError('QR token is required for check-out'); return }
    checkoutToken.mutate(value)
  }

  return (
    <>
      {!mobile && (
        <PageHeading
          eyebrow="Operations"
          title="Security desk"
          subtitle="Validate visitor QR tokens for entry and record check-out when guests leave."
        />
      )}

      {mobile && (
        <div className="mobile-hero ink">
          <div className="eyebrow">Haven gate</div>
          <h1>Check-in</h1>
          <p>Validate entry and record exits — gate tools only.</p>
        </div>
      )}

      <div className="mini-stats">
        <div><small>On premises</small><b>{inside.length}</b></div>
        <div><small>Unused passes</small><b>{data.filter((v) => !v.used).length}</b></div>
        <div><small>Total passes</small><b>{data.length}</b></div>
      </div>

      {mobile && (
        <div className="table-panel" style={{ marginBottom: 16, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Megaphone size={16} color="var(--accent)" />
              <b style={{ fontSize: 14 }}>Society notices</b>
            </div>
            <Link className="button button-ghost button-sm" to="/notices">All</Link>
          </div>
          {(notices.data ?? []).slice(0, 2).map((n) => (
            <p key={n.id} style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              <b style={{ color: 'var(--text)' }}>{n.title}</b>
              {' · '}
              {n.body.slice(0, 80)}{n.body.length > 80 ? '…' : ''}
            </p>
          ))}
          {!notices.isLoading && !(notices.data ?? []).length && (
            <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>No active notices.</p>
          )}
        </div>
      )}

      {can('visitor.validate') && (
        <div className="checkin-panel" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`button ${scanOpen ? 'button-secondary' : 'button-primary'} button-sm`}
              onClick={() => setScanOpen((v) => !v)}
            >
              <Camera size={14} /> {scanOpen ? 'Close camera' : 'Scan QR'}
            </button>
          </div>
          {scanOpen && <QrScanner active={scanOpen} onScan={onScanned} />}
          <form className="form-grid" onSubmit={onValidate}>
            <Field label="Check-in QR token">
              <input
                className="token-input"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste token from resident pass"
                autoComplete="off"
                required
              />
            </Field>
            {message && (
              <div className={`info-callout ${message.startsWith('Approved') ? 'ok' : 'danger'}`}>{message}</div>
            )}
            <ErrorBanner message={error} />
            <button type="submit" className="button button-primary" disabled={validate.isPending} style={{ width: mobile ? '100%' : undefined }}>
              <ShieldCheck size={16} />
              {validate.isPending ? 'Validating…' : 'Validate entry'}
            </button>
          </form>
        </div>
      )}

      {can('visitor.exit') && (
        <div className="checkin-panel" style={{ marginBottom: 16 }}>
          <form className="form-grid" onSubmit={onExitToken}>
            <Field label="Check-out QR token">
              <input
                className="token-input"
                value={exitToken}
                onChange={(e) => setExitToken(e.target.value)}
                placeholder="Paste token to record exit"
                autoComplete="off"
                required
              />
            </Field>
            {!can('visitor.validate') && <ErrorBanner message={error} />}
            <button type="submit" className="button button-secondary" disabled={checkoutToken.isPending} style={{ width: mobile ? '100%' : undefined }}>
              <LogOut size={16} />
              {checkoutToken.isPending ? 'Checking out…' : 'Record exit'}
            </button>
          </form>
        </div>
      )}

      {isError && <ErrorBanner message="Could not load visitor passes." />}

      <div className="table-panel">
        <DataToolbar title="Gate activity" count={rows.length} search={q} onSearch={(v) => { setQ(v); setPage(1) }} />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Visitor</th><th>Flat</th><th>Entry</th><th>Exit</th><th>Status</th>
                {can('visitor.exit') && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={6}>Loading…</td></tr>}
              {paged.slice.map((v) => (
                <tr key={v.id}>
                  <td><b>{v.visitorName}</b></td>
                  <td>{v.flatNumber}</td>
                  <td>{formatDateTime(v.entryAt)}</td>
                  <td>{v.exitAt ? formatDateTime(v.exitAt) : (v.used ? 'Still inside' : '—')}</td>
                  <td>
                    <Status value={
                      v.exitAt ? 'CHECKED_OUT'
                        : v.used ? 'ON_PREMISES'
                          : (v.approvalStatus || 'PENDING')
                    } />
                  </td>
                  {can('visitor.exit') && (
                    <td>
                      {v.used && !v.exitAt ? (
                        <button
                          type="button"
                          className="button button-ghost button-sm"
                          disabled={checkout.isPending}
                          onClick={() => checkout.mutate(v.id)}
                        >
                          <LogOut size={14} /> Check out
                        </button>
                      ) : '—'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && !paged.slice.length && <Empty title="No visitor activity" description="Validated passes will appear here." />}
        </div>
        <Pagination page={page} pageSize={8} total={rows.length} onPageChange={setPage} />
      </div>
    </>
  )
}
