import { useNow, useMesh } from './primitives'
import { useOS } from '../os/runtime/store'

/**
 * HUD REACTOR — the rings around the clock. Arc-reactor geometry (JARVIS),
 * an Imperial targeting sweep, a live seconds arc, and EDITH-style callouts
 * tied to the ring with leader lines. All motion is CSS (`.rx-*`).
 */
export function HudReactor({ size = 560 }: { size?: number }) {
  const now = useNow(1000)
  const { online, total } = useMesh()
  const temp = useOS((s) => s.thermostat.target)
  const busy = useOS((s) => s.agentBusy)
  const sec = new Date(now).getSeconds()
  const C = 300 // viewBox centre
  const arc = (r: number, a0: number, a1: number) => {
    const p = (a: number) => [C + r * Math.cos(((a - 90) * Math.PI) / 180), C + r * Math.sin(((a - 90) * Math.PI) / 180)]
    const [x0, y0] = p(a0)
    const [x1, y1] = p(a1)
    return `M${x0} ${y0} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`
  }

  return (
    <svg viewBox="0 0 600 600" width={size} height={size} className="rx pointer-events-none overflow-visible" aria-hidden>
      <defs>
        <radialGradient id="rx-core" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ff3a40" stopOpacity="0.16" />
          <stop offset="0.6" stopColor="#ff3a40" stopOpacity="0.04" />
          <stop offset="1" stopColor="#ff3a40" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="rx-sweep" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ff3a40" stopOpacity="0" />
          <stop offset="1" stopColor="#ff3a40" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <circle cx={C} cy={C} r="250" fill="url(#rx-core)" />

      {/* outer tick ring: 60 ticks, the current second lit */}
      <g>
        {Array.from({ length: 60 }).map((_, i) => (
          <line
            key={i}
            x1={C}
            y1={C - 262}
            x2={C}
            y2={C - (i % 5 ? 254 : 246)}
            transform={`rotate(${i * 6} ${C} ${C})`}
            stroke={i === sec ? '#fff' : i < sec ? '#ff3a40' : 'rgba(176,138,82,0.45)'}
            strokeWidth={i % 5 ? 1.2 : 2}
            style={i === sec ? { filter: 'drop-shadow(0 0 4px #ff3a40)' } : undefined}
          />
        ))}
      </g>

      {/* segmented arc ring — counter-rotating */}
      <g className="rx-spin-rev">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path key={i} d={arc(232, i * 60 + 4, i * 60 + 44)} fill="none" stroke="#ff3a40" strokeOpacity="0.55" strokeWidth="5" strokeLinecap="butt" />
        ))}
      </g>
      {/* fine dashed ring */}
      <g className="rx-spin">
        <circle cx={C} cy={C} r="218" fill="none" stroke="rgba(216,179,122,0.4)" strokeWidth="1" strokeDasharray="2 6" />
        <path d={arc(218, 0, 70)} fill="none" stroke="#d8b37a" strokeOpacity="0.8" strokeWidth="2" />
        <path d={arc(218, 180, 215)} fill="none" stroke="#d8b37a" strokeOpacity="0.8" strokeWidth="2" />
      </g>
      {/* targeting sweep */}
      <g className="rx-sweep">
        <path d={`M${C} ${C} L${C + 205} ${C} A205 205 0 0 0 ${C + 205 * Math.cos(-0.5)} ${C + 205 * Math.sin(-0.5)} Z`} fill="url(#rx-sweep)" />
      </g>
      {/* inner rings */}
      <circle cx={C} cy={C} r="196" fill="none" stroke="rgba(255,58,64,0.25)" strokeWidth="1" />
      <g className={busy ? 'rx-spin-fast' : 'rx-spin-slow'}>
        <path d={arc(184, 20, 140)} fill="none" stroke="#ff3a40" strokeOpacity="0.8" strokeWidth="1.5" />
        <path d={arc(184, 200, 320)} fill="none" stroke="#ff3a40" strokeOpacity="0.8" strokeWidth="1.5" />
        {[0, 90, 180, 270].map((a) => (
          <rect key={a} x={C - 3} y={C - 190} width="6" height="12" fill="#ff3a40" transform={`rotate(${a} ${C} ${C})`} />
        ))}
      </g>

      {/* EDITH callouts */}
      <Callout x1={C - 236} y1={C - 70} x2={C - 330} y2={C - 140} label="Device mesh" value={`${online}/${total} online`} align="end" />
      <Callout x1={C + 236} y1={C - 60} x2={C + 330} y2={C - 130} label="Climate" value={`${temp}° holding`} align="start" />
      <Callout x1={C + 220} y1={C + 100} x2={C + 320} y2={C + 160} label="Claude" value={busy ? 'working' : 'standing by'} align="start" hot={busy} />
    </svg>
  )
}

function Callout({ x1, y1, x2, y2, label, value, align, hot }: { x1: number; y1: number; x2: number; y2: number; label: string; value: string; align: 'start' | 'end'; hot?: boolean }) {
  const tx = align === 'end' ? x2 - 70 : x2 + 70
  return (
    <g className="rx-callout">
      <circle cx={x1} cy={y1} r="3" fill="#ff3a40" />
      <circle cx={x1} cy={y1} r="8" fill="none" stroke="#ff3a40" strokeOpacity="0.6" className="rx-ping" />
      <polyline points={`${x1},${y1} ${x2},${y2} ${tx},${y2}`} fill="none" stroke="rgba(216,179,122,0.6)" strokeWidth="1" className="rx-lead" />
      <text x={align === 'end' ? tx : tx} y={y2 - 10} textAnchor={align} className="rx-label" fill="#b08a52">
        {label.toUpperCase()}
      </text>
      <text x={align === 'end' ? tx : tx} y={y2 + 18} textAnchor={align} className="rx-value" fill={hot ? '#ff3a40' : '#f5f0eb'}>
        {value.toUpperCase()}
      </text>
    </g>
  )
}
