import {
  colors, warmthStyle, statusStyle, toTitleCase, parseLinkedIn,
  outreachScore, Pill, labelStyle, btnPrimary
} from '../shared'

export default function BriefTab({
  company,
  researchResult,
  loadingResearch,
  onResearch,
  onStatusUpdate
}) {
  if (!company) {
    return <div style={{ fontSize: 14, color: colors.muted }}>Select a company to view its brief.</div>
  }

  const score = outreachScore(company)
  const warmthKey = (company.warmth || 'cold').toLowerCase()
  const wStyle = warmthStyle[warmthKey] || warmthStyle.cold
  const sStyle = statusStyle[company.status] || statusStyle['Not contacted']
  const linkedIn = parseLinkedIn(company.linkedIn)
  const brief = researchResult?.brief
  const currentStatus = company.status || 'Not contacted'

  const STATUSES = [
    'Not contacted',
    'Researching',
    'Draft ready',
    'Sent',
    'Replied',
    'Pass'
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 600, color: colors.text, marginBottom: 8 }}>
          {toTitleCase(company.company)}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 8 }}>
          <Pill label={currentStatus} palette={sStyle} />
          {company.warmth && <Pill label={company.warmth} palette={wStyle} />}
          <span style={{ fontSize: 13, color: colors.muted, marginLeft: 4 }}>
            Score {score.toFixed(1)} / 10
          </span>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={labelStyle}>Pipeline status</div>
        <div style={{ display: 'flex', flexWrap: 'wrap' }}>
          {STATUSES.map((status) => {
            const active = currentStatus === status
            return (
              <button
                key={status}
                type="button"
                onClick={() => onStatusUpdate && onStatusUpdate(company.company, status)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  fontSize: 12,
                  cursor: 'pointer',
                  marginRight: 6,
                  marginBottom: 6,
                  border: '0.5px solid #e4e4e0',
                  background: active ? '#1a1a18' : '#fff',
                  color: active ? '#fff' : '#6b6b67',
                  fontFamily: 'inherit'
                }}
              >
                {status}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 12,
        marginBottom: 16
      }}>
        <Section title="Tags / focus">
          {(company.tags || []).length
            ? (company.tags || []).join(', ')
            : '—'}
        </Section>
        <Section title="What they do">{company.what || '—'}</Section>
        <Section title="Colorado">{company.colorado || '—'}</Section>
        <Section title="University">{company.university || '—'}</Section>
        <Section title="Notes">{company.notes || '—'}</Section>
        <Section title="Email pattern">{company.emailPattern || '—'}</Section>
        <Section title="LinkedIn">
          {linkedIn
            ? (
              <a href={linkedIn} target="_blank" rel="noreferrer" style={{ color: colors.accent }}>
                LinkedIn profile
              </a>
            )
            : '—'}
        </Section>
        <Section title="Date added">{company.dateAdded || '—'}</Section>
      </div>

      <button style={btnPrimary} onClick={onResearch} disabled={loadingResearch}>
        {loadingResearch ? 'Researching…' : 'Research this company'}
      </button>
      {loadingResearch && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: 13, color: colors.muted }}>
          <span style={pulseDot} />
          Searching web + generating brief (~20s)
        </div>
      )}

      {brief && (
        <div style={{ marginTop: 24, borderTop: `0.5px solid ${colors.border}`, paddingTop: 20 }}>
          <div style={{ ...labelStyle, marginBottom: 12, color: colors.accent }}>Fresh research</div>
          <BriefField title="What they do" text={brief.what} />
          <BriefField title="Size" text={brief.size} />
          <BriefField title="Colorado" text={brief.colorado} />
          <BriefField title="University" text={brief.university} />
          <BriefField title="POC notes" text={brief.poc} />
          <BriefField title="Why BDR" text={brief.why} />
          <BriefField title="Angle" text={brief.angle} />
          {Array.isArray(brief.tags) && brief.tags.length > 0 && (
            <BriefField title="Tags" text={brief.tags.join(', ')} />
          )}
          {Array.isArray(brief.next) && brief.next.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={labelStyle}>Next steps</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: colors.text, lineHeight: 1.7 }}>
                {brief.next.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </div>
          )}
          {researchResult?.emailData?.pattern && (
            <BriefField title="Email pattern (Hunter)" text={researchResult.emailData.pattern} />
          )}
        </div>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{
      background: colors.bg,
      border: `0.5px solid ${colors.border}`,
      borderRadius: 8,
      padding: 12
    }}>
      <div style={labelStyle}>{title}</div>
      <div style={{ fontSize: 14, color: colors.text, lineHeight: 1.6 }}>{children}</div>
    </div>
  )
}

function BriefField({ title, text }) {
  if (!text) return null
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={labelStyle}>{title}</div>
      <div style={{ fontSize: 14, color: colors.text, lineHeight: 1.7 }}>{text}</div>
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
