const { updateEmailStatus, updateReply } = require('../../lib/sheets')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const {
    company,
    contactName,
    emailStep,
    status,
    replyStatus,
    replyNotes
  } = req.body || {}

  if (!company || typeof company !== 'string' || !company.trim()) {
    return res.status(400).json({ error: 'company required' })
  }

  try {
    if (emailStep != null && status) {
      await updateEmailStatus(
        company.trim(),
        contactName || '',
        Number(emailStep),
        status
      )
    }
    if (replyStatus) {
      await updateReply(
        company.trim(),
        contactName || '',
        replyStatus,
        replyNotes || ''
      )
    }
    return res.status(200).json({ success: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message || 'Failed to update email status' })
  }
}
