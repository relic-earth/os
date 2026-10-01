import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useOS, useOSShallow } from '../os/runtime/store'
import { relicRuntime } from '../os/runtime/relicRuntime'
import { getMedia, mediaLibrary, fmtTime } from '../os/media/library'
import { getApp, appRegistry } from '../os/apps/registry'
import { Art } from '../ui/Art'
import { Icon } from '../ui/Icon'
import { fmtClock, useNow, Wordmark } from '../ui/primitives'
import { DeviceSwitcher } from '../os/shell/TopBar'
import { AppSurface } from '../apps'
import { Player } from '../apps/Player'
import { AppIcon } from '../ui/AppIcon'

type Screen = { kind: 'home' } | { kind: 'grid'; title: string; items: Tile[] } | { kind: 'player'; sessionId: string } | { kind: 'app'; windowId: string }
type Tile = { id: string; label: string; short?: string; sub?: string; art: string; icon?: string; action: () => void }

const TV = 'relic-tv'

/** RELIC TV — the 10-foot profile. Arrow keys = remote control. */
export function TVMode() {
  const now = useNow(15_000)
  const sessions = useOS((s) => s.sessions)
  const tvWins = useOSShallow((s) => s.windows.filter((w) => w.deviceId === TV))
  const [screen, setScreen] = useState<Screen>(() => {
    const w = useOS.getState().windows.find((x) => x.deviceId === TV)
    return w ? { kind: 'app', windowId: w.id } : { kind: 'home' }
  })
  const [focus, setFocus] = useState(0)

  const video = sessions.filter((s) => s.mediaId && getMedia(s.mediaId)?.kind !== 'track').sort((a, b) => (a.deviceId === TV ? -1 : b.deviceId === TV ? 1 : b.updatedAt - a.updatedAt))[0]

  const playHere = (mediaId: string) => {
    const existing = sessions.find((s) => s.mediaId === mediaId)
    let id: string
    if (existing) {
      if (existing.deviceId !== TV) void relicRuntime.continuity.transfer(existing.id, TV, { quiet: true })
      id = existing.id
    } else id = relicRuntime.media.play(mediaId, TV).id
    relicRuntime.media.resume(id)
    setScreen({ kind: 'player', sessionId: id })
  }

  const grid = (title: string, items: Tile[]) => {
    setFocus(0)
    setScreen({ kind: 'grid', title, items })
  }

  const tiles: Tile[] = (() => {
    const list: Tile[] = []
    tvWins.forEach((w) => {
      const from = sessions.find((s) => s.id === w.sessionId)?.history.slice(-2)[0]?.deviceId
      list.push({ id: w.id, label: getApp(w.appId)?.name.toUpperCase() ?? w.title, sub: `SESSION · FROM ${from?.replace('relic-', '').toUpperCase() ?? 'MESH'}`, art: 'render', icon: getApp(w.appId)?.icon, action: () => setScreen({ kind: 'app', windowId: w.id }) })
    })
    if (video) list.push({ id: 'cw', label: 'CONTINUE WATCHING', short: 'CONTINUE', sub: `${getMedia(video.mediaId)?.title.toUpperCase()} · ${fmtTime(video.position ?? 0)}`, art: getMedia(video.mediaId)?.art ?? 'duel', action: () => playHere(video.mediaId!) })
    const mk = (kind: string) => mediaLibrary.filter((m) => m.kind === kind || (kind === 'film' && m.kind === 'series')).map((m) => ({ id: m.id, label: m.title.toUpperCase(), sub: m.subtitle.toUpperCase(), art: m.art, action: () => (kind === 'game' ? void relicRuntime.apps.launch('steam', { deviceId: TV }) : playHere(m.id)) }))
    list.push(
      { id: 'movies', label: 'MOVIES', art: 'spire', action: () => grid('MOVIES', mk('film')) },
      { id: 'tv', label: 'TV', art: 'city', action: () => grid('LIVE TV', mk('channel')) },
      { id: 'games', label: 'GAMES', art: 'corridor', action: () => grid('GAMES', mk('game')) },
      { id: 'music', label: 'MUSIC', art: 'eclipse', action: () => grid('MUSIC', mk('track')) },
      {
        id: 'apps',
        label: 'APPS',
        art: 'grid',
        action: () =>
          grid(
            'APPS',
            appRegistry.filter((a) => a.supportedDevices.includes('tv') && !['viewer', 'player', 'apps'].includes(a.id)).map((a) => ({ id: a.id, label: a.name.toUpperCase(), sub: a.runtime.toUpperCase(), art: 'topo', icon: a.icon, action: () => void relicRuntime.apps.launch(a.id, { deviceId: TV }).then((id) => id && setScreen({ kind: 'app', windowId: id })) })),
          ),
      },
    )
    return list
  })()

  const items = screen.kind === 'grid' ? screen.items : tiles
  const cols = screen.kind === 'grid' ? 4 : items.length

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useOS.getState().commandOpen) return
      if (screen.kind === 'player' || screen.kind === 'app') {
        if (e.key === 'Escape' || e.key === 'Backspace') {
          e.preventDefault()
          setScreen({ kind: 'home' })
        }
        if (screen.kind === 'player' && (e.key === 'Enter' || e.key === ' ')) relicRuntime.media.toggle(screen.sessionId)
        if (screen.kind === 'player' && e.key === 'ArrowRight') relicRuntime.media.seek(screen.sessionId, (sessions.find((s) => s.id === screen.sessionId)?.position ?? 0) + 30)
        if (screen.kind === 'player' && e.key === 'ArrowLeft') relicRuntime.media.seek(screen.sessionId, (sessions.find((s) => s.id === screen.sessionId)?.position ?? 0) - 30)
        return
      }
      const n = items.length
      if (e.key === 'ArrowRight') setFocus((f) => Math.min(n - 1, f + 1))
      if (e.key === 'ArrowLeft') setFocus((f) => Math.max(0, f - 1))
      if (e.key === 'ArrowDown') setFocus((f) => Math.min(n - 1, f + cols))
      if (e.key === 'ArrowUp') setFocus((f) => Math.max(0, f - cols))
      if (e.key === 'Enter') items[focus]?.action()
      if ((e.key === 'Escape' || e.key === 'Backspace') && screen.kind === 'grid') {
        e.preventDefault()
        setFocus(0)
        setScreen({ kind: 'home' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [screen, items, focus, cols, sessions])

  const hero = items[focus] ?? items[0]

  return (
    <div className="relative h-full w-full overflow-clip bg-void">
      <AnimatePresence mode="wait">
        {screen.kind === 'player' && (
          <motion.div key="player" className="absolute inset-0 z-30 bg-void" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Player win={{ id: 'tv-player', appId: 'player', title: '', deviceId: TV, x: 0, y: 0, width: 0, height: 0, z: 0, minimized: false, maximized: true, focused: true, sessionId: screen.sessionId }} tv />
            <TVHint text="ENTER PLAY/PAUSE · ← → SEEK · ESC BACK" />
          </motion.div>
        )}
        {screen.kind === 'app' && (() => {
          const w = tvWins.find((x) => x.id === screen.windowId)
          if (!w) return null
          const from = sessions.find((s) => s.id === w.sessionId)?.history.slice(-2)[0]?.deviceId
          return (
            <motion.div key="app" className="absolute inset-0 z-30 flex flex-col bg-void" initial={{ opacity: 0, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
              <div className="flex items-center gap-4 border-b hair bg-void px-10 py-4">
                <AppIcon id={w.appId} size={36} live />
                <span className="text-[14px] tracking-[0.18em] font-semibold text-bone">{getApp(w.appId)?.name.toUpperCase()}</span>
                <span className="label-sm">SESSION CONTINUED FROM {from?.replace('relic-', 'RELIC ').toUpperCase()} · STATE SYNCHRONIZED</span>
                <span className="label-sm ml-auto text-smoke">ESC · RELIC TV HOME</span>
                <span className="label-sm flex items-center gap-2"><span className="dot pulse" /> ON RELIC TV</span>
              </div>
              <div className="relative min-h-0 flex-1">
                <AppSurface win={w} tv />
              </div>
            </motion.div>
          )
        })()}
      </AnimatePresence>

      {/* hero backdrop */}
      <AnimatePresence mode="wait">
        <motion.div key={hero?.id} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
          <Art variant={hero?.art ?? 'horizon'} seed={focus + 3} className="h-full w-full" />
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-t from-void via-void/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-void/70 via-transparent to-transparent" />
      <div className="grain" />

      <div className="relative flex h-full flex-col px-[5vw] pb-[5vh] pt-[4vh]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Wordmark size={18} />
            <span className="label text-ash">RELIC TV · LIVING ROOM</span>
          </div>
          <div className="flex items-center gap-6">
            <DeviceSwitcher />
            <span className="num text-[18px] tracking-[0.1em] text-bone">{fmtClock(now)}</span>
          </div>
        </div>

        <div className="mt-auto">
          <div className="label text-red">{screen.kind === 'grid' ? screen.title : 'RELIC TV'}</div>
          <div className="mt-3 text-[clamp(34px,5vw,72px)] font-light leading-none tracking-[0.12em] text-bone">{hero?.label}</div>
          {hero?.sub && <div className="mt-4 text-[clamp(12px,1.2vw,16px)] tracking-[0.14em] font-semibold text-ash">{hero.sub}</div>}
        </div>

        <div className={`mt-[5vh] grid gap-[1.4vw] ${screen.kind === 'grid' ? 'grid-cols-4' : ''}`} style={screen.kind === 'grid' ? undefined : { gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
          {items.map((t, i) => {
            const on = i === focus
            return (
              <motion.button
                key={t.id}
                onClick={() => (on ? t.action() : setFocus(i))}
                onMouseEnter={() => setFocus(i)}
                animate={{ scale: on ? 1.06 : 1, y: on ? -6 : 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                className={`relative aspect-video overflow-hidden border text-left ${on ? 'z-10 border-signal shadow-[0_0_40px_rgb(var(--acc-1)/0.35)]' : 'border-[var(--line-soft)]'}`}
              >
                <Art variant={t.art} seed={i + 5} className="absolute inset-0 h-full w-full" />
                <div className="absolute inset-0 bg-gradient-to-t from-void via-void/30 to-transparent" />
                {t.icon && <Icon name={t.icon} size={22} className="absolute right-3 top-3 text-bone/80" />}
                <div className="absolute bottom-[8%] left-[7%] right-[7%]">
                  <div className={`truncate text-[clamp(10px,1vw,15px)] tracking-[0.15em] font-semibold ${on ? 'text-bone' : 'text-ash'}`}>{t.short ?? t.label}</div>
                </div>
              </motion.button>
            )
          })}
        </div>
        <div className="label-sm mt-[3vh] text-smoke">← → ↑ ↓ NAVIGATE · ENTER SELECT · ESC BACK · ALT T EXIT TV · TYPE TO ASK</div>
      </div>
    </div>
  )
}

function TVHint({ text }: { text: string }) {
  return <div className="label-sm pointer-events-none absolute bottom-4 right-6 z-20 text-smoke">{text}</div>
}
