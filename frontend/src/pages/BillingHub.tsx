import { NavLink, Outlet } from 'react-router-dom'
import { PageHeading } from '../components/UI'

const TABS = [
  { to: '/billing/maintenance', label: 'Maintenance', end: false },
  { to: '/billing/water', label: 'Water', end: false },
  { to: '/billing/electricity', label: 'Electricity', end: false },
  { to: '/billing/outstanding', label: 'Outstanding', end: false },
  { to: '/billing/receipts', label: 'Receipts', end: false },
] as const

/** Shared billing section tabs — child routes stay mounted under /billing/*. */
export default function BillingHub() {
  return (
    <>
      <PageHeading
        eyebrow="Financial"
        title="Billing"
        subtitle="Create invoices, record collections, and review receipts by utility type."
      />
      <nav className="hub-segment" aria-label="Billing sections">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </>
  )
}
