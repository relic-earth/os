import { AnimatePresence, motion } from 'framer-motion'
import { useOS } from '../runtime/store'
import { getApp } from '../apps/registry'

/**
 * Visualises a computer-use session on one window: connection status, the
 * agent's cursor, the element it is targeting and its action log.
 */
export function ComputerUseOverlay({ windowId }: { windowId: string }) {
  const cu = useOS((s) => (s.computerUse?.windowId === windowId ? s.computerUse : null))
  return (
    <AnimatePresence>
      {cu && (
        <motion.div className="pointer-events-none absolute inset-0 z-30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 border-2 border-red/60 shadow-[inset_0_0_40px_rgba(179,20,27,0.25)]" />
          {cu.phase === 'connecting' && <div className="scanline" />}

          {/* status */}
          <div className="panel absolute left-3 top-3 w-[210px] px-4 py-3">
            <div className="label-sm text-red">CLAUDE</div>
            <div className="label mt-0.5 text-bone">COMPUTER USE</div>
            <div className="mt-2 text-[11px] tracking-[0.12em] font-semibold text-bone">{getApp(cu.appId)?.name.toUpperCase()}</div>
            <div className="mt-3 space-y-1.5">
              {['SCREEN', 'MOUSE', 'KEYBOARD'].map((k) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="label-sm">{k}</span>
                  <span className={`text-[10px] tracking-[0.1em] font-semibold ${cu.phase === 'connecting' ? 'pulse text-ash' : 'text-bone'}`}>{cu.phase === 'connecting' ? 'CONNECTING' : cu.phase === 'done' ? 'RELEASED' : 'CONNECTED'}</span>
                </div>
              ))}
            </div>
            {cu.task && <div className="mt-3 border-t hair pt-2 text-[11px] leading-snug tracking-[0.04em] text-ash">{cu.task}</div>}
            <div className="label-sm mt-2 text-soot">SIMULATED DRIVER</div>
          </div>

          {/* log */}
          <div className="panel absolute bottom-3 left-3 max-h-[40%] w-[230px] overflow-hidden px-4 py-2">
            {cu.log.slice(-6).map((l, i) => (
              <div key={i} className="mono truncate text-[11px] leading-5 text-ash">
                <span className="text-red">›</span> {l}
              </div>
            ))}
          </div>

          {/* target */}
          {cu.target && (
            <motion.div
              className="absolute border border-signal shadow-[0_0_14px_rgba(232,36,43,0.6)]"
              initial={false}
              animate={{ left: `${cu.target.x - cu.target.w / 2}%`, top: `${cu.target.y - cu.target.h / 2}%`, width: `${cu.target.w}%`, height: `${cu.target.h}%` }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            >
              <span className="label-sm absolute -top-4 left-0 whitespace-nowrap text-signal">{cu.target.label}</span>
            </motion.div>
          )}

          {/* cursor */}
          <motion.div className="absolute" initial={false} animate={{ left: `${cu.cursor.x}%`, top: `${cu.cursor.y}%` }} transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}>
            <svg width="22" height="22" viewBox="0 0 22 22" className="-translate-x-[3px] -translate-y-[2px] drop-shadow-[0_0_6px_rgba(232,36,43,0.9)]">
              <path d="M3 2 L3 18 L7.5 13.5 L10.5 20 L13 19 L10 12.5 L16 12.5 Z" fill="#e8242b" stroke="#ffd6d6" strokeWidth="0.8" />
            </svg>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
