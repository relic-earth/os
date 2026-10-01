import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useOS } from '../os/runtime/store'
import type { RelicDevice } from '../sdk/types'

export function useNow(interval = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), interval)
    return () => clearInterval(t)
  }, [interval])
  return now
}

export const fmtClock = (ts: number) => new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
export const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()

export function Wordmark({ className = '', size = 13 }: { className?: string; size?: number }) {
  return (
    <span className={`wordmark text-bone ${className}`} style={{ fontSize: size }}>
      RELIC
    </span>
  )
}

export function Bar({ value, className = '' }: { value: number; className?: string }) {
  return (
    <div className={`bar ${className}`}>
      <i style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
    </div>
  )
}

export function statusText(d: RelicDevice) {
  if (d.status === 'connecting') return 'CONNECTING'
  if (d.status === 'offline') return d.presence === 'sleeping' ? 'SLEEPING' : 'OFFLINE'
  if (d.presence === 'local') return 'THIS DEVICE'
  if (d.presence === 'nearby') return 'NEARBY'
  if (d.presence === 'connected') return d.type === 'car' || d.type === 'phone' ? 'CONNECTED' : 'ONLINE'
  return 'ONLINE'
}

/** Section header with the thin red rule + tick. */
export function SectionHead({ title, right, className = '' }: { title: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="h-[7px] w-[7px] border border-red/70" />
      <span className="label text-bone/90">{title}</span>
      <span className="h-px flex-1 bg-gradient-to-r from-[var(--line)] to-transparent" />
      {right}
    </div>
  )
}

export function useMesh() {
  const devices = useOS((s) => s.devices)
  return { total: devices.length, online: devices.filter((d) => d.status === 'online').length, devices }
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="group flex items-center gap-3"
      aria-pressed={on}
      aria-label={typeof label === 'string' ? label : undefined}
    >
      <span className={`relative h-[14px] w-[28px] border transition-colors ${on ? 'border-signal/80 bg-blood/60' : 'hair-strong bg-ink'}`}>
        <span className={`absolute top-[2px] h-[8px] w-[10px] transition-all ${on ? 'left-[15px] bg-signal shadow-[0_0_8px_rgba(232,36,43,0.8)]' : 'left-[2px] bg-soot'}`} />
      </span>
      {label && <span className="label">{label}</span>}
    </button>
  )
}

/** 0–100 slider: hairline track with a red fill, square thumb. */
export function Range({ value, onChange, label, className = '' }: { value: number; onChange: (v: number) => void; label: string; className?: string }) {
  return (
    <input
      type="range"
      min={0}
      max={100}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={className}
      style={{ ['--fill' as string]: `${value}%` }}
      aria-label={label}
    />
  )
}

const noHover = () => typeof window !== 'undefined' && window.matchMedia?.('(hover: none)').matches

/**
 * Edge reveal for chrome that floats over content. Hidden chrome takes no
 * pointer events, so it never blocks what is underneath; it appears when the
 * pointer reaches its edge and stays while the pointer is over it.
 */
export function useEdgeReveal<T extends HTMLElement>(atEdge: (x: number, y: number) => boolean, margin = 12) {
  const ref = useRef<T>(null)
  const [shown, setShown] = useState(noHover)
  useEffect(() => {
    if (noHover()) return
    let hide: ReturnType<typeof setTimeout> | undefined
    const onMove = (e: PointerEvent) => {
      const r = ref.current?.getBoundingClientRect()
      const inside = !!r && r.width > 0 && e.clientX >= r.left - margin && e.clientX <= r.right + margin && e.clientY >= r.top - margin && e.clientY <= r.bottom + margin
      if (atEdge(e.clientX, e.clientY) || (inside && ref.current?.dataset.shown === '1')) {
        clearTimeout(hide)
        hide = undefined
        setShown(true)
      } else if (!hide) {
        hide = setTimeout(() => {
          hide = undefined
          setShown(false)
        }, 420)
      }
    }
    window.addEventListener('pointermove', onMove)
    return () => {
      window.removeEventListener('pointermove', onMove)
      clearTimeout(hide)
    }
    // atEdge is a stable inline predicate per call site
  }, [margin])
  return { ref, shown }
}

export const revealClass = (shown: boolean) =>
  `transition-opacity ${shown ? 'pointer-events-auto opacity-100 duration-200' : 'pointer-events-none opacity-0 duration-700 delay-200'}`
