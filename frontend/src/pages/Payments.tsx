import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Bill } from '../api'
import { billingApi } from '../services'
import { useAuth } from '../auth'
import { useSociety } from '../society'
import {
  DataToolbar, Empty, ErrorBanner, Field, PageHeading, Pagination, ResponsiveSheet, Status, useToast,
} from '../components/UI'
import { apiError, formatDate, money, paginate } from '../lib/format'

export default function Payments() {
  const { can } = useAuth()
  const { scopeParam } = useSociety()
  const toast = useToast()
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [payBill, setPayBill] = useState<Bill | null>(null)
  const [error, setError] = useState('')

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['bills', scopeParam],
    queryFn: () => billingApi.list(scopeParam),
  })

  const open = useMemo(() => {
    let rows = data.filter((b) => Number(b.balance) > 0)
    if (q.trim()) {
      const t = q.toLowerCase()
      rows = rows.filter((b) => `${b.flatNumber} ${b.billType} ${b.status}`.toLowerCase().includes(t))
    }
    return rows.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  }, [data, q])

  const paged = paginate(open, page, 10)

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
    onError: (err) => setError(apiError(err, 'Payment failed')),
  })

  function onPay(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!payBill) return
    const fd = new FormData(e.currentTarget)
    const amount = Number(fd.get('amount'))
    const method = String(fd.get('method') || 'UPI')
    const reference = String(fd.get('reference') || '').trim() || `PAY-${Date.now()}`
    if (!(amount > 0) || amount > Number(payBill.balance)) {
      setError('Enter an amount greater than 0 and not exceeding the outstanding balance')
      return
    }
    setError('')
    pay.mutate({ id: payBill.id, amount, method, reference })
  }

  return (
    <>
      <PageHeading
        eyebrow="Financial"
        title="Payments"
        subtitle="Record collections against outstanding invoices from the live billing API."
      />

      <div className="mini-stats">
        <div><small>Open invoices</small><b>{open.length}</b></div>
        <div><small>Total due</small><b>{money(open.reduce((s, b) => s + Number(b.balance), 0))}</b></div>
      </div>

      {isError && <ErrorBanner message="Could not load payment queue." />}

      <div className="table-panel">
        <DataToolbar title="Outstanding balances" count={open.length} search={q} onSearch={(v) => { setQ(v); setPage(1) }} placeholder="Search flat or type…" />
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Flat</th><th>Type</th><th>Period</th><th>Due</th><th>Balance</th><th>Status</th>{can('bill.pay') && <th>Action</th>}</tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={7}>Loading…</td></tr>}
              {paged.slice.map((b) => (
                <tr key={b.id}>
                  <td><b>{b.flatNumber}</b></td>
                  <td>{b.billType}</td>
                  <td>{b.billingPeriod}</td>
                  <td>{formatDate(b.dueDate)}</td>
                  <td>{money(b.balance)}</td>
                  <td><Status value={b.status} /></td>
                  {can('bill.pay') && (
                    <td>
                      <button className="button button-primary button-sm" type="button" onClick={() => { setError(''); setPayBill(b) }}>
                        Record payment
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && !paged.slice.length && <Empty title="Nothing outstanding" description="All loaded invoices are fully paid." />}
        </div>
        <Pagination page={page} pageSize={10} total={open.length} onPageChange={setPage} />
      </div>

      <ResponsiveSheet
        open={Boolean(payBill)}
        title={`Payment · ${payBill?.flatNumber ?? ''}`}
        subtitle={payBill ? `${payBill.billType} · outstanding ${money(payBill.balance)}` : undefined}
        onClose={() => setPayBill(null)}
      >
        {payBill && (
          <form className="form-grid" onSubmit={onPay}>
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
            <Field label="Reference" hint="Optional — auto-generated if left blank">
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
    </>
  )
}
