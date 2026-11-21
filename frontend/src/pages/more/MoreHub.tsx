import { Link } from 'react-router-dom'
import {
  Bell, Building2, Car, ClipboardList, FileBarChart, Home, Megaphone, MessageSquareWarning,
  Phone, ReceiptText, ScanQrCode, Settings, UserRound, Users,
} from 'lucide-react'
import { useAuth } from '../../auth'
import { PageHeader } from '../../components/mobile/primitives'
import { useTheme } from '../../theme'

const LINKS = [
  { to: '/property', label: 'Properties', blurb: 'Blocks, floors, flats · Edit', icon: Building2 },
  { to: '/residents', label: 'Residents', blurb: 'View · Edit · Allocate · History', icon: Users },
  { to: '/occupancy', label: 'Occupancy', blurb: 'Allocate · Release · History', icon: Home },
  { to: '/billing', label: 'Billing', blurb: 'Maintenance · Water · Electricity', icon: ReceiptText },
  { to: '/visitors', label: 'Visitors', blurb: 'Guest passes', icon: ScanQrCode },
  { to: '/parking', label: 'Parking', blurb: 'Slot allocate', icon: Car },
  { to: '/complaints', label: 'Complaints', blurb: 'Help desk', icon: MessageSquareWarning },
  { to: '/notices', label: 'Notices', blurb: 'Publish board', icon: Megaphone },
  { to: '/family', label: 'Family', blurb: 'Household directory', icon: Users },
  { to: '/emergency', label: 'Emergency', blurb: 'Gate contacts', icon: Phone },
  { to: '/reports', label: 'Reports', blurb: 'Collections & occupancy', icon: FileBarChart },
  { to: '/more/notifications', label: 'Notifications', blurb: 'Activity & push', icon: Bell },
  { to: '/more/audit', label: 'Audit logs', blurb: 'Sensitive actions', icon: ClipboardList, adminAudit: true },
  { to: '/settings', label: 'Settings', blurb: 'Theme & societies', icon: Settings },
  { to: '/profile', label: 'Profile', blurb: 'Your account', icon: UserRound },
] as const

export default function MoreHub() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const canAudit = user?.role === 'SUPER_ADMIN' || user?.role === 'APARTMENT_ADMIN'

  return (
    <div>
      <PageHeader eyebrow="Workspace" title="More" subtitle="Desk tools and account" />

      <div className="more-grid">
        {LINKS.filter((l) => !('adminAudit' in l && l.adminAudit) || canAudit).map((l) => (
          <Link key={l.to} to={l.to} className="more-tile glass-card">
            <l.icon size={20} strokeWidth={2.2} />
            <b>{l.label}</b>
            <span>{l.blurb}</span>
          </Link>
        ))}
      </div>

      <div className="glass-card" style={{ padding: 16, marginTop: 16 }}>
        <b style={{ display: 'block', marginBottom: 10 }}>Appearance</b>
        <div className="segmented">
          <button type="button" className={`segmented-item ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}>Light</button>
          <button type="button" className={`segmented-item ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}>Dark</button>
        </div>
      </div>
    </div>
  )
}
