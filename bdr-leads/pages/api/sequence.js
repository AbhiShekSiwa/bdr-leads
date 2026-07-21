export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })
  }

  const {
    company,
    brief = {},
    signals = [],
    contactName = '',
    contactTitle = '',
    askType = ''
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
      askType: typeof askType === 'string' ? askType : ''
    })
    return res.status(200).json(sequence)
  } catch (err) {
    console.error(err)
    // Structured parse failures include { error, raw } already thrown as Error with .raw
    if (err.raw !== undefined) {
      return res.status(500).json({ error: err.message, raw: err.raw })
    }
    return res.status(500).json({ error: err.message || 'Sequence generation failed' })
  }
}

async function generateSequence({ company, brief, signals, contactName, contactTitle, askType }) {
  // Subject length / word count often drift — qualityCheck.js flags those client-side.

  // Free-text ask from the UI — empty/whitespace falls back rather than failing
  const askText = (typeof askType === 'string' && askType.trim())
    ? askType.trim()
    : 'general sponsorship support for our rocket team'

  const greeting = contactName ? `Hi ${contactName},` : 'Hi there,'

  const signalBlock = signals.length > 0
    ? `RECENT SIGNALS (use these as icebreaker material — they are specific and recent):\n` +
      signals.map((s, i) => `${i + 1}. ${s.text} (${s.source}, ${s.recency})`).join('\n')
    : `No recent signals found. Use specific details from the company brief instead.`

  const briefBlock = [
    `Company: ${company}`,
    `What they do: ${brief.what || 'unknown'}`,
    `Why they would care about BDR: ${brief.why || 'unknown'}`,
    `Colorado presence: ${brief.colorado || 'unknown'}`,
    `University/student programs: ${brief.university || 'unknown'}`
  ].join('\n')

  const prompt = `
You are a cold email copywriter writing on behalf of Big Dumb Rockets (BDR), 
a 40+ member university liquid bipropellant rocket engineering team at CU Boulder.
They are building a 1,400 lbf throttleable ethanol/LOX engine toward a long-duration 
hotfire by May 2027. They successfully hotfired their ablative engine in April 2026.
This is a serious engineering team, not a hobby club.

They are reaching out to ${company} with this specific ask:
"${askText}"

Context: This is Big Dumb Rockets (BDR), a university rocket 
team at CU Boulder. Every ask should be framed around how 
supporting BDR benefits the company — access to talented 
engineering students, visibility in the Colorado aerospace 
community, association with a technically serious student 
program building a 1,400 lbf ethanol/LOX engine.

Contact name: ${contactName || 'not provided'}
Contact title: ${contactTitle || 'not provided'}

COMPANY RESEARCH:
${briefBlock}

${signalBlock}

YOUR JOB: Write exactly 3 emails that form a cold outreach sequence.

HARD RULES — violating any of these is a failure:
1. Each email body MUST be under 100 words. Count every word. Be ruthless.
2. Subject lines MUST be under 33 characters total including spaces.
3. NO em-dashes (—) anywhere. Use commas or periods instead.
4. NEVER use these phrases: "hope this finds you", "circle back", "touch base", 
   "deep dive", "synergy", "just following up", "reaching out because", 
   "i noticed your linkedin", "love your work", "we appreciate industry support",
   "continued success", "leverage", "seamless", "best wishes"
5. NO hard CTAs. Never say "book a meeting", "schedule a call now", "click here".
   Every email ends with a soft ask like "Would a 20-minute call make sense?" 
   or "Worth a quick conversation?"
6. Short paragraphs only. One blank line between each paragraph.
7. Every email signs off with exactly: "The BDR Team, CU Boulder"
8. Every email greeting is exactly: "${greeting}"

EMAIL REQUIREMENTS:

Email 1 (Day 0) — The Icebreaker:
- MUST open with something hyper-specific to ${company} from the signals or brief
- Something only someone who actually researched them would know
- NOT "I saw your website" or "I noticed your LinkedIn"
- One line on who BDR is (mention the ethanol/LOX engine or the April 2026 hotfire)
- Soft ask to connect
- Subject: specific to this company, under 33 chars, creates curiosity

Email 2 (Day 3) — New Angle:
- Completely different angle from Email 1
- Do NOT reference Email 1 or say anything like "following up"
- Focus on a different signal OR their university/community engagement OR 
  why their specific technology overlaps with what BDR is building
- New value, new reason to reply
- Subject: different from Email 1, still specific and under 33 chars

Email 3 (Day 7) — Graceful Exit:
- Low pressure, no desperation
- A genuine specific compliment about something they actually built or did
- Make it clear this is the last email
- Leave a good impression regardless of whether they reply
- Subject: warm but specific, not "Best Wishes" or "Final Note"

SPECIFICITY TEST: Before writing each email, ask yourself — 
"Could this exact email be sent to a different company?" 
If yes, rewrite it until the answer is no.

Return ONLY this exact JSON structure, no markdown fences, no explanation:
{
  "emails": [
    {
      "step": 1,
      "day": 0,
      "subject": "string under 33 chars",
      "body": "string under 100 words",
      "wordCount": actual_integer_count
    },
    {
      "step": 2,
      "day": 3,
      "subject": "string under 33 chars",
      "body": "string under 100 words",
      "wordCount": actual_integer_count
    },
    {
      "step": 3,
      "day": 7,
      "subject": "string under 33 chars",
      "body": "string under 100 words",
      "wordCount": actual_integer_count
    }
  ]
}
`

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 4096,
          // Flash models spend tokens on internal "thinking"; disable so JSON isn't truncated
          thinkingConfig: { thinkingBudget: 0 }
        }
      })
    }
  )
  const data = await r.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  if (!text) {
    const apiErr = data.error?.message
    const finish = data.candidates?.[0]?.finishReason
    const detail = apiErr
      || (finish ? `finishReason=${finish}` : null)
      || 'possible safety filter or empty candidates'
    const err = new Error(`Gemini returned empty response — ${detail}`)
    err.raw = data
    throw err
  }

  const clean = text.replace(/```json|```/g, '').trim()
  const match = clean.match(/\{[\s\S]*\}/)
  if (!match) {
    const err = new Error('Could not parse sequence response')
    err.raw = text
    throw err
  }

  let parsed
  try {
    parsed = JSON.parse(match[0])
  } catch (e) {
    const err = new Error('Could not parse sequence response')
    err.raw = text
    throw err
  }

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

  // Belt-and-suspenders: strip em-dashes even when the model ignores the rule
  for (const email of parsed.emails) {
    email.body = email.body.replace(/—/g, ', ')
    email.wordCount = email.body.split(/\s+/).filter(Boolean).length
  }

  return parsed
}
