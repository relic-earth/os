import { motion } from 'framer-motion'
import { Minus, Plus, Search } from 'lucide-react'
import { useOS } from '../../runtime/store'
import { relicRuntime } from '../../runtime/relicRuntime'
import { Art } from '../../../ui/Art'
import { Icon, deviceIcon } from '../../../ui/Icon'
import { fmtClock, fmtDate, useMesh, useNow, useWindowFocus } from '../../../ui/primitives'
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
      <div className="mx-auto flex min-h-full w-full max-w-[1040px] flex-col px-6 pb-28 pt-[9vh]">
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.2, 0, 0, 1] }} className="text-center">
          <div className="num text-[clamp(64px,9vw,120px)] font-semibold leading-none tracking-[-0.01em] text-bone">{fmtClock(now).replace(/ (AM|PM)/, '')}</div>
          <div className="mt-3 text-[15px] font-semibold text-ash">
            {greeting} · {fmtDate(now).toLowerCase().replace(/(^|\s)\w/g, (c) => c.toUpperCase())}
          </div>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7, ease: [0.2, 0, 0, 1] }}
          onClick={() => relicRuntime.shell.openCommand()}
          className="mx-auto mt-10 flex h-12 w-full max-w-[560px] items-center gap-3 rounded-[14px] border border-[var(--line-soft)] bg-[rgba(30,25,25,0.55)] px-4 text-left backdrop-blur-xl transition-colors hover:border-[rgba(235,229,223,0.18)] hover:bg-[rgba(40,33,33,0.6)]"
        >
          <Search size={17} strokeWidth={2} className="text-signal" />
          <span className="flex-1 text-[16px] font-semibold text-ash">Ask Claude</span>
          <span className="text-[12px] font-semibold text-smoke">or just start typing</span>
        </motion.button>
        <div className="mt-3 h-4 text-center">
          {!hasFocus && <span className="pulse text-[11px] font-semibold tracking-[0.12em] text-signal">CLICK ANYWHERE, THEN TYPE</span>}
        </div>

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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6, ease: [0.2, 0, 0, 1] }} className="panel flex min-h-[176px] min-w-0 flex-col p-4">
      <button onClick={onClick} disabled={!onClick} className="mb-3 self-start text-[11px] font-semibold tracking-[0.14em] text-smoke enabled:hover:text-bone">
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
          <div className="truncate text-[15px] font-semibold text-bone">{m.title}</div>
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
      <div className="text-[15px] font-semibold text-bone">{online} of {total} online</div>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {devices.map((d) => (
          <div key={d.id} title={d.name} className={`flex h-9 items-center justify-center rounded-lg ${d.status === 'online' ? 'bg-white/[0.07] text-bone' : 'text-soot'}`}>
            <Icon name={deviceIcon[d.type]} size={16} strokeWidth={1.5} />
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
            <div className="truncate text-[13px] font-semibold text-bone hover:text-white">{f.name}</div>
            <div className="text-[11px] font-semibold text-smoke">{fmtAgo(f.modified).toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}</div>
          </button>
        ))}
      </div>
    </Widget>
  )
}
