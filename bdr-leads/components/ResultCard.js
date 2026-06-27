const warmthConfig = {
  hot:  { label: 'Hot lead',  color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  warm: { label: 'Warm lead', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  cold: { label: 'Cold lead', color: '#6b6b67', bg: '#f8f8f6', border: '#e4e4e0' },
}

export default function ResultCard({ data, company }) {
  const brief = data.brief || {}
  const email = data.emailData
  const warmth = warmthConfig[brief.warmth] || warmthConfig.cold

  function copyAngle() {
    navigator.clipboard.writeText(brief.angle || '')
  }

  return (
    <div style={{
      background: '#fff',
      border: '0.5px solid #e4e4e0',
      borderRadius: 12,
      padding: '1.25rem',
      marginBottom: 16
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 600, color: '#1a1a18', marginBottom: 4 }}>{company}</h2>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 12, padding: '2px 10px', borderRadius: 99,
              background: warmth.bg, color: warmth.color, border: `0.5px solid ${warmth.border}`,
              fontWeight: 500
            }}>{warmth.label}</span>
            {(brief.tags || []).map((tag, i) => (
              <span key={i} style={{
                fontSize: 12, padding: '2px 10px', borderRadius: 99,
                background: '#f1f5f9', color: '#475569', border: '0.5px solid #e2e8f0'
              }}>{tag}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Two column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <Section label="What they do" body={brief.what} />
        <Section label="Size & stage" body={brief.size} />
        <Section label="Colorado presence" body={brief.colorado} />
        <Section label="University programs" body={brief.university} />
      </div>

      <Section label="POC brief" body={brief.poc} style={{ marginBottom: 12 }} />

      {/* Email angle */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#9b9b97', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Email angle</div>
        <div style={{
          background: '#eff6ff', border: '0.5px solid #bfdbfe',
          borderRadius: 8, padding: '10px 14px',
          fontSize: 14, color: '#1e3a8a', lineHeight: 1.7,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12
        }}>
          <span>{brief.angle}</span>
          <button onClick={copyAngle} title="Copy angle" style={{
            background: 'none', border: '0.5px solid #bfdbfe', borderRadius: 6,
            padding: '3px 8px', fontSize: 11, color: '#2563eb', cursor: 'pointer',
            whiteSpace: 'nowrap', flexShrink: 0
          }}>Copy</button>
        </div>
      </div>

      {/* Why BDR */}
      <Section label="Why they'd care about BDR" body={brief.why} style={{ marginBottom: 12 }} />

      {/* Email pattern */}
      {email && (
        <div style={{
          background: '#f0fdf4', border: '0.5px solid #bbf7d0',
          borderRadius: 8, padding: '10px 14px', marginBottom: 12
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9b9b97', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Email pattern (Hunter.io)</div>
          <div style={{ fontSize: 14, color: '#14532d' }}>
            <strong>Domain:</strong> {email.domain} &nbsp;|&nbsp;
            <strong>Pattern:</strong> <code style={{ background: '#dcfce7', padding: '1px 6px', borderRadius: 4 }}>{email.pattern}</code>
            {email.exampleEmail && <> &nbsp;|&nbsp; <strong>Example:</strong> {email.exampleEmail}</>}
          </div>
        </div>
      )}

      {/* Next steps */}
      {brief.next && brief.next.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9b9b97', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Next steps</div>
          <ul style={{ paddingLeft: 18, fontSize: 13, color: '#6b6b67', lineHeight: 1.8 }}>
            {brief.next.map((step, i) => <li key={i}>{step}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

function Section({ label, body, style }) {
  return (
    <div style={style}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#9b9b97', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, color: '#1a1a18', lineHeight: 1.7 }}>{body || '—'}</div>
    </div>
  )
}
