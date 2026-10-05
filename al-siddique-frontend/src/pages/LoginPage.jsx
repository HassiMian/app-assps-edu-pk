import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Moon, ShieldCheck, Sun } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useTenantBranding } from '../context/TenantBrandingContext'
import { normalizeAppRole } from '../utils/role'

export default function LoginPage() {
  const { login } = useAuth()
  const { theme, setTheme } = useTheme()
  const branding = useTenantBranding()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isLight = theme === 'light'
  const schoolName = branding?.schoolName || 'AL SIDDIQUE SCHOLARS PUBLIC SCHOOL'
  const logoUrl = branding?.logoUrl || '/school-logo.svg'

  const handleLogin = async (event) => {
    event.preventDefault()
    if (loading) return

    setError('')
    setLoading(true)

    try {
      const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
      const schoolId = searchParams?.get('school_id') || searchParams?.get('schoolId') || undefined
      const schoolCode = searchParams?.get('school_code') || searchParams?.get('schoolCode') || undefined
      const schoolContext = {}
      if (schoolId) schoolContext.school_id = schoolId
      if (schoolCode) schoolContext.school_code = schoolCode

      const result = await login(email, password, schoolContext)
      if (!result.success) {
        setError(result.message || 'Invalid email or password. Please try again.')
        return
      }

      if (result.user?.mustChangePassword || result.user?.must_change_password) {
        navigate('/change-password')
        return
      }

      const userRole = normalizeAppRole(result.user?.role)
      if (userRole === 'student') navigate('/student-portal')
      else if (userRole === 'parent') navigate('/parents')
      else navigate('/dashboard')
    } catch (loginError) {
      setError(loginError?.message || 'Sign in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="apex-auth-shell">
      <div className="apex-auth-orb apex-auth-orb--primary" aria-hidden="true" />
      <div className="apex-auth-orb apex-auth-orb--secondary" aria-hidden="true" />

      <div className="apex-auth-theme-switch" role="group" aria-label="Theme preference">
        <button
          type="button"
          aria-label="Use light mode"
          aria-pressed={isLight}
          className={isLight ? 'is-active' : ''}
          onClick={() => setTheme('light')}
        >
          <Sun size={16} />
          <span>Light</span>
        </button>
        <button
          type="button"
          aria-label="Use dark mode"
          aria-pressed={!isLight}
          className={!isLight ? 'is-active' : ''}
          onClick={() => setTheme('dark')}
        >
          <Moon size={16} />
          <span>Dark</span>
        </button>
      </div>

      <section className="apex-auth-stage" aria-labelledby="login-title">
        <header className="apex-auth-brand">
          <div className="apex-auth-logo-plate">
            <img src={logoUrl} alt={`${schoolName} logo`} />
          </div>
          <div>
            <p className="apex-auth-kicker">APEX OS · Secure School Workspace</p>
            <h1 id="login-title">{schoolName}</h1>
            <p className="apex-auth-brand-copy">A focused operating environment for academics, administration and school services.</p>
          </div>
        </header>

        <div className="apex-auth-card">
          <div className="apex-auth-card-head">
            <div>
              <span className="apex-auth-eyebrow">Welcome back</span>
              <h2>Sign in to continue</h2>
              <p>Use your authorized school account.</p>
            </div>
            <div className="apex-auth-trust" title="Tenant-aware secure access">
              <ShieldCheck size={18} />
            </div>
          </div>

          <form onSubmit={handleLogin} className="apex-auth-form">
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              autoComplete="username"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@school.edu.pk"
              required
            />

            <label htmlFor="login-password">Password</label>
            <div className="apex-auth-password-wrap">
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="apex-auth-password-toggle"
                aria-label={showPass ? 'Hide password' : 'Show password'}
                onClick={() => setShowPass((value) => !value)}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && (
              <div className="apex-auth-error" role="alert">
                {error}
              </div>
            )}

            <button type="submit" className="apex-auth-submit" disabled={loading}>
              <span>{loading ? 'Signing in…' : 'Sign in'}</span>
              {!loading && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <div className="apex-auth-security-note">
            Your access is scoped to your authorized school, role and permissions.
          </div>
        </div>

        <footer className="apex-auth-footer">© 2026 APEX Systems OS · All rights reserved</footer>
      </section>
    </main>
  )
}
