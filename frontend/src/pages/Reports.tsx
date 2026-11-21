import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from 'recharts'
import { billingApi, complaintApi, dashboardApi, occupancyApi, propertyApi } from '../services'
import { Empty, ErrorBanner, KpiCard, PageHeading, Status } from '../components/UI'
import { money } from '../lib/format'
import { Building2, CircleAlert, Download, Home, Wallet } from 'lucide-react'
import { useSociety } from '../society'

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function Reports() {
  const { scopeParam } = useSociety()

  const summary = useQuery({
    queryKey: ['dashboard', scopeParam],
    queryFn: () => dashboardApi.summary(scopeParam),
  })
  const bills = useQuery({
    queryKey: ['bills', scopeParam],
    queryFn: () => billingApi.list(scopeParam),
  })
  const flats = useQuery({
    queryKey: ['flats', scopeParam],
    queryFn: () => propertyApi.flats(scopeParam),
  })
  const complaints = useQuery({
    queryKey: ['complaints', scopeParam],
    queryFn: () => complaintApi.list(scopeParam),
  })
  const occupancies = useQuery({
    queryKey: ['occupancies', scopeParam],
    queryFn: () => occupancyApi.list(scopeParam),
  })

  const byType = useMemo(() => {
    const map = new Map<string, { type: string; billed: number; collected: number }>()
    for (const b of bills.data ?? []) {
      const row = map.get(b.billType) ?? { type: b.billType, billed: 0, collected: 0 }
      row.billed += Number(b.amount) || 0
      row.collected += Number(b.paidAmount) || 0
      map.set(b.billType, row)
    }
    return [...map.values()]
  }, [bills.data])

  const statusMix = useMemo(() => {
    const map = new Map<string, number>()
    for (const f of flats.data ?? []) map.set(f.status, (map.get(f.status) || 0) + 1)
    return [...map.entries()].map(([status, count]) => ({ status, count }))
  }, [flats.data])

  const complaintMix = useMemo(() => Object.entries(
    (complaints.data ?? []).reduce<Record<string, number>>((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1
      return acc
    }, {}),
  ).map(([status, count]) => ({ status, count })), [complaints.data])

  const loading = summary.isLoading || bills.isLoading
  const err = summary.isError || bills.isError

  function exportBills() {
    const rows = [
      ['Flat', 'Type', 'Period', 'Amount', 'Paid', 'Balance', 'Due', 'Status'],
      ...(bills.data ?? []).map((b) => [
        b.flatNumber, b.billType, b.billingPeriod,
        String(b.amount), String(b.paidAmount), String(b.balance),
        b.dueDate, b.status,
      ].map((c) => c ?? '')),
    ]
    downloadCsv(`haven-bills-${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  function exportOccupancy() {
    const rows = [
      ['Flat', 'Resident', 'Type', 'Status', 'Started', 'Ended'],
      ...(occupancies.data ?? []).map((o) => [
        o.flatNumber, o.residentName || '', o.occupancyType, o.status,
        o.startedAt || '', o.endedAt || '',
      ].map((c) => c ?? '')),
    ]
    downloadCsv(`haven-occupancy-${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  return (
    <>
      <PageHeading
        eyebrow="Insights"
        title="Reports & analytics"
        subtitle="Aggregated from dashboard, billing, flats, occupancy and complaints — live APIs only."
        action={(
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="button button-secondary" onClick={exportBills} disabled={!bills.data?.length}>
              <Download size={15} /> Export bills CSV
            </button>
            <button type="button" className="button button-secondary" onClick={exportOccupancy} disabled={!occupancies.data?.length}>
              <Download size={15} /> Export occupancy CSV
            </button>
          </div>
        )}
      />

      {err && <ErrorBanner message="Could not load report datasets." />}

      <div className="kpi-grid">
        <KpiCard label="Collection rate" value={loading ? '…' : `${summary.data && summary.data.totalBilled
          ? Math.round((summary.data.collected / summary.data.totalBilled) * 100)
          : 0}%`} hint="Collected / billed" icon={<Wallet size={16} />} />
        <KpiCard label="Occupied flats" value={summary.data ? `${summary.data.occupiedFlats}` : '—'} hint={`${summary.data?.availableFlats ?? 0} available`} icon={<Home size={16} />} />
        <KpiCard label="Active occupancies" value={occupancies.data?.filter((o) => o.status === 'ACTIVE').length ?? '—'} hint="From occupancy API" icon={<Building2 size={16} />} />
        <KpiCard label="Open complaints" value={summary.data?.openComplaints ?? '—'} hint="Unresolved tickets" icon={<CircleAlert size={16} />} tone="down" />
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head"><div><h2>Revenue by bill type</h2><p>Billed vs collected</p></div></div>
          {byType.length ? (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byType}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="type" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                  <Tooltip formatter={(v: number) => money(v)} />
                  <Legend />
                  <Bar dataKey="billed" name="Billed" fill="#182438" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="collected" name="Collected" fill="#176B55" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <Empty title="No billing data" description="Create bills to populate this report." />}
        </div>

        <div className="panel">
          <div className="panel-head"><div><h2>Flat status mix</h2><p>From flats API</p></div></div>
          {statusMix.length ? (
            <div className="table-scroll">
              <table>
                <thead><tr><th>Status</th><th>Count</th></tr></thead>
                <tbody>
                  {statusMix.map((s) => (
                    <tr key={s.status}><td><Status value={s.status} /></td><td><b>{s.count}</b></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty title="No flats" description="Property inventory will appear here." />}
        </div>
      </div>

      <div className="table-panel">
        <div className="table-toolbar"><div className="table-title"><b>Complaint status breakdown</b></div></div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Status</th><th>Count</th></tr></thead>
            <tbody>
              {complaintMix.map(({ status, count }) => (
                <tr key={status}><td><Status value={status} /></td><td>{count}</td></tr>
              ))}
            </tbody>
          </table>
          {!complaints.isLoading && !complaintMix.length && (
            <Empty title="No complaints" description="Complaint analytics appear after tickets are raised." />
          )}
        </div>
      </div>
    </>
  )
}
