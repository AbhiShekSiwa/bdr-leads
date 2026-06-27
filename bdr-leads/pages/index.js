import { useState } from 'react'
import ResultCard from '../components/ResultCard'
import { exportToCSV } from '../lib/exportCSV'

const s = {
  page: { minHeight: '100vh', background: '#f8f8f6', padding: '2rem 1rem' },
  inner: { maxWidth: 760, margin: '0 auto' },
  header: { marginBottom: '2rem' },
  h1: { fontSize: 24, fontWeight: 600, color: '#1a1a18', marginBottom: 4 },
  sub: { fontSize: 14, color: '#6b6b67' },
  tabs: { display: 'flex', gap: 0, marginBottom: '1.5rem', border: '0.5px solid #e4e4e0', borderRadius: 8, overflow: 'hidden', width: 'fit-content' },
  tab: (active) => ({
    padding: '8px 20px', fontSize: 14, cursor: 'pointer', border: 'none',
    background: active ? '#1a1a18' : '#fff', color: active ? '#fff' : '#6b6b67',
    fontWeight: active ? 500 : 400, transition: 'all 0.15s'
  }),
  card: { background: '#fff', border: '0.5px solid #e4e4e0', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' },
  label: { fontSize: 12, fontWeight: 600, color: '#9b9b97', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block' },
  input: { width: '100%', border: '0.5px solid #d0d0cc', borderRadius: 8, padding: '9px 12px', fontSize: 14, fontFamily: 'inherit', background: '#fff', color: '#1a1a18', outline: 'none' },
  textarea: { width: '100%', border: '0.5px solid #d0d0cc', borderRadius: 8, padding: '9px 12px', fontSize: 14, fontFamily: 'inherit', background: '#fff', color: '#1a1a18', outline: 'none', resize: 'vertical', minHeight: 80 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 },
  field: { marginBottom: 12 },
  btnPrimary: { background: '#1a1a18', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer' },
  btnSecondary: { background: '#fff', color: '#1a1a18', border: '0.5px solid #d0d0cc', borderRadius: 8, padding: '10px 20px', fontSize: 14, cursor: 'pointer' },
  btnRow: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 16 },
  status: { fontSize: 13, color: '#6b6b67', display: 'flex', alignItems: 'center', gap: 8 },
  error: { fontSize: 13, color: '#dc2626', marginTop: 8 },
  dot: { width: 8, height: 8, borderRadius: '50%', background: '#2563eb', animation: 'pulse 1s infinite' },
}

export default function Home() {
  const [tab, setTab] = useState('single')

  // Single mode state
  const [form, setForm] = useState({ company: '', poc: '', pocRole: '', notes: '', skipHunter: true })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  // Batch mode state
  const [batchText, setBatchText] = useState('')
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchResults, setBatchResults] = useState([])
  const [batchError, setBatchError] = useState('')
  const [batchProgress, setBatchProgress] = useState('')

  async function runSingle() {
    if (!form.company.trim()) { setError('Company name is required'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error)
      setResult({ company: form.company, ...data })
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  async function runBatch() {
    const lines = batchText.trim().split('\n').filter(l => l.trim())
    if (lines.length === 0) { setBatchError('Paste at least one company name'); return }

    const companies = lines.map(line => {
      const parts = line.split(',').map(p => p.trim())
      return { company: parts[0], poc: parts[1] || '', pocRole: parts[2] || '', notes: parts[3] || '' }
    })

    setBatchLoading(true); setBatchError(''); setBatchResults([])

    const allResults = []
    for (let i = 0; i < companies.length; i++) {
      setBatchProgress(`Researching ${i + 1} of ${companies.length}: ${companies[i].company}…`)
      try {
        const r = await fetch('/api/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...companies[i], skipHunter: true })
        })
        const data = await r.json()
        allResults.push({ company: companies[i].company, ...data, success: !data.error })
      } catch (e) {
        allResults.push({ company: companies[i].company, success: false, error: e.message })
      }
      setBatchResults([...allResults])
      if (i < companies.length - 1) await new Promise(res => setTimeout(res, 900))
    }

    setBatchProgress('')
    setBatchLoading(false)
  }

  const allResults = tab === 'single' ? (result ? [result] : []) : batchResults

  return (
    <div style={s.page}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        input:focus, textarea:focus { border-color: #2563eb !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
        button:hover { opacity: 0.85; }
      `}</style>

      <div style={s.inner}>
        <div style={s.header}>
          <h1 style={s.h1}>🚀 BDR Sponsorship Research</h1>
          <p style={s.sub}>Find leads, get AI briefs, discover email patterns — all free APIs.</p>
        </div>

        {/* Tabs */}
        <div style={s.tabs}>
          <button style={s.tab(tab === 'single')} onClick={() => setTab('single')}>Single company</button>
          <button style={s.tab(tab === 'batch')} onClick={() => setTab('batch')}>Batch list</button>
        </div>

        {/* Single mode */}
        {tab === 'single' && (
          <div style={s.card}>
            <div style={s.grid2}>
              <div style={s.field}>
                <label style={s.label}>Company name *</label>
                <input style={s.input} placeholder="e.g. Agile Space Industries"
                  value={form.company} onChange={e => setForm({ ...form, company: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && runSingle()} />
              </div>
              <div style={s.field}>
                <label style={s.label}>POC name (optional)</label>
                <input style={s.input} placeholder="e.g. Jane Smith"
                  value={form.poc} onChange={e => setForm({ ...form, poc: e.target.value })} />
              </div>
            </div>
            <div style={s.grid2}>
              <div style={s.field}>
                <label style={s.label}>POC title / role</label>
                <input style={s.input} placeholder="e.g. University Relations Manager"
                  value={form.pocRole} onChange={e => setForm({ ...form, pocRole: e.target.value })} />
              </div>
              <div style={s.field}>
                <label style={s.label}>Notes you already have</label>
                <input style={s.input} placeholder="e.g. CO based, met at AIAA"
                  value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <label style={{ fontSize: 13, color: '#6b6b67', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.skipHunter}
                  onChange={e => setForm({ ...form, skipHunter: e.target.checked })} />
                Include Hunter.io email pattern lookup (uses 1 of 50 monthly credits)
              </label>
            </div>
            <div style={s.btnRow}>
              <button style={s.btnPrimary} onClick={runSingle} disabled={loading}>
                {loading ? 'Researching…' : 'Research this company →'}
              </button>
              {loading && <div style={s.status}><div style={s.dot} /> Searching web + generating brief (~20s)</div>}
            </div>
            {error && <div style={s.error}>{error}</div>}
          </div>
        )}

        {/* Batch mode */}
        {tab === 'batch' && (
          <div style={s.card}>
            <label style={s.label}>Paste companies — one per line</label>
            <p style={{ fontSize: 13, color: '#9b9b97', marginBottom: 8 }}>
              Format: <code style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>Company Name, POC Name, POC Role, Notes</code> &nbsp;(only company name required)
            </p>
            <textarea style={s.textarea} rows={8}
              placeholder={`Agile Space Industries\nSeco Seals, Chris DeSandro, , website says they sponsor rocket clubs\nRedwire Space, Shane Layton`}
              value={batchText} onChange={e => setBatchText(e.target.value)} />
            <p style={{ fontSize: 12, color: '#9b9b97', marginTop: 4, marginBottom: 12 }}>
              Hunter.io is skipped in batch mode to preserve credits. Run single mode on your best leads to get email patterns.
            </p>
            <div style={s.btnRow}>
              <button style={s.btnPrimary} onClick={runBatch} disabled={batchLoading}>
                {batchLoading ? 'Researching…' : `Research ${batchText.trim().split('\n').filter(l => l.trim()).length || 0} companies →`}
              </button>
              {batchResults.length > 0 && (
                <button style={s.btnSecondary} onClick={() => exportToCSV(batchResults)}>
                  Download CSV
                </button>
              )}
            </div>
            {batchProgress && <div style={{ ...s.status, marginTop: 8 }}><div style={s.dot} />{batchProgress}</div>}
            {batchError && <div style={s.error}>{batchError}</div>}
          </div>
        )}

        {/* Results */}
        {allResults.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h2 style={{ fontSize: 16, fontWeight: 500, color: '#1a1a18' }}>
                {allResults.length} result{allResults.length !== 1 ? 's' : ''}
              </h2>
              {allResults.length > 1 && (
                <button style={s.btnSecondary} onClick={() => exportToCSV(allResults)}>
                  Download CSV
                </button>
              )}
            </div>
            {allResults.map((r, i) => (
              r.success === false
                ? <div key={i} style={{ ...s.card, color: '#dc2626', fontSize: 14 }}>
                    <strong>{r.company}</strong> — failed: {r.error}
                  </div>
                : <ResultCard key={i} data={r} company={r.company} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
