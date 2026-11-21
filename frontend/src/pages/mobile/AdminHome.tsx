import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Building2, CircleAlert, ScanQrCode, Users, Wallet,
} from 'lucide-react'
import type { DashboardSummary } from '../../api'
import {
  billingApi, complaintApi, dashboardApi, platformApi, propertyApi, residentApi, userApi, visitorApi,
} from '../../services'
import { useAuth } from '../../auth'
import { useSociety } from '../../society'
import { Empty, ErrorBanner, Skeleton, Status } from '../../components/UI'
import { PageHeader, PullToRefresh, StatPill } from '../../components/mobile/primitives'
import SocietySwitcher from '../../components/SocietySwitcher'
import { formatDate, money } from '../../lib/format'
import { cacheDashboardSnapshot, readDashboardSnapshot } from '../../pwa/idb'
import { updateAppBadge } from '../../pwa/push'
import { useOnlineSync } from '../../pwa/online'

export default function AdminHome() {
  const { user, can } = useAuth()
  if (user?.role === 'SUPER_ADMIN') return <PlatformOwnerMobileHome />
  return <SocietyAdminMobileHome />
}

function PlatformOwnerMobileHome() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const firstName = user?.fullName?.split(' ')[0] ?? 'there'
  const summary = useQuery({ queryKey: ['platform-summary'], queryFn: () => platformApi.summary() })
  const p = summary.data

  return (
    <PullToRefresh onRefresh={async () => { await qc.invalidateQueries({ queryKey: ['platform-summary'] }) }}>
      <PageHeader
        eyebrow="Platform owner"
        title={`Hi, ${firstName}`}
        subtitle="Haven SaaS — societies pay you for the product"
      />
      {summary.isError ? <ErrorBanner message="Could not load platform summary." /> : null}
      {summary.isLoading ? <Skeleton style={{ height: 120 }} /> : null}
      <div className="stat-pill-grid">
        <StatPill label="Societies" value={String(p?.societiesActive ?? '—')} />
        <StatPill label="Users" value={String(p?.usersActive ?? '—')} />
        <StatPill label="Flats" value={String(p?.flatsTotal ?? '—')} />
        <StatPill label="MRR" value={money(p?.mrr ?? 0)} />
        <StatPill label="Collected" value={money(p?.collectedTotal ?? 0)} />
        <StatPill label="Due" value={money(p?.outstandingEstimate ?? 0)} />
      </div>
      <div className="mobile-actions" style={{ marginTop: 14 }}>
        <Link to="/platform/revenue" className="mobile-action glass-card">
          <Wallet size={18} /> Revenue <span>Plans & payment links</span>
        </Link>
        <Link to="/property" className="mobile-action glass-card">
          <Building2 size={18} /> Societies <span>Apartments & flats</span>
        </Link>
        <Link to="/users" className="mobile-action glass-card">
          <Users size={18} /> Users <span>Create · activate</span>
        </Link>
      </div>
      <section className="admin-section">
        <div className="admin-section-head">
          <h2>Subscriptions</h2>
          <Link to="/platform/revenue">Manage <ArrowRight size={14} /></Link>
        </div>
        {(p?.subscriptions ?? []).slice(0, 6).map((s) => (
          <Link key={s.apartmentId} to="/platform/revenue" className="list-row glass-card">
            <div>
              <b>{s.apartmentName}</b>
              <span>{s.planName} · {s.activeUsers}/{s.totalUsers} users</span>
            </div>
            <div className="list-row-end">
              <strong>{money(s.amountMonthly)}</strong>
              <Status value={s.status} />
            </div>
          </Link>
        ))}
        {!summary.isLoading && !(p?.subscriptions ?? []).length ? (
          <Empty title="No societies" description="Create a society from Property." />
        ) : null}
      </section>
    </PullToRefresh>
  )
}

function SocietyAdminMobileHome() {
  const { user, can } = useAuth()
  const { scopeParam } = useSociety()
  const qc = useQueryClient()
  const online = useOnlineSync()
  const firstName = user?.fullName?.split(' ')[0] ?? 'there'
  const [offlineSnap, setOfflineSnap] = useState<DashboardSummary | null>(null)

  useEffect(() => {
    let active = true
    void readDashboardSnapshot(scopeParam).then((row) => {
      if (!active) return
      const value = row?.value as DashboardSummary | undefined
      setOfflineSnap(value ?? null)
    })
    return () => { active = false }
  }, [scopeParam])

  const summary = useQuery({
    queryKey: ['dashboard', scopeParam],
    queryFn: async () => {
      const data = await dashboardApi.summary(scopeParam)
      void cacheDashboardSnapshot(scopeParam, data)
      return data
    },
    enabled: can('dashboard.view'),
  })
  const bills = useQuery({
    queryKey: ['bills', scopeParam],
    queryFn: () => billingApi.list(scopeParam),
    enabled: can('dashboard.view'),
  })
  const users = useQuery({
    queryKey: ['users', scopeParam],
    queryFn: () => userApi.list({ apartmentId: scopeParam }),
    enabled: can('dashboard.view'),
  })
  const residents = useQuery({
    queryKey: ['residents', scopeParam],
    queryFn: () => residentApi.list(scopeParam),
    enabled: can('dashboard.view'),
  })
  const visitors = useQuery({
    queryKey: ['visitors', scopeParam],
    queryFn: () => visitorApi.list(scopeParam),
    enabled: can('dashboard.view'),
  })
  const complaints = useQuery({
    queryKey: ['complaints', scopeParam],
    queryFn: () => complaintApi.list(scopeParam),
    enabled: can('dashboard.view'),
  })
  const due = useMemo(
    () => [...(bills.data ?? [])].filter((b) => Number(b.balance) > 0)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5),
    [bills.data],
  )
  const openTickets = (complaints.data ?? []).filter((c) => !['RESOLVED', 'CLOSED'].includes(c.status))
  const pendingPasses = (visitors.data ?? []).filter((v) => !v.exitAt)
  const adminCount = (users.data ?? []).filter((u) =>
    ['SUPER_ADMIN', 'APARTMENT_ADMIN', 'ADMIN', 'STAFF', 'SECURITY'].includes(u.role) && u.active).length
  const residentCount = (residents.data ?? []).filter((r) => r.active).length
  const data = summary.data ?? (!online && offlineSnap ? offlineSnap : undefined)
  const showingCached = !summary.data && Boolean(!online && offlineSnap)

  const activity = useMemo(() => {
    const items: { id: string; title: string; meta: string; at: string }[] = []
    for (const b of due.slice(0, 3)) {
      items.push({
        id: `bill-${b.id}`,
        title: `Due · Flat ${b.flatNumber} · ${b.billType}`,
        meta: `${money(b.balance)} · due ${formatDate(b.dueDate)}`,
        at: b.dueDate,
      })
    }
    for (const c of openTickets.slice(0, 3)) {
      items.push({
        id: `c-${c.id}`,
        title: c.title,
        meta: `Ticket · Flat ${c.flatNumber} · ${c.status}`,
        at: c.createdAt,
      })
    }
    for (const v of pendingPasses.slice(0, 3)) {
      items.push({
        id: `v-${v.id}`,
        title: `Visitor · ${v.visitorName}`,
        meta: `Flat ${v.flatNumber} · ${v.visitType}`,
        at: v.expiresAt,
      })
    }
    return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8)
  }, [due, openTickets, pendingPasses])

  useEffect(() => {
    void updateAppBadge(due.length + openTickets.length)
  }, [due.length, openTickets.length])

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['dashboard'] }),
      qc.invalidateQueries({ queryKey: ['bills'] }),
      qc.invalidateQueries({ queryKey: ['users'] }),
      qc.invalidateQueries({ queryKey: ['residents'] }),
      qc.invalidateQueries({ queryKey: ['visitors'] }),
      qc.invalidateQueries({ queryKey: ['complaints'] }),
    ])
  }

  return (
    <PullToRefresh onRefresh={refresh}>
      <PageHeader
        eyebrow="Platform"
        title={`Hi, ${firstName}`}
        subtitle="Live society operations"
        trailing={<SocietySwitcher />}
      />

      {summary.isError && !showingCached ? <ErrorBanner message="Could not load dashboard." /> : null}
      {showingCached ? (
        <ErrorBanner message="Showing last saved dashboard snapshot while offline." />
      ) : null}
      {summary.isLoading && !showingCached ? <Skeleton style={{ height: 120 }} /> : null}

      <div className="stat-pill-grid">
        <StatPill label="Admins" value={String(adminCount)} />
        <StatPill label="Residents" value={String(residentCount)} />
        <StatPill label="Flats" value={String(data?.flats ?? '—')} />
        <StatPill label="Occupied" value={String(data?.occupiedFlats ?? '—')} />
        <StatPill label="Collected" value={money(data?.collected ?? 0)} />
        <StatPill label="Outstanding" value={money(data?.pending ?? 0)} />
        <StatPill label="Tickets" value={String(data?.openComplaints ?? openTickets.length)} />
        <StatPill label="Passes" value={String(pendingPasses.length)} />
      </div>

      <div className="mobile-actions" style={{ marginTop: 14 }}>
        <Link to="/property" className="mobile-action glass-card">
          <Building2 size={18} /> Properties <span>Societies & flats</span>
        </Link>
        <Link to="/payments" className="mobile-action glass-card">
          <Wallet size={18} /> Finance <span>{due.length} open dues</span>
        </Link>
        <Link to="/users" className="mobile-action glass-card">
          <Users size={18} /> Users <span>Access & roles</span>
        </Link>
        <Link to="/visitors" className="mobile-action glass-card">
          <ScanQrCode size={18} /> Visitors <span>{pendingPasses.length} active</span>
        </Link>
      </div>

      <section className="admin-section">
        <div className="admin-section-head">
          <h2>Outstanding</h2>
          <Link to="/payments">See all <ArrowRight size={14} /></Link>
        </div>
        {!due.length && !bills.isLoading ? (
          <Empty title="All clear" description="No outstanding invoices in scope." />
        ) : null}
        {due.map((b) => (
          <Link key={b.id} to="/payments" className="list-row glass-card">
            <div>
              <b>Flat {b.flatNumber} · {b.billType}</b>
              <span>{b.billingPeriod} · due {formatDate(b.dueDate)}</span>
            </div>
            <div className="list-row-end">
              <strong>{money(b.balance)}</strong>
              <Status value={b.status} />
            </div>
          </Link>
        ))}
      </section>

      <section className="admin-section">
        <div className="admin-section-head">
          <h2>Open tickets</h2>
          <Link to="/complaints">Desk <ArrowRight size={14} /></Link>
        </div>
        {!openTickets.length && !complaints.isLoading ? (
          <Empty title="Queue clear" description="No open complaints." />
        ) : null}
        {openTickets.slice(0, 4).map((c) => (
          <Link key={c.id} to="/complaints" className="list-row glass-card">
            <div>
              <b>{c.title}</b>
              <span>Flat {c.flatNumber} · {c.category}</span>
            </div>
            <Status value={c.status} />
          </Link>
        ))}
      </section>

      <section className="admin-section">
        <div className="admin-section-head">
          <h2>Recent activity</h2>
          <Link to="/more/notifications">Feed <ArrowRight size={14} /></Link>
        </div>
        {!activity.length ? (
          <div className="list-row glass-card">
            <div>
              <b>No recent items</b>
              <span>Dues, tickets and passes appear here.</span>
            </div>
            <CircleAlert size={16} />
          </div>
        ) : null}
        {activity.map((a) => (
          <div key={a.id} className="list-row glass-card">
            <div>
              <b>{a.title}</b>
              <span>{a.meta}</span>
            </div>
          </div>
        ))}
      </section>
    </PullToRefresh>
  )
}
