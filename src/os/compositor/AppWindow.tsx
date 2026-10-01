import { useRef, useState, type PointerEvent as RPE, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Minus, Square, Copy, X, Cpu } from 'lucide-react'
import type { RelicWindow } from '../../sdk/types'
import { useOS } from '../runtime/store'
import { relicRuntime } from '../runtime/relicRuntime'
import { getApp, runtimeLabel } from '../apps/registry'
import { Icon } from '../../ui/Icon'
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
        className={`relative flex h-full flex-col overflow-hidden border bg-[rgba(14,12,12,0.96)] backdrop-blur-xl transition-[border-color,box-shadow] duration-300 ${win.maximized ? 'rounded-none' : 'rounded-[12px]'} ${
          win.focused ? 'border-[rgba(235,229,223,0.16)] shadow-[0_30px_90px_rgba(0,0,0,0.75)]' : 'border-[var(--line-faint)] shadow-[0_20px_60px_rgba(0,0,0,0.55)]'
        }`}
      >
        {/* title bar */}
        <div
          className={`relative flex h-[38px] shrink-0 items-center gap-2.5 border-b bg-[rgba(30,25,25,0.5)] pl-3.5 pr-1.5 ${win.focused ? 'hair' : 'hair-faint'} ${dragging ? 'cursor-grabbing' : ''}`}
          onPointerDown={(e) => onDown(e)}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onDoubleClick={() => relicRuntime.windows.toggleMaximize(win.id)}
        >
          <Icon name={app?.icon} size={14} strokeWidth={1.75} className={win.focused ? 'text-signal' : 'text-smoke'} />
          <span className={`truncate text-[13px] font-semibold ${win.focused ? 'text-bone' : 'text-smoke'}`}>{win.title}</span>
          {isForeign && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setShowCompat((v) => !v)}
              className={`flex h-[20px] items-center gap-1.5 rounded-full border px-2.5 text-[10px] tracking-[0.1em] font-semibold transition-colors ${showCompat ? 'border-red text-bone' : 'hair text-ash hover:text-bone'}`}
              title="Runtime details"
            >
              <Cpu size={10} strokeWidth={1.25} />
              {runtimeLabel[app!.runtime]}
              {compat && <span className="text-red">· {compat.mode === 'wine' && app!.runtime === 'windows' ? 'WINE' : app!.runtime === 'linux' ? 'SANDBOX' : compat.mode.toUpperCase()}</span>}
            </button>
          )}
          <div className="ml-auto flex items-center" onPointerDown={(e) => e.stopPropagation()}>
            <WinBtn label="Minimize" onClick={() => relicRuntime.windows.minimize(win.id)}>
              <Minus size={12} strokeWidth={1.25} />
            </WinBtn>
            <WinBtn label="Maximize" onClick={() => relicRuntime.windows.toggleMaximize(win.id)}>
              {win.maximized ? <Copy size={10} strokeWidth={1.25} /> : <Square size={10} strokeWidth={1.25} />}
            </WinBtn>
            <WinBtn label="Close" danger onClick={() => relicRuntime.windows.close(win.id)}>
              <X size={13} strokeWidth={1.25} />
            </WinBtn>
          </div>
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

function WinBtn({ children, onClick, label, danger }: { children: ReactNode; onClick: () => void; label: string; danger?: boolean }) {
  return (
    <button onClick={onClick} aria-label={label} className={`flex h-[28px] w-[30px] items-center justify-center rounded-md text-ash transition-colors ${danger ? 'hover:bg-red hover:text-white' : 'hover:bg-white/10 hover:text-bone'}`}>
      {children}
    </button>
  )
}
