import { motion } from 'framer-motion'
import { useOS, useOSShallow, type Section } from '../runtime/store'
import { relicRuntime } from '../runtime/relicRuntime'
import { getApp } from '../apps/registry'
import { AppIcon } from '../../ui/AppIcon'

const PINNED = ['claude', 'files', 'web', 'apps', 'devices', 'settings']
const SURFACES: { id: Section; name: string }[] = [
  { id: 'tv', name: 'TV' },
  { id: 'movies', name: 'Movies' },
  { id: 'games', name: 'Games' },
]

/** Dock — pinned apps, the media surfaces, then every running app. Icons animate on hover. */
export function Dock() {
  const profile = useOS((s) => s.profile)
  const section = useOS((s) => s.section)
  const wins = useOSShallow((s) => s.windows.filter((w) => w.deviceId === s.profile))
  const running = Array.from(new Set(wins.map((w) => w.appId))).filter((id) => !PINNED.includes(id))
  const anyFocused = wins.some((w) => w.focused && !w.minimized)

  const click = (appId: string) => {
    const mine = wins.filter((w) => w.appId === appId).sort((a, b) => b.z - a.z)
    const top = mine[0]
    if (!top) return void relicRuntime.apps.launch(appId)
    if (top.focused && !top.minimized) relicRuntime.windows.minimize(top.id)
    else relicRuntime.windows.focus(top.id)
  }
  const surface = (id: Section) => {
    relicRuntime.shell.setSection(section === id && !anyFocused ? 'home' : id)
    relicRuntime.windows.blur(profile)
  }

  const appTile = (id: string) => {
    const app = getApp(id)
    const mine = wins.filter((w) => w.appId === id)
    const focused = mine.some((w) => w.focused && !w.minimized)
    return <Tile key={id} id={id} name={(app?.name ?? id).replace('Relic ', '')} running={mine.length > 0} active={focused} onClick={() => click(id)} />
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5000] flex justify-center pb-3" data-profile={profile}>
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6, ease: [0.2, 0, 0, 1] }}
        className="pointer-events-auto relative flex items-end gap-2 rounded-[26px] border border-[rgba(245,240,235,0.12)] bg-[rgba(20,15,15,0.55)] px-2.5 pb-1.5 pt-2.5 shadow-[0_24px_70px_rgba(0,0,0,0.7),0_0_40px_rgba(232,36,43,0.12)] backdrop-blur-2xl"
      >
        {/* saber line along the dock's top edge */}
        <span className="pointer-events-none absolute inset-x-8 -top-px h-px bg-gradient-to-r from-transparent via-signal to-transparent opacity-70 shadow-[0_0_10px_rgba(232,36,43,0.9)]" />
        {PINNED.map(appTile)}
        <Sep />
        {SURFACES.map((s) => (
          <Tile key={s.id} id={s.id} name={s.name} running={false} active={section === s.id && !anyFocused} onClick={() => surface(s.id)} />
        ))}
        {running.length > 0 && <Sep />}
        {running.map(appTile)}
      </motion.div>
    </div>
  )
}

function Sep() {
  return <span className="mx-1 mb-4 h-10 w-px self-end bg-[rgba(245,240,235,0.14)]" />
}

function Tile({ id, name, running, active, onClick }: { id: string; name: string; running: boolean; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label={name} className="group relative flex flex-col items-center">
      <span className="pointer-events-none absolute -top-11 whitespace-nowrap rounded-full border border-[rgba(245,240,235,0.14)] bg-[rgba(20,15,15,0.92)] px-3.5 py-1.5 text-[12px] font-semibold tracking-[0.12em] text-bone opacity-0 shadow-[0_0_18px_rgba(232,36,43,0.25)] transition-opacity group-hover:opacity-100">
        {name.toUpperCase()}
      </span>
      <span className="transition-transform duration-200 ease-out group-hover:-translate-y-2 group-hover:scale-[1.14]">
        <AppIcon id={id} size={52} active={active} live={active} />
      </span>
      <span className={`mt-1.5 h-1 w-1 rounded-full transition-colors ${running || active ? (active ? 'bg-signal shadow-[0_0_8px_#e8242b]' : 'bg-bone/70') : 'bg-transparent'}`} />
    </button>
  )
}
