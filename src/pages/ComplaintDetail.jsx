import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import TopBar from '../components/TopBar'
import StatusBadge from '../components/StatusBadge'
import PriorityBadge from '../components/PriorityBadge'
import BottomNav from '../components/BottomNav'
import '../styles/detail.css'

function formatDateTime(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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

function formatStepLabel(status) {
  const map = {
    submitted: 'Submitted',
    acknowledged: 'Acknowledged',
    in_progress: 'In progress',
    resolved: 'Resolved',
    rejected: 'Rejected',
  }
  return map[status] || status || 'Submitted'
}

function getStepActor(to_status) {
  if (to_status === 'submitted') {
    return 'Resident'
  }
  return 'Society office'
}

export default function ComplaintDetail() {
  const { id } = useParams()
  const [complaint, setComplaint] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0)

  useEffect(() => {
    let ignore = false

    async function loadComplaint() {
      try {
        const data = await api.getComplaint(id)
        if (!ignore) {
          if (!data || !data.id) {
            setNotFound(true)
          } else {
            setComplaint(data)
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to load complaint:', err)
          setNotFound(true)
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadComplaint()

    return () => {
      ignore = true
    }
  }, [id])

  const handleToggleUpvote = async () => {
    if (!complaint) return
    const currentlyUpvoted = !!complaint.i_upvoted
    const nextUpvoted = !currentlyUpvoted

    setComplaint((prev) => ({
      ...prev,
      i_upvoted: nextUpvoted,
      upvote_count: nextUpvoted
        ? (prev.upvote_count || 0) + 1
        : Math.max(0, (prev.upvote_count || 0) - 1),
    }))

    try {
      await api.toggleUpvote(complaint.id, currentlyUpvoted)
    } catch (err) {
      console.error('Failed to toggle upvote:', err)
      // Rollback on failure
      setComplaint((prev) => ({
        ...prev,
        i_upvoted: currentlyUpvoted,
        upvote_count: currentlyUpvoted
          ? (prev.upvote_count || 0)
          : Math.max(0, (prev.upvote_count || 0) - 1),
      }))
    }
  }

  if (loading) {
    return (
      <div className="detail-page">
        <TopBar />
        <main className="detail-container">
          <div className="state-card" aria-busy="true">
            <h2 className="state-title">Loading complaint details...</h2>
            <p className="state-desc">Fetching report timeline and status.</p>
          </div>
        </main>
        <BottomNav />
      </div>
    )
  }

  if (notFound || !complaint) {
    return (
      <div className="detail-page">
        <TopBar />
        <main className="detail-container">
          <div className="not-found-card">
            <h2 className="state-title">Complaint Not Found</h2>
            <p className="state-desc">
              The report you are looking for does not exist or may have been removed.
            </p>
            <Link to="/" className="state-btn">
              Back to Feed
            </Link>
          </div>
        </main>
        <BottomNav />
      </div>
    )
  }

  const reporterName = complaint.is_anonymous
    ? 'Anonymous Resident'
    : complaint.reporter_name || 'Resident'

  const locationText = complaint.block && complaint.area_name
    ? `${complaint.block} • ${complaint.area_name}`
    : complaint.area_name || complaint.block || 'Society grounds'

  const photos = complaint.photos || []
  const activePhoto = photos[selectedPhotoIndex] || photos[0] || null
  const isResolved = complaint.status === 'resolved'
  const history = complaint.history || []

  return (
    <div className="detail-page">
      <TopBar />

      <main className="detail-container">
        <div className="detail-header-nav">
          <Link to="/" className="detail-back-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
            <span>Back to Feed</span>
          </Link>
          <span className="detail-id-tag">#{complaint.id}</span>
        </div>

        {/* Main Details Card */}
        <article className="detail-card">
          <div className="detail-meta-row">
            <div className="detail-reporter-group">
              <span className="detail-reporter-name">{reporterName}</span>
              <span className="detail-location">{locationText}</span>
            </div>

            <div className="detail-badges">
              <StatusBadge status={complaint.status} />
              <PriorityBadge priority={complaint.priority} />
            </div>
          </div>

          <h1 className="detail-issue-type">
            {formatIssueType(complaint.issue_type)}
          </h1>

          {complaint.description && (
            <p className="detail-description">{complaint.description}</p>
          )}

          {complaint.priority_reason && (
            <div className="detail-priority-reason">
              <strong>Priority Reason:</strong> {complaint.priority_reason}
            </div>
          )}

          {/* Photo Gallery */}
          {photos.length > 0 && (
            <div className="detail-photos-gallery">
              <div className="detail-main-photo-wrapper">
                <img
                  src={activePhoto}
                  alt={formatIssueType(complaint.issue_type)}
                  className="detail-main-photo"
                />
              </div>

              {photos.length > 1 && (
                <div className="detail-thumbnails-row">
                  {photos.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`detail-thumbnail-btn ${idx === selectedPhotoIndex ? 'active' : ''}`}
                      onClick={() => setSelectedPhotoIndex(idx)}
                      title={`View photo ${idx + 1}`}
                      aria-label={`View photo ${idx + 1}`}
                    >
                      <img src={url} alt={`Thumbnail ${idx + 1}`} className="detail-thumbnail-img" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions: Upvote Button */}
          <div className="detail-actions-row">
            <button
              type="button"
              className={`upvote-button ${complaint.i_upvoted ? 'upvoted' : ''}`}
              onClick={handleToggleUpvote}
              aria-label="I face this too"
            >
              <svg
                className="upvote-icon"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill={complaint.i_upvoted ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="18 15 12 9 6 15" />
              </svg>
              <span>I face this too ({complaint.upvote_count ?? 0})</span>
            </button>

            {complaint.created_at && (
              <span className="detail-location">
                Reported {formatDateTime(complaint.created_at)}
              </span>
            )}
          </div>
        </article>

        {/* Before and After Section (When Resolved) */}
        {isResolved && (
          <section className="before-after-section" aria-label="Resolution Proof">
            <div className="before-after-header">
              <h2 className="before-after-title">Before & After Proof</h2>
              <StatusBadge status="resolved" />
            </div>

            <div className="before-after-grid">
              <div className="before-after-col">
                <span className="before-after-label">Before</span>
                <div className="before-after-img-wrapper">
                  {photos[0] ? (
                    <img
                      src={photos[0]}
                      alt="Before cleanup"
                      className="before-after-img"
                    />
                  ) : (
                    <div className="detail-location">No initial photo</div>
                  )}
                </div>
              </div>

              <div className="before-after-col">
                <span className="before-after-label">After</span>
                <div className="before-after-img-wrapper">
                  {complaint.after_photo_url ? (
                    <img
                      src={complaint.after_photo_url}
                      alt="After cleanup proof"
                      className="before-after-img"
                    />
                  ) : (
                    <div className="detail-location">No proof photo</div>
                  )}
                </div>
              </div>
            </div>

            {complaint.resolution_note && (
              <div className="resolution-note-box">
                <div className="resolution-note-title">Resolution Note</div>
                <div>{complaint.resolution_note}</div>
              </div>
            )}
          </section>
        )}

        {/* Timeline from History */}
        {history.length > 0 && (
          <section className="timeline-section" aria-label="Resolution Timeline">
            <h2 className="timeline-title">Activity Timeline</h2>

            <div className="timeline-list">
              {history.map((step, idx) => {
                const stepLabel = formatStepLabel(step.to_status)
                const actor = getStepActor(step.to_status)
                const isResident = actor === 'Resident'

                return (
                  <div key={idx} className="timeline-item">
                    <div className="timeline-dot" />
                    <div className="timeline-content">
                      <div className="timeline-step-row">
                        <span className="timeline-step-name">{stepLabel}</span>
                        {step.created_at && (
                          <span className="timeline-time">
                            {formatDateTime(step.created_at)}
                          </span>
                        )}
                      </div>

                      <span
                        className={`timeline-actor-badge ${isResident ? 'timeline-actor-resident' : 'timeline-actor-office'}`}
                      >
                        {actor}
                      </span>

                      {step.note && (
                        <div className="timeline-note">{step.note}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
