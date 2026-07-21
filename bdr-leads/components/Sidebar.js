import { colors, labelStyle } from './shared'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'hot', label: 'Hot' },
  { id: 'draft', label: 'Draft ready' },
  { id: 'sent', label: 'Sent' },
  { id: 'replied', label: 'Replied' }
]

function CreditRow({ label, used, limit, color }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0
  const barColor = pct > 80 ? '#dc2626' : color
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ marginBottom: 3 }}>
        {label}: {used} / {limit} used
      </div>
      <div style={{
        height: 4,
        background: '#e4e4e0',
        borderRadius: 99,
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: barColor,
          borderRadius: 99
        }} />
      </div>
    </div>
  )
}

export default function Sidebar({ filter, onFilterChange, onNewCompany, onBatchImport, credits }) {
  return (
    <aside style={{
      width: 200,
      flexShrink: 0,
      background: colors.bg,
      borderRight: `0.5px solid ${colors.border}`,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      boxSizing: 'border-box'
    }}>
      <div style={{ padding: '16px 14px 12px' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>
          🚀 Outreach OS
        </div>
      </div>

      <div style={{ padding: '0 10px', flex: 1, overflowY: 'auto' }}>
        <div style={{ ...labelStyle, margin: '8px 4px 6px' }}>Pipeline</div>
        {FILTERS.map((f) => {
          const active = filter === f.id
          return (
            <button
              key={f.id}
              onClick={() => onFilterChange(f.id)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                border: 'none',
                background: active ? colors.accentBg : 'transparent',
                color: active ? colors.accent : colors.muted,
                fontWeight: active ? 600 : 400,
                fontSize: 13,
                padding: '7px 10px',
                borderRadius: 6,
                cursor: 'pointer',
                fontFamily: 'inherit',
                marginBottom: 2
              }}
            >
              {f.label}
            </button>
          )
        })}

        <div style={{ ...labelStyle, margin: '16px 4px 6px' }}>Actions</div>
        <button
          onClick={onNewCompany}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            border: `0.5px solid ${colors.border}`,
            background: colors.surface,
            color: colors.text,
            fontSize: 13,
            padding: '8px 10px',
            borderRadius: 6,
            cursor: 'pointer',
            fontFamily: 'inherit',
            marginBottom: 6,
            fontWeight: 500
          }}
        >
          + New company
        </button>
        <button
          onClick={onBatchImport}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            border: `0.5px solid ${colors.border}`,
            background: colors.surface,
            color: colors.text,
            fontSize: 13,
            padding: '8px 10px',
            borderRadius: 6,
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontWeight: 500
          }}
        >
          Batch import
        </button>
      </div>

      <div style={{
        padding: '12px 14px',
        borderTop: `0.5px solid ${colors.border}`,
        fontSize: 11,
        color: colors.hint,
        lineHeight: 1.6
      }}>
        <div style={{ ...labelStyle, marginBottom: 6 }}>API credits</div>
        {credits ? (
          <>
            <CreditRow label="Serper" used={credits.serper?.used || 0} limit={credits.serper?.limit || 2500} color="#2563eb" />
            <CreditRow label="Gemini" used={credits.gemini?.used || 0} limit={credits.gemini?.limit || 1500} color="#7c3aed" />
            <CreditRow label="Hunter" used={credits.hunter?.used || 0} limit={credits.hunter?.limit || 50} color="#059669" />
          </>
        ) : (
          <>
            <div>Serper: 2,500/mo free</div>
            <div>Hunter: 50/mo free</div>
            <div>Gemini: 1,500/day free</div>
          </>
        )}
      </div>
    </aside>
  )
}
