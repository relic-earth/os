import { motion } from 'framer-motion'
import { useOS, useOSShallow } from '../runtime/store'
import { relicRuntime } from '../runtime/relicRuntime'
import { getApp } from '../apps/registry'
import { Icon } from '../../ui/Icon'
import { revealClass, useEdgeReveal } from '../../ui/primitives'

const PINNED = ['claude', 'files', 'web', 'apps', 'devices', 'settings']

/** Dock / taskbar — pinned system apps plus every running app on this device. */
export function Dock() {
  const profile = useOS((s) => s.profile)
  const { ref, shown } = useEdgeReveal<HTMLDivElement>((_, y) => y >= window.innerHeight - 28, 24)
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
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5000] flex justify-center" data-profile={profile}>
      <div ref={ref} data-shown={shown ? '1' : '0'} className={`${revealClass(shown)} pb-3`}>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5, ease: [0.2, 0, 0, 1] }}
        className="panel flex items-stretch"
      >
        {items.map((id, i) => {
          const app = getApp(id)
          const mine = wins.filter((w) => w.appId === id)
          const isRunning = mine.length > 0
          const focused = mine.some((w) => w.focused && !w.minimized)
          const separator = i === PINNED.length && running.some((r) => !PINNED.includes(r))
          return (
            <div key={id} className="flex">
              {separator && <span className="my-2 w-px bg-[var(--line)]" />}
              <button
                onClick={() => click(id)}
                title={app?.name}
                className={`group relative flex h-[46px] min-w-[74px] flex-col items-center justify-center gap-1 px-3 transition-colors ${focused ? 'bg-burgundy/70' : 'hover:bg-burgundy/40'}`}
              >
                <Icon name={app?.icon} size={15} className={focused ? 'text-signal' : isRunning ? 'text-bone' : 'text-ash group-hover:text-bone'} />
                <span className={`max-w-[88px] truncate text-[8px] tracking-[0.28em] ${focused ? 'text-bone' : 'text-smoke group-hover:text-ash'}`}>
                  {(app?.name ?? id).replace('Relic ', '').toUpperCase()}
                </span>
                {isRunning && <span className={`absolute bottom-0 left-1/2 h-[2px] -translate-x-1/2 ${focused ? 'w-6 bg-signal shadow-[0_0_8px_rgba(232,36,43,0.9)]' : 'w-2 bg-red/70'}`} />}
              </button>
            </div>
          )
        })}
      </motion.div>
      </div>
    </div>
  )
}
