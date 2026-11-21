export const money = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0)

export const moneyExact = (v: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(v || 0)

export function formatDate(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function apiError(err: unknown, fallback: string) {
  const anyErr = err as { response?: { data?: { message?: string } } }
  return anyErr?.response?.data?.message || fallback
}

export function paginate<T>(rows: T[], page: number, pageSize: number) {
  const start = (page - 1) * pageSize
  return {
    slice: rows.slice(start, start + pageSize),
    total: rows.length,
    page,
    pageSize,
    pages: Math.max(1, Math.ceil(rows.length / pageSize)),
  }
}

export function sortBy<T>(rows: T[], key: keyof T, dir: 'asc' | 'desc' = 'asc') {
  return [...rows].sort((a, b) => {
    const av = a[key]
    const bv = b[key]
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    if (typeof av === 'number' && typeof bv === 'number') return dir === 'asc' ? av - bv : bv - av
    return dir === 'asc'
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av))
  })
}
