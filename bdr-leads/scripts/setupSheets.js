/**
 * One-time Google Sheets setup for bdr-leads.
 * Usage: node -r ./scripts/loadEnv.js scripts/setupSheets.js
 *    or: node scripts/setupSheets.js  (loads env via ./loadEnv)
 */
require('./loadEnv')
const { google } = require('googleapis')
const { runSetup } = require('../lib/setupSheets')

const SHEET_ID = '1X8JsRyRtekCqPFroUei-FACRU6ySAkis3IN-3WqlVgk'

function getClient() {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  })
  return google.sheets({ version: 'v4', auth })
}

function wrapRequest(sheetId, colIndex) {
  return {
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 1,
        startColumnIndex: colIndex,
        endColumnIndex: colIndex + 1
      },
      cell: {
        userEnteredFormat: {
          wrapStrategy: 'WRAP'
        }
      },
      fields: 'userEnteredFormat.wrapStrategy'
    }
  }
}

async function applyWrapFormatting() {
  const sheets = getClient()
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID })
  const byTitle = {}
  for (const s of meta.data.sheets || []) {
    byTitle[s.properties.title] = s.properties.sheetId
  }

  const companiesSheetId = byTitle.Companies
  const contactsSheetId = byTitle.Contacts
  const signalsSheetId = byTitle.Signals
  const sequencesSheetId = byTitle.Sequences

  if (
    companiesSheetId === undefined ||
    contactsSheetId === undefined ||
    signalsSheetId === undefined ||
    sequencesSheetId === undefined
  ) {
    throw new Error('Missing required tabs for wrap formatting')
  }

  const requests = [
    // Sequences: Body 1, Body 2, Body 3, Reply Notes
    wrapRequest(sequencesSheetId, 6),
    wrapRequest(sequencesSheetId, 10),
    wrapRequest(sequencesSheetId, 14),
    wrapRequest(sequencesSheetId, 17),
    // Companies: What they do, Why BDR, Colorado, University, Notes
    wrapRequest(companiesSheetId, 5),
    wrapRequest(companiesSheetId, 6),
    wrapRequest(companiesSheetId, 7),
    wrapRequest(companiesSheetId, 8),
    wrapRequest(companiesSheetId, 12),
    // Contacts: Snippet, CU Connection
    wrapRequest(contactsSheetId, 7),
    wrapRequest(contactsSheetId, 8),
    // Signals: Signal Text
    wrapRequest(signalsSheetId, 1)
  ]

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { requests }
  })
  console.log('✓ Wrap formatting applied')
}

runSetup()
  .then(() => applyWrapFormatting())
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
