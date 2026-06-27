export const config = { runtime: 'edge' };

const BDR_CONTEXT = `Big Dumb Rockets (BDR) is a 40+ member university liquid bipropellant rocket engineering team at CU Boulder. 
They are building a 1,400 lbf throttleable ethanol/LOX engine (Regen Mk2) and working toward a long-duration hotfire by May 2027.
They need corporate sponsors for funding, components, or in-kind support.
Key angles: talent pipeline (they produce aerospace engineers), technical credibility (liquid biprop is rare at university level), 
Colorado presence, and alignment with aerospace/defense/propulsion companies.`;

async function serperSearch(query, apiKey) {
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query, num: 5 })
  });
  return res.json();
}

async function groqSummarize(searchResults, company, poc, pocRole, notes, apiKey) {
  const snippets = (searchResults.organic || [])
    .map(r => `${r.title}: ${r.snippet}`)
    .join('\n');

  const prompt = `You are a sponsorship research assistant for Big Dumb Rockets (BDR).

${BDR_CONTEXT}

Research data for: ${company}
${poc ? `POC: ${poc}` : ''}
${pocRole ? `POC Role: ${pocRole}` : ''}
${notes ? `Notes: ${notes}` : ''}

Web search results:
${snippets}

Return ONLY a valid JSON object, no markdown, no preamble:
{
  "what": "2-3 sentences on what the company does and their technical focus",
  "size": "Company size, funding stage, headcount estimate if known",
  "colorado": "Colorado offices or presence. Say 'No known CO presence' if none.",
  "university": "Known university partnerships, student programs, or sponsorship history. Say 'None found' if none.",
  "poc": "${poc ? `Background on ${poc}, their career, any CU Boulder connection. 2-3 sentences.` : 'No POC provided. Suggest LinkedIn search terms to find the right contact at this company.'}",
  "why": "2-3 sentences on why this company specifically would benefit from sponsoring BDR. Be concrete.",
  "angle": "A 2-3 sentence cold email hook. Human, specific, not generic. Reference something real about the company. Just the opening angle, not the full email.",
  "tags": ["2-4 short signal phrases like 'CO presence', 'Propulsion focus', 'Prior student sponsors'"],
  "tagTypes": ["warm or cold for each tag — must match tags array length"],
  "next": "3-4 bullet points (start each with •) of concrete next steps to find their email or verify sponsorship interest. Mention Hunter.io, specific LinkedIn search terms, or company pages to check."
}`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 900,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function hunterEmailPattern(domain, apiKey) {
  if (!domain || !apiKey) return null;
  const res = await fetch(
    `https://api.hunter.io/v2/domain-search?domain=${domain}&limit=1&api_key=${apiKey}`
  );
  const data = await res.json();
  const pattern = data?.data?.pattern;
  const org = data?.data?.organization;
  const email = data?.data?.emails?.[0]?.value || null;
  return { pattern, org, email };
}

function guessDomain(company) {
  return company.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .join('') + '.com';
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405 });
  }

  const { company, poc, pocRole, notes, domain } = await req.json();
  if (!company) return new Response(JSON.stringify({ error: 'Company name required' }), { status: 400 });

  const SERPER_KEY = process.env.SERPER_API_KEY;
  const GROQ_KEY = process.env.GROQ_API_KEY;
  const HUNTER_KEY = process.env.HUNTER_API_KEY;

  if (!SERPER_KEY || !GROQ_KEY) {
    return new Response(JSON.stringify({ error: 'Missing API keys. Check your Vercel environment variables.' }), { status: 500 });
  }

  try {
    const searchQuery = `${company} aerospace sponsorship university students Colorado`;
    const [searchResults, hunterData] = await Promise.all([
      serperSearch(searchQuery, SERPER_KEY),
      hunterEmailPattern(domain || guessDomain(company), HUNTER_KEY)
    ]);

    const rawSummary = await groqSummarize(searchResults, company, poc, pocRole, notes, GROQ_KEY);

    let parsed;
    try {
      const match = rawSummary.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match?.[0] || '{}');
    } catch {
      parsed = { what: rawSummary, size: '', colorado: '', university: '', poc: '', why: '', angle: '', tags: [], tagTypes: [], next: '' };
    }

    return new Response(JSON.stringify({
      ...parsed,
      hunter: hunterData,
      searchSources: (searchResults.organic || []).slice(0, 3).map(r => ({ title: r.title, link: r.link }))
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
