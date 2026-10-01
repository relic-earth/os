import { motion } from 'framer-motion'
import { Minus, Plus } from 'lucide-react'
import { useOS } from '../../runtime/store'
import { relicRuntime } from '../../runtime/relicRuntime'
import { Art } from '../../../ui/Art'
import { Glyph } from '../../../ui/AppIcon'
import { fmtClock, fmtDate, useMesh, useNow, useWindowFocus } from '../../../ui/primitives'
import { HudReactor } from '../../../ui/HudReactor'
import { ContinuityActions } from '../Continuity'
import { fmtAgo } from '../../files/service'
import { fmtTime, getMedia } from '../../media/library'

/**
 * HOME — the time, one field to ask Claude, and four quiet widgets.
 * Typing anywhere opens the prompt; the field is the visible way in.
 */
export function Home({ compact }: { compact?: boolean }) {
  const now = useNow(15_000)
  const hasFocus = useWindowFocus()
  const hour = new Date(now).getHours()
  const greeting = hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-[1040px] flex-col px-6 pb-6 pt-[3vh]">
        <motion.div initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }} className="relative mx-auto flex h-[440px] w-full items-center justify-center">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <HudReactor size={440} />
          </div>
          <div className="relative text-center">
            <div className="num text-[clamp(72px,8vw,112px)] font-semibold leading-none tracking-[-0.01em] text-bone [text-shadow:0_0_40px_rgba(255,58,64,0.55),0_0_2px_rgba(255,255,255,0.6)]">{fmtClock(now).replace(/ (AM|PM)/, '')}</div>
            <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.34em] text-[rgba(216,179,122,0.85)]">{fmtDate(now)}</div>
            <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.34em] text-smoke">{greeting}</div>
            <div className="mt-5 h-4">{!hasFocus ? <span className="pulse text-[10px] font-semibold tracking-[0.3em] text-signal">CLICK ANYWHERE, THEN TYPE</span> : <span className="text-[10px] font-semibold tracking-[0.3em] text-soot">TYPE TO COMMAND</span>}</div>
          </div>
        </motion.div>

        <div className={`mt-auto grid gap-3 pt-14 ${compact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4'}`}>
          <NowPlayingWidget />
          <ClimateWidget />
          <DevicesWidget />
          <RecentWidget />
        </div>
      </div>
    </div>
  )
}

function Widget({ title, children, onClick }: { title: string; children: React.ReactNode; onClick?: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6, ease: [0.2, 0, 0, 1] }} className="panel hud-target scan-hover flex min-h-[184px] min-w-0 flex-col p-5 hover:-translate-y-1 hover:shadow-[inset_0_1px_0_rgba(216,179,122,0.2),0_24px_50px_rgba(0,0,0,0.6),0_0_40px_rgba(200,24,32,0.25)]">
      <button onClick={onClick} disabled={!onClick} className="label hud-target mb-4 self-start enabled:hover:text-bone">
        {title}
      </button>
      {children}
    </motion.div>
  )
}

function NowPlayingWidget() {
  const video = useOS((s) => s.sessions.filter((x) => x.mediaId && getMedia(x.mediaId)?.kind !== 'track').sort((a, b) => b.updatedAt - a.updatedAt)[0])
  const device = useOS((s) => s.devices.find((d) => d.id === video?.deviceId))
  const m = getMedia(video?.mediaId)
  if (!video || !m) return <Widget title="NOW PLAYING"><div className="text-[13px] text-smoke">Nothing playing</div></Widget>
  return (
    <Widget title="NOW PLAYING" onClick={() => void relicRuntime.apps.launch('player', { props: { mediaId: m.id }, title: m.title })}>
      <div className="flex gap-3">
        <div className="h-12 w-[72px] shrink-0 overflow-hidden rounded-md"><Art variant={m.art} className="h-full w-full" /></div>
        <div className="min-w-0">
          <div className="truncate text-[16px] font-semibold uppercase tracking-[0.1em] text-bone">{m.title}</div>
          <div className="text-[12px] font-semibold text-smoke">{video.state.playing ? 'Playing' : 'Paused'} · {device?.name}</div>
        </div>
      </div>
      <div className="bar mt-3"><i style={{ width: `${((video.position ?? 0) / m.duration) * 100}%` }} /></div>
      <div className="num mt-1.5 text-[11px] font-semibold text-smoke">{fmtTime(video.position ?? 0)} / {fmtTime(m.duration)}</div>
      <div className="mt-auto pt-3"><ContinuityActions sessionId={video.id} size="sm" only={['relic-tv', 'relic-phone', 'relic-car', 'relic-laptop']} /></div>
    </Widget>
  )
}

function ClimateWidget() {
  const t = useOS((s) => s.thermostat)
  return (
    <Widget title="HOME" onClick={() => relicRuntime.shell.setProfile('relic-thermostat')}>
      <div className="flex items-end justify-between">
        <div>
          <div className="num text-[44px] font-semibold leading-none text-bone">{t.target}°</div>
          <div className="mt-2 text-[12px] font-semibold text-smoke">Indoor {t.indoor}° · {t.mode === 'OFF' ? 'Off' : t.indoor < t.target ? 'Heating' : t.indoor > t.target ? 'Cooling' : 'Holding'}</div>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => relicRuntime.home.thermostat.nudge(-1, 'RELIC HOME')} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.08] text-bone hover:bg-white/15" aria-label="Cooler"><Minus size={14} /></button>
          <button onClick={() => relicRuntime.home.thermostat.nudge(1, 'RELIC HOME')} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.08] text-bone hover:bg-white/15" aria-label="Warmer"><Plus size={14} /></button>
        </div>
      </div>
    </Widget>
  )
}

function DevicesWidget() {
  const { devices, online, total } = useMesh()
  return (
    <Widget title="DEVICES" onClick={() => void relicRuntime.apps.launch('devices')}>
      <div className="flex items-baseline gap-2"><span className="num text-[44px] font-semibold leading-none text-bone">{online}</span><span className="text-[13px] font-semibold text-smoke">of {total} online</span></div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {devices.map((d) => (
          <div key={d.id} title={d.name} className={`flex h-10 items-center justify-center rounded-[12px] ${d.status === 'online' ? 'bg-white/[0.07] text-signal' : 'text-soot'}`}>
            <Glyph id={d.type} size={24} className={d.status === 'online' ? 'drop-shadow-[0_0_5px_rgba(232,36,43,0.7)]' : ''} />
          </div>
        ))}
      </div>
    </Widget>
  )
}

function RecentWidget() {
  useOS((s) => s.memory.recentFiles)
  const recent = relicRuntime.files.recent(3)
  return (
    <Widget title="RECENT" onClick={() => void relicRuntime.apps.launch('files')}>
      <div className="space-y-2">
        {recent.map((f) => (
          <button key={f.id} onClick={() => { relicRuntime.files.reveal(f.id); void relicRuntime.files.open(f.id) }} className="block w-full min-w-0 text-left">
            <div className="truncate text-[14px] font-semibold text-ash hover:text-bone">{f.name}</div>
            <div className="text-[11px] font-semibold text-smoke">{fmtAgo(f.modified).toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</div>
          </button>
        ))}
      </div>
    </Widget>
  )
}
