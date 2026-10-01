import { useMemo } from 'react'

/**
 * CORUSCANT, FROM THE CHANCELLOR'S WINDOW — the wallpaper.
 * Dusk over the city-planet: three depths of towers with living lights, the
 * Jedi Temple on the horizon, air-traffic lanes streaming between the spires,
 * searchlights sweeping the haze, and a Venator crossing the sky. The window's
 * black mullions frame it all. Every motion is CSS (see `.cw-*` in index.css)
 * and stops under prefers-reduced-motion.
 */
const W = 1600
const H = 900

function rng(seed: number) {
  let s = seed
  return () => (s = (s * 9301 + 49297) % 233280) / 233280
}

type Tower = { x: number; w: number; h: number; lights: [number, number, number][]; spire?: boolean }

function skyline(seed: number, base: number, minH: number, maxH: number, step: [number, number], tall = 0.9) {
  const r = rng(seed)
  const out: Tower[] = []
  for (let x = -20; x < W + 20; x += step[0] + r() * step[1]) {
    const w = 14 + r() * 46
    const h = minH + r() * (r() > tall ? maxH * 1.8 : maxH)
    const lights: [number, number, number][] = []
    const rows = Math.floor(h / 11)
    for (let i = 0; i < rows; i++) if (r() > 0.6) lights.push([x + 3 + r() * (w - 6), base - h + 6 + i * 11, Math.floor(r() * 6)])
    out.push({ x, w, h, lights, spire: r() > 0.7 })
  }
  return out
}

export function CoruscantWindow({ className = '' }: { className?: string }) {
  const far = useMemo(() => skyline(3, 640, 40, 120, [8, 14], 0.95), [])
  const mid = useMemo(() => skyline(11, 700, 60, 180, [14, 22]), [])
  const near = useMemo(() => skyline(29, 790, 80, 220, [26, 40], 0.86), [])
  const traffic = useMemo(() => {
    const r = rng(77)
    return [
      { y: 470, dur: 38, dir: 1, n: 16, c: '#ffcf8a' },
      { y: 505, dur: 28, dir: -1, n: 12, c: '#ff5a4a' },
      { y: 548, dur: 22, dir: 1, n: 14, c: '#ffe2b0' },
      { y: 600, dur: 17, dir: -1, n: 10, c: '#ff7a3a' },
      { y: 420, dur: 55, dir: -1, n: 10, c: '#ffd9a0' },
    ].map((l) => ({ ...l, dots: Array.from({ length: l.n }, () => [r() * W, r() * 6 - 3, 1 + r() * 1.6] as [number, number, number]) }))
  }, [])

  const towerLayer = (ts: Tower[], base: number, fill: string, lightOpacity: number, key: string) => (
    <g>
      {ts.map((t, i) => (
        <g key={key + i}>
          <rect x={t.x} y={base - t.h} width={t.w} height={t.h + 200} fill={fill} />
          {t.spire && <path d={`M${t.x + t.w / 2 - 2} ${base - t.h} L${t.x + t.w / 2} ${base - t.h - 26} L${t.x + t.w / 2 + 2} ${base - t.h}`} fill={fill} />}
          {t.spire && <circle cx={t.x + t.w / 2} cy={base - t.h - 26} r="1.6" fill="#ff3a30" className="cw-beacon" style={{ animationDelay: `${(i % 7) * 0.37}s` }} />}
          {t.lights.map(([lx, ly, b], j) => (
            <rect key={j} x={lx} y={ly} width="2" height="2" fill="#ffb658" opacity={lightOpacity} className={`cw-twinkle cw-t${b}`} />
          ))}
        </g>
      ))}
    </g>
  )

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className={`art ${className}`} aria-hidden>
      <defs>
        <linearGradient id="cw-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0d0204" />
          <stop offset="0.3" stopColor="#3a0709" />
          <stop offset="0.55" stopColor="#8c2412" />
          <stop offset="0.7" stopColor="#d9682a" />
          <stop offset="0.8" stopColor="#5a1208" />
          <stop offset="1" stopColor="#120203" />
        </linearGradient>
        <radialGradient id="cw-sun" cx="0.5" cy="0.7" r="0.45">
          <stop offset="0" stopColor="#ffbe5c" stopOpacity="0.6" />
          <stop offset="0.5" stopColor="#ff7a2c" stopOpacity="0.18" />
          <stop offset="1" stopColor="#ff7a2c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cw-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff8a3a" stopOpacity="0" />
          <stop offset="1" stopColor="#ff8a3a" stopOpacity="0.22" />
        </linearGradient>
        <linearGradient id="cw-beam" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ffd9a0" stopOpacity="0.22" />
          <stop offset="1" stopColor="#ffd9a0" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="cw-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      <rect width={W} height={H} fill="url(#cw-sky)" />
      <rect width={W} height={H} fill="url(#cw-sun)" className="cw-sunpulse" />

      {/* a Venator crosses the dusk */}
      <g className="cw-venator">
        <path d="M0 0 L120 -9 L140 -3 L140 3 L120 9 Z" fill="#1a0507" />
        <path d="M70 -5 L96 -14 L104 -14 L100 -5 Z" fill="#1a0507" />
        <circle cx="140" cy="0" r="2.2" fill="#9fd8ff" className="cw-engine" />
        <circle cx="140" cy="-3" r="1.4" fill="#9fd8ff" className="cw-engine" />
        <circle cx="140" cy="3" r="1.4" fill="#9fd8ff" className="cw-engine" />
      </g>

      {/* searchlights sweeping the haze */}
      {[380, 820, 1240].map((x, i) => (
        <g key={x} transform={`translate(${x} 640)`}>
          <path d="M-4 0 L-60 -520 L60 -520 L4 0 Z" fill="url(#cw-beam)" className="cw-beam" style={{ animationDelay: `${i * -3.1}s`, animationDuration: `${11 + i * 3}s` }} />
        </g>
      ))}

      {/* the Jedi Temple on the horizon */}
      <g fill="#2a0708" opacity="0.9">
        <path d="M690 640 L720 560 L880 560 L910 640 Z" />
        <rect x="788" y="470" width="24" height="92" />
        <path d="M788 470 L800 430 L812 470 Z" />
        {[732, 760, 840, 868].map((x) => (
          <g key={x}>
            <rect x={x - 5} y="505" width="10" height="56" />
            <path d={`M${x - 5} 505 L${x} 482 L${x + 5} 505 Z`} />
          </g>
        ))}
      </g>

      {towerLayer(far, 640, '#3a0b0a', 0.45, 'f')}
      <rect y="420" width={W} height="260" fill="url(#cw-haze)" />

      {/* air-traffic lanes */}
      {traffic.map((l, i) => (
        <g key={i} className="cw-lane" style={{ animationDuration: `${l.dur}s`, animationDirection: l.dir > 0 ? 'normal' : 'reverse' }}>
          {[0, W].map((off) =>
            l.dots.map(([x, dy, r], j) => <circle key={`${off}-${j}`} cx={x + off} cy={l.y + dy} r={r} fill={l.c} opacity="0.85" />),
          )}
        </g>
      ))}

      {towerLayer(mid, 700, '#1c0405', 0.6, 'm')}
      {towerLayer(near, 790, '#0c0102', 0.85, 'n')}

      {/* the window: black mullions */}
      <g fill="#050001">
        <rect x="528" y="0" width="9" height={H} />
        <rect x="1063" y="0" width="9" height={H} />
        <rect x="0" y="86" width={W} height="7" />
      </g>
      <g fill="none" stroke="#b08a52" strokeOpacity="0.18">
        <line x1="537.5" x2="537.5" y1="0" y2={H} />
        <line x1="1072.5" x2="1072.5" y1="0" y2={H} />
      </g>

      <rect y="640" width={W} height="260" fill="url(#cw-floor)" />
    </svg>
  )
}
