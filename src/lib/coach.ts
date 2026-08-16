/**
 * Coach engine. Two providers plus a fully offline fallback, so the app is
 * usable with no key and gets much better with one.
 */
import type { Scenario } from '../data/scenarios'
import type { Avatar } from '../data/avatars'
import { localFixes, type SpeechMetrics } from './analyze'

export type Provider = 'offline' | 'anthropic' | 'openai'

export interface ProviderConfig {
  provider: Provider
  apiKey: string
  model: string
  /** OpenAI-compatible base URL, e.g. https://api.openai.com/v1 or a Worker proxy */
  endpoint: string
}

export interface Msg {
  role: 'user' | 'assistant'
  content: string
}

export interface Fix {
  issue: string
  better: string
}

export interface Feedback {
  verdict: string
  strengths: string[]
  fixes: Fix[]
  modelAnswer: string
  nextStep: string
  aiScores?: { structure?: number; clarity?: number; substance?: number }
}

const STRICTNESS: Record<string, string> = {
  gentle: 'Be encouraging. Correct only what blocks understanding.',
  balanced: 'Be realistic and direct, the way a good manager would be.',
  tough: 'Be demanding. Do not praise unless it is earned. Push back on vague answers every single turn.'
}

export function buildSystemPrompt(args: {
  scenario: Scenario
  avatar: Avatar
  level: string
  strictness: keyof typeof STRICTNESS | string
  language: string
}): string {
  const { scenario, avatar, level, strictness, language } = args
  return [
    `You are ${avatar.name}, ${avatar.role}. Backstory: ${avatar.backstory} Speaking style: ${avatar.style} Accent/variety: ${avatar.accent}.`,
    `You are running a live SPOKEN practice session. Everything you write is converted to speech, so: no markdown, no bullet points, no emoji, no stage directions, no asterisks.`,
    `Speak in ${language}. Learner level: ${level}.`,
    `Scenario: ${scenario.title}. ${scenario.brief}`,
    `Rules: keep every turn under 60 spoken words. Ask exactly one question per turn. Never answer for the learner. Never summarise what they said back at length. If they speak for a long time, respond to the substance, not the delivery - delivery feedback comes at the end of the session.`,
    `If the learner is silent, stuck, or says "I don't know", offer one short scaffold ("try starting with the situation in one sentence") then re-ask.`,
    STRICTNESS[strictness] ?? STRICTNESS.balanced,
    `Stay in character for the whole session. Do not mention that you are an AI or a language model.`
  ].join('\n')
}

const FEEDBACK_INSTRUCTION = `You are an expert speaking coach reviewing a practice transcript.
Reply with STRICT JSON only, no prose, no code fences, matching this shape:
{"verdict":"one blunt sentence on how it went","strengths":["max 3 short specifics"],"fixes":[{"issue":"what went wrong, quote their words","better":"the exact words they should have said instead"}],"modelAnswer":"a 90-word model version of their weakest answer, first person, spoken style","nextStep":"one concrete thing to practise next session","aiScores":{"structure":0-100,"clarity":0-100,"substance":0-100}}
Give 2 to 4 fixes. Quote the learner verbatim in "issue". Be specific to this transcript, never generic.`

async function anthropicCall(cfg: ProviderConfig, system: string, messages: Msg[], maxTokens = 500): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': cfg.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({ model: cfg.model, max_tokens: maxTokens, system, messages })
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const data = (await res.json()) as { content: Array<{ type: string; text?: string }> }
  return data.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text ?? '')
    .join('')
    .trim()
}

async function openaiCall(cfg: ProviderConfig, system: string, messages: Msg[], maxTokens = 500): Promise<string> {
  const base = (cfg.endpoint || 'https://api.openai.com/v1').replace(/\/$/, '')
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(cfg.apiKey ? { authorization: `Bearer ${cfg.apiKey}` } : {})
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: maxTokens,
      messages: [{ role: 'system', content: system }, ...messages]
    })
  })
  if (!res.ok) throw new Error(`LLM ${res.status}: ${(await res.text()).slice(0, 300)}`)
  const data = (await res.json()) as { choices: Array<{ message: { content: string } }> }
  return (data.choices?.[0]?.message?.content ?? '').trim()
}

export async function chat(cfg: ProviderConfig, system: string, messages: Msg[], maxTokens?: number): Promise<string> {
  if (cfg.provider === 'anthropic') return anthropicCall(cfg, system, messages, maxTokens)
  if (cfg.provider === 'openai') return openaiCall(cfg, system, messages, maxTokens)
  throw new Error('No AI provider configured')
}

export function isAiReady(cfg: ProviderConfig): boolean {
  if (cfg.provider === 'anthropic') return Boolean(cfg.apiKey && cfg.model)
  if (cfg.provider === 'openai') return Boolean(cfg.model && cfg.endpoint)
  return false
}

/** Offline coach: walks the scripted question list with light adaptivity. */
export function offlineReply(scenario: Scenario, askedCount: number, lastUser: string): string {
  const words = lastUser.trim().split(/\s+/).filter(Boolean).length
  const hasNumber = /\d/.test(lastUser)
  if (askedCount > 0 && words > 0 && words < 25)
    return 'That was quite short. Give me more detail on what you personally did, step by step.'
  if (askedCount > 0 && !hasNumber && scenario.focus.includes('substance'))
    return 'Before we move on, put a number on that. What was the metric before, and what did it become?'
  const q = scenario.offlineQuestions[Math.min(askedCount, scenario.offlineQuestions.length - 1)]
  const closing =
    askedCount >= scenario.offlineQuestions.length
      ? 'That covers what I wanted. When you are ready, end the session and I will show your delivery report.'
      : q
  return closing
}

export function offlineFeedback(scenario: Scenario, metrics: SpeechMetrics): Feedback {
  const fixes = localFixes(metrics, scenario.focus).map((f) => ({ issue: f, better: '' }))
  const strengths: string[] = []
  if (metrics.fillerPer100 <= 2) strengths.push('Filler discipline was good, under two per hundred words.')
  if (metrics.wpm >= 115 && metrics.wpm <= 155) strengths.push(`Pace sat in the clear band at ${metrics.wpm} words a minute.`)
  if (metrics.numbersUsed > 0) strengths.push(`You backed your points with ${metrics.numbersUsed} figures.`)
  if (metrics.signposts >= 3) strengths.push('You signposted your structure, which makes you easy to follow.')
  if (!strengths.length) strengths.push(`You completed the session and spoke ${metrics.words} words - volume of practice is what moves fluency.`)
  return {
    verdict:
      metrics.words < 30
        ? 'Not enough speech captured to judge. Try a longer answer next time.'
        : `Offline report: ${metrics.words} words at ${metrics.wpm} wpm with ${metrics.fillerCount} fillers.`,
    strengths: strengths.slice(0, 3),
    fixes,
    modelAnswer: '',
    nextStep: scenario.focus.includes('fillers')
      ? 'Run the Filler-free 60 drill twice, then repeat this scenario.'
      : 'Repeat this scenario and aim to open every answer with a one-sentence headline.'
  }
}

function extractJson(raw: string): unknown {
  const cleaned = raw.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1))
      } catch {
        return null
      }
    }
    return null
  }
}

export async function getFeedback(
  cfg: ProviderConfig,
  args: { scenario: Scenario; transcript: Msg[]; metrics: SpeechMetrics }
): Promise<Feedback> {
  const base = offlineFeedback(args.scenario, args.metrics)
  if (!isAiReady(cfg)) return base
  const m = args.metrics
  const transcriptText = args.transcript
    .map((t) => `${t.role === 'user' ? 'LEARNER' : 'COACH'}: ${t.content}`)
    .join('\n')
  const measured = `Measured delivery: ${m.words} words, ${m.wpm} wpm, ${m.fillerCount} fillers (${m.fillerPer100}/100 words), avg sentence ${m.avgSentenceWords} words, ${m.numbersUsed} numbers, ${m.longPauses} long pauses, signposts ${m.signposts}, STARR coverage ${Math.round(m.starrScore * 100)}%.`
  const user = `Scenario: ${args.scenario.title}\nWhat a strong answer needs: ${args.scenario.goals.join('; ')}\n${measured}\n\nTranscript:\n${transcriptText}`
  try {
    const raw = await chat(cfg, FEEDBACK_INSTRUCTION, [{ role: 'user', content: user }], 1100)
    const parsed = extractJson(raw) as Partial<Feedback> | null
    if (!parsed) return base
    return {
      verdict: parsed.verdict || base.verdict,
      strengths: parsed.strengths?.length ? parsed.strengths : base.strengths,
      fixes: parsed.fixes?.length ? parsed.fixes : base.fixes,
      modelAnswer: parsed.modelAnswer || '',
      nextStep: parsed.nextStep || base.nextStep,
      aiScores: parsed.aiScores
    }
  } catch {
    return { ...base, verdict: base.verdict + ' (AI feedback failed, showing local analysis.)' }
  }
}

export async function getHint(
  cfg: ProviderConfig,
  args: { scenario: Scenario; lastCoachQuestion: string; language: string }
): Promise<string> {
  if (!isAiReady(cfg)) {
    const g = args.scenario.goals[0]
    return `Try starting like this: "${g}". One sentence of context, then what you did.`
  }
  const system =
    'You help a learner who is stuck mid-conversation. Give one short spoken-English sentence they could say next, plus nothing else. No preamble, no quotes.'
  const user = `Scenario: ${args.scenario.title}. Language: ${args.language}. The coach just asked: "${args.lastCoachQuestion}". What is a strong opening sentence for the learner's answer?`
  try {
    return await chat(cfg, system, [{ role: 'user', content: user }], 120)
  } catch {
    return `Start with one sentence of context, then what you did, then the result.`
  }
}

/** Lists models so the user picks a real one instead of us guessing an ID. */
export async function listModels(cfg: ProviderConfig): Promise<string[]> {
  if (cfg.provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/models?limit=40', {
      headers: {
        'x-api-key': cfg.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      }
    })
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`)
    const data = (await res.json()) as { data: Array<{ id: string }> }
    return data.data.map((d) => d.id)
  }
  const base = (cfg.endpoint || 'https://api.openai.com/v1').replace(/\/$/, '')
  const res = await fetch(`${base}/models`, {
    headers: cfg.apiKey ? { authorization: `Bearer ${cfg.apiKey}` } : {}
  })
  if (!res.ok) throw new Error(`Endpoint ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = (await res.json()) as { data: Array<{ id: string }> }
  return data.data.map((d) => d.id)
}
