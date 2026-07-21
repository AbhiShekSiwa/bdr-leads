const {
  saveHunterDomain,
  updateContactEmail,
  getContacts,
  incrementCounter
} = require('../../lib/sheets')

function splitName(fullName) {
  const cleaned = String(fullName || '').replace(/,.*$/, '').trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  const firstName = parts[0] || ''
  let lastName = parts.length > 1 ? parts[parts.length - 1] : ''
  lastName = lastName.replace(/[^a-zA-Z'-]/g, '')
  if (lastName.length <= 1) lastName = ''
  return { firstName, lastName }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { company, domain: domainIn, contactName, contactTitle } = req.body || {}
  if (!company || typeof company !== 'string' || !company.trim()) {
    return res.status(400).json({ error: 'company required' })
  }
  if (!process.env.HUNTER_API_KEY) {
    return res.status(500).json({ error: 'HUNTER_API_KEY not configured' })
  }

  try {
    let domain = domainIn || ''
    let pattern = ''
    let cascadeCount = 0
    let email = null
    let confidence = null

    // Domain search when needed
    if (!domain || contactName || !domainIn) {
      const r = await fetch(
        `https://api.hunter.io/v2/domain-search?company=${encodeURIComponent(company.trim())}&limit=1&api_key=${process.env.HUNTER_API_KEY}`
      )
      const data = await r.json()
      incrementCounter('hunter_used').catch((e) => console.error(e))

      if (data.data?.domain) {
        domain = data.data.domain
        pattern = data.data.pattern || ''
        cascadeCount = await saveHunterDomain(company.trim(), domain, pattern)

        // Critic #6: if domain search returns a high-confidence email, try matching a contact
        const sample = data.data.emails?.[0]
        if (sample?.value && sample.confidence > 0 && sample.first_name && sample.last_name) {
          const contacts = await getContacts(company.trim())
          const match = contacts.find((c) => {
            const { firstName, lastName } = splitName(c.name)
            return (
              firstName.toLowerCase() === String(sample.first_name).toLowerCase() &&
              lastName.toLowerCase() === String(sample.last_name).toLowerCase()
            )
          })
          if (match && !match.email) {
            await updateContactEmail(
              company.trim(),
              match.name,
              sample.value,
              sample.confidence,
              'hunter-verified'
            )
          }
        }
      }
    }

    // Individual email finder
    if (contactName && domain) {
      const { firstName, lastName } = splitName(contactName)
      if (firstName && lastName) {
        const r = await fetch(
          `https://api.hunter.io/v2/email-finder?domain=${encodeURIComponent(domain)}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&api_key=${process.env.HUNTER_API_KEY}`
        )
        const data = await r.json()
        incrementCounter('hunter_used').catch((e) => console.error(e))

        if (data.data?.email && data.data.score > 0) {
          email = data.data.email
          confidence = data.data.score
          await updateContactEmail(
            company.trim(),
            contactName,
            email,
            confidence,
            'hunter-verified'
          )
        }
      }
    }

    // Domain-only path already saved above when no contactName
    if (!domainIn && !contactName && domain) {
      // already cascaded
    } else if (domainIn && !contactName) {
      cascadeCount = await saveHunterDomain(company.trim(), domain, pattern || '')
      incrementCounter('hunter_used').catch((e) => console.error(e))
    }

    return res.status(200).json({
      domain: domain || null,
      pattern: pattern || null,
      email,
      confidence,
      cascadeCount,
      contactTitle: contactTitle || null
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message || 'Hunter lookup failed' })
  }
}
