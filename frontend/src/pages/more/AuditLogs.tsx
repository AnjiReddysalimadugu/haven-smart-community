import { useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { auditApi } from '../../services'
import { useAuth } from '../../auth'
import { useSociety } from '../../society'
import { DataToolbar, Empty, ErrorBanner, Pagination, Skeleton, Status } from '../../components/UI'
import { PageHeader, PullToRefresh } from '../../components/mobile/primitives'
import { formatDateTime, paginate } from '../../lib/format'

export default function AuditLogs() {
  const { user } = useAuth()
  const { scopeParam } = useSociety()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const allowed = user?.role === 'SUPER_ADMIN' || user?.role === 'APARTMENT_ADMIN'

  const list = useQuery({
    queryKey: ['audit', scopeParam],
    queryFn: () => auditApi.list(scopeParam),
    enabled: allowed,
  })

  const filtered = useMemo(() => {
    let rows = list.data ?? []
    if (q.trim()) {
      const t = q.toLowerCase()
      rows = rows.filter((e) =>
        `${e.action} ${e.summary} ${e.actorName ?? ''} ${e.entityType}`.toLowerCase().includes(t),
      )
    }
    return rows
  }, [list.data, q])

  const paged = paginate(filtered, page, 12)

  if (!allowed) {
    return <Navigate to="/more" replace />
  }

  return (
    <PullToRefresh onRefresh={() => list.refetch()}>
      <PageHeader
        eyebrow="Compliance"
        title="Audit logs"
        subtitle="Platform mutations recorded by the API"
        back={<Link to="/more" className="text-link">← More</Link>}
      />

      <div className="table-panel" style={{ marginTop: 8 }}>
        <DataToolbar
          title="Events"
          count={filtered.length}
          search={q}
          onSearch={(v) => { setQ(v); setPage(1) }}
          placeholder="Search action, actor, summary…"
        />
        {list.isLoading ? <Skeleton style={{ height: 80 }} /> : null}
        {list.isError ? <ErrorBanner message="Could not load audit events. Ensure the API audit endpoint is available." /> : null}
        {!list.isLoading && !paged.slice.length ? (
          <Empty title="No events yet" description="Apartment, user, bill and ticket changes appear here." />
        ) : null}

        {paged.slice.map((e) => (
          <div key={e.id} className="list-row glass-card">
            <div>
              <b>{e.action}</b>
              <span>{e.summary}</span>
              <span>{formatDateTime(e.createdAt)}{e.actorName ? ` · ${e.actorName}` : ''}</span>
            </div>
            <Status value={e.entityType} />
          </div>
        ))}
        <Pagination page={page} pageSize={12} total={filtered.length} onPageChange={setPage} />
      </div>
    </PullToRefresh>
  )
}
