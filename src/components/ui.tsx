import type { ReactNode } from 'react'

export function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-line bg-panel/80 backdrop-blur p-4 ${onClick ? 'active:scale-[.99] cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

export function Btn({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled,
  className = ''
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'danger' | 'soft'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
}) {
  const base = 'rounded-xl font-semibold transition disabled:opacity-40 disabled:pointer-events-none'
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5 text-sm', lg: 'px-5 py-3.5 text-base w-full' }
  const variants = {
    primary: 'bg-gradient-to-r from-brand to-brand2 text-white shadow-lg shadow-brand/20 active:scale-[.98]',
    soft: 'bg-panel2 text-white/90 border border-line active:scale-[.98]',
    ghost: 'text-white/60 hover:text-white',
    danger: 'bg-rose/15 text-rose border border-rose/30'
  }
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

export function Chip({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'good' | 'warn' | 'bad' }) {
  const tones = {
    default: 'bg-white/5 text-white/70 border-white/10',
    good: 'bg-mint/10 text-mint border-mint/25',
    warn: 'bg-amber/10 text-amber border-amber/25',
    bad: 'bg-rose/10 text-rose border-rose/25'
  }
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${tones[tone]}`}>{children}</span>
}

export function ScoreRing({ value, size = 132, label = 'overall' }: { value: number; size?: number; label?: string }) {
  const r = (size - 16) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value))
  const stroke = pct >= 80 ? '#34d399' : pct >= 60 ? '#fbbf24' : '#fb7185'
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#2c1f47" strokeWidth="10" fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={stroke}
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * pct) / 100}
          style={{ transition: 'stroke-dashoffset .8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold">{pct}</span>
        <span className="text-[10px] uppercase tracking-widest text-white/40">{label}</span>
      </div>
    </div>
  )
}

export function Bar({ label, value, hint }: { label: string; value: number; hint?: string }) {
  const color = value >= 80 ? 'bg-mint' : value >= 60 ? 'bg-amber' : 'bg-rose'
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-white/70">{label}</span>
        <span className="text-white/50">{value}{hint ? ` · ${hint}` : ''}</span>
      </div>
      <div className="h-2 rounded-full bg-panel2 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%`, transition: 'width .6s ease' }} />
      </div>
    </div>
  )
}

export function Sparkline({ values, height = 44 }: { values: number[]; height?: number }) {
  if (values.length < 2) return <div className="text-xs text-white/40">Not enough sessions yet for a trend.</div>
  const w = 260
  const max = Math.max(...values, 100)
  const min = Math.min(...values, 0)
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = height - ((v - min) / Math.max(1, max - min)) * height
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }}>
      <polyline points={pts.join(' ')} fill="none" stroke="#c084fc" strokeWidth="2.5" strokeLinecap="round" />
      {pts.map((p, i) => {
        const [x, y] = p.split(',')
        return <circle key={i} cx={x} cy={y} r="2.5" fill="#8b5cf6" />
      })}
    </svg>
  )
}

export function Orb({
  color,
  letter,
  state
}: {
  color: string
  letter: string
  state: 'idle' | 'speaking' | 'listening' | 'thinking'
}) {
  const ringColor = state === 'listening' ? '#34d399' : color
  return (
    <div className="relative flex items-center justify-center" style={{ width: 168, height: 168 }}>
      {(state === 'speaking' || state === 'listening') && (
        <>
          <span
            className="absolute inset-0 rounded-full animate-pulseRing"
            style={{ border: `2px solid ${ringColor}`, animationDelay: '0s' }}
          />
          <span
            className="absolute inset-0 rounded-full animate-pulseRing"
            style={{ border: `2px solid ${ringColor}`, animationDelay: '.55s' }}
          />
        </>
      )}
      <div
        className="flex items-center justify-center rounded-full text-4xl font-bold text-white"
        style={{
          width: 128,
          height: 128,
          background: `radial-gradient(circle at 30% 25%, ${color}, #2b1a4d 70%)`,
          boxShadow: `0 0 46px ${color}55`
        }}
      >
        {letter}
      </div>
      {state === 'thinking' && (
        <div className="absolute -bottom-1 flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-white/60 animate-bounce"
              style={{ animationDelay: `${i * 120}ms` }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-white/40">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
