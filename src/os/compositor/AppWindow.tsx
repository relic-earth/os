import { useRef, useState, type PointerEvent as RPE, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Minus, Maximize2, Minimize2, X, Cpu } from 'lucide-react'
import type { RelicWindow } from '../../sdk/types'
import { useOS } from '../runtime/store'
import { relicRuntime } from '../runtime/relicRuntime'
import { getApp, runtimeLabel } from '../apps/registry'
import { Glyph } from '../../ui/AppIcon'
import { CompatPanel } from './CompatPanel'
import { ComputerUseOverlay } from './ComputerUseOverlay'

const MIN_W = 380
const MIN_H = 260
type Edge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

const edgeClass: Record<Edge, string> = {
  n: 'top-[-3px] left-2 right-2 h-[6px] cursor-ns-resize',
  s: 'bottom-[-3px] left-2 right-2 h-[6px] cursor-ns-resize',
  e: 'right-[-3px] top-2 bottom-2 w-[6px] cursor-ew-resize',
  w: 'left-[-3px] top-2 bottom-2 w-[6px] cursor-ew-resize',
  ne: 'right-[-4px] top-[-4px] h-3 w-3 cursor-nesw-resize',
  sw: 'left-[-4px] bottom-[-4px] h-3 w-3 cursor-nesw-resize',
  nw: 'left-[-4px] top-[-4px] h-3 w-3 cursor-nwse-resize',
  se: 'right-[-4px] bottom-[-4px] h-3 w-3 cursor-nwse-resize',
}

/** A compositor surface: drag, 8-way resize, focus, minimize, maximize, close. */
export function AppWindow({ win, children }: { win: RelicWindow; children: ReactNode }) {
  const app = getApp(win.appId)
  const area = useOS((s) => s.workArea)
  const compat = useOS((s) => s.compat[win.id])
  const [showCompat, setShowCompat] = useState(false)
  const drag = useRef<{ x: number; y: number; wx: number; wy: number; w: number; h: number; edge?: Edge } | null>(null)
  const [dragging, setDragging] = useState(false)

  const onDown = (e: RPE, edge?: Edge) => {
    if (e.button !== 0) return
    e.stopPropagation()
    relicRuntime.windows.focus(win.id)
    if (win.maximized && !edge) return
    drag.current = { x: e.clientX, y: e.clientY, wx: win.x, wy: win.y, w: win.width, h: win.height, edge }
    setDragging(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onMove = (e: RPE) => {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.edge) {
      const x = Math.min(Math.max(d.wx + dx, -d.w + 120), area.width - 120)
      const y = Math.min(Math.max(d.wy + dy, 0), area.height - 40)
      relicRuntime.windows.move(win.id, x, y)
      return
    }
    let { wx: x, wy: y, w, h } = d
    if (d.edge.includes('e')) w = Math.max(MIN_W, d.w + dx)
    if (d.edge.includes('s')) h = Math.max(MIN_H, d.h + dy)
    if (d.edge.includes('w')) {
      w = Math.max(MIN_W, d.w - dx)
      x = d.wx + (d.w - w)
    }
    if (d.edge.includes('n')) {
      h = Math.max(MIN_H, d.h - dy)
      y = Math.max(0, d.wy + (d.h - h))
    }
    relicRuntime.windows.resize(win.id, { x, y, width: w, height: h })
  }
  const onUp = () => {
    drag.current = null
    setDragging(false)
  }

  // the bottom bar sits outside the work area, so a maximized window fills it
  const rect = win.maximized ? { x: 0, y: 0, width: area.width, height: area.height } : { x: win.x, y: win.y, width: win.width, height: win.height }
  const isForeign = app && app.runtime !== 'relic'

  return (
    <motion.div
      className="absolute"
      style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height, zIndex: win.z }}
      // projected like a hologram: a line of light opens into the window; closing is a CRT switching off
      initial={{ opacity: 0, scaleX: 0.2, scaleY: 0.006, filter: 'brightness(4) saturate(0)' }}
      animate={
        win.minimized
          ? { opacity: 0, scaleX: 0.3, scaleY: 0.02, y: area.height * 0.45, filter: 'brightness(3) blur(4px)', pointerEvents: 'none', transition: { duration: 0.42, ease: [0.5, 0, 0.9, 0.4] } }
          : { opacity: [0, 1, 1], scaleX: [0.2, 1, 1], scaleY: [0.006, 0.006, 1], y: 0, filter: ['brightness(4) saturate(0)', 'brightness(2.2) saturate(0.4)', 'brightness(1) saturate(1)'], pointerEvents: 'auto' }
      }
      exit={{ scaleY: [1, 0.006, 0.006], scaleX: [1, 1, 0], opacity: [1, 1, 0], filter: ['brightness(1)', 'brightness(3)', 'brightness(5)'], transition: { duration: 0.38, times: [0, 0.55, 1], ease: 'easeIn' } }}
      transition={{ duration: 0.62, times: [0, 0.32, 1], ease: [0.2, 0, 0, 1] }}
      onPointerDown={() => !win.focused && relicRuntime.windows.focus(win.id)}
    >
      <div
        className={`relative flex h-full flex-col overflow-hidden border bg-[linear-gradient(180deg,rgba(18,8,9,0.97),rgba(6,3,3,0.97))] backdrop-blur-xl transition-[border-color,box-shadow] duration-300 ${win.maximized ? 'rounded-none' : 'rounded-[18px]'} ${
          win.focused
            ? 'border-[rgba(176,138,82,0.4)] shadow-[inset_0_1px_0_rgba(216,179,122,0.2),0_30px_90px_rgba(0,0,0,0.85),0_0_60px_rgba(200,24,32,0.18)]'
            : 'border-[var(--line-faint)] shadow-[0_20px_60px_rgba(0,0,0,0.55)]'
        }`}
      >
        {/* title bar — lights on the left, title centred */}
        <div
          className={`group/title relative flex h-[44px] shrink-0 items-center gap-3 border-b px-4 ${win.focused ? 'border-[rgba(176,138,82,0.28)] bg-[linear-gradient(180deg,rgba(40,14,16,0.7),rgba(18,6,8,0.6))]' : 'border-[rgba(176,138,82,0.12)] bg-[rgba(14,6,7,0.5)]'} ${dragging ? 'cursor-grabbing' : ''}`}
          onPointerDown={(e) => onDown(e)}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onDoubleClick={() => relicRuntime.windows.toggleMaximize(win.id)}
        >
          <div className="z-10 flex items-center gap-2" onPointerDown={(e) => e.stopPropagation()}>
            <Light label="Close" tone="close" focused={win.focused} onClick={() => relicRuntime.windows.close(win.id)}>
              <X size={9} strokeWidth={3} />
            </Light>
            <Light label="Minimize" tone="min" focused={win.focused} onClick={() => relicRuntime.windows.minimize(win.id)}>
              <Minus size={9} strokeWidth={3} />
            </Light>
            <Light label="Maximize" tone="max" focused={win.focused} onClick={() => relicRuntime.windows.toggleMaximize(win.id)}>
              {win.maximized ? <Minimize2 size={8} strokeWidth={3} /> : <Maximize2 size={8} strokeWidth={3} />}
            </Light>
          </div>
          <div className="pointer-events-none absolute inset-x-28 flex items-center justify-center gap-2">
            <Glyph id={win.appId} size={16} className={win.focused ? 'text-signal' : 'text-soot'} />
            <span className={`truncate text-[11px] font-semibold uppercase tracking-[0.2em] ${win.focused ? 'text-ash' : 'text-soot'}`}>{win.title}</span>
          </div>
          {isForeign && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setShowCompat((v) => !v)}
              className={`z-10 ml-auto flex h-[24px] items-center gap-1.5 rounded-full border px-3 text-[11px] tracking-[0.1em] font-semibold transition-colors ${showCompat ? 'border-red text-bone shadow-[0_0_14px_rgba(232,36,43,0.4)]' : 'hair text-ash hover:text-bone'}`}
              title="Runtime details"
            >
              <Cpu size={11} strokeWidth={1.75} />
              {runtimeLabel[app!.runtime]}
              {compat && <span className="text-signal">· {compat.mode === 'wine' && app!.runtime === 'windows' ? 'WINE' : app!.runtime === 'linux' ? 'SANDBOX' : compat.mode.toUpperCase()}</span>}
            </button>
          )}
        </div>

        <div className="relative min-h-0 flex-1 overflow-clip">
          <div className="holo-scan pointer-events-none absolute inset-0 z-50" />
          {children}
          {showCompat && isForeign && <CompatPanel win={win} onClose={() => setShowCompat(false)} />}
          <ComputerUseOverlay windowId={win.id} />
          {!win.focused && <div className="absolute inset-0" onPointerDown={() => relicRuntime.windows.focus(win.id)} />}
        </div>
      </div>

      {!win.maximized &&
        (Object.keys(edgeClass) as Edge[]).map((edge) => (
          <div key={edge} className={`absolute ${edgeClass[edge]}`} onPointerDown={(e) => onDown(e, edge)} onPointerMove={onMove} onPointerUp={onUp} />
        ))}
    </motion.div>
  )
}

const LIGHT = {
  close: 'bg-[#e8242b] shadow-[0_0_10px_rgba(232,36,43,0.85)]',
  min: 'bg-[#8a1a1f] shadow-[0_0_6px_rgba(138,26,31,0.7)]',
  max: 'bg-[#d8cfc9] shadow-[0_0_6px_rgba(245,240,235,0.35)]',
}

/** A window light: red close, oxblood minimize, bone zoom — glyphs appear on hover, as on a Mac. */
function Light({ children, onClick, label, tone, focused }: { children: ReactNode; onClick: () => void; label: string; tone: keyof typeof LIGHT; focused: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex h-[14px] w-[14px] items-center justify-center rounded-full text-black/0 transition-[color,background,box-shadow] group-hover/title:text-black/75 ${focused ? LIGHT[tone] : 'bg-[#3a3232]'}`}
    >
      {children}
    </button>
  )
}
