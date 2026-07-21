const { google } = require('googleapis')

const SHEET_ID = '1X8JsRyRtekCqPFroUei-FACRU6ySAkis3IN-3WqlVgk'

const TABS = {
  companies: 'Companies',
  contacts: 'Contacts',
  signals: 'Signals',
  sequences: 'Sequences',
  meta: 'Meta'
}

const COMPANY_COLS = {
  company: 0, warmth: 1, status: 2, score: 3, tags: 4,
  what: 5, whyBdr: 6, colorado: 7, university: 8,
  emailDomain: 9, emailPattern: 10, linkedIn: 11,
  notes: 12, lastResearched: 13, dateAdded: 14
}

const sheetIdCache = {}

function getClient() {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  })
  return google.sheets({ version: 'v4', auth })
}

function safeParseJSON(str, fallback) {
  try {
    return JSON.parse(str)
  } catch {
    return fallback
  }
}

/** First http(s) URL from a cell or comma-separated list */
function firstUrl(value) {
  if (!value) return ''
  const s = String(value).trim()
  if (s.toUpperCase().startsWith('=HYPERLINK')) {
    const m = s.match(/"([^"]+)"/)
    return m ? m[1].trim() : ''
  }
  const candidate = s.split(',')[0].trim()
  if (/^https?:\/\//i.test(candidate)) return candidate
  if (/linkedin\.com/i.test(candidate)) {
    return candidate.startsWith('http') ? candidate : `https://${candidate.replace(/^\/\//, '')}`
  }
  return ''
}

/** Sheet-friendly clickable link. Use with valueInputOption USER_ENTERED. */
function asHyperlink(urlOrCell, label = 'Open LinkedIn') {
  const url = firstUrl(urlOrCell)
  if (!url) return ''
  const safeUrl = url.replace(/"/g, '""')
  const safeLabel = String(label).replace(/"/g, '""')
  return `=HYPERLINK("${safeUrl}","${safeLabel}")`
}

/** Extract URL from HYPERLINK formula or plain URL (for API/UI reads) */
function fromHyperlink(cell) {
  return firstUrl(cell)
}

async function getSheetId(sheets, tabName) {
  if (sheetIdCache[tabName] !== undefined) return sheetIdCache[tabName]
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID })
  for (const s of meta.data.sheets || []) {
    sheetIdCache[s.properties.title] = s.properties.sheetId
  }
  if (sheetIdCache[tabName] === undefined) {
    throw new Error(`Sheet tab not found: ${tabName}`)
  }
  return sheetIdCache[tabName]
}

async function findRowIndex(sheets, tab, company) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${tab}!A:A`
  })
  const rows = res.data.values || []
  const target = company.toLowerCase().trim()
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][0] || '').toLowerCase().trim() === target) {
      return i + 1 // 1-based sheet row
    }
  }
  return null
}

async function deleteCompanyRows(sheets, sheetId, tab, company) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${tab}!A:A`
  })
  const rows = res.data.values || []
  const target = company.toLowerCase().trim()
  const indices = []
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][0] || '').toLowerCase().trim() === target) {
      indices.push(i) // 0-based row index in sheet grid
    }
  }
  // Delete bottom-up so indices don't shift
  indices.sort((a, b) => b - a)
  for (const idx of indices) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: idx,
              endIndex: idx + 1
            }
          }
        }]
      }
    })
  }
  return indices.length
}

function parseNameParts(fullName) {
  const cleaned = String(fullName || '')
    .replace(/,.*$/, '') // drop ", PhD" etc.
    .trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: '', lastName: '' }
  const firstName = parts[0].replace(/[^a-zA-Z'-]/g, '')
  let lastName = parts.length > 1 ? parts[parts.length - 1].replace(/[^a-zA-Z'-]/g, '') : ''
  // Skip single initials like "C."
  if (lastName.length <= 1) lastName = ''
  return { firstName, lastName }
}

function applyEmailPattern(pattern, domain, firstName, lastName) {
  if (!pattern || !domain || !firstName || !lastName) return null
  const emailLocal = pattern
    .replace(/\{first\}/gi, firstName.toLowerCase())
    .replace(/\{last\}/gi, lastName.toLowerCase())
    .replace(/\{f\}/gi, firstName[0].toLowerCase())
    .replace(/\{l\}/gi, lastName[0].toLowerCase())
  if (!emailLocal || emailLocal.includes('{')) return null
  return `${emailLocal}@${domain}`
}

// ─── Companies ───

async function listCompanies() {
  const sheets = getClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TABS.companies}!A:O`,
    valueRenderOption: 'FORMULA'
  })
  const rows = res.data.values || []
  if (rows.length <= 1) return []
  return rows.slice(1)
    .filter((r) => (r[0] || '').trim())
    .map((r) => ({
      company: r[0] || '',
      warmth: (r[1] || '').toLowerCase(),
      status: r[2] || 'Not contacted',
      score: r[3] ? Number(r[3]) : 0,
      tags: r[4] ? String(r[4]).split(',').map((t) => t.trim()).filter(Boolean) : [],
      what: r[5] || '',
      whyBdr: r[6] || '',
      colorado: r[7] || '',
      university: r[8] || '',
      emailDomain: r[9] || '',
      emailPattern: r[10] || '',
      linkedIn: fromHyperlink(r[11]),
      notes: r[12] || '',
      lastResearched: r[13] || '',
      dateAdded: r[14] || '',
      // UI compat aliases
      pocName: '',
      position: '',
      pocEmail: ''
    }))
}

async function appendCompany(data) {
  const sheets = getClient()
  const row = [
    data.company || '',
    data.warmth || '',
    data.status || 'Not contacted',
    data.score != null ? String(data.score) : '',
    Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || ''),
    data.what || '',
    data.whyBdr || '',
    data.colorado || '',
    data.university || '',
    data.emailDomain || '',
    data.emailPattern || '',
    asHyperlink(data.linkedIn),
    data.notes || '',
    data.lastResearched || new Date().toISOString(),
    data.dateAdded || new Date().toLocaleDateString('en-US')
  ]
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${TABS.companies}!A:O`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] }
  })
}

async function updateCompany(company, fields) {
  // Read-then-write — concurrent races possible; acceptable for single-user tool
  const sheets = getClient()
  const rowNum = await findRowIndex(sheets, TABS.companies, company)
  if (!rowNum) {
    await appendCompany({ company, ...fields })
    return
  }
  const data = []
  for (const [key, value] of Object.entries(fields || {})) {
    const col = COMPANY_COLS[key]
    if (col === undefined) continue
    const colLetter = String.fromCharCode(65 + col) // A-O only (cols 0-14)
    let cellVal = value
    if (key === 'tags' && Array.isArray(value)) cellVal = value.join(', ')
    if (key === 'linkedIn') cellVal = asHyperlink(value)
    if (cellVal == null) cellVal = ''
    data.push({
      range: `${TABS.companies}!${colLetter}${rowNum}`,
      values: [[String(cellVal)]]
    })
  }
  if (data.length === 0) return
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data
    }
  })
}

async function convertLinkedInColumns() {
  const sheets = getClient()
  const updates = []

  // Companies LinkedIn = column L (index 11)
  const co = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TABS.companies}!L:L`,
    valueRenderOption: 'FORMULA'
  })
  ;(co.data.values || []).forEach((row, i) => {
    if (i === 0) return // header
    const raw = row[0] || ''
    if (!raw || String(raw).toUpperCase().startsWith('=HYPERLINK')) return
    const formula = asHyperlink(raw)
    if (!formula) return
    updates.push({ range: `${TABS.companies}!L${i + 1}`, values: [[formula]] })
  })

  // Contacts LinkedIn URL = column D (index 3)
  const ct = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TABS.contacts}!D:D`,
    valueRenderOption: 'FORMULA'
  })
  ;(ct.data.values || []).forEach((row, i) => {
    if (i === 0) return
    const raw = row[0] || ''
    if (!raw || String(raw).toUpperCase().startsWith('=HYPERLINK')) return
    const formula = asHyperlink(raw)
    if (!formula) return
    updates.push({ range: `${TABS.contacts}!D${i + 1}`, values: [[formula]] })
  })

  if (updates.length === 0) return 0
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: updates
    }
  })
  return updates.length
}

async function updateCompanyStatus(company, status) {
  await updateCompany(company, { status })
}

async function saveResearch(company, brief, warmth, tags, score) {
  await updateCompany(company, {
    warmth: warmth || brief?.warmth || '',
    status: 'Researching',
    score: score != null ? score : '',
    tags: tags || brief?.tags || [],
    what: brief?.what || '',
    whyBdr: brief?.why || '',
    colorado: brief?.colorado || '',
    university: brief?.university || '',
    lastResearched: new Date().toISOString()
  })
}

async function cascadeEmailPattern(company, domain, pattern) {
  const sheets = getClient()
  const contacts = await getContacts(company)
  let count = 0
  for (const c of contacts) {
    if ((c.email || '').trim()) continue
    const { firstName, lastName } = parseNameParts(c.name)
    if (!firstName || !lastName) continue
    const email = applyEmailPattern(pattern, domain, firstName, lastName)
    if (!email) continue
    const ok = await updateContactEmail(company, c.name, email, 50, 'pattern-constructed')
    if (ok) count++
  }
  return count
}

async function saveHunterDomain(company, domain, pattern) {
  await updateCompany(company, { emailDomain: domain || '', emailPattern: pattern || '' })
  return cascadeEmailPattern(company, domain, pattern)
}

// ─── Contacts ───

async function saveContacts(company, people) {
  try {
    const sheets = getClient()
    const sheetId = await getSheetId(sheets, TABS.contacts)
    await deleteCompanyRows(sheets, sheetId, TABS.contacts, company)
    if (!people || people.length === 0) return
    const rows = people.map((p) => [
      company,
      p.name || '',
      p.title || '',
      asHyperlink(p.url || p.linkedInUrl),
      p.email || '',
      p.emailConfidence != null ? String(p.emailConfidence) : '',
      p.emailSource || '',
      p.snippet || '',
      p.cuConnection || '',
      'Not contacted',
      new Date().toISOString()
    ])
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${TABS.contacts}!A:K`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rows }
    })
  } catch (e) {
    console.error('saveContacts failed:', e.message)
  }
}

async function getContacts(company) {
  const sheets = getClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TABS.contacts}!A:K`,
    valueRenderOption: 'FORMULA'
  })
  const rows = res.data.values || []
  if (rows.length <= 1) return []
  const target = company.toLowerCase().trim()
  return rows.slice(1)
    .filter((r) => (r[0] || '').toLowerCase().trim() === target)
    .map((r) => ({
      company: r[0] || '',
      name: r[1] || '',
      title: r[2] || '',
      linkedInUrl: fromHyperlink(r[3]),
      url: fromHyperlink(r[3]),
      email: r[4] || '',
      emailConfidence: r[5] ? Number(r[5]) : null,
      emailSource: r[6] || '',
      snippet: r[7] || '',
      cuConnection: r[8] || '',
      outreachStatus: r[9] || 'Not contacted',
      foundAt: r[10] || ''
    }))
}

async function updateContactEmail(company, name, email, confidence, source) {
  const sheets = getClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TABS.contacts}!A:B`
  })
  const rows = res.data.values || []
  const cTarget = company.toLowerCase().trim()
  const nTarget = name.toLowerCase().trim()
  let rowNum = null
  for (let i = 1; i < rows.length; i++) {
    if (
      (rows[i][0] || '').toLowerCase().trim() === cTarget &&
      (rows[i][1] || '').toLowerCase().trim() === nTarget
    ) {
      rowNum = i + 1
      break
    }
  }
  if (!rowNum) return false
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: 'RAW',
      data: [
        { range: `${TABS.contacts}!E${rowNum}`, values: [[email || '']] },
        { range: `${TABS.contacts}!F${rowNum}`, values: [[confidence != null ? String(confidence) : '']] },
        { range: `${TABS.contacts}!G${rowNum}`, values: [[source || '']] }
      ]
    }
  })
  return true
}

async function updateContactStatus(company, name, status) {
  const sheets = getClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TABS.contacts}!A:B`
  })
  const rows = res.data.values || []
  const cTarget = company.toLowerCase().trim()
  const nTarget = name.toLowerCase().trim()
  let rowNum = null
  for (let i = 1; i < rows.length; i++) {
    if (
      (rows[i][0] || '').toLowerCase().trim() === cTarget &&
      (rows[i][1] || '').toLowerCase().trim() === nTarget
    ) {
      rowNum = i + 1
      break
    }
  }
  if (!rowNum) return false
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${TABS.contacts}!J${rowNum}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[status]] }
  })
  return true
}

// ─── Signals ───

async function saveSignals(company, signals) {
  try {
    const sheets = getClient()
    const sheetId = await getSheetId(sheets, TABS.signals)
    await deleteCompanyRows(sheets, sheetId, TABS.signals, company)
    if (!signals || signals.length === 0) return
    const rows = signals.map((s) => [
      company,
      s.text || '',
      s.source || '',
      s.recency || '',
      'No',
      new Date().toISOString()
    ])
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${TABS.signals}!A:F`,
      valueInputOption: 'RAW',
      requestBody: { values: rows }
    })
  } catch (e) {
    console.error('saveSignals failed:', e.message)
  }
}

async function getSignals(company) {
  const sheets = getClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TABS.signals}!A:F`
  })
  const rows = res.data.values || []
  if (rows.length <= 1) return []
  const target = company.toLowerCase().trim()
  return rows.slice(1)
    .filter((r) => (r[0] || '').toLowerCase().trim() === target)
    .map((r) => ({
      company: r[0] || '',
      text: r[1] || '',
      source: r[2] || '',
      recency: r[3] || '',
      usedInSequence: r[4] || 'No',
      foundAt: r[5] || ''
    }))
}

// ─── Sequences ───

async function saveSequence(data) {
  try {
    const sheets = getClient()
    const emails = Array.isArray(data.emails) ? data.emails : []
    const row = [
      data.company || '',
      data.contactName || '',
      data.contactEmail || '',
      data.askType || '',
      new Date().toISOString(),
      emails[0]?.subject || '', emails[0]?.body || '', 'Not sent', '',
      emails[1]?.subject || '', emails[1]?.body || '', 'Not sent', '',
      emails[2]?.subject || '', emails[2]?.body || '', 'Not sent', '',
      'No reply', '', ''
    ]
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${TABS.sequences}!A:T`,
      valueInputOption: 'RAW',
      requestBody: { values: [row] }
    })
    return true
  } catch (e) {
    console.error('saveSequence failed:', e.message)
    return false
  }
}

async function getSequences(company) {
  try {
    const sheets = getClient()
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${TABS.sequences}!A:T`
    })
    const rows = res.data.values || []
    if (rows.length <= 1) return []
    const target = company.toLowerCase().trim()
    const matches = rows.slice(1)
      .filter((r) => (r[0] || '').toLowerCase().trim() === target)
      .map((r) => ({
        company: r[0] || '',
        contactName: r[1] || '',
        contactEmail: r[2] || '',
        askType: r[3] || '',
        generatedAt: r[4] || '',
        emails: [
          { step: 1, day: 0, subject: r[5] || '', body: r[6] || '', status: r[7] || 'Not sent', sentAt: r[8] || '' },
          { step: 2, day: 3, subject: r[9] || '', body: r[10] || '', status: r[11] || 'Not sent', sentAt: r[12] || '' },
          { step: 3, day: 7, subject: r[13] || '', body: r[14] || '', status: r[15] || 'Not sent', sentAt: r[16] || '' }
        ],
        replyReceived: r[17] || 'No reply',
        replyNotes: r[18] || '',
        replyAt: r[19] || ''
      }))
    return matches.reverse()
  } catch (e) {
    console.error('getSequences failed:', e.message)
    return []
  }
}

async function updateEmailStatus(company, contactName, emailStep, status) {
  const sheets = getClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TABS.sequences}!A:B`
  })
  const rows = res.data.values || []
  const cTarget = company.toLowerCase().trim()
  const nTarget = (contactName || '').toLowerCase().trim()
  let rowNum = null
  // Prefer newest match (last in sheet)
  for (let i = 1; i < rows.length; i++) {
    if (
      (rows[i][0] || '').toLowerCase().trim() === cTarget &&
      (rows[i][1] || '').toLowerCase().trim() === nTarget
    ) {
      rowNum = i + 1
    }
  }
  if (!rowNum) return false
  const statusCol = { 1: 'H', 2: 'L', 3: 'P' }[emailStep]
  const sentCol = { 1: 'I', 2: 'M', 3: 'Q' }[emailStep]
  if (!statusCol) return false
  const data = [
    { range: `${TABS.sequences}!${statusCol}${rowNum}`, values: [[status]] }
  ]
  if (status === 'Sent' && sentCol) {
    data.push({
      range: `${TABS.sequences}!${sentCol}${rowNum}`,
      values: [[new Date().toISOString()]]
    })
  }
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { valueInputOption: 'RAW', data }
  })
  return true
}

async function updateReply(company, contactName, replyStatus, notes) {
  const sheets = getClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${TABS.sequences}!A:B`
  })
  const rows = res.data.values || []
  const cTarget = company.toLowerCase().trim()
  const nTarget = (contactName || '').toLowerCase().trim()
  let rowNum = null
  for (let i = 1; i < rows.length; i++) {
    if (
      (rows[i][0] || '').toLowerCase().trim() === cTarget &&
      (rows[i][1] || '').toLowerCase().trim() === nTarget
    ) {
      rowNum = i + 1
    }
  }
  if (!rowNum) return false
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: {
      valueInputOption: 'RAW',
      data: [
        { range: `${TABS.sequences}!R${rowNum}`, values: [[replyStatus || '']] },
        { range: `${TABS.sequences}!S${rowNum}`, values: [[notes || '']] },
        { range: `${TABS.sequences}!T${rowNum}`, values: [[new Date().toISOString()]] }
      ]
    }
  })
  await updateCompanyStatus(company, 'Replied')
  return true
}

// ─── Meta ───

async function getCredits() {
  try {
    const sheets = getClient()
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${TABS.meta}!A:D`
    })
    const rows = res.data.values || []
    const defaults = {
      serper: { used: 0, limit: 2500, resetAt: '' },
      gemini: { used: 0, limit: 1500, resetAt: '' },
      hunter: { used: 0, limit: 50, resetAt: '' }
    }
    for (const r of rows.slice(1)) {
      const key = (r[0] || '').trim()
      const used = Number(r[1]) || 0
      const limit = Number(r[2]) || 0
      const resetAt = r[3] || ''
      if (key === 'serper_used') defaults.serper = { used, limit: limit || 2500, resetAt }
      if (key === 'gemini_used') defaults.gemini = { used, limit: limit || 1500, resetAt }
      if (key === 'hunter_used') defaults.hunter = { used, limit: limit || 50, resetAt }
    }
    return defaults
  } catch (e) {
    console.error('getCredits failed:', e.message)
    return {
      serper: { used: 0, limit: 2500, resetAt: '' },
      gemini: { used: 0, limit: 1500, resetAt: '' },
      hunter: { used: 0, limit: 50, resetAt: '' }
    }
  }
}

async function incrementCounter(key) {
  try {
    const sheets = getClient()
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${TABS.meta}!A:B`
    })
    const rows = res.data.values || []
    for (let i = 1; i < rows.length; i++) {
      if ((rows[i][0] || '').trim() === key) {
        const current = Number(rows[i][1]) || 0
        await sheets.spreadsheets.values.update({
          spreadsheetId: SHEET_ID,
          range: `${TABS.meta}!B${i + 1}`,
          valueInputOption: 'RAW',
          requestBody: { values: [[String(current + 1)]] }
        })
        return
      }
    }
  } catch (e) {
    console.error('incrementCounter failed:', e.message)
  }
}

async function resetCounter(key) {
  try {
    const sheets = getClient()
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${TABS.meta}!A:D`
    })
    const rows = res.data.values || []
    for (let i = 1; i < rows.length; i++) {
      if ((rows[i][0] || '').trim() === key) {
        await sheets.spreadsheets.values.batchUpdate({
          spreadsheetId: SHEET_ID,
          requestBody: {
            valueInputOption: 'RAW',
            data: [
              { range: `${TABS.meta}!B${i + 1}`, values: [['0']] },
              { range: `${TABS.meta}!D${i + 1}`, values: [[new Date().toISOString()]] }
            ]
          }
        })
        return
      }
    }
  } catch (e) {
    console.error('resetCounter failed:', e.message)
  }
}

// Legacy aliases used by older research.js paths
async function findEmailPattern(company) {
  const companies = await listCompanies()
  const match = companies.find(
    (c) => c.company.toLowerCase().trim() === company.toLowerCase().trim() && c.emailPattern
  )
  return match ? match.emailPattern : null
}

module.exports = {
  getClient,
  safeParseJSON,
  listCompanies,
  appendCompany,
  updateCompany,
  updateCompanyStatus,
  saveResearch,
  saveHunterDomain,
  cascadeEmailPattern,
  saveContacts,
  getContacts,
  updateContactEmail,
  updateContactStatus,
  saveSignals,
  getSignals,
  saveSequence,
  getSequences,
  updateEmailStatus,
  updateReply,
  getCredits,
  incrementCounter,
  resetCounter,
  findEmailPattern,
  convertLinkedInColumns,
  // legacy name used by status.js before rename
  updateStatus: updateCompanyStatus
}
