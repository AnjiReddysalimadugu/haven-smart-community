import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type CSSProperties, type ReactNode,
} from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { initials } from '../auth'

/** True when viewport is phone/tablet width — use bottom sheets instead of centered modals. */
export function useNarrow(maxPx = 720) {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(`(max-width: ${maxPx}px)`).matches)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${maxPx}px)`)
    const update = () => setNarrow(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [maxPx])
  return narrow
}

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export function PageHeading({
  eyebrow, title, subtitle, action,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action ? <div className="heading-action">{action}</div> : null}
    </div>
  )
}

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          {i > 0 && <span className="sep">/</span>}
          {item.to ? <Link to={item.to}>{item.label}</Link> : <span style={{ color: 'var(--text)', fontWeight: 600 }}>{item.label}</span>}
        </span>
      ))}
    </nav>
  )
}

export function Status({ value }: { value: string }) {
  const s = value.toLowerCase().replaceAll('_', ' ')
  return <span className={cn('status', `status-${s.replaceAll(' ', '-')}`)}>{s}</span>
}

export function Empty({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <b>{title}</b>
      <p>{description}</p>
      {action ? <div style={{ marginTop: 12 }}>{action}</div> : null}
    </div>
  )
}

export function Modal({
  title, subtitle, onClose, children, wide,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.activeElement as HTMLElement | null
    const root = panelRef.current
    const focusables = root?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
    focusables?.[0]?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      prev?.focus?.()
    }
  }, [onClose])

  useEffect(() => {
    const root = panelRef.current
    if (!root) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const nodes = [...root.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )].filter((el) => !el.hasAttribute('disabled'))
      if (!nodes.length) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    root.addEventListener('keydown', onKeyDown)
    return () => root.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        ref={panelRef}
        className={cn('modal-card', wide && 'modal-wide')}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

/** Desktop modal / mobile bottom sheet — use for all CRUD create/edit/view forms. */
export function ResponsiveSheet({
  open, title, subtitle, onClose, children, wide,
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  const narrow = useNarrow()
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])
  if (!open) return null
  if (narrow) {
    return (
      <div className="sheet-root" role="dialog" aria-modal="true" aria-label={title}>
        <button type="button" className="sheet-backdrop" aria-label="Dismiss" onClick={onClose} />
        <div className="sheet-panel glass-surface">
          <div className="sheet-handle" />
          <div className="sheet-head">
            <div>
              <h3 id="sheet-title">{title}</h3>
              {subtitle ? <p>{subtitle}</p> : null}
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
          </div>
          <div className="sheet-body">{children}</div>
        </div>
      </div>
    )
  }
  return (
    <Modal title={title} subtitle={subtitle} onClose={onClose} wide={wide}>
      {children}
    </Modal>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small style={{ color: 'var(--text-muted)' }}>{hint}</small>}
    </label>
  )
}

export function ErrorBanner({ message }: { message?: string | null }) {
  if (!message) return null
  return <div className="form-error" role="alert">{message}</div>
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  return <div className={cn('avatar', size === 'lg' && 'lg')}>{initials(name)}</div>
}

export function Spinner() {
  return <span className="skeleton" style={{ width: 18, height: 18, borderRadius: '50%', display: 'inline-block' }} />
}

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div className={cn('skeleton', className)} style={style} />
}

export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton skeleton-row" />
      ))}
    </div>
  )
}

export function KpiCard({
  label, value, hint, icon, tone,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  tone?: 'up' | 'down' | 'neutral'
}) {
  return (
    <div className="kpi-card">
      <div className="kpi-top">
        <span>{label}</span>
        {icon && <div className="kpi-icon">{icon}</div>}
      </div>
      <strong>{value}</strong>
      {hint && (
        <small className={tone === 'up' ? 'kpi-hint-up' : tone === 'down' ? 'kpi-hint-down' : undefined}>
          {hint}
        </small>
      )}
    </div>
  )
}

export function DataToolbar({
  title, count, search, onSearch, placeholder = 'Search…', children,
}: {
  title: string
  count?: number
  search?: string
  onSearch?: (v: string) => void
  placeholder?: string
  children?: ReactNode
}) {
  return (
    <div className="table-toolbar">
      <div className="table-title">
        <b>{title}</b>
        {typeof count === 'number' && <span>{count} records</span>}
      </div>
      <div className="table-tools">
        {onSearch && (
          <div className="table-search">
            <input value={search ?? ''} onChange={(e) => onSearch(e.target.value)} placeholder={placeholder} />
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export function Pagination({
  page, pageSize, total, onPageChange,
}: {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (total <= pageSize) return null
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  return (
    <div className="pagination">
      <span>Showing {from}–{to} of {total}</span>
      <div className="pagination-btns">
        <button type="button" className="page-btn" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>‹</button>
        {Array.from({ length: Math.min(pages, 5) }).map((_, i) => {
          const n = pages <= 5 ? i + 1 : Math.min(Math.max(page - 2, 1) + i, pages)
          return (
            <button key={n} type="button" className={cn('page-btn', n === page && 'active')} onClick={() => onPageChange(n)}>
              {n}
            </button>
          )
        })}
        <button type="button" className="page-btn" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>›</button>
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm', danger, busy, onConfirm, onClose,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  if (!open) return null
  return (
    <Modal title={title} onClose={onClose}>
      <p style={{ margin: '0 0 16px', color: 'var(--text-muted)', fontSize: 14 }}>{message}</p>
      <div className="form-actions">
        <button type="button" className="button button-secondary" onClick={onClose}>Cancel</button>
        <button
          type="button"
          className={cn('button', danger ? 'button-danger' : 'button-primary')}
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

type ToastTone = 'success' | 'error' | 'info'
type ToastItem = { id: string; tone: ToastTone; title: string; message?: string }

type ToastCtx = {
  push: (tone: ToastTone, title: string, message?: string) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastCtx | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((tone: ToastTone, title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random()}`
    setItems((prev) => [...prev, { id, tone, title, message }])
    window.setTimeout(() => dismiss(id), 4200)
  }, [dismiss])

  const value = useMemo<ToastCtx>(() => ({
    push,
    success: (t, m) => push('success', t, m),
    error: (t, m) => push('error', t, m),
    info: (t, m) => push('info', t, m),
  }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={cn('toast', t.tone)}>
            {t.tone === 'success' && <CheckCircle2 size={18} color="var(--success)" />}
            {t.tone === 'error' && <XCircle size={18} color="var(--danger)" />}
            {t.tone === 'info' && <Info size={18} color="var(--info)" />}
            <div style={{ flex: 1 }}>
              <b>{t.title}</b>
              {t.message && <p>{t.message}</p>}
            </div>
            <button type="button" className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => dismiss(t.id)}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function Drawer({
  open, title, subtitle, onClose, children,
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
}) {
  if (!open) return null
  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true">
        <div className="drawer-head">
          <div>
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="drawer-body">{children}</div>
      </aside>
    </>
  )
}

export function DateField({
  label, name, required, defaultValue, min, max,
}: {
  label: string
  name: string
  required?: boolean
  defaultValue?: string
  min?: string
  max?: string
}) {
  return (
    <Field label={label}>
      <input type="date" name={name} required={required} defaultValue={defaultValue} min={min} max={max} />
    </Field>
  )
}

export function Segmented({
  value, onChange, options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="tabs" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          className={cn('tab', value === o.value && 'active')}
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

