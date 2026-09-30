import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import TopBar from '../components/TopBar'
import StatusBadge from '../components/StatusBadge'
import PriorityBadge from '../components/PriorityBadge'
import BottomNav from '../components/BottomNav'
import '../styles/admin.css'
import '../styles/detail.css'

const ISSUE_TYPE_LABELS = {
  overflowing_bin: 'Overflowing Bin',
  road_garbage: 'Road Garbage',
  missed_collection: 'Missed Collection',
  illegal_dumping: 'Illegal Dumping',
  other: 'Other',
}

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

export default function AdminComplaint() {
  const { id } = useParams()
  const [complaint, setComplaint] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Resolve Modal states
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [resolveNote, setResolveNote] = useState('')
  const [afterPhotoPreview, setAfterPhotoPreview] = useState(null)
  const [afterPhotoUrl, setAfterPhotoUrl] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // Reject Modal states
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    let ignore = false

    async function loadComplaint() {
      try {
        const list = await api.adminGetComplaints()
        const found = list.find((c) => String(c.id) === String(id))
        if (!ignore) {
          if (!found) {
            setNotFound(true)
          } else {
            setComplaint(found)
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to load complaint:', err)
          setActionError(err?.message || 'Failed to load complaint')
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

  const handleSetStatus = async (status, options = {}) => {
    setActionLoading(true)
    setActionError(null)

    try {
      await api.adminSetStatus(id, status, options)
      setComplaint((prev) => ({
        ...prev,
        status,
        ...(options.note ? { resolution_note: options.note } : {}),
        ...(options.after_photo_url ? { after_photo_url: options.after_photo_url } : {}),
        ...(status === 'resolved' ? { resolved_at: new Date().toISOString() } : {}),
      }))
      setShowResolveModal(false)
      setShowRejectModal(false)
      setResolveNote('')
      setAfterPhotoUrl('')
      setAfterPhotoPreview(null)
      setRejectReason('')
    } catch (err) {
      console.error('Admin set status error:', err)
      setActionError(err?.message || 'Failed to update complaint status')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAfterPhotoSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setAfterPhotoPreview(URL.createObjectURL(file))
    setUploadingPhoto(true)
    setActionError(null)

    try {
      const url = await api.uploadPhoto(file)
      setAfterPhotoUrl(url)
    } catch (err) {
      console.error('Photo upload failed:', err)
      setActionError('Photo upload failed: ' + (err?.message || 'Unknown error'))
    } finally {
      setUploadingPhoto(false)
    }
  }

  if (loading) {
    return (
      <div className="admin-page">
        <TopBar />
        <main className="admin-container">
          <div className="state-card" aria-busy="true">
            <h2 className="state-title">Loading complaint details...</h2>
            <p className="state-desc">Fetching reporter details and status.</p>
          </div>
        </main>
        <BottomNav />
      </div>
    )
  }

  if (notFound || !complaint) {
    return (
      <div className="admin-page">
        <TopBar />
        <main className="admin-container">
          <div className="not-found-card">
            <h2 className="state-title">Complaint Not Found</h2>
            <p className="state-desc">
              Complaint #{id} was not found in the administrative registry.
            </p>
            <Link to="/admin" className="state-btn">
              Back to Dashboard
            </Link>
          </div>
        </main>
        <BottomNav />
      </div>
    )
  }

  const reporter = complaint.reporter_real || {}
  const photos = complaint.photos || []
  const isResolved = complaint.status === 'resolved'

  return (
    <div className="admin-page">
      <TopBar />

      <main className="admin-container">
        <div className="detail-header-nav">
          <Link to="/admin" className="detail-back-link">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
            <span>Back to Admin Dashboard</span>
          </Link>
          <span className="detail-id-tag">#{complaint.id}</span>
        </div>

        {actionError && (
          <div className="submit-error-banner" role="alert">
            {actionError}
          </div>
        )}

        {/* Action Controls Card */}
        <section className="admin-actions-card">
          <div className="admin-actions-title">Administrative Actions</div>
          <div className="admin-action-btn-row">
            <button
              type="button"
              className="admin-btn admin-btn-ack"
              disabled={actionLoading || complaint.status === 'acknowledged'}
              onClick={() => handleSetStatus('acknowledged')}
            >
              Acknowledge
            </button>

            <button
              type="button"
              className="admin-btn admin-btn-progress"
              disabled={actionLoading || complaint.status === 'in_progress'}
              onClick={() => handleSetStatus('in_progress')}
            >
              In progress
            </button>

            <button
              type="button"
              className="admin-btn admin-btn-resolve"
              disabled={actionLoading || complaint.status === 'resolved'}
              onClick={() => setShowResolveModal(true)}
            >
              Resolve...
            </button>

            <button
              type="button"
              className="admin-btn admin-btn-reject"
              disabled={actionLoading || complaint.status === 'rejected'}
              onClick={() => setShowRejectModal(true)}
            >
              Reject...
            </button>
          </div>
        </section>

        {/* Main Details Card */}
        <article className="admin-complaint-card">
          <div className="detail-meta-row">
            <div className="detail-badges">
              <StatusBadge status={complaint.status} />
              <PriorityBadge priority={complaint.priority} />
            </div>
            {complaint.created_at && (
              <span className="detail-location">
                Reported {formatDateTime(complaint.created_at)}
              </span>
            )}
          </div>

          {/* Reporter Real Details */}
          <div className="admin-reporter-box">
            <span className="admin-reporter-title">Reporter Verification (Admin Confidential)</span>
            <div className="admin-reporter-details">
              <strong>Name:</strong> {reporter.name || complaint.reporter_name || 'Resident'}
              {complaint.is_anonymous && ' (Reported anonymously to public)'}
            </div>
            <div className="admin-reporter-details">
              <strong>Flat / Block:</strong> Flat #{reporter.flat_no || '-'}, Tower {complaint.block || '-'}
            </div>
            <div className="admin-reporter-details">
              <strong>Phone:</strong> {reporter.phone || '-'}
            </div>
          </div>

          <h2 className="detail-issue-type">
            {ISSUE_TYPE_LABELS[complaint.issue_type] || complaint.issue_type}
          </h2>

          <div className="detail-location">
            <strong>Location:</strong> {complaint.block ? `Tower ${complaint.block} - ` : ''}{complaint.area_name || ''}
          </div>

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
                  src={photos[0]}
                  alt={complaint.issue_type}
                  className="detail-main-photo"
                />
              </div>
            </div>
          )}

          {/* Before & After Proof if Resolved */}
          {isResolved && (
            <div className="before-after-section" style={{ marginTop: 'var(--s-2)' }}>
              <div className="before-after-header">
                <span className="before-after-title">Resolution Proof</span>
                <StatusBadge status="resolved" />
              </div>

              <div className="before-after-grid">
                <div className="before-after-col">
                  <span className="before-after-label">Before</span>
                  <div className="before-after-img-wrapper">
                    {photos[0] ? (
                      <img src={photos[0]} alt="Before cleanup" className="before-after-img" />
                    ) : (
                      <div className="detail-location">No before photo</div>
                    )}
                  </div>
                </div>

                <div className="before-after-col">
                  <span className="before-after-label">After</span>
                  <div className="before-after-img-wrapper">
                    {complaint.after_photo_url ? (
                      <img src={complaint.after_photo_url} alt="After cleanup proof" className="before-after-img" />
                    ) : (
                      <div className="detail-location">No after photo</div>
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
            </div>
          )}
        </article>

        {/* Resolve Modal */}
        {showResolveModal && (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="resolve-modal-title">
            <div className="modal-card">
              <div className="modal-header">
                <h3 id="resolve-modal-title" className="modal-title">Resolve with Proof</h3>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setShowResolveModal(false)}
                  disabled={actionLoading}
                  aria-label="Close"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="resolve-note-input">
                  Resolution Note <span style={{ color: 'var(--terra)' }}>*</span>
                </label>
                <textarea
                  id="resolve-note-input"
                  className="form-textarea"
                  value={resolveNote}
                  onChange={(e) => setResolveNote(e.target.value)}
                  placeholder="Detail the cleanup actions taken and vendor verification..."
                  required
                  rows={3}
                  disabled={actionLoading}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="after-photo-input">
                  After Photo Proof <span style={{ color: 'var(--terra)' }}>*</span>
                </label>
                <input
                  id="after-photo-input"
                  type="file"
                  accept="image/*"
                  onChange={handleAfterPhotoSelect}
                  disabled={actionLoading || uploadingPhoto}
                />
                {uploadingPhoto && (
                  <span style={{ fontSize: '12px', color: 'var(--amber)' }}>
                    Uploading photo proof...
                  </span>
                )}
                {afterPhotoPreview && (
                  <div className="before-after-img-wrapper" style={{ marginTop: 'var(--s-1)', maxHeight: '140px' }}>
                    <img src={afterPhotoPreview} alt="Proof preview" className="before-after-img" />
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="modal-cancel-btn"
                  onClick={() => setShowResolveModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="modal-submit-btn"
                  disabled={!resolveNote.trim() || !afterPhotoUrl || uploadingPhoto || actionLoading}
                  onClick={() =>
                    handleSetStatus('resolved', {
                      note: resolveNote.trim(),
                      after_photo_url: afterPhotoUrl,
                    })
                  }
                >
                  {actionLoading ? 'Resolving...' : 'Confirm Resolution'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="reject-modal-title">
            <div className="modal-card">
              <div className="modal-header">
                <h3 id="reject-modal-title" className="modal-title">Reject Complaint</h3>
                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={() => setShowRejectModal(false)}
                  disabled={actionLoading}
                  aria-label="Close"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reject-reason-input">
                  Rejection Reason <span style={{ color: 'var(--terra)' }}>*</span>
                </label>
                <textarea
                  id="reject-reason-input"
                  className="form-textarea"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why this complaint is rejected (e.g. duplicate, private balcony, not society property)..."
                  required
                  rows={3}
                  disabled={actionLoading}
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="modal-cancel-btn"
                  onClick={() => setShowRejectModal(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="modal-reject-btn"
                  disabled={!rejectReason.trim() || actionLoading}
                  onClick={() =>
                    handleSetStatus('rejected', {
                      note: rejectReason.trim(),
                    })
                  }
                >
                  {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
