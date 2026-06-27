export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { companies } = req.body
  if (!companies || !Array.isArray(companies) || companies.length === 0) {
    return res.status(400).json({ error: 'companies array required' })
  }

  const results = []

  for (const entry of companies.slice(0, 20)) { // cap at 20
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: entry.company,
          poc: entry.poc || '',
          pocRole: entry.pocRole || '',
          notes: entry.notes || '',
          skipHunter: true // don't burn Hunter credits on batch
        })
      })
      const data = await r.json()
      results.push({ company: entry.company, ...data, success: true })
    } catch (err) {
      results.push({ company: entry.company, success: false, error: err.message })
    }

    // small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 800))
  }

  return res.status(200).json({ results })
}
