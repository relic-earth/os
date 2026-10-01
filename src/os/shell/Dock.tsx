import { useOS, useOSShallow, type Section } from '../runtime/store'
import { relicRuntime } from '../runtime/relicRuntime'
import { getApp } from '../apps/registry'
import { Glyph } from '../../ui/AppIcon'

const PINNED = ['claude', 'files', 'web', 'apps', 'devices', 'settings']
const SURFACES: { id: Section; name: string }[] = [
  { id: 'home', name: 'Home' },
  { id: 'tv', name: 'TV' },
  { id: 'movies', name: 'Movies' },
  { id: 'games', name: 'Games' },
]

const shortName = (id: string) => (getApp(id)?.name ?? id).replace('Relic ', '').replace('Applications', 'Apps')

/**
 * COMMAND RAIL — the deck's left spine. Numbered keys: the four places,
 * then the system apps, then whatever is running. Claude has no field:
 * start typing anywhere.
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

  let n = 0
  const key = () => String(++n).padStart(2, '0')

  return (
    <nav aria-label="Apps" data-profile={profile} className="no-scrollbar relative z-[5000] flex w-[88px] shrink-0 flex-col items-stretch gap-1 overflow-y-auto border-r border-[rgb(var(--acc)/0.16)] bg-[linear-gradient(90deg,rgb(var(--ink-1)/0.92),rgb(var(--ink-1)/0.78))] px-2 py-3 backdrop-blur-xl">
      <RailHead>NAV</RailHead>
      {SURFACES.map((s) => (
        <Key key={s.id} n={key()} glyph={s.id} label={s.name} active={section === s.id && !anyFocused} onClick={() => surface(s.id)} />
      ))}
      <RailHead>SYS</RailHead>
      {PINNED.map((id) => {
        const mine = wins.filter((w) => w.appId === id)
        return <Key key={id} n={key()} glyph={id} label={shortName(id)} active={mine.some((w) => w.focused && !w.minimized)} running={mine.length > 0} onClick={() => click(id)} />
      })}
      {running.length > 0 && <RailHead>RUN</RailHead>}
      {running.map((id) => {
        const mine = wins.filter((w) => w.appId === id)
        return <Key key={id} n={key()} glyph={id} label={shortName(id)} active={mine.some((w) => w.focused && !w.minimized)} running onClick={() => click(id)} />
      })}
    </nav>
  )
}

function RailHead({ children }: { children: string }) {
  return (
    <div className="mt-2 flex items-center gap-1.5 px-1 font-mono text-[9px] tracking-[0.2em] text-[rgb(var(--gold)/0.75)] first:mt-0">
      <span className="h-px flex-1 bg-[rgb(var(--gold)/0.35)]" />
      {children}
      <span className="h-px w-2 bg-[rgb(var(--gold)/0.35)]" />
    </div>
  )
}

function Key({ n, glyph, label, active, running, onClick }: { n: string; glyph: string; label: string; active: boolean; running?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label={label} className={`rail-key hud-target group ${active ? 'is-active' : ''}`}>
      <span className="rail-n">{n}</span>
      {running && <span className="rail-run" />}
      <Glyph id={glyph} size={24} className={active ? 'text-white' : 'text-[rgb(var(--acc))]'} />
      <span className="rail-label">{label}</span>
    </button>
  )
}
