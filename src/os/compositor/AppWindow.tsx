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

  // maximized windows stop above the dock, like a zoomed window on a desktop with a visible dock
  const rect = win.maximized ? { x: 0, y: 0, width: area.width, height: area.height - (win.deviceId === 'relic-tv' ? 0 : 84) } : { x: win.x, y: win.y, width: win.width, height: win.height }
  const isForeign = app && app.runtime !== 'relic'

  return (
    <motion.div
      className="absolute"
      style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height, zIndex: win.z }}
      initial={{ opacity: 0, scale: 0.965, y: 14 }}
      animate={win.minimized ? { opacity: 0, scale: 0.6, y: area.height * 0.6, pointerEvents: 'none' } : { opacity: 1, scale: 1, y: 0, pointerEvents: 'auto' }}
      exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.16 } }}
      transition={{ duration: 0.32, ease: [0.2, 0, 0, 1] }}
      onPointerDown={() => !win.focused && relicRuntime.windows.focus(win.id)}
    >
      <div
        className={`relative flex h-full flex-col overflow-hidden border bg-[rgba(14,12,12,0.96)] backdrop-blur-xl transition-[border-color,box-shadow] duration-300 ${win.maximized ? 'rounded-none' : 'rounded-[18px]'} ${
          win.focused
            ? 'border-[rgba(232,36,43,0.32)] shadow-[0_30px_90px_rgba(0,0,0,0.8),0_0_0_1px_rgba(232,36,43,0.12),0_0_60px_rgba(232,36,43,0.16)]'
            : 'border-[var(--line-faint)] shadow-[0_20px_60px_rgba(0,0,0,0.55)]'
        }`}
      >
        {/* title bar — lights on the left, title centred */}
        <div
          className={`group/title relative flex h-[44px] shrink-0 items-center gap-3 border-b px-4 ${win.focused ? 'border-[rgba(245,240,235,0.1)] bg-[rgba(34,27,27,0.55)]' : 'border-[var(--line-faint)] bg-[rgba(24,20,20,0.5)]'} ${dragging ? 'cursor-grabbing' : ''}`}
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
            <Glyph id={win.appId} size={18} className={win.focused ? 'text-signal' : 'text-smoke'} />
            <span className={`truncate text-[14px] font-semibold ${win.focused ? 'text-bone' : 'text-smoke'}`}>{win.title}</span>
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
