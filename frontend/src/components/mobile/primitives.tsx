import {
  useCallback, useEffect, useRef, useState,
  type CSSProperties, type ReactNode,
} from 'react'
import { X } from 'lucide-react'
import { cn } from '../UI'
import { haptic } from '../../lib/haptics'

export function GlassCard({
  children, className, style, onClick,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
  onClick?: () => void
}) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      className={cn('glass-card', className)}
      style={style}
      onClick={onClick ? () => { haptic('light'); onClick() } : undefined}
    >
      {children}
    </Tag>
  )
}

export function PageHeader({
  eyebrow, title, subtitle, trailing, back,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  trailing?: ReactNode
  back?: ReactNode
}) {
  return (
    <header className="admin-page-header">
      {back}
      <div className="admin-page-header-text">
        {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {trailing ? <div className="admin-page-header-trail">{trailing}</div> : null}
    </header>
  )
}

export function SegmentedControl({
  value, options, onChange,
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          className={cn('segmented-item', value === o.value && 'active')}
          onClick={() => { haptic('light'); onChange(o.value) }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function BottomSheet({
  open, title, subtitle, onClose, children,
}: {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!open) return null
  return (
    <div className="sheet-root" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="sheet-backdrop" aria-label="Dismiss" onClick={onClose} />
      <div className="sheet-panel glass-surface">
        <div className="sheet-handle" />
        <div className="sheet-head">
          <div>
            <h3>{title}</h3>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  )
}

export function PullToRefresh({
  onRefresh, children,
}: {
  onRefresh: () => Promise<unknown> | void
  children: ReactNode
}) {
  const startY = useRef(0)
  const [pull, setPull] = useState(0)
  const [busy, setBusy] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const el = scroller.current
    if (!el || el.scrollTop > 0 || busy) return
    startY.current = e.touches[0].clientY
  }, [busy])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!startY.current || busy) return
    const dy = e.touches[0].clientY - startY.current
    if (dy > 0) setPull(Math.min(dy * 0.45, 72))
  }, [busy])

  const onTouchEnd = useCallback(async () => {
    if (pull > 54 && !busy) {
      setBusy(true)
      haptic('light')
      try { await onRefresh() } finally {
        setBusy(false)
      }
    }
    startY.current = 0
    setPull(0)
  }, [pull, busy, onRefresh])

  return (
    <div
      ref={scroller}
      className="ptr-scroller"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className={cn('ptr-indicator', (pull > 20 || busy) && 'visible')} style={{ height: pull || (busy ? 36 : 0) }}>
        {busy ? 'Refreshing…' : pull > 54 ? 'Release' : 'Pull to refresh'}
      </div>
      {children}
    </div>
  )
}

export function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-pill glass-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null
  return (
    <div className="sheet-root" role="alertdialog" aria-modal="true" aria-label={title}>
      <button type="button" className="sheet-backdrop" aria-label="Dismiss" onClick={onCancel} />
      <div className="sheet-panel glass-surface confirm-dialog">
        <div className="sheet-head">
          <div>
            <h3>{title}</h3>
            {message ? <p>{message}</p> : null}
          </div>
        </div>
        <div className="sheet-body form-actions" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="button button-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={cn('button', danger ? 'button-danger' : 'button-primary')}
            onClick={() => { haptic('medium'); onConfirm() }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
