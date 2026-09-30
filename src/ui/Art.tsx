import { useId } from 'react'

/**
 * Procedural cinematic artwork — black forms, red light, fine line work.
 * Used for media posters, tiles and atmospheric backgrounds. No external
 * imagery; every plate is vector so it stays crisp at 10-foot scale.
 */
export type ArtVariant = 'horizon' | 'volcano' | 'duel' | 'eclipse' | 'spire' | 'grid' | 'city' | 'corridor' | 'topo' | 'plans' | 'render'

function rng(seed: number) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

function ridge(seed: number, y: number, amp: number, w = 400, steps = 24) {
  const r = rng(seed)
  let d = `M0 ${y}`
  for (let i = 1; i <= steps; i++) {
    const x = (i / steps) * w
    d += ` L${x.toFixed(1)} ${(y - r() * amp).toFixed(1)}`
  }
  return d + ` L${w} 300 L0 300 Z`
}

function topoLines(seed: number, n = 14) {
  const r = rng(seed)
  const lines: string[] = []
  for (let k = 0; k < n; k++) {
    const base = 40 + k * 18
    let d = `M-10 ${base}`
    for (let x = 0; x <= 420; x += 20) {
      const y = base + Math.sin(x / 50 + k * 0.7) * 10 + (r() - 0.5) * 6
      d += ` L${x} ${y.toFixed(1)}`
    }
    lines.push(d)
  }
  return lines
}

export function Art({ variant, className, seed = 3 }: { variant: string; className?: string; seed?: number }) {
  const id = useId().replace(/:/g, '')
  const v = variant as ArtVariant
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <radialGradient id={`${id}-sun`} cx="50%" cy="100%" r="70%">
          <stop offset="0%" stopColor="#c3161c" stopOpacity="0.85" />
          <stop offset="35%" stopColor="#5a0b0f" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#050404" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#030303" />
          <stop offset="70%" stopColor="#120405" />
          <stop offset="100%" stopColor="#2a0609" />
        </linearGradient>
        <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#050404" stopOpacity="0" />
          <stop offset="100%" stopColor="#050404" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id={`${id}-blade`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ff4a4a" stopOpacity="0" />
          <stop offset="50%" stopColor="#ffd9d9" />
          <stop offset="100%" stopColor="#ff4a4a" stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="400" height="300" fill={`url(#${id}-sky)`} />

      {v === 'horizon' && (
        <>
          <ellipse cx="200" cy="560" rx="420" ry="330" fill="#060505" stroke="#c3161c" strokeOpacity="0.55" strokeWidth="0.8" />
          <ellipse cx="200" cy="560" rx="420" ry="330" fill="none" stroke="#e8242b" strokeOpacity="0.25" strokeWidth="5" filter={`url(#${id}-glow)`} />
          <rect width="400" height="300" fill={`url(#${id}-sun)`} opacity="0.45" />
          <path d={ridge(seed + 11, 270, 26)} fill="#040303" />
          <circle cx="300" cy="70" r="1" fill="#ebe5df" opacity="0.6" />
          <circle cx="90" cy="40" r="0.7" fill="#ebe5df" opacity="0.4" />
        </>
      )}

      {v === 'volcano' && (
        <>
          <rect width="400" height="300" fill={`url(#${id}-sun)`} />
          <path d="M40 300 L170 120 L190 128 L205 112 L230 124 L360 300 Z" fill="#070505" stroke="#7d0f14" strokeWidth="0.8" />
          <path d="M198 116 C 196 170, 214 210, 206 300" stroke="#e8242b" strokeWidth="1.4" fill="none" filter={`url(#${id}-glow)`} opacity="0.9" />
          <path d="M205 118 C 230 180, 250 220, 280 300" stroke="#b3141b" strokeWidth="0.8" fill="none" opacity="0.7" />
          <path d={ridge(seed + 3, 280, 30)} fill="#030303" />
          {Array.from({ length: 18 }).map((_, i) => {
            const r = rng(seed + i)
            return <circle key={i} cx={150 + r() * 110} cy={40 + r() * 90} r={r() * 1.1 + 0.3} fill="#e8242b" opacity={0.3 + r() * 0.5} />
          })}
        </>
      )}

      {v === 'duel' && (
        <>
          <rect width="400" height="300" fill={`url(#${id}-sun)`} opacity="0.9" />
          <path d={ridge(seed + 5, 250, 40)} fill="#070505" />
          <path d="M0 262 L400 250 L400 300 L0 300 Z" fill="#030303" />
          <g filter={`url(#${id}-glow)`}>
            <line x1="120" y1="220" x2="250" y2="70" stroke="#e8242b" strokeWidth="3" strokeLinecap="round" />
            <line x1="120" y1="220" x2="250" y2="70" stroke="#ffd0d0" strokeWidth="1" strokeLinecap="round" />
            <line x1="290" y1="220" x2="170" y2="80" stroke="#b3141b" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
            <line x1="290" y1="220" x2="170" y2="80" stroke="#f0c0c0" strokeWidth="0.8" strokeLinecap="round" opacity="0.7" />
          </g>
          <circle cx="208" cy="118" r="18" fill="#e8242b" opacity="0.18" filter={`url(#${id}-glow)`} />
        </>
      )}

      {v === 'eclipse' && (
        <>
          <circle cx="200" cy="130" r="62" fill="#e8242b" opacity="0.12" filter={`url(#${id}-glow)`} />
          <circle cx="200" cy="130" r="54" fill="none" stroke="#e8242b" strokeWidth="1.2" filter={`url(#${id}-glow)`} />
          <circle cx="204" cy="128" r="53" fill="#040303" />
          <line x1="40" y1="130" x2="360" y2="130" stroke="#7d0f14" strokeWidth="0.5" opacity="0.6" />
          <path d={ridge(seed + 8, 285, 18)} fill="#040303" />
        </>
      )}

      {v === 'spire' && (
        <>
          <rect width="400" height="300" fill={`url(#${id}-sun)`} opacity="0.7" />
          <path d="M184 300 L196 40 L200 22 L204 40 L216 300 Z" fill="#050404" stroke="#b3141b" strokeOpacity="0.6" strokeWidth="0.6" />
          <path d="M150 300 L166 150 L176 300 Z M234 300 L224 170 L250 300 Z" fill="#060505" stroke="#7d0f14" strokeWidth="0.5" />
          <line x1="200" y1="22" x2="200" y2="0" stroke="#e8242b" strokeWidth="0.8" filter={`url(#${id}-glow)`} />
          {Array.from({ length: 9 }).map((_, i) => (
            <line key={i} x1="193" x2="207" y1={70 + i * 24} y2={70 + i * 24} stroke="#e8242b" strokeOpacity={0.2 + (i % 3) * 0.2} strokeWidth="0.6" />
          ))}
        </>
      )}

      {v === 'grid' && (
        <>
          {Array.from({ length: 21 }).map((_, i) => (
            <line key={`v${i}`} x1={200} y1={150} x2={i * 20 - 0} y2={300} stroke="#b3141b" strokeOpacity="0.35" strokeWidth="0.5" />
          ))}
          {Array.from({ length: 8 }).map((_, i) => {
            const y = 150 + Math.pow(i / 7, 2) * 150
            return <line key={`h${i}`} x1="0" x2="400" y1={y} y2={y} stroke="#b3141b" strokeOpacity={0.15 + i * 0.05} strokeWidth="0.5" />
          })}
          <rect x="0" y="0" width="400" height="152" fill="#040303" />
          <ellipse cx="200" cy="152" rx="220" ry="60" fill="#e8242b" opacity="0.14" filter={`url(#${id}-glow)`} />
          {Array.from({ length: 6 }).map((_, i) => (
            <rect key={i} x={60 + i * 50} y={90 - (i % 3) * 18} width="22" height={62 + (i % 3) * 18} fill="#070606" stroke="#7d0f14" strokeOpacity="0.6" strokeWidth="0.5" />
          ))}
          <line x1="0" x2="400" y1="150" y2="150" stroke="#e8242b" strokeWidth="0.8" filter={`url(#${id}-glow)`} />
        </>
      )}

      {v === 'city' && (
        <>
          <rect width="400" height="300" fill={`url(#${id}-sun)`} opacity="0.5" />
          {Array.from({ length: 22 }).map((_, i) => {
            const r = rng(seed * 7 + i)
            const w = 10 + r() * 22
            const h = 60 + r() * 170
            const x = i * 19 - 10
            return (
              <g key={i}>
                <rect x={x} y={300 - h} width={w} height={h} fill="#060505" stroke="#3a0a0d" strokeWidth="0.5" />
                {r() > 0.5 && <rect x={x + w / 2 - 0.5} y={300 - h + 6} width="1" height={h * 0.5} fill="#e8242b" opacity="0.5" />}
              </g>
            )
          })}
        </>
      )}

      {v === 'corridor' && (
        <>
          {Array.from({ length: 9 }).map((_, i) => {
            const k = 1 - i / 10
            const w = 400 * k
            const h = 300 * k
            return <rect key={i} x={(400 - w) / 2} y={(300 - h) / 2} width={w} height={h} fill="none" stroke="#b3141b" strokeOpacity={0.12 + i * 0.06} strokeWidth="0.6" />
          })}
          <rect x="190" y="138" width="20" height="24" fill="#e8242b" opacity="0.5" filter={`url(#${id}-glow)`} />
          <line x1="0" y1="300" x2="190" y2="162" stroke="#7d0f14" strokeWidth="0.5" />
          <line x1="400" y1="300" x2="210" y2="162" stroke="#7d0f14" strokeWidth="0.5" />
        </>
      )}

      {v === 'topo' && (
        <>
          <rect width="400" height="300" fill={`url(#${id}-sun)`} opacity="0.35" />
          {topoLines(seed).map((d, i) => (
            <path key={i} d={d} fill="none" stroke="#c3161c" strokeOpacity={0.14 + (i % 4) * 0.07} strokeWidth="0.7" />
          ))}
        </>
      )}

      {v === 'render' && (
        <>
          <rect width="400" height="300" fill={`url(#${id}-sun)`} opacity="0.6" />
          <path d={ridge(seed + 2, 250, 50)} fill="#0b0808" />
          {/* cantilevered house */}
          <path d="M90 214 L300 214 L300 222 L90 222 Z" fill="#1a1414" stroke="#3a0a0d" strokeWidth="0.5" />
          <path d="M120 170 L330 170 L330 178 L120 178 Z" fill="#221a1a" />
          <rect x="130" y="178" width="150" height="36" fill="#0a0707" />
          <rect x="138" y="182" width="134" height="28" fill="#e8242b" opacity="0.28" />
          <rect x="138" y="182" width="134" height="28" fill="none" stroke="#e8242b" strokeOpacity="0.6" strokeWidth="0.5" />
          {Array.from({ length: 6 }).map((_, i) => (
            <line key={i} x1={160 + i * 22} x2={160 + i * 22} y1="182" y2="210" stroke="#1a0506" strokeWidth="1" />
          ))}
          <rect x="280" y="178" width="40" height="36" fill="#141010" />
          <path d="M0 240 L400 232 L400 300 L0 300Z" fill="#050404" />
          <path d="M90 240 L300 236 L300 244 L90 248 Z" fill="#e8242b" opacity="0.12" />
        </>
      )}

      {v !== 'topo' && v !== 'render' && <rect width="400" height="300" fill={`url(#${id}-fade)`} opacity="0.55" />}
    </svg>
  )
}
