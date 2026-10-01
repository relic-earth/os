import { RelicWordmark, ScarabMark } from './Brand'
import { useEffect, useState, type ReactNode } from 'react'
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

/** The Relic lockup in a line: scarab + striped wordmark, from relic.earth. */
export function Wordmark({ className = '', size = 13, glow }: { className?: string; size?: number; glow?: boolean }) {
  return (
    <span className={`inline-flex items-center text-bone ${className}`} style={{ gap: size * 0.6 }}>
      <ScarabMark size={size * 1.45} glow={glow} className="text-signal" />
      <RelicWordmark height={size * 0.8} glow={glow} />
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

/** Whether this page has keyboard focus (false when e.g. it is framed and the host page holds focus). */
export function useWindowFocus() {
  const [focused, setFocused] = useState(() => typeof document === 'undefined' || document.hasFocus())
  useEffect(() => {
    const on = () => setFocused(true)
    const off = () => setFocused(false)
    window.addEventListener('focus', on)
    window.addEventListener('blur', off)
    const t = setInterval(() => setFocused(document.hasFocus()), 1000)
    return () => {
      window.removeEventListener('focus', on)
      window.removeEventListener('blur', off)
      clearInterval(t)
    }
  }, [])
  return focused
}
