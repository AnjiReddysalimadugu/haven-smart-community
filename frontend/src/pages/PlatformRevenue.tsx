import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import { platformApi, type PlatformSubscription } from '../services'
import { useAuth } from '../auth'
import { money } from '../lib/format'
import { ErrorBanner, Status } from '../components/UI'

const PLANS = [
  { code: 'STARTER', name: 'Starter', amount: 4999, seats: 50 },
  { code: 'GROWTH', name: 'Growth', amount: 9999, seats: 150 },
  { code: 'ENTERPRISE', name: 'Enterprise', amount: 19999, seats: 500 },
]

export default function PlatformRevenue() {
  const { user, hasRole } = useAuth()
  const qc = useQueryClient()
  const [selected, setSelected] = useState<PlatformSubscription | null>(null)
  const [error, setError] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [payRef, setPayRef] = useState('')
  const [payLink, setPayLink] = useState('')

  if (!hasRole('SUPER_ADMIN')) return <Navigate to="/" replace />

  const summary = useQuery({ queryKey: ['platform-summary'], queryFn: () => platformApi.summary() })

  const upsert = useMutation({
    mutationFn: (sub: PlatformSubscription & { planCode: string; planName: string; amountMonthly: number; status: string; seatsIncluded: number; paymentLink?: string }) =>
      platformApi.upsertSubscription(sub.apartmentId, {
        planCode: sub.planCode,
        planName: sub.planName,
        status: sub.status,
        amountMonthly: sub.amountMonthly,
        seatsIncluded: sub.seatsIncluded,
        featuresJson: sub.featuresJson || '["property","billing","visitors","complaints","notices","parking"]',
        paymentLink: sub.paymentLink || payLink || null,
        nextDueOn: sub.nextDueOn || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        notes: sub.notes || null,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['platform-summary'] })
      setError('')
      setSelected(null)
    },
    onError: (err: any) => setError(err?.response?.data?.message || 'Could not save plan'),
  })

  const recordPay = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error('No society')
      return platformApi.recordPayment(selected.apartmentId, {
        amount: Number(payAmount),
        paidOn: new Date().toISOString().slice(0, 10),
        method: 'UPI',
        reference: payRef || undefined,
      })
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['platform-summary'] })
      setPayAmount('')
      setPayRef('')
      setSelected(null)
    },
    onError: (err: any) => setError(err?.response?.data?.message || 'Could not record payment'),
  })

  const rows = summary.data?.subscriptions ?? []
  const profitHint = useMemo(() => {
    const collected = Number(summary.data?.collectedTotal ?? 0)
    const mrr = Number(summary.data?.mrr ?? 0)
    if (collected <= 0 && mrr <= 0) return 'No SaaS collections yet — set plans and record payments.'
    if (Number(summary.data?.outstandingEstimate ?? 0) > collected * 0.5) {
      return 'Outstanding dues are high vs collections — follow up with PAST_DUE societies.'
    }
    return 'Collections look healthy vs monthly recurring revenue.'
  }, [summary.data])

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="eyebrow">Platform</div>
          <h1>Subscriptions & revenue</h1>
          <p className="muted">What societies pay Haven for the product — not flat electricity/water bills.</p>
        </div>
      </div>

      <ErrorBanner message={error || (summary.isError ? 'Could not load platform summary' : '')} />

      <div className="kpi-grid" style={{ marginBottom: 18 }}>
        <div className="kpi"><span>Active societies</span><strong>{summary.data?.societiesActive ?? '—'}</strong></div>
        <div className="kpi"><span>Active users</span><strong>{summary.data?.usersActive ?? '—'}</strong></div>
        <div className="kpi"><span>MRR</span><strong>{money(summary.data?.mrr ?? 0)}</strong></div>
        <div className="kpi"><span>Collected</span><strong>{money(summary.data?.collectedTotal ?? 0)}</strong></div>
        <div className="kpi"><span>Due estimate</span><strong>{money(summary.data?.outstandingEstimate ?? 0)}</strong></div>
        <div className="kpi"><span>Flats on platform</span><strong>{summary.data?.flatsTotal ?? '—'}</strong></div>
      </div>

      <p className="muted" style={{ marginBottom: 16 }}>{profitHint}</p>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Society</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Monthly</th>
              <th>Collected</th>
              <th>Users</th>
              <th>Due</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.apartmentId}>
                <td>
                  <b>{r.apartmentName}</b>
                  {r.paymentLink ? (
                    <div className="muted" style={{ fontSize: 12 }}>
                      <a href={r.paymentLink} target="_blank" rel="noreferrer">Payment link</a>
                    </div>
                  ) : null}
                </td>
                <td>{r.planName}</td>
                <td><Status value={r.status} /></td>
                <td>{money(r.amountMonthly)}</td>
                <td>{money(r.collectedTotal)}</td>
                <td>{r.activeUsers}/{r.totalUsers}</td>
                <td>{r.nextDueOn || '—'}</td>
                <td>
                  <button type="button" className="button button-secondary" onClick={() => {
                    setSelected(r)
                    setPayAmount(String(r.amountMonthly || ''))
                    setPayLink(r.paymentLink || '')
                  }}>
                    Manage
                  </button>
                </td>
              </tr>
            ))}
            {!rows.length && !summary.isLoading ? (
              <tr><td colSpan={8} className="muted">No societies yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div className="card" style={{ marginTop: 18 }}>
          <h2 style={{ marginTop: 0 }}>{selected.apartmentName}</h2>
          <p className="muted">Assign SaaS plan, payment link, and record collections from this society.</p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {PLANS.map((p) => (
              <button
                key={p.code}
                type="button"
                className="button button-secondary"
                onClick={() => upsert.mutate({
                  ...selected,
                  planCode: p.code,
                  planName: p.name,
                  amountMonthly: p.amount,
                  seatsIncluded: p.seats,
                  status: selected.status === 'NONE' ? 'TRIAL' : selected.status,
                  paymentLink: payLink || selected.paymentLink || undefined,
                })}
              >
                {p.name} · {money(p.amount)}/mo
              </button>
            ))}
          </div>

          <label className="field">
            <span>Payment link (UPI / Razorpay / Stripe checkout URL)</span>
            <input value={payLink} onChange={(e) => setPayLink(e.target.value)} placeholder="https://…" />
          </label>
          <button
            type="button"
            className="button button-secondary"
            style={{ marginBottom: 16 }}
            disabled={upsert.isPending}
            onClick={() => upsert.mutate({
              ...selected,
              planCode: selected.planCode === 'NONE' ? 'STARTER' : selected.planCode,
              planName: selected.planName === 'No plan' ? 'Starter' : selected.planName,
              amountMonthly: Number(selected.amountMonthly) || 4999,
              seatsIncluded: selected.seatsIncluded || 50,
              status: selected.status === 'NONE' ? 'TRIAL' : selected.status,
              paymentLink: payLink,
            })}
          >
            Save payment link / plan
          </button>

          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              recordPay.mutate()
            }}
            style={{ display: 'grid', gap: 10, maxWidth: 420 }}
          >
            <label className="field">
              <span>Record collection (INR)</span>
              <input value={payAmount} onChange={(e) => setPayAmount(e.target.value)} inputMode="decimal" required />
            </label>
            <label className="field">
              <span>Reference</span>
              <input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="UPI ref / txn id" />
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="button button-primary" type="submit" disabled={recordPay.isPending}>
                {recordPay.isPending ? 'Saving…' : 'Record payment'}
              </button>
              <button type="button" className="button button-secondary" onClick={() => setSelected(null)}>Close</button>
            </div>
          </form>
          <p className="muted" style={{ marginTop: 12 }}>Signed in as {user?.fullName} · platform owner</p>
        </div>
      ) : null}
    </div>
  )
}
