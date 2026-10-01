import { useEffect, useRef, useState } from 'react'
import { PlanSheet } from '../viewer/PlanSheet'
import { Art } from '../../ui/Art'

const seg = 'Segoe UI, Helvetica Neue, Arial, sans-serif'

/** Simulated AutoCAD (Windows) — drafting surface with a working command line. */
export function AutoCAD() {
  const [log, setLog] = useState<string[]>(['Regenerating model.', 'AutoCAD menu utilities loaded.', 'Command:'])
  const [cmd, setCmd] = useState('')
  const [cursor, setCursor] = useState({ x: 0, y: 0 })
  const run = () => {
    if (!cmd.trim()) return
    const c = cmd.trim().toUpperCase()
    const reply: Record<string, string> = { LINE: 'Specify first point:', ZOOM: 'Specify corner of window, or [All/Extents]: E', OFFSET: 'Specify offset distance <1\'-0">:', DIST: 'Distance = 84\'-0", Angle in XY Plane = 0', LAYER: '14 layers · A-WALL current' }
    setLog((l) => [...l.slice(-6), `Command: ${c}`, reply[c] ?? `Unknown command "${c}". Press F1 for help.`])
    setCmd('')
  }
  return (
    <div className="flex h-full flex-col bg-[#0a0909] text-[11px] text-ash" style={{ fontFamily: seg }}>
      <div className="flex h-7 items-center gap-4 border-b border-black bg-[#141212] px-3">
        {['Home', 'Insert', 'Annotate', 'Parametric', 'View', 'Manage', 'Output'].map((m, i) => (
          <span key={m} className={i === 0 ? 'border-b border-red text-bone' : ''}>{m}</span>
        ))}
        <span className="ml-auto text-smoke">Site Plan.dwg</span>
      </div>
      <div
        className="relative flex-1 cursor-crosshair overflow-hidden"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          setCursor({ x: e.clientX - r.left, y: e.clientY - r.top })
        }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(rgb(var(--acc-2)/0.07)_1px,transparent_1px),linear-gradient(90deg,rgb(var(--acc-2)/0.07)_1px,transparent_1px)] bg-[size:24px_24px]" />
        <div className="absolute inset-6 opacity-90">
          <PlanSheet index={2} />
        </div>
        <div className="pointer-events-none absolute h-full w-px bg-bone/30" style={{ left: cursor.x }} />
        <div className="pointer-events-none absolute h-px w-full bg-bone/30" style={{ top: cursor.y }} />
        <div className="pointer-events-none absolute h-3 w-3 border border-bone/70" style={{ left: cursor.x - 6, top: cursor.y - 6 }} />
      </div>
      <div className="border-t border-black bg-[#101010] px-3 py-1.5 font-mono text-[11px]">
        {log.slice(-3).map((l, i) => (
          <div key={i} className="text-smoke">{l}</div>
        ))}
        <div className="flex items-center gap-2">
          <span className="text-red">›</span>
          <input value={cmd} onChange={(e) => setCmd(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && run()} placeholder="Type a command (LINE, ZOOM, DIST, LAYER)" className="flex-1 bg-transparent text-bone outline-none placeholder:text-soot" aria-label="AutoCAD command" />
        </div>
      </div>
      <div className="flex h-6 items-center gap-4 border-t border-black bg-[#141212] px-3">
        <span className="num text-bone">{(cursor.x * 0.21).toFixed(4)}, {(cursor.y * 0.21).toFixed(4)}, 0.0000</span>
        <span>MODEL</span>
        <span>GRID</span>
        <span>SNAP</span>
        <span className="ml-auto text-smoke">RELIC RUNTIME · WINE</span>
      </div>
    </div>
  )
}

/** Simulated Revit (Windows) — axonometric model + project browser. */
export function Revit() {
  const [view, setView] = useState('3D · {3D}')
  const views = ['3D · {3D}', 'Level 1', 'Level 2', 'North Elevation', 'Section A']
  return (
    <div className="flex h-full bg-[#0a0909] text-[11px] text-ash" style={{ fontFamily: seg }}>
      <div className="w-[200px] border-r border-black bg-[#121010] p-2">
        <div className="mb-2 text-bone">Project Browser · Relic House</div>
        {views.map((v) => (
          <button key={v} onClick={() => setView(v)} className={`block w-full px-2 py-1 text-left ${view === v ? 'bg-oxblood/60 text-bone' : 'hover:text-bone'}`}>{v}</button>
        ))}
        <div className="mt-4 text-smoke">Levels 3 · Views 62 · Sheets 14</div>
      </div>
      <div className="relative flex-1">
        {view.startsWith('3D') ? (
          <svg viewBox="0 0 600 400" className="h-full w-full">
            <g stroke="#ebe5df" strokeWidth="0.8" fill="none">
              <path d="M150 260 L300 320 L480 240 L330 180 Z" fill="#e8242b" fillOpacity="0.05" />
              <path d="M150 260 L150 210 L300 270 L300 320 M300 270 L480 190 L480 240 M150 210 L330 130 L480 190" />
              <path d="M200 205 L200 165 L330 110 L440 158 L440 190 M200 165 L310 214 L310 245 M310 214 L440 158" strokeOpacity="0.8" />
              {Array.from({ length: 7 }).map((_, i) => <line key={i} x1={320 + i * 22} y1={275 - i * 9} x2={320 + i * 22} y2={236 - i * 9} stroke="#e8242b" strokeOpacity="0.6" />)}
            </g>
          </svg>
        ) : (
          <div className="absolute inset-6"><PlanSheet index={view === 'Level 2' ? 3 : view.includes('Elevation') ? 4 : view.includes('Section') ? 5 : 2} /></div>
        )}
        <div className="absolute bottom-2 left-3 text-smoke">{view} · 1/8" = 1'-0" · Detail: Medium</div>
      </div>
    </div>
  )
}

/** Simulated Blender (Linux native) — rotating viewport. */
export function Blender() {
  const [spin, setSpin] = useState(true)
  const [a, setA] = useState(0)
  const raf = useRef(0)
  useEffect(() => {
    if (!spin) return
    const tick = () => {
      setA((x) => (x + 0.4) % 360)
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [spin])
  const r = (a * Math.PI) / 180
  const pts = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map(([x, y, z]) => {
    const X = x * Math.cos(r) - z * Math.sin(r)
    const Z = x * Math.sin(r) + z * Math.cos(r)
    const Y = y * 0.6
    return [300 + X * 110, 200 + Y * 110 + Z * 30]
  })
  const edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]]
  return (
    <div className="flex h-full flex-col bg-[#0b0a0a] text-[11px] text-ash" style={{ fontFamily: seg }}>
      <div className="flex h-7 items-center gap-4 border-b border-black bg-[#141212] px-3">
        {['Layout', 'Modeling', 'Sculpting', 'Shading', 'Animation', 'Rendering'].map((m, i) => (
          <span key={m} className={i === 0 ? 'text-bone' : ''}>{m}</span>
        ))}
        <button onClick={() => setSpin((s) => !s)} className="ml-auto border border-[#2a2424] px-2 text-bone">{spin ? 'Pause turntable' : 'Turntable'}</button>
      </div>
      <div className="relative flex-1">
        <svg viewBox="0 0 600 400" className="h-full w-full">
          {Array.from({ length: 21 }).map((_, i) => (
            <line key={i} x1={i * 30} y1="300" x2={300 + (i * 30 - 300) * 2.5} y2="400" stroke="#3a0a0d" strokeWidth="0.5" />
          ))}
          <line x1="0" y1="300" x2="600" y2="300" stroke="#7d0f14" strokeWidth="0.6" />
          {edges.map(([p, q], i) => (
            <line key={i} x1={pts[p][0]} y1={pts[p][1]} x2={pts[q][0]} y2={pts[q][1]} stroke="#ebe5df" strokeWidth="1" />
          ))}
          {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.2" fill="#e8242b" />)}
        </svg>
        <div className="absolute left-3 top-2 text-smoke">User Perspective · (1) Collection | Relic Monolith</div>
        <div className="absolute bottom-2 right-3 text-smoke">Verts 8 · Faces 6 · Tris 12 · Vulkan · Linux native</div>
      </div>
    </div>
  )
}

/** Simulated VS Code (Linux native). */
export function VSCode() {
  const code = `import { relic } from '@relic/sdk'

// A Relic app is one program for every device node.
export default relic.app({
  id: 'relic-house',
  devices: ['laptop', 'tv', 'phone'],
  async onOpen(ctx) {
    const plans = await relic.files.search('permit plans')
    const tv = relic.devices.find('relic-tv')
    if (ctx.device.has('large-display')) return ctx.show(plans[0])
    await relic.media.sendTo(ctx.session.id, tv.id)
  },
})`
  return (
    <div className="flex h-full bg-[#0b0a0a] text-[12px]" style={{ fontFamily: 'var(--font-mono)' }}>
      <div className="w-[180px] border-r border-black bg-[#121010] p-3 text-[11px] text-ash" style={{ fontFamily: seg }}>
        <div className="mb-2 text-[11px] tracking-[0.09em] font-semibold text-smoke">EXPLORER · RELIC-OS</div>
        {['src/', '  os/', '  agent/', '  mesh/', '  sdk/', 'relic.manifest.json', 'house.app.ts'].map((f) => (
          <div key={f} className={`whitespace-pre py-0.5 ${f === 'house.app.ts' ? 'text-bone' : ''}`}>{f}</div>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-4 leading-6">
        {code.split('\n').map((l, i) => (
          <div key={i} className="flex">
            <span className="w-8 select-none text-right text-soot">{i + 1}</span>
            <span className="ml-4 whitespace-pre text-bone/85">
              {l.split(/(\bimport\b|\bfrom\b|\bexport\b|\bdefault\b|\bconst\b|\bawait\b|\basync\b|\breturn\b|\bif\b|'[^']*')/).map((t, j) =>
                /^'/.test(t) ? <span key={j} className="text-[#d88]">{t}</span> : /^(import|from|export|default|const|await|async|return|if)$/.test(t) ? <span key={j} className="text-red">{t}</span> : <span key={j}>{t}</span>,
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Simulated Steam (Linux, Proton for Windows titles). */
export function Steam() {
  const games = [
    { t: 'Ashfall', r: 'PROTON 9', art: 'volcano', h: 142 },
    { t: 'Obsidian Protocol', r: 'PROTON 9', art: 'spire', h: 61 },
    { t: 'Citadel', r: 'LINUX NATIVE', art: 'city', h: 23 },
    { t: 'Drift Theory', r: 'PROTON 9', art: 'horizon', h: 9 },
  ]
  const [sel, setSel] = useState(0)
  const g = games[sel]
  return (
    <div className="flex h-full bg-[#0a0909] text-[11px] text-ash" style={{ fontFamily: seg }}>
      <div className="w-[200px] border-r border-black bg-[#121010] py-2">
        <div className="px-3 pb-2 text-[11px] tracking-[0.09em] font-semibold text-smoke">LIBRARY</div>
        {games.map((x, i) => (
          <button key={x.t} onClick={() => setSel(i)} className={`block w-full px-3 py-1.5 text-left ${i === sel ? 'bg-oxblood/60 text-bone' : 'hover:text-bone'}`}>{x.t}</button>
        ))}
      </div>
      <div className="relative flex-1">
        <Art variant={g.art} className="absolute inset-0 h-full w-full opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/40 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6">
          <div className="text-[28px] tracking-[0.09em] font-semibold text-bone">{g.t.toUpperCase()}</div>
          <div className="mt-2 flex items-center gap-4">
            <button className="btn btn-primary">PLAY</button>
            <span className="label-sm">{g.r} · {g.h} HRS PLAYED · CLOUD SAVES SYNCED</span>
          </div>
        </div>
      </div>
    </div>
  )
}
