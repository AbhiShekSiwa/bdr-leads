const { google } = require('googleapis')

const SHEET_ID = '1X8JsRyRtekCqPFroUei-FACRU6ySAkis3IN-3WqlVgk'
const SHEET_NAME = 'Sheet1'
const COLS = ['Company', 'Warmth', 'POC Name', 'Position', 'Email Pattern', 'POC Email', 'LinkedIn', 'Tags', 'Status', 'Notes', 'Date Added']

function getClient() {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  })
  return google.sheets({ version: 'v4', auth })
}

async function getRows() {
  const sheets = getClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A:K`
  })
  return res.data.values || []
}

async function findEmailPattern(company) {
  const rows = await getRows()
  const match = rows.find(r =>
    r[0]?.toLowerCase().trim() === company.toLowerCase().trim() && r[4]?.trim()
  )
  return match ? match[4] : null
}

async function appendRow(data) {
  const sheets = getClient()
  
  // Check if sheet is empty first
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A1:A2`
  })
  const rows = existing.data.values || []
  
  // Write headers if sheet is empty
  if (rows.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A1:K1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [COLS] }
    })
  }

  // Now append the data row
  const row = [
    data.company || '',
    data.warmth || '',
    data.pocName || '',
    data.position || '',
    data.emailPattern || '',
    data.pocEmail || '',
    data.linkedIn ? `=HYPERLINK("${data.linkedIn.split(',')[0].trim()}","View Profile")` : '',
    (data.tags || []).join(', '),
    'Not contacted',
    data.notes || '',
    new Date().toLocaleDateString('en-US')
  ]
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A:K`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] }
  })
}

async function listCompanies() {
  const rows = await getRows()
  // Empty sheet or header-only → []
  if (!rows.length || rows.length === 1) return []

  return rows.slice(1)
    .filter((row) => (row[0] || '').trim())
    .map((row) => ({
      company: row[0] || '',
      warmth: row[1] || '',
      pocName: row[2] || '',
      position: row[3] || '',
      emailPattern: row[4] || '',
      pocEmail: row[5] || '',
      // Column G may be a =HYPERLINK("url","View Profile") formula — UI should parse or skip
      linkedIn: row[6] || '',
      // Empty tags cell → [] (not ['']) via filter(Boolean)
      tags: row[7] ? row[7].split(',').map((t) => t.trim()).filter(Boolean) : [],
      status: row[8] || 'Not contacted',
      notes: row[9] || '',
      dateAdded: row[10] || ''
    }))
}

async function updateStatus(company, newStatus) {
  // Valid statuses (not enforced): 'Not contacted' | 'Researching' | 'Draft ready' | 'Sent' | 'Replied' | 'Pass'
  const sheets = getClient()
  const rows = await getRows()

  // First match only if duplicates exist (safer/simpler than last-match)
  const index = rows.findIndex((r) =>
    r[0]?.toLowerCase().trim() === company.toLowerCase().trim()
  )
  if (index === -1) return null
  // Skip accidental header match
  if (index === 0 && rows[0]?.[0]?.toLowerCase().trim() === 'company') return null

  const rowNumber = index + 1 // array index 0 = sheet row 1
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!I${rowNumber}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[newStatus]] }
  })
  return newStatus
}

module.exports = { findEmailPattern, appendRow, listCompanies, updateStatus }
