const { findEmailPattern, appendRow } = require('../../lib/sheets')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { company, poc, pocRole, notes, skipHunter } = req.body
  if (!company) return res.status(400).json({ error: 'Company name required' })

  try {
    // 1. SERPER — web search for company info
    const searchResults = await searchCompany(company, poc)

    // 2. GROQ — AI brief from search results
    const brief = await generateBrief(company, poc, pocRole, notes, searchResults)

    // 3. Check sheet for existing email pattern first
    let emailData = null
    let patternFromSheet = null
    
    try {
      patternFromSheet = await findEmailPattern(company)
    } catch (e) {
      console.error('Sheet read failed:', e.message)
    }

    if (patternFromSheet) {
      emailData = { pattern: patternFromSheet, fromSheet: true }
    } else if (!skipHunter) {
      emailData = await getEmailPattern(company)
    }

    // 4. Save to sheet
    try {
      await appendRow({
        company,
        warmth: brief.warmth,
        pocName: poc || '',
        position: pocRole || '',
        emailPattern: emailData?.pattern || '',
        pocEmail: '',
        linkedIn: (searchResults.sources || []).filter(s => s.isLinkedIn).map(s => s.url).join(', '),
        tags: brief.tags || [],
        notes: notes || ''
      })
    } catch (e) {
      console.error('Sheet write failed:', e.message)
    }

    return res.status(200).json({ brief, emailData, searchSnippets: searchResults.snippets, sources: searchResults.sources })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message || 'Research failed' })
  }
}

async function searchCompany(company, poc) {
  const queries = [
    `${company} aerospace sponsorship university students`,
    `${company} company overview Colorado aerospace`,
    poc ? `${poc} ${company} LinkedIn` : `${company} community engagement grants`,
    `${company} engineer OR "business development" OR "university relations" site:linkedin.com/in`
  ]

  const results = await Promise.all(queries.map(async (q) => {
    const r = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': process.env.SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ q, num: 4 })
    })
    const data = await r.json()
    return (data.organic || []).map(r => ({ title: r.title, snippet: r.snippet, url: r.link }))
  }))

  const flat = results.flat()
  return {
    snippets: flat.map(r => `${r.title}: ${r.snippet}`).join('\n\n'),
    sources: flat.filter(r => r.url).map(r => ({ title: r.title, url: r.url, isLinkedIn: r.url.includes('linkedin.com/in') }))
  }
}

async function generateBrief(company, poc, pocRole, notes, searchResults) {
  const prompt = `You are a sponsorship research assistant for Big Dumb Rockets (BDR), a 40+ member university liquid bipropellant rocket engineering team at CU Boulder. They are building a 1,400 lbf throttleable ethanol/LOX engine toward a long-duration hotfire by May 2027. They want corporate sponsors for money, components, or in-kind support.

Here is web search data about this lead:
${searchResults.snippets}

Company: ${company}
${poc ? `POC: ${poc}` : ''}
${pocRole ? `POC Role: ${pocRole}` : ''}
${notes ? `Notes: ${notes}` : ''}

Return ONLY a valid JSON object, no markdown, no preamble:
{
  "what": "2-3 sentences on what the company does and their technical focus",
  "size": "Company size, funding, headcount estimate if known",
  "colorado": "Colorado offices or connections. Say 'No known CO presence' if none.",
  "university": "Known university partnerships, student programs, sponsorships, or grants. Say 'None found' if unknown.",
  "poc": "${poc ? `2-3 sentences on ${poc}'s background, career history, any CU Boulder ties` : 'No POC provided. Suggest LinkedIn search terms for University Relations or Community Engagement at this company.'}",
  "why": "2-3 sentences on specifically why this company would benefit from sponsoring BDR — tie their tech focus to what BDR builds.",
  "angle": "A punchy 2-3 sentence cold email hook. Specific to this company, human-sounding, not generic. Just the opening angle, not a full email.",
  "warmth": "hot|warm|cold",
  "tags": ["2-4 short signal phrases like 'CO presence', 'Propulsion focus', 'Prior student sponsors', 'No known program'"],
  "next": ["3-4 concrete next steps as strings, e.g. 'Search Hunter.io for domain company.com', 'Check company.com/community for sponsorship page'"]
}`

  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
      temperature: 0.3
    })
  })

  const data = await r.json()
  const text = data.choices?.[0]?.message?.content || ''
  const clean = text.replace(/```json|```/g, '').trim()
  const match = clean.match(/\{[\s\S]*\}/)
  if (!match) {
    console.error('Raw Groq response:', text)
    throw new Error('Could not parse AI response')
  }
  return JSON.parse(match[0])
}

async function getEmailPattern(company) {
  // Clean company name to a domain guess, then let Hunter find it
  const domainGuess = company.toLowerCase()
    .replace(/\s+(inc|llc|corp|ltd|co|space|industries|systems|technologies|aerospace)\.?$/gi, '')
    .replace(/\s+/g, '')
    .trim()

  const r = await fetch(
    `https://api.hunter.io/v2/domain-search?company=${encodeURIComponent(company)}&limit=1&api_key=${process.env.HUNTER_API_KEY}`
  )
  const data = await r.json()

  if (data.data?.domain) {
    return {
      domain: data.data.domain,
      pattern: data.data.pattern || 'unknown',
      exampleEmail: data.data.emails?.[0]?.value || null,
      confidence: data.data.emails?.[0]?.confidence || null
    }
  }
  return null
}
