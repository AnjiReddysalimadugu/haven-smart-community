import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Building2, KeyRound, Mail, ShieldCheck } from 'lucide-react'
import { postLoginPath, roleLabel, useAuth } from '../auth'
import type { Role } from '../api'
import { authApi } from '../services'
import { ErrorBanner } from '../components/UI'
import {
  isGoogleWebConfigured,
  promptGoogleIdToken,
  validateLoginEmail,
  validateOtp,
} from '../lib/googleAuth'

const demos: { email: string; role: Role; blurb: string }[] = [
  { email: 'anji99121640@gmail.com', role: 'SUPER_ADMIN', blurb: 'Create societies platform-wide' },
  { email: 'admin@haven.local', role: 'APARTMENT_ADMIN', blurb: 'Society operations & residents' },
  { email: 'staff@haven.local', role: 'STAFF', blurb: 'Collections & complaints' },
  { email: 'security@haven.local', role: 'SECURITY', blurb: 'Gate check-in desk' },
  { email: 'resident@haven.local', role: 'RESIDENT', blurb: 'Bills, visitors, tickets' },
]

export default function Login() {
  const { user, loading, login, loginWithGoogle, requestOtp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('admin@haven.local')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [devOtp, setDevOtp] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [serverGoogle, setServerGoogle] = useState(false)

  const selectedDemo = useMemo(() => demos.find((d) => d.email === email) ?? null, [email])
  const from = (location.state as { from?: string } | null)?.from
  const clientGoogle = isGoogleWebConfigured()
  const showGoogle = clientGoogle || serverGoogle

  useEffect(() => {
    void authApi.options()
      .then((o) => setServerGoogle(Boolean(o.googleEnabled)))
      .catch(() => setServerGoogle(false))
  }, [])

  if (!loading && user) {
    return <Navigate to={postLoginPath(user.role, from)} replace />
  }

  async function onRequestOtp(e: FormEvent) {
    e.preventDefault()
    const emailErr = validateLoginEmail(email)
    if (emailErr) {
      setError(emailErr)
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const res = await requestOtp(email.trim().toLowerCase())
      setEmail(email.trim().toLowerCase())
      setOtpSent(true)
      setDevOtp(res.devOtp ?? null)
      if (res.devOtp) setOtp(res.devOtp)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not send OTP. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault()
    const emailErr = validateLoginEmail(email)
    if (emailErr) {
      setError(emailErr)
      return
    }
    const otpErr = validateOtp(otp)
    if (otpErr) {
      setError(otpErr)
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const nextUser = await login(email.trim().toLowerCase(), otp.trim())
      navigate(postLoginPath(nextUser.role, from), { replace: true })
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to sign in. Check email and OTP.')
    } finally {
      setSubmitting(false)
    }
  }

  async function onGoogle() {
    if (!clientGoogle) {
      setError('Set VITE_GOOGLE_WEB_CLIENT_ID in the frontend env to enable Google on web.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      const idToken = await promptGoogleIdToken()
      const nextUser = await loginWithGoogle(idToken)
      navigate(postLoginPath(nextUser.role, from), { replace: true })
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Google sign-in failed.')
    } finally {
      setSubmitting(false)
    }
  }

  function resetEmail() {
    setOtpSent(false)
    setOtp('')
    setDevOtp(null)
    setError('')
  }

  return (
    <div className="login-shell">
      <div className="login-visual" aria-hidden="true">
        <div className="login-visual-content">
          <div className="login-brand">
            <div className="brand-mark"><Building2 size={18} /></div>
            <div>
              <strong>Haven</strong>
              <small style={{ display: 'block', color: '#94A3B8', fontSize: 12 }}>COMMUNITY OS</small>
            </div>
          </div>
          <h1>Apartment operations, calmly organized.</h1>
          <p>Billing, occupancy, visitors and service requests — tailored to every role in your society.</p>
          <ul>
            <li><ShieldCheck size={16} color="#60A5FA" /> Role-aware workspaces for admins, staff and security</li>
            <li><ShieldCheck size={16} color="#60A5FA" /> Real-time collections and occupancy visibility</li>
            <li><ShieldCheck size={16} color="#60A5FA" /> Gate check-in with QR visitor passes</li>
          </ul>
        </div>
      </div>

      <div className="login-panel">
        {!otpSent ? (
          <form className="login-card" onSubmit={onRequestOtp}>
            <div className="eyebrow">Welcome back</div>
            <h2>Sign in to Haven</h2>
            <p className="login-sub">Enter your registered email. We will send a 6-digit OTP.</p>

            <label className="field" style={{ marginBottom: 12 }}>
              <span>Email</span>
              <div className="field-control">
                <Mail size={15} />
                <input
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={254}
                />
              </div>
            </label>

            <ErrorBanner message={error} />

            <button className="button button-primary login-submit" type="submit" disabled={submitting || loading}>
              {submitting ? 'Sending code…' : 'Send OTP'}
            </button>

            {showGoogle ? (
              <>
                <div className="login-or" aria-hidden="true"><span>or</span></div>
                <button
                  type="button"
                  className="button button-secondary login-submit login-google"
                  onClick={onGoogle}
                  disabled={submitting || loading || !clientGoogle}
                >
                  Continue with Google
                </button>
                {!clientGoogle && serverGoogle ? (
                  <p className="demo-hint">Server Google is on — set VITE_GOOGLE_WEB_CLIENT_ID for the web client.</p>
                ) : null}
              </>
            ) : null}

            <div className="demo-accounts">
              <small>Demo accounts</small>
              <div className="demo-chips">
                {demos.map((d) => (
                  <button
                    key={d.email}
                    type="button"
                    className={`demo-chip ${email === d.email ? 'active' : ''}`}
                    onClick={() => { setEmail(d.email); setError('') }}
                  >
                    <b>{roleLabel(d.role)}</b>
                    <span>{d.blurb}</span>
                  </button>
                ))}
              </div>
              {selectedDemo && <p className="demo-hint">{selectedDemo.email}</p>}
            </div>
          </form>
        ) : (
          <form className="login-card" onSubmit={onVerify}>
            <div className="eyebrow">Verify</div>
            <h2>Enter OTP</h2>
            <p className="login-sub">Check your inbox for the code sent to <b>{email}</b></p>

            <label className="field" style={{ marginBottom: 12 }}>
              <span>6-digit OTP</span>
              <div className="field-control">
                <KeyRound size={15} />
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="\d{6}"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                />
              </div>
            </label>

            {devOtp && (
              <p className="demo-hint" style={{ marginBottom: 12 }}>
                Dev fallback OTP: <b>{devOtp}</b> (SMTP off / OTP_EXPOSE=true)
              </p>
            )}

            <ErrorBanner message={error} />

            <button
              className="button button-primary login-submit"
              type="submit"
              disabled={submitting || loading || otp.length !== 6}
            >
              {submitting ? 'Verifying…' : 'Verify & sign in'}
            </button>

            <button type="button" className="button button-secondary login-submit" style={{ marginTop: 10 }} onClick={resetEmail}>
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
