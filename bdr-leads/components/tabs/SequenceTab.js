import { useState, useEffect } from 'react'
import { checkSequence } from '../../lib/qualityCheck'
import {
  colors, labelStyle, inputStyle, btnPrimary, btnSecondary, btnAccent
} from '../shared'

export const FINANCIAL_ASK =
  'Financial sponsorship to fund our ethanol/LOX engine hotfire campaign, targeting a long-duration test by May 2027'

const ASK_PRESETS = [
  {
    chip: '💰 Financial sponsorship',
    text: FINANCIAL_ASK
  },
  {
    chip: '🔧 Hardware / components',
    text: 'Hardware or component donation (valves, pressure transducers, fittings, raw materials, or machining support for our test stand)'
  },
  {
    chip: '🧠 Technical mentorship',
    text: 'Technical mentorship: engineers from your team advising BDR on specific propulsion or systems engineering challenges'
  }
]

const chipBase = {
  padding: '5px 10px',
  borderRadius: 99,
  fontSize: 12,
  cursor: 'pointer',
  border: '0.5px solid #e4e4e0',
  background: '#fff',
  marginRight: 6,
  marginBottom: 8,
  fontFamily: 'inherit',
  color: colors.text
}

export default function SequenceTab({
  company,
  contactName,
  contactTitle,
  askType,
  onContactNameChange,
  onContactTitleChange,
  onAskTypeChange,
  signals,
  loadingSignals,
  onScanSignals,
  loadingSequence,
  onGenerateSequence,
  sequence,
  onEmailsChange
}) {
  const [emails, setEmails] = useState(sequence?.emails || [])
  const [copiedIdx, setCopiedIdx] = useState(null)
  const [copyFallback, setCopyFallback] = useState('')
  const [sentMap, setSentMap] = useState({})
  const [replyStatus, setReplyStatus] = useState('No reply')
  const [replyNotes, setReplyNotes] = useState('')
  const [replySaved, setReplySaved] = useState(false)
  const [replySaving, setReplySaving] = useState(false)

  useEffect(() => {
    setEmails(sequence?.emails || [])
    setSentMap({})
    setReplySaved(false)
  }, [sequence])

  async function markSent(step) {
    try {
      const r = await fetch('/api/email-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company,
          contactName,
          emailStep: step,
          status: 'Sent'
        })
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Failed to mark sent')
      setSentMap((prev) => ({
        ...prev,
        [step]: new Date().toLocaleString()
      }))
    } catch (e) {
      console.error(e)
      alert(e.message)
    }
  }

  async function saveReply() {
    setReplySaving(true)
    try {
      const r = await fetch('/api/email-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company,
          contactName,
          replyStatus,
          replyNotes
        })
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Failed to save reply')
      setReplySaved(true)
    } catch (e) {
      alert(e.message)
    }
    setReplySaving(false)
  }

  function updateBody(idx, body) {
    const next = emails.map((e, i) => (i === idx ? { ...e, body } : e))
    setEmails(next)
    if (onEmailsChange) onEmailsChange(next)
  }

  async function copyEmail(email, idx) {
    const text = `Subject: ${email.subject}\n\n${email.body}`
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 2000)
    } catch {
      setCopyFallback(text)
    }
  }

  const quality = emails.length === 3 ? checkSequence(emails) : null
  // Exact match only: any edit away from a preset deactivates all chips (intentional)
  const activePreset = ASK_PRESETS.find((p) => p.text === askType)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Contact name</label>
          <input
            style={inputStyle}
            value={contactName}
            onChange={(e) => onContactNameChange(e.target.value)}
            placeholder="e.g. Jamie"
          />
        </div>
        <div>
          <label style={labelStyle}>Contact title</label>
          <input
            style={inputStyle}
            value={contactTitle}
            onChange={(e) => onContactTitleChange(e.target.value)}
            placeholder="e.g. University Relations"
          />
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>What we&apos;re asking for</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 4 }}>
          {ASK_PRESETS.map((p) => {
            const active = activePreset?.text === p.text
            return (
              <button
                key={p.chip}
                type="button"
                onClick={() => onAskTypeChange(p.text)}
                style={{
                  ...chipBase,
                  ...(active ? {
                    background: '#eff6ff',
                    border: '0.5px solid #2563eb',
                    color: '#2563eb'
                  } : {})
                }}
              >
                {p.chip}
              </button>
            )
          })}
        </div>
        <textarea
          style={{ ...inputStyle, minHeight: 72, resize: 'vertical', lineHeight: 1.5 }}
          rows={3}
          value={askType}
          onChange={(e) => onAskTypeChange(e.target.value)}
          placeholder="Describe what BDR is looking for from this company. Be specific. The more detail here, the better the emails."
        />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button style={btnSecondary} onClick={onScanSignals} disabled={loadingSignals}>
          {loadingSignals ? 'Scanning…' : 'Scan signals (3 searches)'}
        </button>
        <button style={btnAccent} onClick={onGenerateSequence} disabled={loadingSequence}>
          {loadingSequence ? 'Generating…' : 'Generate sequence'}
        </button>
      </div>

      {loadingSignals && (
        <div style={{ fontSize: 13, color: colors.muted, marginBottom: 12 }}>
          <span style={pulseDot} /> Scanning recent signals…
        </div>
      )}
      {loadingSequence && (
        <div style={{ fontSize: 13, color: colors.muted, marginBottom: 12 }}>
          <span style={pulseDot} /> Writing 3-email sequence…
        </div>
      )}

      {signals.length > 0 && (
        <div style={{
          marginBottom: 16,
          padding: 12,
          borderRadius: 8,
          background: colors.signal?.bg || '#f5f3ff',
          border: `0.5px solid ${colors.signal?.border || '#ddd6fe'}`
        }}>
          <div style={{ ...labelStyle, color: colors.signal?.text || '#7c3aed' }}>Signals</div>
          {signals.map((s, i) => (
            <div key={i} style={{ fontSize: 13, color: colors.text, marginBottom: 6, lineHeight: 1.5 }}>
              • {s.text}
              <span style={{ color: colors.hint }}> ({s.source}, {s.recency})</span>
            </div>
          ))}
        </div>
      )}

      {emails.length === 3 && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 12,
            marginBottom: 16
          }}>
            {emails.map((email, idx) => {
              const words = (email.body || '').split(/\s+/).filter(Boolean).length
              const subLen = (email.subject || '').length
              const wordColor = words <= 100 ? '#059669' : words <= 120 ? '#d97706' : '#dc2626'
              const subColor = subLen <= 33 ? '#059669' : '#dc2626'
              return (
                <div
                  key={idx}
                  style={{
                    border: `0.5px solid ${colors.border}`,
                    borderRadius: 8,
                    padding: 12,
                    background: colors.surface
                  }}
                >
                  <div style={{ ...labelStyle, marginBottom: 8 }}>
                    Email {email.step || idx + 1} · Day {email.day ?? [0, 3, 7][idx]}
                  </div>
                  <div style={{
                    background: colors.bg,
                    border: `0.5px solid ${colors.border}`,
                    borderRadius: 6,
                    padding: '8px 10px',
                    marginBottom: 8,
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 8,
                    alignItems: 'flex-start'
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, flex: 1 }}>
                      {email.subject}
                    </div>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: subColor,
                      whiteSpace: 'nowrap'
                    }}>
                      {subLen}/33
                    </span>
                  </div>
                  <textarea
                    style={{
                      ...inputStyle,
                      minHeight: 160,
                      resize: 'vertical',
                      lineHeight: 1.5,
                      fontSize: 13
                    }}
                    value={email.body}
                    onChange={(e) => updateBody(idx, e.target.value)}
                  />
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 8,
                    flexWrap: 'wrap',
                    gap: 6
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: wordColor }}>
                      {words} words
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button style={btnSecondary} onClick={() => copyEmail(email, idx)}>
                        {copiedIdx === idx ? 'Copied!' : 'Copy email'}
                      </button>
                      {sentMap[email.step || idx + 1] ? (
                        <span style={{ fontSize: 12, color: '#059669', fontWeight: 500, padding: '6px 0' }}>
                          Sent ✓ {sentMap[email.step || idx + 1]}
                        </span>
                      ) : (
                        <button
                          style={btnSecondary}
                          onClick={() => markSent(email.step || idx + 1)}
                        >
                          Mark as sent
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {quality && (
            <div style={{
              padding: 12,
              borderRadius: 8,
              marginBottom: 12,
              background: quality.passed ? '#f0fdf4' : '#fffbeb',
              border: `0.5px solid ${quality.passed ? '#bbf7d0' : '#fde68a'}`
            }}>
              <div style={{
                fontSize: 13,
                fontWeight: 600,
                color: quality.passed ? '#059669' : '#d97706',
                marginBottom: quality.passed ? 0 : 8
              }}>
                {quality.passed ? 'Quality check passed' : 'Quality check found issues'}
              </div>
              {!quality.passed && quality.results.map((r) => (
                r.flags.length > 0 && (
                  <div key={r.step} style={{ fontSize: 12, color: colors.muted, marginBottom: 4 }}>
                    Email {r.step}: {r.flags.map((f) => f.message).join('; ')}
                  </div>
                )
              ))}
            </div>
          )}

          <div style={{ fontSize: 12, color: '#d97706', lineHeight: 1.5 }}>
            Review all emails before sending. These are starting points, not finished copy.
          </div>

          {Object.keys(sentMap).length > 0 && (
            <div style={{
              marginTop: 20,
              padding: 14,
              border: `0.5px solid ${colors.border}`,
              borderRadius: 8,
              background: colors.bg
            }}>
              <div style={labelStyle}>Reply tracking</div>
              <select
                style={{ ...inputStyle, marginBottom: 8, cursor: 'pointer' }}
                value={replyStatus}
                onChange={(e) => { setReplyStatus(e.target.value); setReplySaved(false) }}
              >
                {['No reply', 'Positive', 'Negative', 'Need more info', 'Meeting booked'].map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
              <textarea
                style={{ ...inputStyle, minHeight: 60, resize: 'vertical', marginBottom: 8 }}
                placeholder="Reply notes (optional)"
                value={replyNotes}
                onChange={(e) => { setReplyNotes(e.target.value); setReplySaved(false) }}
              />
              <button style={btnAccent} onClick={saveReply} disabled={replySaving}>
                {replySaving ? 'Saving…' : 'Save reply'}
              </button>
              {replySaved && (
                <span style={{ marginLeft: 10, fontSize: 12, color: '#059669', fontWeight: 500 }}>
                  Reply logged ✓
                </span>
              )}
            </div>
          )}
        </>
      )}

      {copyFallback && (
        <div style={{
          marginTop: 16,
          padding: 12,
          border: `0.5px solid ${colors.border}`,
          borderRadius: 8,
          background: colors.bg
        }}>
          <div style={{ ...labelStyle, marginBottom: 6 }}>Clipboard blocked. Select and copy manually</div>
          <textarea
            style={{ ...inputStyle, minHeight: 100 }}
            value={copyFallback}
            readOnly
            onFocus={(e) => e.target.select()}
          />
          <button style={{ ...btnSecondary, marginTop: 8 }} onClick={() => setCopyFallback('')}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  )
}

const pulseDot = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: colors.accent,
  animation: 'pulse 1s infinite',
  display: 'inline-block',
  marginRight: 8
}
