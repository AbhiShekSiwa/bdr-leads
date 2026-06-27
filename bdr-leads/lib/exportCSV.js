export function exportToCSV(results) {
  const headers = [
    'Company', 'Warmth', 'What they do', 'Size', 'Colorado presence',
    'University programs', 'POC brief', 'Why BDR fit', 'Email angle',
    'Email domain', 'Email pattern', 'Example email', 'Tags', 'Next steps'
  ]

  const rows = results.map(r => {
    const b = r.brief || {}
    const e = r.emailData || {}
    return [
      r.company,
      b.warmth || '',
      b.what || '',
      b.size || '',
      b.colorado || '',
      b.university || '',
      b.poc || '',
      b.why || '',
      b.angle || '',
      e.domain || '',
      e.pattern || '',
      e.exampleEmail || '',
      (b.tags || []).join('; '),
      (b.next || []).join('; ')
    ].map(v => `"${String(v).replace(/"/g, '""')}"`)
  })

  const csv = [headers.map(h => `"${h}"`).join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `bdr-leads-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
