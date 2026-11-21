import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { ArrowRight, CircleAlert, Home, Wallet } from 'lucide-react'
import { billingApi, complaintApi, dashboardApi, platformApi, propertyApi } from '../services'
import { useAuth } from '../auth'
import { useSociety } from '../society'
import { Empty, ErrorBanner, Skeleton, Status } from '../components/UI'
import { formatDate, money } from '../lib/format'

export default function Dashboard() {
  const { user, can } = useAuth()
  const { scopeParam } = useSociety()
  const isStaff = user?.role === 'STAFF'

  if (user?.role === 'SUPER_ADMIN') return <PlatformOwnerHome />

  const summary = useQuery({
    queryKey: ['dashboard', scopeParam],
    queryFn: () => dashboardApi.summary(scopeParam),
    enabled: can('dashboard.view'),
  })

  const bills = useQuery({
    queryKey: ['bills', scopeParam],
    queryFn: () => billingApi.list(scopeParam),
    enabled: can('dashboard.view'),
  })

  const flats = useQuery({
    queryKey: ['flats', scopeParam],
    queryFn: () => propertyApi.flats(scopeParam),
    enabled: can('dashboard.view') && !isStaff,
  })

  const complaints = useQuery({
    queryKey: ['complaints', scopeParam],
    queryFn: () => complaintApi.list(scopeParam),
    enabled: can('dashboard.view'),
  })

  const chartData = useMemo(() => {
    const map = new Map<string, { period: string; billed: number; collected: number }>()
    for (const b of bills.data ?? []) {
      const row = map.get(b.billingPeriod) ?? { period: b.billingPeriod, billed: 0, collected: 0 }
      row.billed += Number(b.amount) || 0
      row.collected += Number(b.paidAmount) || 0
      map.set(b.billingPeriod, row)
    }
    return [...map.values()].sort((a, b) => a.period.localeCompare(b.period)).slice(-8)
  }, [bills.data])

  const dueQueue = useMemo(
    () => [...(bills.data ?? [])]
      .filter((b) => Number(b.balance) > 0)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, 6),
    [bills.data],
  )

  const openComplaints = (complaints.data ?? []).filter((c) => !['RESOLVED', 'CLOSED'].includes(c.status)).slice(0, 5)
  const data = summary.data
  const loading = summary.isLoading || bills.isLoading
  const firstName = user?.fullName?.split(' ')[0] ?? 'there'
  const society = user?.apartmentName ?? (user?.role === 'SUPER_ADMIN' ? 'All societies' : 'Your community')

  return (
    <div className="page-enter">
      <section className="pulse-hero">
        <div>
          <div className="eyebrow">{isStaff ? 'Collections desk' : 'Haven'}</div>
          <h1>{isStaff ? `Collect, ${firstName}` : `Welcome, ${firstName}`}</h1>
          <p>
            {isStaff
              ? `${society}. Record payments and keep tickets moving — desk tools only.`
              : `${society}. Occupancy, collections and tickets from live society APIs.`}
          </p>
          <div className="pulse-cta">
            {isStaff ? (
              <>
                <Link className="button button-brand" to="/payments">Take payment <ArrowRight size={15} /></Link>
                <Link className="button button-ghost-on-ink" to="/complaints">Tickets</Link>
              </>
            ) : (
              <>
                {can('reports.view') && (
                  <Link className="button button-brand" to="/reports">Reports <ArrowRight size={15} /></Link>
                )}
                <Link className="button button-ghost-on-ink" to="/property">Properties</Link>
              </>
            )}
          </div>
        </div>
        <div className="pulse-metrics">
          <div>
            <small>Outstanding</small>
            <b>{loading ? '…' : money(data?.pending ?? 0)}</b>
          </div>
          <div>
            <small>Collected</small>
            <b>{loading ? '…' : money(data?.collected ?? 0)}</b>
          </div>
          {!isStaff && (
            <div>
              <small>Occupancy</small>
              <b>{loading ? '…' : `${data?.occupiedFlats ?? 0}/${data?.flats ?? 0}`}</b>
            </div>
          )}
          <div>
            <small>Open tickets</small>
            <b>{loading ? '…' : (data?.openComplaints ?? openComplaints.length)}</b>
          </div>
        </div>
      </section>

      {(summary.isError || bills.isError) && <ErrorBanner message="Could not load dashboard data." />}

      {!isStaff && (
        <div className="kpi-grid" style={{ marginBottom: 22 }}>
          <div className="kpi-card">
            <div className="kpi-top"><span>Flats</span><div className="kpi-icon"><Home size={15} /></div></div>
            <strong>{data?.flats ?? (flats.data ?? []).length}</strong>
            <small>{data?.availableFlats ?? 0} available</small>
          </div>
          <div className="kpi-card">
            <div className="kpi-top"><span>Tickets</span><div className="kpi-icon"><CircleAlert size={15} /></div></div>
            <strong>{data?.openComplaints ?? openComplaints.length}</strong>
            <small className="kpi-hint-down">Open</small>
          </div>
          <div className="kpi-card">
            <div className="kpi-top"><span>Collection</span><div className="kpi-icon"><Wallet size={15} /></div></div>
            <strong>
              {data && data.totalBilled
                ? `${Math.round((data.collected / data.totalBilled) * 100)}%`
                : '—'}
            </strong>
            <small className="kpi-hint-up">Collected / billed</small>
          </div>
          <div className="kpi-card">
            <div className="kpi-top"><span>Blocks</span><div className="kpi-icon"><Home size={15} /></div></div>
            <strong>{data?.blocks ?? '—'}</strong>
            <small>In scope</small>
          </div>
        </div>
      )}

      <div className="grid-2">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>{isStaff ? 'Due queue' : 'Collections pulse'}</h2>
              <p>{isStaff ? 'Outstanding invoices by due date' : 'Billed vs collected by period'}</p>
            </div>
            <Link className="button button-ghost button-sm" to="/payments">Payments</Link>
          </div>
          {isStaff ? (
            dueQueue.length ? (
              <div className="table-scroll">
                <table>
                  <thead><tr><th>Flat</th><th>Type</th><th>Due</th><th>Balance</th></tr></thead>
                  <tbody>
                    {dueQueue.map((b) => (
                      <tr key={b.id}>
                        <td><b>{b.flatNumber}</b></td>
                        <td>{b.billType}</td>
                        <td>{formatDate(b.dueDate)}</td>
                        <td>{money(b.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <Empty title="Queue clear" description="No outstanding balances in scope." />
          ) : loading ? <Skeleton className="skeleton-card" /> : chartData.length ? (
            <div className="chart-box">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="havenFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#176B55" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#176B55" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="4 6" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => money(v)} />
                  <Area type="monotone" dataKey="collected" name="Collected" stroke="#176B55" fill="url(#havenFill)" strokeWidth={2} />
                  <Area type="monotone" dataKey="billed" name="Billed" stroke="#98A2B3" fill="transparent" strokeWidth={1.5} strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : <Empty title="No billing history" description="Create bills to populate this chart." />}
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Open complaints</h2>
              <p>{data?.openComplaints ?? openComplaints.length} open</p>
            </div>
            <Link className="button button-ghost button-sm" to="/complaints">Open</Link>
          </div>
          {complaints.isLoading ? <SkeletonRowsLocal /> : openComplaints.length ? (
            <div className="table-scroll">
              <table>
                <thead><tr><th>Title</th><th>Flat</th><th>Status</th></tr></thead>
                <tbody>
                  {openComplaints.map((c) => (
                    <tr key={c.id}>
                      <td><b>{c.title}</b></td>
                      <td>{c.flatNumber}</td>
                      <td><Status value={c.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty title="All clear" description="No open complaints right now." />}
        </div>
      </div>
    </div>
  )
}

function SkeletonRowsLocal() {
  return <div>{[1, 2, 3].map((i) => <div key={i} className="skeleton skeleton-row" />)}</div>
}

/** SaaS console — societies pay Haven; not flat electricity/water. */
function PlatformOwnerHome() {
  const { user } = useAuth()
  const firstName = user?.fullName?.split(' ')[0] ?? 'there'
  const summary = useQuery({ queryKey: ['platform-summary'], queryFn: () => platformApi.summary() })
  const p = summary.data
  const pastDue = (p?.subscriptions ?? []).filter((s) =>
    ['PAST_DUE', 'SUSPENDED', 'NONE'].includes(s.status),
  ).slice(0, 6)

  return (
    <div className="page-enter">
      <section className="pulse-hero">
        <div>
          <div className="eyebrow">Platform owner</div>
          <h1>Haven SaaS</h1>
          <p>
            Hi {firstName}. Track societies, seats, and subscription revenue —
            electricity / water / maintenance stay with each society admin.
          </p>
          <div className="pulse-cta">
            <Link className="button button-brand" to="/platform/revenue">
              Subscriptions & revenue <ArrowRight size={15} />
            </Link>
            <Link className="button button-ghost-on-ink" to="/property">Societies</Link>
            <Link className="button button-ghost-on-ink" to="/users">Users</Link>
          </div>
        </div>
        <div className="pulse-metrics">
          <div>
            <small>Active societies</small>
            <b>{summary.isLoading ? '…' : (p?.societiesActive ?? 0)}</b>
          </div>
          <div>
            <small>Active users</small>
            <b>{summary.isLoading ? '…' : (p?.usersActive ?? 0)}</b>
          </div>
          <div>
            <small>MRR</small>
            <b>{summary.isLoading ? '…' : money(p?.mrr ?? 0)}</b>
          </div>
          <div>
            <small>Collected</small>
            <b>{summary.isLoading ? '…' : money(p?.collectedTotal ?? 0)}</b>
          </div>
        </div>
      </section>

      {summary.isError ? <ErrorBanner message="Could not load platform summary." /> : null}

      <div className="kpi-grid" style={{ marginBottom: 22 }}>
        <div className="kpi-card">
          <div className="kpi-top"><span>Flats on platform</span><div className="kpi-icon"><Home size={15} /></div></div>
          <strong>{p?.flatsTotal ?? '—'}</strong>
          <small>Across all societies</small>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span>Due estimate</span><div className="kpi-icon"><Wallet size={15} /></div></div>
          <strong>{money(p?.outstandingEstimate ?? 0)}</strong>
          <small>Societies past next due</small>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span>Plans</span><div className="kpi-icon"><CircleAlert size={15} /></div></div>
          <strong>{p?.subscriptionsActive ?? 0}</strong>
          <small>{p?.subscriptionsTrial ?? 0} trial · {p?.subscriptionsPastDue ?? 0} past due</small>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div>
            <h2>Needs attention</h2>
            <p>No plan, past due, or suspended societies</p>
          </div>
          <Link className="button button-ghost button-sm" to="/platform/revenue">Manage</Link>
        </div>
        {summary.isLoading ? <Skeleton className="skeleton-card" /> : pastDue.length ? (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Society</th><th>Plan</th><th>Status</th><th>Monthly</th></tr></thead>
              <tbody>
                {pastDue.map((s) => (
                  <tr key={s.apartmentId}>
                    <td><b>{s.apartmentName}</b></td>
                    <td>{s.planName}</td>
                    <td><Status value={s.status} /></td>
                    <td>{money(s.amountMonthly)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="All healthy" description="Every society has an active or trial plan." />
        )}
      </div>
    </div>
  )
}
