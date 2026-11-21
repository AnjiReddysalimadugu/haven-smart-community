import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { billingApi, propertyApi, residentApi, userApi } from '../services'
import { useAuth } from '../auth'
import { Empty, ErrorBanner, PageHeading, Skeleton, Status } from '../components/UI'
import { money } from '../lib/format'

const TABS = ['Overview', 'Property', 'Residents', 'Admins', 'Finance'] as const

export default function ApartmentDetail() {
  const { apartmentId } = useParams<{ apartmentId: string }>()
  const navigate = useNavigate()
  const { can } = useAuth()
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview')

  const apartments = useQuery({ queryKey: ['apartments'], queryFn: propertyApi.apartments })
  const apartment = useMemo(
    () => (apartments.data ?? []).find((a) => a.id === apartmentId),
    [apartments.data, apartmentId],
  )

  const blocks = useQuery({
    queryKey: ['blocks', apartmentId],
    queryFn: () => propertyApi.blocks(apartmentId!),
    enabled: Boolean(apartmentId),
  })
  const flats = useQuery({
    queryKey: ['flats', apartmentId],
    queryFn: () => propertyApi.flats(apartmentId),
    enabled: Boolean(apartmentId),
  })
  const residents = useQuery({
    queryKey: ['residents', apartmentId],
    queryFn: () => residentApi.list(apartmentId),
    enabled: Boolean(apartmentId),
  })
  const users = useQuery({
    queryKey: ['users', apartmentId],
    queryFn: () => userApi.list({ apartmentId }),
    enabled: Boolean(apartmentId) && can('user.manage'),
  })
  const bills = useQuery({
    queryKey: ['bills', apartmentId],
    queryFn: () => billingApi.list(apartmentId),
    enabled: Boolean(apartmentId),
  })

  const outstanding = useMemo(
    () => (bills.data ?? []).reduce((s, b) => s + Number(b.balance || 0), 0),
    [bills.data],
  )

  if (apartmentId === 'flats') {
    return <Empty title="Invalid apartment link" description="Use Property → flat cards, or open a specific society." />
  }

  if (apartments.isLoading) return <Skeleton style={{ height: 160, borderRadius: 12 }} />
  if (apartments.isError) return <ErrorBanner message="Could not load apartment." />
  if (!apartment) return <Empty title="Apartment not found" description="This society may be outside your scope." />

  const admins = (users.data ?? []).filter((u) =>
    ['APARTMENT_ADMIN', 'ADMIN', 'SUPER_ADMIN'].includes(u.role) && u.active)

  return (
    <>
      <button type="button" className="button button-ghost button-sm" onClick={() => navigate('/property')} style={{ marginBottom: 12 }}>
        <ArrowLeft size={14} /> Back to property
      </button>
      <PageHeading
        eyebrow="Apartment"
        title={apartment.name}
        subtitle={apartment.address}
        action={<Status value={apartment.status} />}
      />

      <div className="detail-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" className={`detail-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Overview' && (
        <div className="kpi-grid">
          <div className="kpi-card"><div className="kpi-top"><span>Blocks</span></div><strong>{blocks.data?.length ?? '—'}</strong></div>
          <div className="kpi-card"><div className="kpi-top"><span>Flats</span></div><strong>{flats.data?.length ?? '—'}</strong></div>
          <div className="kpi-card"><div className="kpi-top"><span>Residents</span></div><strong>{residents.data?.length ?? '—'}</strong></div>
          <div className="kpi-card"><div className="kpi-top"><span>Outstanding</span></div><strong>{money(outstanding)}</strong></div>
        </div>
      )}

      {tab === 'Property' && (
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Blocks</h2>
              <p>{blocks.data?.length ?? 0} blocks in this society</p>
            </div>
          </div>
          <ul style={{ margin: '0 0 16px', paddingLeft: 18, fontSize: 13.5 }}>
            {(blocks.data ?? []).map((b) => (
              <li key={b.id} style={{ marginBottom: 6 }}>
                <b>{b.name}</b> <span className="muted">({b.code})</span>
              </li>
            ))}
          </ul>
          {!blocks.data?.length && <Empty title="No blocks" description="Add blocks from the Property screen." />}
          <div className="panel-head" style={{ marginTop: 8 }}>
            <div><h2>Flats</h2><p>Open a flat for occupancy history</p></div>
          </div>
          <div className="flat-grid">
            {(flats.data ?? []).slice(0, 48).map((fl) => (
              <Link key={fl.id} to={`/property/flats/${fl.id}`} className={`flat-card ${fl.status === 'AVAILABLE' ? 'flat-free' : ''}`}>
                <div className="flat-card-top">
                  <b>{fl.flatNumber}</b>
                  <Status value={fl.status} />
                </div>
                <small>{fl.bedroomCount ?? '—'} BR</small>
              </Link>
            ))}
          </div>
          <Link className="button button-secondary button-sm" to="/property" style={{ marginTop: 12 }}>Manage structure</Link>
        </div>
      )}

      {tab === 'Residents' && (
        <div className="table-panel">
          <div className="table-scroll">
            <table>
              <thead><tr><th>Name</th><th>Flat</th><th>Email</th><th>Status</th></tr></thead>
              <tbody>
                {(residents.data ?? []).map((r) => (
                  <tr key={r.id}>
                    <td><Link to={`/residents/${r.id}`}><b>{r.fullName}</b></Link></td>
                    <td>{r.flatNumber || '—'}</td>
                    <td>{r.email}</td>
                    <td><Status value={r.active ? 'ACTIVE' : 'INACTIVE'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!residents.data?.length && <Empty title="No residents" description="Register residents for this society." />}
          </div>
        </div>
      )}

      {tab === 'Admins' && (
        <div className="table-panel">
          <div className="table-scroll">
            <table>
              <thead><tr><th>Name</th><th>Role</th><th>Email</th></tr></thead>
              <tbody>
                {admins.map((u) => (
                  <tr key={u.id}>
                    <td><b>{u.fullName}</b></td>
                    <td>{u.role}</td>
                    <td>{u.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!admins.length && <Empty title="No admins listed" description="Assign apartment admins from Staff & Security." />}
          </div>
          {can('user.manage') && <Link className="button button-secondary button-sm" to="/users" style={{ margin: 12 }}>Manage users</Link>}
        </div>
      )}

      {tab === 'Finance' && (
        <div className="panel">
          <div className="mini-stats">
            <div><small>Invoices</small><b>{bills.data?.length ?? 0}</b></div>
            <div><small>Outstanding</small><b>{money(outstanding)}</b></div>
            <div><small>Collected</small><b>{money((bills.data ?? []).reduce((s, b) => s + Number(b.paidAmount || 0), 0))}</b></div>
          </div>
          <Link className="button button-primary button-sm" to="/billing">Open billing</Link>
        </div>
      )}
    </>
  )
}