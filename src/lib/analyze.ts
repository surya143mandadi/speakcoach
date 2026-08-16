/**
 * Local speech analytics. Pure functions, no network: this is what makes the app
 * useful even with no API key configured.
 */

export interface SpokenChunk {
  text: string
  /** ms since session start when this chunk was finalised */
  atMs: number
  /** ms of speech the chunk covers (estimated from recogniser timings) */
  durMs: number
}

export const FILLERS = [
  'um',
  'uh',
  'umm',
  'uhh',
  'er',
  'erm',
  'ah',
  'hmm',
  'like',
  'basically',
  'actually',
  'literally',
  'obviously',
  'yeah',
  'okay so',
  'you know',
  'i mean',
  'sort of',
  'kind of',
  'as such'
] as const

export const HEDGES = [
  'i think maybe',
  'i guess',
  'probably',
  'sort of',
  'kind of',
  'a little bit',
  'just',
  'hopefully',
  'i would say',
  'i suppose',
  'more or less'
] as const

const STARR_SIGNALS: Record<'situation' | 'task' | 'action' | 'result' | 'reflection', string[]> = {
  situation: ['last year', 'at the time', 'we had', 'the site', 'context', 'background', 'when i was', 'during'],
  task: ['my role', 'i was responsible', 'my target', 'i had to', 'the goal', 'i was asked', 'my job was'],
  action: ['i did', 'i decided', 'i built', 'i ran', 'i spoke', 'i changed', 'i created', 'i led', 'first i', 'then i', 'i escalated', 'i coached', 'i implemented'],
  result: ['as a result', 'the result', 'we went from', 'improved', 'reduced', 'increased', 'saved', 'ended up', 'finished at', 'percent', '%'],
  reflection: ['i learned', 'what i took away', 'since then', 'i now', 'next time', 'looking back', 'i changed how']
}

const SIGNPOSTS = [
  'first',
  'second',
  'third',
  'to start',
  'then',
  'after that',
  'finally',
  'in summary',
  'the headline is',
  'the key point',
  'so the outcome',
  'my recommendation',
  'the ask is',
  'as a result',
  'the result was',
  'because',
  'for example'
]

const WEAK = ['very', 'really', 'quite', 'stuff', 'things', 'a lot of', 'etcetera', 'et cetera', 'whatever']

export interface SpeechMetrics {
  words: number
  speakingSeconds: number
  wallSeconds: number
  wpm: number
  fillerCount: number
  fillerPer100: number
  fillerBreakdown: Array<{ term: string; count: number }>
  hedgeCount: number
  weakCount: number
  repeatedWordRuns: number
  sentences: number
  avgSentenceWords: number
  longestSentenceWords: number
  vocabDiversity: number
  longPauses: number
  numbersUsed: number
  signposts: number
  starr: Record<keyof typeof STARR_SIGNALS, boolean>
  starrScore: number
  iRatio: number
}

export interface ScoreBreakdown {
  fluency: number
  fillerControl: number
  clarity: number
  structure: number
  substance: number
  overall: number
}

export const TARGET_WPM: [number, number] = [115, 155]

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9%.\s']/g, ' ').replace(/\s+/g, ' ').trim()

export function countPhrase(haystack: string, phrase: string): number {
  if (!phrase) return 0
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const boundaryStart = /^[a-z0-9]/.test(phrase) ? '\\b' : ''
  const boundaryEnd = /[a-z0-9]$/.test(phrase) ? '\\b' : ''
  const re = new RegExp(`${boundaryStart}${escaped}${boundaryEnd}`, 'g')
  return (haystack.match(re) ?? []).length
}

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.replace(/[^a-z0-9]/gi, '').length > 0)
}

export function wordList(text: string): string[] {
  return norm(text).split(' ').filter(Boolean)
}

/** Immediate stutter-style repetition: "the the", "I I I" */
export function countRepeatedRuns(words: string[]): number {
  let runs = 0
  for (let i = 1; i < words.length; i++) {
    if (words[i] === words[i - 1] && words[i].length > 1) {
      runs++
      while (i + 1 < words.length && words[i + 1] === words[i]) i++
    }
  }
  return runs
}

export function analyze(chunks: SpokenChunk[], opts?: { pauseThresholdMs?: number }): SpeechMetrics {
  const pauseThreshold = opts?.pauseThresholdMs ?? 1800
  const joined = chunks.map((c) => c.text.trim()).filter(Boolean).join(' ')
  const lower = norm(joined)
  const words = wordList(joined)
  const wordCount = words.length

  const speakingMs = chunks.reduce((a, c) => a + Math.max(0, c.durMs), 0)
  const speakingSeconds = Math.max(0.001, speakingMs / 1000)
  const first = chunks[0]
  const last = chunks[chunks.length - 1]
  const wallSeconds = chunks.length ? Math.max(speakingSeconds, (last.atMs + last.durMs - first.atMs) / 1000) : 0

  let longPauses = 0
  for (let i = 1; i < chunks.length; i++) {
    const gap = chunks[i].atMs - (chunks[i - 1].atMs + chunks[i - 1].durMs)
    if (gap >= pauseThreshold) longPauses++
  }

  const fillerBreakdown = FILLERS.map((term) => ({ term, count: countPhrase(lower, term) })).filter(
    (f) => f.count > 0
  )
  const fillerCount = fillerBreakdown.reduce((a, f) => a + f.count, 0)
  const hedgeCount = HEDGES.reduce((a, h) => a + countPhrase(lower, h), 0)
  const weakCount = WEAK.reduce((a, w) => a + countPhrase(lower, w), 0)

  const sentences = splitSentences(joined)
  const sentenceWordCounts = sentences.map((s) => wordList(s).length)
  const avgSentenceWords = sentenceWordCounts.length
    ? sentenceWordCounts.reduce((a, b) => a + b, 0) / sentenceWordCounts.length
    : wordCount
  const longestSentenceWords = sentenceWordCounts.length ? Math.max(...sentenceWordCounts) : wordCount

  const unique = new Set(words.filter((w) => w.length > 2))
  const vocabDiversity = wordCount ? unique.size / wordCount : 0

  const numbersUsed = (joined.match(/\b\d+([.,]\d+)?\s?%?\b/g) ?? []).length
  const signposts = SIGNPOSTS.reduce((a, s) => a + countPhrase(lower, s), 0)

  const starr = Object.fromEntries(
    (Object.keys(STARR_SIGNALS) as Array<keyof typeof STARR_SIGNALS>).map((k) => [
      k,
      STARR_SIGNALS[k].some((sig) => countPhrase(lower, sig) > 0)
    ])
  ) as Record<keyof typeof STARR_SIGNALS, boolean>
  const starrScore = Object.values(starr).filter(Boolean).length / 5

  const iCount = countPhrase(lower, 'i') + countPhrase(lower, "i'd") + countPhrase(lower, "i've")
  const weCount = countPhrase(lower, 'we') + countPhrase(lower, "we've") + countPhrase(lower, 'our')
  const iRatio = iCount + weCount === 0 ? 0.5 : iCount / (iCount + weCount)

  return {
    words: wordCount,
    speakingSeconds: Math.round(speakingSeconds * 10) / 10,
    wallSeconds: Math.round(wallSeconds * 10) / 10,
    wpm: Math.round((wordCount / speakingSeconds) * 60),
    fillerCount,
    fillerPer100: wordCount ? Math.round((fillerCount / wordCount) * 1000) / 10 : 0,
    fillerBreakdown: fillerBreakdown.sort((a, b) => b.count - a.count),
    hedgeCount,
    weakCount,
    repeatedWordRuns: countRepeatedRuns(words),
    sentences: sentences.length,
    avgSentenceWords: Math.round(avgSentenceWords * 10) / 10,
    longestSentenceWords,
    vocabDiversity: Math.round(vocabDiversity * 1000) / 1000,
    longPauses,
    numbersUsed,
    signposts,
    starr,
    starrScore,
    iRatio: Math.round(iRatio * 100) / 100
  }
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)))

export function score(m: SpeechMetrics, opts?: { expectStarr?: boolean }): ScoreBreakdown {
  if (m.words < 12) {
    return { fluency: 0, fillerControl: 0, clarity: 0, structure: 0, substance: 0, overall: 0 }
  }
  const [lo, hi] = TARGET_WPM
  const wpmPenalty = m.wpm < lo ? (lo - m.wpm) * 1.1 : m.wpm > hi ? (m.wpm - hi) * 1.3 : 0
  const pausePenalty = (m.longPauses / Math.max(1, m.speakingSeconds / 30)) * 9
  const fluency = clamp(100 - wpmPenalty - pausePenalty - m.repeatedWordRuns * 3)

  const fillerControl = clamp(100 - m.fillerPer100 * 11 - m.repeatedWordRuns * 2)

  const lenPenalty =
    m.avgSentenceWords > 24 ? (m.avgSentenceWords - 24) * 3 : m.avgSentenceWords < 7 ? (7 - m.avgSentenceWords) * 4 : 0
  const clarity = clamp(
    100 - lenPenalty - Math.max(0, m.longestSentenceWords - 45) * 1.2 - m.weakCount * 2.5 - m.hedgeCount * 2
  )

  const signpostRate = m.signposts / Math.max(1, m.words / 60)
  const structureBase = 45 + Math.min(35, signpostRate * 18)
  const structure = clamp(structureBase + (opts?.expectStarr ? m.starrScore * 25 : 20))

  const numberRate = m.numbersUsed / Math.max(1, m.words / 100)
  const substance = clamp(
    40 + Math.min(30, numberRate * 14) + Math.min(20, m.vocabDiversity * 55) + (m.iRatio > 0.35 ? 10 : 0)
  )

  const overall = clamp(fluency * 0.22 + fillerControl * 0.24 + clarity * 0.22 + structure * 0.16 + substance * 0.16)
  return { fluency, fillerControl, clarity, structure, substance, overall }
}

export interface Token {
  text: string
  kind: 'plain' | 'filler' | 'hedge' | 'number'
}

/** Tokenise a transcript for highlighted rendering in the report. */
export function tokenize(text: string): Token[] {
  const fillerSet = new Set<string>(FILLERS.filter((f) => !f.includes(' ')))
  const hedgeSet = new Set<string>(['just', 'probably', 'hopefully', 'maybe'])
  return text.split(/(\s+)/).map((raw) => {
    const bare = raw.toLowerCase().replace(/[^a-z0-9%']/g, '')
    if (!bare) return { text: raw, kind: 'plain' as const }
    if (fillerSet.has(bare)) return { text: raw, kind: 'filler' as const }
    if (hedgeSet.has(bare)) return { text: raw, kind: 'hedge' as const }
    if (/^\d+([.,]\d+)?%?$/.test(bare)) return { text: raw, kind: 'number' as const }
    return { text: raw, kind: 'plain' as const }
  })
}

/** Word-level accuracy for read-aloud drills. */
export function readAccuracy(target: string, spoken: string): { accuracy: number; missed: string[] } {
  const t = wordList(target)
  const s = new Set(wordList(spoken))
  const missed = t.filter((w) => !s.has(w))
  const accuracy = t.length ? Math.round(((t.length - missed.length) / t.length) * 100) : 0
  return { accuracy, missed }
}

/** Rule-based coaching notes, used offline and as a floor for AI feedback. */
export function localFixes(m: SpeechMetrics, focus: string[]): string[] {
  const out: string[] = []
  if (m.fillerPer100 > 3)
    out.push(
      `You used ${m.fillerCount} filler words (${m.fillerPer100} per 100 words). Replace them with a one-second silent pause: silence reads as confidence, "um" reads as searching.`
    )
  if (m.wpm > TARGET_WPM[1])
    out.push(`Your pace was ${m.wpm} words per minute, above the clear band of 115-155. Slow the first sentence of every answer deliberately, the rest follows.`)
  if (m.wpm && m.wpm < TARGET_WPM[0])
    out.push(`Your pace was ${m.wpm} words per minute, below the natural band. Speak in slightly longer phrases and cut the gaps between them.`)
  if (m.avgSentenceWords > 24)
    out.push(`Your average sentence ran ${m.avgSentenceWords} words. Aim for 12-18: one idea, full stop, next idea.`)
  if (m.numbersUsed === 0 && (focus.includes('substance') || focus.includes('structure')))
    out.push('You used no numbers. Every claim about performance needs a figure attached, or it sounds like an opinion.')
  if (m.signposts < 2)
    out.push('Add signposting: "first", "the result was", "my recommendation is". Listeners follow structure, not content.')
  if (m.iRatio < 0.3)
    out.push(`You said "we" far more than "I" (${Math.round(m.iRatio * 100)}% I). In interviews, be explicit about your own actions.`)
  if (m.hedgeCount > 3)
    out.push(`You hedged ${m.hedgeCount} times ("just", "probably", "I guess"). Cut the hedges and the same sentence sounds decisive.`)
  if (m.longPauses > 3)
    out.push(`${m.longPauses} long pauses broke your flow. Plan your first sentence before you start talking.`)
  if (!out.length) out.push('Clean delivery. Next step is raising difficulty: harder scenario, shorter answers, tighter time limits.')
  return out.slice(0, 5)
}
