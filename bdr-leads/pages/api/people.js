const { saveContacts, incrementCounter } = require('../../lib/sheets')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { company } = req.body || {}
  if (!company || typeof company !== 'string' || !company.trim()) {
    return res.status(400).json({ error: 'Company name required' })
  }

  try {
    const people = await findPeople(company.trim())
    incrementCounter('serper_used').catch((e) => console.error(e))
    // Persist to Contacts tab (await so Vercel doesn't drop the write)
    try {
      await saveContacts(company.trim(), people)
    } catch (e) {
      console.error('saveContacts failed:', e.message)
    }
    return res.status(200).json({ people })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message || 'People search failed' })
  }
}

async function findPeople(company) {
  const queries = [
    `"${company}" "Director of Engineering" site:linkedin.com/in`,
    `"${company}" "VP" OR "Head of" "Business Development" site:linkedin.com/in`,
    `"${company}" "University Relations" OR "Community Engagement" site:linkedin.com/in`,
    `"${company}" "Propulsion" OR "Systems Engineer" site:linkedin.com/in`,
    `"${company}" "Partnerships" OR "Sponsorship" site:linkedin.com/in`,
    `"${company}" "Recruiting" OR "Talent" OR "Student Programs" site:linkedin.com/in`
  ]

  const settled = await Promise.allSettled(queries.map((q) => searchSerper(q)))

  const organic = []
  for (const result of settled) {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      organic.push(...result.value)
    }
  }

  const seen = new Set()
  const people = []

  for (const item of organic) {
    const link = item?.link
    if (!link || typeof link !== 'string') continue
    if (!link.includes('linkedin.com/in')) continue

    const rawTitle = item.title
    if (!rawTitle || typeof rawTitle !== 'string' || !rawTitle.trim()) continue

    const slug = extractLinkedInSlug(link)
    const dedupeKey = slug || cleanUrl(link)
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)

    const { name, title } = parseLinkedInTitle(rawTitle)
    people.push({
      name,
      title,
      url: cleanUrl(link),
      snippet: typeof item.snippet === 'string' ? item.snippet : ''
    })
  }

  people.sort((a, b) => {
    const aHas = a.title ? 1 : 0
    const bHas = b.title ? 1 : 0
    return bHas - aHas
  })

  return people.slice(0, 15)
}

async function searchSerper(q) {
  const r = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': process.env.SERPER_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ q, num: 5 })
  })

  if (!r.ok) {
    throw new Error(`Serper request failed: ${r.status}`)
  }

  const data = await r.json()
  return data.organic || []
}

function cleanUrl(url) {
  try {
    const u = new URL(url)
    u.search = ''
    u.hash = ''
    return u.toString().replace(/\/$/, '')
  } catch {
    return url.split('?')[0].split('#')[0].replace(/\/$/, '')
  }
}

function extractLinkedInSlug(url) {
  try {
    const cleaned = cleanUrl(url)
    const u = new URL(cleaned)
    const match = u.pathname.match(/\/in\/([^/]+)/i)
    return match ? match[1].toLowerCase() : null
  } catch {
    const match = String(url).match(/linkedin\.com\/in\/([^/?#]+)/i)
    return match ? match[1].toLowerCase() : null
  }
}

/**
 * Parse LinkedIn SERP titles into name + job title.
 * Examples:
 *   "Jane Smith - Director of Engineering at Acme | LinkedIn"
 *   "Jane Smith - Director of Engineering - Acme | LinkedIn"
 *   "Jane Smith | LinkedIn"
 *   "Jane Smith - LinkedIn"
 */
function parseLinkedInTitle(raw) {
  let cleaned = raw.trim()
  cleaned = cleaned.replace(/\s*\|\s*LinkedIn\s*$/i, '').trim()
  cleaned = cleaned.replace(/\s*-\s*LinkedIn\s*$/i, '').trim()

  if (!cleaned) {
    return { name: raw.trim(), title: '' }
  }

  // No dash → whole string is the name
  if (!cleaned.includes(' - ')) {
    return { name: cleaned, title: '' }
  }

  const parts = cleaned.split(' - ').map((p) => p.trim()).filter(Boolean)
  if (parts.length === 0) {
    return { name: cleaned, title: '' }
  }

  const name = parts[0]
  if (parts.length === 1) {
    return { name, title: '' }
  }

  // "Name - Job Title at Company" or "Name - Job Title - Company"
  let title = parts.slice(1).join(' - ')

  // Prefer middle segment when pattern is "Name - Role - Company"
  if (parts.length >= 3) {
    title = parts[1]
  } else {
    // Strip trailing " at Company" when present
    title = title.replace(/\s+at\s+.+$/i, '').trim()
  }

  // FIX 1 — Strip " @ Company" variants (space-at-space → end)
  title = title.replace(/\s+@\s+.+$/i, '').trim()

  // If the "title" is just the company-ish leftover or empty, treat as no title
  if (!title || /^linkedin$/i.test(title)) {
    return { name, title: '' }
  }

  // FIX 2 — Blank titles that look like company names (no role-indicator words)
  const ROLE_INDICATORS = [
    'engineer', 'director', 'manager', 'president', 'vp', 'vice', 'head', 'lead', 'officer',
    'founder', 'coordinator', 'developer', 'analyst', 'scientist', 'recruiter', 'intern',
    'associate', 'specialist', 'architect', 'designer', 'consultant', 'executive',
    'cto', 'ceo', 'coo', 'cfo',
    'principal', 'propulsion', 'systems', 'operations', 'strategy', 'business', 'partnerships',
    'outreach', 'communications', 'marketing', 'sales'
  ]
  const hasRoleWord = ROLE_INDICATORS.some((word) => new RegExp(`\\b${word}\\b`, 'i').test(title))
  if (!hasRoleWord) {
    return { name, title: '' }
  }

  // FIX 3 — Strip trailing ellipsis junk
  title = title.replace(/\s*\.{3}$/, '').trim()

  return { name, title }
}
