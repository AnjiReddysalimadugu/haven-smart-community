import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Car, Megaphone, MessageSquareWarning, ScanQrCode, Users, Wallet } from 'lucide-react'
import { billingApi, complaintApi, noticeApi, visitorApi } from '../services'
import { useAuth } from '../auth'
import { Empty, ErrorBanner, Status } from '../components/UI'
import { formatDate, money } from '../lib/format'

export default function ResidentHome() {
  const { user } = useAuth()

  const bills = useQuery({ queryKey: ['bills'], queryFn: () => billingApi.list() })
  const visitors = useQuery({ queryKey: ['visitors'], queryFn: () => visitorApi.list() })
  const complaints = useQuery({ queryKey: ['complaints'], queryFn: () => complaintApi.list() })
  const notices = useQuery({ queryKey: ['notices'], queryFn: () => noticeApi.list() })

  const mine = (bills.data ?? [])
  const due = mine.filter((b) => Number(b.balance) > 0)
  const outstanding = due.reduce((s, b) => s + Number(b.balance), 0)
  const openTickets = (complaints.data ?? []).filter((c) => !['RESOLVED', 'CLOSED'].includes(c.status))
  const activePasses = (visitors.data ?? []).filter((v) => !v.used)
  const pendingApprovals = (visitors.data ?? []).filter((v) => (v.approvalStatus || 'APPROVED') === 'PENDING')
  const noticeCount = (notices.data ?? []).length

  return (
    <>
      <div className="mobile-hero ink">
        <div className="eyebrow">Haven</div>
        <h1>{user?.fullName?.split(' ')[0] ?? 'Resident'}</h1>
        <p>
          {user?.flatNumber ? `Flat ${user.flatNumber}` : 'Your home'}
          {user?.apartmentName ? ` · ${user.apartmentName}` : ''}
        </p>
      </div>

      {(bills.isError || visitors.isError || complaints.isError || notices.isError) && (
        <ErrorBanner message="Could not load your home snapshot." />
      )}

      <div className="mini-stats">
        <div><small>Outstanding</small><b>{money(outstanding)}</b></div>
        <div><small>Open tickets</small><b>{openTickets.length}</b></div>
        <div><small>Guest passes</small><b>{activePasses.length}</b></div>
      </div>

      {!user?.flatId && (
        <div className="table-panel" style={{ padding: 16, marginBottom: 12 }}>
          <Empty
            title="Flat not allocated"
            description="Your account is not linked to a flat yet. Ask your society admin to assign occupancy — guest invites and service requests unlock after that."
          />
        </div>
      )}

      <div className="mobile-actions">
        <Link className="mobile-action" to="/payments">
          <Wallet size={18} color="var(--accent)" />
          Pay bills
          <span>{due.length} open invoice{due.length === 1 ? '' : 's'}</span>
        </Link>
        {user?.flatId && (
          <Link className="mobile-action" to="/visitors">
            <ScanQrCode size={18} color="var(--accent)" />
            Invite guest
            <span>Create a visitor pass</span>
          </Link>
        )}
        {user?.flatId && (
          <Link className="mobile-action" to="/complaints">
            <MessageSquareWarning size={18} color="var(--accent)" />
            Get help
            <span>Raise a service request</span>
          </Link>
        )}
        <Link className="mobile-action" to="/receipts">
          <Wallet size={18} color="var(--accent)" />
          Receipts
          <span>View paid invoices</span>
        </Link>
        {user?.flatId && (
          <Link className="mobile-action" to="/family">
            <Users size={18} color="var(--accent)" />
            Family
            <span>Household members</span>
          </Link>
        )}
        <Link className="mobile-action" to="/notices">
          <Megaphone size={18} color="var(--accent)" />
          Notices
          <span>{noticeCount} on the board</span>
        </Link>
        {user?.flatId && (
          <Link className="mobile-action" to="/parking">
            <Car size={18} color="var(--accent)" />
            Parking
            <span>Your allocated slots</span>
          </Link>
        )}
        {user?.flatId && (
          <Link className="mobile-action" to="/visitors">
            <ScanQrCode size={18} color="var(--accent)" />
            Approvals
            <span>{pendingApprovals.length} waiting</span>
          </Link>
        )}
      </div>

      <div className="table-panel">
        <div className="table-toolbar">
          <div className="table-title"><b>Due soon</b></div>
          <Link className="button button-ghost button-sm" to="/payments">See all</Link>
        </div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Type</th><th>Due</th><th>Balance</th><th>Status</th></tr></thead>
            <tbody>
              {bills.isLoading && <tr><td colSpan={4}>Loading…</td></tr>}
              {due.slice(0, 5).map((b) => (
                <tr key={b.id}>
                  <td><b>{b.billType}</b><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.billingPeriod}</div></td>
                  <td>{formatDate(b.dueDate)}</td>
                  <td>{money(b.balance)}</td>
                  <td><Status value={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!bills.isLoading && !due.length && (
            <Empty title="You're all paid up" description="No outstanding balances on your flat." />
          )}
        </div>
      </div>
    </>
  )
}
