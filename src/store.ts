import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ScoreBreakdown, SpeechMetrics } from './lib/analyze'
import type { Feedback, Msg, Provider } from './lib/coach'
import type { Level } from './data/scenarios'

export interface SessionRecord {
  id: string
  startedAt: string
  kind: 'scenario' | 'drill'
  refId: string
  title: string
  avatarId: string
  durationSec: number
  metrics: SpeechMetrics
  scores: ScoreBreakdown
  transcript: Msg[]
  feedback: Feedback | null
  drill?: { accuracy?: number; missed?: string[] }
}

export interface Settings {
  provider: Provider
  apiKey: string
  model: string
  endpoint: string
  language: string
  voiceURI: string
  rate: number
  autoSpeak: boolean
  handsFree: boolean
  level: Level
  strictness: 'gentle' | 'balanced' | 'tough'
  dailyGoalMin: number
  name: string
}

export const LANGUAGES: Array<{ code: string; label: string }> = [
  { code: 'en-AU', label: 'English (Australian)' },
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'en-IN', label: 'English (India)' },
  { code: 'es-MX', label: 'Spanish (Latin America)' },
  { code: 'es-ES', label: 'Spanish (Spain)' },
  { code: 'fr-FR', label: 'French' },
  { code: 'de-DE', label: 'German' },
  { code: 'it-IT', label: 'Italian' },
  { code: 'pt-BR', label: 'Portuguese (Brazil)' },
  { code: 'ja-JP', label: 'Japanese' },
  { code: 'ko-KR', label: 'Korean' },
  { code: 'zh-CN', label: 'Chinese (Mandarin)' },
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'te-IN', label: 'Telugu' },
  { code: 'ar-SA', label: 'Arabic' },
  { code: 'ru-RU', label: 'Russian' }
]

export const languageLabel = (code: string) => LANGUAGES.find((l) => l.code === code)?.label ?? code

interface AppState {
  settings: Settings
  sessions: SessionRecord[]
  setSettings: (patch: Partial<Settings>) => void
  addSession: (s: SessionRecord) => void
  deleteSession: (id: string) => void
  clearSessions: () => void
  importSessions: (s: SessionRecord[]) => void
}

const defaultSettings: Settings = {
  provider: 'offline',
  apiKey: '',
  model: '',
  endpoint: 'https://api.openai.com/v1',
  language: 'en-AU',
  voiceURI: '',
  rate: 1,
  autoSpeak: true,
  handsFree: true,
  level: 'B2',
  strictness: 'balanced',
  dailyGoalMin: 10,
  name: ''
}

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      sessions: [],
      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      addSession: (rec) => set((s) => ({ sessions: [rec, ...s.sessions].slice(0, 300) })),
      deleteSession: (id) => set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id) })),
      clearSessions: () => set({ sessions: [] }),
      importSessions: (list) => set((s) => ({ sessions: [...list, ...s.sessions].slice(0, 300) }))
    }),
    {
      name: 'speakcoach-v1',
      version: 1,
      // new settings keys must fall back to defaults for existing installs
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>
        return {
          ...current,
          ...p,
          settings: { ...defaultSettings, ...(p.settings ?? {}) },
          sessions: Array.isArray(p.sessions) ? p.sessions : []
        }
      }
    }
  )
)

const pad = (n: number) => String(n).padStart(2, '0')

/** Local calendar day, not UTC: a 9pm Melbourne session belongs to that day. */
const localKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const dayKey = (iso: string) => localKey(new Date(iso))

export function computeStreak(sessions: SessionRecord[], today = new Date()): number {
  if (!sessions.length) return 0
  const days = new Set(sessions.map((s) => dayKey(s.startedAt)))
  let streak = 0
  const cursor = new Date(today)
  // allow the streak to still count if today has no session yet but yesterday does
  if (!days.has(localKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  for (;;) {
    if (!days.has(localKey(cursor))) break
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export interface Totals {
  sessions: number
  minutes: number
  words: number
  avgScore: number
  avgFillerPer100: number
  avgWpm: number
  todayMinutes: number
}

export function computeTotals(sessions: SessionRecord[], today = new Date()): Totals {
  if (!sessions.length)
    return { sessions: 0, minutes: 0, words: 0, avgScore: 0, avgFillerPer100: 0, avgWpm: 0, todayMinutes: 0 }
  const scored = sessions.filter((s) => s.scores.overall > 0)
  const todayStr = localKey(today)
  const sum = (f: (s: SessionRecord) => number, list = sessions) => list.reduce((a, s) => a + f(s), 0)
  return {
    sessions: sessions.length,
    minutes: Math.round(sum((s) => s.durationSec) / 60),
    words: sum((s) => s.metrics.words),
    avgScore: scored.length ? Math.round(sum((s) => s.scores.overall, scored) / scored.length) : 0,
    avgFillerPer100: scored.length ? Math.round((sum((s) => s.metrics.fillerPer100, scored) / scored.length) * 10) / 10 : 0,
    avgWpm: scored.length ? Math.round(sum((s) => s.metrics.wpm, scored) / scored.length) : 0,
    todayMinutes: Math.round(sum((s) => s.durationSec, sessions.filter((s) => dayKey(s.startedAt) === todayStr)) / 60)
  }
}
