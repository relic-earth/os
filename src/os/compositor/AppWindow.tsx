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
    // pointer coordinates are screen pixels; window geometry is in zoomed layout pixels
    const z = Number(document.documentElement.style.zoom) || 1
    const dx = (e.clientX - d.x) / z
    const dy = (e.clientY - d.y) / z
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
      // a window arrives out of focus and settles, like an optic finding its subject;
      // it leaves the same way, sinking toward the command bar when minimized
      initial={{ opacity: 0, scale: 0.94, y: 18, filter: 'blur(14px)' }}
      animate={
        win.minimized
          ? { opacity: 0, scale: 0.86, y: area.height * 0.4, filter: 'blur(12px)', pointerEvents: 'none', transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } }
          : { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)', pointerEvents: 'auto' }
      }
      exit={{ opacity: 0, scale: 0.96, filter: 'blur(10px)', transition: { duration: 0.32, ease: [0.4, 0, 1, 1] } }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      onPointerDown={() => !win.focused && relicRuntime.windows.focus(win.id)}
    >
      {/* glow lives on this wrapper: the frame below is clipped, so it cannot cast its own */}
      <div className="h-full">
      <div
        className={`win-frame relative flex h-full flex-col overflow-hidden ${win.focused ? 'is-focused' : ''} ${win.maximized ? 'is-max' : ''}`}
      >
        {/* header: glyph and title — keys on the right */}
        <div
          className={`relative flex h-[42px] shrink-0 items-center gap-3 border-b border-[var(--hair)] px-4 ${dragging ? 'cursor-grabbing' : ''}`}
          onPointerDown={(e) => onDown(e)}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onDoubleClick={() => relicRuntime.windows.toggleMaximize(win.id)}
        >
          <Glyph id={win.appId} size={18} active={win.focused} className={win.focused ? 'text-[rgb(var(--acc))]' : 'text-smoke'} />
          <span className={`truncate font-display text-[10.5px] tracking-[0.3em] transition-colors duration-500 ${win.focused ? 'text-bone' : 'text-smoke'}`}>{win.title.toUpperCase()}</span>
          {isForeign && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setShowCompat((v) => !v)}
              className={`hud-chip z-10 ml-2 gap-1.5 ${showCompat ? '!border-[rgb(var(--acc))] !text-white' : ''}`}
              title="Runtime details"
            >
              <Cpu size={11} strokeWidth={1.75} />
              {runtimeLabel[app!.runtime]}
              {compat && <span className="text-signal">· {compat.mode === 'wine' && app!.runtime === 'windows' ? 'WINE' : app!.runtime === 'linux' ? 'SANDBOX' : compat.mode.toUpperCase()}</span>}
            </button>
          )}
          <div className="z-10 ml-auto flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
            <WinKey label="Minimize" onClick={() => relicRuntime.windows.minimize(win.id)}>
              <Minus size={13} strokeWidth={1.5} />
            </WinKey>
            <WinKey label="Maximize" onClick={() => relicRuntime.windows.toggleMaximize(win.id)}>
              {win.maximized ? <Minimize2 size={12} strokeWidth={1.5} /> : <Maximize2 size={12} strokeWidth={1.5} />}
            </WinKey>
            <WinKey label="Close" danger onClick={() => relicRuntime.windows.close(win.id)}>
              <X size={14} strokeWidth={1.5} />
            </WinKey>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 overflow-clip">
          <div className="holo-scan pointer-events-none absolute inset-0 z-50" />
          {children}
          {showCompat && isForeign && <CompatPanel win={win} onClose={() => setShowCompat(false)} />}
          <ComputerUseOverlay windowId={win.id} />
          {!win.focused && <div className="absolute inset-0" onPointerDown={() => relicRuntime.windows.focus(win.id)} />}
        </div>
      </div>

      </div>
      {!win.maximized &&
        (Object.keys(edgeClass) as Edge[]).map((edge) => (
          <div key={edge} className={`absolute ${edgeClass[edge]}`} onPointerDown={(e) => onDown(e, edge)} onPointerMove={onMove} onPointerUp={onUp} />
        ))}
    </motion.div>
  )
}

/** A window key: a quiet glass button. Close warms to the accent. */
function WinKey({ children, onClick, label, danger }: { children: ReactNode; onClick: () => void; label: string; danger?: boolean }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className={`win-key ${danger ? 'win-key-danger' : ''}`}>
      {children}
    </button>
  )
}
