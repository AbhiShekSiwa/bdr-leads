const { updateStatus } = require('../../lib/sheets')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { company, status } = req.body || {}
  if (!company || typeof company !== 'string' || !company.trim()) {
    return res.status(400).json({ error: 'Company name required' })
  }
  if (!status || typeof status !== 'string' || !status.trim()) {
    return res.status(400).json({ error: 'Status required' })
  }

  try {
    const updated = await updateStatus(company.trim(), status.trim())
    if (updated === null) {
      return res.status(404).json({ error: 'Company not found' })
    }
    return res.status(200).json({ success: true, status: updated })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message || 'Failed to update status' })
  }
}
