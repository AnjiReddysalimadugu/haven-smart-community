import type { Role } from '../api'

export type NavItem = {
  to: string
  label: string
  icon: string
  roles: Role[]
}

export type NavGroup = {
  label: string
  items: NavItem[]
}

/** Society operators — electricity/water/maintenance live here (NOT platform Super Admin). */
const SOCIETY_ADMINS: Role[] = ['APARTMENT_ADMIN', 'ADMIN']
/** Platform owner — sells Haven to societies. */
const PLATFORM: Role[] = ['SUPER_ADMIN']
const ADMINS: Role[] = [...PLATFORM, ...SOCIETY_ADMINS]
/** Front-desk collections — payments, tickets, guest passes only. */
const STAFF: Role[] = ['STAFF']
const RESIDENT: Role[] = ['RESIDENT']
const SECURITY: Role[] = ['SECURITY']

/**
 * Role-wise navigation. Super Admin sees platform SaaS console.
 * Society admins see apartment ops (utility bills, visitors, etc.).
 */
export const navGroups: NavGroup[] = [
  {
    label: 'Platform',
    items: [
      { to: '/', label: 'Platform home', icon: 'dashboard', roles: PLATFORM },
      { to: '/platform/revenue', label: 'Subscriptions & revenue', icon: 'reports', roles: PLATFORM },
      { to: '/property', label: 'Societies & flats', icon: 'property', roles: PLATFORM },
      { to: '/users', label: 'All users', icon: 'usercog', roles: PLATFORM },
      { to: '/more/audit', label: 'Audit Logs', icon: 'reports', roles: PLATFORM },
    ],
  },
  {
    label: 'Society',
    items: [
      { to: '/', label: 'Dashboard', icon: 'dashboard', roles: [...SOCIETY_ADMINS, ...STAFF] },
      { to: '/property', label: 'Property', icon: 'property', roles: SOCIETY_ADMINS },
      { to: '/residents', label: 'Residents', icon: 'users', roles: SOCIETY_ADMINS },
      { to: '/occupancy', label: 'Occupancy', icon: 'occupancy', roles: [...SOCIETY_ADMINS, ...RESIDENT] },
      { to: '/users', label: 'Staff & Security', icon: 'usercog', roles: SOCIETY_ADMINS },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/billing', label: 'Billing', icon: 'billing', roles: [...SOCIETY_ADMINS, ...STAFF, ...RESIDENT] },
      { to: '/payments', label: 'Payments', icon: 'payments', roles: [...SOCIETY_ADMINS, ...STAFF, ...RESIDENT] },
      { to: '/receipts', label: 'Receipts', icon: 'receipt', roles: [...SOCIETY_ADMINS, ...STAFF, ...RESIDENT] },
      { to: '/reports', label: 'Reports', icon: 'reports', roles: SOCIETY_ADMINS },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/tasks', label: 'My Tasks', icon: 'complaints', roles: STAFF },
      { to: '/parking', label: 'Parking', icon: 'parking', roles: [...SOCIETY_ADMINS, ...RESIDENT] },
      { to: '/visitors', label: 'Visitors', icon: 'visitors', roles: [...SOCIETY_ADMINS, ...STAFF, ...SECURITY, ...RESIDENT] },
      { to: '/security', label: 'Gate & Scanner', icon: 'security', roles: [...SOCIETY_ADMINS, ...SECURITY] },
      { to: '/complaints', label: 'Complaints', icon: 'complaints', roles: [...SOCIETY_ADMINS, ...STAFF, ...SECURITY, ...RESIDENT] },
      { to: '/notices', label: 'Notices', icon: 'reports', roles: [...SOCIETY_ADMINS, ...STAFF, ...SECURITY, ...RESIDENT] },
      { to: '/family', label: 'Family', icon: 'users', roles: [...SOCIETY_ADMINS, ...RESIDENT] },
      { to: '/emergency', label: 'Emergency', icon: 'security', roles: [...SOCIETY_ADMINS, ...SECURITY, ...RESIDENT] },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/more/notifications', label: 'Notifications', icon: 'bell', roles: [...SOCIETY_ADMINS, ...RESIDENT] },
      { to: '/more/audit', label: 'Audit Logs', icon: 'reports', roles: ['APARTMENT_ADMIN'] },
      { to: '/settings', label: 'Settings', icon: 'settings', roles: ADMINS },
      { to: '/profile', label: 'Profile', icon: 'profile', roles: [...ADMINS, ...STAFF, ...SECURITY, ...RESIDENT] },
      { to: '/m', label: 'Home', icon: 'dashboard', roles: RESIDENT },
      { to: '/more', label: 'More', icon: 'settings', roles: SOCIETY_ADMINS },
    ],
  },
]

export function navAccessMap(): Record<string, Role[]> {
  const map: Record<string, Role[]> = {}
  for (const g of navGroups) {
    for (const item of g.items) {
      const existing = map[item.to] ?? []
      map[item.to] = [...new Set([...existing, ...item.roles])]
    }
  }
  map['/billing'] = [...SOCIETY_ADMINS, ...STAFF, ...RESIDENT]
  map['/billing/maintenance'] = [...SOCIETY_ADMINS, ...STAFF, ...RESIDENT]
  map['/billing/water'] = [...SOCIETY_ADMINS, ...STAFF, ...RESIDENT]
  map['/billing/electricity'] = [...SOCIETY_ADMINS, ...STAFF, ...RESIDENT]
  map['/billing/outstanding'] = [...SOCIETY_ADMINS, ...STAFF, ...RESIDENT]
  map['/billing/receipts'] = [...SOCIETY_ADMINS, ...STAFF, ...RESIDENT]
  map['/platform/revenue'] = PLATFORM
  map['/m'] = RESIDENT
  map['/login'] = [...ADMINS, ...STAFF, ...SECURITY, ...RESIDENT]
  return map
}

/** Resolve roles for a path (exact, then longest prefix). Unknown paths → null (deny). */
export function rolesForPath(pathname: string): Role[] | null {
  const access = navAccessMap()
  if (access[pathname]) return access[pathname]
  const prefixes = Object.keys(access)
    .filter((k) => k !== '/' && (pathname === k || pathname.startsWith(`${k}/`)))
    .sort((a, b) => b.length - a.length)
  if (prefixes.length) return access[prefixes[0]] ?? null
  return null
}

export function canAccessPath(pathname: string, role: Role): boolean {
  const allowed = rolesForPath(pathname)
  if (!allowed) return false
  return allowed.includes(role)
}

export const routeTitle: Record<string, string> = {
  '/': 'Dashboard',
  '/platform/revenue': 'Subscriptions & revenue',
  '/m': 'Home',
  '/property': 'Property',
  '/residents': 'Residents',
  '/users': 'Staff & Security',
  '/occupancy': 'Occupancy',
  '/billing': 'Billing',
  '/billing/maintenance': 'Maintenance bills',
  '/billing/water': 'Water bills',
  '/billing/electricity': 'Electricity bills',
  '/billing/outstanding': 'Outstanding',
  '/billing/receipts': 'Receipts',
  '/payments': 'Payments',
  '/receipts': 'Receipts',
  '/parking': 'Parking',
  '/visitors': 'Visitors',
  '/security': 'Gate & Scanner',
  '/complaints': 'Complaints',
  '/tasks': 'My Tasks',
  '/notices': 'Notices',
  '/family': 'Family',
  '/emergency': 'Emergency contacts',
  '/reports': 'Reports',
  '/more': 'More',
  '/more/notifications': 'Notifications',
  '/more/audit': 'Audit Logs',
  '/settings': 'Settings',
  '/profile': 'Profile',
}

export function breadcrumbsFor(
  pathname: string,
  homeTo: string = '/',
): { label: string; to?: string }[] {
  const title = routeTitle[pathname] || 'Page'
  if (pathname === '/' || pathname === '/m' || pathname === homeTo) return [{ label: title }]
  // Nested detail crumbs
  if (pathname.startsWith('/residents/') && pathname !== '/residents') {
    return [{ label: 'Home', to: homeTo }, { label: 'Residents', to: '/residents' }, { label: 'Details' }]
  }
  if (pathname.startsWith('/property/flats/')) {
    return [{ label: 'Home', to: homeTo }, { label: 'Property', to: '/property' }, { label: 'Flat' }]
  }
  if (pathname.startsWith('/property/') && pathname !== '/property') {
    return [{ label: 'Home', to: homeTo }, { label: 'Property', to: '/property' }, { label: 'Apartment' }]
  }
  return [{ label: 'Home', to: homeTo }, { label: title }]
}
