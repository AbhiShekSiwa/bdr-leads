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
  const row = [
    data.company || '',
    data.warmth || '',
    data.pocName || '',
    data.position || '',
    data.emailPattern || '',
    data.pocEmail || '',
    data.linkedIn || '',
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
  
  // Write headers if first row is empty
  const rows = await getRows()
  if (rows.length === 1) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A1:K1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [COLS] }
    })
  }
}

module.exports = { findEmailPattern, appendRow }
