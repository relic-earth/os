import { useOS, useOSShallow, type Section } from '../runtime/store'
import { relicRuntime } from '../runtime/relicRuntime'
import { getApp } from '../apps/registry'
import { useWindowFocus } from '../../ui/primitives'

const PINNED = ['claude', 'files', 'web', 'apps', 'devices', 'settings']
const SURFACES: { id: Section; name: string }[] = [
  { id: 'tv', name: 'TV' },
  { id: 'movies', name: 'Movies' },
  { id: 'games', name: 'Games' },
]

const shortName = (id: string) => (getApp(id)?.name ?? id).replace('Relic ', '').replace('Applications', 'Apps')

/**
 * Bottom bar — iOS-familiar: a row of small text tabs, and under it a
 * full-width "Ask Claude" field. The prompt itself opens in place of the field.
 */
export function Dock() {
  const profile = useOS((s) => s.profile)
  const section = useOS((s) => s.section)
  const commandOpen = useOS((s) => s.commandOpen)
  const hasFocus = useWindowFocus()
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
  const appTab = (id: string) => {
    const mine = wins.filter((w) => w.appId === id)
    const active = mine.some((w) => w.focused && !w.minimized)
    return <Tab key={id} label={shortName(id)} active={active} running={mine.length > 0} onClick={() => click(id)} />
  }

  return (
    <div className="relative z-[5000] shrink-0 border-t border-[rgba(245,240,235,0.08)] bg-[rgba(12,9,9,0.72)] px-4 pb-3 pt-2 backdrop-blur-2xl" data-profile={profile}>
      <nav className="no-scrollbar flex items-center justify-center gap-1 overflow-x-auto" aria-label="Apps">
        {PINNED.map(appTab)}
        <Divider />
        {SURFACES.map((s) => (
          <Tab key={s.id} label={s.name} active={section === s.id && !anyFocused} onClick={() => surface(s.id)} />
        ))}
        {running.length > 0 && <Divider />}
        {running.map(appTab)}
      </nav>
      <button
        onClick={() => relicRuntime.shell.openCommand()}
        className={`mt-2 flex h-11 w-full items-center rounded-[12px] bg-[rgba(118,110,110,0.2)] px-4 text-left transition-opacity hover:bg-[rgba(118,110,110,0.28)] ${commandOpen ? 'opacity-0' : ''}`}
        aria-label="Ask Claude"
      >
        <span className="flex-1 text-[16px] text-smoke">Ask Claude</span>
        <span className={`text-[13px] font-semibold ${hasFocus ? 'text-soot' : 'pulse text-signal'}`}>{hasFocus ? 'or just start typing' : 'Click anywhere, then type'}</span>
      </button>
    </div>
  )
}

function Divider() {
  return <span className="mx-1.5 h-4 w-px shrink-0 bg-[rgba(245,240,235,0.14)]" />
}

function Tab({ label, active, running, onClick }: { label: string; active: boolean; running?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative h-7 shrink-0 rounded-full px-3 text-[13px] font-semibold transition-colors ${
        active ? 'bg-red text-white shadow-[0_0_16px_rgba(232,36,43,0.5)]' : 'text-ash hover:bg-white/[0.08] hover:text-bone'
      }`}
    >
      {label}
      {running && !active && <span className="absolute bottom-0.5 left-1/2 h-[3px] w-[3px] -translate-x-1/2 rounded-full bg-bone/70" />}
    </button>
  )
}
