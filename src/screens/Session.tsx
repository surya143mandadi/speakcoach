import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { avatarById } from '../data/avatars'
import type { Scenario } from '../data/scenarios'
import { analyze, score, type SpokenChunk } from '../lib/analyze'
import { buildSystemPrompt, chat, getFeedback, getHint, isAiReady, offlineReply, type Msg } from '../lib/coach'
import { Recognizer, cancelSpeech, speak, sttSupported } from '../lib/speech'
import { languageLabel, useApp, type SessionRecord } from '../store'
import { Btn, Chip, Orb } from '../components/ui'

type Phase = 'ready' | 'coach' | 'listening' | 'thinking' | 'saving'

interface Turn {
  role: 'coach' | 'you'
  text: string
}

const SILENCE_MS = 2600

export default function Session({ scenario, onFinish, onQuit }: { scenario: Scenario; onFinish: (rec: SessionRecord) => void; onQuit: () => void }) {
  const settings = useApp((s) => s.settings)
  const addSession = useApp((s) => s.addSession)
  const avatar = avatarById(scenario.avatarId)

  const [phase, setPhase] = useState<Phase>('ready')
  const [turns, setTurns] = useState<Turn[]>([])
  const [partial, setPartial] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [hint, setHint] = useState('')
  const [error, setError] = useState('')
  const [muted, setMuted] = useState(!settings.autoSpeak)
  const [tick, setTick] = useState(0)

  const chunksRef = useRef<SpokenChunk[]>([])
  const bufferRef = useRef<string>('')
  const silenceTimer = useRef<number | null>(null)
  const recRef = useRef<Recognizer | null>(null)
  const startedAt = useRef<number>(Date.now())
  const askedRef = useRef(0)
  const historyRef = useRef<Msg[]>([])
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const endedRef = useRef(false)

  const cfg = useMemo(
    () => ({ provider: settings.provider, apiKey: settings.apiKey, model: settings.model, endpoint: settings.endpoint }),
    [settings.provider, settings.apiKey, settings.model, settings.endpoint]
  )
  const aiOn = isAiReady(cfg)

  const system = useMemo(
    () =>
      buildSystemPrompt({
        scenario,
        avatar,
        level: settings.level,
        strictness: settings.strictness,
        language: languageLabel(settings.language)
      }),
    [scenario, avatar, settings.level, settings.strictness, settings.language]
  )

  const liveMetrics = useMemo(() => analyze(chunksRef.current), [tick, turns, partial])

  useEffect(() => {
    const t = window.setInterval(() => setElapsed(Math.round((Date.now() - startedAt.current) / 1000)), 1000)
    return () => window.clearInterval(t)
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [turns, partial])

  const stopListening = useCallback(() => {
    recRef.current?.stop()
    if (silenceTimer.current) window.clearTimeout(silenceTimer.current)
    silenceTimer.current = null
  }, [])

  const say = useCallback(
    async (text: string) => {
      if (muted || endedRef.current) return
      setPhase('coach')
      await speak(text, { lang: avatar.lang, gender: avatar.gender, rate: settings.rate, voiceURI: settings.voiceURI })
    },
    [avatar.gender, avatar.lang, muted, settings.rate, settings.voiceURI]
  )

  const startListening = useCallback(() => {
    if (endedRef.current) return
    setPhase('listening')
    recRef.current?.start()
  }, [])

  const submitTurn = useCallback(
    async (text: string) => {
      const clean = text.trim()
      if (!clean) return
      stopListening()
      setPartial('')
      setHint('')
      setTurns((t) => [...t, { role: 'you', text: clean }])
      historyRef.current = [...historyRef.current, { role: 'user', content: clean }]
      setPhase('thinking')

      let reply = ''
      if (aiOn) {
        try {
          reply = await chat(cfg, system, historyRef.current, 300)
        } catch (e) {
          setError(e instanceof Error ? e.message : 'AI request failed - falling back to offline coach')
          reply = offlineReply(scenario, askedRef.current, clean)
        }
      } else {
        reply = offlineReply(scenario, askedRef.current, clean)
      }
      askedRef.current += 1
      historyRef.current = [...historyRef.current, { role: 'assistant', content: reply }]
      if (endedRef.current) return
      setTurns((t) => [...t, { role: 'coach', text: reply }])
      await say(reply)
      startListening()
    },
    [aiOn, cfg, say, scenario, startListening, stopListening, system]
  )

  const armSilence = useCallback(() => {
    if (silenceTimer.current) window.clearTimeout(silenceTimer.current)
    silenceTimer.current = window.setTimeout(() => {
      if (!settings.handsFree) return
      const buf = bufferRef.current.trim()
      if (buf.split(/\s+/).filter(Boolean).length < 2) return // too short to be a turn - keep listening
      bufferRef.current = ''
      void submitTurn(buf)
    }, SILENCE_MS)
  }, [settings.handsFree, submitTurn])

  // handlers are created once, so read the latest silence logic through a ref
  const armRef = useRef(armSilence)
  useEffect(() => {
    armRef.current = armSilence
  }, [armSilence])

  useEffect(() => {
    recRef.current?.setLang(settings.language)
  }, [settings.language])

  // create recogniser once
  useEffect(() => {
    const rec = new Recognizer(settings.language, {
      onPartial: (text) => {
        setPartial(text)
        armRef.current()
      },
      onFinal: (text, atMs, durMs) => {
        chunksRef.current = [...chunksRef.current, { text, atMs, durMs }]
        bufferRef.current = `${bufferRef.current} ${text}`.trim()
        setPartial('')
        setTick((n) => n + 1)
        armRef.current()
      },
      onError: (code) => {
        if (code === 'unsupported') setError('This browser cannot do speech recognition. Use Chrome or Edge.')
        else if (code === 'not-allowed') setError('Microphone permission was blocked. Allow the mic and restart the session.')
        else setError(`Speech error: ${code}`)
      }
    })
    rec.resetClock()
    recRef.current = rec
    return () => {
      rec.stop()
      cancelSpeech()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const begin = useCallback(async () => {
    startedAt.current = Date.now()
    recRef.current?.resetClock()
    setTurns([{ role: 'coach', text: scenario.opening }])
    historyRef.current = [{ role: 'assistant', content: scenario.opening }]
    await say(scenario.opening)
    startListening()
  }, [say, scenario.opening, startListening])

  const finish = useCallback(async () => {
    endedRef.current = true
    stopListening()
    cancelSpeech()
    const tail = bufferRef.current.trim()
    if (tail) {
      setTurns((t) => [...t, { role: 'you', text: tail }])
      historyRef.current = [...historyRef.current, { role: 'user', content: tail }]
    }
    bufferRef.current = ''
    setPhase('saving')
    const metrics = analyze(chunksRef.current)
    const scores = score(metrics, { expectStarr: scenario.category === 'interview' })
    const feedback = await getFeedback(cfg, { scenario, transcript: historyRef.current, metrics })
    const rec: SessionRecord = {
      id: `${Date.now()}`,
      startedAt: new Date(startedAt.current).toISOString(),
      kind: 'scenario',
      refId: scenario.id,
      title: scenario.title,
      avatarId: avatar.id,
      durationSec: Math.round((Date.now() - startedAt.current) / 1000),
      metrics,
      scores,
      transcript: historyRef.current,
      feedback
    }
    addSession(rec)
    onFinish(rec)
  }, [addSession, avatar.id, cfg, onFinish, scenario, stopListening])

  const askHint = useCallback(async () => {
    const lastCoach = [...turns].reverse().find((t) => t.role === 'coach')?.text ?? scenario.opening
    setHint('...')
    setHint(await getHint(cfg, { scenario, lastCoachQuestion: lastCoach, language: languageLabel(settings.language) }))
  }, [cfg, scenario, settings.language, turns])

  const sendNow = useCallback(() => {
    const buf = `${bufferRef.current} ${partial}`.trim()
    bufferRef.current = ''
    if (buf) void submitTurn(buf)
  }, [partial, submitTurn])

  const mmss = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`
  const overTime = elapsed > scenario.minutes * 60

  return (
    <div className="flex h-[100dvh] flex-col">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <button onClick={onQuit} className="text-sm text-white/50">
          Exit
        </button>
        <div className="text-center">
          <div className="text-sm font-semibold">{scenario.title}</div>
          <div className="text-xs text-white/40">
            {avatar.name} · {avatar.accent} · {aiOn ? 'AI coach' : 'offline coach'}
          </div>
        </div>
        <div className={`text-sm tabular-nums ${overTime ? 'text-amber' : 'text-white/50'}`}>{mmss}</div>
      </header>

      <div className="flex flex-col items-center pt-4">
        <Orb color={avatar.color} letter={avatar.emojiFallback} state={phase === 'coach' ? 'speaking' : phase === 'listening' ? 'listening' : phase === 'thinking' || phase === 'saving' ? 'thinking' : 'idle'} />
        <div className="mt-1 text-xs uppercase tracking-widest text-white/40">
          {phase === 'ready' && 'tap start when you are ready'}
          {phase === 'coach' && `${avatar.name} is speaking`}
          {phase === 'listening' && 'listening - just talk'}
          {phase === 'thinking' && `${avatar.name} is thinking`}
          {phase === 'saving' && 'building your report'}
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-2 px-4">
          <Chip tone={liveMetrics.fillerCount > 4 ? 'bad' : liveMetrics.fillerCount > 1 ? 'warn' : 'good'}>
            {liveMetrics.fillerCount} fillers
          </Chip>
          <Chip>{liveMetrics.words} words</Chip>
          {liveMetrics.wpm > 0 && (
            <Chip tone={liveMetrics.wpm > 160 ? 'warn' : liveMetrics.wpm < 110 ? 'warn' : 'good'}>{liveMetrics.wpm} wpm</Chip>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="mt-4 flex-1 space-y-3 overflow-y-auto px-4 pb-4">
        {turns.map((t, i) => (
          <div key={i} className={`flex ${t.role === 'you' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] animate-rise rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                t.role === 'you' ? 'bg-brand/20 border border-brand/30' : 'bg-panel2 border border-line'
              }`}
            >
              {t.text}
            </div>
          </div>
        ))}
        {partial && (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl border border-dashed border-brand/40 px-3.5 py-2.5 text-sm text-white/50">
              {partial}
            </div>
          </div>
        )}
        {hint && (
          <div className="rounded-xl border border-amber/30 bg-amber/10 px-3 py-2 text-xs text-amber">Hint: {hint}</div>
        )}
        {error && <div className="rounded-xl border border-rose/30 bg-rose/10 px-3 py-2 text-xs text-rose">{error}</div>}
        {phase === 'ready' && (
          <div className="rounded-2xl border border-line bg-panel/60 p-4 text-sm">
            <div className="mb-2 font-semibold">What a strong answer needs</div>
            <ul className="space-y-1 text-white/60">
              {scenario.goals.map((g) => (
                <li key={g}>· {g}</li>
              ))}
            </ul>
            {!sttSupported() && (
              <p className="mt-3 text-xs text-rose">
                Speech recognition is unavailable in this browser. Chrome or Edge on desktop and Android work best.
              </p>
            )}
          </div>
        )}
      </div>

      <footer className="border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {phase === 'ready' ? (
          <Btn size="lg" onClick={() => void begin()}>
            Start session
          </Btn>
        ) : (
          <div className="flex items-center gap-2">
            <Btn variant="soft" size="sm" onClick={() => setMuted((m) => !m)}>
              {muted ? 'Voice off' : 'Voice on'}
            </Btn>
            <Btn variant="soft" size="sm" onClick={() => void askHint()}>
              Hint
            </Btn>
            <Btn variant="soft" size="sm" onClick={sendNow} disabled={phase !== 'listening'}>
              {settings.handsFree ? 'Send' : 'Send now'}
            </Btn>
            <div className="flex-1" />
            <Btn variant="primary" size="sm" onClick={() => void finish()} disabled={phase === 'saving'}>
              {phase === 'saving' ? 'Scoring...' : 'End & score'}
            </Btn>
          </div>
        )}
      </footer>
    </div>
  )
}
