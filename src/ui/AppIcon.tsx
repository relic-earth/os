import type { ReactNode } from 'react'

/**
 * RELIC ICON SET — drawn for Relic, not a stock set.
 * Red light on black glass; each glyph has its own motion, which plays on
 * hover of the enclosing `.group` (or continuously with `live`).
 * Animations are pure CSS (see `.ai-*` keyframes in index.css) and respect
 * prefers-reduced-motion.
 */
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

const glyphs: Record<string, ReactNode> = {
  // Claude — a radiant star whose rays turn and breathe
  claude: (
    <g className="ai-spin-slow" style={{ transformOrigin: '24px 24px' }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <line key={i} x1="24" y1={i % 2 ? 13 : 9} x2="24" y2="19" transform={`rotate(${i * 45} 24 24)`} {...S} strokeWidth={i % 2 ? 2 : 2.6} />
      ))}
      <circle cx="24" cy="24" r="3.2" fill="currentColor" className="ai-breathe" style={{ transformOrigin: '24px 24px' }} />
    </g>
  ),
  // Files — stacked plates; the top one lifts
  files: (
    <>
      <rect x="10" y="27" width="28" height="9" rx="3" {...S} opacity="0.55" />
      <rect x="10" y="19" width="28" height="9" rx="3" {...S} opacity="0.8" />
      <rect x="10" y="11" width="28" height="9" rx="3" {...S} className="ai-lift" />
    </>
  ),
  // Browser — a world and its moon
  web: (
    <>
      <circle cx="24" cy="24" r="9.5" {...S} />
      <g transform="rotate(-24 24 24)">
        <ellipse cx="24" cy="24" rx="18" ry="5.5" {...S} strokeWidth="1.4" opacity="0.6" />
        <g transform="translate(24 24) scale(1 0.305)">
          <g className="ai-orbit">
            <circle cx="18" cy="0" r="3.6" fill="currentColor" />
          </g>
        </g>
      </g>
    </>
  ),
  // Applications — four cells that light in turn
  apps: (
    <>
      {[
        [11, 11],
        [26, 11],
        [26, 26],
        [11, 26],
      ].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="11" height="11" rx="3.2" fill="currentColor" className="ai-cell" style={{ animationDelay: `${i * 0.18}s` }} />
      ))}
    </>
  ),
  // Devices — three nodes, signal travelling between them
  devices: (
    <>
      <path d="M14 33 L24 14 L34 33 Z" {...S} strokeWidth="1.6" strokeDasharray="3 4" className="ai-flow" opacity="0.8" />
      <circle cx="24" cy="14" r="4" fill="currentColor" />
      <circle cx="14" cy="33" r="4" fill="currentColor" />
      <circle cx="34" cy="33" r="4" fill="currentColor" />
    </>
  ),
  // Settings — a gyroscope of counter-rotating rings
  settings: (
    <>
      <circle cx="24" cy="24" r="14" {...S} strokeDasharray="5 3.4" className="ai-spin" style={{ transformOrigin: '24px 24px' }} />
      <circle cx="24" cy="24" r="8.5" {...S} strokeDasharray="3 3" className="ai-spin-rev" style={{ transformOrigin: '24px 24px' }} />
      <circle cx="24" cy="24" r="2.6" fill="currentColor" />
    </>
  ),
  // TV — a screen with a sweeping scan
  tv: (
    <>
      <rect x="8" y="11" width="32" height="21" rx="4" {...S} />
      <line x1="18" y1="38" x2="30" y2="38" {...S} />
      <rect x="11" y="14" width="26" height="3" rx="1.5" fill="currentColor" opacity="0.7" className="ai-scan" />
    </>
  ),
  // Movies — two blades that ignite and cross
  movies: (
    <>
      <line x1="13" y1="37" x2="35" y2="11" {...S} strokeWidth="3" pathLength={1} className="ai-ignite" />
      <line x1="35" y1="37" x2="13" y2="11" {...S} strokeWidth="3" pathLength={1} className="ai-ignite" style={{ animationDelay: '0.15s' }} opacity="0.65" />
      <line x1="11" y1="39" x2="15" y2="35" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.5" />
      <line x1="37" y1="39" x2="33" y2="35" stroke="currentColor" strokeWidth="5" strokeLinecap="round" opacity="0.35" />
    </>
  ),
  // Games — a fighter: cockpit between two hex wings that flare
  games: (
    <>
      <path d="M8 13 L12 9 L12 39 L8 35 Z" {...S} className="ai-wing-l" style={{ transformOrigin: '12px 24px' }} />
      <path d="M40 13 L36 9 L36 39 L40 35 Z" {...S} className="ai-wing-r" style={{ transformOrigin: '36px 24px' }} />
      <line x1="12" y1="24" x2="18" y2="24" {...S} />
      <line x1="30" y1="24" x2="36" y2="24" {...S} />
      <circle cx="24" cy="24" r="6.5" {...S} />
      <circle cx="24" cy="24" r="2" fill="currentColor" />
    </>
  ),
  // Music — a living waveform
  music: (
    <>
      {[12, 18, 24, 30, 36].map((x, i) => (
        <line key={x} x1={x} y1="16" x2={x} y2="32" {...S} strokeWidth="3" className="ai-bar" style={{ animationDelay: `${i * 0.12}s`, transformOrigin: `${x}px 24px` }} />
      ))}
    </>
  ),
  // Player — play inside a ring that pulses outward
  player: (
    <>
      <circle cx="24" cy="24" r="14" {...S} className="ai-ripple" style={{ transformOrigin: '24px 24px' }} />
      <path d="M20.5 17 L31 24 L20.5 31 Z" fill="currentColor" />
    </>
  ),
  // Viewer — a sheet with a reading line
  viewer: (
    <>
      <path d="M14 8 H28 L35 15 V40 H14 Z" {...S} />
      <path d="M28 8 V15 H35" {...S} opacity="0.6" />
      <line x1="18" y1="22" x2="31" y2="22" {...S} strokeWidth="1.5" opacity="0.5" />
      <line x1="18" y1="27" x2="31" y2="27" {...S} strokeWidth="1.5" opacity="0.5" />
      <line x1="18" y1="32" x2="26" y2="32" {...S} strokeWidth="1.5" opacity="0.5" />
      <rect x="16" y="20" width="17" height="4" rx="2" fill="currentColor" opacity="0.5" className="ai-read" />
    </>
  ),
  // Windows — four panes on a slant; one lights in turn
  windows: (
    <g transform="skewY(-6) translate(0 3)">
      {[
        [10, 10],
        [26, 10],
        [10, 26],
        [26, 26],
      ].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="13" height="13" rx="1" fill="currentColor" className="ai-cell" style={{ animationDelay: `${i * 0.3}s` }} />
      ))}
    </g>
  ),
  // Relic Build — chevrons rising out of a forge
  'relic-build': (
    <>
      <path d="M14 36 L24 28 L34 36" {...S} opacity="0.45" />
      <path d="M14 28 L24 20 L34 28" {...S} opacity="0.75" className="ai-rise" />
      <path d="M14 20 L24 12 L34 20" {...S} className="ai-rise" style={{ animationDelay: '0.12s' }} />
    </>
  ),
}

/** Monogram tiles for third-party applications — the app's initials, Relic-lit. */
const monograms: Record<string, string> = {
  photoshop: 'Ps',
  autocad: 'Ac',
  excel: 'Xl',
  revit: 'Rv',
  chrome: 'Ch',
  blender: 'Bl',
  vscode: '{ }',
  spotify: 'Sp',
  steam: 'St',
}

/** Device glyphs (static line drawings; the tile carries the light). */
const devices: Record<string, ReactNode> = {
  laptop: (
    <>
      <rect x="11" y="12" width="26" height="17" rx="2.5" {...S} />
      <path d="M7 34 H41 L38 37 H10 Z" {...S} />
    </>
  ),
  desktop: (
    <>
      <rect x="8" y="10" width="32" height="21" rx="3" {...S} />
      <path d="M20 31 L19 38 H29 L28 31" {...S} />
    </>
  ),
  phone: (
    <>
      <rect x="16" y="7" width="16" height="34" rx="4.5" {...S} />
      <line x1="22" y1="11" x2="26" y2="11" {...S} />
    </>
  ),
  car: (
    <>
      <path d="M8 30 V25 L13 17 H35 L40 25 V30 Z" {...S} />
      <circle cx="15" cy="31" r="3" {...S} />
      <circle cx="33" cy="31" r="3" {...S} />
    </>
  ),
  thermostat: (
    <>
      <circle cx="24" cy="24" r="14" {...S} />
      <path d="M24 24 L31 17" {...S} strokeWidth="2.6" />
      <circle cx="24" cy="24" r="2.4" fill="currentColor" />
    </>
  ),
  home: (
    <>
      <path d="M9 22 L24 10 L39 22" {...S} />
      <path d="M13 20 V37 H35 V20" {...S} />
      <rect x="21" y="27" width="6" height="10" rx="1" {...S} />
    </>
  ),
}
devices.tv = glyphs.tv

export function Glyph({ id, size = 24, className = '' }: { id: string; size?: number; className?: string }) {
  const body = glyphs[id] ?? devices[id]
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={`ai ${className}`} aria-hidden>
      {body ?? (
        <text x="24" y="31" textAnchor="middle" fontSize={monograms[id] && monograms[id].length > 2 ? 15 : 19} fontWeight="700" fill="currentColor" style={{ fontFamily: 'var(--font-sans)' }}>
          {monograms[id] ?? id.slice(0, 2)}
        </text>
      )}
    </svg>
  )
}

/**
 * App icon tile — a squircle of black glass with a red glyph.
 * `live` keeps the glyph's motion running (e.g. the focused app).
 */
export function AppIcon({ id, size = 48, live, active, className = '' }: { id: string; size?: number; live?: boolean; active?: boolean; className?: string }) {
  return (
    <span
      className={`app-icon ${live ? 'ai-live' : ''} ${active ? 'app-icon-active' : ''} ${className}`}
      style={{ width: size, height: size, borderRadius: size * 0.26 }}
    >
      <Glyph id={id} size={size * 0.62} />
    </span>
  )
}
