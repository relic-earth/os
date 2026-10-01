import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, ChevronDown, Search, Wifi, Cloud, CloudOff, BatteryMedium } from 'lucide-react'
import { useOS, type Profile, type Section } from '../runtime/store'
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
        className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-ash transition-colors hover:bg-white/10 hover:text-bone"
        aria-label="Switch device"
      >
        {!compact && <span className="text-[11px] font-semibold tracking-[0.12em] text-bone">{cur.label}</span>}
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
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${active ? 'bg-white/10' : 'hover:bg-white/[0.07]'}`}
                  >
                    <Icon name={deviceIcon[d.type]} size={14} className={active ? 'text-signal' : 'text-ash'} />
                    <span className="flex-1">
                      <span className="block text-[11px] tracking-[0.12em] font-semibold text-bone">{p.label}</span>
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

type NavItem = { id: string; label: string; section?: Section; app?: string }

/** Menu bar navigation: surfaces on the left, system apps after the divider. */
export const NAV: NavItem[] = [
  { id: 'home', label: 'HOME', section: 'home' },
  { id: 'tv', label: 'TV', section: 'tv' },
  { id: 'movies', label: 'MOVIES', section: 'movies' },
  { id: 'games', label: 'GAMES', section: 'games' },
  { id: 'apps', label: 'APPS', app: 'apps' },
  { id: 'files', label: 'FILES', app: 'files' },
  { id: 'devices', label: 'DEVICES', app: 'devices' },
]

/** Menu bar — always visible, quiet, Apple-proportioned. */
export function TopBar({ compact }: { compact?: boolean }) {
  const now = useNow(1000 * 15)
  const { online, total } = useMesh()
  const cloud = useOS((s) => s.cloud.status)
  const battery = useOS((s) => s.devices.find((d) => d.id === s.profile)?.battery)
  const unread = useOS((s) => s.notifications.filter((n) => !n.read).length)
  const section = useOS((s) => s.section)
  const profile = useOS((s) => s.profile)
  const focusedApp = useOS((s) => s.windows.find((w) => w.deviceId === s.profile && w.focused && !w.minimized)?.appId)
  const activeId = NAV.find((n) => n.app && n.app === focusedApp)?.id ?? (focusedApp ? undefined : section)
  const [menu, setMenu] = useState(false)

  const go = (n: NavItem) => {
    if (n.section) {
      relicRuntime.shell.setSection(n.section)
      relicRuntime.windows.blur(profile)
    } else if (n.app) void relicRuntime.apps.launch(n.app)
  }

  return (
    <header className="relative z-[6000] flex h-9 shrink-0 items-center gap-1 border-b border-[var(--line-soft)] bg-[rgba(12,10,10,0.62)] px-3 backdrop-blur-xl">
      <div className="relative">
        <button onClick={() => setMenu((m) => !m)} className="flex h-7 items-center rounded-md px-2.5 hover:bg-white/10" aria-label="Relic menu">
          <Wordmark size={12} />
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
            <div className="panel absolute left-0 top-9 z-50 w-56 p-1.5">
              {[
                ['About Relic', () => relicRuntime.apps.launch('settings', { props: { section: 'about', nonce: Date.now() } })],
                ['System Architecture', () => relicRuntime.apps.launch('settings', { props: { section: 'architecture', nonce: Date.now() } })],
                ['Settings', () => relicRuntime.apps.launch('settings')],
                ['Restart Relic', () => relicRuntime.shell.restart()],
              ].map(([label, fn]) => (
                <button
                  key={label as string}
                  onClick={() => {
                    ;(fn as () => void)()
                    setMenu(false)
                  }}
                  className="block w-full rounded-md px-3 py-1.5 text-left text-[13px] font-semibold text-bone/90 hover:bg-red hover:text-white"
                >
                  {label as string}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <nav className="flex items-center">
        {NAV.map((n) => {
          const active = n.id === activeId
          return (
            <button
              key={n.id}
              onClick={() => go(n)}
              className={`relative flex h-7 items-center rounded-md px-2.5 text-[11px] font-semibold tracking-[0.12em] transition-colors ${active ? 'text-bone' : 'text-ash hover:bg-white/10 hover:text-bone'}`}
            >
              {n.label}
              {active && <motion.span layoutId="menubar-active" className="absolute inset-x-2.5 -bottom-[5px] h-[2px] rounded-full bg-signal" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
            </button>
          )
        })}
      </nav>

      <div className="ml-auto flex items-center gap-1">
        {!compact && (
          <button onClick={() => void relicRuntime.apps.launch('settings', { props: { section: 'network', nonce: Date.now() } })} className="flex h-7 items-center gap-2.5 rounded-md px-2.5 text-ash hover:bg-white/10 hover:text-bone" title="Relic system status">
            {cloud === 'connected' ? <Cloud size={14} strokeWidth={1.5} /> : <CloudOff size={14} strokeWidth={1.5} className="text-signal" />}
            <Wifi size={14} strokeWidth={1.5} />
            <span className="text-[11px] font-semibold tracking-[0.08em]">
              <span className="num text-bone">{online}</span>/{total}
            </span>
          </button>
        )}
        {battery != null && (
          <span className="flex h-7 items-center gap-1.5 px-2 text-ash">
            <BatteryMedium size={17} strokeWidth={1.5} />
            <span className="num text-[11px] font-semibold">{Math.round(battery * 100)}%</span>
          </span>
        )}
        <button onClick={() => relicRuntime.shell.openCommand()} className="flex h-7 items-center rounded-md px-2 text-ash hover:bg-white/10 hover:text-bone" aria-label="Ask Claude" title="Ask Claude — or just start typing">
          <Search size={14} strokeWidth={1.75} />
        </button>
        <button onClick={() => relicRuntime.notifications.toggleCenter()} className="relative flex h-7 items-center rounded-md px-2 text-ash hover:bg-white/10 hover:text-bone" aria-label="Notifications">
          <Bell size={14} strokeWidth={1.75} />
          {unread > 0 && <span className="dot absolute right-1 top-1" />}
        </button>
        <DeviceSwitcher compact={compact} />
        <span className="num whitespace-nowrap px-2 text-[13px] font-semibold text-bone">{fmtClock(now)}</span>
      </div>
    </header>
  )
}
