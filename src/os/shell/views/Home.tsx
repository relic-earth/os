import { motion } from 'framer-motion'
import { useOS } from '../../runtime/store'
import { relicRuntime } from '../../runtime/relicRuntime'
import { Art } from '../../../ui/Art'
import { Bar, fmtDate, useMesh, useNow } from '../../../ui/primitives'
import { ClaudeInput } from '../../../apps/claude/ClaudePanel'
import { ContinuityActions, NowWatching } from '../Continuity'
import { fmtAgo } from '../../files/service'
import { getMedia } from '../../media/library'

const TILES = [
  { id: 'movies', label: 'MOVIES', sub: 'CONTINUE · EPISODE III', art: 'duel', go: () => relicRuntime.shell.setSection('movies') },
  { id: 'files', label: 'FILES', sub: 'RELIC HOUSE · UPDATED', art: 'topo', go: () => void relicRuntime.apps.launch('files') },
  { id: 'games', label: 'GAMES', sub: '5 INSTALLED · PROTON', art: 'corridor', go: () => relicRuntime.shell.setSection('games') },
  { id: 'apps', label: 'APPS', sub: 'WINDOWS · LINUX · RELIC', art: 'grid', go: () => void relicRuntime.apps.launch('apps') },
]

/** HOME — “What do you want to do?” */
export function Home({ compact }: { compact?: boolean }) {
  const now = useNow(30_000)
  const hour = new Date(now).getHours()
  const greeting = hour < 5 ? 'GOOD NIGHT' : hour < 12 ? 'GOOD MORNING' : hour < 18 ? 'GOOD AFTERNOON' : 'GOOD EVENING'
  const video = useOS((s) => s.sessions.filter((x) => x.mediaId && getMedia(x.mediaId)?.kind !== 'track').sort((a, b) => b.updatedAt - a.updatedAt)[0])

  return (
    <div className="flex h-full gap-6 overflow-y-auto px-8 pb-24 pt-8">
      <div className="min-w-0 flex-1">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}>
          <div className="label">{greeting} · {fmtDate(now)}</div>
          <h1 className="mt-4 text-[clamp(26px,3.2vw,40px)] font-light tracking-[0.03em] text-bone">What do you want to do?</h1>
          <div className="mt-6 max-w-[620px]">
            <ClaudeInput size="lg" placeholder="ASK CLAUDE — OPEN, FIND, SEND, PLAY, CHANGE…" onSubmitted={() => relicRuntime.shell.openCommand()} />
          </div>
        </motion.div>

        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {TILES.map((t, i) => (
            <motion.button
              key={t.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + i * 0.07, duration: 0.55, ease: [0.2, 0, 0, 1] }}
              onClick={t.go}
              className="group relative aspect-[4/5] max-h-[300px] w-full overflow-hidden border border-[var(--line-soft)] text-left transition-all duration-500 hover:border-red hover:shadow-[0_0_30px_rgba(179,20,27,0.25)]"
            >
              <Art variant={t.art} seed={i + 3} className="absolute inset-0 h-full w-full transition-transform duration-[1.4s] ease-out group-hover:scale-[1.05]" />
              <div className="absolute inset-0 bg-gradient-to-t from-void via-void/30 to-transparent" />
              <span className="absolute left-0 top-0 h-px w-0 bg-signal transition-all duration-500 group-hover:w-full" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="text-[14px] tracking-[0.46em] text-bone">{t.label}</div>
                <div className="label-sm mt-1.5 text-ash">{t.sub}</div>
              </div>
              <span className="num absolute right-3 top-3 text-[9px] text-soot">0{i + 1}</span>
            </motion.button>
          ))}
        </div>

        {video && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="panel ticks mt-6 flex flex-wrap items-center gap-6 p-5">
            <div className="h-[84px] w-[150px] shrink-0 overflow-hidden border hair">
              <Art variant={getMedia(video.mediaId)?.art ?? 'duel'} className="h-full w-full" />
            </div>
            <div className="min-w-[220px] flex-1">
              <NowWatching sessionId={video.id} />
            </div>
            <div className="flex flex-col gap-2">
              <span className="label-sm">CONTINUITY · ONE SESSION, ANY SCREEN</span>
              <ContinuityActions sessionId={video.id} only={['relic-tv', 'relic-phone', 'relic-car', 'relic-laptop']} />
              <button className="label-sm self-start hover:text-bone" onClick={() => void relicRuntime.apps.launch('player', { props: { mediaId: video.mediaId }, title: getMedia(video.mediaId)?.title })}>
                OPEN PLAYER →
              </button>
            </div>
          </motion.div>
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
    <motion.aside initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25, duration: 0.6 }} className="hidden w-[270px] shrink-0 flex-col gap-4 lg:flex">
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
    </motion.aside>
  )
}
