import { useEffect, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import { setOS, useOSShallow } from '../runtime/store'
import { AppWindow } from './AppWindow'
import { AppSurface } from '../../apps'

/**
 * WINDOW MANAGER — composites every window that belongs to the device node
 * this screen is rendering. Reports the work-area size to the compositor so
 * placement, cascade and maximize are computed against real bounds.
 */
export function WindowManager() {
  const ref = useRef<HTMLDivElement>(null)
  const wins = useOSShallow((s) => s.windows.filter((w) => w.deviceId === s.profile))

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect
      setOS({ workArea: { width: Math.round(width), height: Math.round(height) } })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0">
      <div className="pointer-events-auto">
        <AnimatePresence>
          {wins.map((w) => (
            <AppWindow key={w.id} win={w}>
              <AppSurface win={w} />
            </AppWindow>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
