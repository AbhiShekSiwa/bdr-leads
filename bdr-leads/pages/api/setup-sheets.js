const { runSetup } = require('../../lib/setupSheets')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!req.body?.confirm) return res.status(400).json({ error: 'Pass { "confirm": true }' })
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return res.status(500).json({ error: 'GOOGLE_SERVICE_ACCOUNT_JSON not configured' })
  }

  try {
    const log = await runSetup()
    return res.status(200).json({ ok: true, log })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message })
  }
}
