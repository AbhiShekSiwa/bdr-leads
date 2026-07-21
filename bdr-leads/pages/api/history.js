const { getHistory } = require('../../lib/sequences')

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { company } = req.query || {}
  if (!company || typeof company !== 'string' || !company.trim()) {
    return res.status(400).json({ error: 'company required' })
  }

  try {
    const history = await getHistory(company.trim())
    return res.status(200).json({ history })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message || 'Failed to load history' })
  }
}
