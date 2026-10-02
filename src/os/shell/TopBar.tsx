import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, CaretDown, MagnifyingGlass, WifiHigh, CloudCheck, CloudSlash, BatteryMedium } from '@phosphor-icons/react'
import { useOS, SKINS, type Profile, type Section } from '../runtime/store'
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
        className="hud-target flex h-8 items-center gap-1.5 rounded-md px-3 text-smoke hover:bg-white/[0.06] hover:text-bone"
        aria-label="Switch device"
      >
        <span className="text-[10px] font-medium tracking-[0.22em]">{compact ? 'DEVICE' : cur.label}</span>
        <CaretDown size={11} weight="light" />
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
              className={`panel absolute z-50 w-[288px] p-2 ${up ? 'bottom-10' : 'top-10'} ${align === 'right' ? 'right-0' : 'left-0'}`}
            >
              <div className="label px-3 pb-2 pt-2">Show this screen as</div>
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
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${active ? 'bg-white/[0.08]' : 'hover:bg-white/[0.05]'}`}
                  >
                    <Glyph id={d.type} size={20} active={active} className={active ? 'text-signal' : 'text-ash'} />
                    <span className="flex-1">
                      <span className="block text-[11px] font-medium tracking-[0.18em] text-bone">{p.label}</span>
                      <span className="label-sm">{p.mode}</span>
                    </span>
                    <span className={`dot ${d.status === 'online' ? '' : 'dot-off'}`} />
                  </button>
                )
              })}
              <div className="label-sm mt-1 border-t border-[var(--hair)] px-3 pb-1 pt-2">Alt T · TV</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

const SECTION_NAME: Record<Section, string> = { home: 'Home', tv: 'TV', movies: 'Movies', games: 'Games' }

/**
 * THE SILL — the screen's top edge, barely there. Left: the mark and where
 * you are. Right: the themes, a quiet status cluster, Claude, alerts, the
 * device and the time.
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
  const hh = String(t.getHours() % 12 || 12)
  const mm = String(t.getMinutes()).padStart(2, '0')
  const icon = 'flex h-8 w-8 items-center justify-center rounded-md text-smoke hover:bg-white/[0.06] hover:text-bone'

  return (
    <header className="relative z-[6000] flex h-11 shrink-0 items-center gap-2 bg-[linear-gradient(180deg,rgb(var(--ink-1)/0.85),rgb(var(--ink-1)/0.35))] pl-4 pr-3 backdrop-blur-xl">
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,var(--hair-strong)_30%,var(--hair-strong)_70%,transparent)]" />
      {/* the mark */}
      <div className="relative">
        <button onClick={() => setMenu((m) => !m)} className="hud-target flex h-8 items-center gap-2.5 rounded-md px-2 hover:bg-white/[0.05]" aria-label="Relic menu">
          <ScarabMark size={18} className="text-[rgb(var(--acc))] drop-shadow-[0_0_8px_rgb(var(--acc)/0.6)]" />
          <span className="font-display text-[11px] tracking-[0.42em] text-bone">RELIC</span>
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} />
            <div className="panel absolute left-0 top-11 z-50 w-64 p-2">
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
                  className="flex w-full items-center rounded-md px-3 py-2 text-left text-[13px] text-ash hover:bg-white/[0.06] hover:text-white"
                >
                  {label as string}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* where you are */}
      <span className="h-4 w-px bg-[var(--hair-strong)]" />
      <span className="pl-2 font-display text-[11px] tracking-[0.32em] text-smoke">{appName.toUpperCase()}</span>
      {busy && <span className="pulse pl-3 text-[10px] tracking-[0.28em] text-signal">CLAUDE IS WORKING</span>}

      <div className="ml-auto flex items-center gap-1">
        <div className="mr-3 flex items-center gap-0.5" role="group" aria-label="Theme">
          {SKINS.map((k) => (
            <button
              key={k.id}
              onClick={() => relicRuntime.shell.setSkin(k.id)}
              aria-label={`${k.name} theme`}
              aria-pressed={skin === k.id}
              className={`relative rounded-md px-2 py-1.5 text-[9.5px] font-medium tracking-[0.24em] transition-colors ${skin === k.id ? 'text-bone' : 'text-soot hover:text-ash'}`}
            >
              {k.name}
              {skin === k.id && <span className="absolute inset-x-2 -bottom-0.5 h-px bg-[rgb(var(--acc))] shadow-[0_0_8px_rgb(var(--acc))]" />}
            </button>
          ))}
        </div>
        {!compact && (
          <button onClick={() => void relicRuntime.apps.launch('devices')} className={`${icon} w-auto gap-1.5 px-2`} title={`Device mesh · ${online} of ${total} online`}>
            <WifiHigh size={16} weight="light" />
            {cloud === 'connected' ? <CloudCheck size={16} weight="light" /> : <CloudSlash size={16} weight="light" className="text-signal" />}
            {battery != null && <BatteryMedium size={17} weight="light" />}
          </button>
        )}
        <button onClick={() => relicRuntime.shell.openCommand()} className={icon} aria-label="Ask Claude" title="Ask Claude — or just start typing">
          <MagnifyingGlass size={16} weight="light" />
        </button>
        <button onClick={() => relicRuntime.notifications.toggleCenter()} className={`${icon} relative`} aria-label="Notifications">
          <Bell size={16} weight="light" />
          {unread > 0 && <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[rgb(var(--acc))] shadow-[0_0_6px_rgb(var(--acc))]" />}
        </button>
        <DeviceSwitcher compact={compact} />
        <span className="num pl-2 font-display text-[15px] font-light tracking-[0.12em] text-bone">
          {hh}<span className="pulse text-[rgb(var(--acc))]">:</span>{mm}
        </span>
      </div>
    </header>
  )
}
