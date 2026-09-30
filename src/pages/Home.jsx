import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import TopBar from '../components/TopBar'
import StatsBanner from '../components/StatsBanner'
import StatusBadge from '../components/StatusBadge'
import PriorityBadge from '../components/PriorityBadge'
import BottomNav from '../components/BottomNav'
import '../styles/home.css'

function formatTimeAgo(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diffSec = Math.floor((now - date) / 1000)

  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function formatIssueType(type) {
  const map = {
    overflowing_bin: 'Overflowing Bin',
    road_garbage: 'Road Garbage',
    missed_collection: 'Missed Collection',
    illegal_dumping: 'Illegal Dumping',
    other: 'Other Issue',
  }
  return map[type] || type || 'Waste Issue'
}

export default function Home() {
  const [feed, setFeed] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const navigate = useNavigate()

  useEffect(() => {
    let ignore = false

    async function loadInitialData() {
      try {
        const [feedData, statsData] = await Promise.all([
          api.getFeed(),
          api.getStats(),
        ])
        if (!ignore) {
          setFeed(feedData || [])
          setStats(statsData || null)
        }
      } catch (err) {
        if (!ignore) {
          console.error('Error fetching home data:', err)
          setError(err?.message || 'Failed to load feed and stats')
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadInitialData()

    return () => {
      ignore = true
    }
  }, [])

  const handleRetry = async () => {
    setLoading(true)
    setError(null)
    try {
      const [feedData, statsData] = await Promise.all([
        api.getFeed(),
        api.getStats(),
      ])
      setFeed(feedData || [])
      setStats(statsData || null)
    } catch (err) {
      console.error('Error fetching home data:', err)
      setError(err?.message || 'Failed to load feed and stats')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleUpvote = async (e, complaintId, currentlyUpvoted) => {
    e.stopPropagation()

    // Optimistically update the feed item upvote count and status
    setFeed((prevFeed) =>
      prevFeed.map((item) => {
        if (item.id === complaintId) {
          const nextUpvoted = !currentlyUpvoted
          return {
            ...item,
            i_upvoted: nextUpvoted,
            upvote_count: nextUpvoted
              ? (item.upvote_count || 0) + 1
              : Math.max(0, (item.upvote_count || 0) - 1),
          }
        }
        return item
      })
    )

    try {
      await api.toggleUpvote(complaintId, currentlyUpvoted)
    } catch (err) {
      console.error('Failed to toggle upvote:', err)
      // Rollback on failure
      setFeed((prevFeed) =>
        prevFeed.map((item) => {
          if (item.id === complaintId) {
            return {
              ...item,
              i_upvoted: currentlyUpvoted,
              upvote_count: currentlyUpvoted
                ? (item.upvote_count || 0)
                : Math.max(0, (item.upvote_count || 0) - 1),
            }
          }
          return item
        })
      )
    }
  }

  return (
    <div className="home-page">
      <TopBar />

      <main className="home-container">
        <StatsBanner stats={stats} loading={loading} />

        <div className="action-buttons-grid">
          <Link to="/report" className="action-btn action-btn-report">
            <div className="action-btn-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <span className="action-btn-title">Report an issue</span>
            <span className="action-btn-desc">Photo + instant AI check</span>
          </Link>

          <Link to="/pickup" className="action-btn action-btn-pickup">
            <div className="action-btn-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </div>
            <span className="action-btn-title">Request a pickup</span>
            <span className="action-btn-desc">E-waste & bulky items</span>
          </Link>
        </div>

        <section className="feed-section" aria-label="Society Notice Feed">
          <div className="feed-header">
            <h1 className="feed-title">Society Notice Feed</h1>
            {!loading && !error && (
              <span className="feed-count">
                {feed.length} {feed.length === 1 ? 'report' : 'reports'}
              </span>
            )}
          </div>

          {loading && (
            <div className="state-card" aria-busy="true">
              <h2 className="state-title">Loading notice feed...</h2>
              <p className="state-desc">Fetching the latest community reports.</p>
            </div>
          )}

          {error && !loading && (
            <div className="state-card state-card-error" role="alert">
              <h2 className="state-title">Unable to load feed</h2>
              <p className="state-desc">{error}</p>
              <button type="button" className="state-btn" onClick={handleRetry}>
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && feed.length === 0 && (
            <div className="state-card">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              <h2 className="state-title">No issues reported</h2>
              <p className="state-desc">
                Society grounds are currently clean! If you spot an issue, be the first to report it.
              </p>
              <Link to="/report" className="state-btn">
                Report an issue
              </Link>
            </div>
          )}

          {!loading && !error && feed.length > 0 && (
            <div className="feed-list">
              {feed.map((item) => {
                const reporterName = item.is_anonymous
                  ? 'Anonymous Resident'
                  : item.reporter_name || 'Resident'
                const firstPhoto = item.photos && item.photos.length > 0 ? item.photos[0] : null

                return (
                  <article
                    key={item.id}
                    className="feed-card"
                    onClick={() => navigate(`/complaint/${item.id}`)}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        navigate(`/complaint/${item.id}`)
                      }
                    }}
                  >
                    <div className="feed-card-header">
                      <div>
                        <div className="feed-card-reporter">{reporterName}</div>
                        <div className="feed-card-meta">
                          {item.block && item.area_name ? `${item.block} • ${item.area_name}` : item.area_name || item.block || 'Society Ground'}
                          {item.created_at ? ` • ${formatTimeAgo(item.created_at)}` : ''}
                        </div>
                      </div>

                      <div className="feed-card-badges">
                        <StatusBadge status={item.status} />
                        <PriorityBadge priority={item.priority} />
                      </div>
                    </div>

                    <h2 className="feed-card-issue-type">
                      {formatIssueType(item.issue_type)}
                    </h2>

                    {item.description && (
                      <p className="feed-card-desc">{item.description}</p>
                    )}

                    {firstPhoto && (
                      <div className="feed-card-photo-wrapper">
                        <img
                          src={firstPhoto}
                          alt={formatIssueType(item.issue_type)}
                          className="feed-card-photo"
                          loading="lazy"
                        />
                      </div>
                    )}

                    <div className="feed-card-footer">
                      <button
                        type="button"
                        className={`upvote-button ${item.i_upvoted ? 'upvoted' : ''}`}
                        onClick={(e) => handleToggleUpvote(e, item.id, item.i_upvoted)}
                        aria-label="I face this too"
                      >
                        <svg
                          className="upvote-icon"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill={item.i_upvoted ? 'currentColor' : 'none'}
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="18 15 12 9 6 15" />
                        </svg>
                        <span>I face this too ({item.upvote_count ?? 0})</span>
                      </button>

                      <span className="feed-card-view-link">
                        Details &rarr;
                      </span>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  )
}
