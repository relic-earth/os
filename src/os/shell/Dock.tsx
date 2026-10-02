import { useOS, useOSShallow, type Section } from '../runtime/store'
import { relicRuntime } from '../runtime/relicRuntime'
import { getApp } from '../apps/registry'
import { Glyph } from '../../ui/AppIcon'

const PINNED = ['claude', 'files', 'web', 'windows', 'apps', 'devices', 'settings']
const SURFACES: { id: Section; name: string }[] = [
  { id: 'home', name: 'Home' },
  { id: 'tv', name: 'TV' },
  { id: 'movies', name: 'Movies' },
  { id: 'games', name: 'Games' },
]

const shortName = (id: string) => (getApp(id)?.name ?? id).replace('Relic ', '').replace('Applications', 'Apps')

/**
 * COMMAND BAR — a floating sill of smoked glass at the foot of the screen.
 * The four places, a breath of space, the system apps, then whatever is
 * running. Claude has no field: start typing anywhere.
 */
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
  // a place, not a window: going there clears the windows away
  const surface = (id: Section) => {
    relicRuntime.shell.setSection(id)
    wins.filter((w) => !w.minimized).forEach((w) => relicRuntime.windows.minimize(w.id))
    relicRuntime.windows.blur(profile)
  }

  return (
    <nav aria-label="Apps" data-profile={profile} className="relative z-[5000] flex w-full shrink-0 justify-center px-4 pb-3 pt-1">
      <div className="dock-bar no-scrollbar flex max-w-full items-center gap-1 overflow-x-auto rounded-[14px] border border-[var(--hair)] bg-[linear-gradient(180deg,rgb(var(--ink-2)/0.62),rgb(var(--ink-1)/0.78))] px-2 py-1.5 shadow-[var(--lift)] backdrop-blur-2xl">
        {SURFACES.map((s) => (
          <Key key={s.id} glyph={s.id} label={s.name} active={section === s.id && !anyFocused} onClick={() => surface(s.id)} />
        ))}
        <Gap />
        {PINNED.map((id) => {
          const mine = wins.filter((w) => w.appId === id)
          return <Key key={id} glyph={id} label={shortName(id)} active={mine.some((w) => w.focused && !w.minimized)} running={mine.length > 0} onClick={() => click(id)} />
        })}
        {running.length > 0 && <Gap />}
        {running.map((id) => {
          const mine = wins.filter((w) => w.appId === id)
          return <Key key={id} glyph={id} label={shortName(id)} active={mine.some((w) => w.focused && !w.minimized)} running onClick={() => click(id)} />
        })}
      </div>
    </nav>
  )
}

function Gap() {
  return <span aria-hidden className="mx-2 h-8 w-px shrink-0 bg-[linear-gradient(180deg,transparent,var(--hair-strong),transparent)]" />
}

function Key({ glyph, label, active, running, onClick }: { glyph: string; label: string; active: boolean; running?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label={label} className={`rail-key ${active ? 'is-active' : ''}`}>
      <Glyph id={glyph} size={24} active={active} />
      <span className="rail-label">{label}</span>
      {running && <span className="rail-run" />}
    </button>
  )
}
