import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, ChevronDown, Search, Wifi, Cloud, CloudOff, BatteryMedium, Palette } from 'lucide-react'
import { useOS, type Profile, type Section } from '../runtime/store'
import { relicRuntime } from '../runtime/relicRuntime'
import { useMesh, useNow } from '../../ui/primitives'
import { ScarabMark } from '../../ui/Brand'
import { Glyph } from '../../ui/AppIcon'
import { getApp } from '../apps/registry'

export const PROFILES: { id: Profile; label: string; mode: string }[] = [
  { id: 'relic-laptop', label: 'RELIC LAPTOP', mode: 'DESKTOP SHELL' },
  { id: 'relic-desktop', label: 'RELIC DESKTOP', mode: 'DESKTOP SHELL' },
  { id: 'relic-tv', label: 'RELIC TV', mode: '10-FOOT' },
  { id: 'relic-phone', label: 'RELIC PHONE', mode: 'MOBILE SHELL' },
  { id: 'relic-car', label: 'RELIC CAR', mode: 'RELIC DRIVE' },
  { id: 'relic-thermostat', label: 'RELIC THERMOSTAT', mode: 'SINGLE PURPOSE' },
]

export function DeviceSwitcher({ align = 'right', compact, up }: { align?: 'right' | 'left'; compact?: boolean; up?: boolean }) {
  const [open, setOpen] = useState(false)
  const profile = useOS((s) => s.profile)
  const devices = useOS((s) => s.devices)
  const cur = PROFILES.find((p) => p.id === profile)!
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex hud-target h-8 items-center gap-1.5 px-3 text-ash transition-colors hover:bg-white/10 hover:text-bone"
        aria-label="Switch device"
      >
        {!compact && <span className="text-[11px] font-semibold tracking-[0.16em] text-ash">{cur.label}</span>}
        {compact && <span className="text-[11px] font-semibold tracking-[0.12em]">DEVICE</span>}
        <ChevronDown size={12} strokeWidth={1.25} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: up ? 4 : -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: up ? 4 : -4 }}
              transition={{ duration: 0.16 }}
              className={`panel absolute z-50 w-[280px] p-1.5 ${up ? 'bottom-9' : 'top-9'} ${align === 'right' ? 'right-0' : 'left-0'}`}
            >
              <div className="label-sm px-3 pb-1.5 pt-1.5">RENDER THIS SCREEN AS</div>
              {PROFILES.map((p) => {
                const d = devices.find((x) => x.id === p.id)!
                const active = p.id === profile
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      relicRuntime.shell.setProfile(p.id)
                      setOpen(false)
                    }}
                    className={`flex w-full items-center gap-3 rounded-[2px] px-3 py-2 text-left transition-colors ${active ? 'bg-white/10' : 'hover:bg-white/[0.07]'}`}
                  >
                    <Glyph id={d.type} size={20} className={active ? 'text-signal' : 'text-ash'} />
                    <span className="flex-1">
                      <span className="block text-[12px] tracking-[0.12em] font-semibold text-bone">{p.label}</span>
                      <span className="label-sm">{p.mode}</span>
                    </span>
                    <span className={`dot ${d.status === 'online' ? '' : 'dot-off'}`} />
                  </button>
                )
              })}
              <div className="label-sm mt-1 border-t hair px-3 pb-1 pt-2">ALT T · TV</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

const SECTION_NAME: Record<Section, string> = { home: 'Home', tv: 'TV', movies: 'Movies', games: 'Games' }

/** A segmented meter: n of max cells lit. */
function Meter({ value, cells = 8 }: { value: number; cells?: number }) {
  const lit = Math.round(Math.max(0, Math.min(1, value)) * cells)
  return (
    <span className="flex items-end gap-[2px]">
      {Array.from({ length: cells }).map((_, i) => (
        <span key={i} className={`w-[3px] ${i < lit ? 'bg-[rgb(var(--acc))] shadow-[0_0_4px_rgb(var(--acc))]' : 'bg-[rgb(var(--acc)/0.18)]'}`} style={{ height: 5 + i }} />
      ))}
    </span>
  )
}

/**
 * TELEMETRY STRIP — the deck's top edge. Left: the mark and where you are.
 * Right: live readouts in mono, segmented meters, alerts, the node, the time.
 */
export function TopBar({ compact }: { compact?: boolean }) {
  const now = useNow(1000)
  const { online, total } = useMesh()
  const cloud = useOS((s) => s.cloud.status)
  const battery = useOS((s) => s.devices.find((d) => d.id === s.profile)?.battery)
  const unread = useOS((s) => s.notifications.filter((n) => !n.read).length)
  const section = useOS((s) => s.section)
  const busy = useOS((s) => s.agentBusy)
  const skin = useOS((s) => s.skin)
  const focusedApp = useOS((s) => s.windows.find((w) => w.deviceId === s.profile && w.focused && !w.minimized)?.appId)
  const appName = focusedApp ? (getApp(focusedApp)?.name ?? focusedApp).replace('Relic ', '') : SECTION_NAME[section]
  const [menu, setMenu] = useState(false)
  const t = new Date(now)
  const hh = String(t.getHours()).padStart(2, '0')
  const mm = String(t.getMinutes()).padStart(2, '0')
  const ss = String(t.getSeconds()).padStart(2, '0')

  return (
    <header className="relative z-[6000] flex h-9 shrink-0 items-stretch bg-[linear-gradient(180deg,rgb(var(--ink-1)/0.95),rgb(var(--ink-1)/0.85))] backdrop-blur-2xl">
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,rgb(var(--acc)),rgb(var(--acc)/0.25)_20%,rgb(var(--acc)/0.25)_80%,rgb(var(--acc)))]" />
      {/* the mark, on a cut plate */}
      <div className="relative">
        <button onClick={() => setMenu((m) => !m)} className="hud-target flex h-full w-[88px] items-center justify-center gap-2 bg-[linear-gradient(180deg,rgb(var(--acc-2)),#4a0509)] [clip-path:polygon(0_0,100%_0,calc(100%-14px)_100%,0_100%)]" aria-label="Relic menu">
          <ScarabMark size={18} className="text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.7)]" />
          <span className="font-display text-[9px] tracking-[0.2em] text-white">RLC</span>
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
            <div className="panel absolute left-2 top-11 z-50 w-64 p-2">
              <div className="label-sm px-3 pb-2 pt-1">// SYSTEM</div>
              {[
                ['About Relic', () => relicRuntime.apps.launch('settings', { props: { section: 'about', nonce: Date.now() } })],
                ['System Architecture', () => relicRuntime.apps.launch('settings', { props: { section: 'architecture', nonce: Date.now() } })],
                ['Open on iPhone…', () => relicRuntime.apps.launch('settings', { props: { section: 'iphone', nonce: Date.now() } })],
                ['Settings', () => relicRuntime.apps.launch('settings')],
                ['Restart Relic', () => relicRuntime.shell.restart()],
              ].map(([label, fn], i) => (
                <button
                  key={label as string}
                  onClick={() => {
                    ;(fn as () => void)()
                    setMenu(false)
                  }}
                  className="hud-target scan-hover flex w-full items-center gap-3 px-3 py-2 text-left text-[12px] font-semibold uppercase tracking-[0.16em] text-ash hover:bg-[rgb(var(--acc)/0.16)] hover:text-white"
                >
                  <span className="font-mono text-[10px] text-[rgb(var(--gold)/0.8)]">{String(i + 1).padStart(2, '0')}</span>
                  {label as string}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* where you are */}
      <div className="flex items-center gap-3 pl-3 pr-4">
        <span className="font-display text-[12px] tracking-[0.12em] text-white [text-shadow:0_0_14px_rgb(var(--acc)/0.8)]">{appName.toUpperCase()}</span>
        <span className="font-mono text-[10px] text-[rgb(var(--gold)/0.8)]">{'//'} RELIC·OS 0.1</span>
        {busy && <span className="glitch-text font-mono text-[10px] tracking-[0.2em] text-signal" data-text="CLAUDE·EXEC">CLAUDE·EXEC</span>}
      </div>

      {/* readouts */}
      <div className="ml-auto flex items-center font-mono text-[10px] tracking-[0.08em] text-ash">
        {!compact && (
          <button onClick={() => void relicRuntime.apps.launch('devices')} className="hud-target flex h-full items-center gap-2 border-l border-[rgb(var(--acc)/0.14)] px-3 hover:bg-[rgb(var(--acc)/0.1)]" title="Device mesh">
            <Wifi size={13} strokeWidth={1.75} className="text-signal" />
            <span>MESH</span>
            <Meter value={online / total} cells={total} />
            <span className="text-white">{online}/{total}</span>
          </button>
        )}
        {!compact && (
          <button onClick={() => void relicRuntime.apps.launch('settings', { props: { section: 'network', nonce: Date.now() } })} className="hud-target flex h-full items-center gap-2 border-l border-[rgb(var(--acc)/0.14)] px-3 hover:bg-[rgb(var(--acc)/0.1)]" title="Relic Cloud">
            {cloud === 'connected' ? <Cloud size={13} strokeWidth={1.75} className="text-signal" /> : <CloudOff size={13} strokeWidth={1.75} className="text-signal" />}
            <span className={cloud === 'connected' ? 'text-white' : 'text-signal'}>{cloud === 'connected' ? 'SYNC' : 'LOCAL'}</span>
          </button>
        )}
        {battery != null && (
          <span className="flex h-full items-center gap-2 border-l border-[rgb(var(--acc)/0.14)] px-3">
            <BatteryMedium size={14} strokeWidth={1.75} className="text-signal" />
            <span>PWR</span>
            <Meter value={battery} cells={6} />
            <span className="text-white">{Math.round(battery * 100)}</span>
          </span>
        )}
        <button
          onClick={() => relicRuntime.shell.setSkin(skin === 'sith' ? 'earth' : 'sith')}
          className="hud-target flex h-full items-center gap-2 border-l border-[rgb(var(--acc)/0.14)] px-3 hover:bg-[rgb(var(--acc)/0.1)]"
          aria-label="Switch theme"
          title="Theme: SITH / EARTH"
        >
          <Palette size={13} strokeWidth={2} className="text-signal" />
          <span className={skin === 'sith' ? 'text-white' : 'text-smoke'}>SITH</span>
          <span className="text-soot">/</span>
          <span className={skin === 'earth' ? 'text-white' : 'text-smoke'}>EARTH</span>
        </button>
        <button onClick={() => relicRuntime.shell.openCommand()} className="hud-target flex h-full items-center gap-2 border-l border-[rgb(var(--acc)/0.14)] px-3 hover:bg-[rgb(var(--acc)/0.1)]" aria-label="Ask Claude" title="Ask Claude — or just start typing">
          <Search size={13} strokeWidth={2} className="text-signal" />
          <span>CMD</span>
        </button>
        <button onClick={() => relicRuntime.notifications.toggleCenter()} className="hud-target relative flex h-full items-center gap-2 border-l border-[rgb(var(--acc)/0.14)] px-3 hover:bg-[rgb(var(--acc)/0.1)]" aria-label="Notifications">
          <Bell size={13} strokeWidth={2} className="text-signal" />
          <span className={unread ? 'text-white' : ''}>{String(unread).padStart(2, '0')}</span>
          {unread > 0 && <span className="dot absolute right-1.5 top-2" />}
        </button>
        <div className="flex h-full items-center border-l border-[rgb(var(--acc)/0.14)] px-1">
          <DeviceSwitcher compact={compact} />
        </div>
        <span className="flex h-full items-center gap-1 border-l border-[rgb(var(--acc)/0.14)] bg-[rgb(var(--acc)/0.08)] px-4 text-[13px] text-white">
          {hh}<span className="pulse text-signal">:</span>{mm}<span className="text-[10px] text-[rgb(var(--gold)/0.9)]">:{ss}</span>
        </span>
      </div>
    </header>
  )
}
