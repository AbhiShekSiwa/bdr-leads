const { getCredits } = require('../../lib/sheets')

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const credits = await getCredits()
    return res.status(200).json({ credits })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message || 'Failed to load credits' })
  }
}
