import { useEffect, useState } from 'react'
import { LANGUAGES, useApp } from '../store'
import { Btn, Card, Chip, Section } from '../components/ui'
import { chat, isAiReady, listModels, type Provider } from '../lib/coach'
import { loadVoices, speak, sttSupported, ttsSupported } from '../lib/speech'

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="py-3">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="text-xs text-white/40">{hint}</span>}
      </div>
      {children}
    </div>
  )
}

const input = 'w-full rounded-xl border border-line bg-panel2 px-3 py-2.5 text-sm outline-none focus:border-brand'

export default function SettingsScreen() {
  const { settings, setSettings, sessions, clearSessions } = useApp()
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [models, setModels] = useState<string[]>([])
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void loadVoices().then(setVoices)
  }, [])

  const langVoices = voices.filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith(settings.language.split('-')[0]))

  const connect = async () => {
    setBusy(true)
    setStatus('Connecting...')
    try {
      const list = await listModels(settings)
      setModels(list)
      setStatus(`${list.length} models available. Pick one below.`)
      if (!settings.model && list.length) setSettings({ model: list[0] })
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Connection failed')
    } finally {
      setBusy(false)
    }
  }

  const testChat = async () => {
    setBusy(true)
    setStatus('Testing...')
    try {
      const reply = await chat(settings, 'Reply with exactly: coach online', [{ role: 'user', content: 'test' }], 30)
      setStatus(`Reply: ${reply.slice(0, 80)}`)
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Test failed')
    } finally {
      setBusy(false)
    }
  }

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ settings: { ...settings, apiKey: '' }, sessions }, null, 2)], {
      type: 'application/json'
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `speakcoach-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <h1 className="mb-4 text-xl font-bold">Settings</h1>

      <Section title="You">
        <Card className="divide-y divide-line">
          <Row label="Name" hint="used in greetings">
            <input className={input} value={settings.name} placeholder="Surya" onChange={(e) => setSettings({ name: e.target.value })} />
          </Row>
          <Row label="Practice language">
            <select className={input} value={settings.language} onChange={(e) => setSettings({ language: e.target.value })}>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Level">
            <div className="flex gap-2">
              {(['A2', 'B1', 'B2', 'C1'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setSettings({ level: l })}
                  className={`flex-1 rounded-xl border py-2 text-sm ${
                    settings.level === l ? 'border-brand bg-brand/20' : 'border-line bg-panel2 text-white/60'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Coach strictness">
            <div className="flex gap-2">
              {(['gentle', 'balanced', 'tough'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setSettings({ strictness: l })}
                  className={`flex-1 rounded-xl border py-2 text-sm capitalize ${
                    settings.strictness === l ? 'border-brand bg-brand/20' : 'border-line bg-panel2 text-white/60'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Daily goal" hint={`${settings.dailyGoalMin} min`}>
            <input
              type="range"
              min={5}
              max={45}
              step={5}
              value={settings.dailyGoalMin}
              onChange={(e) => setSettings({ dailyGoalMin: Number(e.target.value) })}
              className="w-full accent-brand"
            />
          </Row>
        </Card>
      </Section>

      <Section title="Voice">
        <Card className="divide-y divide-line">
          <Row label="Coach voice" hint={ttsSupported() ? `${langVoices.length} available` : 'not supported'}>
            <select className={input} value={settings.voiceURI} onChange={(e) => setSettings({ voiceURI: e.target.value })}>
              <option value="">Auto (match avatar accent)</option>
              {langVoices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} · {v.lang}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Speaking rate" hint={`${settings.rate.toFixed(2)}x`}>
            <input
              type="range"
              min={0.7}
              max={1.3}
              step={0.05}
              value={settings.rate}
              onChange={(e) => setSettings({ rate: Number(e.target.value) })}
              className="w-full accent-brand"
            />
          </Row>
          <Row label="Speak coach turns aloud">
            <button
              onClick={() => setSettings({ autoSpeak: !settings.autoSpeak })}
              className={`rounded-xl border px-4 py-2 text-sm ${
                settings.autoSpeak ? 'border-mint/40 bg-mint/15 text-mint' : 'border-line bg-panel2 text-white/60'
              }`}
            >
              {settings.autoSpeak ? 'On' : 'Off'}
            </button>
          </Row>
          <Row label="Hands-free turns" hint="send after a pause">
            <button
              onClick={() => setSettings({ handsFree: !settings.handsFree })}
              className={`rounded-xl border px-4 py-2 text-sm ${
                settings.handsFree ? 'border-mint/40 bg-mint/15 text-mint' : 'border-line bg-panel2 text-white/60'
              }`}
            >
              {settings.handsFree ? 'On - coach replies when you stop talking' : 'Off - tap Send to reply'}
            </button>
          </Row>
          <Row label="Test">
            <Btn
              variant="soft"
              size="sm"
              onClick={() =>
                void speak('This is how your coach will sound in a session.', {
                  lang: settings.language,
                  gender: 'female',
                  rate: settings.rate,
                  voiceURI: settings.voiceURI
                })
              }
            >
              Play sample
            </Btn>
          </Row>
        </Card>
      </Section>

      <Section title="AI coach">
        <Card className="divide-y divide-line">
          <Row label="Provider" hint={isAiReady(settings) ? 'ready' : 'offline mode'}>
            <div className="flex gap-2">
              {(['offline', 'anthropic', 'openai'] as Provider[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setSettings({ provider: p })}
                  className={`flex-1 rounded-xl border py-2 text-xs capitalize ${
                    settings.provider === p ? 'border-brand bg-brand/20' : 'border-line bg-panel2 text-white/60'
                  }`}
                >
                  {p === 'openai' ? 'OpenAI-style' : p}
                </button>
              ))}
            </div>
          </Row>
          {settings.provider !== 'offline' && (
            <>
              {settings.provider === 'openai' && (
                <Row label="Base URL" hint="OpenAI, Ollama, or your Worker">
                  <input className={input} value={settings.endpoint} onChange={(e) => setSettings({ endpoint: e.target.value })} />
                </Row>
              )}
              <Row label="API key" hint="stored only in this browser">
                <input
                  className={input}
                  type="password"
                  value={settings.apiKey}
                  placeholder="sk-..."
                  onChange={(e) => setSettings({ apiKey: e.target.value })}
                />
              </Row>
              <Row label="Model">
                {models.length ? (
                  <select className={input} value={settings.model} onChange={(e) => setSettings({ model: e.target.value })}>
                    {models.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className={input}
                    value={settings.model}
                    placeholder="connect to load the model list"
                    onChange={(e) => setSettings({ model: e.target.value })}
                  />
                )}
              </Row>
              <Row label="Check connection">
                <div className="flex gap-2">
                  <Btn variant="soft" size="sm" onClick={() => void connect()} disabled={busy}>
                    Load models
                  </Btn>
                  <Btn variant="soft" size="sm" onClick={() => void testChat()} disabled={busy || !settings.model}>
                    Test coach
                  </Btn>
                </div>
                {status && <p className="mt-2 break-words text-xs text-white/60">{status}</p>}
              </Row>
            </>
          )}
          <Row label="Without a key">
            <p className="text-xs text-white/55">
              Offline mode still runs every scenario with scripted questions, and all delivery scoring, drills and
              progress tracking work on-device. A key adds adaptive follow-up questions, model answers and written
              feedback.
            </p>
          </Row>
        </Card>
      </Section>

      <Section title="Device">
        <Card className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Chip tone={sttSupported() ? 'good' : 'bad'}>{sttSupported() ? 'mic recognition ok' : 'no recognition'}</Chip>
            <Chip tone={ttsSupported() ? 'good' : 'bad'}>{ttsSupported() ? 'voice output ok' : 'no voice output'}</Chip>
            <Chip>{sessions.length} saved sessions</Chip>
          </div>
          <p className="text-xs text-white/45">
            Install to your phone: open this page in Chrome, then Add to home screen. It runs offline apart from AI calls.
          </p>
        </Card>
      </Section>

      <Section title="Data">
        <div className="flex gap-2">
          <Btn variant="soft" size="sm" onClick={exportData}>
            Export JSON
          </Btn>
          <Btn
            variant="danger"
            size="sm"
            onClick={() => {
              if (confirm('Delete all saved sessions? This cannot be undone.')) clearSessions()
            }}
          >
            Clear history
          </Btn>
        </div>
      </Section>
    </div>
  )
}
