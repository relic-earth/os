import { motion } from 'framer-motion'
import { useOS, useOSShallow } from '../runtime/store'
import { relicRuntime } from '../runtime/relicRuntime'
import { getApp } from '../apps/registry'
import { Icon } from '../../ui/Icon'

const PINNED = ['claude', 'files', 'web', 'apps', 'devices', 'settings']

/** Dock — pinned system apps plus every running app on this device. Names appear on hover. */
export function Dock() {
  const profile = useOS((s) => s.profile)
  const wins = useOSShallow((s) => s.windows.filter((w) => w.deviceId === s.profile))
  const running = Array.from(new Set(wins.map((w) => w.appId)))
  const items = [...PINNED, ...running.filter((id) => !PINNED.includes(id))]

  const click = (appId: string) => {
    const mine = wins.filter((w) => w.appId === appId).sort((a, b) => b.z - a.z)
    const top = mine[0]
    if (!top) return void relicRuntime.apps.launch(appId)
    if (top.focused && !top.minimized) relicRuntime.windows.minimize(top.id)
    else relicRuntime.windows.focus(top.id)
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5000] flex justify-center pb-2.5" data-profile={profile}>
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5, ease: [0.2, 0, 0, 1] }}
        className="pointer-events-auto flex items-end gap-1.5 rounded-[20px] border border-[var(--line-soft)] bg-[rgba(22,18,18,0.6)] p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
      >
        {items.map((id, i) => {
          const app = getApp(id)
          const mine = wins.filter((w) => w.appId === id)
          const isRunning = mine.length > 0
          const focused = mine.some((w) => w.focused && !w.minimized)
          const separator = i === PINNED.length && running.some((r) => !PINNED.includes(r))
          const name = (app?.name ?? id).replace('Relic ', '')
          return (
            <div key={id} className="flex items-end gap-1.5">
              {separator && <span className="mx-1 mb-2 h-9 w-px bg-[var(--line-soft)]" />}
              <button onClick={() => click(id)} aria-label={name} className="group relative flex flex-col items-center">
                <span className="pointer-events-none absolute -top-9 whitespace-nowrap rounded-md border border-[var(--line-soft)] bg-[rgba(22,18,18,0.92)] px-2.5 py-1 text-[11px] font-semibold tracking-[0.1em] text-bone opacity-0 transition-opacity group-hover:opacity-100">
                  {name.toUpperCase()}
                </span>
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-[12px] border transition-all duration-200 group-hover:-translate-y-0.5 ${
                    focused ? 'border-red/60 bg-gradient-to-b from-[#3a0c10] to-[#1a0607]' : 'border-[var(--line-soft)] bg-gradient-to-b from-[#221c1c] to-[#121010] group-hover:from-[#2c2424]'
                  }`}
                >
                  <Icon name={app?.icon} size={20} strokeWidth={1.5} className={focused ? 'text-signal' : 'text-bone/90'} />
                </span>
                <span className={`mt-1 h-1 w-1 rounded-full ${isRunning ? (focused ? 'bg-signal' : 'bg-bone/60') : 'bg-transparent'}`} />
              </button>
            </div>
          )
        })}
      </motion.div>
    </div>
  )
}
