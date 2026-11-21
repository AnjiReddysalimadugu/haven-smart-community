import { Building2 } from 'lucide-react'
import { useSociety } from '../society'

/** Topbar society filter — SUPER_ADMIN only. Empty value = all societies. */
export default function SocietySwitcher() {
  const { isSuperAdmin, apartmentId, setApartmentId, apartments } = useSociety()
  if (!isSuperAdmin) return null

  const active = apartments.filter((a) => a.status !== 'ARCHIVED')

  return (
    <label className="society-switcher" title="Filter workspace by society">
      <Building2 size={14} />
      <select
        value={apartmentId ?? ''}
        onChange={(e) => setApartmentId(e.target.value || null)}
        aria-label="Society filter"
      >
        <option value="">All societies</option>
        {active.map((a) => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>
    </label>
  )
}
