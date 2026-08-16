import { useState } from 'react'
import Home from './screens/Home'
import Session from './screens/Session'
import Report from './screens/Report'
import Progress from './screens/Progress'
import Drills from './screens/Drills'
import SettingsScreen from './screens/Settings'
import { IOSBanner } from './components/IOSBanner'
import { SCENARIOS, type Scenario } from './data/scenarios'
import type { SessionRecord } from './store'

type Tab = 'practice' | 'drills' | 'progress' | 'settings'
type View = { name: 'tabs' } | { name: 'session'; scenario: Scenario } | { name: 'report'; rec: SessionRecord }

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  {
    id: 'practice',
    label: 'Practice',
    icon: 'M12 3a4 4 0 0 1 4 4v4a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4Zm7 8a7 7 0 0 1-6 6.93V21h-2v-3.07A7 7 0 0 1 5 11h2a5 5 0 0 0 10 0h2Z'
  },
  { id: 'drills', label: 'Drills', icon: 'M4 6h16v2H4V6Zm0 5h10v2H4v-2Zm0 5h13v2H4v-2Z' },
  { id: 'progress', label: 'Progress', icon: 'M4 19h16v2H4v-2Zm2-6h3v5H6v-5Zm4.5-5h3v10h-3V8Zm4.5-4h3v14h-3V4Z' },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm9.2 4-.9 2.2 1.3 2-1.9 1.9-2-1.3-2.2.9-.6 2.3h-2.8l-.6-2.3-2.2-.9-2 1.3L3.4 16.2l1.3-2-.9-2.2.9-2.2-1.3-2 1.9-1.9 2 1.3 2.2-.9L10.1 4h2.8l.6 2.3 2.2.9 2-1.3 1.9 1.9-1.3 2 .9 2.2Z'
  }
]

export default function App() {
  const [tab, setTab] = useState<Tab>('practice')
  const [view, setView] = useState<View>({ name: 'tabs' })

  if (view.name === 'session')
    return (
      <Session
        scenario={view.scenario}
        onFinish={(rec) => setView({ name: 'report', rec })}
        onQuit={() => setView({ name: 'tabs' })}
      />
    )

  if (view.name === 'report') {
    const again = SCENARIOS.find((s) => s.id === view.rec.refId)
    return (
      <Report
        rec={view.rec}
        onDone={() => setView({ name: 'tabs' })}
        onRetry={() => setView(again ? { name: 'session', scenario: again } : { name: 'tabs' })}
      />
    )
  }

  return (
    <div className="min-h-[100dvh]">
      <IOSBanner />
      {tab === 'practice' && <Home onStart={(s) => setView({ name: 'session', scenario: s })} />}
      {tab === 'drills' && <Drills />}
      {tab === 'progress' && <Progress onOpen={(rec) => setView({ name: 'report', rec })} />}
      {tab === 'settings' && <SettingsScreen />}

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-lg">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] ${
                tab === t.id ? 'text-brand2' : 'text-white/45'
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d={t.icon} />
              </svg>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
