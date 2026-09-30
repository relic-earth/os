import { AnimatePresence, motion } from 'framer-motion'
import { useOS } from '../runtime/store'
import { Background } from './Background'
import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'
import { Dock } from './Dock'
import { WindowManager } from '../compositor/WindowManager'
import { Home } from './views/Home'
import { Games, Movies, TVSection } from './views/MediaViews'

/**
 * OS SHELL — the desktop profile (Relic Laptop / Relic Desktop).
 * Surface (sections) underneath, compositor windows above, dock on top.
 * `compact` is the tablet-width layout: icon sidebar, single content column.
 */
export function OSShell({ compact }: { compact?: boolean }) {
  const section = useOS((s) => s.section)
  const profile = useOS((s) => s.profile)
  return (
    <div className="relative flex h-full w-full flex-col overflow-clip">
      <Background />
      <TopBar compact={compact} />
      <div className="relative flex min-h-0 flex-1">
        <Sidebar compact={compact} />
        <main className="relative min-w-0 flex-1 overflow-clip">
          <AnimatePresence mode="wait">
            <motion.div
              key={section + profile}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              {section === 'home' && <Home compact={compact} />}
              {section === 'tv' && <TVSection />}
              {section === 'movies' && <Movies />}
              {section === 'games' && <Games />}
            </motion.div>
          </AnimatePresence>
          <WindowManager />
          <Dock />
          {profile === 'relic-desktop' && (
            <div className="label-sm pointer-events-none absolute left-4 top-3 z-[4000] text-red">RELIC DESKTOP · OFFICE</div>
          )}
        </main>
      </div>
    </div>
  )
}
