import type { Finding, FindingLocation } from '@/types/database'

type RawFinding = {
  check_id: string
  category: string
  severity: 'info' | 'minor' | 'major'
  title: string
  explanation: string
  location: FindingLocation
  suggested_fix?: string
  original_text?: string
}

const CONFUSED_WORDS: Record<string, { correct: string; explanation: string }> = {
  'teh': { correct: 'the', explanation: 'Common typo' },
  'recieve': { correct: 'receive', explanation: 'Misspelling: i before e except after c' },
  'occured': { correct: 'occurred', explanation: 'Double r required' },
  'definately': { correct: 'definitely', explanation: 'Common misspelling' },
  'seperate': { correct: 'separate', explanation: 'Common misspelling' },
  'accomodate': { correct: 'accommodate', explanation: 'Double c and double m' },
  'occurence': { correct: 'occurrence', explanation: 'Double r required' },
  'neccessary': { correct: 'necessary', explanation: 'One c, double s' },
  'wierd': { correct: 'weird', explanation: 'ei not ie' },
  'untill': { correct: 'until', explanation: 'Single l' },
  'alot': { correct: 'a lot', explanation: '"A lot" is two words' },
  'arguement': { correct: 'argument', explanation: 'No e after the u' },
  'begining': { correct: 'beginning', explanation: 'Double n' },
  'beleive': { correct: 'believe', explanation: 'ie not ei' },
  'calender': { correct: 'calendar', explanation: 'a not e in the last syllable' },
  'collegue': { correct: 'colleague', explanation: 'Double l, -eague ending' },
  'commitee': { correct: 'committee', explanation: 'Double m, double t, double e' },
  'concensus': { correct: 'consensus', explanation: 'No c in the middle' },
  'embarass': { correct: 'embarrass', explanation: 'Double r, double s' },
  'enviroment': { correct: 'environment', explanation: 'n before m' },
  'goverment': { correct: 'government', explanation: 'n before m' },
  'happend': { correct: 'happened', explanation: 'Double p, -ed ending' },
  'immediatly': { correct: 'immediately', explanation: '-ely ending' },
  'independant': { correct: 'independent', explanation: '-ent not -ant' },
  'knowlege': { correct: 'knowledge', explanation: 'Missing d' },
  'liason': { correct: 'liaison', explanation: 'i before a' },
  'mispell': { correct: 'misspell', explanation: 'Double s' },
  'noticable': { correct: 'noticeable', explanation: 'Keep the e' },
  'persistant': { correct: 'persistent', explanation: '-ent not -ant' },
  'reccomend': { correct: 'recommend', explanation: 'One c, double m' },
  'refered': { correct: 'referred', explanation: 'Double r' },
  'relevent': { correct: 'relevant', explanation: '-ant not -ent' },
  'succesful': { correct: 'successful', explanation: 'Double c, double s' },
  'suprise': { correct: 'surprise', explanation: 'r before the first s' },
  'tommorow': { correct: 'tomorrow', explanation: 'One m, double r' },
  'truely': { correct: 'truly', explanation: 'No e' },
  'wich': { correct: 'which', explanation: 'Missing h' },
  'writting': { correct: 'writing', explanation: 'Single t' },
}

const CONFUSABLES: Array<{ pattern: RegExp; message: string; fix: string }> = [
  { pattern: /\btheir\b(?=\s+(?:is|are|was|were)\b)/gi, message: "Possible confusion: 'their' vs 'there'", fix: 'there' },
  { pattern: /\bthere\b(?=\s+\w+(?:s|ed|ing)\b)/gi, message: "Possible confusion: 'there' vs 'their'", fix: 'their' },
  { pattern: /\bits\s*'/gi, message: "'its' (possessive) vs 'it's' (it is)", fix: "it's" },
  { pattern: /\byour\b(?=\s+(?:right|welcome|going|doing|being)\b)/gi, message: "Possible confusion: 'your' vs 'you're'", fix: "you're" },
  { pattern: /\bthen\b(?=\s+(?:me|him|her|us|them|the|a|an)\b)/gi, message: "Possible confusion: 'then' vs 'than'", fix: 'than' },
]

function checkSpelling(text: string): RawFinding[] {
  const findings: RawFinding[] = []
  const words = text.split(/\s+/)
  let offset = 0
  for (const word of words) {
    const clean = word.replace(/[^a-zA-Z']/g, '').toLowerCase()
    const match = CONFUSED_WORDS[clean]
    if (match) {
      findings.push({
        check_id: 'spelling', category: 'language', severity: 'minor',
        title: `Likely misspelling: "${word}"`,
        explanation: match.explanation,
        location: { type: 'text', start_offset: offset, end_offset: offset + word.length },
        suggested_fix: match.correct, original_text: word,
      })
    }
    offset += word.length + 1
  }
  for (const c of CONFUSABLES) {
    let m
    while ((m = c.pattern.exec(text)) !== null) {
      findings.push({
        check_id: 'spelling', category: 'language', severity: 'info',
        title: c.message, explanation: c.message,
        location: { type: 'text', start_offset: m.index, end_offset: m.index + m[0].length },
        suggested_fix: c.fix, original_text: m[0],
      })
    }
  }
  return findings
}

function checkGrammar(text: string): RawFinding[] {
  const findings: RawFinding[] = []
  const sentences = text.split(/(?<=[.!?])\s+/)
  let offset = 0
  for (const sentence of sentences) {
    if (sentence.length > 2 && /^[a-z]/.test(sentence) && offset > 0) {
      findings.push({
        check_id: 'grammar', category: 'language', severity: 'minor',
        title: 'Sentence starts with lowercase letter',
        explanation: 'Sentences should begin with a capital letter.',
        location: { type: 'text', start_offset: offset, end_offset: offset + 1 },
        suggested_fix: sentence[0].toUpperCase(), original_text: sentence[0],
      })
    }
    if (/  +/.test(sentence)) {
      const m = /  +/.exec(sentence)!
      findings.push({
        check_id: 'grammar', category: 'language', severity: 'info',
        title: 'Multiple consecutive spaces',
        explanation: 'Use a single space between words.',
        location: { type: 'text', start_offset: offset + m.index, end_offset: offset + m.index + m[0].length },
        suggested_fix: ' ', original_text: m[0],
      })
    }
    const repeated = /\b(\w+)\s+\1\b/gi
    let rm
    while ((rm = repeated.exec(sentence)) !== null) {
      findings.push({
        check_id: 'grammar', category: 'language', severity: 'minor',
        title: `Repeated word: "${rm[1]}"`,
        explanation: 'The same word appears twice in a row.',
        location: { type: 'text', start_offset: offset + rm.index, end_offset: offset + rm.index + rm[0].length },
        suggested_fix: rm[1], original_text: rm[0],
      })
    }
    offset += sentence.length + 1
  }
  return findings
}

function checkReadability(text: string): RawFinding[] {
  const findings: RawFinding[] = []
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean)
  if (sentences.length === 0) return findings

  const wordCounts = sentences.map(s => s.split(/\s+/).length)
  const avgWords = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length

  let offset = 0
  for (let i = 0; i < sentences.length; i++) {
    const wc = wordCounts[i]
    if (wc > 50) {
      findings.push({
        check_id: 'readability', category: 'language', severity: 'major',
        title: `Very long sentence (${wc} words)`,
        explanation: 'This sentence is extremely long. Consider breaking it up.',
        location: { type: 'text', start_offset: offset, end_offset: offset + sentences[i].length },
        original_text: sentences[i].slice(0, 80) + '...',
      })
    } else if (wc > 35) {
      findings.push({
        check_id: 'readability', category: 'language', severity: 'minor',
        title: `Long sentence (${wc} words)`,
        explanation: 'Consider breaking this into shorter sentences for clarity.',
        location: { type: 'text', start_offset: offset, end_offset: offset + sentences[i].length },
        original_text: sentences[i].slice(0, 80) + '...',
      })
    }
    offset += sentences[i].length + 1
  }
  if (avgWords > 25) {
    findings.push({
      check_id: 'readability', category: 'language', severity: 'info',
      title: `High average sentence length (${avgWords.toFixed(1)} words)`,
      explanation: 'Shorter sentences improve readability.',
      location: { type: 'text', start_offset: 0, end_offset: Math.min(text.length, 100) },
    })
  }
  return findings
}

function checkFormatting(text: string): RawFinding[] {
  const findings: RawFinding[] = []
  const lines = text.split('\n')
  let offset = 0
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].endsWith('  ') || lines[i].endsWith('\t')) {
      findings.push({
        check_id: 'formatting', category: 'structure', severity: 'info',
        title: 'Trailing whitespace',
        explanation: 'Line has trailing spaces or tabs.',
        location: { type: 'text', start_offset: offset, end_offset: offset + lines[i].length, line: i + 1 },
      })
    }
    if (i > 1 && lines[i] === '' && lines[i - 1] === '' && lines[i - 2] === '') {
      findings.push({
        check_id: 'formatting', category: 'structure', severity: 'info',
        title: 'Multiple consecutive blank lines',
        explanation: 'Consider reducing to one or two blank lines.',
        location: { type: 'text', start_offset: offset, end_offset: offset + 1, line: i + 1 },
      })
    }
    offset += lines[i].length + 1
  }
  return findings
}

export function runAllChecks(text: string): Finding[] {
  const raw = [
    ...checkSpelling(text),
    ...checkGrammar(text),
    ...checkReadability(text),
    ...checkFormatting(text),
  ]

  return raw.map((f, i) => ({
    id: `local-${i}`,
    audit_id: '',
    check_id: f.check_id,
    category: f.category,
    severity: f.severity,
    title: f.title,
    explanation: f.explanation,
    location: f.location,
    suggested_fix: f.suggested_fix ?? null,
    original_text: f.original_text ?? null,
    disposition: 'pending' as const,
    user_comment: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }))
}
