import { useOS, useOSShallow, type Section } from '../runtime/store'
import { relicRuntime } from '../runtime/relicRuntime'
import { getApp } from '../apps/registry'
import { useWindowFocus } from '../../ui/primitives'

const PINNED = ['claude', 'files', 'web', 'apps', 'devices', 'settings']
const SURFACES: { id: Section; name: string }[] = [
  { id: 'home', name: 'Home' },
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
  // a surface is a place, not a window: going there clears the windows out of the way
  const surface = (id: Section) => {
    relicRuntime.shell.setSection(id)
    wins.filter((w) => !w.minimized).forEach((w) => relicRuntime.windows.minimize(w.id))
    relicRuntime.windows.blur(profile)
  }
  const appTab = (id: string) => {
    const mine = wins.filter((w) => w.appId === id)
    const active = mine.some((w) => w.focused && !w.minimized)
    return <Tab key={id} label={shortName(id)} active={active} running={mine.length > 0} onClick={() => click(id)} />
  }

  return (
    <div className="relative z-[5000] shrink-0 border-t border-[rgba(176,138,82,0.3)] bg-[linear-gradient(180deg,rgba(14,5,6,0.86),rgba(4,1,2,0.92))] shadow-[inset_0_1px_0_rgba(216,179,122,0.12)] px-4 pb-3 pt-2 backdrop-blur-2xl" data-profile={profile}>
      <nav className="no-scrollbar flex items-center justify-center gap-1 overflow-x-auto" aria-label="Apps">
        {SURFACES.map((s) => (
          <Tab key={s.id} label={s.name} active={section === s.id && !anyFocused} onClick={() => surface(s.id)} />
        ))}
        <Divider />
        {PINNED.map(appTab)}
        {running.length > 0 && <Divider />}
        {running.map(appTab)}
      </nav>
      <button
        onClick={() => relicRuntime.shell.openCommand()}
        className={`well mt-2 flex h-11 w-full items-center rounded-[12px] bg-[rgba(118,110,110,0.16)] px-4 text-left transition-opacity hover:bg-[rgba(118,110,110,0.28)] ${commandOpen ? 'opacity-0' : ''}`}
        aria-label="Ask Claude"
      >
        <span className="flex-1 text-[16px] text-smoke">Ask Claude</span>
        <span className={`text-[13px] font-semibold ${hasFocus ? 'text-soot' : 'pulse text-signal'}`}>{hasFocus ? 'or just start typing' : 'Click anywhere, then type'}</span>
      </button>
    </div>
  )
}

function Divider() {
  return <span className="mx-1.5 h-4 w-px shrink-0 bg-[rgba(176,138,82,0.45)]" />
}

function Tab({ label, active, running, onClick }: { label: string; active: boolean; running?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative h-7 shrink-0 rounded-full px-3 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors ${
        active ? 'bg-gradient-to-b from-[#b81620] to-[#6e0a10] text-white shadow-[inset_0_1px_0_rgba(216,179,122,0.45),inset_0_0_0_1px_rgba(176,138,82,0.5),0_0_16px_rgba(200,24,32,0.4)]' : 'text-smoke hover:bg-white/[0.07] hover:text-bone'
      }`}
    >
      {label}
      {running && !active && <span className="absolute bottom-0.5 left-1/2 h-[3px] w-[3px] -translate-x-1/2 rounded-full bg-bone/70" />}
    </button>
  )
}
