import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Building2, ClipboardList, Home, Wallet, ScanQrCode, MessageSquareWarning,
  UserRound, ShieldCheck, LogOut, Phone, Megaphone, ReceiptText,
} from 'lucide-react'
import { useAuth } from '../auth'

/** Role-locked mobile workspaces — resident / gate / staff. */
export default function MobileShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const role = user?.role

  const tabs =
    role === 'SECURITY'
      ? [
          { to: '/security', label: 'Gate', icon: ShieldCheck, end: true },
          { to: '/visitors', label: 'Visitors', icon: ScanQrCode, end: false },
          { to: '/notices', label: 'Notices', icon: Megaphone, end: false },
          { to: '/emergency', label: 'SOS', icon: Phone, end: false },
          { to: '/profile', label: 'Profile', icon: UserRound, end: false },
        ]
      : role === 'STAFF'
        ? [
            { to: '/', label: 'Home', icon: Home, end: true },
            { to: '/tasks', label: 'Tasks', icon: ClipboardList, end: false },
            { to: '/complaints', label: 'Tickets', icon: MessageSquareWarning, end: false },
            { to: '/payments', label: 'Pay', icon: Wallet, end: false },
            { to: '/receipts', label: 'Receipts', icon: ReceiptText, end: false },
          ]
        : [
            { to: '/m', label: 'Home', icon: Home, end: true },
            { to: '/payments', label: 'Bills', icon: Wallet, end: false },
            { to: '/visitors', label: 'Visitors', icon: ScanQrCode, end: false },
            { to: '/complaints', label: 'Complaints', icon: MessageSquareWarning, end: false },
            { to: '/profile', label: 'Profile', icon: UserRound, end: false },
          ]

  const brandSub =
    role === 'SECURITY'
      ? (user?.apartmentName || 'Gate desk')
      : role === 'STAFF'
        ? (user?.apartmentName || 'Staff desk')
        : (user?.flatNumber ? `Flat ${user.flatNumber}` : 'Resident')

  const shellClass =
    role === 'SECURITY' ? 'is-gate' : role === 'STAFF' ? 'is-staff' : 'is-home'

  return (
    <div className={`mobile-shell ${shellClass}`}>
      <header className="mobile-top">
        <div className="brand-mini">
          <div className="mark"><Building2 size={16} strokeWidth={2.3} /></div>
          <div>
            <strong>Haven</strong>
            <small>{brandSub}</small>
          </div>
        </div>
        <div className="mobile-top-actions">
          {role === 'STAFF' && (
            <Link to="/profile" className="mobile-signout" aria-label="Profile">
              <UserRound size={16} strokeWidth={2} />
            </Link>
          )}
          <button
            type="button"
            className="mobile-signout"
            aria-label="Sign out"
            onClick={() => { logout(); navigate('/login') }}
          >
            <LogOut size={16} strokeWidth={2} />
          </button>
        </div>
      </header>

      <main className="mobile-content page-enter">
        <Outlet />
      </main>

      <nav className={`mobile-tabbar ${tabs.length === 4 ? 'tabs-4' : tabs.length === 3 ? 'tabs-3' : ''}`} aria-label="Primary">
        {tabs.map((tab) => (
          <NavLink
            key={`${tab.to}-${tab.label}`}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) => `mobile-tab ${isActive ? 'active' : ''}`}
          >
            <tab.icon size={18} strokeWidth={2} />
            <span>{tab.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
