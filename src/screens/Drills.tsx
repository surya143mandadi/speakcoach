import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DRILLS, type Drill } from '../data/drills'
import { analyze, readAccuracy, score, TARGET_WPM, type SpokenChunk } from '../lib/analyze'
import { Recognizer, sttSupported } from '../lib/speech'
import { useApp, type SessionRecord } from '../store'
import { Bar, Btn, Card, Chip, Section } from '../components/ui'

interface DrillResult {
  wpm: number
  fillerCount: number
  words: number
  accuracy?: number
  missed?: string[]
  overall: number
}

function Runner({ drill, onClose }: { drill: Drill; onClose: () => void }) {
  const settings = useApp((s) => s.settings)
  const addSession = useApp((s) => s.addSession)
  const [running, setRunning] = useState(false)
  const [left, setLeft] = useState(drill.seconds)
  const [live, setLive] = useState('')
  const [result, setResult] = useState<DrillResult | null>(null)
  const [error, setError] = useState('')
  const chunks = useRef<SpokenChunk[]>([])
  const recRef = useRef<Recognizer | null>(null)
  const startedAt = useRef(Date.now())

  const spoken = useMemo(() => chunks.current.map((c) => c.text).join(' '), [live, result])
  const liveMetrics = useMemo(() => analyze(chunks.current), [live, result])

  const stop = useCallback(() => {
    recRef.current?.stop()
    setRunning(false)
    const metrics = analyze(chunks.current)
    const sc = score(metrics)
    const text = chunks.current.map((c) => c.text).join(' ')
    const acc = drill.target ? readAccuracy(drill.target, text) : null
    const res: DrillResult = {
      wpm: metrics.wpm,
      fillerCount: metrics.fillerCount,
      words: metrics.words,
      accuracy: acc?.accuracy,
      missed: acc?.missed.slice(0, 12),
      overall: sc.overall
    }
    setResult(res)
    const rec: SessionRecord = {
      id: `${Date.now()}`,
      startedAt: new Date(startedAt.current).toISOString(),
      kind: 'drill',
      refId: drill.id,
      title: `Drill: ${drill.title}`,
      avatarId: 'charlotte',
      durationSec: Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)),
      metrics,
      scores: sc,
      transcript: [{ role: 'user', content: text }],
      feedback: null,
      drill: { accuracy: acc?.accuracy, missed: acc?.missed.slice(0, 12) }
    }
    if (metrics.words >= 5) addSession(rec)
  }, [addSession, drill])

  useEffect(() => {
    chunks.current = [] // language switch creates a new recogniser, so drop stale speech
    const rec = new Recognizer(settings.language, {
      onPartial: (t) => setLive(t),
      onFinal: (text, atMs, durMs) => {
        chunks.current = [...chunks.current, { text, atMs, durMs }]
        setLive('')
      },
      onError: (code) => setError(code === 'unsupported' ? 'Speech recognition needs Chrome or Edge.' : `Speech error: ${code}`)
    })
    recRef.current = rec
    return () => rec.stop()
  }, [settings.language])

  useEffect(() => {
    if (!running) return
    if (left <= 0) {
      stop()
      return
    }
    const t = window.setTimeout(() => setLeft((l) => l - 1), 1000)
    return () => window.clearTimeout(t)
  }, [running, left, stop])

  const start = () => {
    chunks.current = []
    setResult(null)
    setLive('')
    setLeft(drill.seconds)
    startedAt.current = Date.now()
    recRef.current?.resetClock()
    recRef.current?.start()
    setRunning(true)
  }

  const pct = Math.round(((drill.seconds - left) / drill.seconds) * 100)

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/75 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[92dvh] w-full animate-rise overflow-y-auto rounded-t-3xl border-t border-line bg-ink p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
        <h2 className="text-lg font-bold">{drill.title}</h2>
        <p className="mt-1 text-sm text-white/60">{drill.blurb}</p>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-3xl font-bold tabular-nums">
            {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
          </span>
          <div className="flex gap-2">
            <Chip tone={liveMetrics.fillerCount > 2 ? 'bad' : 'good'}>{liveMetrics.fillerCount} fillers</Chip>
            <Chip>{liveMetrics.words} words</Chip>
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-panel2">
          <div className="h-full bg-gradient-to-r from-brand to-brand2" style={{ width: `${pct}%` }} />
        </div>

        {drill.target && (
          <Card className="mt-4">
            <div className="mb-1 text-[10px] uppercase tracking-widest text-white/40">read this out loud</div>
            <p className="text-base leading-relaxed">{drill.target}</p>
          </Card>
        )}
        {drill.prompt && (
          <Card className="mt-4 border-brand/30 bg-brand/10">
            <div className="mb-1 text-[10px] uppercase tracking-widest text-white/40">speak about this</div>
            <p className="text-base leading-relaxed">{drill.prompt}</p>
          </Card>
        )}

        <div className="mt-3 rounded-xl border border-amber/25 bg-amber/5 px-3 py-2 text-xs text-amber/90">{drill.tip}</div>

        {(live || spoken) && !result && (
          <div className="mt-3 max-h-32 overflow-y-auto rounded-xl border border-line bg-panel px-3 py-2 text-sm text-white/70">
            {spoken} <span className="text-white/40">{live}</span>
          </div>
        )}

        {error && <div className="mt-3 rounded-xl border border-rose/30 bg-rose/10 px-3 py-2 text-xs text-rose">{error}</div>}

        {result && (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {result.accuracy !== undefined && (
                <Chip tone={result.accuracy >= 90 ? 'good' : result.accuracy >= 75 ? 'warn' : 'bad'}>
                  {result.accuracy}% words hit
                </Chip>
              )}
              <Chip tone={result.wpm >= TARGET_WPM[0] && result.wpm <= TARGET_WPM[1] ? 'good' : 'warn'}>{result.wpm} wpm</Chip>
              <Chip tone={result.fillerCount === 0 ? 'good' : result.fillerCount <= 2 ? 'warn' : 'bad'}>
                {result.fillerCount} fillers
              </Chip>
              <Chip>{result.words} words</Chip>
            </div>
            <Bar label="Delivery score" value={result.overall} />
            {result.missed && result.missed.length > 0 && (
              <div className="text-xs text-white/55">
                Words the recogniser did not hear clearly: <span className="text-rose">{result.missed.join(', ')}</span>
              </div>
            )}
            {drill.kind === 'fillerFree' && (
              <div className="text-xs text-white/55">
                {result.fillerCount === 0
                  ? 'Clean run. Repeat it on a harder topic.'
                  : 'Run it again and pause instead of filling. Aim for zero.'}
              </div>
            )}
          </div>
        )}

        <div className="mt-5 flex gap-3">
          <Btn variant="soft" size="lg" onClick={onClose}>
            Close
          </Btn>
          {running ? (
            <Btn size="lg" onClick={stop}>
              Stop & score
            </Btn>
          ) : (
            <Btn size="lg" onClick={start}>
              {result ? 'Run again' : 'Start drill'}
            </Btn>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Drills() {
  const [open, setOpen] = useState<Drill | null>(null)
  const groups: Array<{ label: string; items: Drill[] }> = [
    { label: 'Articulation and clarity', items: DRILLS.filter((d) => d.kind === 'readAloud') },
    { label: 'Pace control', items: DRILLS.filter((d) => d.kind === 'pace') },
    { label: 'Filler elimination', items: DRILLS.filter((d) => d.kind === 'fillerFree') },
    { label: 'Structure under time pressure', items: DRILLS.filter((d) => d.kind === 'timed') }
  ]
  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <h1 className="mb-1 text-xl font-bold">Drills</h1>
      <p className="mb-5 text-sm text-white/55">
        Short, measurable reps. No AI key needed - scoring runs on your device.
      </p>
      {!sttSupported() && (
        <Card className="mb-4 border-rose/30 bg-rose/10">
          <p className="text-sm text-rose">This browser cannot do speech recognition. Open SpeakCoach in Chrome or Edge.</p>
        </Card>
      )}
      {groups.map((g) => (
        <Section key={g.label} title={g.label}>
          <div className="space-y-3">
            {g.items.map((d) => (
              <Card key={d.id} onClick={() => setOpen(d)}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{d.title}</div>
                    <div className="truncate text-xs text-white/50">{d.blurb}</div>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs">{d.seconds}s</span>
                </div>
              </Card>
            ))}
          </div>
        </Section>
      ))}
      {open && <Runner drill={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
