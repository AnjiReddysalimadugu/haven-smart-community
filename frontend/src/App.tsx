import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import { homePathFor, useAuth } from './auth'
import { useIsMobileAdmin } from './hooks/useIsMobileAdmin'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Property = lazy(() => import('./pages/Property'))
const Residents = lazy(() => import('./pages/Residents'))
const Users = lazy(() => import('./pages/Users'))
const Occupancy = lazy(() => import('./pages/Occupancy'))
const Billing = lazy(() => import('./pages/Billing'))
const BillingHub = lazy(() => import('./pages/BillingHub'))
const Payments = lazy(() => import('./pages/Payments'))
const Receipts = lazy(() => import('./pages/Receipts'))
const ResidentDetail = lazy(() => import('./pages/ResidentDetail'))
const ApartmentDetail = lazy(() => import('./pages/ApartmentDetail'))
const FlatDetail = lazy(() => import('./pages/FlatDetail'))
const Parking = lazy(() => import('./pages/Parking'))
const Visitors = lazy(() => import('./pages/Visitors'))
const Security = lazy(() => import('./pages/Security'))
const Complaints = lazy(() => import('./pages/Complaints'))
const Reports = lazy(() => import('./pages/Reports'))
const Settings = lazy(() => import('./pages/Settings'))
const Profile = lazy(() => import('./pages/Profile'))
const ResidentHome = lazy(() => import('./pages/ResidentHome'))
const MoreHub = lazy(() => import('./pages/more/MoreHub'))
const Notifications = lazy(() => import('./pages/more/Notifications'))
const AuditLogs = lazy(() => import('./pages/more/AuditLogs'))
const AdminHome = lazy(() => import('./pages/mobile/AdminHome'))
const MobileFinance = lazy(() => import('./pages/mobile/MobileFinance'))
const Family = lazy(() => import('./pages/Family'))
const Notices = lazy(() => import('./pages/Notices'))
const Emergency = lazy(() => import('./pages/Emergency'))
const StaffTasks = lazy(() => import('./pages/StaffTasks'))
const PlatformRevenue = lazy(() => import('./pages/PlatformRevenue'))

function CatchAll() {
  const { user } = useAuth()
  return <Navigate to={user ? homePathFor(user.role) : '/login'} replace />
}

function HomeRoute() {
  const { user } = useAuth()
  const mobile = useIsMobileAdmin()
  if (user?.role === 'RESIDENT') return <Navigate to="/m" replace />
  if (user?.role === 'SECURITY') return <Navigate to="/security" replace />
  const admin = user && ['SUPER_ADMIN', 'APARTMENT_ADMIN', 'ADMIN'].includes(user.role)
  if (admin && mobile) return <AdminHome />
  return <Dashboard />
}

/** Always use full CRUD screens — mobile stubs hid Edit / Allocate / History. */
function PropertyRoute() {
  return <Property />
}

function PaymentsRoute() {
  const { user } = useAuth()
  const mobile = useIsMobileAdmin()
  const admin = user && ['SUPER_ADMIN', 'APARTMENT_ADMIN', 'ADMIN'].includes(user.role)
  if (admin && mobile) return <MobileFinance />
  return <Payments />
}

function UsersRoute() {
  return <Users />
}

function RouteFallback() {
  return (
    <div style={{ padding: 32, color: 'var(--text-muted)', fontSize: 14 }}>
      Loading module…
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route index element={<HomeRoute />} />
            <Route path="platform/revenue" element={<PlatformRevenue />} />
            <Route path="m" element={<ResidentHome />} />
            <Route path="property" element={<PropertyRoute />} />
            <Route path="property/flats/:flatId" element={<FlatDetail />} />
            <Route path="property/:apartmentId" element={<ApartmentDetail />} />
            <Route path="residents" element={<Residents />} />
            <Route path="residents/:id" element={<ResidentDetail />} />
            <Route path="users" element={<UsersRoute />} />
            <Route path="occupancy" element={<Occupancy />} />
            <Route path="billing" element={<BillingHub />}>
              <Route index element={<Navigate to="maintenance" replace />} />
              <Route path="maintenance" element={<Billing billType="MAINTENANCE" title="Maintenance bills" subtitle="Society maintenance charges by flat and period." />} />
              <Route path="water" element={<Billing billType="WATER" title="Water bills" subtitle="Water utility invoices and outstanding balances." />} />
              <Route path="electricity" element={<Billing billType="ELECTRICITY" title="Electricity bills" subtitle="Electricity charges with payment tracking." />} />
              <Route path="outstanding" element={<Payments />} />
              <Route path="receipts" element={<Receipts />} />
            </Route>
            <Route path="payments" element={<PaymentsRoute />} />
            <Route path="receipts" element={<Receipts />} />
            <Route path="parking" element={<Parking />} />
            <Route path="visitors" element={<Visitors />} />
            <Route path="security" element={<Security />} />
            <Route path="complaints" element={<Complaints />} />
            <Route path="tasks" element={<StaffTasks />} />
            <Route path="notices" element={<Notices />} />
            <Route path="family" element={<Family />} />
            <Route path="emergency" element={<Emergency />} />
            <Route path="reports" element={<Reports />} />
            <Route path="more" element={<MoreHub />} />
            <Route path="more/notifications" element={<Notifications />} />
            <Route path="more/audit" element={<AuditLogs />} />
            <Route path="settings" element={<Settings />} />
            <Route path="profile" element={<Profile />} />
            <Route path="*" element={<CatchAll />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  )
}
