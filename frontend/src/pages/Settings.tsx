import { FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Apartment } from '../api'
import { propertyApi } from '../services'
import { useAuth, roleLabel } from '../auth'
import { useTheme } from '../theme'
import { ConfirmDialog, Empty, ErrorBanner, Field, PageHeading, ResponsiveSheet, Status, useToast } from '../components/UI'
import { apiError } from '../lib/format'

export default function Settings() {
  const { user, can } = useAuth()
  const { theme, setTheme } = useTheme()
  const toast = useToast()
  const qc = useQueryClient()
  const [edit, setEdit] = useState<Apartment | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; name: string } | null>(null)
  const [error, setError] = useState('')

  const { data: apartments = [], isLoading, isError } = useQuery({
    queryKey: ['apartments'],
    queryFn: propertyApi.apartments,
  })

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => propertyApi.updateApartment(id, body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['apartments'] })
      setEdit(null)
      toast.success('Society profile updated')
    },
    onError: (err) => setError(apiError(err, 'Could not update society')),
  })

  const archive = useMutation({
    mutationFn: (id: string) => propertyApi.archiveApartment(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['apartments'] })
      setArchiveTarget(null)
      toast.success('Society archived')
    },
    onError: (err) => toast.error(apiError(err, 'Archive failed')),
  })

  function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!edit) return
    const fd = new FormData(e.currentTarget)
    setError('')
    update.mutate({
      id: edit.id,
      body: {
        name: String(fd.get('name') || '').trim(),
        address: String(fd.get('address') || '').trim(),
        timezone: String(fd.get('timezone') || '').trim() || 'Asia/Kolkata',
      },
    })
  }

  return (
    <>
      <PageHeading
        eyebrow="Administration"
        title="Settings"
        subtitle="Society profile, appearance, and access context from live apartment and auth APIs."
      />

      {isError && <ErrorBanner message="Could not load society settings." />}

      <div className="settings-grid">
        <div className="settings-card">
          <div className="eyebrow">Signed-in operator</div>
          <h2>{user?.fullName}</h2>
          <div style={{ display: 'grid', gap: 12, fontSize: 14 }}>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 650 }}>Email</span>
              <div><b>{user?.email}</b></div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 650 }}>Role</span>
              <div><b>{user ? roleLabel(user.role) : '—'}</b></div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)', fontSize: 12.5, fontWeight: 650 }}>Apartment scope</span>
              <div><b>{user?.apartmentName || (user?.role === 'SUPER_ADMIN' ? 'Platform-wide' : '—')}</b></div>
            </div>
          </div>
        </div>

        <div className="settings-card">
          <div className="eyebrow">Appearance</div>
          <h2>Theme</h2>
          <div className="tabs">
            <button type="button" className={`tab ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}>Light</button>
            <button type="button" className={`tab ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}>Dark</button>
          </div>
          <p style={{ margin: '16px 0 0', color: 'var(--text-muted)', fontSize: 13.5, lineHeight: 1.5 }}>
            Haven defaults to a calm light workspace. Demo seeding is off under the prod profile.
          </p>
        </div>
      </div>

      <div className="table-panel">
        <div className="table-toolbar">
          <div className="table-title"><b>Societies in scope</b><span>{apartments.length}</span></div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Address</th><th>Timezone</th><th>Status</th>
                {can('settings.view') && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={5}>Loading…</td></tr>}
              {apartments.map((a) => (
                <tr key={a.id}>
                  <td><b>{a.name}</b></td>
                  <td>{a.address}</td>
                  <td>{a.timezone}</td>
                  <td><Status value={a.status} /></td>
                  {can('settings.view') && (
                    <td>
                      <div className="row-actions">
                        <button type="button" className="button button-ghost button-sm" onClick={() => { setError(''); setEdit(a) }}>
                          Edit
                        </button>
                        {user?.role === 'SUPER_ADMIN' && a.status !== 'ARCHIVED' && (
                          <button
                            type="button"
                            className="button button-ghost button-sm"
                            disabled={archive.isPending}
                            onClick={() => {
                              setArchiveTarget({ id: a.id, name: a.name })
                            }}
                          >
                            Archive
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && !apartments.length && (
            <Empty title="No societies" description="Super admins can create a society from Properties." />
          )}
        </div>
      </div>

      <ResponsiveSheet open={Boolean(edit)} title={`Edit · ${edit?.name ?? ''}`} onClose={() => setEdit(null)}>
        {edit && (
          <form className="form-grid" onSubmit={onSave}>
            <Field label="Name"><input name="name" required defaultValue={edit.name} /></Field>
            <Field label="Address"><input name="address" required defaultValue={edit.address} /></Field>
            <Field label="Timezone"><input name="timezone" defaultValue={edit.timezone || 'Asia/Kolkata'} /></Field>
            <ErrorBanner message={error} />
            <div className="form-actions">
              <button type="button" className="button button-secondary" onClick={() => setEdit(null)}>Cancel</button>
              <button type="submit" className="button button-primary" disabled={update.isPending}>
                {update.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </ResponsiveSheet>

      <ConfirmDialog
        open={Boolean(archiveTarget)}
        title="Archive society"
        message={`Archive ${archiveTarget?.name}? It will no longer appear as an active society.`}
        confirmLabel="Archive"
        danger
        busy={archive.isPending}
        onClose={() => setArchiveTarget(null)}
        onConfirm={() => archiveTarget && archive.mutate(archiveTarget.id)}
      />
    </>
  )
}
