import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import CompanyList from '../components/CompanyList'
import CompanyDetail from '../components/CompanyDetail'
import ResultCard from '../components/ResultCard'
import { exportToCSV } from '../lib/exportCSV'
import { colors, toTitleCase, labelStyle, inputStyle, btnPrimary, btnSecondary } from '../components/shared'

export default function Home() {
  const [companies, setCompanies] = useState([])
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('brief')
  const [loadingList, setLoadingList] = useState(false)
  const [loadingResearch, setLoadingResearch] = useState(false)
  const [loadingPeople, setLoadingPeople] = useState(false)
  const [loadingSignals, setLoadingSignals] = useState(false)
  const [loadingSequence, setLoadingSequence] = useState(false)
  const [researchResult, setResearchResult] = useState(null)
  const [people, setPeople] = useState([])
  const [signals, setSignals] = useState([])
  const [sequence, setSequence] = useState(null)
  const [editedEmails, setEditedEmails] = useState([])
  const [contactName, setContactName] = useState('')
  const [contactTitle, setContactTitle] = useState('')
  const [askType, setAskType] = useState('financial_sponsorship')
  const [showNewCompany, setShowNewCompany] = useState(false)
  const [showBatch, setShowBatch] = useState(false)
  const [isNarrow, setIsNarrow] = useState(false)
  const [error, setError] = useState('')

  // New company form
  const [newCompany, setNewCompany] = useState('')
  const [newNotes, setNewNotes] = useState('')

  // Batch state (existing functionality)
  const [batchText, setBatchText] = useState('')
  const [batchLoading, setBatchLoading] = useState(false)
  const [batchResults, setBatchResults] = useState([])
  const [batchError, setBatchError] = useState('')
  const [batchProgress, setBatchProgress] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 900) {
      setIsNarrow(true)
    }
    loadCompanies(true)
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    if (selectedCompany?.company) {
      document.title = `${toTitleCase(selectedCompany.company)} · Outreach OS`
    } else {
      document.title = 'Outreach OS'
    }
  }, [selectedCompany])

  async function loadCompanies(selectFirst = false) {
    setLoadingList(true)
    setError('')
    try {
      const r = await fetch('/api/list')
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Failed to load companies')
      const list = data.companies || []
      setCompanies(list)
      if (selectFirst && list.length > 0) {
        setSelectedCompany(list[0])
        setShowNewCompany(false)
        setShowBatch(false)
      }
    } catch (e) {
      setError(e.message)
    }
    setLoadingList(false)
  }

  function resetWorkingState() {
    setPeople([])
    setSignals([])
    setSequence(null)
    setEditedEmails([])
    setResearchResult(null)
    setContactName('')
    setContactTitle('')
    setAskType('financial_sponsorship')
  }

  function handleSelectCompany(company) {
    if (
      selectedCompany &&
      selectedCompany.company !== company.company &&
      sequence
    ) {
      const ok = window.confirm('Switch companies? Your current sequence will be cleared.')
      if (!ok) return
    }
    setSelectedCompany(company)
    setShowNewCompany(false)
    setShowBatch(false)
    resetWorkingState()
  }

  function handleNewCompany() {
    setShowNewCompany(true)
    setShowBatch(false)
    setSelectedCompany(null)
    resetWorkingState()
  }

  function handleBatchImport() {
    setShowBatch(true)
    setShowNewCompany(false)
  }

  async function updateCompanyStatus(companyName, status) {
    try {
      const r = await fetch('/api/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: companyName, status })
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Status update failed')
      setCompanies((prev) =>
        prev.map((c) => (c.company === companyName ? { ...c, status } : c))
      )
      setSelectedCompany((prev) =>
        prev && prev.company === companyName ? { ...prev, status } : prev
      )
    } catch (e) {
      console.error(e)
      setError(e.message)
    }
  }

  async function handleResearch() {
    if (!selectedCompany?.company) return
    setLoadingResearch(true)
    setError('')
    try {
      const r = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: selectedCompany.company,
          notes: selectedCompany.notes || '',
          skipHunter: true
        })
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Research failed')
      setResearchResult(data)
      await updateCompanyStatus(selectedCompany.company, 'Researching')
      await loadCompanies(false)
    } catch (e) {
      setError(e.message)
    }
    setLoadingResearch(false)
  }

  async function handleNewCompanySubmit() {
    if (!newCompany.trim()) {
      setError('Company name is required')
      return
    }
    setLoadingResearch(true)
    setError('')
    try {
      const r = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: newCompany.trim(),
          notes: newNotes.trim(),
          skipHunter: true
        })
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Research failed')
      setResearchResult(data)
      await loadCompanies(false)
      // Select the newly researched company (match by name)
      const listRes = await fetch('/api/list')
      const listData = await listRes.json()
      const list = listData.companies || []
      setCompanies(list)
      const match = list.find(
        (c) => c.company.toLowerCase().trim() === newCompany.trim().toLowerCase()
      ) || list[list.length - 1]
      if (match) {
        setSelectedCompany(match)
        setShowNewCompany(false)
        setActiveTab('brief')
        setPeople([])
        setSignals([])
        setSequence(null)
        setEditedEmails([])
        setContactName('')
        setContactTitle('')
      }
      setNewCompany('')
      setNewNotes('')
    } catch (e) {
      setError(e.message)
    }
    setLoadingResearch(false)
  }

  async function handleFindPeople() {
    if (!selectedCompany?.company) return
    setLoadingPeople(true)
    setError('')
    try {
      const r = await fetch('/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: selectedCompany.company })
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'People search failed')
      setPeople(data.people || [])
    } catch (e) {
      setError(e.message)
    }
    setLoadingPeople(false)
  }

  async function handleScanSignals() {
    if (!selectedCompany?.company) return
    setLoadingSignals(true)
    setError('')
    try {
      const r = await fetch('/api/signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: selectedCompany.company })
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Signal scan failed')
      setSignals(data.signals || [])
    } catch (e) {
      setError(e.message)
    }
    setLoadingSignals(false)
  }

  async function handleGenerateSequence() {
    if (!selectedCompany?.company) return
    setLoadingSequence(true)
    setError('')
    try {
      const brief = researchResult?.brief || {
        what: (selectedCompany.tags || []).join(', '),
        why: '',
        colorado: '',
        university: '',
        angle: ''
      }
      const r = await fetch('/api/sequence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: selectedCompany.company,
          brief,
          signals,
          contactName,
          contactTitle,
          askType
        })
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Sequence generation failed')
      setSequence(data)
      setEditedEmails(data.emails || [])
      await updateCompanyStatus(selectedCompany.company, 'Draft ready')
    } catch (e) {
      setError(e.message)
    }
    setLoadingSequence(false)
  }

  function handleContactSelect(contact) {
    // Accept { name, title } from People tab — set BOTH fields before switching tab
    const name = typeof contact === 'string' ? contact : (contact?.name || '')
    const title = typeof contact === 'string' ? '' : (contact?.title || '')
    setContactName(String(name).trim())
    setContactTitle(String(title).trim())
    setActiveTab('sequence')
  }

  async function runBatch() {
    const lines = batchText.trim().split('\n').filter((l) => l.trim())
    if (lines.length === 0) {
      setBatchError('Paste at least one company name')
      return
    }
    const items = lines.map((line) => {
      const parts = line.split(',').map((p) => p.trim())
      return { company: parts[0], poc: parts[1] || '', pocRole: parts[2] || '', notes: parts[3] || '' }
    })
    setBatchLoading(true)
    setBatchError('')
    setBatchResults([])
    const allResults = []
    for (let i = 0; i < items.length; i++) {
      setBatchProgress(`Researching ${i + 1} of ${items.length}: ${items[i].company}…`)
      try {
        const r = await fetch('/api/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...items[i], skipHunter: true })
        })
        const data = await r.json()
        allResults.push({ company: items[i].company, ...data, success: !data.error })
      } catch (e) {
        allResults.push({ company: items[i].company, success: false, error: e.message })
      }
      setBatchResults([...allResults])
      if (i < items.length - 1) await new Promise((res) => setTimeout(res, 900))
    }
    setBatchProgress('')
    setBatchLoading(false)
    await loadCompanies(false)
  }

  if (isNarrow) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: colors.bg,
        padding: 24,
        textAlign: 'center'
      }}>
        <div style={{ fontSize: 15, color: colors.muted, maxWidth: 360, lineHeight: 1.6 }}>
          Outreach OS is designed for desktop. Please open on a larger screen.
        </div>
      </div>
    )
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      background: colors.bg,
      overflow: 'hidden',
      fontFamily: 'inherit'
    }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        input:focus, textarea:focus, select:focus {
          border-color: #2563eb !important;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
        }
        button:hover { opacity: 0.9; }
        button:disabled { opacity: 0.5; cursor: not-allowed; }
        * { box-sizing: border-box; }
      `}</style>

      <Sidebar
        filter={filter}
        onFilterChange={setFilter}
        onNewCompany={handleNewCompany}
        onBatchImport={handleBatchImport}
      />

      <CompanyList
        companies={companies}
        selectedCompany={selectedCompany}
        onSelect={handleSelectCompany}
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        loadingList={loadingList}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%' }}>
        {error && (
          <div style={{
            padding: '8px 16px',
            background: '#fef2f2',
            borderBottom: '0.5px solid #fecaca',
            color: '#dc2626',
            fontSize: 13,
            flexShrink: 0
          }}>
            {error}
            <button
              onClick={() => setError('')}
              style={{
                marginLeft: 12,
                border: 'none',
                background: 'transparent',
                color: '#dc2626',
                cursor: 'pointer',
                fontSize: 12
              }}
            >
              dismiss
            </button>
          </div>
        )}

        {showBatch ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: colors.surface }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: colors.text, marginBottom: 4 }}>
              Batch import
            </div>
            <p style={{ fontSize: 13, color: colors.muted, marginBottom: 16 }}>
              Research multiple companies at once. Format: Company Name, POC Name, POC Role, Notes
            </p>
            <label style={labelStyle}>Paste companies — one per line</label>
            <textarea
              style={{ ...inputStyle, minHeight: 160, resize: 'vertical', marginBottom: 12 }}
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              placeholder={`Agile Space Industries\nSeco Seals, Chris DeSandro`}
            />
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button style={btnPrimary} onClick={runBatch} disabled={batchLoading}>
                {batchLoading
                  ? 'Researching…'
                  : `Research ${batchText.trim().split('\n').filter((l) => l.trim()).length || 0} companies →`}
              </button>
              {batchResults.length > 0 && (
                <button style={btnSecondary} onClick={() => exportToCSV(batchResults)}>
                  Download CSV
                </button>
              )}
              <button style={btnSecondary} onClick={() => setShowBatch(false)}>
                Close
              </button>
            </div>
            {batchProgress && (
              <div style={{ fontSize: 13, color: colors.muted, marginBottom: 8 }}>{batchProgress}</div>
            )}
            {batchError && <div style={{ fontSize: 13, color: '#dc2626' }}>{batchError}</div>}
            {batchResults.map((r, i) =>
              r.success === false ? (
                <div key={i} style={{
                  border: `0.5px solid ${colors.border}`,
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 8,
                  color: '#dc2626',
                  fontSize: 14
                }}>
                  <strong>{toTitleCase(r.company)}</strong> — failed: {r.error}
                </div>
              ) : (
                <ResultCard key={i} data={r} company={r.company} />
              )
            )}
          </div>
        ) : showNewCompany || !selectedCompany ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: colors.surface }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: colors.text, marginBottom: 4 }}>
              + New company
            </div>
            <p style={{ fontSize: 13, color: colors.muted, marginBottom: 20 }}>
              Research a company and add it to your pipeline.
            </p>
            <div style={{ marginBottom: 12, maxWidth: 480 }}>
              <label style={labelStyle}>Company name *</label>
              <input
                style={inputStyle}
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                placeholder="e.g. Ursa Major"
                onKeyDown={(e) => e.key === 'Enter' && handleNewCompanySubmit()}
              />
            </div>
            <div style={{ marginBottom: 16, maxWidth: 480 }}>
              <label style={labelStyle}>Notes (optional)</label>
              <textarea
                style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Anything you already know…"
              />
            </div>
            <button
              style={btnPrimary}
              onClick={handleNewCompanySubmit}
              disabled={loadingResearch}
            >
              {loadingResearch ? 'Researching…' : 'Research company →'}
            </button>
            {loadingResearch && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 12,
                fontSize: 13,
                color: colors.muted
              }}>
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: colors.accent,
                  animation: 'pulse 1s infinite'
                }} />
                Searching web + generating brief (~20s)
              </div>
            )}
          </div>
        ) : (
          <CompanyDetail
            company={selectedCompany}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            researchResult={researchResult}
            loadingResearch={loadingResearch}
            onResearch={handleResearch}
            people={people}
            loadingPeople={loadingPeople}
            onFindPeople={handleFindPeople}
            onContactSelect={handleContactSelect}
            contactName={contactName}
            contactTitle={contactTitle}
            askType={askType}
            onContactNameChange={setContactName}
            onContactTitleChange={setContactTitle}
            onAskTypeChange={setAskType}
            signals={signals}
            loadingSignals={loadingSignals}
            onScanSignals={handleScanSignals}
            loadingSequence={loadingSequence}
            onGenerateSequence={handleGenerateSequence}
            sequence={sequence}
            editedEmails={editedEmails}
            onEmailsChange={setEditedEmails}
          />
        )}
      </div>
    </div>
  )
}
