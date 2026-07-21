const { google } = require('googleapis')

const SHEET_ID = '1X8JsRyRtekCqPFroUei-FACRU6ySAkis3IN-3WqlVgk'
const SEQ_TAB = 'Sheet2'
const SEQ_COLS = [
  'Company', 'ContactName', 'ContactTitle',
  'AskType', 'GeneratedAt',
  'Subject1', 'Body1',
  'Subject2', 'Body2',
  'Subject3', 'Body3'
]

function getClient() {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  })
  return google.sheets({ version: 'v4', auth })
}

function isSheet2Missing(err) {
  const msg = err?.message || String(err)
  return /Unable to parse range|Unable to parse|not found|Sheet2/i.test(msg)
}

async function saveSequence(data) {
  try {
    const sheets = getClient()

    // Ensure header exists
    let headerRes
    try {
      headerRes = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${SEQ_TAB}!A1:A1`
      })
    } catch (err) {
      if (isSheet2Missing(err)) {
        console.error('Sheet2 tab not found — create it in your Google Sheet')
        return false
      }
      throw err
    }

    const headerRows = headerRes.data.values || []
    if (headerRows.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `${SEQ_TAB}!A1:K1`,
        valueInputOption: 'RAW',
        requestBody: { values: [SEQ_COLS] }
      })
    }

    const emails = Array.isArray(data.emails) ? data.emails : []
    const row = [
      data.company || '',
      data.contactName || '',
      data.contactTitle || '',
      data.askType || '',
      new Date().toISOString(),
      emails[0]?.subject || '',
      emails[0]?.body || '',
      emails[1]?.subject || '',
      emails[1]?.body || '',
      emails[2]?.subject || '',
      emails[2]?.body || ''
    ]

    // RAW so leading "=" in body text is not treated as a formula
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SEQ_TAB}!A:K`,
      valueInputOption: 'RAW',
      requestBody: { values: [row] }
    })
    return true
  } catch (err) {
    if (isSheet2Missing(err)) {
      console.error('Sheet2 tab not found — create it in your Google Sheet')
    } else {
      console.error('History save failed:', err.message || err)
    }
    return false
  }
}

async function getHistory(company) {
  try {
    if (!company || typeof company !== 'string') return []
    const sheets = getClient()

    let res
    try {
      res = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${SEQ_TAB}!A:K`
      })
    } catch (err) {
      if (isSheet2Missing(err)) {
        console.error('Sheet2 tab not found — create it in your Google Sheet')
        return []
      }
      throw err
    }

    const rows = res.data.values || []
    if (rows.length <= 1) return []

    const target = company.toLowerCase().trim()
    const matches = rows.slice(1)
      .filter((row) => (row[0] || '').toLowerCase().trim() === target)
      .map((row) => ({
        company: row[0] || '',
        contactName: row[1] || '',
        contactTitle: row[2] || '',
        askType: row[3] || '',
        generatedAt: row[4] || '',
        emails: [
          { step: 1, day: 0, subject: row[5] || '', body: row[6] || '' },
          { step: 2, day: 3, subject: row[7] || '', body: row[8] || '' },
          { step: 3, day: 7, subject: row[9] || '', body: row[10] || '' }
        ]
      }))

    // Sheet appends at bottom → reverse for newest first
    return matches.reverse()
  } catch (err) {
    console.error('History load failed:', err.message || err)
    return []
  }
}

module.exports = { saveSequence, getHistory }
