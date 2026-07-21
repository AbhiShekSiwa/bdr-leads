export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const {
    company,
    brief = {},
    signals = [],
    contactName = '',
    contactTitle = '',
    askType
  } = req.body || {}

  if (!company || typeof company !== 'string' || !company.trim()) {
    return res.status(400).json({ error: 'Company name required' })
  }

  try {
    const sequence = await generateSequence({
      company: company.trim(),
      brief: brief && typeof brief === 'object' ? brief : {},
      signals: Array.isArray(signals) ? signals : [],
      contactName: typeof contactName === 'string' ? contactName : '',
      contactTitle: typeof contactTitle === 'string' ? contactTitle : '',
      askType
    })
    return res.status(200).json(sequence)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: err.message || 'Sequence generation failed' })
  }
}

async function generateSequence({ company, brief, signals, contactName, contactTitle, askType }) {
  // Groq often ignores hard word-count / subject-length rules — qualityCheck.js catches those client-side.
  // Groq's self-reported wordCount is frequently wrong (e.g. 0); UI should recount from body.

  const askDescriptions = {
    financial_sponsorship: 'financial sponsorship (cash contribution toward team expenses, materials, or competition fees)',
    hardware_donation: 'hardware or component donation (valves, sensors, fittings, materials, or fabrication support)',
    mentorship: 'mentorship or technical advising (engineers from their team advising BDR on specific technical challenges)',
    internship_pipeline: 'internship pipeline (a relationship where BDR engineers can apply for internships at their company)'
  }

  const greeting = contactName ? `Hi ${contactName},` : 'Hi there,'

  const signalBlock = signals.length > 0
    ? `Recent signals about this company:\n${signals.map((s) => `- ${s.text} (${s.source}, ${s.recency})`).join('\n')}`
    : 'No recent signals found — use the company brief for context instead.'

  const briefBlock = `
Company: ${company}
What they do: ${brief.what || 'unknown'}
Why they would care about BDR: ${brief.why || 'unknown'}
Colorado presence: ${brief.colorado || 'unknown'}
University programs: ${brief.university || 'unknown'}
`.trim()

  const prompt = `
You are writing a 3-email cold outreach sequence for Big Dumb Rockets (BDR), 
a 40+ member university liquid bipropellant rocket engineering team at CU Boulder.
They are building a 1,400 lbf throttleable ethanol/LOX engine toward a 
long-duration hotfire by May 2027. They hotfired their ablative engine in April 2026.
Serious engineers, not a hobby club.

They are reaching out to ${company} asking for: ${askDescriptions[askType] || askType}

Contact: ${contactName || 'unknown name'}, ${contactTitle || 'unknown title'}

${briefBlock}

${signalBlock}

Write exactly 3 emails. OBEY THESE RULES — they are non-negotiable:

RULES:
1. Each body MUST be under 100 words. Count carefully.
2. Subject lines MUST be under 33 characters. Short, specific, curiosity-driven.
3. Email 1 (Day 0): Open with a SPECIFIC icebreaker from the signals or brief — 
   something only someone who researched this company would know. 
   Then one line on who BDR is. Then a soft ask (20-minute call, not "book a meeting").
   Greeting: "${greeting}"
4. Email 2 (Day 3): A COMPLETELY DIFFERENT angle — do not say "just following up". 
   Reference a different signal or their university/community engagement. New value.
   Greeting: "${greeting}"
5. Email 3 (Day 7): Graceful exit. Low pressure. A genuine specific compliment 
   about their work is fine here. Leave a good impression even if no reply ever comes.
   Greeting: "${greeting}"
6. BANNED — never use these: "hope this email finds you well", "hope this finds you", 
   "circle back", "deep dive", "touch base", "synergy", "i came across", 
   "i noticed your linkedin", "love your work", "reaching out because", 
   "just following up", "leverage", "seamless"
7. NO EM-DASHES (—). Use commas or periods instead. Em-dashes are an AI writing tell.
8. Short paragraphs. One blank line between each. Mobile-optimized.
9. Every email ends with a soft, low-friction ask — never a hard CTA.
10. Sign-off on every email: "The BDR Team, CU Boulder"
11. Include the actual word count for each email body in the JSON.

Return ONLY valid JSON, no markdown fences, no preamble, no explanation:
{
  "emails": [
    {
      "step": 1,
      "day": 0,
      "subject": "...",
      "body": "...",
      "wordCount": 0
    },
    {
      "step": 2,
      "day": 3,
      "subject": "...",
      "body": "...",
      "wordCount": 0
    },
    {
      "step": 3,
      "day": 7,
      "subject": "...",
      "body": "...",
      "wordCount": 0
    }
  ]
}
`

  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
      temperature: 0.6
    })
  })
  const data = await r.json()
  const text = data.choices?.[0]?.message?.content || ''
  const clean = text.replace(/```json|```/g, '').trim()
  const match = clean.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Could not parse AI response')
  const parsed = JSON.parse(match[0])

  if (!Array.isArray(parsed.emails) || parsed.emails.length !== 3) {
    throw new Error('Sequence response malformed')
  }
  for (const email of parsed.emails) {
    if (
      typeof email.step !== 'number' ||
      typeof email.day !== 'number' ||
      typeof email.subject !== 'string' ||
      typeof email.body !== 'string'
    ) {
      throw new Error('Sequence response malformed')
    }
  }

  // Post-process: replace em-dashes (common AI tell) with commas — model often ignores the rule
  for (const email of parsed.emails) {
    email.body = email.body.replace(/—/g, ', ')
  }

  return parsed
}
