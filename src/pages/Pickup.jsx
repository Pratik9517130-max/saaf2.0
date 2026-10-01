import { useState, useEffect } from 'react'
import { api } from '../api'
import TopBar from '../components/TopBar'
import BottomNav from '../components/BottomNav'
import '../styles/pickup.css'

const WASTE_CATEGORIES = [
  {
    id: 'e_waste',
    title: 'E-Waste',
    desc: 'Wires, chargers, old gadgets, bulbs, keyboards, small electronics',
    icon: '💻',
  },
  {
    id: 'bulky',
    title: 'Bulky Items',
    desc: 'Mattresses, broken furniture, crates, bicycles, large mirrors',
    icon: '🛋️',
  },
  {
    id: 'hazardous',
    title: 'Hazardous',
    desc: 'Paints, chemicals, tube lights, batteries, solvent bottles',
    icon: '⚠️',
  },
  {
    id: 'dry',
    title: 'Recyclable Dry Waste',
    desc: 'Cardboard cartons, bulk plastic containers, metal scrap',
    icon: '📦',
  },
]

function formatCategoryName(type) {
  const hit = WASTE_CATEGORIES.find((c) => c.id === type)
  return hit ? hit.title : type?.toUpperCase() || 'Bulky Waste'
}

export default function Pickup() {
  const [selectedType, setSelectedType] = useState('e_waste')
  const [notes, setNotes] = useState('')
  const [scheduledDate, setScheduledDate] = useState(() => {
    const tomorrow = new Date(Date.now() + 86400000)
    return tomorrow.toISOString().split('T')[0]
  })
  const [slot, setSlot] = useState('morning')
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const [pickups, setPickups] = useState([])
  const [loadingPickups, setLoadingPickups] = useState(true)

  useEffect(() => {
    let ignore = false

    async function loadPickups() {
      try {
        const data = await api.getMyPickups()
        if (!ignore) {
          setPickups(data || [])
        }
      } catch (err) {
        if (!ignore) {
          console.warn('Failed to load user pickups:', err)
        }
      } finally {
        if (!ignore) {
          setLoadingPickups(false)
        }
      }
    }

    loadPickups()

    return () => {
      ignore = true
    }
  }, [])

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
    e.target.value = ''
  }

  const handleRemovePhoto = () => {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview)
    }
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccessMsg(null)
    setSubmitting(true)

    try {
      let photo_url = null
      if (photoFile) {
        photo_url = await api.uploadPhoto(photoFile)
      }

      const combinedNotes = [
        notes.trim(),
        slot === 'morning' ? 'Slot: 9 AM - 12 PM' : 'Slot: 2 PM - 5 PM',
        scheduledDate ? `Preferred: ${scheduledDate}` : '',
      ]
        .filter(Boolean)
        .join(' | ')

      await api.createPickup({
        waste_type: selectedType,
        notes: combinedNotes,
        photo_url,
      })

      setSuccessMsg('Your doorstep pickup request has been scheduled! Society housekeeping team will arrive in your chosen time window.')
      setNotes('')
      handleRemovePhoto()

      // Refresh pickups list
      const updated = await api.getMyPickups()
      setPickups(updated || [])
    } catch (err) {
      console.error('Failed to submit pickup request:', err)
      setError(err?.message || 'Unable to schedule pickup. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="pickup-page">
      <TopBar />

      <main className="pickup-container">
        <header className="pickup-header">
          <div className="pickup-title-row">
            <h1 className="pickup-title">Request Doorstep Pickup</h1>
          </div>
          <p className="pickup-subtitle">
            Schedule convenient collection for e-waste, broken furniture, batteries, and bulk recyclables directly from your flat doorstep.
          </p>
        </header>

        {successMsg && (
          <div className="pickup-success-banner" role="status">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <div>
              <strong>Request Received!</strong> {successMsg}
            </div>
          </div>
        )}

        {error && (
          <div className="submit-error-banner" role="alert">
            {error}
          </div>
        )}

        <div className="pickup-content-grid">
          {/* Main Pickup Form Card */}
          <form onSubmit={handleSubmit} className="pickup-card">
            {/* Category Section */}
            <div className="category-section">
              <label className="category-label">Select Waste Category</label>
              <div className="category-cards-group">
                {WASTE_CATEGORIES.map((cat) => {
                  const isSelected = selectedType === cat.id
                  return (
                    <div
                      key={cat.id}
                      className={`category-radio-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedType(cat.id)}
                      role="radio"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === ' ' || e.key === 'Enter') {
                          setSelectedType(cat.id)
                        }
                      }}
                    >
                      <div className="category-info">
                        <span className="category-title">
                          <span>{cat.icon}</span>
                          <span>{cat.title}</span>
                        </span>
                        <span className="category-desc">{cat.desc}</span>
                      </div>
                      <div className="category-radio-indicator">
                        {isSelected && <div className="category-radio-dot" />}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Quantity or Notes */}
            <div className="form-group">
              <label className="form-label" htmlFor="pickup-notes">
                Quantity or Notes (optional)
              </label>
              <textarea
                id="pickup-notes"
                className="form-textarea"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="For example: 2 bags of dry waste, old sofa at the front door, broken microwave..."
                disabled={submitting}
              />
            </div>

            {/* Date & Slot selection */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="pickup-date">
                  Pickup Date
                </label>
                <input
                  id="pickup-date"
                  type="date"
                  className="form-select"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Preferred Slot</label>
                <div className="slot-selector-row">
                  <button
                    type="button"
                    className={`slot-btn ${slot === 'morning' ? 'selected' : ''}`}
                    onClick={() => setSlot('morning')}
                  >
                    9 AM - 12 PM
                  </button>
                  <button
                    type="button"
                    className={`slot-btn ${slot === 'afternoon' ? 'selected' : ''}`}
                    onClick={() => setSlot('afternoon')}
                  >
                    2 PM - 5 PM
                  </button>
                </div>
              </div>
            </div>

            {/* Photo upload (optional) */}
            <div className="form-group">
              <label className="form-label">Photo Attachment (optional)</label>
              {photoPreview ? (
                <div style={{ position: 'relative', width: '100px', height: '100px', borderRadius: 'var(--r-sm)', overflow: 'hidden', border: '1px solid var(--line)' }}>
                  <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    style={{ position: 'absolute', top: 2, right: 2, background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--terra)', padding: 0 }}
                  >
                    &times;
                  </button>
                </div>
              ) : (
                <label className="photo-add-box" style={{ maxWidth: '140px', height: '80px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="18" height="18" x="3" y="3" rx="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3-3a2 2 0 0 0-2.8 0L6 21" />
                  </svg>
                  <span>Add Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    style={{ display: 'none' }}
                    disabled={submitting}
                  />
                </label>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="pickup-submit-btn"
              disabled={submitting}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
              <span>{submitting ? 'Scheduling Pickup...' : 'Request Doorstep Pickup'}</span>
            </button>
          </form>

          {/* User's Scheduled Pickups List */}
          <aside className="pickup-history-card">
            <div className="history-card-header">
              <h2 className="history-card-title">My Scheduled Pickups</h2>
              <span className="history-badge">
                {pickups.length} {pickups.length === 1 ? 'request' : 'requests'}
              </span>
            </div>

            {loadingPickups && (
              <p className="state-desc" style={{ padding: 'var(--s-3)' }}>
                Loading your scheduled pickups...
              </p>
            )}

            {!loadingPickups && pickups.length === 0 && (
              <div style={{ textAlign: 'center', padding: 'var(--s-4)', color: 'var(--muted)', fontSize: '13px' }}>
                <p>No active pickup requests right now.</p>
                <p style={{ fontSize: '12px', marginTop: '4px' }}>
                  Have heavy or e-waste items? Fill the request form and housekeeping will collect from your door.
                </p>
              </div>
            )}

            {!loadingPickups && pickups.length > 0 && (
              <div className="history-list">
                {pickups.map((item) => (
                  <div key={item.id} className="history-item">
                    <div className="history-item-top">
                      <span className="history-waste-name">
                        {formatCategoryName(item.waste_type)}
                      </span>
                      <span className={`badge status-${item.status || 'submitted'}`}>
                        {item.status || 'Requested'}
                      </span>
                    </div>
                    {item.notes && (
                      <p className="history-notes">{item.notes}</p>
                    )}
                    <div className="history-meta">
                      {item.scheduled_date ? `Scheduled Date: ${item.scheduled_date}` : 'Doorstep Collection Scheduled'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
