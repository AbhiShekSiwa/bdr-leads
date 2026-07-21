import { useState } from 'react'
import { colors, btnPrimary, btnSecondary } from '../shared'

export default function PeopleTab({
  company,
  contacts = [],
  people,
  loadingPeople,
  onFindPeople,
  onContactSelect,
  onContactsUpdated
}) {
  const [hunterLoading, setHunterLoading] = useState({})
  const [hunterResults, setHunterResults] = useState({})
  const [cascadeNotice, setCascadeNotice] = useState('')

  const list = (people && people.length > 0) ? people : contacts
  const fromDb = (!people || people.length === 0) && contacts.length > 0
  const lastUpdated = fromDb
    ? (contacts.find((c) => c.foundAt)?.foundAt || '')
    : ''

  async function findEmail(person) {
    const key = person.name
    setHunterLoading((prev) => ({ ...prev, [key]: true }))
    setCascadeNotice('')
    try {
      const r = await fetch('/api/hunter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company,
          contactName: person.name,
          contactTitle: person.title || ''
        })
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Hunter lookup failed')
      setHunterResults((prev) => ({
        ...prev,
        [key]: {
          email: data.email || person.email,
          confidence: data.confidence,
          source: data.email ? 'hunter-verified' : (person.emailSource || 'pattern-constructed'),
          pattern: data.pattern
        }
      }))
      if (data.cascadeCount > 0) {
        setCascadeNotice(`Domain pattern applied to ${data.cascadeCount} other contact${data.cascadeCount === 1 ? '' : 's'}`)
      }
      if (onContactsUpdated) onContactsUpdated()
    } catch (e) {
      setHunterResults((prev) => ({ ...prev, [key]: { error: e.message } }))
    }
    setHunterLoading((prev) => ({ ...prev, [key]: false }))
  }

  return (
    <div>
      {fromDb && (
        <div style={{ fontSize: 12, color: colors.hint, marginBottom: 10 }}>
          Loaded from database
          {lastUpdated ? ` · Last updated ${new Date(lastUpdated).toLocaleString()}` : ''}
        </div>
      )}

      <button style={btnPrimary} onClick={onFindPeople} disabled={loadingPeople}>
        {loadingPeople
          ? 'Searching LinkedIn…'
          : fromDb
            ? 'Refresh (uses 6 searches)'
            : 'Find people'}
      </button>
      <div style={{ fontSize: 12, color: colors.hint, marginTop: 6, marginBottom: 16 }}>
        (uses ~6 Serper searches)
      </div>

      {cascadeNotice && (
        <div style={{
          fontSize: 12,
          color: '#7c3aed',
          background: '#f5f3ff',
          border: '0.5px solid #ddd6fe',
          borderRadius: 6,
          padding: '8px 10px',
          marginBottom: 12
        }}>
          {cascadeNotice}
        </div>
      )}

      {loadingPeople && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: colors.muted }}>
          <span style={pulseDot} />
          Searching LinkedIn profiles…
        </div>
      )}

      {!loadingPeople && list.length === 0 && (
        <div style={{ fontSize: 14, color: colors.muted }}>
          No people loaded yet. Click Find people to search.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {list.map((p, i) => {
          const hr = hunterResults[p.name]
          const email = hr?.email || p.email || ''
          const confidence = hr?.confidence != null ? hr.confidence : p.emailConfidence
          const source = hr?.source || p.emailSource || ''
          return (
            <div
              key={p.url || p.linkedInUrl || p.name || i}
              style={{
                border: `0.5px solid ${colors.border}`,
                borderRadius: 8,
                padding: 14,
                background: colors.surface
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>{p.name}</div>
              {p.title ? (
                <div style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
                  {p.title.length > 40 ? p.title.slice(0, 40) + '…' : p.title}
                </div>
              ) : null}
              {(p.url || p.linkedInUrl) && (
                <a
                  href={p.url || p.linkedInUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: 12, color: colors.accent, display: 'inline-block', marginTop: 6 }}
                >
                  LinkedIn profile
                </a>
              )}
              {p.snippet && (
                <div style={{ fontSize: 12, color: colors.hint, marginTop: 8, lineHeight: 1.5 }}>
                  {p.snippet.length > 120 ? p.snippet.slice(0, 120) + '…' : p.snippet}
                </div>
              )}

              {email && (
                <div style={{
                  marginTop: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  color: source === 'hunter-verified' ? '#059669' : '#d97706'
                }}>
                  {email}
                  {confidence != null ? ` · ${confidence}% confident` : ''}
                  {source === 'pattern-constructed' ? ' · pattern' : ''}
                </div>
              )}
              {hr?.error && (
                <div style={{ marginTop: 6, fontSize: 12, color: '#dc2626' }}>{hr.error}</div>
              )}

              <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  style={btnSecondary}
                  onClick={() => onContactSelect({
                    name: (p.name || '').trim(),
                    title: (p.title || '').trim()
                  })}
                >
                  Draft sequence for this person
                </button>
                <button
                  style={btnSecondary}
                  disabled={!!hunterLoading[p.name]}
                  onClick={() => findEmail(p)}
                >
                  {hunterLoading[p.name] ? 'Looking up…' : 'Find email (1 credit)'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const pulseDot = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: colors.accent,
  animation: 'pulse 1s infinite',
  display: 'inline-block'
}
