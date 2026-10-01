import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { parseAssistantIntent } from '../lib/ai'
import TopBar from '../components/TopBar'
import BottomNav from '../components/BottomNav'
import StatusBadge from '../components/StatusBadge'
import PriorityBadge from '../components/PriorityBadge'
import '../styles/assistant.css'

const SUGGESTIONS = [
  'Tower B parking ka bin overflow ho raha hai',
  'Gate 1 ke paas kachra pada hai',
  'Check status',
  'E-waste pickup schedule karna hai',
  'Broken glass near playground',
]

const speechSupported = typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
let msgCounter = 1

function createMessage(sender, text, extra = {}) {
  msgCounter += 1
  return {
    id: `msg-${sender}-${msgCounter}`,
    sender,
    text,
    timestamp: 'Just now',
    ...extra,
  }
}

export default function Assistant() {
  const [messages, setMessages] = useState([
    {
      id: 'msg-init',
      sender: 'assistant',
      text: 'Namaste! I can file waste complaints from natural voice or Hinglish messages. How can I assist you?',
      timestamp: 'Just now',
    },
  ])
  const [inputText, setInputText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [filingId, setFilingId] = useState(null)
  const [areas, setAreas] = useState([])
  const [feed, setFeed] = useState([])

  const recognitionRef = useRef(null)
  const messagesEndRef = useRef(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load context data (areas and feed)
  useEffect(() => {
    let ignore = false
    async function loadContext() {
      try {
        const [areaList, feedList] = await Promise.all([
          api.getAreas(),
          api.getFeed(),
        ])
        if (!ignore) {
          setAreas(areaList || [])
          setFeed(feedList || [])
        }
      } catch (err) {
        console.warn('Failed to load assistant context:', err)
      }
    }
    loadContext()
    return () => {
      ignore = true
    }
  }, [])

  // Setup Web Speech API for voice recognition if available
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-IN'

      recognition.onstart = () => setIsListening(true)
      recognition.onend = () => setIsListening(false)
      recognition.onerror = () => setIsListening(false)
      recognition.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript
        if (transcript) {
          setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript))
        }
      }

      recognitionRef.current = recognition
    }
  }, [])

  const toggleVoiceInput = () => {
    if (!speechSupported || !recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please type your message.')
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
    } else {
      try {
        recognitionRef.current.start()
      } catch (e) {
        console.warn('Recognition start error:', e)
      }
    }
  }

  const handleSendMessage = (textToSend) => {
    const query = (textToSend || inputText).trim()
    if (!query) return

    const userMsg = createMessage('user', query)

    // Add user message
    setMessages((prev) => [...prev, userMsg])
    setInputText('')

    // Parse with AI intent engine
    setTimeout(() => {
      const parsed = parseAssistantIntent(query, { areas, feed })

      const botMsg = createMessage('assistant', parsed.reply, {
        draft: parsed.draft || null,
        data: parsed.data || null,
        action: parsed.action || null,
      })

      setMessages((prev) => [...prev, botMsg])
    }, 400)
  }

  const handleConfirmComplaint = async (draft, msgId) => {
    setFilingId(msgId)
    try {
      const result = await api.createComplaint({
        issue_type: draft.issue_type,
        description: draft.description,
        area_id: draft.area_id,
        is_anonymous: false,
        priority: draft.priority,
        priority_reason: draft.priority_reason,
        ai_suggested_type: draft.issue_type,
        photo_urls: [],
      })

      const successMsg = createMessage(
        'assistant',
        `✅ Complaint created successfully! Tracking ID: ${result.id}. The housekeeping squad and society admin have been alerted.`,
        {
          action: {
            type: 'navigate',
            label: 'View on Notice Feed',
            path: '/',
          },
        }
      )

      setMessages((prev) => [...prev, successMsg])
    } catch (err) {
      console.error('Failed to submit assistant complaint:', err)
      const errorMsg = createMessage(
        'assistant',
        `Unable to file complaint: ${err.message || 'Please check your connection and try again.'}`
      )
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setFilingId(null)
    }
  }


  return (
    <div className="assistant-page">
      <TopBar />

      <main className="assistant-container">
        {/* Prototype Header Banner matching Screenshot 1 */}
        <div className="assistant-prototype-banner">
          <div className="assistant-prototype-left">
            <span>PROTOTYPE: SCRIPTED PREVIEW</span>
          </div>
          <div className="assistant-prototype-right">
            <span>AI Voice & Hinglish Assistant</span>
          </div>
        </div>

        {/* Chat Card */}
        <div className="assistant-chat-card">
          <div className="assistant-messages-area">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-row ${msg.sender}`}>
                <div className="chat-bubble">
                  <div>{msg.text}</div>

                  {/* Render Draft Complaint Card if present */}
                  {msg.draft && (
                    <div className="assistant-draft-card">
                      <div className="draft-card-header">
                        <span className="draft-card-title">
                          {msg.draft.issue_type?.replace('_', ' ').toUpperCase()}
                        </span>
                        <PriorityBadge priority={msg.draft.priority} />
                      </div>
                      <div className="draft-card-meta">
                        Location: {msg.draft.block ? `Tower ${msg.draft.block}` : ''} • {msg.draft.area_name}
                      </div>
                      <p className="draft-card-desc">
                        "{msg.draft.description}"
                      </p>
                      <button
                        type="button"
                        className="draft-submit-btn"
                        onClick={() => handleConfirmComplaint(msg.draft, msg.id)}
                        disabled={filingId === msg.id}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>{filingId === msg.id ? 'Filing Complaint...' : 'Confirm & File Complaint'}</span>
                      </button>
                    </div>
                  )}

                  {/* Render Status Reports List if requested */}
                  {msg.data && msg.data.length > 0 && (
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {msg.data.map((item) => (
                        <div
                          key={item.id}
                          style={{ background: 'var(--bg)', border: '1px solid var(--line)', padding: '6px 10px', borderRadius: 'var(--r-sm)', fontSize: '13px' }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <strong>{item.issue_type?.replace('_', ' ').toUpperCase()}</strong>
                            <StatusBadge status={item.status} />
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                            {item.block ? `Tower ${item.block} • ` : ''}{item.area_name}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Link / Button if applicable */}
                  {msg.action && (
                    <div style={{ marginTop: '8px' }}>
                      <Link
                        to={msg.action.path}
                        className="draft-submit-btn"
                        style={{ display: 'inline-flex', textDecoration: 'none' }}
                      >
                        {msg.action.label} &rarr;
                      </Link>
                    </div>
                  )}
                </div>
                <span className="chat-time">{msg.timestamp}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips */}
          <div className="assistant-chips-row">
            {SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                className="assistant-chip"
                onClick={() => handleSendMessage(s)}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input Bar matching Screenshot 1 */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="assistant-input-form"
          >
            <input
              type="text"
              className="assistant-text-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type in English or Hinglish (e.g., Tower B kachra)..."
            />

            {speechSupported && (
              <button
                type="button"
                className={`assistant-mic-btn ${isListening ? 'listening' : ''}`}
                onClick={toggleVoiceInput}
                title={isListening ? 'Stop listening' : 'Speak in English or Hindi'}
                aria-label="Voice input"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
              </button>
            )}

            <button
              type="submit"
              className="assistant-send-btn"
              disabled={!inputText.trim()}
            >
              Send
            </button>
          </form>
        </div>
      </main>

      <BottomNav />
    </div>
  )
}
