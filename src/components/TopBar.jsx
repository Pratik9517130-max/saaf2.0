import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function TopBar() {
  const { profile, signOut } = useAuth()
  const isAdmin = profile?.role === 'admin'

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

        {/* Desktop Web App Navigation */}
        <nav className="topbar-nav" aria-label="Desktop Navigation">
          <NavLink
            to="/"
            className={({ isActive }) => `topbar-nav-link ${isActive ? 'active' : ''}`}
            end
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span>Feed</span>
          </NavLink>

          <NavLink
            to="/report"
            className={({ isActive }) => `topbar-nav-link ${isActive ? 'active' : ''}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span>Report</span>
          </NavLink>

          <NavLink
            to="/pickup"
            className={({ isActive }) => `topbar-nav-link ${isActive ? 'active' : ''}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="3" width="15" height="13" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
            <span>Pickup</span>
          </NavLink>

          <NavLink
            to="/assistant"
            className={({ isActive }) => `topbar-nav-link ${isActive ? 'active' : ''}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>Assistant</span>
          </NavLink>

          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) => `topbar-nav-link ${isActive ? 'active' : ''}`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
              <span>Admin</span>
            </NavLink>
          )}
        </nav>

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

