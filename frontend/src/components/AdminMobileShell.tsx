import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Building2, CircleEllipsis, Home, LogOut, Users, Wallet,
} from 'lucide-react'
import { useAuth } from '../auth'
import { useSociety } from '../society'
import { haptic } from '../lib/haptics'

const TABS = [
  { to: '/', label: 'Home', icon: Home, end: true, match: (p: string) => p === '/' },
  {
    to: '/property',
    label: 'Property',
    icon: Building2,
    end: false,
    match: (p: string) => p.startsWith('/property') || p.startsWith('/occupancy') || p.startsWith('/residents'),
  },
  {
    to: '/payments',
    label: 'Finance',
    icon: Wallet,
    end: false,
    match: (p: string) => p.startsWith('/payments') || p.startsWith('/receipts') || p.startsWith('/billing'),
  },
  { to: '/users', label: 'Users', icon: Users, end: false, match: (p: string) => p.startsWith('/users') },
  {
    to: '/more',
    label: 'More',
    icon: CircleEllipsis,
    end: false,
    match: (p: string) =>
      p.startsWith('/more')
      || p.startsWith('/visitors')
      || p.startsWith('/parking')
      || p.startsWith('/complaints')
      || p.startsWith('/reports')
      || p.startsWith('/settings')
      || p.startsWith('/profile')
      || p.startsWith('/security'),
  },
] as const

export default function AdminMobileShell() {
  const { user, logout } = useAuth()
  const { apartments, apartmentId } = useSociety()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const societyLabel = apartmentId
    ? (apartments.find((a) => a.id === apartmentId)?.name ?? 'Society')
    : (user?.role === 'SUPER_ADMIN' ? 'All societies' : (user?.apartmentName || 'Society'))

  return (
    <div className="admin-mobile-shell">
      <header className="admin-mobile-top glass-surface">
        <div className="brand-mini">
          <div className="mark"><Building2 size={16} strokeWidth={2.3} /></div>
          <div>
            <strong>Haven</strong>
            <small>{societyLabel}</small>
          </div>
        </div>
        <button
          type="button"
          className="mobile-signout"
          aria-label="Sign out"
          onClick={() => { haptic('medium'); logout(); navigate('/login') }}
        >
          <LogOut size={16} strokeWidth={2} />
        </button>
      </header>

      <main className="admin-mobile-content page-enter">
        <Outlet />
      </main>

      <nav className="admin-tabbar glass-surface" aria-label="Primary">
        {TABS.map((tab) => {
          const active = tab.match(pathname)
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={() => `admin-tab ${active ? 'active' : ''}`}
              onClick={() => haptic('light')}
            >
              <tab.icon size={20} strokeWidth={active ? 2.4 : 2} />
              <span>{tab.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
