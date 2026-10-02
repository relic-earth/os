import { motion } from 'framer-motion'
import { Minus, Plus } from 'lucide-react'
import { useOS } from '../../runtime/store'
import { relicRuntime } from '../../runtime/relicRuntime'
import { Art } from '../../../ui/Art'
import { Glyph } from '../../../ui/AppIcon'
import { fmtDate, useMesh, useNow, useWindowFocus } from '../../../ui/primitives'
import { OrbitalRing } from '../../../ui/OrbitalRing'
import { ContinuityActions } from '../Continuity'
import { fmtAgo } from '../../files/service'
import { fmtTime, getMedia } from '../../media/library'

/**
 * HOME — the time, held inside a slowly turning ring; four glass cards
 * flank it, two to a side. There is no field: type and the prompt ignites.
 */
export function Home({ compact }: { compact?: boolean }) {
  const now = useNow(1000)
  const hasFocus = useWindowFocus()
  const hour = new Date(now).getHours()
  const greeting = hour < 5 ? 'Good night' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const t = new Date(now)
  const hh = String(t.getHours() % 12 || 12)
  const mm = String(t.getMinutes()).padStart(2, '0')

  const reactor = (
    <div className="orb-rise relative flex h-[520px] w-[520px] shrink-0 items-center justify-center">
      <div className="absolute inset-0 flex items-center justify-center">
        <OrbitalRing size={520} />
      </div>
      <div className="relative mt-12 text-center">
        <div className="label text-[10px]">{fmtDate(now)}</div>
        <div className="num mt-4 font-display text-[clamp(72px,7vw,104px)] font-extralight leading-none tracking-[0.06em] text-bone [text-shadow:0_0_40px_rgb(var(--acc)/0.35)]">
          {hh}<span className="pulse text-[rgb(var(--acc))]">:</span>{mm}
        </div>
        <div className="mt-[104px] font-display text-[11px] tracking-[0.42em] text-smoke">{greeting.toUpperCase()}</div>
        <div className="mt-5 h-4">{!hasFocus ? <span className="pulse text-[10px] tracking-[0.32em] text-[rgb(var(--acc))]">CLICK ANYWHERE, THEN TYPE</span> : <span className="text-[10px] tracking-[0.32em] text-soot">BEGIN TYPING TO ASK CLAUDE</span>}</div>
      </div>
    </div>
  )

  if (compact)
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[760px] flex-col items-center px-6 pb-8">
          {reactor}
          <div className="grid w-full grid-cols-2 gap-3">
            <NowPlayingWidget n={1} />
            <ClimateWidget n={2} />
            <DevicesWidget n={3} />
            <RecentWidget n={4} />
          </div>
        </div>
      </div>
    )

  return (
    <div className="flex h-full items-center justify-center gap-8 overflow-hidden px-8">
      <div className="flex w-[300px] shrink-0 flex-col gap-4">
        <NowPlayingWidget n={1} side="l" />
        <ClimateWidget n={2} side="l" />
      </div>
      {reactor}
      <div className="flex w-[300px] shrink-0 flex-col gap-4">
        <DevicesWidget n={3} side="r" />
        <RecentWidget n={4} side="r" />
      </div>
    </div>
  )
}

/** A card of smoked glass: a small-caps title, then the content, with air. */
function Widget({ title, n, side, children, onClick }: { title: string; n: number; side?: 'l' | 'r'; children: React.ReactNode; onClick?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: side === 'l' ? -24 : side === 'r' ? 24 : 0, filter: 'blur(10px)' }}
      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      transition={{ delay: 0.4 + n * 0.14, duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      className="panel flex min-h-[176px] min-w-0 flex-col"
    >
      <button onClick={onClick} disabled={!onClick} className="group flex h-11 shrink-0 items-center justify-between px-6 pt-2 text-left">
        <span className="label transition-colors group-enabled:group-hover:text-bone">{title}</span>
        {onClick && <span className="text-[13px] text-soot transition-all duration-500 group-hover:translate-x-0.5 group-hover:text-[rgb(var(--acc))]">→</span>}
      </button>
      <div className="flex min-h-0 flex-1 flex-col px-6 pb-6 pt-2">{children}</div>
    </motion.div>
  )
}

function NowPlayingWidget({ n, side }: { n: number; side?: 'l' | 'r' }) {
  const video = useOS((s) => s.sessions.filter((x) => x.mediaId && getMedia(x.mediaId)?.kind !== 'track').sort((a, b) => b.updatedAt - a.updatedAt)[0])
  const device = useOS((s) => s.devices.find((d) => d.id === video?.deviceId))
  const m = getMedia(video?.mediaId)
  if (!video || !m) return <Widget n={n} side={side} title="Now playing"><div className="text-[13px] text-smoke">Nothing playing</div></Widget>
  return (
    <Widget n={n} side={side} title="Now playing" onClick={() => void relicRuntime.apps.launch('player', { props: { mediaId: m.id }, title: m.title })}>
      <div className="flex gap-3">
        <div className="h-12 w-[72px] shrink-0 overflow-hidden rounded-md"><Art variant={m.art} className="h-full w-full" /></div>
        <div className="min-w-0">
          <div className="truncate font-display text-[15px] tracking-[0.16em] text-bone">{m.title.toUpperCase()}</div>
          <div className="mt-1 text-[12px] text-smoke">{video.state.playing ? 'Playing' : 'Paused'} · {device?.name}</div>
        </div>
      </div>
      <div className="bar mt-3"><i style={{ width: `${((video.position ?? 0) / m.duration) * 100}%` }} /></div>
      <div className="num mt-2 text-[11px] text-smoke">{fmtTime(video.position ?? 0)} / {fmtTime(m.duration)}</div>
      <div className="mt-auto pt-3"><ContinuityActions sessionId={video.id} size="sm" only={['relic-tv', 'relic-phone', 'relic-car', 'relic-laptop']} /></div>
    </Widget>
  )
}

function ClimateWidget({ n, side }: { n: number; side?: 'l' | 'r' }) {
  const t = useOS((s) => s.thermostat)
  return (
    <Widget n={n} side={side} title="Home" onClick={() => relicRuntime.shell.setProfile('relic-thermostat')}>
      <div className="flex items-end justify-between">
        <div>
          <div className="num font-display text-[48px] font-extralight leading-none text-bone">{t.target}°</div>
          <div className="mt-3 text-[12px] text-smoke">Indoor {t.indoor}° · {t.mode === 'OFF' ? 'Off' : t.indoor < t.target ? 'Heating' : t.indoor > t.target ? 'Cooling' : 'Holding'}</div>
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => relicRuntime.home.thermostat.nudge(-1, 'RELIC HOME')} className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--hair-strong)] text-ash hover:border-[rgb(var(--acc)/0.6)] hover:text-white" aria-label="Cooler"><Minus size={13} strokeWidth={1.5} /></button>
          <button onClick={() => relicRuntime.home.thermostat.nudge(1, 'RELIC HOME')} className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--hair-strong)] text-ash hover:border-[rgb(var(--acc)/0.6)] hover:text-white" aria-label="Warmer"><Plus size={13} strokeWidth={1.5} /></button>
        </div>
      </div>
    </Widget>
  )
}

function DevicesWidget({ n, side }: { n: number; side?: 'l' | 'r' }) {
  const { devices, online, total } = useMesh()
  return (
    <Widget n={n} side={side} title="Devices" onClick={() => void relicRuntime.apps.launch('devices')}>
      <div className="flex items-baseline gap-2"><span className="num font-display text-[48px] font-extralight leading-none text-bone">{online}</span><span className="text-[12px] text-smoke">of {total} online</span></div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {devices.map((d) => (
          <div key={d.id} title={d.name} className={`flex h-10 items-center justify-center rounded-md ${d.status === 'online' ? 'text-ash' : 'text-soot opacity-50'}`}>
            <Glyph id={d.type} size={22} />
          </div>
        ))}
      </div>
    </Widget>
  )
}

function RecentWidget({ n, side }: { n: number; side?: 'l' | 'r' }) {
  useOS((s) => s.memory.recentFiles)
  const recent = relicRuntime.files.recent(3)
  return (
    <Widget n={n} side={side} title="Recent" onClick={() => void relicRuntime.apps.launch('files')}>
      <div className="space-y-3">
        {recent.map((f) => (
          <button key={f.id} onClick={() => { relicRuntime.files.reveal(f.id); void relicRuntime.files.open(f.id) }} className="block w-full min-w-0 text-left">
            <div className="truncate text-[14px] text-ash transition-colors hover:text-bone">{f.name}</div>
            <div className="mt-0.5 text-[11px] text-soot">{fmtAgo(f.modified).toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</div>
          </button>
        ))}
      </div>
    </Widget>
  )
}
