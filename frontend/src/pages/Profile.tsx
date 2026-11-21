import { FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { roleLabel, useAuth } from '../auth'
import { authApi } from '../services'
import { Avatar, ErrorBanner, Field, PageHeading, useToast } from '../components/UI'
import { apiError } from '../lib/format'

export default function Profile() {
  const { user: cached, refreshUser } = useAuth()
  const toast = useToast()
  const qc = useQueryClient()
  const [error, setError] = useState('')

  const { data, isLoading, isError } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const me = await refreshUser()
      if (!me) throw new Error('Session expired')
      return me
    },
  })

  const user = data ?? cached

  const save = useMutation({
    mutationFn: (body: { fullName: string; password?: string | null }) => authApi.updateMe(body),
    onSuccess: async (me) => {
      localStorage.setItem('haven.auth.user', JSON.stringify(me))
      await refreshUser()
      await qc.invalidateQueries({ queryKey: ['me'] })
      setError('')
      toast.success('Profile updated')
    },
    onError: (err) => setError(apiError(err, 'Could not update profile')),
  })

  function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const fullName = String(fd.get('fullName') || '').trim()
    const password = String(fd.get('password') || '').trim()
    const confirm = String(fd.get('confirmPassword') || '').trim()
    if (fullName.length < 2) {
      setError('Name must be at least 2 characters')
      return
    }
    if (password && password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password && password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setError('')
    save.mutate({ fullName, password: password || null })
  }

  return (
    <>
      <PageHeading
        eyebrow="Account"
        title="Profile"
        subtitle="Update your display name or set a local password for account recovery tooling."
      />
      {isError && <ErrorBanner message="Could not refresh profile." />}

      <div className="profile-hero">
        <Avatar name={user?.fullName || 'User'} size="lg" />
        <div>
          <h2>{isLoading ? 'Loading…' : user?.fullName}</h2>
          <p>{user?.email}</p>
        </div>
      </div>

      <div className="profile-meta-grid">
        <div>
          <div className="eyebrow">Role</div>
          <b>{user ? roleLabel(user.role) : '—'}</b>
        </div>
        <div>
          <div className="eyebrow">Society</div>
          <b>{user?.apartmentName || 'Platform scope'}</b>
        </div>
        <div>
          <div className="eyebrow">Flat</div>
          <b>{user?.flatNumber || 'Not allocated'}</b>
        </div>
        <div>
          <div className="eyebrow">User ID</div>
          <b style={{ fontSize: 12, fontWeight: 600, wordBreak: 'break-all' }}>{user?.id?.slice(0, 8)}…</b>
        </div>
      </div>

      {user && (
        <form className="form-grid" style={{ marginTop: 24, maxWidth: 480 }} onSubmit={onSave}>
          <Field label="Full name">
            <input name="fullName" required minLength={2} maxLength={140} defaultValue={user.fullName} key={user.fullName} />
          </Field>
          <Field label="Email" hint="Managed by administrators — contact support to change">
            <input value={user.email} disabled readOnly />
          </Field>
          <Field label="New password" hint="Leave blank to keep current password">
            <input name="password" type="password" minLength={8} maxLength={72} autoComplete="new-password" />
          </Field>
          <Field label="Confirm password">
            <input name="confirmPassword" type="password" minLength={8} maxLength={72} autoComplete="new-password" />
          </Field>
          <ErrorBanner message={error} />
          <div className="form-actions">
            <button type="submit" className="button button-primary" disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>
      )}
    </>
  )
}
