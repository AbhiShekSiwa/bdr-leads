export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { company } = req.body || {}
  if (!company || typeof company !== 'string' || !company.trim()) {
    return res.status(400).json({ error: 'Company name required' })
  }

  try {
    const signals = await findSignals(company.trim())
    return res.status(200).json({ signals })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message || 'Signal search failed' })
  }
}

async function findSignals(company) {
  const queries = [
    `"${company}" (hiring OR "now hiring") engineer propulsion OR systems OR avionics 2026`,
    `"${company}" (announced OR launched OR partnership OR funding OR awarded) 2025 OR 2026`,
    `"${company}" (university OR student OR sponsor OR AIAA OR "rocket club" OR competition)`
  ]

  const settled = await Promise.allSettled(queries.map((q) => searchSerper(q)))

  const organic = []
  for (const result of settled) {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      organic.push(...result.value)
    }
  }

  const seen = new Set()
  const results = []
  for (const item of organic) {
    const link = item?.link
    if (!link || typeof link !== 'string') continue
    const key = link.split('?')[0].split('#')[0].replace(/\/$/, '')
    if (seen.has(key)) continue
    seen.add(key)
    results.push(item)
    if (results.length >= 20) break
  }

  const snippets = results
    .map((r) => {
      const title = typeof r.title === 'string' ? r.title : ''
      const snippet = typeof r.snippet === 'string' ? r.snippet.slice(0, 300) : ''
      return `${title}: ${snippet}`
    })
    .join('\n\n')

  return extractSignals(snippets)
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
  const data = await r.json()
  return data.organic || []
}

async function extractSignals(snippets) {
  // Groq may still invent signals not grounded in snippets; prompt mitigates but cannot fully prevent it.
  const prompt = `You are helping a university rocket engineering team (Big Dumb Rockets, CU Boulder) 
research a company for cold outreach. From these search result snippets, extract up to 
4 RECENT and SPECIFIC signals — concrete things that just happened at this company that 
a person could reference in a cold email opener to prove they did real research.

Good signals: a specific job posting mentioning a technology, a product launch, a blog 
post on a technical topic, a recent university sponsorship, a funding round, a conference 
talk, a new hire in a relevant role.

Bad signals (exclude these): generic 'company does X' facts, old news (before 2024), 
vague statements like 'company is growing', anything that applies to most companies.

Search snippets:
${snippets}

Return ONLY valid JSON, no markdown, no preamble:
{
  "signals": [
    {
      "text": "one sentence describing the specific signal, written so it can drop naturally into a cold email",
      "source": "where it came from (e.g. LinkedIn post, company blog, job board)",
      "recency": "approximate age e.g. '2 weeks ago', '3 months ago', or 'unknown'"
    }
  ]
}
If no good signals are found, return { "signals": [] }.`

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 600,
        temperature: 0.3
      })
    })
    const data = await r.json()
    const text = data.choices?.[0]?.message?.content || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const match = clean.match(/\{[\s\S]*\}/)
    // Non-fatal: bad/missing JSON → empty signals rather than 500
    if (!match) return []
    const parsed = JSON.parse(match[0])
    return Array.isArray(parsed.signals) ? parsed.signals : []
  } catch (err) {
    console.error('Groq signal extract failed:', err.message)
    return []
  }
}
