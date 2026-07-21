const { runSetup } = require('../../lib/setupSheets')
const { convertLinkedInColumns } = require('../../lib/sheets')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!req.body?.confirm) return res.status(400).json({ error: 'Pass { "confirm": true }' })
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return res.status(500).json({ error: 'GOOGLE_SERVICE_ACCOUNT_JSON not configured' })
  }

  try {
    const log = await runSetup()
    const converted = await convertLinkedInColumns()
    log.push(`✓ Converted ${converted} LinkedIn cell(s) to hyperlinks`)
    return res.status(200).json({ ok: true, log, converted })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message })
  }
}
