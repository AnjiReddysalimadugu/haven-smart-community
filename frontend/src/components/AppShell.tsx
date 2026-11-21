import Layout from './Layout'
import MobileShell from './MobileShell'
import AdminMobileShell from './AdminMobileShell'
import { useAuth } from '../auth'
import { useIsMobileAdmin } from '../hooks/useIsMobileAdmin'

const SOCIETY_ADMINS = new Set(['SUPER_ADMIN', 'APARTMENT_ADMIN', 'ADMIN'])
const DESK_MOBILE_ROLES = new Set(['STAFF', 'SECURITY'])

/**
 * Desktop Layout for society admins, STAFF, and SECURITY on wide viewports.
 * Mobile tab shells for residents always; STAFF/SECURITY when narrow or installed PWA;
 * AdminMobileShell for society admins on narrow/PWA.
 */
export default function AppShell() {
  const { user } = useAuth()
  const narrowOrPwa = useIsMobileAdmin()

  if (user?.role === 'RESIDENT') {
    return <MobileShell />
  }

  if (user && DESK_MOBILE_ROLES.has(user.role)) {
    return narrowOrPwa ? <MobileShell /> : <Layout />
  }

  if (user && SOCIETY_ADMINS.has(user.role) && narrowOrPwa) {
    return <AdminMobileShell />
  }
  return <Layout />
}
