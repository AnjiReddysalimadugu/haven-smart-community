import { useEffect, useMemo, useRef, useState, type ComponentType, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard, Building2, Users, UserCog, Home, Wallet, ReceiptText,
  BarChart3, CarFront, ScanQrCode, Shield, MessageSquareWarning, Settings,
  UserRound, PanelLeftClose, PanelLeftOpen, Search, Bell, Menu, LogOut, Moon, Sun,
  ChevronDown,
} from 'lucide-react'
import { breadcrumbsFor, canAccessPath, navGroups } from '../lib/nav'
import { homePathFor, roleLabel, useAuth } from '../auth'
import { useSociety } from '../society'
import { useTheme } from '../theme'
import { Avatar, Breadcrumbs, Drawer, Status } from './UI'
import SocietySwitcher from './SocietySwitcher'
import { billingApi, complaintApi, searchApi } from '../services'
import { formatDate, money } from '../lib/format'

type SearchHit = { id: string; kind: string; label: string; detail: string; to: string }

const icons: Record<string, ComponentType<{ size?: number }>> = {
  dashboard: LayoutDashboard,
  property: Building2,
  users: Users,
  usercog: UserCog,
  occupancy: Home,
  billing: ReceiptText,
  payments: Wallet,
  receipt: ReceiptText,
  reports: BarChart3,
  parking: CarFront,
  visitors: ScanQrCode,
  security: Shield,
  complaints: MessageSquareWarning,
  settings: Settings,
  profile: UserRound,
  bell: Bell,
}

function shortcutLabel() {
  if (typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent)) {
    return '⌘K'
  }
  return 'Ctrl K'
}

export default function Layout() {
  const { user, logout, hasRole, can } = useAuth()
  const { scopeParam } = useSociety()
  const { theme, toggle } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [q, setQ] = useState('')
  const [searchHint, setSearchHint] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const searchBoxRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  const groups = useMemo(
    () => navGroups.map((g) => ({
      ...g,
      items: g.items.filter((item) => hasRole(...item.roles)),
    })).filter((g) => g.items.length > 0),
    [hasRole],
  )

  const homeTo = user ? homePathFor(user.role) : '/'
  const crumbs = breadcrumbsFor(location.pathname, homeTo)

  useEffect(() => {
    setMobileOpen(false)
    setProfileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileOpen])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!profileOpen) return
    const onPointer = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setProfileOpen(false) }
    document.addEventListener('mousedown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [profileOpen])

  const bills = useQuery({
    queryKey: ['bills', scopeParam],
    queryFn: () => billingApi.list(scopeParam),
    enabled: can('dashboard.view') || can('bill.pay'),
  })
  const complaints = useQuery({
    queryKey: ['complaints', scopeParam],
    queryFn: () => complaintApi.list(scopeParam),
  })
  const serverSearch = useQuery({
    queryKey: ['search', scopeParam, q.trim()],
    queryFn: () => searchApi.query(q.trim(), scopeParam),
    enabled: searchOpen && q.trim().length >= 2,
    placeholderData: (prev) => prev,
  })

  useEffect(() => {
    if (!searchOpen) return
    const onPointer = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [searchOpen])

  const notifications = useMemo(() => {
    const due = (bills.data ?? [])
      .filter((b) => Number(b.balance) > 0)
      .slice(0, 4)
      .map((b) => ({
        id: `bill-${b.id}`,
        title: `${b.billType} due · ${b.flatNumber}`,
        detail: `${money(b.balance)} · ${formatDate(b.dueDate)}`,
        status: b.status,
        to: '/payments' as const,
      }))
    const open = (complaints.data ?? [])
      .filter((c) => !['RESOLVED', 'CLOSED'].includes(c.status))
      .slice(0, 4)
      .map((c) => ({
        id: `c-${c.id}`,
        title: c.title,
        detail: `${c.flatNumber} · ${c.category}`,
        status: c.status,
        to: '/complaints' as const,
      }))
    return [...due, ...open]
  }, [bills.data, complaints.data])

  const notifCount = notifications.length

  const searchHits = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (term.length < 1) return [] as SearchHit[]
    const hits: SearchHit[] = []

    for (const item of groups.flatMap((g) => g.items)) {
      if (item.label.toLowerCase().includes(term)) {
        hits.push({
          id: `mod-${item.to}`,
          kind: 'Module',
          label: item.label,
          detail: 'Navigate',
          to: item.to,
        })
      }
    }

    for (const h of serverSearch.data?.hits ?? []) {
      hits.push({
        id: `${h.type}-${h.id}`,
        kind: h.type.charAt(0) + h.type.slice(1).toLowerCase(),
        label: h.label,
        detail: h.detail,
        to: h.href,
      })
    }

    return hits.slice(0, 12)
  }, [q, groups, serverSearch.data])

  function goHit(hit: SearchHit) {
    navigate(hit.to)
    setQ('')
    setSearchHint('')
    setSearchOpen(false)
    setMobileOpen(false)
  }

  function onSearchSubmit(e: FormEvent) {
    e.preventDefault()
    const term = q.trim()
    if (!term) {
      setSearchHint('Search modules, residents, flats, or bills.')
      setSearchOpen(true)
      return
    }
    if (searchHits[0]) {
      goHit(searchHits[0])
      return
    }
    setSearchHint(`No matches for “${term}”. Try a module, flat number, or resident name.`)
    setSearchOpen(true)
  }

  return (
    <div className={`app-shell ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'sidebar-open' : ''}`}>
      {mobileOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="mark"><Building2 size={16} strokeWidth={2.2} /></div>
          <div>
            <strong>Haven</strong>
            <small>Apartment OS</small>
          </div>
        </div>
        <div className="sidebar-society" title={user?.apartmentName || user?.role}>
          {user?.role === 'STAFF'
            ? (user.apartmentName ? `${user.apartmentName} · Desk` : 'Collections desk')
            : user?.role === 'SECURITY'
              ? (user.apartmentName ? `${user.apartmentName} · Gate` : 'Gate security')
              : (user?.apartmentName || (user?.role === 'SUPER_ADMIN' ? 'Platform admin' : 'Society admin'))}
        </div>
        <nav>
          {groups.map((group) => (
            <div className="sidebar-group" key={group.label}>
              <div className="sidebar-group-label">{group.label}</div>
              {group.items.map((item) => {
                const Icon = icons[item.icon] || LayoutDashboard
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => setMobileOpen(false)}
                    title={item.label}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <Link to="/profile" className="nav-item sidebar-user" onClick={() => setMobileOpen(false)} title={user?.fullName}>
            <Avatar name={user?.fullName || 'User'} />
            <span>
              <b style={{ display: 'block', color: '#F8FAFC', fontSize: 12.5 }}>{user?.fullName}</b>
              <small style={{ color: 'var(--sidebar-text)', fontSize: 11 }}>{user ? roleLabel(user.role) : ''}</small>
            </span>
          </Link>
          <button type="button" className="collapse-btn desktop-only" onClick={() => setCollapsed((v) => !v)}>
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            <span>{collapsed ? 'Expand' : 'Collapse'}</span>
          </button>
          <button
            type="button"
            className="collapse-btn"
            onClick={() => { logout(); navigate('/login') }}
          >
            <LogOut size={18} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="main-pane">
        <header className="topbar">
          <button
            type="button"
            className="icon-btn mobile-only"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            data-tooltip="Menu"
          >
            <Menu size={18} strokeWidth={1.75} />
          </button>

          <div className="topbar-search-wrap" ref={searchBoxRef}>
            <form className="topbar-search" onSubmit={onSearchSubmit} role="search">
              <Search size={16} strokeWidth={1.75} className="topbar-search-icon" aria-hidden />
              <input
                ref={searchRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value)
                  setSearchOpen(true)
                  if (searchHint) setSearchHint('')
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Search modules, flats, residents…"
                aria-label="Search modules and records"
                aria-expanded={searchOpen}
                aria-controls="topbar-search-results"
                aria-describedby={searchHint ? 'topbar-search-hint' : undefined}
                autoComplete="off"
              />
              <kbd className="topbar-kbd" aria-hidden>{shortcutLabel()}</kbd>
            </form>
            {searchOpen && (q.trim() || searchHint) && (
              <div id="topbar-search-results" className="topbar-search-results" role="listbox">
                {searchHint && (
                  <div id="topbar-search-hint" className="topbar-search-empty" role="status">{searchHint}</div>
                )}
                {searchHits.map((hit) => (
                  <button
                    key={hit.id}
                    type="button"
                    role="option"
                    className="topbar-search-hit"
                    onClick={() => goHit(hit)}
                  >
                    <span className="topbar-search-kind">{hit.kind}</span>
                    <span className="topbar-search-label">{hit.label}</span>
                    <span className="topbar-search-detail">{hit.detail}</span>
                  </button>
                ))}
                {!searchHits.length && q.trim().length >= 2 && !searchHint && (
                  <div className="topbar-search-empty">No matches — try another name or module.</div>
                )}
              </div>
            )}
          </div>

          <SocietySwitcher />

          <div className="topbar-actions">
            <button
              type="button"
              className="icon-btn desktop-only"
              onClick={toggle}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              data-tooltip={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
            </button>

            <button
              type="button"
              className="icon-btn"
              aria-label={notifCount ? `Notifications, ${notifCount} alerts` : 'Notifications'}
              data-tooltip="Notifications"
              onClick={() => setNotifOpen(true)}
            >
              <Bell size={18} strokeWidth={1.75} />
              {notifCount > 0 && (
                <span className="notif-badge" aria-hidden>{notifCount > 9 ? '9+' : notifCount}</span>
              )}
            </button>

            <div className={`profile-menu ${profileOpen ? 'open' : ''}`} ref={profileRef}>
              <button
                type="button"
                className="profile-chip"
                aria-label="Profile menu"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                data-tooltip="Profile"
                onClick={() => setProfileOpen((v) => !v)}
              >
                <Avatar name={user?.fullName || 'User'} />
                <div className="meta">
                  <b>{user?.fullName}</b>
                  <span>{user ? roleLabel(user.role) : ''}</span>
                </div>
                <ChevronDown size={14} strokeWidth={2} className="profile-caret" aria-hidden />
              </button>

              {profileOpen && (
                <div className="profile-dropdown" role="menu">
                  <div className="profile-dropdown-head">
                    <Avatar name={user?.fullName || 'User'} size="lg" />
                    <div>
                      <b>{user?.fullName}</b>
                      <span>{user?.email}</span>
                      <em>{user ? roleLabel(user.role) : ''}</em>
                    </div>
                  </div>
                  <div className="profile-dropdown-list">
                    <Link role="menuitem" to="/profile" onClick={() => setProfileOpen(false)}>
                      <UserRound size={15} /> View profile
                    </Link>
                    {can('settings.view') && (
                      <Link role="menuitem" to="/settings" onClick={() => setProfileOpen(false)}>
                        <Settings size={15} /> Settings
                      </Link>
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      className="profile-dropdown-danger"
                      onClick={() => { setProfileOpen(false); logout(); navigate('/login') }}
                    >
                      <LogOut size={15} /> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="content">
          <div className="page">
            <Breadcrumbs items={crumbs} />
            <div className="page-enter"><Outlet /></div>
          </div>
        </main>
      </div>

      <Drawer
        open={notifOpen}
        title="Notifications"
        subtitle="Open dues and complaints — tap to open"
        onClose={() => setNotifOpen(false)}
      >
        {notifications.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: 13.5 }}>No open alerts in the current dataset.</p>
        )}
        {notifications.map((n) => (
          <button
            type="button"
            className="notif-item notif-item-btn"
            key={n.id}
            onClick={() => { setNotifOpen(false); navigate(n.to) }}
          >
            <b>{n.title}</b>
            <span>{n.detail}</span>
            <div style={{ marginTop: 6 }}><Status value={n.status} /></div>
          </button>
        ))}
        {user && canAccessPath('/more/notifications', user.role) && (
          <Link
            to="/more/notifications"
            className="button button-ghost button-sm"
            style={{ marginTop: 12 }}
            onClick={() => setNotifOpen(false)}
          >
            Open activity feed
          </Link>
        )}
      </Drawer>
    </div>
  )
}
