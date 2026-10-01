import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useOS } from '../runtime/store'
import { relicRuntime } from '../runtime/relicRuntime'
import { Icon } from '../../ui/Icon'
import { fmtClock } from '../../ui/primitives'
import type { RelicNotification } from '../../sdk/types'

function Card({ n, onClose }: { n: RelicNotification; onClose?: () => void }) {
  return (
    <div className={`panel relative flex gap-3 overflow-hidden py-3 pl-4 pr-3 ${n.level === 'active' ? 'edge-top' : ''}`}>
      <span className={`absolute inset-y-0 left-0 w-[2px] ${n.level === 'warning' ? 'bg-signal' : 'bg-red/80'}`} />
      <Icon name={n.icon ?? 'zap'} size={14} className={`mt-0.5 shrink-0 ${n.level === 'warning' ? 'text-signal' : 'text-red'}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <span className="label-sm truncate text-ash">{n.source}</span>
          <span className="label-sm num text-soot">{fmtClock(n.at)}</span>
        </div>
        <div className="mt-1 text-[11px] tracking-[0.09em] font-semibold text-bone">{n.title}</div>
        {n.body && <div className="mt-1 truncate text-[11px] tracking-[0.02em] text-ash">{n.body}</div>}
      </div>
      {onClose && (
        <button onClick={onClose} className="self-start text-smoke hover:text-bone" aria-label="Dismiss">
          <X size={12} strokeWidth={1.25} />
        </button>
      )}
    </div>
  )
}

/** Transient toasts, top-right under the system bar. */
export function Toasts({ top = 56 }: { top?: number }) {
  const toasts = useOS((s) => s.toasts)
  const items = useOS((s) => s.notifications)
  const open = useOS((s) => s.notificationCenterOpen)
  if (open) return null
  return (
    <div className="pointer-events-none fixed right-4 z-[9500] flex w-[320px] flex-col gap-2" style={{ top }}>
      <AnimatePresence initial={false}>
        {toasts.map((id) => {
          const n = items.find((x) => x.id === id)
          if (!n) return null
          return (
            <motion.div
              key={id}
              layout
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24, transition: { duration: 0.2 } }}
              transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
              className="pointer-events-auto"
            >
              <Card n={n} onClose={() => relicRuntime.notifications.dismissToast(id)} />
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

/** Unified notification center — every device, one list. */
export function NotificationCenter() {
  const open = useOS((s) => s.notificationCenterOpen)
  const items = useOS((s) => s.notifications)
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-[9400]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => relicRuntime.notifications.toggleCenter(false)} />
          <motion.aside
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.2, 0, 0, 1] }}
            className="panel fixed bottom-4 right-4 top-[52px] z-[9450] flex w-[360px] flex-col"
          >
            <div className="flex items-center justify-between border-b hair px-5 py-3">
              <span className="label text-bone">NOTIFICATIONS</span>
              <button className="label-sm hover:text-bone" onClick={() => relicRuntime.notifications.clear()}>
                CLEAR
              </button>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {items.length === 0 && <div className="label-sm px-2 py-8 text-center text-soot">NO NOTIFICATIONS</div>}
              {items.map((n) => (
                <Card key={n.id} n={n} />
              ))}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
