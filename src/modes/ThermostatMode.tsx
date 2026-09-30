import { useEffect, useRef, useState, type PointerEvent as RPE } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Minus, Plus } from 'lucide-react'
import { useOS } from '../os/runtime/store'
import { relicRuntime } from '../os/runtime/relicRuntime'
import { Background } from '../os/shell/Background'
import { DeviceSwitcher } from '../os/shell/TopBar'
import { Wordmark } from '../ui/primitives'

const MIN = 50
const MAX = 90
const START = 135 // degrees, dial sweep 270°
const SWEEP = 270
const R = 150

const angleFor = (t: number) => START + ((t - MIN) / (MAX - MIN)) * SWEEP
const pt = (deg: number, r = R) => {
  const a = (deg * Math.PI) / 180
  return [200 + r * Math.cos(a), 200 + r * Math.sin(a)]
}
const arc = (from: number, to: number, r = R) => {
  const [x1, y1] = pt(from, r)
  const [x2, y2] = pt(to, r)
  return `M${x1} ${y1} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`
}

type Panel = 'main' | 'fan' | 'climate' | 'settings'

/** RELIC THERMOSTAT — the same OS reduced to a single purpose. */
export function ThermostatMode() {
  const th = useOS((s) => s.thermostat)
  const [panel, setPanel] = useState<Panel>('main')
  const dragging = useRef(false)
  const svg = useRef<SVGSVGElement>(null)
  const by = 'RELIC THERMOSTAT'

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') relicRuntime.home.thermostat.nudge(1, by)
      if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') relicRuntime.home.thermostat.nudge(-1, by)
    }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])

  const fromPointer = (e: RPE) => {
    const r = svg.current!.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * 400 - 200
    const y = ((e.clientY - r.top) / r.height) * 400 - 200
    let deg = (Math.atan2(y, x) * 180) / Math.PI
    if (deg < 0) deg += 360
    let rel = deg - START
    if (rel < 0) rel += 360
    if (rel > SWEEP) return
    relicRuntime.home.thermostat.setTemperature(MIN + (rel / SWEEP) * (MAX - MIN), by)
  }

  const heating = th.indoor < th.target && th.mode !== 'OFF'
  const cooling = th.indoor > th.target && th.mode !== 'OFF'
  const ta = angleFor(th.target)
  const ia = angleFor(th.indoor)

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-clip">
      <Background variant="topographic" />
      <div className="absolute left-8 top-6 z-10 flex items-center gap-6">
        <Wordmark />
        <span className="label">DEVICE PROFILE · RELIC THERMOSTAT · HALLWAY</span>
      </div>
      <div className="absolute right-8 top-6 z-20"><DeviceSwitcher /></div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.2, 0, 0, 1] }}
        className="relative aspect-square rounded-full border border-[#2a2020] bg-[radial-gradient(circle_at_50%_35%,#141010_0%,#070606_60%,#030303_100%)] shadow-[0_40px_120px_rgba(0,0,0,0.9),0_0_0_10px_#0b0909,0_0_0_11px_rgba(179,20,27,0.35),0_0_80px_rgba(125,15,20,0.25)]"
        style={{ width: 'min(560px, 82vmin)' }}
      >
        <svg
          ref={svg}
          viewBox="0 0 400 400"
          className="absolute inset-0 h-full w-full touch-none"
          onPointerDown={(e) => {
            if (panel !== 'main') return
            dragging.current = true
            ;(e.target as Element).setPointerCapture?.(e.pointerId)
            fromPointer(e)
          }}
          onPointerMove={(e) => dragging.current && fromPointer(e)}
          onPointerUp={() => (dragging.current = false)}
        >
          {Array.from({ length: 81 }).map((_, i) => {
            const deg = START + (i / 80) * SWEEP
            const [x1, y1] = pt(deg, 172)
            const [x2, y2] = pt(deg, i % 10 === 0 ? 160 : 166)
            const active = deg <= ta
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={active ? '#b3141b' : '#3b3634'} strokeWidth={i % 10 === 0 ? 1.4 : 0.8} opacity={active ? 0.95 : 0.6} />
          })}
          <path d={arc(START, START + SWEEP)} stroke="#1d1818" strokeWidth="6" fill="none" strokeLinecap="round" />
          <motion.path d={arc(START, ta)} stroke="#e8242b" strokeWidth="6" fill="none" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 8px rgba(232,36,43,0.7))' }} initial={false} animate={{ d: arc(START, ta) }} transition={{ duration: 0.3 }} />
          {/* indoor marker */}
          {(() => {
            const [x, y] = pt(ia, 150)
            return <circle cx={x} cy={y} r="4" fill="#ebe5df" />
          })()}
          {/* setpoint knob */}
          {(() => {
            const [x, y] = pt(ta, 150)
            return (
              <g style={{ cursor: 'grab' }}>
                <circle cx={x} cy={y} r="13" fill="#e8242b" opacity="0.2" />
                <circle cx={x} cy={y} r="7" fill="#e8242b" stroke="#ffd0d0" strokeWidth="1" />
              </g>
            )
          })()}
        </svg>

        <div className="pointer-events-none absolute inset-[18%] flex flex-col items-center justify-center text-center">
          <AnimatePresence mode="wait">
            {panel === 'main' && (
              <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
                <div className={`label-sm ${heating || cooling ? 'pulse text-red' : ''}`}>{th.mode === 'OFF' ? 'OFF' : heating ? `HEATING TO ${th.target}°` : cooling ? `COOLING TO ${th.target}°` : 'HOLDING'}</div>
                <motion.div key={th.target} initial={{ opacity: 0.4, y: 4 }} animate={{ opacity: 1, y: 0 }} className="num mt-2 text-[clamp(64px,13vmin,112px)] font-extralight leading-none tracking-[-0.02em] text-bone">
                  {th.target}°
                </motion.div>
                <div className="label mt-3 text-ash">INDOOR {th.indoor}°</div>
                <div className="pointer-events-auto mt-6 flex items-center gap-10">
                  <button className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--line)] text-bone hover:border-red hover:shadow-[var(--glow)]" onClick={() => relicRuntime.home.thermostat.nudge(-1, by)} aria-label="Lower temperature"><Minus size={18} strokeWidth={1.25} /></button>
                  <button className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--line)] text-bone hover:border-red hover:shadow-[var(--glow)]" onClick={() => relicRuntime.home.thermostat.nudge(1, by)} aria-label="Raise temperature"><Plus size={18} strokeWidth={1.25} /></button>
                </div>
              </motion.div>
            )}
            {panel === 'fan' && (
              <motion.div key="fan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-auto flex flex-col items-center gap-4">
                <div className="label text-red">FAN</div>
                {(['AUTO', 'ON'] as const).map((f) => (
                  <button key={f} onClick={() => relicRuntime.home.thermostat.setFan(f)} className={`btn w-36 ${th.fan === f ? 'btn-primary' : 'btn-ghost'}`}>{f}</button>
                ))}
              </motion.div>
            )}
            {panel === 'climate' && (
              <motion.div key="climate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-auto grid grid-cols-2 gap-2">
                <div className="label col-span-2 mb-2 text-red">CLIMATE</div>
                {(['HEAT', 'COOL', 'AUTO', 'OFF'] as const).map((m) => (
                  <button key={m} onClick={() => relicRuntime.home.thermostat.setMode(m)} className={`btn w-24 ${th.mode === m ? 'btn-primary' : 'btn-ghost'}`}>{m}</button>
                ))}
              </motion.div>
            )}
            {panel === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full space-y-2">
                <div className="label mb-3 text-red">SETTINGS</div>
                {[['HUMIDITY', `${th.humidity}%`], ['SCHEDULE', 'COMFORT 68–70°'], ['MESH', 'THREAD · ONLINE'], ['CLAUDE', 'HOME COMFORT GRANT']].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b hair-faint pb-1.5"><span className="label-sm">{k}</span><span className="text-[9px] tracking-[0.22em] text-bone">{v}</span></div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="absolute bottom-[9%] left-1/2 flex -translate-x-1/2 gap-5">
          {(['fan', 'climate', 'settings'] as Panel[]).map((p) => (
            <button key={p} onClick={() => setPanel(panel === p ? 'main' : p)} className={`text-[9px] tracking-[0.34em] ${panel === p ? 'text-signal' : 'text-ash hover:text-bone'}`}>
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </motion.div>

      <div className="absolute bottom-8 left-8 max-w-[300px]">
        <div className="label text-red">SAME OS · SINGLE PURPOSE</div>
        <div className="mt-2 text-[12px] leading-relaxed text-ash">Changes here update global device state — Claude, the phone and the desktop see the new setpoint immediately.</div>
      </div>
      <div className="label-sm absolute bottom-8 right-8 text-smoke">DRAG THE RING · ↑ ↓ ADJUST</div>
    </div>
  )
}
