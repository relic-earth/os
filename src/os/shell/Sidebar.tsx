import { motion } from 'framer-motion'
import { useOS, type Section } from '../runtime/store'
import { relicRuntime } from '../runtime/relicRuntime'
import { useMesh } from '../../ui/primitives'
import { Icon } from '../../ui/Icon'
import { claudeGateway } from '../../agent/relicAgent'

type NavItem = { id: string; label: string; icon: string; section?: Section; app?: string }

export const NAV: NavItem[] = [
  { id: 'home', label: 'HOME', icon: 'home', section: 'home' },
  { id: 'tv', label: 'TV', icon: 'tv', section: 'tv' },
  { id: 'movies', label: 'MOVIES', icon: 'play', section: 'movies' },
  { id: 'apps', label: 'APPS', icon: 'grid', app: 'apps' },
  { id: 'games', label: 'GAMES', icon: 'gamepad', section: 'games' },
  { id: 'files', label: 'FILES', icon: 'folder', app: 'files' },
  { id: 'web', label: 'WEB', icon: 'globe', app: 'web' },
  { id: 'claude', label: 'CLAUDE', icon: 'sparkle', app: 'claude' },
  { id: 'devices', label: 'DEVICES', icon: 'devices', app: 'devices' },
  { id: 'settings', label: 'SETTINGS', icon: 'settings', app: 'settings' },
]

export function Sidebar({ compact }: { compact?: boolean }) {
  const section = useOS((s) => s.section)
  const profile = useOS((s) => s.profile)
  const focusedApp = useOS((s) => s.windows.find((w) => w.deviceId === s.profile && w.focused && !w.minimized)?.appId)
  const cloud = useOS((s) => s.cloud.status)
  const { online } = useMesh()
  const activeId = NAV.find((n) => n.app && n.app === focusedApp)?.id ?? section

  const go = (n: NavItem) => {
    if (n.section) {
      relicRuntime.shell.setSection(n.section)
      relicRuntime.windows.blur(profile)
    } else if (n.app) void relicRuntime.apps.launch(n.app)
  }

  return (
    <nav className={`relative z-20 flex shrink-0 flex-col border-r hair bg-void/55 backdrop-blur-md ${compact ? 'w-[60px]' : 'w-[196px]'}`}>
      <div className="flex-1 pt-5">
        {NAV.map((n, i) => {
          const active = n.id === activeId
          return (
            <button
              key={n.id}
              onClick={() => go(n)}
              title={n.label}
              className={`group relative flex h-10 w-full items-center gap-3 transition-colors ${compact ? 'justify-center' : 'pl-6 pr-4'} ${active ? '' : 'hover:bg-burgundy/40'}`}
            >
              {active && <motion.span layoutId="nav-lit" className="lit absolute inset-0" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
              {compact ? (
                <Icon name={n.icon} size={16} className={`relative ${active ? 'text-signal' : 'text-ash group-hover:text-bone'}`} />
              ) : (
                <>
                  <span className={`num relative w-4 text-[9px] ${active ? 'text-red' : 'text-soot'}`}>{String(i + 1).padStart(2, '0')}</span>
                  <span className={`relative text-[11px] tracking-[0.34em] ${active ? 'text-bone' : 'text-ash group-hover:text-bone'}`}>{n.label}</span>
                </>
              )}
            </button>
          )
        })}
      </div>

      {!compact && (
        <div className="m-4 border hair bg-ink/60 p-3.5">
          <div className="label-sm text-red">RELIC SYSTEM</div>
          <div className="mt-3 space-y-2">
            {[
              ['LOCAL', 'READY', true],
              ['CLOUD', cloud === 'connected' ? 'CONNECTED' : 'OFFLINE', cloud === 'connected'],
              ['CLAUDE', cloud === 'connected' ? 'CONNECTED' : 'ON-DEVICE', true],
              ['DEVICE MESH', `${online} DEVICES`, true],
            ].map(([k, v, on]) => (
              <div key={k as string} className="flex items-center justify-between">
                <span className="label-sm">{k as string}</span>
                <span className="flex items-center gap-1.5">
                  <span className={`text-[9px] tracking-[0.22em] ${on ? 'text-bone/80' : 'text-signal'}`}>{v as string}</span>
                </span>
              </div>
            ))}
          </div>
          <div className="label-sm mt-3 border-t hair pt-2 text-soot">{claudeGateway.active().label}</div>
        </div>
      )}
    </nav>
  )
}
