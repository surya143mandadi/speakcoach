import { tokenize, TARGET_WPM } from '../lib/analyze'
import type { SessionRecord } from '../store'
import { Bar, Btn, Card, Chip, ScoreRing, Section } from '../components/ui'

function MetricChips({ rec }: { rec: SessionRecord }) {
  const m = rec.metrics
  const paceTone = m.wpm >= TARGET_WPM[0] && m.wpm <= TARGET_WPM[1] ? 'good' : 'warn'
  return (
    <div className="flex flex-wrap gap-2">
      <Chip tone={paceTone}>{m.wpm} wpm</Chip>
      <Chip tone={m.fillerPer100 <= 2 ? 'good' : m.fillerPer100 <= 4 ? 'warn' : 'bad'}>
        {m.fillerCount} fillers · {m.fillerPer100}/100w
      </Chip>
      <Chip>{m.words} words</Chip>
      <Chip>{Math.round(rec.durationSec / 60)} min</Chip>
      <Chip tone={m.avgSentenceWords <= 22 ? 'good' : 'warn'}>{m.avgSentenceWords} words/sentence</Chip>
      <Chip tone={m.numbersUsed > 0 ? 'good' : 'warn'}>{m.numbersUsed} numbers</Chip>
      <Chip tone={m.longPauses <= 2 ? 'good' : 'warn'}>{m.longPauses} long pauses</Chip>
      <Chip>{Math.round(m.iRatio * 100)}% "I" vs "we"</Chip>
    </div>
  )
}

export default function Report({ rec, onDone, onRetry }: { rec: SessionRecord; onDone: () => void; onRetry: () => void }) {
  const fb = rec.feedback
  const s = rec.scores
  const starr = rec.metrics.starr
  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <div className="mb-1 text-xs uppercase tracking-widest text-white/40">session report</div>
      <h1 className="mb-4 text-xl font-bold">{rec.title}</h1>

      <div className="mb-6 flex items-center gap-5">
        <ScoreRing value={s.overall} />
        <div className="flex-1 space-y-2">
          <Bar label="Fluency" value={s.fluency} />
          <Bar label="Filler control" value={s.fillerControl} />
          <Bar label="Clarity" value={s.clarity} />
          <Bar label="Structure" value={s.structure} />
          <Bar label="Substance" value={s.substance} />
        </div>
      </div>

      {fb?.verdict && (
        <Card className="mb-4 border-brand/30 bg-brand/10">
          <p className="text-sm leading-relaxed">{fb.verdict}</p>
        </Card>
      )}

      <Section title="Measured delivery">
        <MetricChips rec={rec} />
      </Section>

      {rec.kind === 'scenario' && (
        <Section title="STARR coverage">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(starr) as Array<keyof typeof starr>).map((k) => (
              <Chip key={k} tone={starr[k] ? 'good' : 'bad'}>
                {starr[k] ? '✓' : '✗'} {k}
              </Chip>
            ))}
          </div>
        </Section>
      )}

      {fb && fb.strengths.length > 0 && (
        <Section title="What worked">
          <Card>
            <ul className="space-y-2 text-sm text-white/80">
              {fb.strengths.map((x, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-mint">+</span>
                  <span>{x}</span>
                </li>
              ))}
            </ul>
          </Card>
        </Section>
      )}

      {fb && fb.fixes.length > 0 && (
        <Section title="Fix these next">
          <div className="space-y-3">
            {fb.fixes.map((f, i) => (
              <Card key={i}>
                <div className="text-sm text-white/85">{f.issue}</div>
                {f.better && (
                  <div className="mt-2 rounded-lg border border-mint/25 bg-mint/10 px-3 py-2 text-sm text-mint">
                    Say instead: {f.better}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </Section>
      )}

      {fb?.modelAnswer && (
        <Section title="Model answer">
          <Card className="border-brand2/25">
            <p className="text-sm italic leading-relaxed text-white/80">{fb.modelAnswer}</p>
          </Card>
        </Section>
      )}

      {rec.metrics.fillerBreakdown.length > 0 && (
        <Section title="Your filler words">
          <div className="flex flex-wrap gap-2">
            {rec.metrics.fillerBreakdown.map((f) => (
              <Chip key={f.term} tone="bad">
                {f.term} × {f.count}
              </Chip>
            ))}
          </div>
        </Section>
      )}

      <Section title="Transcript">
        <div className="space-y-3">
          {rec.transcript.map((t, i) => (
            <div
              key={i}
              className={`rounded-xl border px-3 py-2 text-sm ${
                t.role === 'user' ? 'border-brand/25 bg-brand/10' : 'border-line bg-panel'
              }`}
            >
              <div className="mb-1 text-[10px] uppercase tracking-widest text-white/35">
                {t.role === 'user' ? 'you' : 'coach'}
              </div>
              {t.role === 'user'
                ? tokenize(t.content).map((tok, j) => (
                    <span
                      key={j}
                      className={
                        tok.kind === 'filler'
                          ? 'rounded bg-rose/25 px-0.5 text-rose'
                          : tok.kind === 'hedge'
                            ? 'rounded bg-amber/20 px-0.5 text-amber'
                            : tok.kind === 'number'
                              ? 'font-semibold text-mint'
                              : ''
                      }
                    >
                      {tok.text}
                    </span>
                  ))
                : t.content}
            </div>
          ))}
        </div>
      </Section>

      {fb?.nextStep && (
        <Card className="mb-4 border-amber/25 bg-amber/5">
          <div className="text-xs uppercase tracking-widest text-amber/70">next session</div>
          <p className="mt-1 text-sm">{fb.nextStep}</p>
        </Card>
      )}

      <div className="flex gap-3">
        <Btn variant="soft" size="lg" onClick={onRetry}>
          Run it again
        </Btn>
        <Btn size="lg" onClick={onDone}>
          Done
        </Btn>
      </div>
    </div>
  )
}
