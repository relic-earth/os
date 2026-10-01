import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, ChevronDown, Search, Wifi, Cloud, CloudOff, BatteryMedium } from 'lucide-react'
import { useOS, type Profile, type Section } from '../runtime/store'
import { relicRuntime } from '../runtime/relicRuntime'
import { fmtClock, useMesh, useNow } from '../../ui/primitives'
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
        className="flex h-8 items-center gap-1.5 rounded-full px-3 text-ash transition-colors hover:bg-white/10 hover:text-bone"
        aria-label="Switch device"
      >
        {!compact && <span className="text-[12px] font-semibold tracking-[0.12em] text-bone">{cur.label}</span>}
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
                    className={`flex w-full items-center gap-3 rounded-[10px] px-3 py-2 text-left transition-colors ${active ? 'bg-white/10' : 'hover:bg-white/[0.07]'}`}
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

/** Menu bar — Mac-proportioned: the scarab menu, the frontmost app's name, status on the right. */
export function TopBar({ compact }: { compact?: boolean }) {
  const now = useNow(1000 * 15)
  const { online, total } = useMesh()
  const cloud = useOS((s) => s.cloud.status)
  const battery = useOS((s) => s.devices.find((d) => d.id === s.profile)?.battery)
  const unread = useOS((s) => s.notifications.filter((n) => !n.read).length)
  const section = useOS((s) => s.section)
  const focusedApp = useOS((s) => s.windows.find((w) => w.deviceId === s.profile && w.focused && !w.minimized)?.appId)
  const appName = focusedApp ? (getApp(focusedApp)?.name ?? focusedApp).replace('Relic ', '') : SECTION_NAME[section]
  const [menu, setMenu] = useState(false)

  return (
    <header className="relative z-[6000] flex h-10 shrink-0 items-center gap-1 bg-[rgba(10,8,8,0.55)] px-3 backdrop-blur-2xl">
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[rgba(232,36,43,0.45)] to-transparent" />
      <div className="relative">
        <button onClick={() => setMenu((m) => !m)} className="group flex h-8 items-center rounded-full px-3 hover:bg-white/10" aria-label="Relic menu">
          <ScarabMark size={20} glow className="text-signal transition-transform group-hover:scale-110" />
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
            <div className="panel absolute left-0 top-10 z-50 w-60 p-2 shadow-[0_24px_60px_rgba(0,0,0,0.7),0_0_30px_rgba(232,36,43,0.15)]">
              {[
                ['About Relic', () => relicRuntime.apps.launch('settings', { props: { section: 'about', nonce: Date.now() } })],
                ['System Architecture', () => relicRuntime.apps.launch('settings', { props: { section: 'architecture', nonce: Date.now() } })],
                ['Open on iPhone…', () => relicRuntime.apps.launch('settings', { props: { section: 'iphone', nonce: Date.now() } })],
                ['Settings', () => relicRuntime.apps.launch('settings')],
                ['Restart Relic', () => relicRuntime.shell.restart()],
              ].map(([label, fn]) => (
                <button
                  key={label as string}
                  onClick={() => {
                    ;(fn as () => void)()
                    setMenu(false)
                  }}
                  className="block w-full rounded-[10px] px-3 py-2 text-left text-[14px] font-semibold text-bone hover:bg-red hover:text-white hover:shadow-[0_0_18px_rgba(232,36,43,0.5)]"
                >
                  {label as string}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <span className="px-1.5 text-[14px] font-bold tracking-[0.02em] text-bone">{appName}</span>

      <div className="ml-auto flex items-center gap-1">
        {!compact && (
          <button onClick={() => void relicRuntime.apps.launch('settings', { props: { section: 'network', nonce: Date.now() } })} className="flex h-8 items-center gap-2.5 rounded-full px-3 text-ash hover:bg-white/10 hover:text-bone" title="Relic system status">
            {cloud === 'connected' ? <Cloud size={14} strokeWidth={1.5} /> : <CloudOff size={14} strokeWidth={1.5} className="text-signal" />}
            <Wifi size={14} strokeWidth={1.5} />
            <span className="text-[12px] font-semibold tracking-[0.08em]">
              <span className="num text-bone">{online}</span>/{total}
            </span>
          </button>
        )}
        {battery != null && (
          <span className="flex h-8 items-center gap-1.5 px-2 text-ash">
            <BatteryMedium size={17} strokeWidth={1.5} />
            <span className="num text-[12px] font-semibold">{Math.round(battery * 100)}%</span>
          </span>
        )}
        <button onClick={() => relicRuntime.shell.openCommand()} className="flex h-8 items-center rounded-full px-2.5 text-ash hover:bg-white/10 hover:text-bone" aria-label="Ask Claude" title="Ask Claude — or just start typing">
          <Search size={15} strokeWidth={2} />
        </button>
        <button onClick={() => relicRuntime.notifications.toggleCenter()} className="relative flex h-8 items-center rounded-full px-2.5 text-ash hover:bg-white/10 hover:text-bone" aria-label="Notifications">
          <Bell size={15} strokeWidth={2} />
          {unread > 0 && <span className="dot absolute right-1 top-1" />}
        </button>
        <DeviceSwitcher compact={compact} />
        <span className="num whitespace-nowrap px-2 text-[14px] font-bold text-bone">{fmtClock(now)}</span>
      </div>
    </header>
  )
}
