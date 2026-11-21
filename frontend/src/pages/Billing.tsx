import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Plus, RotateCcw, Wallet } from 'lucide-react'
import type { Bill } from '../api'
import { billingApi, propertyApi } from '../services'
import { useAuth } from '../auth'
import { useSociety } from '../society'
import {
  DataToolbar, DateField, Empty, ErrorBanner, Field, PageHeading,
  Pagination, ResponsiveSheet, Status, useToast,
} from '../components/UI'
import { apiError, formatDate, money, paginate, sortBy } from '../lib/format'

type Props = { billType: string; title: string; subtitle: string }

export default function Billing({ billType, title, subtitle }: Props) {
  const { can } = useAuth()
  const { scopeParam } = useSociety()
  const toast = useToast()
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('ALL')
  const [sortKey, setSortKey] = useState<keyof Bill>('dueDate')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [payBill, setPayBill] = useState<Bill | null>(null)
  const [refundBill, setRefundBill] = useState<Bill | null>(null)
  const [viewBill, setViewBill] = useState<Bill | null>(null)
  const [error, setError] = useState('')

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['bills', scopeParam],
    queryFn: () => billingApi.list(scopeParam),
  })

  const { data: flats = [] } = useQuery({
    queryKey: ['flats', scopeParam],
    queryFn: () => propertyApi.flats(scopeParam),
    enabled: can('bill.create'),
  })

  const filtered = useMemo(() => {
    let rows = data.filter((b) => b.billType === billType)
    if (status !== 'ALL') rows = rows.filter((b) => b.status === status)
    if (q.trim()) {
      const t = q.toLowerCase()
      rows = rows.filter((b) => `${b.flatNumber} ${b.billingPeriod} ${b.status}`.toLowerCase().includes(t))
    }
    return sortBy(rows, sortKey, sortDir)
  }, [data, billType, status, q, sortKey, sortDir])

  const paged = paginate(filtered, page, 8)

  const createBill = useMutation({
    mutationFn: (body: object) => billingApi.create(body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['bills'] })
      setCreateOpen(false)
      toast.success('Bill created')
    },
    onError: (err) => setError(apiError(err, 'Could not create bill')),
  })

  const pay = useMutation({
    mutationFn: ({ id, amount, method, reference }: { id: string; amount: number; method: string; reference: string }) =>
      billingApi.pay(id, { amount, method, reference }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['bills'] }),
        qc.invalidateQueries({ queryKey: ['receipts'] }),
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
      ])
      setPayBill(null)
      toast.success('Payment recorded')
    },
    onError: (err) => setError(apiError(err, 'Could not record payment')),
  })

  const refund = useMutation({
    mutationFn: ({ id, amount, reason, reference }: { id: string; amount: number; reason: string; reference?: string }) =>
      billingApi.refund(id, { amount, reason, reference }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['bills'] }),
        qc.invalidateQueries({ queryKey: ['receipts'] }),
        qc.invalidateQueries({ queryKey: ['dashboard'] }),
      ])
      setRefundBill(null)
      setViewBill(null)
      toast.success('Refund recorded')
    },
    onError: (err) => setError(apiError(err, 'Could not record refund')),
  })

  function toggleSort(key: keyof Bill) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const amount = Number(fd.get('amount'))
    const billingPeriod = String(fd.get('billingPeriod') || '')
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(billingPeriod)) {
      setError('Billing period must be YYYY-MM')
      return
    }
    if (!(amount > 0)) {
      setError('Amount must be greater than zero')
      return
    }
    setError('')
    createBill.mutate({
      flatId: fd.get('flatId'),
      billType,
      billingPeriod,
      amount,
      dueDate: fd.get('dueDate'),
    })
  }

  return (
    <>
      <PageHeading
        eyebrow="Financial"
        title={title}
        subtitle={subtitle}
        action={can('bill.create') ? (
          <button className="button button-primary" type="button" onClick={() => { setError(''); setCreateOpen(true) }}>
            <Plus size={16} /> Create bill
          </button>
        ) : undefined}
      />

      <div className="mini-stats">
        <div><small>Invoices</small><b>{filtered.length}</b></div>
        <div><small>Outstanding</small><b>{money(filtered.reduce((s, b) => s + Number(b.balance || 0), 0))}</b></div>
        <div><small>Collected</small><b>{money(filtered.reduce((s, b) => s + Number(b.paidAmount || 0), 0))}</b></div>
      </div>

      {isError && <ErrorBanner message="Could not load bills." />}

      <div className="table-panel">
        <DataToolbar title={`${billType} invoices`} count={filtered.length} search={q} onSearch={(v) => { setQ(v); setPage(1) }}>
          <select className="select" style={{ width: 'auto' }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
            <option value="ALL">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PARTIALLY_PAID">Partially paid</option>
            <option value="PAID">Paid</option>
          </select>
        </DataToolbar>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th className="sortable" onClick={() => toggleSort('flatNumber')}>Flat</th>
                <th className="sortable" onClick={() => toggleSort('billingPeriod')}>Period</th>
                <th className="sortable" onClick={() => toggleSort('amount')}>Amount</th>
                <th>Paid</th>
                <th className="sortable" onClick={() => toggleSort('dueDate')}>Due</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={7}>Loading bills…</td></tr>}
              {paged.slice.map((b) => (
                <tr key={b.id}>
                  <td><b>{b.flatNumber}</b></td>
                  <td>{b.billingPeriod}</td>
                  <td>{money(b.amount)}</td>
                  <td>{money(b.paidAmount)}</td>
                  <td>{formatDate(b.dueDate)}</td>
                  <td><Status value={b.status} /></td>
                  <td>
                    <div className="row-actions">
                      <button className="button button-ghost button-sm" type="button" onClick={() => setViewBill(b)}>
                        <Eye size={14} /> View
                      </button>
                      {can('bill.pay') && b.balance > 0 && (
                        <button className="button button-secondary button-sm" type="button" onClick={() => { setError(''); setPayBill(b) }}>
                          <Wallet size={14} /> Pay
                        </button>
                      )}
                      {can('bill.refund') && Number(b.paidAmount) > 0 && (
                        <button className="button button-ghost button-sm" type="button" onClick={() => { setError(''); setRefundBill(b) }}>
                          <RotateCcw size={14} /> Refund
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && !paged.slice.length && <Empty title="No bills found" description="Adjust filters or create a bill for this type." />}
        </div>
        <Pagination page={page} pageSize={8} total={filtered.length} onPageChange={setPage} />
      </div>

      <ResponsiveSheet open={createOpen} title={`Create ${billType.toLowerCase()} bill`} onClose={() => setCreateOpen(false)}>
        <form className="form-grid" onSubmit={onCreate}>
          <Field label="Flat">
            <select name="flatId" required defaultValue="">
              <option value="" disabled>Select flat</option>
              {flats.map((f) => <option key={f.id} value={f.id}>{f.flatNumber}</option>)}
            </select>
          </Field>
          <Field label="Billing period (YYYY-MM)"><input name="billingPeriod" required placeholder="2026-11" pattern="\d{4}-(0[1-9]|1[0-2])" /></Field>
          <Field label="Amount (INR)"><input name="amount" type="number" min="0.01" step="0.01" required /></Field>
          <DateField label="Due date" name="dueDate" required />
          <ErrorBanner message={error} />
          <div className="form-actions">
            <button type="button" className="button button-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button type="submit" className="button button-primary" disabled={createBill.isPending}>{createBill.isPending ? 'Saving…' : 'Create'}</button>
          </div>
        </form>
      </ResponsiveSheet>

      <ResponsiveSheet
        open={Boolean(payBill)}
        title={`Payment · ${payBill?.flatNumber ?? ''}`}
        subtitle={payBill ? `${payBill.billType} · outstanding ${money(payBill.balance)}` : undefined}
        onClose={() => setPayBill(null)}
      >
        {payBill && (
          <form className="form-grid" onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            const amount = Number(fd.get('amount'))
            const method = String(fd.get('method') || 'UPI')
            const reference = String(fd.get('reference') || '').trim() || `PAY-${Date.now()}`
            if (!(amount > 0) || amount > Number(payBill.balance)) {
              setError('Enter an amount within the outstanding balance')
              return
            }
            setError('')
            pay.mutate({ id: payBill.id, amount, method, reference })
          }}>
            <Field label="Amount (INR)">
              <input name="amount" type="number" min="0.01" step="0.01" max={payBill.balance} defaultValue={payBill.balance} required />
            </Field>
            <Field label="Method">
              <select name="method" defaultValue="UPI">
                <option value="UPI">UPI</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="NEFT">NEFT / bank transfer</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </Field>
            <Field label="Reference" hint="Optional — auto-generated if blank">
              <input name="reference" placeholder={`PAY-${Date.now()}`} />
            </Field>
            <ErrorBanner message={error} />
            <div className="form-actions">
              <button type="button" className="button button-secondary" onClick={() => setPayBill(null)}>Cancel</button>
              <button type="submit" className="button button-primary" disabled={pay.isPending}>{pay.isPending ? 'Saving…' : 'Confirm'}</button>
            </div>
          </form>
        )}
      </ResponsiveSheet>

      <ResponsiveSheet
        open={Boolean(viewBill)}
        title={`Bill · ${viewBill?.flatNumber ?? ''}`}
        subtitle={viewBill ? `${viewBill.billType} · ${viewBill.billingPeriod}` : undefined}
        onClose={() => setViewBill(null)}
      >
        {viewBill && (
          <>
            <div className="profile-meta-grid">
              <div><div className="eyebrow">Amount</div><b>{money(viewBill.amount)}</b></div>
              <div><div className="eyebrow">Paid</div><b>{money(viewBill.paidAmount)}</b></div>
              <div><div className="eyebrow">Balance</div><b>{money(viewBill.balance)}</b></div>
              <div><div className="eyebrow">Due</div><b>{formatDate(viewBill.dueDate)}</b></div>
              <div><div className="eyebrow">Status</div><Status value={viewBill.status} /></div>
            </div>
            {can('bill.refund') && Number(viewBill.paidAmount) > 0 && (
              <div className="form-actions" style={{ marginTop: 16 }}>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => { setError(''); setRefundBill(viewBill); setViewBill(null) }}
                >
                  <RotateCcw size={14} /> Issue refund
                </button>
              </div>
            )}
          </>
        )}
      </ResponsiveSheet>

      <ResponsiveSheet
        open={Boolean(refundBill)}
        title={`Refund · ${refundBill?.flatNumber ?? ''}`}
        subtitle={refundBill ? `Paid ${money(refundBill.paidAmount)} · append-only correction` : undefined}
        onClose={() => setRefundBill(null)}
      >
        {refundBill && (
          <form className="form-grid" onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            const amount = Number(fd.get('amount'))
            const reason = String(fd.get('reason') || '').trim()
            const reference = String(fd.get('reference') || '').trim() || undefined
            if (!(amount > 0) || amount > Number(refundBill.paidAmount)) {
              setError('Refund must be greater than 0 and not exceed paid amount')
              return
            }
            if (reason.length < 3) {
              setError('Provide a short reason for the refund')
              return
            }
            setError('')
            refund.mutate({ id: refundBill.id, amount, reason, reference })
          }}>
            <Field label="Refund amount (INR)">
              <input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                max={refundBill.paidAmount}
                defaultValue={refundBill.paidAmount}
                required
              />
            </Field>
            <Field label="Reason">
              <textarea name="reason" rows={3} required minLength={3} maxLength={240} placeholder="Duplicate payment, adjustment…" />
            </Field>
            <Field label="Reference" hint="Optional ledger note">
              <input name="reference" maxLength={120} placeholder="REFUND-…" />
            </Field>
            <ErrorBanner message={error} />
            <div className="form-actions">
              <button type="button" className="button button-secondary" onClick={() => setRefundBill(null)}>Cancel</button>
              <button type="submit" className="button button-primary" disabled={refund.isPending}>
                {refund.isPending ? 'Saving…' : 'Confirm refund'}
              </button>
            </div>
          </form>
        )}
      </ResponsiveSheet>
    </>
  )
}
