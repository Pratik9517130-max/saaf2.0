import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../styles/auth.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { signIn, loginAsDemo } = useAuth()
  const navigate = useNavigate()


  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const cleanEmail = email.trim()
    if (!cleanEmail) {
      setError('Please enter your email address.')
      return
    }
    if (!password) {
      setError('Please enter your password.')
      return
    }

    setLoading(true)

    try {
      await signIn(cleanEmail, password)
      navigate('/')
    } catch (err) {
      console.error('Sign in error:', err)
      const rawMsg = err?.message || 'Failed to sign in'
      if (rawMsg.toLowerCase().includes('failed to fetch')) {
        setError('Network error: Unable to connect to backend server. Please verify your internet connection or check Supabase settings in .env.local.')
      } else {
        setError(rawMsg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-brand">Saaf</div>
          <h1 className="auth-title">Sign in to your society</h1>
          <p className="auth-subtitle">
            Report issues, track society cleanliness, and view resolution updates.
          </p>
        </div>

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. resident@society.com"
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ margin: 'var(--s-4) 0 var(--s-3)', textAlign: 'center', borderTop: '1px solid var(--line)', position: 'relative' }}>
          <span style={{ position: 'relative', top: '-10px', background: 'var(--card)', padding: '0 var(--s-2)', fontSize: '11px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Instant Evaluation Access
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s-2)', marginBottom: 'var(--s-4)' }}>
          <button
            type="button"
            className="auth-button"
            style={{ backgroundColor: 'var(--card)', color: 'var(--green)', border: '1.5px solid var(--green)', fontSize: '13px', padding: 'var(--s-2)' }}
            onClick={() => {
              loginAsDemo('admin')
              navigate('/')
            }}
          >
            🛡️ Admin (402)
          </button>
          <button
            type="button"
            className="auth-button"
            style={{ backgroundColor: 'var(--card)', color: 'var(--ink)', border: '1.5px solid var(--line)', fontSize: '13px', padding: 'var(--s-2)' }}
            onClick={() => {
              loginAsDemo('resident')
              navigate('/')
            }}
          >
            👤 Resident (204)
          </button>
        </div>

        <div className="auth-footer">
          Don't have an account?{' '}
          <Link to="/signup" className="auth-link">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  )
}

