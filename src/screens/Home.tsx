import { useMemo, useState } from 'react'
import { AVATARS, avatarById } from '../data/avatars'
import { CATEGORY_META, SCENARIOS, type Category, type Scenario } from '../data/scenarios'
import { computeStreak, computeTotals, useApp } from '../store'
import { Btn, Card, Chip, Section } from '../components/ui'
import { isAiReady } from '../lib/coach'

const CATS: Category[] = ['interview', 'work', 'everyday', 'presenting']

function Dots({ n }: { n: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3].map((i) => (
        <span key={i} className={`h-1.5 w-1.5 rounded-full ${i <= n ? 'bg-brand2' : 'bg-white/15'}`} />
      ))}
    </span>
  )
}

function Sheet({
  scenario,
  onClose,
  onStart
}: {
  scenario: Scenario
  onClose: () => void
  onStart: (s: Scenario) => void
}) {
  const [avatarId, setAvatarId] = useState(scenario.avatarId)
  const avatar = avatarById(avatarId)
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[88dvh] w-full animate-rise overflow-y-auto rounded-t-3xl border-t border-line bg-ink p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
        <div className="mb-1 flex items-center gap-2 text-xs text-white/40">
          <span>{CATEGORY_META[scenario.category].label}</span>
          <span>·</span>
          <span>{scenario.minutes} min</span>
          <Dots n={scenario.difficulty} />
        </div>
        <h2 className="text-lg font-bold">{scenario.title}</h2>
        <p className="mt-1 text-sm text-white/60">{scenario.blurb}</p>

        <div className="mt-4">
          <div className="mb-2 text-xs uppercase tracking-widest text-white/40">what a strong answer needs</div>
          <ul className="space-y-1.5 text-sm text-white/75">
            {scenario.goals.map((g) => (
              <li key={g} className="flex gap-2">
                <span className="text-brand2">·</span>
                <span>{g}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5">
          <div className="mb-2 text-xs uppercase tracking-widest text-white/40">your partner</div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {AVATARS.map((a) => (
              <button
                key={a.id}
                onClick={() => setAvatarId(a.id)}
                className={`flex min-w-[104px] flex-col items-center rounded-xl border px-3 py-2.5 ${
                  a.id === avatarId ? 'border-brand bg-brand/15' : 'border-line bg-panel'
                }`}
              >
                <span
                  className="mb-1 flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
                  style={{ background: `radial-gradient(circle at 30% 25%, ${a.color}, #2b1a4d 75%)` }}
                >
                  {a.emojiFallback}
                </span>
                <span className="text-xs font-semibold">{a.name}</span>
                <span className="text-[10px] text-white/40">{a.accent}</span>
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-white/45">{avatar.backstory}</p>
        </div>

        <div className="mt-5 flex gap-3">
          <Btn variant="soft" size="lg" onClick={onClose}>
            Back
          </Btn>
          <Btn size="lg" onClick={() => onStart({ ...scenario, avatarId })}>
            Start
          </Btn>
        </div>
      </div>
    </div>
  )
}

export default function Home({ onStart }: { onStart: (s: Scenario) => void }) {
  const { settings, sessions } = useApp()
  const [cat, setCat] = useState<Category>('interview')
  const [sheet, setSheet] = useState<Scenario | null>(null)

  const streak = useMemo(() => computeStreak(sessions), [sessions])
  const totals = useMemo(() => computeTotals(sessions), [sessions])
  const aiOn = isAiReady(settings)

  const weakest = useMemo(() => {
    const scored = sessions.filter((s) => s.scores.overall > 0).slice(0, 10)
    if (!scored.length) return null
    const keys = ['fluency', 'fillerControl', 'clarity', 'structure', 'substance'] as const
    const avgs = keys.map((k) => ({ k, v: scored.reduce((a, s) => a + s.scores[k], 0) / scored.length }))
    return avgs.sort((a, b) => a.v - b.v)[0]
  }, [sessions])

  const recommended = useMemo(() => {
    if (!weakest) return SCENARIOS.find((s) => s.id === 'tell-me-about-yourself')!
    const map: Record<string, string> = {
      fillerControl: 'sixty-seconds',
      fluency: 'impromptu',
      clarity: 'explain-job',
      structure: 'escalation',
      substance: 'bar-raiser'
    }
    return SCENARIOS.find((s) => s.id === map[weakest.k]) ?? SCENARIOS[0]
  }, [weakest])

  const list = SCENARIOS.filter((s) => s.category === cat)
  const goalPct = Math.min(100, Math.round((totals.todayMinutes / Math.max(1, settings.dailyGoalMin)) * 100))

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-white/40">SpeakCoach</div>
          <h1 className="text-2xl font-bold">
            {settings.name ? `Ready, ${settings.name}?` : 'Ready to talk?'}
          </h1>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-brand2">{streak}</div>
          <div className="text-[10px] uppercase tracking-widest text-white/40">day streak</div>
        </div>
      </div>

      <Card className="mb-5">
        <div className="mb-2 flex items-baseline justify-between text-sm">
          <span className="text-white/70">
            Today: {totals.todayMinutes} of {settings.dailyGoalMin} min
          </span>
          <span className="text-white/40">{goalPct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-panel2">
          <div className="h-full rounded-full bg-gradient-to-r from-brand to-brand2" style={{ width: `${goalPct}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip>{totals.sessions} sessions</Chip>
          <Chip>{totals.minutes} min total</Chip>
          {totals.avgScore > 0 && <Chip tone={totals.avgScore >= 75 ? 'good' : 'warn'}>avg {totals.avgScore}</Chip>}
          <Chip tone={aiOn ? 'good' : 'warn'}>{aiOn ? 'AI coach on' : 'offline coach'}</Chip>
        </div>
      </Card>

      <Section title={weakest ? `Recommended · weakest area: ${weakest.k}` : 'Start here'}>
        <Card onClick={() => setSheet(recommended)} className="border-brand/40 bg-gradient-to-br from-brand/20 to-transparent">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">{recommended.title}</div>
              <div className="mt-0.5 text-xs text-white/55">{recommended.blurb}</div>
            </div>
            <span className="ml-3 rounded-full bg-white/10 px-3 py-1.5 text-xs">{recommended.minutes} min</span>
          </div>
        </Card>
      </Section>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm ${
              c === cat ? 'border-brand bg-brand/20 text-white' : 'border-line bg-panel text-white/60'
            }`}
          >
            {CATEGORY_META[c].label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {list.map((s) => {
          const a = avatarById(s.avatarId)
          return (
            <Card key={s.id} onClick={() => setSheet(s)}>
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                  style={{ background: `radial-gradient(circle at 30% 25%, ${a.color}, #2b1a4d 75%)` }}
                >
                  {a.emojiFallback}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{s.title}</div>
                  <div className="truncate text-xs text-white/50">{s.blurb}</div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-white/40">
                    <span>{a.name}</span>
                    <span>·</span>
                    <span>{s.minutes} min</span>
                    <Dots n={s.difficulty} />
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {sheet && <Sheet scenario={sheet} onClose={() => setSheet(null)} onStart={onStart} />}
    </div>
  )
}
