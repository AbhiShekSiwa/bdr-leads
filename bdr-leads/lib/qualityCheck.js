/**
 * Pure email quality checks — no API calls.
 * Used client-side to flag model rule violations.
 */

const BANNED_PHRASES = [
  'hope this email finds you well',
  'hope this finds you',
  'i hope you are',
  "i hope you're",
  'circle back',
  'deep dive',
  'touch base',
  'synergy',
  'i came across your',
  'i noticed your linkedin',
  'love your work',
  'reaching out because',
  'just following up',
  'per my last email',
  'as per',
  'leverage',
  'seamless',
  'we appreciate industry support',
  'continued success'
]

const HARD_CTAS = [
  'book a meeting',
  'schedule a call now',
  "let's hop on",
  'click here',
  'sign up now'
]

const VAGUE_SUBJECTS = [
  'best wishes',
  'following up',
  'hello',
  'hi there',
  'checking in',
  'quick question',
  'introduction',
  'connecting'
]

function checkEmail(email) {
  const subject = typeof email?.subject === 'string' ? email.subject : ''
  const body = typeof email?.body === 'string' ? email.body : ''
  const flags = []

  // 1. Subject length
  if (subject.length > 33) {
    flags.push({
      severity: 'warn',
      location: 'subject',
      message: `Subject is ${subject.length} chars — may truncate on mobile (aim for ≤33)`
    })
  }

  // 2. Body word count
  const words = body.split(/\s+/).filter(Boolean)
  if (words.length > 100) {
    flags.push({
      severity: 'warn',
      location: 'body',
      message: `Body is ${words.length} words — aim for under 100`
    })
  }

  // 3. Banned phrases (body only, case-insensitive)
  const bodyLower = body.toLowerCase()
  for (const phrase of BANNED_PHRASES) {
    if (bodyLower.includes(phrase.toLowerCase())) {
      flags.push({
        severity: 'error',
        location: 'body',
        message: `Contains banned phrase: "${phrase}"`
      })
    }
  }

  // 4. Em-dash check
  if (body.includes('—')) {
    flags.push({
      severity: 'error',
      location: 'body',
      message: 'Contains em-dash (—) — replace with comma or period'
    })
  }

  // 5. Hard CTA check
  for (const phrase of HARD_CTAS) {
    if (bodyLower.includes(phrase.toLowerCase())) {
      flags.push({
        severity: 'warn',
        location: 'body',
        message: `Hard CTA detected: "${phrase}" — soften this`
      })
    }
  }

  // 6. Vague subject check
  const subjectLower = subject.trim().toLowerCase()
  if (VAGUE_SUBJECTS.some((v) => subjectLower === v || subjectLower.includes(v))) {
    flags.push({
      severity: 'warn',
      location: 'subject',
      message: `Subject "${subject}" is too generic — make it specific to the company`
    })
  }

  const passed = flags.filter((f) => f.severity === 'error').length === 0
  return { passed, flags }
}

function checkSequence(emails) {
  const list = Array.isArray(emails) ? emails : []
  const results = list.map((email, i) => {
    const { passed, flags } = checkEmail(email)
    return { step: i + 1, passed, flags }
  })
  const passed = results.length > 0 && results.every((r) => r.passed)
  return { passed, results }
}

module.exports = { checkEmail, checkSequence }
