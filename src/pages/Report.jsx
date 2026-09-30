import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { analyzeReport } from '../lib/ai'
import TopBar from '../components/TopBar'
import PriorityBadge from '../components/PriorityBadge'
import BottomNav from '../components/BottomNav'
import '../styles/report.css'

const ISSUE_TYPES = [
  { value: 'overflowing_bin', label: 'Overflowing Bin' },
  { value: 'road_garbage', label: 'Road Garbage' },
  { value: 'missed_collection', label: 'Missed Collection' },
  { value: 'illegal_dumping', label: 'Illegal Dumping' },
  { value: 'other', label: 'Other' },
]

function formatIssueType(type) {
  const hit = ISSUE_TYPES.find((t) => t.value === type)
  return hit ? hit.label : type || 'Waste Issue'
}

export default function Report() {
  const [photos, setPhotos] = useState([])
  const [description, setDescription] = useState('')
  const [areas, setAreas] = useState([])
  const [blocks, setBlocks] = useState([])
  const [selectedBlock, setSelectedBlock] = useState('')
  const [selectedAreaId, setSelectedAreaId] = useState('')
  const [issueType, setIssueType] = useState('overflowing_bin')
  const [isAnonymous, setIsAnonymous] = useState(false)

  const [aiSuggestion, setAiSuggestion] = useState(null)
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const selectedAreaIdRef = useRef(selectedAreaId)
  selectedAreaIdRef.current = selectedAreaId
  const areasRef = useRef(areas)
  areasRef.current = areas

  const navigate = useNavigate()

  // Load areas and populate blocks
  useEffect(() => {
    let ignore = false

    async function loadAreas() {
      try {
        const areaList = await api.getAreas()
        if (!ignore && areaList && areaList.length > 0) {
          setAreas(areaList)
          const uniqueBlocks = Array.from(
            new Set(areaList.map((a) => a.block).filter(Boolean))
          )
          setBlocks(uniqueBlocks)
          if (uniqueBlocks.length > 0) {
            const firstBlock = uniqueBlocks[0]
            setSelectedBlock(firstBlock)
            const blockAreas = areaList.filter((a) => a.block === firstBlock)
            if (blockAreas.length > 0) {
              setSelectedAreaId(blockAreas[0].id)
            }
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to load areas:', err)
        }
      }
    }

    loadAreas()

    return () => {
      ignore = true
    }
  }, [])

  // Handle block selection and filter area list
  const handleBlockChange = (e) => {
    const newBlock = e.target.value
    setSelectedBlock(newBlock)
    const matchingAreas = areas.filter((a) => a.block === newBlock)
    if (matchingAreas.length > 0) {
      setSelectedAreaId(matchingAreas[0].id)
    } else {
      setSelectedAreaId('')
    }
  }

  // Handle choosing photos (up to 3 total)
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setPhotos((prev) => {
      const remainingSlots = 3 - prev.length
      const filesToAdd = files.slice(0, remainingSlots)
      const newItems = filesToAdd.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }))
      return [...prev, ...newItems]
    })

    e.target.value = ''
  }

  const handleRemovePhoto = (indexToRemove) => {
    setPhotos((prev) => {
      const item = prev[indexToRemove]
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl)
      }
      return prev.filter((_, idx) => idx !== indexToRemove)
    })
  }

  // Debounced AI analysis trigger: ONLY runs when a photo is added/removed or description changes
  useEffect(() => {
    const hasPhoto = photos.length > 0
    const hasEnoughDescription = description.trim().length >= 10

    if (!hasPhoto && !hasEnoughDescription) {
      return
    }

    let isCurrent = true

    const timer = setTimeout(async () => {
      setAiAnalyzing(true)
      try {
        const currentAreaId = selectedAreaIdRef.current
        const areaObj = areasRef.current.find((a) => String(a.id) === String(currentAreaId))
        const areaName = areaObj ? `${areaObj.block} - ${areaObj.area_name}` : ''
        const rawFiles = photos.map((p) => p.file)

        const result = await analyzeReport({
          description: description.trim(),
          files: rawFiles,
          area: areaName,
        })
        if (isCurrent && result) {
          setAiSuggestion(result)
        }
      } catch (err) {
        console.warn('AI analysis error:', err)
      } finally {
        if (isCurrent) {
          setAiAnalyzing(false)
        }
      }
    }, 600)

    return () => {
      isCurrent = false
      clearTimeout(timer)
    }
  }, [photos, description])

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      // 1. Upload photos using api.uploadPhoto
      const uploadedUrls = []
      for (const item of photos) {
        const url = await api.uploadPhoto(item.file)
        if (url) uploadedUrls.push(url)
      }

      // 2. Determine priority and reason from AI suggestion or default to medium
      const priority = aiSuggestion?.priority || 'medium'
      const priority_reason = aiSuggestion?.reason || 'Reported by resident'
      const ai_suggested_type = aiSuggestion?.issue_type || null

      // 3. Create complaint
      await api.createComplaint({
        issue_type: issueType,
        description: description.trim(),
        area_id: selectedAreaId,
        is_anonymous: isAnonymous,
        priority,
        priority_reason,
        ai_suggested_type,
        photo_urls: uploadedUrls,
      })

      // 4. Navigate to home
      navigate('/')
    } catch (err) {
      console.error('Failed to submit report:', err)
      const rawMessage = err?.message || 'Failed to submit report. Please try again.'
      let userFriendlyMsg = rawMessage
      if (rawMessage.toLowerCase().includes('bucket not found')) {
        userFriendlyMsg = 'Photo storage bucket ("photos") was not found. Please ensure the "photos" bucket is created in Supabase Storage.'
      } else if (rawMessage.toLowerCase().includes('failed to fetch')) {
        userFriendlyMsg = 'Network error: Unable to connect to server. Please check your network connection and try again.'
      }
      setError(userFriendlyMsg)
    } finally {
      setSubmitting(false)
    }
  }

  const availableAreas = areas.filter((a) => a.block === selectedBlock)

  return (
    <div className="report-page">
      <TopBar />

      <main className="report-container">
        <div className="report-header">
          <Link to="/" className="back-link" title="Back to Feed" aria-label="Back to Feed">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="m12 19-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="report-title">Report an Issue</h1>
        </div>

        <form onSubmit={handleSubmit} className="report-form-card">
          {error && (
            <div className="submit-error-banner" role="alert">
              {error}
            </div>
          )}

          {/* Photos Field */}
          <div className="photo-upload-section">
            <label className="form-label" htmlFor="photo-upload-input">
              Photos (up to 3)
            </label>

            <div className="photo-thumbnails-grid">
              {photos.map((item, idx) => (
                <div key={idx} className="photo-thumbnail-box">
                  <img
                    src={item.previewUrl}
                    alt={`Selected preview ${idx + 1}`}
                    className="photo-thumbnail-img"
                  />
                  <button
                    type="button"
                    className="photo-remove-btn"
                    onClick={() => handleRemovePhoto(idx)}
                    title="Remove photo"
                    aria-label={`Remove photo ${idx + 1}`}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}

              {photos.length < 3 && (
                <label className="photo-add-box" htmlFor="photo-upload-input">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                    <circle cx="9" cy="9" r="2" />
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                  </svg>
                  <span>Add Photo</span>
                </label>
              )}
            </div>

            <input
              id="photo-upload-input"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              disabled={submitting || photos.length >= 3}
            />

            <div className="photo-hint-notice">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>Photos are visible to everyone in the society.</span>
            </div>
          </div>

          {/* Description Textarea */}
          <div className="form-group">
            <label className="form-label" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              className="form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the waste issue (e.g. overflowing bin near the park bench, broken bags)..."
              required
              disabled={submitting}
              rows={3}
            />
          </div>

          {/* AI Suggestion Card */}
          {aiAnalyzing && !aiSuggestion && (
            <div className="ai-suggestion-card ai-loading">
              <svg className="ai-spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              <span>Analyzing report with AI...</span>
            </div>
          )}

          {aiSuggestion && (
            <div className="ai-suggestion-card">
              <div className="ai-card-header">
                <div className="ai-badge-group">
                  <span className="ai-label">AI Suggestion</span>
                  <span className="ai-source-tag">
                    {aiSuggestion.source === 'ai' ? 'AI' : 'Cached'}
                  </span>
                  {aiAnalyzing && (
                    <span className="ai-updating-badge">
                      <svg className="ai-spinner" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      Updating...
                    </span>
                  )}
                </div>
                <PriorityBadge priority={aiSuggestion.priority} />
              </div>

              <div className="ai-card-body">
                <div className="ai-suggested-type">
                  Suggested Type: <strong>{formatIssueType(aiSuggestion.issue_type)}</strong>
                </div>
                {aiSuggestion.reason && (
                  <p className="ai-reason">{aiSuggestion.reason}</p>
                )}
              </div>

              <button
                type="button"
                className="ai-apply-btn"
                onClick={() => setIssueType(aiSuggestion.issue_type)}
              >
                Use suggestion
              </button>
            </div>
          )}

          {/* Block and Area Dropdowns */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="block-select">
                Block / Tower
              </label>
              <select
                id="block-select"
                className="form-select"
                value={selectedBlock}
                onChange={handleBlockChange}
                required
                disabled={submitting || blocks.length === 0}
              >
                {blocks.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="area-select">
                Specific Area
              </label>
              <select
                id="area-select"
                className="form-select"
                value={selectedAreaId}
                onChange={(e) => setSelectedAreaId(e.target.value)}
                required
                disabled={submitting || availableAreas.length === 0}
              >
                {availableAreas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.area_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Issue Type Dropdown */}
          <div className="form-group">
            <label className="form-label" htmlFor="issue-type-select">
              Issue Type
            </label>
            <select
              id="issue-type-select"
              className="form-select"
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              required
              disabled={submitting}
            >
              {ISSUE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Anonymous Toggle */}
          <label className="anonymous-toggle-container" htmlFor="anonymous-toggle">
            <input
              id="anonymous-toggle"
              type="checkbox"
              className="anonymous-checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              disabled={submitting}
            />
            <div className="anonymous-text-group">
              <span className="anonymous-label">Report anonymously</span>
              <span className="anonymous-desc">
                Hide your name and flat number from other residents
              </span>
            </div>
          </label>

          {/* Submit Button */}
          <button
            type="submit"
            className="report-submit-btn"
            disabled={submitting || !description.trim() || !selectedAreaId}
          >
            {submitting ? 'Submitting Report...' : 'Submit Report'}
          </button>
        </form>
      </main>

      <BottomNav />
    </div>
  )
}
