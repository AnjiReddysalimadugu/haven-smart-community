import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import type { Apartment } from '../../api'
import { propertyApi } from '../../services'
import { useAuth } from '../../auth'
import { useSociety } from '../../society'
import { Empty, ErrorBanner, Field, Skeleton, Status } from '../../components/UI'
import { apiError } from '../../lib/format'
import {
  BottomSheet, ConfirmDialog, PageHeader, PullToRefresh, SegmentedControl,
} from '../../components/mobile/primitives'
import SocietySwitcher from '../../components/SocietySwitcher'
import { haptic } from '../../lib/haptics'

type Seg = 'societies' | 'flats' | 'occupancy' | 'residents'

export default function MobileProperties() {
  const { can } = useAuth()
  const { scopeParam, setApartmentId, isSuperAdmin } = useSociety()
  const qc = useQueryClient()
  const [seg, setSeg] = useState<Seg>('societies')
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [error, setError] = useState('')
  const [archiveId, setArchiveId] = useState<string | null>(null)

  const apartments = useQuery({ queryKey: ['apartments'], queryFn: propertyApi.apartments })
  const flats = useQuery({
    queryKey: ['flats', scopeParam],
    queryFn: () => propertyApi.flats(scopeParam),
    enabled: seg === 'flats' || seg === 'occupancy',
  })

  const active = useMemo(
    () => (apartments.data ?? []).filter((a) => a.status !== 'ARCHIVED'),
    [apartments.data],
  )

  const create = useMutation({
    mutationFn: () => propertyApi.createApartment({ name: name.trim(), address: address.trim(), timezone: 'Asia/Kolkata' }),
    onSuccess: async (apt) => {
      await qc.invalidateQueries({ queryKey: ['apartments'] })
      setCreating(false)
      setName('')
      setAddress('')
      setError('')
      setApartmentId(apt.id)
      haptic('success')
    },
    onError: (err) => setError(apiError(err, 'Could not create society')),
  })

  const archive = useMutation({
    mutationFn: (id: string) => propertyApi.archiveApartment(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['apartments'] })
      setArchiveId(null)
      haptic('medium')
    },
  })

  const openSociety = (a: Apartment) => {
    setApartmentId(a.id)
    haptic('light')
  }

  return (
    <PullToRefresh onRefresh={async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['apartments'] }),
        qc.invalidateQueries({ queryKey: ['flats'] }),
      ])
    }}
    >
      <PageHeader
        eyebrow="Portfolio"
        title="Properties"
        subtitle="Societies, flats and occupancy"
        trailing={<SocietySwitcher />}
      />

      <SegmentedControl
        value={seg}
        onChange={(v) => setSeg(v as Seg)}
        options={[
          { value: 'societies', label: 'Societies' },
          { value: 'flats', label: 'Flats' },
          { value: 'occupancy', label: 'Occupancy' },
          { value: 'residents', label: 'Residents' },
        ]}
      />

      {seg === 'societies' ? (
        <>
          {can('apartment.create') ? (
            <button type="button" className="button lime full" style={{ marginBottom: 12 }} onClick={() => setCreating(true)}>
              Add society
            </button>
          ) : null}
          {apartments.isLoading ? <Skeleton style={{ height: 80 }} /> : null}
          {apartments.isError ? <ErrorBanner message="Could not load societies." /> : null}
          {!apartments.isLoading && !active.length ? (
            <Empty title="No societies" description="Create the first apartment society." />
          ) : null}
          {active.map((a) => (
            <div key={a.id} className="list-row glass-card stack-actions">
              <button type="button" className="list-row-main" onClick={() => openSociety(a)}>
                <div>
                  <b>{a.name}</b>
                  <span>{a.address}</span>
                </div>
                <Status value={a.status} />
              </button>
              <div className="row-actions">
                <Link className="button ghost compact" to="/occupancy" onClick={() => setApartmentId(a.id)}>Occupancy</Link>
                {can('apartment.create') ? (
                  <button type="button" className="button danger compact" onClick={() => setArchiveId(a.id)}>Archive</button>
                ) : null}
              </div>
            </div>
          ))}
        </>
      ) : null}

      {seg === 'flats' ? (
        <>
          {flats.isLoading ? <Skeleton style={{ height: 80 }} /> : null}
          {(flats.data ?? []).map((f) => (
            <div key={f.id} className="list-row glass-card">
              <div>
                <b>{f.flatNumber}</b>
                <span>{f.areaSqft ? `${f.areaSqft} sqft` : 'Flat'}{f.bedroomCount != null ? ` · ${f.bedroomCount} BR` : ''}</span>
              </div>
              <Status value={f.status} />
            </div>
          ))}
          {!flats.isLoading && !(flats.data ?? []).length ? (
            <Empty title="No flats" description={isSuperAdmin && !scopeParam ? 'Pick a society to list flats.' : 'No flats in scope.'} />
          ) : null}
          <Link to="/property" className="button ghost full" style={{ marginTop: 8 }}>Open full property tree</Link>
        </>
      ) : null}

      {seg === 'occupancy' ? (
        <div className="glass-card" style={{ padding: 16 }}>
          <p style={{ margin: '0 0 12px', color: 'var(--text-muted)', fontSize: 13 }}>
            Allocate or release flats with the full occupancy desk.
          </p>
          <Link to="/occupancy" className="button primary full">Open occupancy</Link>
        </div>
      ) : null}

      {seg === 'residents' ? (
        <div className="glass-card" style={{ padding: 16 }}>
          <p style={{ margin: '0 0 12px', color: 'var(--text-muted)', fontSize: 13 }}>
            Register residents and link flats for the selected society.
          </p>
          <Link to="/residents" className="button primary full">Open residents</Link>
        </div>
      ) : null}

      <BottomSheet open={creating} title="Add society" subtitle="Onboard a new apartment complex" onClose={() => setCreating(false)}>
        <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Green Valley" /></Field>
        <Field label="Address"><textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} /></Field>
        <ErrorBanner message={error} />
        <button
          type="button"
          className="button lime full"
          disabled={create.isPending || name.trim().length < 2 || address.trim().length < 3}
          onClick={() => create.mutate()}
        >
          {create.isPending ? 'Creating…' : 'Create society'}
        </button>
      </BottomSheet>

      <ConfirmDialog
        open={!!archiveId}
        title="Archive society?"
        message="Archived societies leave the active portfolio. This can be reviewed later."
        confirmLabel="Archive"
        danger
        onCancel={() => setArchiveId(null)}
        onConfirm={() => archiveId && archive.mutate(archiveId)}
      />
    </PullToRefresh>
  )
}
