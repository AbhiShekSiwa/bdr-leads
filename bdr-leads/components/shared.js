export const colors = {
  bg: '#f8f8f6',
  surface: '#ffffff',
  border: '#e4e4e0',
  text: '#1a1a18',
  muted: '#6b6b67',
  hint: '#9b9b97',
  accent: '#2563eb',
  accentBg: '#eff6ff',
  accentBorder: '#bfdbfe',
  signal: { text: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' }
}

export const warmthStyle = {
  hot: { text: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  warm: { text: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  cold: { text: '#6b6b67', bg: '#f8f8f6', border: '#e4e4e0' }
}

export const statusStyle = {
  'Not contacted': { text: '#6b6b67', bg: '#f1f5f9', border: '#e2e8f0' },
  Researching: { text: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  'Draft ready': { text: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  Sent: { text: '#059669', bg: '#f0fdf4', border: '#bbf7d0' },
  Replied: { text: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  Pass: { text: '#9b9b97', bg: '#f8f8f6', border: '#e4e4e0' }
}

export function toTitleCase(str) {
  if (!str) return ''
  return String(str).replace(/\b\w/g, (c) => c.toUpperCase())
}

export function parseLinkedIn(str) {
  if (!str || typeof str !== 'string') return ''
  const trimmed = str.trim()
  if (!trimmed) return ''

  let url = trimmed
  // =HYPERLINK("url","View Profile") — take the FIRST quoted string (the URL)
  if (trimmed.toUpperCase().startsWith('=HYPERLINK')) {
    const match = trimmed.match(/"([^"]+)"/)
    url = match ? match[1].trim() : ''
  }

  // Sheets values.get often returns the display label "View Profile" instead of the formula
  if (!url || /^view profile$/i.test(url)) return ''
  if (!/^https?:\/\//i.test(url) && !/linkedin\.com/i.test(url)) return ''
  if (!/^https?:\/\//i.test(url) && /linkedin\.com/i.test(url)) {
    url = `https://${url.replace(/^\/\//, '')}`
  }
  return url
}

export function outreachScore(company) {
  let score = 0
  const warmth = (company.warmth || '').toLowerCase()
  if (warmth === 'hot') score += 2.0
  if (warmth === 'warm') score += 1.0

  const tags = (company.tags || []).map((t) => String(t).toLowerCase())
  if (tags.some((t) => t.includes('co') || t.includes('colorado'))) score += 2.0
  if (tags.some((t) => t.includes('university') || t.includes('sponsor'))) score += 1.5
  if (tags.some((t) => t.includes('propulsion') || t.includes('engine'))) score += 1.5

  const status = company.status || ''
  if (status !== 'Not contacted' && status !== 'Pass') score += 1.0
  if (parseLinkedIn(company.linkedIn)) score += 1.0

  return Math.min(10, Math.round(score * 10) / 10)
}

export function Pill({ label, palette }) {
  const p = palette || { text: colors.muted, bg: colors.bg, border: colors.border }
  return (
    <span style={{
      display: 'inline-block',
      fontSize: 11,
      fontWeight: 600,
      color: p.text,
      background: p.bg,
      border: `0.5px solid ${p.border}`,
      borderRadius: 99,
      padding: '2px 8px',
      whiteSpace: 'nowrap'
    }}>
      {label}
    </span>
  )
}

export const labelStyle = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: colors.hint,
  marginBottom: 6,
  display: 'block'
}

export const inputStyle = {
  width: '100%',
  border: `0.5px solid ${colors.border}`,
  borderRadius: 8,
  padding: '9px 12px',
  fontSize: 14,
  fontFamily: 'inherit',
  background: colors.surface,
  color: colors.text,
  outline: 'none',
  boxSizing: 'border-box'
}

export const btnPrimary = {
  background: colors.text,
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '9px 16px',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit'
}

export const btnSecondary = {
  background: colors.surface,
  color: colors.text,
  border: `0.5px solid ${colors.border}`,
  borderRadius: 8,
  padding: '9px 16px',
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'inherit'
}

export const btnAccent = {
  background: colors.accent,
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  padding: '9px 16px',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit'
}
