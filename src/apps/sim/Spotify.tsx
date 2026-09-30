import { Play, Pause } from 'lucide-react'
import { useOS } from '../../os/runtime/store'
import { relicRuntime } from '../../os/runtime/relicRuntime'
import { fmtTime, mediaLibrary } from '../../os/media/library'
import { Art } from '../../ui/Art'
import { ContinuityActions } from '../../os/shell/Continuity'

/** Simulated Spotify (Linux) — drives real Relic media sessions. */
export function Spotify() {
  const tracks = mediaLibrary.filter((m) => m.kind === 'track')
  const sessions = useOS((s) => s.sessions)
  const devices = useOS((s) => s.devices)
  const current = sessions.filter((s) => tracks.some((t) => t.id === s.mediaId)).sort((a, b) => Number(b.state.playing) - Number(a.state.playing))[0]
  const cur = tracks.find((t) => t.id === current?.mediaId)
  return (
    <div className="flex h-full flex-col bg-[#0a0909] text-[11px] text-ash" style={{ fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
      <div className="flex min-h-0 flex-1">
        <div className="w-[190px] border-r border-black bg-[#101010] p-3">
          <div className="mb-2 text-bone">Your Library</div>
          {['Film Scores', 'Deep Work', 'Drive · Night', 'Episode III OST'].map((p, i) => (
            <div key={p} className={`py-1 ${i === 3 ? 'text-bone' : ''}`}>{p}</div>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex items-end gap-5">
            <div className="h-28 w-28 border border-black"><Art variant="eclipse" className="h-full w-full" /></div>
            <div>
              <div className="text-[10px] tracking-[0.2em] text-smoke">SOUNDTRACK</div>
              <div className="text-[26px] font-light text-bone">Episode III OST</div>
              <div>John Williams · London Symphony Orchestra</div>
            </div>
          </div>
          <div className="mt-6">
            {tracks.map((t, i) => {
              const s = sessions.find((x) => x.mediaId === t.id)
              const on = !!s?.state.playing
              return (
                <button key={t.id} onClick={() => (on ? relicRuntime.media.pause(s!.id) : relicRuntime.media.play(t.id, s?.deviceId))} className={`grid w-full grid-cols-[24px_1fr_120px_50px] items-center gap-3 px-2 py-2 text-left hover:bg-burgundy/40 ${on ? 'text-signal' : 'text-bone/85'}`}>
                  <span className="num text-smoke">{on ? '▶' : i + 1}</span>
                  <span>{t.title}<span className="block text-[10px] text-smoke">{t.subtitle}</span></span>
                  <span className="text-[10px] text-smoke">{s ? devices.find((d) => d.id === s.deviceId)?.name : ''}</span>
                  <span className="num text-smoke">{fmtTime(t.duration)}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
      {current && cur && (
        <div className="flex items-center gap-4 border-t border-black bg-[#121010] px-4 py-2">
          <button onClick={() => relicRuntime.media.toggle(current.id)} className="flex h-7 w-7 items-center justify-center border border-red/60 text-bone" aria-label="Play or pause">
            {current.state.playing ? <Pause size={12} /> : <Play size={12} />}
          </button>
          <div className="min-w-0">
            <div className="truncate text-bone">{cur.title}</div>
            <div className="text-[10px]">{devices.find((d) => d.id === current.deviceId)?.name} · {fmtTime(current.position ?? 0)}</div>
          </div>
          <div className="ml-auto"><ContinuityActions sessionId={current.id} size="sm" /></div>
        </div>
      )}
    </div>
  )
}
