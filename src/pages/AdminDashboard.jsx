import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import TopBar from '../components/TopBar'
import StatusBadge from '../components/StatusBadge'
import PriorityBadge from '../components/PriorityBadge'
import BottomNav from '../components/BottomNav'
import '../styles/admin.css'

const OVERDUE_DAYS = 3

const PRIORITY_ORDER = {
  critical: 1,
  high: 2,
  medium: 3,
  low: 4,
}

const ISSUE_TYPE_LABELS = {
  overflowing_bin: 'Overflowing Bin',
  road_garbage: 'Road Garbage',
  missed_collection: 'Missed Collection',
  illegal_dumping: 'Illegal Dumping',
  other: 'Other',
}

function formatAge(dateString, now) {
  if (!dateString) return ''
  const itemTime = new Date(dateString).getTime()
  const diffSec = Math.floor((now - itemTime) / 1000)
  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d`
}

function isOverdue(item, now) {
  if (item.status === 'resolved' || item.status === 'rejected') return false
  const ageMs = now - new Date(item.created_at).getTime()
  return ageMs > OVERDUE_DAYS * 86400000
}

export default function AdminDashboard() {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [now] = useState(() => Date.now())

  const navigate = useNavigate()

  useEffect(() => {
    let ignore = false

    async function loadData() {
      try {
        const data = await api.adminGetComplaints()
        if (!ignore) {
          setComplaints(data || [])
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to load admin complaints:', err)
          setError(err?.message || 'Failed to load complaints')
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      ignore = true
    }
  }, [])

  // Calculate top row number tiles
  const openCount = complaints.filter(
    (c) => c.status === 'submitted' || c.status === 'acknowledged'
  ).length

  const inProgressCount = complaints.filter(
    (c) => c.status === 'in_progress'
  ).length

  const resolvedThisWeekCount = complaints.filter((c) => {
    if (c.status !== 'resolved') return false
    const dateToCheck = c.resolved_at || c.created_at
    const diffMs = now - new Date(dateToCheck).getTime()
    return diffMs <= 7 * 86400000
  }).length

  const overdueCount = complaints.filter((c) => isOverdue(c, now)).length

  // Counts by Issue Type
  const countsByIssueType = Object.keys(ISSUE_TYPE_LABELS).map((typeKey) => {
    const total = complaints.filter((c) => c.issue_type === typeKey).length
    const open = complaints.filter(
      (c) => c.issue_type === typeKey && c.status !== 'resolved' && c.status !== 'rejected'
    ).length
    return {
      key: typeKey,
      label: ISSUE_TYPE_LABELS[typeKey],
      total,
      open,
    }
  })

  // Counts by Block
  const uniqueBlocks = Array.from(
    new Set(complaints.map((c) => c.block).filter(Boolean))
  )
  const countsByBlock = uniqueBlocks.map((blk) => {
    const total = complaints.filter((c) => c.block === blk).length
    const open = complaints.filter(
      (c) => c.block === blk && c.status !== 'resolved' && c.status !== 'rejected'
    ).length
    return {
      block: blk,
      total,
      open,
    }
  })

  // Filter complaints based on status filter chip
  const filteredComplaints = complaints.filter((c) => {
    if (statusFilter === 'all') return true
    if (statusFilter === 'open') return c.status === 'submitted' || c.status === 'acknowledged'
    if (statusFilter === 'in_progress') return c.status === 'in_progress'
    if (statusFilter === 'resolved') return c.status === 'resolved'
    if (statusFilter === 'rejected') return c.status === 'rejected'
    if (statusFilter === 'overdue') return isOverdue(c, now)
    return true
  })

  // Sort by priority (critical, high, medium, low) then oldest first
  const sortedComplaints = [...filteredComplaints].sort((a, b) => {
    const pA = PRIORITY_ORDER[a.priority] || 99
    const pB = PRIORITY_ORDER[b.priority] || 99
    if (pA !== pB) return pA - pB
    return new Date(a.created_at) - new Date(b.created_at)
  })

  return (
    <div className="admin-page">
      <TopBar />

      <main className="admin-container">
        <div className="admin-header">
          <div className="admin-title-group">
            <h1 className="admin-title">Admin Operations Dashboard</h1>
            <span className="admin-badge-pill">Admin</span>
          </div>
          <Link to="/" className="admin-nav-link">
            &larr; Switch to Resident Feed
          </Link>
        </div>

        {error && (
          <div className="submit-error-banner" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="state-card" aria-busy="true">
            <h2 className="state-title">Loading admin dashboard...</h2>
            <p className="state-desc">Fetching society complaints and metrics.</p>
          </div>
        ) : (
          <>
            {/* Top row of number tiles */}
            <section className="admin-tiles-grid" aria-label="Metrics summary">
              <div className="admin-tile admin-tile-open">
                <span className="admin-tile-label">Open</span>
                <span className="admin-tile-num">{openCount}</span>
                <span className="admin-tile-desc">Submitted + Acknowledged</span>
              </div>

              <div className="admin-tile admin-tile-progress">
                <span className="admin-tile-label">In Progress</span>
                <span className="admin-tile-num">{inProgressCount}</span>
                <span className="admin-tile-desc">Active field assignments</span>
              </div>

              <div className="admin-tile admin-tile-resolved">
                <span className="admin-tile-label">Resolved This Week</span>
                <span className="admin-tile-num">{resolvedThisWeekCount}</span>
                <span className="admin-tile-desc">Past 7 days</span>
              </div>

              <div className="admin-tile admin-tile-overdue">
                <span className="admin-tile-label">Overdue</span>
                <span className="admin-tile-num">{overdueCount}</span>
                <span className="admin-tile-desc">&gt; {OVERDUE_DAYS} days unresolved</span>
              </div>
            </section>

            {/* Counts by issue type and block */}
            <section className="admin-summary-grid">
              <div className="admin-summary-card">
                <h2 className="admin-summary-title">Counts by Issue Type</h2>
                <table className="admin-simple-table">
                  <thead>
                    <tr>
                      <th>Issue Type</th>
                      <th style={{ textAlign: 'right' }}>Open</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {countsByIssueType.map((row) => (
                      <tr key={row.key}>
                        <td>{row.label}</td>
                        <td className="admin-table-count" style={{ color: row.open > 0 ? 'var(--amber)' : 'inherit' }}>
                          {row.open}
                        </td>
                        <td className="admin-table-count">{row.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="admin-summary-card">
                <h2 className="admin-summary-title">Counts by Block / Tower</h2>
                <table className="admin-simple-table">
                  <thead>
                    <tr>
                      <th>Block</th>
                      <th style={{ textAlign: 'right' }}>Open</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {countsByBlock.length === 0 ? (
                      <tr>
                        <td colSpan="3" style={{ textAlign: 'center', color: 'var(--muted)' }}>
                          No block data available
                        </td>
                      </tr>
                    ) : (
                      countsByBlock.map((row) => (
                        <tr key={row.block}>
                          <td>Tower {row.block}</td>
                          <td className="admin-table-count" style={{ color: row.open > 0 ? 'var(--amber)' : 'inherit' }}>
                            {row.open}
                          </td>
                          <td className="admin-table-count">{row.total}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Dense priority table */}
            <section className="admin-table-card" aria-label="Complaints Priority Table">
              <div className="admin-table-header">
                <h2 className="admin-table-title">Complaints Queue</h2>

                <div className="filter-chips-row" role="tablist" aria-label="Filter status">
                  <button
                    type="button"
                    className={`filter-chip ${statusFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('all')}
                  >
                    All ({complaints.length})
                  </button>
                  <button
                    type="button"
                    className={`filter-chip ${statusFilter === 'open' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('open')}
                  >
                    Open ({openCount})
                  </button>
                  <button
                    type="button"
                    className={`filter-chip ${statusFilter === 'in_progress' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('in_progress')}
                  >
                    In Progress ({inProgressCount})
                  </button>
                  <button
                    type="button"
                    className={`filter-chip ${statusFilter === 'resolved' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('resolved')}
                  >
                    Resolved ({complaints.filter((c) => c.status === 'resolved').length})
                  </button>
                  <button
                    type="button"
                    className={`filter-chip ${statusFilter === 'rejected' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('rejected')}
                  >
                    Rejected ({complaints.filter((c) => c.status === 'rejected').length})
                  </button>
                  <button
                    type="button"
                    className={`filter-chip ${statusFilter === 'overdue' ? 'active' : ''}`}
                    onClick={() => setStatusFilter('overdue')}
                  >
                    Overdue ({overdueCount})
                  </button>
                </div>
              </div>

              {sortedComplaints.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--s-4)', color: 'var(--muted)', fontSize: '14px' }}>
                  No complaints match the selected filter.
                </div>
              ) : (
                <div className="admin-table-wrapper">
                  <table className="admin-dense-table">
                    <thead>
                      <tr>
                        <th>Priority</th>
                        <th>Type</th>
                        <th>Location</th>
                        <th>Reporter</th>
                        <th>Age</th>
                        <th>Status</th>
                        <th>Overdue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedComplaints.map((item) => {
                        const itemOverdue = isOverdue(item, now)
                        const reporter = item.reporter_real || {}
                        const reporterText = `${reporter.name || item.reporter_name || 'Resident'}, #${reporter.flat_no || '-'}, ${reporter.phone || '-'}`
                        const locationText = `${item.block ? `Tower ${item.block} - ` : ''}${item.area_name || ''}`

                        return (
                          <tr
                            key={item.id}
                            className="admin-table-row"
                            onClick={() => navigate(`/admin/complaint/${item.id}`)}
                            title="Click to view and manage complaint"
                          >
                            <td>
                              <PriorityBadge priority={item.priority} />
                            </td>
                            <td style={{ fontWeight: 600 }}>
                              {ISSUE_TYPE_LABELS[item.issue_type] || item.issue_type}
                            </td>
                            <td>{locationText}</td>
                            <td>{reporterText}</td>
                            <td style={{ color: 'var(--muted)' }}>
                              {formatAge(item.created_at, now)}
                            </td>
                            <td>
                              <StatusBadge status={item.status} />
                            </td>
                            <td>
                              {itemOverdue ? (
                                <span className="overdue-badge">Overdue</span>
                              ) : (
                                <span style={{ color: 'var(--muted)' }}>-</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
