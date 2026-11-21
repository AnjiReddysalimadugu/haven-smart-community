import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { occupancyApi, parkingApi, propertyApi, residentApi } from '../services'
import { useAuth } from '../auth'
import { useSociety } from '../society'
import { Empty, ErrorBanner, PageHeading, Skeleton, Status } from '../components/UI'
import { formatDateTime } from '../lib/format'

export default function FlatDetail() {
  const { flatId } = useParams<{ flatId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { scopeParam } = useSociety()
  const isSuper = user?.role === 'SUPER_ADMIN'

  // Prefer society scope; SUPER_ADMIN also loads unscoped list so deep links work across societies.
  const scopedFlats = useQuery({
    queryKey: ['flats', scopeParam],
    queryFn: () => propertyApi.flats(scopeParam),
    enabled: Boolean(flatId),
  })
  const allFlats = useQuery({
    queryKey: ['flats', 'all'],
    queryFn: () => propertyApi.flats(null),
    enabled: Boolean(flatId) && isSuper && !scopedFlats.isLoading && !(scopedFlats.data ?? []).some((f) => f.id === flatId),
  })

  const flat = useMemo(() => {
    const fromScope = (scopedFlats.data ?? []).find((f) => f.id === flatId)
    if (fromScope) return fromScope
    return (allFlats.data ?? []).find((f) => f.id === flatId)
  }, [scopedFlats.data, allFlats.data, flatId])

  const apartmentIdForLists = flat ? undefined : scopeParam

  const history = useQuery({
    queryKey: ['occupancy-history', flatId],
    queryFn: () => occupancyApi.history(flatId!),
    enabled: Boolean(flatId),
  })
  const residents = useQuery({
    queryKey: ['residents', apartmentIdForLists ?? scopeParam],
    queryFn: () => residentApi.list(apartmentIdForLists ?? scopeParam),
    enabled: Boolean(flat),
  })
  const parking = useQuery({
    queryKey: ['parking', apartmentIdForLists ?? scopeParam],
    queryFn: () => parkingApi.list(apartmentIdForLists ?? scopeParam),
    enabled: Boolean(flat),
  })

  const occupant = useMemo(
    () => (residents.data ?? []).find((r) => r.flatId === flatId && r.active),
    [residents.data, flatId],
  )
  const slots = useMemo(
    () => (parking.data ?? []).filter((s) => s.flatId === flatId),
    [parking.data, flatId],
  )

  const loading = scopedFlats.isLoading || (isSuper && allFlats.isLoading && !flat)
  if (loading) return <Skeleton style={{ height: 140, borderRadius: 12 }} />
  if (scopedFlats.isError && allFlats.isError) return <ErrorBanner message="Could not load flat." />
  if (!flat) return <Empty title="Flat not found" description="This flat may be outside your society scope." />

  return (
    <>
      <button type="button" className="button button-ghost button-sm" onClick={() => navigate('/property')} style={{ marginBottom: 12 }}>
        <ArrowLeft size={14} /> Back to property
      </button>
      <PageHeading
        eyebrow="Flat"
        title={flat.flatNumber}
        subtitle={`${flat.bedroomCount ?? '—'} BR · ${flat.areaSqft ?? '—'} sqft`}
        action={<Status value={flat.status} />}
      />

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
        <div className="kpi-card">
          <div className="kpi-top"><span>Resident</span></div>
          <strong style={{ fontSize: 18 }}>
            {occupant ? <Link to={`/residents/${occupant.id}`}>{occupant.fullName}</Link> : 'Vacant'}
          </strong>
          {occupant && <small>{occupant.email}</small>}
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span>Parking</span></div>
          <strong>{slots.length}</strong>
          <small>{slots.map((s) => s.slotCode).join(', ') || 'No slots'}</small>
        </div>
        <div className="kpi-card">
          <div className="kpi-top"><span>Status</span></div>
          <strong style={{ fontSize: 18 }}><Status value={flat.status} /></strong>
        </div>
      </div>

      <div className="table-panel">
        <div className="table-toolbar">
          <div className="table-title"><b>Occupancy history</b></div>
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Resident</th><th>Type</th><th>Status</th><th>Started</th><th>Ended</th></tr></thead>
            <tbody>
              {(history.data ?? []).map((h) => (
                <tr key={h.id}>
                  <td>{h.residentName}</td>
                  <td>{h.occupancyType}</td>
                  <td><Status value={h.status} /></td>
                  <td>{formatDateTime(h.startedAt)}</td>
                  <td>{formatDateTime(h.endedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!history.isLoading && !(history.data ?? []).length && (
            <Empty title="No occupancy history" description="Allocations for this flat will appear here." />
          )}
        </div>
      </div>
    </>
  )
}
