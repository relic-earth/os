import { motion } from 'framer-motion'
import { Play } from 'lucide-react'
import { useOS } from '../../runtime/store'
import { relicRuntime } from '../../runtime/relicRuntime'
import { mediaLibrary, getMedia, fmtTime } from '../../media/library'
import { Art } from '../../../ui/Art'
import { SectionHead } from '../../../ui/primitives'
import { ContinuityActions } from '../Continuity'

const openPlayer = (mediaId: string) => void relicRuntime.apps.launch('player', { props: { mediaId }, title: getMedia(mediaId)?.title })

function Poster({ id, i, wide }: { id: string; i: number; wide?: boolean }) {
  const m = getMedia(id)!
  const sess = useOS((s) => s.sessions.find((x) => x.mediaId === id))
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05, duration: 0.45 }}
      onClick={() => openPlayer(id)}
      className={`group relative shrink-0 overflow-hidden border hair text-left transition-all duration-500 hover:border-red hover:shadow-[0_0_24px_rgba(179,20,27,0.25)] ${wide ? 'aspect-video w-[300px]' : 'aspect-[2/3] w-[170px]'}`}
    >
      <Art variant={m.art} seed={i + 2} className="absolute inset-0 h-full w-full transition-transform duration-[1.2s] group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-void via-transparent to-transparent" />
      <div className="absolute bottom-3 left-3 right-3">
        <div className="text-[11px] tracking-[0.3em] text-bone">{m.title.toUpperCase()}</div>
        <div className="label-sm mt-1">{m.subtitle}</div>
        {sess && m.duration > 0 && <div className="bar mt-2"><i style={{ width: `${((sess.position ?? 0) / m.duration) * 100}%` }} /></div>}
      </div>
    </motion.button>
  )
}

export function Movies() {
  const ep = useOS((s) => s.sessions.find((x) => x.mediaId === 'episode-iii'))
  const m = getMedia('episode-iii')!
  const films = mediaLibrary.filter((x) => x.kind === 'film' || x.kind === 'series')
  return (
    <div className="h-full overflow-y-auto pb-24">
      <div className="relative h-[46vh] min-h-[300px] overflow-hidden border-b hair">
        <Art variant="duel" className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-r from-void via-void/60 to-transparent" />
        <div className="absolute bottom-10 left-10 max-w-[520px]">
          <div className="label text-red">CONTINUE WATCHING</div>
          <div className="mt-3 text-[44px] font-light tracking-[0.1em] text-bone">{m.title}</div>
          <div className="text-[13px] tracking-[0.1em] text-ash">{m.subtitle} · {m.year}</div>
          {ep && (
            <div className="mt-4 flex items-center gap-3">
              <span className="num text-[12px] text-bone">{fmtTime(ep.position ?? 0)}</span>
              <div className="bar w-[200px]"><i style={{ width: `${((ep.position ?? 0) / m.duration) * 100}%` }} /></div>
              <span className="label-sm">{fmtTime(m.duration)}</span>
            </div>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <button className="btn btn-primary" onClick={() => openPlayer('episode-iii')}><Play size={12} /> RESUME</button>
            {ep && <ContinuityActions sessionId={ep.id} only={['relic-tv', 'relic-phone']} />}
          </div>
        </div>
      </div>
      <div className="px-8 pt-8">
        <SectionHead title="FILMS & SERIES" />
        <div className="no-scrollbar mt-4 flex gap-4 overflow-x-auto pb-2">
          {films.map((f, i) => <Poster key={f.id} id={f.id} i={i} />)}
        </div>
      </div>
    </div>
  )
}

export function TVSection() {
  const channels = mediaLibrary.filter((x) => x.kind === 'channel')
  const tv = useOS((s) => s.devices.find((d) => d.id === 'relic-tv'))
  const onTv = useOS((s) => s.sessions.find((x) => x.deviceId === 'relic-tv'))
  return (
    <div className="h-full overflow-y-auto px-8 pb-24 pt-8">
      <div className="flex items-end justify-between">
        <div>
          <div className="label">LIVE TV</div>
          <div className="mt-2 text-[30px] font-light tracking-[0.1em] text-bone">Channels</div>
        </div>
        <div className="panel flex items-center gap-4 px-4 py-3">
          <span className={`dot ${tv?.status === 'online' ? '' : 'dot-off'}`} />
          <div>
            <div className="label-sm">RELIC TV · LIVING ROOM</div>
            <div className="mt-1 text-[10px] tracking-[0.24em] text-bone">{onTv ? relicRuntime.continuity.describe(onTv).toUpperCase() : 'IDLE'}</div>
          </div>
          <button className="btn h-7" onClick={() => relicRuntime.shell.setProfile('relic-tv')}>TV MODE</button>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        {channels.map((c, i) => (
          <button key={c.id} onClick={() => relicRuntime.media.play(c.id, 'relic-tv')} className="group relative aspect-video overflow-hidden border hair text-left hover:border-red">
            <Art variant={c.art} seed={i + 9} className="absolute inset-0 h-full w-full" />
            <div className="absolute inset-0 bg-gradient-to-t from-void to-transparent" />
            <span className="label-sm absolute left-3 top-3 flex items-center gap-1.5 text-bone"><span className="dot pulse" /> LIVE</span>
            <div className="absolute bottom-3 left-3">
              <div className="text-[12px] tracking-[0.3em] text-bone">{c.title.toUpperCase()}</div>
              <div className="label-sm mt-1">{c.subtitle}</div>
            </div>
            <span className="label-sm absolute bottom-3 right-3 opacity-0 transition-opacity group-hover:opacity-100">PLAY ON TV</span>
          </button>
        ))}
      </div>
      <div className="mt-10">
        <SectionHead title="SERIES" />
        <div className="no-scrollbar mt-4 flex gap-4 overflow-x-auto pb-2">
          {mediaLibrary.filter((x) => x.kind === 'series').map((f, i) => <Poster key={f.id} id={f.id} i={i} wide />)}
        </div>
      </div>
    </div>
  )
}

export function Games() {
  const games = mediaLibrary.filter((x) => x.kind === 'game')
  return (
    <div className="h-full overflow-y-auto px-8 pb-24 pt-8">
      <div className="label">LIBRARY</div>
      <div className="mt-2 text-[30px] font-light tracking-[0.1em] text-bone">Games</div>
      <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-3">
        {games.map((g, i) => (
          <motion.button
            key={g.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => void relicRuntime.apps.launch('steam')}
            className="group relative aspect-[16/9] overflow-hidden border hair text-left hover:border-red"
          >
            <Art variant={g.art} seed={i + 4} className="absolute inset-0 h-full w-full transition-transform duration-[1.2s] group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-void via-void/20 to-transparent" />
            <div className="absolute bottom-4 left-4">
              <div className="text-[15px] tracking-[0.36em] text-bone">{g.title.toUpperCase()}</div>
              <div className={`label-sm mt-1.5 ${/proton|wine/i.test(g.subtitle) ? 'text-red' : ''}`}>{g.subtitle.toUpperCase()}</div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
