import { useState } from 'react'
import { Download } from 'lucide-react'
import { useOS, useOSShallow } from '../os/runtime/store'
import { relicRuntime } from '../os/runtime/relicRuntime'
import { appRegistry, runtimeLabel } from '../os/apps/registry'
import type { AppRuntime } from '../sdk/types'
import { AppIcon } from '../ui/AppIcon'

const FILTERS: { id: 'all' | AppRuntime; label: string }[] = [
  { id: 'all', label: 'ALL' },
  { id: 'windows', label: 'WINDOWS' },
  { id: 'linux', label: 'LINUX' },
  { id: 'relic', label: 'RELIC' },
]

const HIDDEN = ['apps', 'viewer', 'player']

/** APPLICATIONS — launcher over the application registry. */
export function AppLauncher({ compact }: { compact?: boolean }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all')
  const installed = useOS((s) => s.installed)
  const running = useOSShallow((s) => s.windows.filter((w) => w.deviceId === s.profile).map((w) => w.appId))
  const confirmBusy = useOS((s) => !!s.confirm || s.agentBusy)
  const list = appRegistry.filter((a) => !HIDDEN.includes(a.id) && (filter === 'all' || a.runtime === filter))
  const counts = (id: string) => appRegistry.filter((a) => !HIDDEN.includes(a.id) && (id === 'all' || a.runtime === id)).length

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b hair px-4">
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} className={`relative px-4 py-3 text-[11px] tracking-[0.14em] font-semibold ${filter === f.id ? 'text-bone' : 'text-smoke hover:text-ash'}`}>
            {f.label} <span className="num text-soot">{counts(f.id)}</span>
            {filter === f.id && <span className="absolute inset-x-3 bottom-0 h-[2px] bg-signal shadow-[0_0_8px_rgba(232,36,43,0.8)]" />}
          </button>
        ))}
        {!compact && <span className="label-sm ml-auto">WINDOWS APPS RUN THROUGH RELIC COMPATIBILITY</span>}
      </div>
      <div className={`grid flex-1 content-start gap-2 overflow-y-auto p-3 ${compact ? 'grid-cols-2' : 'grid-cols-[repeat(auto-fill,minmax(180px,1fr))]'}`}>
        {list.map((a) => {
          const isInstalled = installed[a.id]
          const isRunning = running.includes(a.id)
          return (
            <button
              key={a.id}
              onClick={() => (isInstalled ? void relicRuntime.apps.launch(a.id) : !confirmBusy && void relicRuntime.ai.ask(`Install ${a.name}`))}
              className="group relative flex h-[156px] flex-col justify-between rounded-[18px] p-4 text-left transition-colors hover:bg-white/[0.06]"
            >
              <div className="flex items-start justify-between">
                <AppIcon id={a.id} size={56} active={isRunning} live={isRunning} className={isInstalled ? '' : 'opacity-50'} />
                {isRunning && <span className="label-sm text-red">RUNNING</span>}
                {!isInstalled && <Download size={13} strokeWidth={1.25} className="text-smoke" />}
              </div>
              <div>
                <div className="text-[15px] font-semibold text-bone">{a.name}</div>
                <div className={`label-sm mt-1 ${a.runtime === 'windows' ? 'text-red' : ''}`}>
                  {runtimeLabel[a.runtime]}
                  {!isInstalled && ' · INSTALL'}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
