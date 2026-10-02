/**
 * THE RING — an orbital habitat drawn in light: a wheel of land and glass
 * on spokes around a hub, laid back in perspective and turning slowly.
 * Pure SVG in CSS 3D (see `.orb-*` in index.css): the rim is four stacked
 * layers along Z, which gives it a wall; everything stops under
 * prefers-reduced-motion. Colours come from the theme (--acc, --gold).
 */
const C = 300

function Layer({ z, rim, detail }: { z: number; rim: number; detail?: boolean }) {
  const spokes = 6
  return (
    <svg viewBox="0 0 600 600" className="absolute inset-0 h-full w-full overflow-visible" style={{ transform: `translateZ(${z}px)` }} aria-hidden>
      <g className="orb-spin">
        {/* the rim: brushed metal, brighter where it faces the sun */}
        <circle cx={C} cy={C} r={270} fill="none" stroke="url(#orb-metal)" strokeWidth={rim} />
        {detail && (
          <>
            {/* the habitat floor: land and lakes along the inside of the wheel */}
            <circle cx={C} cy={C} r={254} fill="none" stroke="rgb(var(--gold) / 0.55)" strokeWidth={10} strokeDasharray="30 6 12 4 44 8 20 5" />
            <circle cx={C} cy={C} r={247} fill="none" stroke="rgb(var(--acc) / 0.35)" strokeWidth={1} />
            {/* window bays */}
            <circle cx={C} cy={C} r={270} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={2} strokeDasharray="2 14" className="orb-glint" />
            {/* spokes and the hub */}
            {Array.from({ length: spokes }).map((_, i) => {
              const a = (i / spokes) * Math.PI * 2
              return <line key={i} x1={C + Math.cos(a) * 46} y1={C + Math.sin(a) * 46} x2={C + Math.cos(a) * 246} y2={C + Math.sin(a) * 246} stroke="rgb(var(--acc) / 0.45)" strokeWidth={1.4} />
            })}
            <circle cx={C} cy={C} r={46} fill="none" stroke="rgb(var(--acc) / 0.6)" strokeWidth={1.4} />
            <circle cx={C} cy={C} r={30} fill="rgb(var(--acc) / 0.08)" stroke="rgb(var(--acc) / 0.35)" strokeWidth={1} />
            {/* running lights */}
            {Array.from({ length: 24 }).map((_, i) => {
              const a = (i / 24) * Math.PI * 2
              return <circle key={i} cx={C + Math.cos(a) * 284} cy={C + Math.sin(a) * 284} r={1.6} fill="rgb(var(--acc))" className="orb-glint" style={{ animationDelay: `${(i % 6) * 1.5}s` }} />
            })}
          </>
        )}
      </g>
    </svg>
  )
}

export function OrbitalRing({ size = 560, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`orb pointer-events-none relative ${className}`} style={{ width: size, height: size }}>
      <svg width="0" height="0" className="absolute" aria-hidden>
        <defs>
          <linearGradient id="orb-metal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="rgb(var(--gold-2))" stopOpacity="0.9" />
            <stop offset="0.35" stopColor="rgb(var(--acc))" stopOpacity="0.55" />
            <stop offset="0.6" stopColor="rgb(var(--ink-2))" stopOpacity="0.9" />
            <stop offset="1" stopColor="rgb(var(--acc))" stopOpacity="0.7" />
          </linearGradient>
        </defs>
      </svg>
      {/* the planet's light on the station, from below */}
      <div className="absolute inset-x-[8%] bottom-[22%] top-[52%] rounded-[50%] bg-[radial-gradient(closest-side,rgb(var(--gold)/0.18),transparent)] blur-2xl" />
      <div className="orb-tilt absolute inset-0">
        <Layer z={0} rim={5} />
        <Layer z={8} rim={5} />
        <Layer z={16} rim={5} />
        <Layer z={24} rim={6} detail />
      </div>
    </div>
  )
}
