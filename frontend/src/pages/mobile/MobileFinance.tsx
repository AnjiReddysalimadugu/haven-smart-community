import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { billingApi, receiptApi } from '../../services'
import { useAuth } from '../../auth'
import { useSociety } from '../../society'
import { Empty, ErrorBanner, Field, Skeleton, Status } from '../../components/UI'
import {
  BottomSheet, PageHeader, PullToRefresh, SegmentedControl,
} from '../../components/mobile/primitives'
import SocietySwitcher from '../../components/SocietySwitcher'
import { apiError, formatDate, money } from '../../lib/format'
import { haptic } from '../../lib/haptics'

const METHODS = ['CASH', 'UPI', 'CARD'] as const

export default function MobileFinance() {
  const { can } = useAuth()
  const { scopeParam } = useSociety()
  const qc = useQueryClient()
  const [seg, setSeg] = useState<'dues' | 'receipts' | 'bills'>('dues')
  const [selected, setSelected] = useState<string | null>(null)
  const [refundId, setRefundId] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<(typeof METHODS)[number]>('UPI')
  const [reference, setReference] = useState('')
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [error, setError] = useState('')

  const bills = useQuery({
    queryKey: ['bills', scopeParam],
    queryFn: () => billingApi.list(scopeParam),
  })
  const receipts = useQuery({
    queryKey: ['receipts', scopeParam],
    queryFn: () => receiptApi.list(scopeParam),
    enabled: seg === 'receipts',
  })

  const due = useMemo(
    () => (bills.data ?? []).filter((b) => Number(b.balance) > 0),
    [bills.data],
  )
  const refundable = useMemo(
    () => (bills.data ?? []).filter((b) => Number(b.paidAmount) > 0),
    [bills.data],
  )
  const selectedBill = due.find((b) => b.id === selected)
  const refundBill = refundable.find((b) => b.id === refundId)

  const invalidateFinance = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['bills'] }),
      qc.invalidateQueries({ queryKey: ['receipts'] }),
      qc.invalidateQueries({ queryKey: ['dashboard'] }),
    ])
  }

  const pay = useMutation({
    mutationFn: () => billingApi.pay(selected!, {
      amount: Number(amount),
      method,
      reference: reference.trim() || `PWA-${method}-${Date.now()}`,
    }),
    onSuccess: async () => {
      await invalidateFinance()
      setSelected(null)
      setAmount('')
      setReference('')
      setError('')
      haptic('success')
    },
    onError: (err) => setError(apiError(err, 'Payment failed')),
  })

  const refund = useMutation({
    mutationFn: () => billingApi.refund(refundId!, {
      amount: Number(refundAmount),
      reason: refundReason.trim(),
    }),
    onSuccess: async () => {
      await invalidateFinance()
      setRefundId(null)
      setRefundAmount('')
      setRefundReason('')
      setError('')
      haptic('success')
    },
    onError: (err) => setError(apiError(err, 'Refund failed')),
  })

  return (
    <PullToRefresh onRefresh={async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['bills'] }),
        qc.invalidateQueries({ queryKey: ['receipts'] }),
      ])
    }}
    >
      <PageHeader
        eyebrow="Collections"
        title="Finance"
        subtitle="Dues, receipts, refunds and billing"
        trailing={<SocietySwitcher />}
      />

      <SegmentedControl
        value={seg}
        onChange={(v) => setSeg(v as typeof seg)}
        options={[
          { value: 'dues', label: 'Dues' },
          { value: 'receipts', label: 'Receipts' },
          { value: 'bills', label: 'Bills' },
        ]}
      />

      {seg === 'dues' ? (
        <>
          {bills.isLoading ? <Skeleton style={{ height: 80 }} /> : null}
          {bills.isError ? <ErrorBanner message="Could not load bills." /> : null}
          {!bills.isLoading && !due.length ? <Empty title="All clear" description="No outstanding balances." /> : null}
          {due.map((b) => (
            <button
              key={b.id}
              type="button"
              className="list-row glass-card"
              onClick={() => { setSelected(b.id); setAmount(String(b.balance)); setError('') }}
            >
              <div>
                <b>Flat {b.flatNumber} · {b.billType}</b>
                <span>{b.billingPeriod} · due {formatDate(b.dueDate)}</span>
              </div>
              <div className="list-row-end">
                <strong>{money(b.balance)}</strong>
                <Status value={b.status} />
              </div>
            </button>
          ))}
          {can('bill.refund') && refundable.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <b style={{ fontSize: 13 }}>Refunds</b>
              {refundable.slice(0, 8).map((b) => (
                <button
                  key={`rf-${b.id}`}
                  type="button"
                  className="list-row glass-card"
                  onClick={() => {
                    setRefundId(b.id)
                    setRefundAmount(String(b.paidAmount))
                    setRefundReason('')
                    setError('')
                  }}
                >
                  <div>
                    <b>Refund · Flat {b.flatNumber}</b>
                    <span>Paid {money(b.paidAmount)} · {b.billType}</span>
                  </div>
                  <Status value={b.status} />
                </button>
              ))}
            </div>
          )}
        </>
      ) : null}

      {seg === 'receipts' ? (
        <>
          {receipts.isLoading ? <Skeleton style={{ height: 80 }} /> : null}
          {(receipts.data ?? []).slice(0, 40).map((r) => (
            <div key={r.id} className="list-row glass-card">
              <div>
                <b>{r.receiptNumber}</b>
                <span>Flat {r.flatNumber} · {r.billType} · {formatDate(r.paidAt)}</span>
              </div>
              <strong>{money(r.amount)}</strong>
            </div>
          ))}
          {!receipts.isLoading && !(receipts.data ?? []).length ? (
            <Empty title="No receipts" description="Collected payments appear here." />
          ) : null}
          <Link to="/receipts" className="button button-ghost full" style={{ marginTop: 8 }}>Full ledger</Link>
        </>
      ) : null}

      {seg === 'bills' ? (
        <div className="glass-card" style={{ padding: 16, display: 'grid', gap: 10 }}>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
            Create utility invoices by type (same ACL as desktop billing).
          </p>
          {can('bill.create') ? (
            <>
              <Link to="/billing/maintenance" className="button button-primary full">Create maintenance bill</Link>
              <Link to="/billing/water" className="button button-secondary full">Water bills</Link>
              <Link to="/billing/electricity" className="button button-secondary full">Electricity bills</Link>
            </>
          ) : (
            <Empty title="Create restricted" description="Your role can collect payments but not create invoices." />
          )}
        </div>
      ) : null}

      <BottomSheet
        open={!!selectedBill}
        title={selectedBill ? `Flat ${selectedBill.flatNumber}` : 'Payment'}
        subtitle={selectedBill ? `${selectedBill.billType} · balance ${money(selectedBill.balance)}` : undefined}
        onClose={() => setSelected(null)}
      >
        <div className="segmented" style={{ marginBottom: 12 }}>
          {METHODS.map((m) => (
            <button
              key={m}
              type="button"
              className={`segmented-item ${method === m ? 'active' : ''}`}
              onClick={() => setMethod(m)}
            >
              {m}
            </button>
          ))}
        </div>
        <Field label="Amount"><input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Reference"><input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UPI / receipt no." /></Field>
        <ErrorBanner message={error} />
        <button
          type="button"
          className="button button-primary full"
          disabled={pay.isPending || !Number(amount) || Number(amount) <= 0}
          onClick={() => pay.mutate()}
        >
          {pay.isPending ? 'Posting…' : 'Record payment'}
        </button>
      </BottomSheet>

      <BottomSheet
        open={!!refundBill}
        title={refundBill ? `Refund · Flat ${refundBill.flatNumber}` : 'Refund'}
        subtitle={refundBill ? `Paid ${money(refundBill.paidAmount)} · append-only correction` : undefined}
        onClose={() => setRefundId(null)}
      >
        <Field label="Refund amount">
          <input inputMode="decimal" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} />
        </Field>
        <Field label="Reason">
          <textarea rows={3} value={refundReason} onChange={(e) => setRefundReason(e.target.value)} placeholder="Duplicate payment…" />
        </Field>
        <ErrorBanner message={error} />
        <button
          type="button"
          className="button button-primary full"
          disabled={
            refund.isPending
            || !Number(refundAmount)
            || Number(refundAmount) <= 0
            || refundReason.trim().length < 3
          }
          onClick={() => refund.mutate()}
        >
          {refund.isPending ? 'Saving…' : 'Confirm refund'}
        </button>
      </BottomSheet>
    </PullToRefresh>
  )
}
