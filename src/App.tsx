import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useOS } from './os/runtime/store'
import { relicRuntime } from './os/runtime/relicRuntime'
import { startClock } from './os/runtime/clock'
import { useGlobalShortcuts } from './os/shell/keyboard'
import { BootSequence } from './os/shell/BootSequence'
import { OSShell } from './os/shell/OSShell'
import { CommandBar } from './os/shell/CommandBar'
import { ConfirmDialog, LaunchOverlay, TaskSwitcher, TransferOverlay } from './os/shell/SystemDialogs'
import { NotificationCenter, Toasts } from './os/notifications/NotificationCenter'
import { PROFILES } from './os/shell/TopBar'
import { TVMode } from './modes/TVMode'
import { PhoneMode } from './modes/PhoneMode'
import { CarMode } from './modes/CarMode'
import { ThermostatMode } from './modes/ThermostatMode'

/** The interface zoom: the chosen scale on computer-sized screens, 1 on phones. */
export function uiZoom(scale: number, width = window.innerWidth) {
  return width < 700 ? 1 : scale
}

/** Viewport width in layout pixels (after the interface zoom). */
function useViewport() {
  const scale = useOS((s) => s.uiScale)
  const raw = useRawWidth()
  return { raw, layout: raw / uiZoom(scale, raw) }
}

function useRawWidth() {
  const [w, setW] = useState(() => window.innerWidth)
  useEffect(() => {
    const on = () => setW(window.innerWidth)
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return w
}

/** Picks the interface for the device node this screen is rendering. */
function DeviceProfile() {
  const profile = useOS((s) => s.profile)
  const { raw, layout: width } = useViewport()
  const narrow = raw < 700
  if (narrow && profile !== 'relic-thermostat') return <PhoneMode framed={false} />
  switch (profile) {
    case 'relic-tv':
      return <TVMode />
    case 'relic-phone':
      return <PhoneMode framed />
    case 'relic-car':
      return <CarMode />
    case 'relic-thermostat':
      return <ThermostatMode />
    default:
      return <OSShell compact={width < 1100} />
  }
}

function ProfileFlash() {
  const profile = useOS((s) => s.profile)
  const [shown, setShown] = useState<string | null>(null)
  const last = useRef(profile)
  useEffect(() => {
    if (last.current === profile) return
    last.current = profile
    setShown(profile)
    const t = setTimeout(() => setShown(null), 900)
    return () => clearTimeout(t)
  }, [profile])
  const p = PROFILES.find((x) => x.id === shown)
  return (
    <AnimatePresence>
      {p && (
        <motion.div className="pointer-events-none fixed inset-0 z-[9900] flex items-center justify-center bg-void" initial={{ opacity: 1 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.9, ease: [0.6, 0, 0.4, 1] }}>
          <div className="text-center">
            <div className="label text-red">{p.mode}</div>
            <div className="mt-3 text-[18px] tracking-[0.27em] font-semibold text-bone">{p.label}</div>
            <div className="mx-auto mt-4 h-px w-40 bg-gradient-to-r from-transparent via-signal to-transparent" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function App() {
  const booted = useOS((s) => s.booted)
  const theme = useOS((s) => s.theme)
  useGlobalShortcuts()
  useEffect(() => {
    startClock()
    const params = new URLSearchParams(location.search)
    let seen = false
    try {
      seen = localStorage.getItem('relic.booted') === '1'
    } catch {
      /* private mode */
    }
    if (seen && !params.has('boot')) relicRuntime.shell.boot()
  }, [])
  const skin = useOS((s) => s.skin)
  const uiScale = useOS((s) => s.uiScale)
  const rawWidth = useRawWidth()
  useEffect(() => {
    // every surface scales together; drag math reads the same factor (see AppWindow)
    document.documentElement.style.setProperty('zoom', String(uiZoom(uiScale, rawWidth)))
  }, [uiScale, rawWidth])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  useEffect(() => {
    document.documentElement.dataset.skin = skin
  }, [skin])

  return (
    <div className="h-full w-full">
      {booted && <DeviceProfile />}
      {!booted && <BootSequence />}
      {booted && (
        <>
          <ProfileFlash />
          <CommandBar />
          <Toasts />
          <NotificationCenter />
          <LaunchOverlay />
          <TransferOverlay />
          <ConfirmDialog />
          <TaskSwitcher />
        </>
      )}
    </div>
  )
}
