import { useMemo } from 'react'
import { computeStreak, computeTotals, useApp, type SessionRecord } from '../store'
import { Bar, Btn, Card, Chip, Section, Sparkline } from '../components/ui'
import { TARGET_WPM } from '../lib/analyze'

export default function Progress({ onOpen }: { onOpen: (rec: SessionRecord) => void }) {
  const sessions = useApp((s) => s.sessions)
  const deleteSession = useApp((s) => s.deleteSession)
  const streak = useMemo(() => computeStreak(sessions), [sessions])
  const totals = useMemo(() => computeTotals(sessions), [sessions])

  const scored = useMemo(() => sessions.filter((s) => s.scores.overall > 0), [sessions])
  const chrono = useMemo(() => [...scored].reverse(), [scored])
  const scoreTrend = chrono.slice(-12).map((s) => s.scores.overall)
  const fillerTrend = chrono.slice(-12).map((s) => Math.max(0, 100 - s.metrics.fillerPer100 * 12))

  const avg = (f: (s: SessionRecord) => number) =>
    scored.length ? Math.round(scored.reduce((a, s) => a + f(s), 0) / scored.length) : 0

  if (!sessions.length)
    return (
      <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
        <h1 className="mb-2 text-xl font-bold">Progress</h1>
        <Card>
          <p className="text-sm text-white/60">
            No sessions yet. Finish one practice conversation or drill and your pace, filler rate and structure scores
            start tracking here.
          </p>
        </Card>
      </div>
    )

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <h1 className="mb-4 text-xl font-bold">Progress</h1>

      <div className="mb-5 grid grid-cols-3 gap-3">
        {[
          { v: streak, l: 'day streak' },
          { v: totals.sessions, l: 'sessions' },
          { v: totals.minutes, l: 'minutes' }
        ].map((x) => (
          <Card key={x.l} className="text-center">
            <div className="text-2xl font-bold text-brand2">{x.v}</div>
            <div className="text-[10px] uppercase tracking-widest text-white/40">{x.l}</div>
          </Card>
        ))}
      </div>

      <Section title="Overall score, last 12 sessions">
        <Card>
          <Sparkline values={scoreTrend} />
          <div className="mt-2 text-xs text-white/50">
            Average {totals.avgScore}. {scoreTrend.length > 1 && scoreTrend[scoreTrend.length - 1] >= scoreTrend[0]
              ? 'Trending up.'
              : 'Trending down - shorten answers and slow the first sentence.'}
          </div>
        </Card>
      </Section>

      <Section title="Filler control, last 12 sessions">
        <Card>
          <Sparkline values={fillerTrend} />
          <div className="mt-2 text-xs text-white/50">Average {totals.avgFillerPer100} fillers per 100 words.</div>
        </Card>
      </Section>

      <Section title="Averages by skill">
        <Card className="space-y-2.5">
          <Bar label="Fluency" value={avg((s) => s.scores.fluency)} />
          <Bar label="Filler control" value={avg((s) => s.scores.fillerControl)} />
          <Bar label="Clarity" value={avg((s) => s.scores.clarity)} />
          <Bar label="Structure" value={avg((s) => s.scores.structure)} />
          <Bar label="Substance" value={avg((s) => s.scores.substance)} />
          <div className="pt-1 text-xs text-white/45">
            Pace average {totals.avgWpm} wpm (clear band {TARGET_WPM[0]}-{TARGET_WPM[1]}).
          </div>
        </Card>
      </Section>

      <Section title="History">
        <div className="space-y-2">
          {sessions.map((s) => (
            <Card key={s.id}>
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1" onClick={() => onOpen(s)}>
                  <div className="truncate text-sm font-semibold">{s.title}</div>
                  <div className="text-xs text-white/45">
                    {new Date(s.startedAt).toLocaleString()} · {Math.round(s.durationSec / 60)} min · {s.metrics.words} words
                  </div>
                  <div className="mt-1 flex gap-1.5">
                    <Chip tone={s.scores.overall >= 75 ? 'good' : s.scores.overall >= 55 ? 'warn' : 'bad'}>
                      {s.scores.overall}
                    </Chip>
                    <Chip>{s.metrics.wpm} wpm</Chip>
                    <Chip>{s.metrics.fillerCount} fillers</Chip>
                  </div>
                </div>
                <Btn variant="ghost" size="sm" onClick={() => deleteSession(s.id)}>
                  ✕
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      </Section>
    </div>
  )
}
