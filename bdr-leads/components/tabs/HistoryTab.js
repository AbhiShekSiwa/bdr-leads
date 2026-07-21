import { useState, useEffect } from 'react'
import { colors, labelStyle, btnSecondary } from '../shared'

function formatGeneratedAt(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Unknown date'
  const date = d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  })
  return `${date} at ${time}`
}

function truncate(str, n) {
  if (!str) return ''
  return str.length > n ? str.slice(0, n) + '…' : str
}

export default function HistoryTab({ company, onRestore }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})
  const [error, setError] = useState('')

  useEffect(() => {
    // Clear immediately so old company history doesn't flash
    setHistory([])
    setLoading(true)
    setExpanded({})
    setError('')

    if (!company) {
      setLoading(false)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch(`/api/history?company=${encodeURIComponent(company)}`)
        const data = await r.json()
        if (!r.ok) throw new Error(data.error || 'Failed to load history')
        if (!cancelled) setHistory(data.history || [])
      } catch (e) {
        if (!cancelled) {
          setError(e.message)
          setHistory([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [company])

  function toggle(idx) {
    setExpanded((prev) => ({ ...prev, [idx]: !prev[idx] }))
  }

  function handleRestore(emails) {
    // Overwrites in-session sequence; prior versions remain in Sheet2 / History
    if (onRestore) onRestore(emails)
  }

  if (!company) {
    return <div style={{ fontSize: 14, color: colors.muted }}>Select a company to view history.</div>
  }

  if (loading) {
    return (
      <div style={{ fontSize: 14, color: colors.muted, textAlign: 'center', padding: 24 }}>
        Loading history...
      </div>
    )
  }

  if (error) {
    return <div style={{ fontSize: 13, color: '#dc2626' }}>{error}</div>
  }

  if (history.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 16px' }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>✉️</div>
        <div style={{ fontSize: 14, color: colors.text, marginBottom: 4 }}>
          No history yet for this company
        </div>
        <div style={{ fontSize: 12, color: colors.hint }}>
          Generated sequences will appear here automatically
        </div>
      </div>
    )
  }

  return (
    <div>
      {history.map((item, idx) => {
        const isOpen = !!expanded[idx]
        const contactBits = [item.contactName, item.contactTitle].filter(Boolean).join(' · ')
        return (
          <div
            key={`${item.generatedAt}-${idx}`}
            style={{
              background: '#fff',
              border: '0.5px solid #e4e4e0',
              borderRadius: 8,
              padding: 12,
              marginBottom: 12
            }}
          >
            <div
              onClick={() => toggle(idx)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                cursor: 'pointer',
                gap: 12
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: '#1a1a18', fontWeight: 500 }}>
                  <span style={{ marginRight: 6, color: colors.hint }}>{isOpen ? '▾' : '▸'}</span>
                  Contact: {contactBits || '—'}
                </div>
                <div style={{ fontSize: 12, color: '#6b6b67', marginTop: 2 }}>
                  Ask: {truncate(item.askType, 60) || '—'}
                </div>
                <div style={{ fontSize: 11, color: '#9b9b97', marginTop: 2 }}>
                  Generated: {formatGeneratedAt(item.generatedAt)}
                </div>
              </div>
              <button
                type="button"
                style={btnSecondary}
                onClick={(e) => {
                  e.stopPropagation()
                  handleRestore(item.emails)
                }}
              >
                Restore
              </button>
            </div>

            {isOpen && (
              <div style={{ marginTop: 8 }}>
                {(item.emails || []).map((email) => {
                  const empty = !email.subject && !email.body
                  const words = (email.body || '').split(/\s+/).filter(Boolean).length
                  return (
                    <div
                      key={email.step}
                      style={{
                        background: '#f8f8f6',
                        border: '0.5px solid #e4e4e0',
                        borderRadius: 6,
                        padding: '10px 12px',
                        marginTop: 8
                      }}
                    >
                      <div style={{
                        fontSize: 10,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        color: '#9b9b97',
                        marginBottom: 4
                      }}>
                        Email {email.step} · Day {email.day}
                      </div>
                      {empty ? (
                        <div style={{ fontSize: 12, color: colors.hint }}>—</div>
                      ) : (
                        <>
                          <div style={{ fontSize: 12, color: '#2563eb', marginBottom: 6 }}>
                            Subject: {email.subject || '—'}
                          </div>
                          <div style={{
                            fontSize: 12,
                            color: '#1a1a18',
                            lineHeight: 1.7,
                            whiteSpace: 'pre-wrap'
                          }}>
                            {email.body || '—'}
                          </div>
                          <div style={{ fontSize: 11, color: '#9b9b97', marginTop: 4 }}>
                            {words} words
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
