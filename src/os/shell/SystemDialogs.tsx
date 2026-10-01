import { AnimatePresence, motion } from 'framer-motion'
import { Check, Loader } from 'lucide-react'
import { useOS, useOSShallow } from '../runtime/store'
import { getApp } from '../apps/registry'
import { riskMeta } from '../../agent/policies'
import { AppIcon } from '../../ui/AppIcon'

const scrim = 'fixed inset-0 z-[9700] flex items-center justify-center bg-void/70 backdrop-blur-[3px]'

/** CLAUDE permission request — sensitive and system actions. */
export function ConfirmDialog() {
  const c = useOS((s) => s.confirm)
  return (
    <AnimatePresence>
      {c && (
        <motion.div className={scrim} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
            className="panel ticks w-[min(420px,92vw)]"
            role="alertdialog"
            aria-label="Claude permission request"
          >
            <div className={`h-[2px] ${c.risk === 'system' ? 'bg-signal shadow-[0_0_14px_rgba(232,36,43,0.9)]' : 'bg-red/80'}`} />
            <div className="px-7 pb-6 pt-6">
              <div className="flex items-center justify-between">
                <span className="label text-red">{c.risk === 'system' ? 'CONFIRM SYSTEM ACTION' : 'CLAUDE'}</span>
                <span className="label-sm border hair px-2 py-0.5">{riskMeta[c.risk].label}</span>
              </div>
              <div className="mt-5 text-[13px] tracking-[0.02em] text-ash">{c.title}</div>
              <div className="mt-2 text-[20px] tracking-[0.14em] font-semibold text-bone">{c.subject}</div>
              {c.detail && <div className="mt-4 whitespace-pre-line text-[11px] leading-relaxed tracking-[0.12em] text-ash">{c.detail}</div>}
              {c.permissions && c.permissions.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-[2px] border hair bg-[var(--line-faint)]">
                  {c.permissions.map((p) => (
                    <div key={p} className="bg-ink px-3 py-2.5 text-center text-[11px] tracking-[0.13em] font-semibold text-bone">
                      {p}
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-7 flex gap-3">
                <button className="btn btn-ghost flex-1" onClick={() => c.resolve(false)} autoFocus>
                  {c.risk === 'system' ? 'CANCEL' : 'DENY'}
                </button>
                <button className="btn btn-primary flex-1" onClick={() => c.resolve(true)}>
                  {c.risk === 'system' ? 'CONFIRM' : 'ALLOW'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function StageRow({ label, state }: { label: string; state: 'pending' | 'running' | 'done' }) {
  return (
    <div className="flex items-center gap-4 py-[5px]">
      <span className={`w-[150px] text-[11px] tracking-[0.14em] font-semibold ${state === 'pending' ? 'text-soot' : 'text-ash'}`}>{label}</span>
      <span className="relative h-px flex-1 overflow-hidden bg-graphite">
        {state === 'running' && <span className="sweep" />}
        {state === 'done' && <span className="absolute inset-0 bg-red/60" />}
      </span>
      <span className={`w-[64px] text-right text-[11px] tracking-[0.14em] font-semibold ${state === 'done' ? 'text-bone' : 'text-soot'}`}>
        {state === 'done' ? 'READY' : state === 'running' ? '···' : ''}
      </span>
    </div>
  )
}

/** RELIC COMPATIBILITY — application launch through a runtime backend. */
export function LaunchOverlay() {
  const l = useOS((s) => s.launch)
  const app = l ? getApp(l.appId) : undefined
  return (
    <AnimatePresence>
      {l && app && (
        <motion.div className={scrim} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.35 } }}>
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ scale: 1.03, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
            className="panel ticks relative w-[min(460px,92vw)] overflow-hidden"
          >
            <div className="scanline opacity-40" />
            <div className="relative px-8 py-8">
              <div className="label text-red">RELIC COMPATIBILITY</div>
              <div className="mt-6 flex items-center gap-4">
                <AppIcon id={app.id} size={60} live active />
                <div>
                  <div className="text-[20px] tracking-[0.15em] font-semibold text-bone">{app.name.toUpperCase()}</div>
                  <div className="label-sm mt-1 text-ash">{l.platform}</div>
                </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-[2px] border hair bg-[var(--line-faint)]">
                <div className="bg-ink px-4 py-3">
                  <div className="label-sm">RUNTIME</div>
                  <div className="mt-1 text-[11px] tracking-[0.11em] font-semibold text-bone">{l.runtimeLabel}</div>
                </div>
                <div className="bg-ink px-4 py-3">
                  <div className="label-sm">VERSION</div>
                  <div className="mt-1 text-[11px] tracking-[0.11em] font-semibold text-bone">{app.version} · {app.publisher.toUpperCase()}</div>
                </div>
              </div>
              <div className="mt-6">
                <div className={`label mb-3 ${l.message === 'READY' ? 'text-signal' : 'pulse'}`}>{l.message === 'READY' ? 'LAUNCHING' : 'INITIALIZING…'}</div>
                {l.stages.map((s) => (
                  <StageRow key={s.key} label={s.label} state={s.state} />
                ))}
              </div>
              <div className="label-sm mt-6 text-soot">SIMULATED · NO WINDOWS BINARIES EXECUTE IN THIS PROTOTYPE</div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** TRANSFERRING SESSION — continuity across mesh nodes. */
export function TransferOverlay() {
  const t = useOS((s) => s.transfer)
  return (
    <AnimatePresence>
      {t && (
        <motion.div
          className="fixed bottom-24 left-1/2 z-[9600] w-[min(420px,92vw)] -translate-x-1/2"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.28, ease: [0.2, 0, 0, 1] }}
        >
          <div className="panel ticks relative overflow-hidden px-6 py-5">
            {!t.done && <div className="sweep opacity-20" />}
            <div className="label text-red">{t.done ? 'SESSION TRANSFERRED' : `${t.title}…`}</div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div>
                <div className="label-sm">{t.kind === 'media' ? 'MEDIA' : 'APPLICATION'}</div>
                <div className="mt-1 truncate text-[11px] tracking-[0.09em] font-semibold text-bone">{t.subject.toUpperCase()}</div>
              </div>
              <div>
                <div className="label-sm">STATE</div>
                <div className={`mt-1 text-[11px] tracking-[0.09em] font-semibold ${t.done ? 'text-bone' : 'text-ash'}`}>{t.done ? 'SYNCHRONIZED' : 'SYNCING'}</div>
              </div>
              <div>
                <div className="label-sm">DESTINATION</div>
                <div className="mt-1 truncate text-[11px] tracking-[0.09em] font-semibold text-signal">{t.to.toUpperCase()}</div>
              </div>
            </div>
            <div className="mt-4 space-y-1">
              {t.stages.map((s) => (
                <div key={s.label} className="flex items-center gap-2 text-[11px]">
                  <span className="flex w-3 justify-center">
                    {s.state === 'done' ? <Check size={11} className="text-signal" strokeWidth={2} /> : s.state === 'running' ? <Loader size={11} className="animate-spin text-ash" /> : <span className="dot dot-off" />}
                  </span>
                  <span className={s.state === 'pending' ? 'text-soot' : 'text-bone/85'}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** CTRL+TAB application switcher. */
export function TaskSwitcher() {
  const sw = useOS((s) => s.switcher)
  const wins = useOSShallow((s) => s.windows.filter((w) => w.deviceId === s.profile).sort((a, b) => b.z - a.z))
  if (!sw.open || wins.length < 2) return null
  return (
    <div className="fixed inset-0 z-[9800] flex items-center justify-center bg-void/40">
      <div className="panel ticks flex gap-px p-3">
        {wins.map((w, i) => {
          const app = getApp(w.appId)
          const active = i === sw.index % wins.length
          return (
            <div key={w.id} className={`flex w-[124px] flex-col items-center gap-3 rounded-[2px] px-3 py-5 ${active ? 'bg-white/[0.08] shadow-[0_0_30px_rgba(232,36,43,0.2)]' : ''}`}>
              <AppIcon id={w.appId} size={64} live={active} active={active} />
              <span className="w-full truncate text-center text-[12px] tracking-[0.1em] font-semibold text-bone">{(app?.name ?? w.title).replace('Relic ', '').toUpperCase()}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
