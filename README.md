# SpeakCoach

A personal speaking coach that runs in your browser and installs on your phone. Same idea as
Praktika, but built for how you actually need to communicate: interview loops, shift briefs,
escalations, hard conversations, and everyday English.

## Run it

```
cd speakcoach
bun install          # first time only
bun run dev          # http://localhost:5190
bun run build        # production build into dist/
bun test             # 22 unit tests on the scoring engine
```

Use Chrome or Edge: speech recognition needs the Web Speech API. Allow the microphone when asked.

## Install on your phone

1. Run `bun run dev` on your laptop, or host `dist/` anywhere with HTTPS.
2. Open the URL in Chrome on your phone (same wifi, use the network URL vite prints).
3. Menu, then Add to home screen. It behaves like an app and works offline except for AI calls.

Note: mobile browsers require HTTPS for microphone access on anything other than localhost. For
phone use, host `dist/` on any static HTTPS host (Cloudflare Pages, Netlify, GitHub Pages).

## Two modes

**Offline mode (no key, works immediately)**
- Every scenario runs with a scripted interviewer that walks the question list and pushes back on
  short answers or missing numbers
- All delivery scoring is on-device: pace, filler words, sentence length, pauses, vocabulary,
  number usage, STARR coverage, "I" versus "we" ratio
- All drills and all progress tracking

**AI mode (paste an API key in Settings)**
- Adaptive follow-up questions in character, so the interviewer actually reacts to what you said
- Written feedback with your own words quoted back, plus a rewritten model answer
- Hints when you freeze mid-answer

Providers: Anthropic (direct from browser) or any OpenAI-compatible endpoint, which also covers
Ollama running locally and your own Cloudflare Worker proxy. Press "Load models" in Settings so you
pick a real model ID rather than guessing one. The key is stored only in this browser's
localStorage and is excluded from JSON exports.

## What gets measured

| Metric | Target | Why |
| --- | --- | --- |
| Words per minute | 115-155 | Above 155 you lose the room, below 115 you sound unsure |
| Fillers per 100 words | under 2 | um, uh, like, basically, you know, I mean |
| Average sentence length | 12-18 words | Long sentences are where listeners drop out |
| Long pauses | under 3 | Over 1.8s of silence mid-answer |
| Numbers used | at least 1 | A performance claim without a figure is an opinion |
| Signposting | 3+ | first, then, as a result, my recommendation |
| STARR coverage | 5/5 for interviews | Situation, Task, Action, Result, Reflection |
| I versus we | above 35% "I" | Interviewers score your actions, not the team's |

## Content

17 scenarios across four tracks:

- **Interview**: behavioural loop with rotating Leadership Principles, Bar Raiser pressure round,
  two-minute "tell me about yourself", curveballs and failure questions
- **Workplace**: start-of-shift brief, escalation to a senior leader, difficult conversation with an
  associate, DOR metric brief-out, saying no while keeping the relationship
- **Everyday**: small talk, phone calls, explaining your job in plain English, storytelling
- **Presenting**: 60-second filler-free update, impromptu topics, explaining a complex process

9 drills: articulation, numbers out loud, tongue twisters, pace control at 130 wpm, filler
elimination, three-sentence answers, headline-first briefing, STARR in 90 seconds.

6 coaches with different accents and pressure levels: Maya (Australian ops leader), Alex (US Bar
Raiser, hardest), Charlotte (British presence coach), Priya (Indian English, relaxed), Diego
(Spanish), Kenji (Japanese). You can swap the coach on any scenario, and practise in 17 languages.

## Layout

```
src/lib/analyze.ts    scoring engine, pure functions, unit tested
src/lib/speech.ts     Web Speech wrappers: recognition with auto-restart, TTS voice matching
src/lib/coach.ts      Anthropic + OpenAI-compatible clients, offline scripted coach, feedback JSON
src/data/             scenarios, avatars, drills
src/screens/          Home, Session, Report, Progress, Drills, Settings
src/store.ts          zustand + localStorage persistence, streaks and totals
tests/                bun test suite
```
