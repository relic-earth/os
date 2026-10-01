import { motion } from 'framer-motion'
import { Minus, Plus } from 'lucide-react'
import { useOS } from '../../runtime/store'
import { relicRuntime } from '../../runtime/relicRuntime'
import { Art } from '../../../ui/Art'
import { Glyph } from '../../../ui/AppIcon'
import { fmtDate, useMesh, useNow, useWindowFocus } from '../../../ui/primitives'
import { HudReactor } from '../../../ui/HudReactor'
import { ContinuityActions } from '../Continuity'
import { fmtAgo } from '../../files/service'
import { fmtTime, getMedia } from '../../media/library'

/**
 * HOME — the cockpit. The reactor and the time at the centre; four MFDs
 * flank it, two to a side. There is no field: type and the prompt ignites.
 */
export function Home({ compact }: { compact?: boolean }) {
  const now = useNow(1000)
  const hasFocus = useWindowFocus()
  const hour = new Date(now).getHours()
  const greeting = hour < 5 ? 'Night watch' : hour < 12 ? 'Morning watch' : hour < 18 ? 'Afternoon watch' : 'Evening watch'
  const t = new Date(now)
  const hh = String(t.getHours() % 12 || 12)
  const mm = String(t.getMinutes()).padStart(2, '0')

  const reactor = (
    <motion.div initial={{ opacity: 0, scale: 0.86, filter: 'blur(12px)' }} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} className="relative flex h-[480px] w-[480px] shrink-0 items-center justify-center">
      <div className="absolute inset-0">
        <HudReactor size={480} callouts={false} />
      </div>
      <div className="relative text-center">
        <div className="font-mono text-[10px] tracking-[0.4em] text-[rgba(176,138,82,0.9)]">{fmtDate(now)}</div>
        <div className="mt-3 font-display text-[clamp(64px,6.4vw,92px)] leading-none tracking-[0.02em] text-white [text-shadow:0_0_30px_rgba(255,58,64,0.8),0_0_2px_#fff]">
          {hh}<span className="pulse text-signal">:</span>{mm}
        </div>
        <div className="mt-3 font-mono text-[10px] tracking-[0.4em] text-smoke">{greeting.toUpperCase()}</div>
        <div className="mt-6 h-4">{!hasFocus ? <span className="pulse font-mono text-[10px] tracking-[0.3em] text-signal">CLICK ANYWHERE, THEN TYPE</span> : <span className="font-mono text-[10px] tracking-[0.3em] text-[rgba(255,58,64,0.55)]">▸ TYPE TO COMMAND</span>}</div>
      </div>
    </motion.div>
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

/** An MFD: a chamfered plate with a coded header strip. */
function Widget({ title, n, side, children, onClick }: { title: string; n: number; side?: 'l' | 'r'; children: React.ReactNode; onClick?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: side === 'l' ? -40 : side === 'r' ? 40 : 0, clipPath: 'inset(0 0 100% 0)' }}
      animate={{ opacity: 1, x: 0, clipPath: 'inset(0 0 0% 0)' }}
      transition={{ delay: 0.3 + n * 0.12, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="panel hud-target scan-hover flex min-h-[176px] min-w-0 flex-col transition-transform duration-300 hover:-translate-y-1"
    >
      <button onClick={onClick} disabled={!onClick} className="flex h-8 shrink-0 items-center gap-2 border-b border-[rgba(255,58,64,0.2)] bg-[linear-gradient(90deg,rgba(255,58,64,0.18),transparent_70%)] pl-5 pr-3 text-left enabled:hover:bg-[rgba(255,58,64,0.22)]">
        <span className="font-mono text-[9px] tracking-[0.1em] text-[rgba(176,138,82,0.9)]">MFD-{String(n).padStart(2, '0')}</span>
        <span className="h-px w-3 bg-[rgba(255,58,64,0.6)]" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white">{title}</span>
        <span className="ml-auto h-1.5 w-1.5 rotate-45 bg-signal shadow-[0_0_6px_#ff3a40]" />
      </button>
      <div className="flex min-h-0 flex-1 flex-col p-5 pt-4">{children}</div>
    </motion.div>
  )
}

function NowPlayingWidget({ n, side }: { n: number; side?: 'l' | 'r' }) {
  const video = useOS((s) => s.sessions.filter((x) => x.mediaId && getMedia(x.mediaId)?.kind !== 'track').sort((a, b) => b.updatedAt - a.updatedAt)[0])
  const device = useOS((s) => s.devices.find((d) => d.id === video?.deviceId))
  const m = getMedia(video?.mediaId)
  if (!video || !m) return <Widget n={n} side={side} title="NOW PLAYING"><div className="text-[13px] text-smoke">Nothing playing</div></Widget>
  return (
    <Widget n={n} side={side} title="NOW PLAYING" onClick={() => void relicRuntime.apps.launch('player', { props: { mediaId: m.id }, title: m.title })}>
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

function ClimateWidget({ n, side }: { n: number; side?: 'l' | 'r' }) {
  const t = useOS((s) => s.thermostat)
  return (
    <Widget n={n} side={side} title="HOME" onClick={() => relicRuntime.shell.setProfile('relic-thermostat')}>
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

function DevicesWidget({ n, side }: { n: number; side?: 'l' | 'r' }) {
  const { devices, online, total } = useMesh()
  return (
    <Widget n={n} side={side} title="DEVICES" onClick={() => void relicRuntime.apps.launch('devices')}>
      <div className="flex items-baseline gap-2"><span className="num text-[44px] font-semibold leading-none text-bone">{online}</span><span className="text-[13px] font-semibold text-smoke">of {total} online</span></div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {devices.map((d) => (
          <div key={d.id} title={d.name} className={`flex h-10 items-center justify-center rounded-[2px] ${d.status === 'online' ? 'bg-white/[0.07] text-signal' : 'text-soot'}`}>
            <Glyph id={d.type} size={24} className={d.status === 'online' ? 'drop-shadow-[0_0_5px_rgba(232,36,43,0.7)]' : ''} />
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
    <Widget n={n} side={side} title="RECENT" onClick={() => void relicRuntime.apps.launch('files')}>
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
