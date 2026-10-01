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
 * COMMAND BAR — the deck's bottom edge. Numbered keys: the four places,
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
    <nav aria-label="Apps" data-profile={profile} className="no-scrollbar relative z-[5000] flex h-[78px] w-full shrink-0 items-center justify-center gap-1.5 overflow-x-auto border-t border-[rgb(var(--acc)/0.22)] bg-[linear-gradient(0deg,rgb(var(--ink-1)/0.95),rgb(var(--ink-1)/0.8))] px-4 backdrop-blur-xl">
      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgb(var(--acc)),transparent)] opacity-70" />
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
    <div className="flex h-[60px] shrink-0 flex-col items-center justify-between px-2 font-mono text-[9px] tracking-[0.2em] text-[rgb(var(--gold)/0.8)] first:pl-0">
      <span className="w-px flex-1 bg-[rgb(var(--gold)/0.35)]" />
      <span className="py-1 [writing-mode:vertical-rl] rotate-180">{children}</span>
      <span className="w-px flex-1 bg-[rgb(var(--gold)/0.35)]" />
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
