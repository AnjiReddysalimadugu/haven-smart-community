import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Plus } from 'lucide-react'
import type { FamilyMember } from '../api'
import { familyApi } from '../services'
import { useAuth } from '../auth'
import { useSociety } from '../society'
import {
  ConfirmDialog, DataToolbar, Empty, ErrorBanner, Field, PageHeading, Pagination,
  ResponsiveSheet, Status, useToast,
} from '../components/UI'
import { apiError, paginate } from '../lib/format'

export default function Family() {
  const { user, can } = useAuth()
  const { scopeParam } = useSociety()
  const toast = useToast()
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [open, setOpen] = useState(false)
  const [edit, setEdit] = useState<FamilyMember | null>(null)
  const [view, setView] = useState<FamilyMember | null>(null)
  const [deactivateId, setDeactivateId] = useState<{ id: string; name: string } | null>(null)
  const [error, setError] = useState('')

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['family', scopeParam, user?.flatId],
    queryFn: () => familyApi.list({
      apartmentId: scopeParam,
      flatId: user?.role === 'RESIDENT' ? (user.flatId ?? undefined) : undefined,
    }),
  })

  const rows = useMemo(() => {
    let list = data
    if (statusFilter === 'ACTIVE') list = list.filter((m) => m.active)
    if (statusFilter === 'INACTIVE') list = list.filter((m) => !m.active)
    if (q.trim()) {
      const t = q.toLowerCase()
      list = list.filter((m) => `${m.fullName} ${m.relation} ${m.flatNumber}`.toLowerCase().includes(t))
    }
    return list
  }, [data, q, statusFilter])
  const paged = paginate(rows, page, 10)

  const save = useMutation({
    mutationFn: (body: object) => (edit ? familyApi.update(edit.id, body) : familyApi.create(body)),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['family'] })
      setOpen(false)
      setEdit(null)
      toast.success(edit ? 'Family member updated' : 'Family member added')
    },
    onError: (err) => setError(apiError(err, 'Could not save family member')),
  })

  const deactivate = useMutation({
    mutationFn: (id: string) => familyApi.deactivate(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['family'] })
      setDeactivateId(null)
      toast.success('Family member deactivated')
    },
    onError: (err) => toast.error(apiError(err, 'Deactivate failed')),
  })

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const fullName = String(fd.get('fullName') || '').trim()
    const relation = String(fd.get('relation') || '').trim()
    if (fullName.length < 2 || !relation) {
      setError('Name and relation are required')
      return
    }
    const ageRaw = String(fd.get('age') || '').trim()
    setError('')
    save.mutate({
      fullName,
      relation,
      mobile: String(fd.get('mobile') || '').trim() || null,
      age: ageRaw ? Number(ageRaw) : null,
    })
  }

  return (
    <>
      <PageHeading
        eyebrow="Household"
        title="Family members"
        subtitle={user?.flatNumber ? `Flat ${user.flatNumber}` : 'Registered occupants of your flat'}
        action={can('family.manage') ? (
          <button type="button" className="button button-primary" onClick={() => { setEdit(null); setError(''); setOpen(true) }}>
            <Plus size={16} /> Add member
          </button>
        ) : undefined}
      />

      {isError && <ErrorBanner message="Could not load family members." />}

      <div className="table-panel">
        <DataToolbar title="Directory" count={rows.length} search={q} onSearch={(v) => { setQ(v); setPage(1) }} placeholder="Search name or relation…">
          <select className="select" style={{ width: 'auto' }} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1) }}>
            <option value="ALL">All status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </DataToolbar>
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Name</th><th>Relation</th><th>Mobile</th><th>Age</th><th>Flat</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={7}>Loading…</td></tr>}
              {paged.slice.map((m) => (
                <tr key={m.id}>
                  <td><b>{m.fullName}</b></td>
                  <td>{m.relation}</td>
                  <td>{m.mobile || '—'}</td>
                  <td>{m.age ?? '—'}</td>
                  <td>{m.flatNumber}</td>
                  <td><Status value={m.active ? 'ACTIVE' : 'INACTIVE'} /></td>
                  <td className="row-actions">
                    <button type="button" className="button button-ghost button-sm" onClick={() => setView(m)}>
                      <Eye size={14} /> View
                    </button>
                    {can('family.manage') && m.active && (
                      <>
                        <button type="button" className="button button-secondary button-sm" onClick={() => { setEdit(m); setError(''); setOpen(true) }}>Edit</button>
                        <button type="button" className="button button-danger button-sm" onClick={() => setDeactivateId({ id: m.id, name: m.fullName })}>
                          Deactivate
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && !paged.slice.length && <Empty title="No family members" description="Add household members linked to your flat." />}
        </div>
        <Pagination page={page} pageSize={10} total={rows.length} onPageChange={setPage} />
      </div>

      <ResponsiveSheet open={open} title={edit ? 'Edit family member' : 'Add family member'} onClose={() => setOpen(false)}>
        <form className="form-grid" onSubmit={onSubmit}>
          <Field label="Full name"><input name="fullName" defaultValue={edit?.fullName} required minLength={2} /></Field>
          <Field label="Relation">
            <select name="relation" defaultValue={edit?.relation || 'SPOUSE'} required>
              {['SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER'].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Mobile"><input name="mobile" defaultValue={edit?.mobile || ''} /></Field>
          <Field label="Age"><input name="age" type="number" min={0} max={120} defaultValue={edit?.age ?? ''} /></Field>
          <ErrorBanner message={error} />
          <div className="form-actions">
            <button type="button" className="button button-secondary" onClick={() => setOpen(false)}>Cancel</button>
            <button type="submit" className="button button-primary" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </ResponsiveSheet>

      <ResponsiveSheet open={Boolean(view)} title={view?.fullName ?? 'Member'} subtitle={view?.relation} onClose={() => setView(null)}>
        {view && (
          <div className="profile-meta-grid">
            <div><div className="eyebrow">Mobile</div><b>{view.mobile || '—'}</b></div>
            <div><div className="eyebrow">Age</div><b>{view.age ?? '—'}</b></div>
            <div><div className="eyebrow">Flat</div><b>{view.flatNumber}</b></div>
            <div><div className="eyebrow">Status</div><Status value={view.active ? 'ACTIVE' : 'INACTIVE'} /></div>
          </div>
        )}
      </ResponsiveSheet>

      <ConfirmDialog
        open={Boolean(deactivateId)}
        title="Deactivate member"
        message={`Deactivate ${deactivateId?.name}? They will no longer appear as an active household member.`}
        confirmLabel="Deactivate"
        danger
        busy={deactivate.isPending}
        onClose={() => setDeactivateId(null)}
        onConfirm={() => deactivateId && deactivate.mutate(deactivateId.id)}
      />
    </>
  )
}
