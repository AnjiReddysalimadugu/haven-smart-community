import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { billingApi, complaintApi, familyApi, occupancyApi, residentApi, visitorApi } from '../services'
import { useSociety } from '../society'
import { Empty, ErrorBanner, PageHeading, Skeleton, Status } from '../components/UI'
import { formatDate, formatDateTime, money } from '../lib/format'

const TABS = ['Overview', 'Family', 'Bills', 'Visitors', 'Complaints'] as const

export default function ResidentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { scopeParam } = useSociety()
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview')

  const residentQ = useQuery({
    queryKey: ['resident', id],
    queryFn: () => residentApi.get(id!),
    enabled: Boolean(id),
  })
  const resident = residentQ.data

  const bills = useQuery({
    queryKey: ['bills', scopeParam],
    queryFn: () => billingApi.list(scopeParam),
    enabled: Boolean(resident),
  })
  const visitors = useQuery({
    queryKey: ['visitors', scopeParam],
    queryFn: () => visitorApi.list(scopeParam),
    enabled: Boolean(resident),
  })
  const complaints = useQuery({
    queryKey: ['complaints', scopeParam],
    queryFn: () => complaintApi.list(scopeParam),
    enabled: Boolean(resident),
  })
  const family = useQuery({
    queryKey: ['family', scopeParam, resident?.flatId],
    queryFn: () => familyApi.list({ apartmentId: scopeParam, flatId: resident?.flatId ?? undefined }),
    enabled: Boolean(resident),
  })
  const history = useQuery({
    queryKey: ['occupancy-history', resident?.flatId],
    queryFn: () => occupancyApi.history(resident!.flatId!),
    enabled: Boolean(resident?.flatId),
  })

  const residentBills = useMemo(
    () => (bills.data ?? []).filter((b) => b.flatId === resident?.flatId || b.flatNumber === resident?.flatNumber),
    [bills.data, resident],
  )
  const residentVisitors = useMemo(
    () => (visitors.data ?? []).filter((v) => v.flatNumber === resident?.flatNumber),
    [visitors.data, resident],
  )
  const residentComplaints = useMemo(
    () => (complaints.data ?? []).filter((c) => c.flatNumber === resident?.flatNumber),
    [complaints.data, resident],
  )
  const residentFamily = useMemo(
    () => (family.data ?? []).filter((m) => !resident?.flatId || m.flatId === resident.flatId || m.flatNumber === resident?.flatNumber),
    [family.data, resident],
  )

  if (residentQ.isLoading) return <Skeleton style={{ height: 180, borderRadius: 12 }} />
  if (residentQ.isError) return <ErrorBanner message="Could not load resident." />
  if (!resident) {
    return (
      <Empty title="Resident not found" description="This resident may have been removed or is outside your society scope." />
    )
  }

  return (
    <>
      <button type="button" className="button button-ghost button-sm" onClick={() => navigate('/residents')} style={{ marginBottom: 12 }}>
        <ArrowLeft size={14} /> Back to residents
      </button>
      <PageHeading
        eyebrow="Resident"
        title={resident.fullName}
        subtitle={`${resident.email}${resident.flatNumber ? ` · Flat ${resident.flatNumber}` : ' · Unassigned'}`}
        action={<Status value={resident.active ? 'ACTIVE' : 'INACTIVE'} />}
      />

      <div className="detail-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" className={`detail-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="panel">
          <div className="profile-meta-grid">
            <div><div className="eyebrow">Flat</div><b>{resident.flatNumber || 'Unassigned'}</b></div>
            <div><div className="eyebrow">Society</div><b>{resident.apartmentName || '—'}</b></div>
            <div><div className="eyebrow">Joined</div><b>{formatDateTime(resident.createdAt)}</b></div>
            <div><div className="eyebrow">Status</div><Status value={resident.active ? 'ACTIVE' : 'INACTIVE'} /></div>
          </div>
          {resident.flatId && (
            <div style={{ marginTop: 18 }}>
              <div className="panel-head"><h2>Occupancy history</h2></div>
              {history.isLoading && <p className="muted">Loading…</p>}
              <div className="table-scroll">
                <table>
                  <thead><tr><th>Type</th><th>Status</th><th>Started</th><th>Ended</th></tr></thead>
                  <tbody>
                    {(history.data ?? []).map((h) => (
                      <tr key={h.id}>
                        <td>{h.occupancyType}</td>
                        <td><Status value={h.status} /></td>
                        <td>{formatDateTime(h.startedAt)}</td>
                        <td>{formatDateTime(h.endedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!history.isLoading && !(history.data ?? []).length && <Empty title="No history" description="No occupancy records yet." />}
              </div>
              <Link className="text-link" to={`/property/flats/${resident.flatId}`} style={{ display: 'inline-block', marginTop: 10 }}>
                Open flat details
              </Link>
            </div>
          )}
        </div>
      )}

      {tab === 'Family' && (
        <div className="table-panel">
          <div className="table-scroll">
            <table>
              <thead><tr><th>Name</th><th>Relation</th><th>Mobile</th><th>Status</th></tr></thead>
              <tbody>
                {residentFamily.map((m) => (
                  <tr key={m.id}>
                    <td><b>{m.fullName}</b></td>
                    <td>{m.relation}</td>
                    <td>{m.mobile || '—'}</td>
                    <td><Status value={m.active ? 'ACTIVE' : 'INACTIVE'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!residentFamily.length && <Empty title="No family members" description="Household members linked to this flat will appear here." />}
          </div>
        </div>
      )}

      {tab === 'Bills' && (
        <div className="table-panel">
          <div className="table-scroll">
            <table>
              <thead><tr><th>Type</th><th>Period</th><th>Amount</th><th>Due</th><th>Status</th></tr></thead>
              <tbody>
                {residentBills.map((b) => (
                  <tr key={b.id}>
                    <td>{b.billType}</td>
                    <td>{b.billingPeriod}</td>
                    <td>{money(b.amount)}</td>
                    <td>{formatDate(b.dueDate)}</td>
                    <td><Status value={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!residentBills.length && <Empty title="No bills" description="Invoices for this flat will show here." />}
          </div>
        </div>
      )}

      {tab === 'Visitors' && (
        <div className="table-panel">
          <div className="table-scroll">
            <table>
              <thead><tr><th>Visitor</th><th>Type</th><th>Expires</th><th>Status</th></tr></thead>
              <tbody>
                {residentVisitors.map((v) => (
                  <tr key={v.id}>
                    <td><b>{v.visitorName}</b></td>
                    <td>{v.visitType}</td>
                    <td>{formatDateTime(v.expiresAt)}</td>
                    <td><Status value={v.used ? 'USED' : (v.approvalStatus || 'APPROVED')} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!residentVisitors.length && <Empty title="No visitors" description="Guest passes for this flat will show here." />}
          </div>
        </div>
      )}

      {tab === 'Complaints' && (
        <div className="table-panel">
          <div className="table-scroll">
            <table>
              <thead><tr><th>Title</th><th>Category</th><th>Created</th><th>Status</th></tr></thead>
              <tbody>
                {residentComplaints.map((c) => (
                  <tr key={c.id}>
                    <td><b>{c.title}</b></td>
                    <td>{c.category}</td>
                    <td>{formatDateTime(c.createdAt)}</td>
                    <td><Status value={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!residentComplaints.length && <Empty title="No complaints" description="Service tickets for this flat will show here." />}
          </div>
        </div>
      )}
    </>
  )
}
