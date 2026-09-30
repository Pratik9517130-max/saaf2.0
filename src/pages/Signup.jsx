import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import '../styles/auth.css'

export default function Signup() {
  const [joinCode, setJoinCode] = useState('')
  const [name, setName] = useState('')
  const [block, setBlock] = useState('Tower A')
  const [flatNo, setFlatNo] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signUp({
        join_code: joinCode,
        name,
        block,
        flat_no: flatNo,
        phone,
        email,
        password,
      })
      navigate('/')
    } catch (err) {
      const errMsg = err?.message || ''
      if (errMsg.toLowerCase().includes('invalid join code') || errMsg === 'Invalid join code') {
        setError('Invalid join code')
      } else {
        setError(errMsg || 'Failed to sign up')
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
          <h1 className="auth-title">Join your society</h1>
          <p className="auth-subtitle">
            Enter your society join code and residential details to get started.
          </p>
        </div>

        {error && (
          <div className="auth-error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="join_code">
              Join Code
            </label>
            <input
              id="join_code"
              type="text"
              className="form-input"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="e.g. SAAF2026"
              required
              disabled={loading}
              autoComplete="off"
            />
            <span className="form-help">Ask your society admin or RWA for the code</span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="name">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Asha Verma"
              required
              disabled={loading}
              autoComplete="name"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="block">
                Block / Tower
              </label>
              <select
                id="block"
                className="form-select"
                value={block}
                onChange={(e) => setBlock(e.target.value)}
                required
                disabled={loading}
              >
                <option value="Tower A">Tower A</option>
                <option value="Tower B">Tower B</option>
                <option value="Tower C">Tower C</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="flat_no">
                Flat Number
              </label>
              <input
                id="flat_no"
                type="text"
                className="form-input"
                value={flatNo}
                onChange={(e) => setFlatNo(e.target.value)}
                placeholder="e.g. 402"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="phone">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              className="form-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              required
              disabled={loading}
              autoComplete="tel"
            />
          </div>

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
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="auth-button" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
