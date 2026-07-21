import { checkSequence } from '../../lib/qualityCheck'
import { colors, labelStyle } from '../shared'

export default function QualityTab({ sequence, editedEmails }) {
  const emails = editedEmails?.length === 3
    ? editedEmails
    : (sequence?.emails || [])

  if (!emails.length) {
    return (
      <div style={{ fontSize: 14, color: colors.muted }}>
        Generate a sequence first
      </div>
    )
  }

  const result = checkSequence(emails)

  return (
    <div>
      <div style={{
        padding: 14,
        borderRadius: 8,
        marginBottom: 16,
        background: result.passed ? '#f0fdf4' : '#fef2f2',
        border: `0.5px solid ${result.passed ? '#bbf7d0' : '#fecaca'}`
      }}>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: result.passed ? '#059669' : '#dc2626'
        }}>
          {result.passed ? 'All emails passed quality check' : 'Sequence has quality issues'}
        </div>
      </div>

      {result.results.map((r) => (
        <div
          key={r.step}
          style={{
            border: `0.5px solid ${colors.border}`,
            borderRadius: 8,
            padding: 14,
            marginBottom: 10,
            background: colors.surface
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>
              Email {r.step}
            </div>
            <span style={{
              fontSize: 12,
              fontWeight: 600,
              color: r.passed ? '#059669' : '#dc2626'
            }}>
              {r.passed ? 'Passed' : 'Failed'}
            </span>
          </div>

          {r.flags.length === 0 ? (
            <div style={{ fontSize: 13, color: colors.muted }}>No flags</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {r.flags.map((f, i) => (
                <div key={i} style={{
                  fontSize: 13,
                  color: f.severity === 'error' ? '#dc2626' : '#d97706',
                  lineHeight: 1.5
                }}>
                  <span style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: 11, marginRight: 6 }}>
                    {f.severity}
                  </span>
                  [{f.location}] {f.message}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
