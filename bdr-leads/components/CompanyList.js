import {
  colors, warmthStyle, statusStyle, toTitleCase, outreachScore, Pill, inputStyle
} from './shared'

function matchesFilter(company, filter) {
  if (filter === 'all') return true
  if (filter === 'hot') return (company.warmth || '').toLowerCase() === 'hot'
  if (filter === 'draft') return company.status === 'Draft ready'
  if (filter === 'sent') return company.status === 'Sent'
  if (filter === 'replied') return company.status === 'Replied'
  return true
}

export default function CompanyList({
  companies,
  selectedCompany,
  onSelect,
  search,
  onSearchChange,
  filter,
  loadingList
}) {
  const filtered = (companies || [])
    .filter((c) => matchesFilter(c, filter))
    .filter((c) => {
      if (!search.trim()) return true
      return (c.company || '').toLowerCase().includes(search.trim().toLowerCase())
    })

  return (
    <div style={{
      width: 260,
      flexShrink: 0,
      borderRight: `0.5px solid ${colors.border}`,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: colors.surface,
      boxSizing: 'border-box'
    }}>
      <div style={{ padding: 12, borderBottom: `0.5px solid ${colors.border}` }}>
        <input
          style={inputStyle}
          placeholder="Search companies…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loadingList && (
          <div style={{ padding: 16, fontSize: 13, color: colors.muted }}>Loading pipeline…</div>
        )}

        {!loadingList && filtered.length === 0 && (
          <div style={{ padding: 16, fontSize: 13, color: colors.muted, lineHeight: 1.6 }}>
            {companies.length === 0
              ? 'No companies yet. Add your first one with + New company.'
              : 'No companies match this filter.'}
          </div>
        )}

        {filtered.map((c) => {
          const selected = selectedCompany?.company === c.company
          const score = outreachScore(c)
          const warmthKey = (c.warmth || 'cold').toLowerCase()
          const wStyle = warmthStyle[warmthKey] || warmthStyle.cold
          const sStyle = statusStyle[c.status] || statusStyle['Not contacted']
          const tags = (c.tags || []).slice(0, 2)

          return (
            <button
              key={c.company}
              onClick={() => onSelect(c)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                border: 'none',
                borderBottom: `0.5px solid ${colors.border}`,
                borderLeft: selected ? `3px solid ${colors.accent}` : '3px solid transparent',
                background: selected ? colors.accentBg : colors.surface,
                padding: '12px 12px 12px 10px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            >
              <div style={{
                fontSize: 14,
                fontWeight: 600,
                color: colors.text,
                marginBottom: 6,
                lineHeight: 1.3
              }}>
                {toTitleCase(c.company)}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                <Pill label={c.status || 'Not contacted'} palette={sStyle} />
                {c.warmth && <Pill label={c.warmth} palette={wStyle} />}
              </div>
              {tags.length > 0 && (
                <div style={{ fontSize: 11, color: colors.hint, marginBottom: 4 }}>
                  {tags.map((t) => (t.length > 22 ? t.slice(0, 22) + '…' : t)).join(' · ')}
                </div>
              )}
              <div style={{ fontSize: 12, color: colors.muted, fontWeight: 500 }}>
                Score {score.toFixed(1)} / 10
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
