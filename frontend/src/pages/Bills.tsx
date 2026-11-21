import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FormEvent, useMemo, useState } from 'react'
import { Download, Plus, ReceiptText, Search, Wallet } from 'lucide-react'
import { api, type Bill, type Flat } from '../api'
import { useAuth } from '../auth'
import { Empty, ErrorBanner, Field, Modal, PageHeading, Status } from '../components/UI'

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

export default function Bills() {
  const { user, can } = useAuth()
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [payBill, setPayBill] = useState<Bill | null>(null)
  const [error, setError] = useState('')

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['bills'],
    queryFn: async () => (await api.get<Bill[]>('/bills')).data,
  })

  const { data: flats = [] } = useQuery({
    queryKey: ['flats'],
    queryFn: async () => (await api.get<Flat[]>('/flats')).data,
    enabled: can('bill.create'),
  })

  const rows = useMemo(
    () => data.filter((x) => `${x.flatNumber} ${x.billType} ${x.status}`.toLowerCase().includes(q.toLowerCase())),
    [data, q],
  )

  const createBill = useMutation({
    mutationFn: async (body: object) => (await api.post('/bills', body)).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['bills'] })
      setCreateOpen(false)
      setError('')
    },
    onError: (err: any) => setError(err?.response?.data?.message || 'Could not create bill'),
  })

  const pay = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) =>
      (await api.post(`/bills/${id}/payments`, {
        amount, method: 'UPI', reference: `PAY-${Date.now()}`,
      })).data,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['bills'] })
      setPayBill(null)
      setError('')
    },
    onError: (err: any) => setError(err?.response?.data?.message || 'Could not record payment'),
  })

  function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    createBill.mutate({
      flatId: fd.get('flatId'),
      billType: fd.get('billType'),
      billingPeriod: fd.get('billingPeriod'),
      amount: Number(fd.get('amount')),
      dueDate: fd.get('dueDate'),
    })
  }

  function onPay(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!payBill) return
    const fd = new FormData(e.currentTarget)
    pay.mutate({ id: payBill.id, amount: Number(fd.get('amount')) })
  }

  const subtitle = user?.role === 'RESIDENT'
    ? `Bills for your flat${user.flatNumber ? ` ${user.flatNumber}` : ''}.`
    : 'Create charges, track collections and keep every payment accounted for.'

  return (
    <>
      <PageHeading
        eyebrow="FINANCE / BILLING"
        title="Billing & payments"
        subtitle={subtitle}
        action={(
          <>
            {can('bill.pay') && <button className="button button-secondary" type="button"><Download size={16} /> Export</button>}
            {can('bill.create') && (
              <button className="button button-primary" type="button" onClick={() => { setError(''); setCreateOpen(true) }}>
                <Plus size={17} /> Create bill
              </button>
            )}
          </>
        )}
      />

      <div className="mini-stats">
        <div><small>Total bills</small><b>{data.length}</b></div>
        <div><small>Paid</small><b>{data.filter((x) => x.status === 'PAID').length}</b></div>
        <div><small>Pending balance</small><b>{fmt(data.reduce((s, x) => s + x.balance, 0))}</b></div>
      </div>

      {isError && <div className="form-error">Could not load bills.</div>}

      <div className="panel table-panel">
        <div className="table-toolbar">
          <div className="table-title"><ReceiptText size={18} /><b>All invoices</b><span>{data.length} records</span></div>
          <div className="table-tools">
            <div className="table-search"><Search size={15} /><input placeholder="Search bills..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>FLAT</th><th>BILL TYPE</th><th>PERIOD</th><th>AMOUNT</th><th>PAID</th><th>DUE DATE</th><th>STATUS</th>
                {can('bill.pay') && <th>ACTION</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={8}>Loading bills…</td></tr> : rows.map((b) => (
                <tr key={b.id}>
                  <td><b>{b.flatNumber}</b></td>
                  <td>{b.billType}</td>
                  <td>{b.billingPeriod}</td>
                  <td>{fmt(b.amount)}</td>
                  <td>{fmt(b.paidAmount)}</td>
                  <td>{b.dueDate}</td>
                  <td><Status value={b.status} /></td>
                  {can('bill.pay') && (
                    <td>
                      {b.balance > 0 ? (
                        <button className="button button-secondary button-sm" type="button" onClick={() => { setError(''); setPayBill(b) }}>
                          <Wallet size={14} /> Record payment
                        </button>
                      ) : '—'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && !rows.length && <Empty title="No bills found" description="Create a bill or adjust your search." />}
        </div>
      </div>

      {createOpen && (
        <Modal title="Create bill" subtitle="Charge a flat for the selected period." onClose={() => setCreateOpen(false)}>
          <form className="form-grid" onSubmit={onCreate}>
            <Field label="Flat">
              <select name="flatId" required defaultValue="">
                <option value="" disabled>Select flat</option>
                {flats.map((f) => <option key={f.id} value={f.id}>{f.flatNumber}</option>)}
              </select>
            </Field>
            <Field label="Bill type">
              <select name="billType" defaultValue="MAINTENANCE">
                <option value="MAINTENANCE">Maintenance</option>
                <option value="WATER">Water</option>
                <option value="PARKING">Parking</option>
              </select>
            </Field>
            <Field label="Billing period (YYYY-MM)">
              <input name="billingPeriod" required pattern="\d{4}-(0[1-9]|1[0-2])" placeholder="2026-11" />
            </Field>
            <Field label="Amount (INR)">
              <input name="amount" type="number" min="1" step="0.01" required />
            </Field>
            <Field label="Due date">
              <input name="dueDate" type="date" required />
            </Field>
            <ErrorBanner message={error} />
            <div className="form-actions">
              <button type="button" className="button button-secondary" onClick={() => setCreateOpen(false)}>Cancel</button>
              <button type="submit" className="button button-primary" disabled={createBill.isPending}>
                {createBill.isPending ? 'Saving…' : 'Create bill'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {payBill && (
        <Modal title={`Record payment · ${payBill.flatNumber}`} subtitle={`Outstanding ${fmt(payBill.balance)}`} onClose={() => setPayBill(null)}>
          <form className="form-grid" onSubmit={onPay}>
            <Field label="Amount (INR)">
              <input name="amount" type="number" min="0.01" step="0.01" max={payBill.balance} defaultValue={payBill.balance} required />
            </Field>
            <ErrorBanner message={error} />
            <div className="form-actions">
              <button type="button" className="button button-secondary" onClick={() => setPayBill(null)}>Cancel</button>
              <button type="submit" className="button button-primary" disabled={pay.isPending}>
                {pay.isPending ? 'Saving…' : 'Confirm payment'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}
