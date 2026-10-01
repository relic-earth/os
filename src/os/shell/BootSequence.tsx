import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { relicRuntime } from '../runtime/relicRuntime'
import { useMesh } from '../../ui/primitives'
import { Art } from '../../ui/Art'
import { RelicWordmark, ScarabMark } from '../../ui/Brand'

/**
 * Boot sequence. Cinematic, but honest: each line reflects a real runtime
 * check in the prototype (mesh registry, cloud status, agent gateway).
 */
const LINES: { k: string; v: (o: { online: number }) => string; ms: number }[] = [
  { k: 'DEVICE DISCOVERY', v: () => 'COMPLETE', ms: 1150 },
  { k: 'NETWORK', v: () => 'CONNECTED', ms: 420 },
  { k: 'SECURITY', v: () => 'VERIFIED', ms: 460 },
  { k: 'APPLICATION RUNTIME', v: () => 'READY', ms: 420 },
  { k: 'CLAUDE', v: () => 'READY', ms: 460 },
  { k: 'DEVICE MESH', v: ({ online }) => `${online} DEVICES`, ms: 520 },
]

export function BootSequence() {
  const { online } = useMesh()
  const [phase, setPhase] = useState(0) // 0 mark, 1 lines, 2 ready, 3 exit
  const [shown, setShown] = useState(0)
  const [discovery, setDiscovery] = useState(0)

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []
    timers.push(setTimeout(() => setPhase(1), 1500))
    return () => timers.forEach(clearTimeout)
  }, [])

  useEffect(() => {
    if (phase !== 1) return
    if (shown >= LINES.length) {
      const t = setTimeout(() => setPhase(2), 450)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setShown((n) => n + 1), LINES[shown].ms)
    return () => clearTimeout(t)
  }, [phase, shown])

  // discovery dots
  useEffect(() => {
    if (phase !== 1 || shown > 0) return
    const t = setInterval(() => setDiscovery((d) => Math.min(18, d + 1)), 55)
    return () => clearInterval(t)
  }, [phase, shown])

  useEffect(() => {
    if (phase !== 2) return
    const t = setTimeout(() => setPhase(3), 1300)
    return () => clearTimeout(t)
  }, [phase])

  useEffect(() => {
    if (phase !== 3) return
    const t = setTimeout(() => {
      try {
        localStorage.setItem('relic.booted', '1')
      } catch {
        /* ignore */
      }
      relicRuntime.shell.boot()
    }, 900)
    return () => clearTimeout(t)
  }, [phase])

  useEffect(() => {
    const skip = () => setPhase(3)
    window.addEventListener('keydown', skip)
    return () => window.removeEventListener('keydown', skip)
  }, [])

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-void"
      animate={{ opacity: phase === 3 ? 0 : 1 }}
      transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
      onClick={() => setPhase(3)}
    >
      <Art variant="horizon" seed={4} className="absolute inset-0 h-full w-full opacity-30" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#030303_75%)]" />
      <div className="grain" />

      <div className="relative w-[min(440px,86vw)]">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, filter: 'blur(8px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 1.6, ease: [0.2, 0, 0, 1] }}
          className="flex flex-col items-center text-bone"
        >
          <ScarabMark size={92} glow className="text-signal" />
          <RelicWordmark height={22} className="mt-7" />
        </motion.div>
        {/* the blade ignites from the centre out */}
        <motion.div
          className="saber saber-hum mx-auto mt-8"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: '100%', opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.7, ease: [0.3, 0, 0, 1] }}
        />

        <div className="mt-10 min-h-[260px]">
          <AnimatePresence>
            {phase >= 1 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="label mb-6 text-center text-ash">
                <span className={phase === 1 ? 'pulse' : ''}>{phase >= 2 ? 'SYSTEM CHECK COMPLETE' : 'INITIALIZING'}</span>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="space-y-[11px]">
            {phase >= 1 &&
              LINES.map((l, i) => {
                const done = i < shown
                const active = i === shown && phase === 1
                if (!done && !active) return null
                return (
                  <motion.div key={l.k} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="flex items-baseline gap-3 text-[12px] tracking-[0.14em] font-semibold">
                    <span className="w-[190px] text-ash">{l.k}</span>
                    <span className="flex-1 overflow-hidden whitespace-nowrap text-soot">
                      {i === 0 && active ? '.'.repeat(discovery) : ''}
                    </span>
                    <span className={done ? 'text-bone' : 'text-soot'}>{done ? l.v({ online }) : active && i !== 0 ? '···' : ''}</span>
                    <span className={`dot ${done ? '' : 'dot-off'}`} />
                  </motion.div>
                )
              })}
          </div>
          <AnimatePresence>
            {phase >= 2 && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-10 text-center">
                <div className="label text-ash">RELIC OS</div>
                <div className="mt-2 text-[16px] tracking-[0.3em] font-bold text-signal" style={{ textShadow: '0 0 12px rgba(232,36,43,0.6)' }}>
                  READY
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="label-sm absolute bottom-6 left-1/2 -translate-x-1/2 text-soot">PRESS ANY KEY TO SKIP</div>
    </motion.div>
  )
}
