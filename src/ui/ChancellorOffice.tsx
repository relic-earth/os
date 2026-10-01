import { useMemo } from 'react'

/**
 * THE CHANCELLOR'S OFFICE — 500 Republica, Episode III.
 * Crimson lacquered walls with fluted pilasters, bronze reliefs set into the
 * wall, and the great window behind the desk: Coruscant at dusk, towers lit
 * amber. Drawn, not photographed — it sits quietly behind the interface.
 */
const BASE = 600 // the city's skyline sits above the widgets

export function ChancellorOffice({ className = '' }: { className?: string }) {
  const towers = useMemo(() => {
    // deterministic skyline
    let s = 7
    const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280)
    const back: { x: number; w: number; h: number }[] = []
    const front: { x: number; w: number; h: number; lights: [number, number][] }[] = []
    for (let x = 380; x < 1220; x += 10 + r() * 18) back.push({ x, w: 8 + r() * 22, h: 60 + r() * 170 })
    for (let x = 370; x < 1230; x += 16 + r() * 30) {
      const w = 14 + r() * 34
      const h = 40 + r() * (r() > 0.85 ? 300 : 150)
      const lights: [number, number][] = []
      for (let i = 0; i < Math.floor(h / 14); i++) if (r() > 0.55) lights.push([x + 3 + r() * (w - 6), BASE - h + 8 + i * 13])
      front.push({ x, w, h, lights })
    }
    return { back, front }
  }, [])

  return (
    <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <linearGradient id="co-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a0306" />
          <stop offset="0.55" stopColor="#3d060b" />
          <stop offset="1" stopColor="#120102" />
        </linearGradient>
        <linearGradient id="co-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a0306" />
          <stop offset="0.45" stopColor="#5c0f0c" />
          <stop offset="0.62" stopColor="#b8441a" />
          <stop offset="0.72" stopColor="#e07a2c" />
          <stop offset="1" stopColor="#3a0a08" />
        </linearGradient>
        <radialGradient id="co-sun" cx="0.5" cy="0.72" r="0.5">
          <stop offset="0" stopColor="#ffb14a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffb14a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="co-bronze" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8a6a3c" />
          <stop offset="0.5" stopColor="#3f2a14" />
          <stop offset="1" stopColor="#c09a5e" />
        </linearGradient>
        <pattern id="co-flute" width="22" height="900" patternUnits="userSpaceOnUse">
          <rect width="22" height="900" fill="transparent" />
          <rect x="0" width="2" height="900" fill="rgba(0,0,0,0.45)" />
          <rect x="3" width="6" height="900" fill="rgba(255,120,110,0.05)" />
        </pattern>
        <linearGradient id="co-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.95" />
        </linearGradient>
      </defs>

      {/* crimson wall */}
      <rect width="1600" height="900" fill="url(#co-wall)" />
      <rect x="0" width="350" height="900" fill="url(#co-flute)" />
      <rect x="1250" width="350" height="900" fill="url(#co-flute)" />

      {/* bronze reliefs: the Sith frieze set into the wall */}
      {[70, 1330].map((x) => (
        <g key={x} opacity="0.5">
          <rect x={x} y="150" width="200" height="520" rx="4" fill="url(#co-bronze)" opacity="0.45" />
          <rect x={x + 8} y="158" width="184" height="504" rx="2" fill="none" stroke="#c09a5e" strokeOpacity="0.5" />
          {/* robed figures, abstracted */}
          {[0, 1, 2].map((i) => (
            <path
              key={i}
              d={`M${x + 34 + i * 56} 620 L${x + 50 + i * 56} 300 Q${x + 60 + i * 56} 262 ${x + 70 + i * 56} 300 L${x + 86 + i * 56} 620 Z`}
              fill="#1c1209"
              opacity="0.75"
            />
          ))}
          <path d={`M${x + 20} 230 L${x + 100} 190 L${x + 180} 230`} fill="none" stroke="#d8b37a" strokeOpacity="0.55" strokeWidth="2" />
        </g>
      ))}

      {/* the great window */}
      <g>
        <rect x="360" y="70" width="880" height="740" fill="url(#co-sky)" />
        <rect x="360" y="70" width="880" height="740" fill="url(#co-sun)" />
        {towers.back.map((t, i) => (
          <rect key={`b${i}`} x={t.x} y={BASE - t.h} width={t.w} height={t.h + 220} fill="#3a0d0a" opacity="0.75" />
        ))}
        {towers.front.map((t, i) => (
          <g key={`f${i}`}>
            <rect x={t.x} y={BASE - t.h} width={t.w} height={t.h + 220} fill="#120304" />
            {t.lights.map(([lx, ly], j) => (
              <rect key={j} x={lx} y={ly} width="2" height="2" fill="#ffb658" opacity="0.8" />
            ))}
          </g>
        ))}
        {/* traffic lanes */}
        {[430, 470, 520].map((y, i) => (
          <line key={y} x1="360" x2="1240" y1={y} y2={y - 20} stroke="#ffcf8a" strokeOpacity={0.12 - i * 0.03} strokeDasharray="1 9" strokeWidth="2" />
        ))}
        {/* mullions */}
        {[580, 1020].map((x) => (
          <rect key={x} x={x - 5} y="70" width="10" height="740" fill="#0b0102" />
        ))}
        <rect x="360" y="96" width="880" height="6" fill="#0b0102" />
        <rect x="352" y="62" width="896" height="756" fill="none" stroke="#0b0102" strokeWidth="16" />
        <rect x="344" y="54" width="912" height="772" fill="none" stroke="#b08a52" strokeOpacity="0.35" strokeWidth="1.5" />
      </g>

      {/* lacquer floor reflection */}
      <rect y="700" width="1600" height="200" fill="url(#co-floor)" />
    </svg>
  )
}
