import { colors, labelStyle } from './shared'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'hot', label: 'Hot' },
  { id: 'draft', label: 'Draft ready' },
  { id: 'sent', label: 'Sent' },
  { id: 'replied', label: 'Replied' }
]

export default function Sidebar({ filter, onFilterChange, onNewCompany, onBatchImport }) {
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
        <div style={{ ...labelStyle, marginBottom: 4 }}>API credits</div>
        <div>Serper: 2,500/mo free</div>
        <div>Hunter: 50/mo free</div>
        <div>Gemini: 1,500/day free</div>
      </div>
    </aside>
  )
}
