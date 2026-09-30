import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function TopBar() {
  const { profile, signOut } = useAuth()

  return (
    <header className="topbar">
      <div className="topbar-container">
        <Link to="/" className="topbar-brand">
          <div className="topbar-logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </div>
          <div>
            <span className="topbar-title">Saaf</span>
            <span className="topbar-subtitle">Green Meadows Society</span>
          </div>
        </Link>

        <div className="topbar-actions">
          {profile && (
            <div className="topbar-user">
              <span className="topbar-flat">
                {profile.block ? `Tower ${profile.block}` : ''} {profile.flat_no ? `#${profile.flat_no}` : ''}
              </span>
              {profile.role === 'admin' && (
                <Link to="/admin" className="topbar-admin-badge">
                  Admin
                </Link>
              )}
              <button
                type="button"
                className="topbar-signout-btn"
                onClick={signOut}
                title="Sign out"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
