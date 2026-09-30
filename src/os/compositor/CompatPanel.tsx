import { motion } from 'framer-motion'
import { X, MousePointer2 } from 'lucide-react'
import type { RelicWindow } from '../../sdk/types'
import { useOS } from '../runtime/store'
import { getApp } from '../apps/registry'
import { relicRuntime } from '../runtime/relicRuntime'
import { permissionLabels } from '../permissions/service'
import { windowsBackends } from '../../compatibility/windows/manager'
import { useNow } from '../../ui/primitives'

const NONE = {} as Record<string, string>

/** Runtime / compatibility details for a running non-native application. */
export function CompatPanel({ win, onClose }: { win: RelicWindow; onClose: () => void }) {
  const app = getApp(win.appId)!
  const c = useOS((s) => s.compat[win.id])
  const perms = useOS((s) => s.appPermissions[win.appId]) ?? NONE
  const device = useOS((s) => s.devices.find((d) => d.id === win.deviceId))
  const cu = useOS((s) => s.computerUse)
  const now = useNow()
  const uptime = c ? Math.floor((now - c.startedAt) / 1000) : 0
  const isWin = app.runtime === 'windows'
  const rows: [string, string, boolean?][] = [
    ['APPLICATION', app.name.toUpperCase()],
    ['PLATFORM', isWin ? 'WINDOWS' : 'LINUX'],
    ['COMPATIBILITY', isWin ? (c?.mode === 'wine' ? 'WINE' : c?.mode === 'vm' ? 'WINDOWS VM' : 'REMOTE WINDOWS') : 'NATIVE · SANDBOX'],
    ['BACKEND', isWin ? windowsBackends[c?.mode ?? 'wine'].label : 'LINUX SANDBOX'],
    ['GPU', c?.gpu ?? 'ACCELERATED'],
    ['TRANSLATION', c?.translation ?? '—'],
    ['PREFIX', c?.prefix ?? '—'],
    ['NODE', device?.name.toUpperCase() ?? '—'],
    ['UPTIME', `${Math.floor(uptime / 60)}:${String(uptime % 60).padStart(2, '0')}`],
    ['STATUS', (c?.status ?? 'running').toUpperCase(), true],
  ]
  return (
    <motion.aside
      initial={{ x: 24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.24, ease: [0.2, 0, 0, 1] }}
      className="absolute bottom-0 right-0 top-0 z-20 flex w-[280px] flex-col border-l hair-strong bg-[rgba(5,4,4,0.97)]"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between border-b hair px-4 py-2.5">
        <span className="label text-red">{isWin ? 'WINDOWS COMPATIBILITY' : 'LINUX RUNTIME'}</span>
        <button onClick={onClose} className="text-smoke hover:text-bone" aria-label="Close runtime panel">
          <X size={12} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {rows.map(([k, v, hot]) => (
          <div key={k} className="flex items-baseline justify-between gap-3 border-b hair-faint py-[7px]">
            <span className="label-sm">{k}</span>
            <span className={`truncate text-right text-[9px] tracking-[0.2em] ${hot ? 'text-signal' : 'text-bone'}`}>{v}</span>
          </div>
        ))}
        <div className="label-sm mt-5 mb-2 text-ash">PERMISSIONS</div>
        {(['files', 'gpu', 'network', 'camera', 'microphone'] as const).map((p) => (
          <div key={p} className="flex items-center justify-between py-[5px]">
            <span className="label-sm">{permissionLabels[p]}</span>
            <span className={`text-[9px] tracking-[0.22em] ${perms[p] === 'allowed' ? 'text-bone' : perms[p] === 'denied' ? 'text-smoke' : 'text-ash'}`}>
              {(perms[p] ?? 'denied').toUpperCase()}
            </span>
          </div>
        ))}
      </div>
      <div className="border-t hair p-4">
        <div className="label-sm mb-2">NO NATIVE RELIC API</div>
        <button
          className="btn w-full"
          disabled={!!cu}
          onClick={() => void relicRuntime.ai.ask('Use computer use to brighten the render in Photoshop')}
        >
          <MousePointer2 size={12} strokeWidth={1.25} /> CLAUDE · COMPUTER USE
        </button>
      </div>
    </motion.aside>
  )
}
