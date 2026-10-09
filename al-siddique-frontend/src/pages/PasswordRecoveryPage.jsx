import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import api from '../services/api'

const GENERIC_NOTICE = 'If this account is eligible and SMS recovery is available, a verification code will be sent to its registered phone. If no code arrives, contact your school administrator.'

export default function PasswordRecoveryPage() {
  const [loginId, setLoginId] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [completed, setCompleted] = useState(false)

  const startRecovery = async (event) => {
    event.preventDefault()
    if (busy || !loginId.trim()) return
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const params = new URLSearchParams(window.location.search)
      const school_id = params.get('school_id') || params.get('schoolId')
      const school_code = params.get('school_code') || params.get('schoolCode')
      const response = await api.post('/api/auth/password-reset/request', {
        loginId: loginId.trim(),
        ...(school_id ? { school_id } : {}),
        ...(school_code ? { school_code } : {}),
      })
      if (response?.data?.success === false || !response?.data?.resetToken || !/^[a-f0-9]{48}$/i.test(response.data.resetToken)) {
        throw new Error('Recovery service is not yet available. Contact your school administrator.')
      }
      setResetToken(response.data.resetToken)
      setNotice(GENERIC_NOTICE)
    } catch (err) {
      setError(err?.response?.status === 429 ? 'Too many requests. Please try again later.' : 'Recovery service is unavailable. Contact your school administrator.')
    } finally {
      setBusy(false)
    }
  }

  const confirmRecovery = async (event) => {
    event.preventDefault()
    if (busy) return
    if (!/^\d{6}$/.test(otp)) { setError('Enter the six-digit verification code.'); return }
    if (newPassword.length < 8) { setError('Use a password of at least 8 characters.'); return }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return }
    setBusy(true)
    setError('')
    try {
      await api.post('/api/auth/password-reset/confirm', { resetToken, otp, newPassword })
      setOtp('')
      setNewPassword('')
      setConfirmPassword('')
      setResetToken('')
      setCompleted(true)
      setNotice('Password updated. You can now sign in with the new password.')
    } catch (err) {
      setError(err?.response?.status === 429 ? 'Too many attempts. Start recovery again later.' : 'Verification failed or expired. Check the code or request another one.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="apex-auth-shell apex-recovery-page">
    <section className="apex-auth-stage" aria-labelledby="recovery-title">
      <header className="apex-auth-brand">
        <div className="apex-auth-logo-plate"><img src="/apex-logo.svg" alt="APEX Education OS official logo" /></div>
        <div><p className="apex-auth-kicker">APEX OS · Account Security</p><h1>APEX Education OS</h1><p className="apex-auth-brand-copy">Secure account recovery for authorized school users.</p></div>
      </header>
      <section className="apex-auth-card">
        <div className="apex-auth-card-head"><div><span className="apex-auth-eyebrow">Account recovery</span><h2 id="recovery-title">{completed ? 'Password updated' : resetToken ? 'Verify your code' : 'Forgot your password?'}</h2><p>Use your registered account to recover access.</p></div><ShieldCheck aria-hidden="true" size={18}/></div>
        {completed ? <p role="status">{notice}</p> : !resetToken ? <form className="apex-auth-form" onSubmit={startRecovery}>
          <label htmlFor="recovery-account">Account email or login ID</label>
          <input id="recovery-account" value={loginId} onChange={e=>setLoginId(e.target.value)} autoComplete="username" required maxLength={254} placeholder="Enter your school account ID" />
          <button className="apex-auth-submit" type="submit" disabled={busy}>{busy ? 'Checking recovery options…' : 'Request verification code'}</button>
        </form> : <form className="apex-auth-form" onSubmit={confirmRecovery}>
          <p role="status" className="apex-recovery-notice">{notice}</p>
          <label htmlFor="recovery-code">Six-digit SMS code</label>
          <input id="recovery-code" inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} required maxLength={6} />
          <label htmlFor="recovery-password">New password</label>
          <input id="recovery-password" type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={e=>setNewPassword(e.target.value)} required />
          <label htmlFor="recovery-confirm">Confirm new password</label>
          <input id="recovery-confirm" type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required />
          <button className="apex-auth-submit" type="submit" disabled={busy}>{busy ? 'Verifying…' : 'Reset password'}</button>
          <button className="apex-recovery-text-button" type="button" onClick={()=>{setResetToken('');setOtp('');setNewPassword('');setConfirmPassword('');setError('')}}>Request a new code</button>
        </form>}
        {error && <p className="apex-auth-error" role="alert">{error}</p>}
        <p className="apex-recovery-help">If you cannot receive verification SMS, contact your school administrator. Never share your code or password.</p>
        <Link className="apex-recovery-back" to={`/login${window.location.search || ''}`}>← Back to sign in</Link>
      </section>
    </section>
  </main>
}
