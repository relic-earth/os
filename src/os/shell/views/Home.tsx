import { motion } from 'framer-motion'
import { useOS } from '../../runtime/store'
import { relicRuntime } from '../../runtime/relicRuntime'
import { Art } from '../../../ui/Art'
import { Bar, fmtClock, fmtDate, useMesh, useNow } from '../../../ui/primitives'
import { ContinuityActions, NowWatching } from '../Continuity'
import { fmtAgo } from '../../files/service'
import { getMedia } from '../../media/library'

const TILES = [
  { id: 'movies', label: 'MOVIES', sub: 'CONTINUE · EPISODE III', art: 'duel', go: () => relicRuntime.shell.setSection('movies') },
  { id: 'files', label: 'FILES', sub: 'RELIC HOUSE · UPDATED', art: 'topo', go: () => void relicRuntime.apps.launch('files') },
  { id: 'games', label: 'GAMES', sub: '5 INSTALLED · PROTON', art: 'corridor', go: () => relicRuntime.shell.setSection('games') },
  { id: 'apps', label: 'APPS', sub: 'WINDOWS · LINUX · RELIC', art: 'grid', go: () => void relicRuntime.apps.launch('apps') },
]

/**
 * HOME — almost nothing at rest: the time, and an invitation to type.
 * Everything else waits in the dark until the pointer reaches its area.
 */
export function Home({ compact }: { compact?: boolean }) {
  const now = useNow(15_000)
  const hour = new Date(now).getHours()
  const greeting = hour < 5 ? 'GOOD NIGHT' : hour < 12 ? 'GOOD MORNING' : hour < 18 ? 'GOOD AFTERNOON' : 'GOOD EVENING'
  const video = useOS((s) => s.sessions.filter((x) => x.mediaId && getMedia(x.mediaId)?.kind !== 'track').sort((a, b) => b.updatedAt - a.updatedAt)[0])

  return (
    <div className="relative flex h-full flex-col overflow-y-auto">
      <div className="flex min-h-[46%] flex-1 flex-col items-center justify-center px-8 text-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.4, ease: [0.2, 0, 0, 1] }}>
          <div className="num text-[clamp(56px,8.5vw,128px)] font-extralight leading-none tracking-[0.02em] text-bone/90">
            {fmtClock(now).replace(/ (AM|PM)/, '')}
          </div>
          <div className="label mt-5 text-ash/70">{greeting} · {fmtDate(now)}</div>
        </motion.div>
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 1.2 }}
          onClick={() => relicRuntime.shell.openCommand()}
          className="mt-14 flex items-center gap-1 text-[10px] tracking-[0.5em] text-smoke transition-colors hover:text-ash"
        >
          START TYPING
          <span className="caret !h-[10px] !w-[5px] opacity-70" />
        </motion.button>
      </div>

      <div className="recede mx-auto w-full max-w-[1080px] px-8 pb-28 pt-10">
        <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
          {TILES.map((t, i) => (
            <button
              key={t.id}
              onClick={t.go}
              className="group relative aspect-[16/10] w-full overflow-hidden border border-[var(--line-soft)] text-left transition-all duration-500 hover:border-red hover:shadow-[0_0_30px_rgba(179,20,27,0.25)]"
            >
              <Art variant={t.art} seed={i + 3} className="absolute inset-0 h-full w-full transition-transform duration-[1.4s] ease-out group-hover:scale-[1.05]" />
              <div className="absolute inset-0 bg-gradient-to-t from-void via-void/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3.5">
                <div className="text-[12px] tracking-[0.46em] text-bone">{t.label}</div>
                <div className="label-sm mt-1 text-ash">{t.sub}</div>
              </div>
            </button>
          ))}
        </div>
        {video && (
          <div className="mt-3 flex flex-wrap items-center gap-6 border border-[var(--line-soft)] bg-void/60 px-5 py-4">
            <div className="min-w-[220px] flex-1">
              <NowWatching sessionId={video.id} />
            </div>
            <ContinuityActions sessionId={video.id} only={['relic-tv', 'relic-phone', 'relic-car', 'relic-laptop']} />
          </div>
        )}
      </div>

      {!compact && <StatusColumn />}
    </div>
  )
}

function StatusColumn() {
  const { devices, online, total } = useMesh()
  const cloud = useOS((s) => s.cloud)
  const thermo = useOS((s) => s.thermostat)
  const laptop = devices.find((d) => d.id === 'relic-laptop')!
  const recent = relicRuntime.files.recent(4)
  useOS((s) => s.memory.recentFiles)
  return (
    <aside className="recede absolute right-6 top-6 hidden w-[260px] flex-col gap-3 pb-6 pl-10 lg:flex">
      <div className="panel ticks p-5">
        <div className="label-sm text-red">RELIC NETWORK</div>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-[22px] font-light tracking-[0.12em] text-bone">{total} DEVICES</span>
          <span className="text-[11px] tracking-[0.24em] text-ash">{online} ONLINE</span>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1">
          {devices.map((d) => (
            <span key={d.id} title={d.name} className={`h-[3px] ${d.status === 'online' ? 'bg-red shadow-[0_0_6px_rgba(232,36,43,0.7)]' : d.status === 'connecting' ? 'pulse bg-red/60' : 'bg-soot'}`} />
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t hair pt-3">
          <span className="label-sm">{cloud.status === 'connected' ? 'SYNC COMPLETE' : 'LOCAL ONLY · QUEUED'}</span>
          <span className="label-sm">{fmtAgo(cloud.lastSync)}</span>
        </div>
      </div>

      <div className="panel p-5">
        <div className="label-sm">THIS COMPUTER</div>
        <div className="mt-3 space-y-3">
          {[
            ['CPU', Number(laptop.state.cpu)],
            ['MEMORY', Number(laptop.state.memory)],
            ['STORAGE', Number(laptop.state.storageUsed) / Number(laptop.state.storageTotal)],
          ].map(([k, v]) => (
            <div key={k as string}>
              <div className="flex justify-between"><span className="label-sm">{k as string}</span><span className="num text-[10px] text-ash">{Math.round((v as number) * 100)}%</span></div>
              <Bar value={v as number} className="mt-1.5" />
            </div>
          ))}
        </div>
      </div>

      <button className="panel p-5 text-left transition-colors hover:border-[var(--line)]" onClick={() => relicRuntime.shell.setProfile('relic-thermostat')}>
        <div className="flex items-center justify-between">
          <span className="label-sm">HOME · CLIMATE</span>
          <span className="label-sm">{thermo.mode}</span>
        </div>
        <div className="mt-2 flex items-baseline gap-3">
          <span className="num text-[30px] font-light text-bone">{thermo.target}°</span>
          <span className="label-sm">INDOOR {thermo.indoor}°</span>
        </div>
      </button>

      <div className="panel p-5">
        <div className="label-sm mb-2">RECENT</div>
        {recent.map((f) => (
          <button key={f.id} onClick={() => { relicRuntime.files.reveal(f.id); void relicRuntime.files.open(f.id) }} className="flex w-full items-baseline justify-between gap-3 py-1.5 text-left hover:text-bone">
            <span className="truncate text-[11px] text-bone/85">{f.name}</span>
            <span className="label-sm shrink-0 text-soot">{fmtAgo(f.modified)}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}
