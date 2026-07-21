import { colors, labelStyle, btnPrimary, btnSecondary } from '../shared'

export default function PeopleTab({
  people,
  loadingPeople,
  onFindPeople,
  onContactSelect
}) {
  return (
    <div>
      <button style={btnPrimary} onClick={onFindPeople} disabled={loadingPeople}>
        {loadingPeople ? 'Searching LinkedIn…' : 'Find people'}
      </button>
      <div style={{ fontSize: 12, color: colors.hint, marginTop: 6, marginBottom: 16 }}>
        (uses ~6 Serper searches)
      </div>

      {loadingPeople && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: colors.muted }}>
          <span style={pulseDot} />
          Searching LinkedIn profiles…
        </div>
      )}

      {!loadingPeople && people.length === 0 && (
        <div style={{ fontSize: 14, color: colors.muted }}>
          No people loaded yet. Click Find people to search.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {people.map((p, i) => (
          <div
            key={p.url || i}
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
            {p.url && (
              <a
                href={p.url}
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
            <div style={{ marginTop: 10 }}>
              <button
                style={btnSecondary}
                onClick={() => onContactSelect({
                  name: (p.name || '').trim(),
                  title: (p.title || '').trim()
                })}
              >
                Draft sequence for this person
              </button>
            </div>
          </div>
        ))}
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
