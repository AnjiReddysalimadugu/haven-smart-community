import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { receiptApi } from '../services'
import { DataToolbar, Empty, ErrorBanner, PageHeading, Pagination, Status } from '../components/UI'
import { formatDateTime, money, moneyExact, paginate } from '../lib/format'

export default function Receipts() {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['receipts'],
    queryFn: () => receiptApi.list(),
  })

  const rows = useMemo(() => {
    let list = data
    if (q.trim()) {
      const t = q.toLowerCase()
      list = list.filter((r) =>
        `${r.receiptNumber} ${r.flatNumber} ${r.billType} ${r.reference} ${r.method}`.toLowerCase().includes(t))
    }
    return list
  }, [data, q])

  const paged = paginate(rows, page, 10)

  return (
    <>
      <PageHeading
        title="Receipts"
        subtitle="Official payment receipts from the billing ledger API."
      />

      <div className="mini-stats">
        <div><small>Receipts</small><b>{rows.length}</b></div>
        <div><small>Total collected</small><b>{money(rows.reduce((s, r) => s + Number(r.amount), 0))}</b></div>
      </div>

      {isError && <ErrorBanner message="Could not load receipts." />}

      <div className="table-panel">
        <DataToolbar title="Payment receipts" count={rows.length} search={q} onSearch={(v) => { setQ(v); setPage(1) }} />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Receipt</th><th>Flat</th><th>Type</th><th>Period</th><th>Amount</th><th>Method</th><th>Paid at</th><th>Bill</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={8}>Loading…</td></tr>}
              {paged.slice.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>{r.receiptNumber}</b>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.reference}</div>
                  </td>
                  <td>{r.flatNumber}</td>
                  <td>{r.billType}</td>
                  <td>{r.billingPeriod}</td>
                  <td>{moneyExact(r.amount)}</td>
                  <td>{r.method}</td>
                  <td>{formatDateTime(r.paidAt)}</td>
                  <td><Status value={r.billStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && !paged.slice.length && (
            <Empty title="No receipts yet" description="Receipts appear when payments are recorded against bills." />
          )}
        </div>
        <Pagination page={page} pageSize={10} total={rows.length} onPageChange={setPage} />
      </div>
    </>
  )
}
