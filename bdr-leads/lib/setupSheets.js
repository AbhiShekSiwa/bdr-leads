/**
 * One-time Google Sheets setup for bdr-leads.
 * Usage: GOOGLE_SERVICE_ACCOUNT_JSON=... node scripts/setupSheets.js
 * Or: node -r ./scripts/loadEnv.js scripts/setupSheets.js
 */
const { google } = require('googleapis')

const SHEET_ID = '1X8JsRyRtekCqPFroUei-FACRU6ySAkis3IN-3WqlVgk'

const TABS = {
  Companies: {
    headers: [
      'Company', 'Warmth', 'Status', 'Score', 'Tags', 'What they do',
      'Why BDR', 'Colorado', 'University', 'Email Domain', 'Email Pattern',
      'LinkedIn', 'Notes', 'Last Researched', 'Date Added'
    ],
    color: { red: 0.18, green: 0.49, blue: 0.20 },
    light: { red: 0.90, green: 0.96, blue: 0.90 },
    widths: [180, 80, 120, 60, 200, 250, 250, 150, 150, 120, 120, 200, 200, 130, 110]
  },
  Contacts: {
    headers: [
      'Company', 'Name', 'Title', 'LinkedIn URL', 'Email', 'Email Confidence',
      'Email Source', 'Snippet', 'CU Connection', 'Outreach Status', 'Found At'
    ],
    color: { red: 0.10, green: 0.46, blue: 0.82 },
    light: { red: 0.90, green: 0.94, blue: 0.99 },
    widths: [180, 150, 200, 220, 180, 80, 130, 250, 150, 130, 110]
  },
  Signals: {
    headers: [
      'Company', 'Signal Text', 'Source', 'Recency', 'Used In Sequence', 'Found At'
    ],
    color: { red: 0.48, green: 0.18, blue: 0.65 },
    light: { red: 0.95, green: 0.90, blue: 0.99 },
    widths: [180, 350, 130, 120, 120, 110]
  },
  Sequences: {
    headers: [
      'Company', 'Contact Name', 'Contact Email', 'Ask Type', 'Generated At',
      'Subject 1', 'Body 1', 'Email 1 Status', 'Email 1 Sent At',
      'Subject 2', 'Body 2', 'Email 2 Status', 'Email 2 Sent At',
      'Subject 3', 'Body 3', 'Email 3 Status', 'Email 3 Sent At',
      'Reply Received', 'Reply Notes', 'Reply At'
    ],
    color: { red: 0.90, green: 0.49, blue: 0.13 },
    light: { red: 0.99, green: 0.95, blue: 0.88 },
    widths: [
      180, 150, 180, 250, 130,
      200, 300, 100, 130,
      200, 300, 100, 130,
      200, 300, 100, 130,
      120, 250, 110
    ]
  },
  Meta: {
    headers: ['Key', 'Value', 'Limit', 'Reset At'],
    color: { red: 0.42, green: 0.42, blue: 0.42 },
    light: { red: 0.95, green: 0.95, blue: 0.95 },
    widths: [160, 80, 80, 130]
  }
}

function getClient() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not set')
  const creds = JSON.parse(raw)
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  })
  return google.sheets({ version: 'v4', auth })
}

function listRule(values, strict = true) {
  return {
    condition: {
      type: 'ONE_OF_LIST',
      values: values.map((v) => ({ userEnteredValue: v }))
    },
    showCustomUi: true,
    strict
  }
}

function validationReq(sheetId, colIndex, values, strict = true) {
  return {
    setDataValidation: {
      range: {
        sheetId,
        startRowIndex: 1,
        endRowIndex: 1000,
        startColumnIndex: colIndex,
        endColumnIndex: colIndex + 1
      },
      rule: listRule(values, strict)
    }
  }
}

function widthReqs(sheetId, widths) {
  return widths.map((px, i) => ({
    updateDimensionProperties: {
      range: {
        sheetId,
        dimension: 'COLUMNS',
        startIndex: i,
        endIndex: i + 1
      },
      properties: { pixelSize: px },
      fields: 'pixelSize'
    }
  }))
}

async function configureTab(sheets, sheetId, name, cfg, log = console.log) {
  // Headers
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `${name}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [cfg.headers] }
  })

  const requests = [
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: { frozenRowCount: 1 }
        },
        fields: 'gridProperties.frozenRowCount'
      }
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
        cell: {
          userEnteredFormat: {
            backgroundColor: cfg.color,
            textFormat: {
              bold: true,
              foregroundColor: { red: 1, green: 1, blue: 1 }
            },
            verticalAlignment: 'MIDDLE'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment)'
      }
    },
    ...widthReqs(sheetId, cfg.widths)
  ]

  // Dropdowns
  if (name === 'Companies') {
    requests.push(validationReq(sheetId, 1, ['Hot', 'Warm', 'Cold'], true))
    requests.push(validationReq(sheetId, 2, [
      'Not contacted', 'Researching', 'Draft ready', 'Sent', 'Replied', 'Pass'
    ], true))
    // Warmth conditional formatting (dropdown option colors not supported via ONE_OF_LIST)
    const warmthColors = {
      Hot: { red: 0.918, green: 0.263, blue: 0.208 },
      Warm: { red: 0.984, green: 0.737, blue: 0.016 },
      Cold: { red: 0.604, green: 0.627, blue: 0.651 }
    }
    for (const [val, color] of Object.entries(warmthColors)) {
      requests.push({
        addConditionalFormatRule: {
          rule: {
            ranges: [{
              sheetId,
              startRowIndex: 1,
              endRowIndex: 1000,
              startColumnIndex: 1,
              endColumnIndex: 2
            }],
            booleanRule: {
              condition: {
                type: 'TEXT_EQ',
                values: [{ userEnteredValue: val }]
              },
              format: { backgroundColor: color }
            }
          },
          index: 0
        }
      })
    }
  }
  if (name === 'Contacts') {
    requests.push(validationReq(sheetId, 6, [
      'hunter-verified', 'pattern-constructed', 'manual'
    ], false))
    requests.push(validationReq(sheetId, 9, [
      'Not contacted', 'Emailed', 'Replied', 'Meeting booked', 'Pass'
    ], true))
  }
  if (name === 'Signals') {
    requests.push(validationReq(sheetId, 4, ['No', 'Yes'], true))
  }
  if (name === 'Sequences') {
    const emailStatuses = ['Not sent', 'Sent', 'Opened', 'Replied', 'Bounced']
    requests.push(validationReq(sheetId, 7, emailStatuses, true))
    requests.push(validationReq(sheetId, 11, emailStatuses, true))
    requests.push(validationReq(sheetId, 15, emailStatuses, true))
    requests.push(validationReq(sheetId, 17, [
      'No reply', 'Positive', 'Negative', 'Need more info', 'Meeting booked'
    ], true))
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { requests }
  })

  // Banding separately — re-run may fail if already present
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [{
          addBanding: {
            bandedRange: {
              range: { sheetId, startRowIndex: 1 },
              rowProperties: {
                headerColor: cfg.color,
                firstBandColor: { red: 1, green: 1, blue: 1 },
                secondBandColor: cfg.light
              }
            }
          }
        }]
      }
    })
  } catch (e) {
    log(`  Banding already exists on ${name}, skipping`)
  }

  log(`✓ ${name} configured`)
}

async function runSetup() {
  const sheets = getClient()
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID })
  const byTitle = {}
  for (const s of meta.data.sheets || []) {
    byTitle[s.properties.title] = s.properties.sheetId
  }

  for (const name of Object.keys(TABS)) {
    if (byTitle[name] === undefined) {
      throw new Error(`Tab "${name}" not found — create it in the spreadsheet first`)
    }
  }

  const logs = []
  const log = (msg) => { console.log(msg); logs.push(msg) }

  for (const [name, cfg] of Object.entries(TABS)) {
    await configureTab(sheets, byTitle[name], name, cfg, log)
  }

  const today = new Date().toISOString()
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: 'Meta!A2:D4',
    valueInputOption: 'RAW',
    requestBody: {
      values: [
        ['serper_used', '0', '2500', today],
        ['gemini_used', '0', '1500', today],
        ['hunter_used', '0', '50', today]
      ]
    }
  })
  log('✓ Meta seed rows written')
  log('Setup complete.')
  return logs
}

module.exports = { runSetup }

if (require.main === module) {
  runSetup().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
