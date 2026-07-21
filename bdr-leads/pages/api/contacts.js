const { getContacts } = require('../../lib/sheets')

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { company } = req.query || {}
  if (!company || typeof company !== 'string' || !company.trim()) {
    return res.status(400).json({ error: 'company required' })
  }

  try {
    const contacts = await getContacts(company.trim())
    return res.status(200).json({ contacts })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message || 'Failed to load contacts' })
  }
}
