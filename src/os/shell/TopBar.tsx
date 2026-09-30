import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, ChevronDown, Search, Wifi, Cloud, CloudOff, BatteryMedium } from 'lucide-react'
import { useOS, type Profile } from '../runtime/store'
import { relicRuntime } from '../runtime/relicRuntime'
import { fmtClock, useMesh, useNow, Wordmark } from '../../ui/primitives'
import { Icon, deviceIcon } from '../../ui/Icon'

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
        className="flex h-7 items-center gap-2 border hair px-2.5 text-ash transition-colors hover:border-[var(--line)] hover:text-bone"
        aria-label="Switch device"
      >
        <span className="label-sm text-smoke">DEVICE</span>
        {!compact && <span className="text-[10px] tracking-[0.24em] text-bone">{cur.label}</span>}
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
              className={`panel ticks absolute z-50 w-[280px] py-2 ${up ? 'bottom-9' : 'top-9'} ${align === 'right' ? 'right-0' : 'left-0'}`}
            >
              <div className="label-sm px-4 pb-2 pt-1">RENDER THIS SCREEN AS</div>
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
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors ${active ? 'lit' : 'hover:bg-burgundy/60'}`}
                  >
                    <Icon name={deviceIcon[d.type]} size={14} className={active ? 'text-signal' : 'text-ash'} />
                    <span className="flex-1">
                      <span className="block text-[10px] tracking-[0.26em] text-bone">{p.label}</span>
                      <span className="label-sm">{p.mode}</span>
                    </span>
                    <span className={`dot ${d.status === 'online' ? '' : 'dot-off'}`} />
                  </button>
                )
              })}
              <div className="label-sm border-t hair mt-2 px-4 pt-2">SHORTCUT · T FOR TV</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export function TopBar({ compact }: { compact?: boolean }) {
  const now = useNow(1000 * 15)
  const { online, total } = useMesh()
  const cloud = useOS((s) => s.cloud.status)
  const battery = useOS((s) => s.devices.find((d) => d.id === s.profile)?.battery)
  const unread = useOS((s) => s.notifications.filter((n) => !n.read).length)
  const [menu, setMenu] = useState(false)
  return (
    <header className="relative z-30 flex h-11 items-center gap-4 border-b hair bg-void/70 px-5 backdrop-blur-md">
      <div className="relative">
        <button onClick={() => setMenu((m) => !m)} className="flex items-center" aria-label="Relic menu">
          <Wordmark size={13} />
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
            <div className="panel ticks absolute left-0 top-8 z-50 w-56 py-2">
              {[
                ['ABOUT RELIC', () => relicRuntime.apps.launch('settings', { props: { section: 'about', nonce: Date.now() } })],
                ['SYSTEM ARCHITECTURE', () => relicRuntime.apps.launch('settings', { props: { section: 'architecture', nonce: Date.now() } })],
                ['RESTART RELIC', () => relicRuntime.shell.restart()],
              ].map(([label, fn]) => (
                <button
                  key={label as string}
                  onClick={() => {
                    ;(fn as () => void)()
                    setMenu(false)
                  }}
                  className="block w-full px-4 py-2 text-left text-[10px] tracking-[0.26em] text-ash hover:bg-burgundy/60 hover:text-bone"
                >
                  {label as string}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <span className="h-4 w-px bg-[var(--line-soft)]" />

      {/* command bar — the primary OS interface */}
      <button
        onClick={() => relicRuntime.shell.openCommand()}
        className="group mx-auto flex h-7 w-[min(460px,40vw)] items-center gap-3 border border-[var(--line)] bg-ink/80 px-3 text-left transition-all hover:border-red hover:shadow-[var(--glow)]"
      >
        <Search size={13} strokeWidth={1.25} className="text-red" />
        <span className="flex-1 truncate text-[10px] tracking-[0.34em] text-ash group-hover:text-bone">ASK CLAUDE…</span>
        {!compact && <span className="label-sm text-smoke">CTRL SPACE</span>}
      </button>

      <div className="flex items-center gap-4">
        <DeviceSwitcher compact={compact} />
        {!compact && (
          <div className="flex items-center gap-3 text-ash" title="Relic system status">
            <span className="flex items-center gap-1.5">
              <span className="label-sm text-smoke">LOCAL</span>
              <span className="dot" />
            </span>
            <span className="flex items-center gap-1.5">
              {cloud === 'connected' ? <Cloud size={13} strokeWidth={1.25} /> : <CloudOff size={13} strokeWidth={1.25} className="text-signal" />}
            </span>
            <Wifi size={13} strokeWidth={1.25} />
            <span className="label-sm text-ash">
              MESH <span className="num text-bone">{online}</span>/{total}
            </span>
          </div>
        )}
        {battery != null && (
          <span className="flex items-center gap-1.5 text-ash">
            <BatteryMedium size={15} strokeWidth={1.25} />
            <span className="num text-[10px] text-ash">{Math.round(battery * 100)}%</span>
          </span>
        )}
        <button onClick={() => relicRuntime.notifications.toggleCenter()} className="relative text-ash hover:text-bone" aria-label="Notifications">
          <Bell size={14} strokeWidth={1.25} />
          {unread > 0 && <span className="dot absolute -right-1 -top-0.5" />}
        </button>
        <span className="num whitespace-nowrap text-right text-[12px] tracking-[0.12em] text-bone">{fmtClock(now)}</span>
      </div>
    </header>
  )
}
