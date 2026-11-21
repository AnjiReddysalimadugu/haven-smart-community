import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { billingApi, complaintApi, visitorApi } from '../../services'
import { useSociety } from '../../society'
import { Empty, ErrorBanner, Skeleton } from '../../components/UI'
import { PageHeader } from '../../components/mobile/primitives'
import { formatDate, money } from '../../lib/format'
import { enableWebPush, pushSupported, webPushStatus } from '../../pwa/push'

export default function Notifications() {
  const { scopeParam } = useSociety()
  const [pushMsg, setPushMsg] = useState('')
  const [pushBusy, setPushBusy] = useState(false)

  const bills = useQuery({ queryKey: ['bills', scopeParam], queryFn: () => billingApi.list(scopeParam) })
  const complaints = useQuery({ queryKey: ['complaints', scopeParam], queryFn: () => complaintApi.list(scopeParam) })
  const visitors = useQuery({ queryKey: ['visitors', scopeParam], queryFn: () => visitorApi.list(scopeParam) })

  const feed = useMemo(() => {
    const items: { id: string; title: string; meta: string; at: string; to: string }[] = []
    for (const b of (bills.data ?? []).filter((x) => Number(x.balance) > 0).slice(0, 12)) {
      items.push({
        id: `b-${b.id}`,
        title: `Outstanding · Flat ${b.flatNumber}`,
        meta: `${b.billType} · ${money(b.balance)} · due ${formatDate(b.dueDate)}`,
        at: b.dueDate,
        to: '/payments',
      })
    }
    for (const c of (complaints.data ?? []).filter((x) => !['RESOLVED', 'CLOSED'].includes(x.status)).slice(0, 12)) {
      items.push({
        id: `c-${c.id}`,
        title: c.title,
        meta: `Ticket · Flat ${c.flatNumber} · ${c.status}`,
        at: c.createdAt,
        to: '/complaints',
      })
    }
    for (const v of (visitors.data ?? []).filter((x) => !x.exitAt).slice(0, 12)) {
      items.push({
        id: `v-${v.id}`,
        title: `Visitor · ${v.visitorName}`,
        meta: `Flat ${v.flatNumber} · ${v.visitType}`,
        at: v.expiresAt,
        to: '/visitors',
      })
    }
    return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 30)
  }, [bills.data, complaints.data, visitors.data])

  const loading = bills.isLoading || complaints.isLoading || visitors.isLoading

  return (
    <div>
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        subtitle="Live activity from dues, tickets and passes"
        back={<Link to="/more" className="text-link">← More</Link>}
      />

      <div className="glass-card" style={{ padding: 16, marginBottom: 14 }}>
        <b style={{ display: 'block', marginBottom: 6 }}>Web push</b>
        <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--text-muted)' }}>
          {pushSupported()
            ? `Status: ${webPushStatus()}. Enable alerts in browsers that support Web Push (not all iOS modes).`
            : 'Web Push is not available in this browser.'}
        </p>
        {pushSupported() ? (
          <button
            type="button"
            className="button button-primary full"
            disabled={pushBusy}
            onClick={async () => {
              setPushBusy(true)
              try {
                setPushMsg(await enableWebPush())
              } catch (e) {
                setPushMsg(e instanceof Error ? e.message : 'Could not enable push')
              } finally {
                setPushBusy(false)
              }
            }}
          >
            {pushBusy ? 'Working…' : 'Enable push alerts'}
          </button>
        ) : null}
        {pushMsg ? <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--accent)' }}>{pushMsg}</p> : null}
      </div>

      {loading ? <Skeleton style={{ height: 80 }} /> : null}
      {(bills.isError || complaints.isError) ? <ErrorBanner message="Could not load activity." /> : null}
      {!loading && !feed.length ? <Empty title="Quiet" description="No open dues, tickets or passes." /> : null}
      {feed.map((item) => (
        <Link key={item.id} to={item.to} className="list-row glass-card">
          <div>
            <b>{item.title}</b>
            <span>{item.meta}</span>
          </div>
        </Link>
      ))}
    </div>
  )
}
