import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react'
import type { RelicWindow } from '../sdk/types'
import { useOS } from '../os/runtime/store'
import { relicRuntime } from '../os/runtime/relicRuntime'
import { getMedia, fmtTime } from '../os/media/library'
import { Art } from '../ui/Art'
import { Range } from '../ui/primitives'
import { ContinuityActions } from '../os/shell/Continuity'

/** RELIC PLAYER — a view onto a media session, wherever it is playing. */
export function Player({ win, tv }: { win: RelicWindow; tv?: boolean }) {
  const sess = useOS((s) => s.sessions.find((x) => x.id === win.sessionId))
  const device = useOS((s) => s.devices.find((d) => d.id === sess?.deviceId))
  const volume = useOS((s) => s.volume)
  const m = getMedia(sess?.mediaId)
  if (!sess || !m) return <div className="label-sm p-8">NO MEDIA</div>
  const remote = sess.deviceId !== win.deviceId && !tv
  const pct = ((sess.position ?? 0) / m.duration) * 100
  return (
    <div className="relative flex h-full flex-col bg-void">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <Art variant={m.art} className={`absolute inset-0 h-full w-full transition-all duration-700 ${remote ? 'scale-105 opacity-30 blur-[2px]' : sess.state.playing ? 'opacity-100' : 'opacity-70'}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-void via-transparent to-transparent" />
        {remote && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="label text-red">PLAYING ON</div>
            <div className="mt-2 text-[26px] tracking-[0.18em] font-semibold text-bone">{device?.name.toUpperCase()}</div>
            <div className="label-sm mt-2">{device?.location.toUpperCase()} · THIS SCREEN IS A REMOTE</div>
          </div>
        )}
        <div className="absolute bottom-5 left-6">
          <div className="label-sm text-red">{m.kind === 'film' ? 'FEATURE' : m.kind.toUpperCase()} · {m.year ?? ''}</div>
          <div className={`${tv ? 'text-[44px]' : 'text-[26px]'} mt-1 font-light tracking-[0.1em] text-bone`}>{m.title}</div>
          <div className="text-[12px] tracking-[0.1em] text-ash">{m.subtitle}</div>
        </div>
      </div>
      <div className="border-t hair px-6 py-4">
        <div
          className="bar h-[3px] cursor-pointer"
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            relicRuntime.media.seek(sess.id, ((e.clientX - r.left) / r.width) * m.duration)
          }}
        >
          <i style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-3 flex items-center gap-5">
          <span className="num w-16 text-[11px] text-bone">{fmtTime(sess.position ?? 0)}</span>
          <button className="text-ash hover:text-bone" onClick={() => relicRuntime.media.seek(sess.id, (sess.position ?? 0) - 30)} aria-label="Back 30 seconds"><SkipBack size={15} strokeWidth={1.25} /></button>
          <button className="flex h-9 w-9 items-center justify-center border border-red/70 text-bone hover:bg-blood/50 hover:shadow-[var(--glow)]" onClick={() => relicRuntime.media.toggle(sess.id)} aria-label={sess.state.playing ? 'Pause' : 'Play'}>
            {sess.state.playing ? <Pause size={14} strokeWidth={1.5} /> : <Play size={14} strokeWidth={1.5} />}
          </button>
          <button className="text-ash hover:text-bone" onClick={() => relicRuntime.media.seek(sess.id, (sess.position ?? 0) + 30)} aria-label="Forward 30 seconds"><SkipForward size={15} strokeWidth={1.25} /></button>
          <span className="num text-[11px] text-smoke">-{fmtTime(m.duration - (sess.position ?? 0))}</span>
          {!tv && (
            <div className="ml-auto flex items-center gap-3">
              <Volume2 size={13} className="text-ash" strokeWidth={1.25} />
              <Range value={volume} onChange={(v) => relicRuntime.media.setVolume(v)} className="w-20" label="Volume" />
            </div>
          )}
        </div>
        {!tv && (
          <div className="mt-4 flex items-center gap-3 border-t hair-faint pt-3">
            <span className="label-sm">CONTINUITY</span>
            <ContinuityActions sessionId={sess.id} size="sm" />
          </div>
        )}
      </div>
    </div>
  )
}
