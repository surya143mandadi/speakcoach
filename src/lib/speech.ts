/** Browser speech input/output wrappers. Chrome and Edge support both APIs. */

type AnyWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike
  webkitSpeechRecognition?: new () => SpeechRecognitionLike
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: SpeechRecognitionEventLike) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  onspeechstart: (() => void) | null
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string; confidence: number } }>
}

export const sttSupported = (): boolean => {
  const w = window as AnyWindow
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition)
}

/** True when running as an installed PWA (Add to Home Screen). */
export const isStandalone = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as unknown as { standalone?: boolean }).standalone === true

/** True on iOS (iPhone/iPad). */
export const isIOS = (): boolean =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

export const ttsSupported = (): boolean => typeof window !== 'undefined' && 'speechSynthesis' in window

export interface RecognizerHandlers {
  onPartial?: (text: string) => void
  onFinal?: (text: string, atMs: number, durMs: number) => void
  onError?: (code: string) => void
  onListeningChange?: (listening: boolean) => void
}

/**
 * Wraps SpeechRecognition with auto-restart (Chrome ends the stream on silence)
 * and rough per-utterance timing so pace and pause metrics can be computed.
 */
export class Recognizer {
  private rec: SpeechRecognitionLike | null = null
  private active = false
  private epoch = Date.now()
  private utteranceStart: number | null = null
  private restartTimer: number | null = null

  constructor(private lang: string, private h: RecognizerHandlers) {}

  get listening(): boolean {
    return this.active
  }

  setLang(lang: string) {
    this.lang = lang
    if (this.rec) this.rec.lang = lang
  }

  /** Resets the timing origin - call when a new session or drill begins. */
  resetClock() {
    this.epoch = Date.now()
    this.utteranceStart = null
  }

  start() {
    if (!sttSupported()) {
      this.h.onError?.('unsupported')
      return
    }
    if (this.active) return
    this.active = true
    this.h.onListeningChange?.(true)
    this.spin()
  }

  private spin() {
    const w = window as AnyWindow
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition
    if (!Ctor) return
    const rec = new Ctor()
    this.rec = rec
    rec.lang = this.lang
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1

    rec.onspeechstart = () => {
      if (this.utteranceStart === null) this.utteranceStart = Date.now()
    }

    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        const text = r[0].transcript.trim()
        if (!text) continue
        if (r.isFinal) {
          const now = Date.now()
          const start = this.utteranceStart ?? now - Math.max(600, text.split(' ').length * 380)
          this.h.onFinal?.(text, start - this.epoch, Math.max(400, now - start))
          this.utteranceStart = null
        } else {
          if (this.utteranceStart === null) this.utteranceStart = Date.now()
          interim += text + ' '
        }
      }
      if (interim) this.h.onPartial?.(interim.trim())
    }

    rec.onerror = (e) => {
      // no-speech and aborted are normal in long sessions; surface the rest
      if (e.error !== 'no-speech' && e.error !== 'aborted') this.h.onError?.(e.error)
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') this.stop()
    }

    rec.onend = () => {
      if (!this.active) {
        this.h.onListeningChange?.(false)
        return
      }
      this.restartTimer = window.setTimeout(() => {
        if (this.active) this.spin()
      }, 250)
    }

    try {
      rec.start()
    } catch {
      /* start() throws if already started - safe to ignore */
    }
  }

  stop() {
    this.active = false
    if (this.restartTimer) window.clearTimeout(this.restartTimer)
    this.restartTimer = null
    try {
      this.rec?.stop()
    } catch {
      /* ignore */
    }
    this.h.onListeningChange?.(false)
  }
}

let voiceCache: SpeechSynthesisVoice[] = []

export async function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!ttsSupported()) return []
  const now = speechSynthesis.getVoices()
  if (now.length) {
    voiceCache = now
    return now
  }
  return new Promise((resolve) => {
    const done = (list: SpeechSynthesisVoice[]) => {
      speechSynthesis.onvoiceschanged = null
      resolve(list)
    }
    const t = window.setTimeout(() => done(voiceCache), 1500)
    speechSynthesis.onvoiceschanged = () => {
      window.clearTimeout(t)
      voiceCache = speechSynthesis.getVoices()
      done(voiceCache)
    }
  })
}

export function pickVoice(lang: string, gender: 'female' | 'male', preferredURI?: string): SpeechSynthesisVoice | null {
  const voices = voiceCache.length ? voiceCache : ttsSupported() ? speechSynthesis.getVoices() : []
  if (!voices.length) return null
  if (preferredURI) {
    const exact = voices.find((v) => v.voiceURI === preferredURI)
    if (exact) return exact
  }
  const base = lang.split('-')[0]
  const sameLang = voices.filter((v) => v.lang.replace('_', '-').toLowerCase() === lang.toLowerCase())
  const sameBase = voices.filter((v) => v.lang.toLowerCase().startsWith(base))
  const femaleHints = ['female', 'zira', 'aria', 'natasha', 'catherine', 'hazel', 'samantha', 'clara', 'sonia', 'neerja']
  const maleHints = ['male', 'david', 'mark', 'guy', 'george', 'ryan', 'william', 'daniel', 'prabhat']
  const hints = gender === 'female' ? femaleHints : maleHints
  const pool = sameLang.length ? sameLang : sameBase.length ? sameBase : voices
  const hinted = pool.find((v) => hints.some((h) => v.name.toLowerCase().includes(h)))
  return hinted ?? pool[0]
}

export function cancelSpeech() {
  if (ttsSupported()) speechSynthesis.cancel()
}

export function speak(
  text: string,
  opts: { lang: string; gender: 'female' | 'male'; rate?: number; voiceURI?: string }
): Promise<void> {
  return new Promise((resolve) => {
    if (!ttsSupported() || !text.trim()) return resolve()
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    const v = pickVoice(opts.lang, opts.gender, opts.voiceURI)
    if (v) u.voice = v
    u.lang = v?.lang ?? opts.lang
    u.rate = opts.rate ?? 1
    u.pitch = 1
    u.onend = () => resolve()
    u.onerror = () => resolve()
    speechSynthesis.speak(u)
  })
}

export interface Meter {
  level: () => number
  stop: () => void
}

/** Optional mic level meter for the talking indicator. Degrades silently. */
export async function createMeter(): Promise<Meter | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const ctx = new AudioContext()
    const src = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 512
    src.connect(analyser)
    const buf = new Uint8Array(analyser.frequencyBinCount)
    return {
      level: () => {
        analyser.getByteFrequencyData(buf)
        let sum = 0
        for (let i = 0; i < buf.length; i++) sum += buf[i]
        return Math.min(1, sum / buf.length / 90)
      },
      stop: () => {
        stream.getTracks().forEach((t) => t.stop())
        void ctx.close()
      }
    }
  } catch {
    return null
  }
}
