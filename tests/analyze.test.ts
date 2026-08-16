import { describe, expect, it } from 'bun:test'
import {
  analyze,
  countPhrase,
  countRepeatedRuns,
  localFixes,
  readAccuracy,
  score,
  splitSentences,
  tokenize,
  wordList
} from '../src/lib/analyze'
import { computeStreak, computeTotals, type SessionRecord } from '../src/store'
import { offlineFeedback, offlineReply, isAiReady, buildSystemPrompt } from '../src/lib/coach'
import { SCENARIOS, scenarioById } from '../src/data/scenarios'
import { avatarById, AVATARS } from '../src/data/avatars'
import { DRILLS } from '../src/data/drills'

const chunk = (text: string, atMs: number, durMs: number) => ({ text, atMs, durMs })

describe('word helpers', () => {
  it('counts whole-word phrases only', () => {
    expect(countPhrase('i like it, i really like liking things', 'like')).toBe(2)
    expect(countPhrase('you know what i mean, you know', 'you know')).toBe(2)
  })

  it('splits sentences and ignores empties', () => {
    expect(splitSentences('One. Two! Three?  ')).toHaveLength(3)
    expect(splitSentences('   ')).toHaveLength(0)
  })

  it('detects stutter repetition but ignores single letters', () => {
    expect(countRepeatedRuns(wordList('the the the plan was was fine'))).toBe(2)
    expect(countRepeatedRuns(wordList('a a plan'))).toBe(0)
  })
})

describe('analyze', () => {
  it('computes pace, fillers and pauses', () => {
    const m = analyze([
      chunk('um so basically we had a problem with the dock', 0, 4000),
      chunk('i mean the trailers were late by twenty minutes', 8000, 4000)
    ])
    expect(m.words).toBe(19)
    expect(m.fillerCount).toBeGreaterThanOrEqual(3)
    expect(m.wpm).toBeGreaterThan(100)
    expect(m.longPauses).toBe(1)
    expect(m.numbersUsed).toBe(0)
  })

  it('finds numbers, signposts and STARR signals', () => {
    const m = analyze([
      chunk('Last year at the site my role was to fix late departures.', 0, 5000),
      chunk('First I dug into the data, then I coached the team.', 6000, 5000),
      chunk('As a result late departures went from 14 percent to 3 percent, and I learned to check the source data early.', 12000, 8000)
    ])
    expect(m.numbersUsed).toBe(2)
    expect(m.signposts).toBeGreaterThan(2)
    expect(m.starr.situation).toBe(true)
    expect(m.starr.result).toBe(true)
    expect(m.starr.reflection).toBe(true)
    expect(m.starrScore).toBeGreaterThan(0.6)
  })

  it('returns a zero score for near-silent sessions', () => {
    const s = score(analyze([chunk('yes', 0, 500)]))
    expect(s.overall).toBe(0)
  })

  it('scores a clean structured answer above a rambling filler-heavy one', () => {
    const good = analyze([
      chunk('The headline is we missed dispatch by 3 loads because of a late inbound.', 0, 4200),
      chunk('First I checked the yard report, then I moved two associates to the dock.', 5000, 4200),
      chunk('As a result we recovered 2 of the 3 loads and I now check the yard at 6 pm.', 10000, 4600)
    ])
    const bad = analyze([
      chunk('um so like basically you know the thing is um we sort of had issues', 0, 5000),
      chunk('and like i mean it was kind of just really really bad stuff you know', 12000, 5000)
    ])
    const gs = score(good, { expectStarr: true })
    const bs = score(bad, { expectStarr: true })
    expect(gs.overall).toBeGreaterThan(bs.overall + 15)
    expect(gs.fillerControl).toBeGreaterThan(bs.fillerControl)
    expect(bs.fillerControl).toBeLessThan(60)
  })

  it('penalises very fast speech', () => {
    const words = Array.from({ length: 60 }, () => 'word').join(' ')
    const fast = score(analyze([chunk(words, 0, 12000)]))
    const okPace = score(analyze([chunk(words, 0, 28000)]))
    expect(fast.fluency).toBeLessThan(okPace.fluency)
  })
})

describe('tokenize + read accuracy', () => {
  it('flags fillers, hedges and numbers', () => {
    const kinds = tokenize('um we just hit 94% today').map((t) => t.kind)
    expect(kinds).toContain('filler')
    expect(kinds).toContain('hedge')
    expect(kinds).toContain('number')
  })

  it('scores read-aloud accuracy and lists missed words', () => {
    const r = readAccuracy('the packed loads left the docks on time', 'the packed loads left the docks')
    expect(r.accuracy).toBeLessThan(100)
    expect(r.missed).toContain('time')
    const perfect = readAccuracy('red lorry yellow lorry', 'red lorry yellow lorry')
    expect(perfect.accuracy).toBe(100)
  })
})

describe('local coaching', () => {
  it('names the filler problem with numbers', () => {
    const m = analyze([chunk('um um um like like basically we had a problem you know', 0, 4000)])
    const fixes = localFixes(m, ['fillers'])
    expect(fixes.join(' ')).toMatch(/filler/i)
  })

  it('offline feedback always returns something usable', () => {
    const fb = offlineFeedback(SCENARIOS[0], analyze([chunk('we improved the metric by 4 percent last month', 0, 3000)]))
    expect(fb.strengths.length).toBeGreaterThan(0)
    expect(fb.nextStep.length).toBeGreaterThan(0)
  })

  it('offline coach asks for numbers when substance is the focus', () => {
    const scenario = scenarioById('bar-raiser')
    const long = Array.from({ length: 40 }, () => 'detail').join(' ')
    expect(offlineReply(scenario, 1, long)).toMatch(/number|metric/i)
  })

  it('offline coach walks the scripted questions in order', () => {
    const s = scenarioById('lp-loop')
    expect(offlineReply(s, 0, '')).toBe(s.offlineQuestions[0])
  })
})

describe('provider config', () => {
  it('requires a key and model for anthropic', () => {
    expect(isAiReady({ provider: 'anthropic', apiKey: '', model: '', endpoint: '' })).toBe(false)
    expect(isAiReady({ provider: 'anthropic', apiKey: 'k', model: 'm', endpoint: '' })).toBe(true)
    expect(isAiReady({ provider: 'offline', apiKey: 'k', model: 'm', endpoint: '' })).toBe(false)
  })

  it('builds a spoken-style system prompt in character', () => {
    const p = buildSystemPrompt({
      scenario: scenarioById('bar-raiser'),
      avatar: avatarById('alex'),
      level: 'B2',
      strictness: 'tough',
      language: 'English (Australian)'
    })
    expect(p).toMatch(/Alex/)
    expect(p).toMatch(/no markdown/i)
    expect(p).toMatch(/English \(Australian\)/)
  })
})

describe('content integrity', () => {
  it('every scenario is complete and points at a real avatar', () => {
    for (const s of SCENARIOS) {
      expect(s.opening.length).toBeGreaterThan(20)
      expect(s.goals.length).toBeGreaterThanOrEqual(3)
      expect(s.offlineQuestions.length).toBeGreaterThanOrEqual(3)
      expect(AVATARS.some((a) => a.id === s.avatarId)).toBe(true)
    }
    expect(new Set(SCENARIOS.map((s) => s.id)).size).toBe(SCENARIOS.length)
  })

  it('every drill has either a target or a prompt', () => {
    for (const d of DRILLS) {
      expect(Boolean(d.target || d.prompt)).toBe(true)
      expect(d.seconds).toBeGreaterThan(20)
    }
  })
})

const rec = (iso: string, overall = 70, words = 200): SessionRecord => ({
  id: iso,
  startedAt: iso,
  kind: 'scenario',
  refId: 'lp-loop',
  title: 'x',
  avatarId: 'maya',
  durationSec: 600,
  metrics: { ...analyze([chunk('word '.repeat(words), 0, 60000)]) },
  scores: { fluency: 70, fillerControl: 70, clarity: 70, structure: 70, substance: 70, overall },
  transcript: [],
  feedback: null
})

describe('streaks and totals', () => {
  it('counts consecutive days including a gap-free yesterday', () => {
    const today = new Date('2026-08-14T09:00:00Z')
    const list = [rec('2026-08-14T08:00:00Z'), rec('2026-08-13T08:00:00Z'), rec('2026-08-11T08:00:00Z')]
    expect(computeStreak(list, today)).toBe(2)
  })

  it('keeps the streak alive before today is practised', () => {
    const today = new Date('2026-08-14T09:00:00Z')
    expect(computeStreak([rec('2026-08-13T08:00:00Z'), rec('2026-08-12T08:00:00Z')], today)).toBe(2)
  })

  it('groups sessions by local calendar day, not UTC', () => {
    // 8am and 8pm local on consecutive local days: under UTC grouping these collapse
    // into one day for any timezone ahead of UTC (Melbourne is UTC+10/+11).
    const yesterdayEvening = new Date(2026, 7, 13, 20, 30)
    const todayMorning = new Date(2026, 7, 14, 8, 15)
    const now = new Date(2026, 7, 14, 9, 0)
    const list = [rec(todayMorning.toISOString()), rec(yesterdayEvening.toISOString())]
    expect(computeStreak(list, now)).toBe(2)
    expect(computeTotals(list, now).todayMinutes).toBe(10)
  })

  it('returns zero with no sessions', () => {
    expect(computeStreak([], new Date())).toBe(0)
    expect(computeTotals([]).sessions).toBe(0)
  })

  it('aggregates minutes and averages', () => {
    const t = computeTotals([rec('2026-08-14T08:00:00Z', 80), rec('2026-08-13T08:00:00Z', 60)], new Date('2026-08-14T09:00:00Z'))
    expect(t.sessions).toBe(2)
    expect(t.minutes).toBe(20)
    expect(t.avgScore).toBe(70)
    expect(t.todayMinutes).toBe(10)
  })
})
