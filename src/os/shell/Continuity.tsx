import { Tv, Smartphone, Car, Laptop, Monitor } from 'lucide-react'
import { useOS } from '../runtime/store'
import { relicRuntime } from '../runtime/relicRuntime'
import { getMedia, fmtTime } from '../media/library'

const TARGETS = [
  { id: 'relic-tv', label: 'CONTINUE ON TV', short: 'TV', Icon: Tv },
  { id: 'relic-phone', label: 'SEND TO PHONE', short: 'PHONE', Icon: Smartphone },
  { id: 'relic-car', label: 'SEND TO CAR', short: 'CAR', Icon: Car },
  { id: 'relic-laptop', label: 'CONTINUE ON LAPTOP', short: 'LAPTOP', Icon: Laptop },
  { id: 'relic-desktop', label: 'MOVE TO DESKTOP', short: 'DESKTOP', Icon: Monitor },
]

/**
 * Continuity actions for any RelicSession. Offers the device nodes that can
 * host it (media → anything with a display or audio; apps → computers + TV).
 */
export function ContinuityActions({ sessionId, size = 'md', only }: { sessionId: string; size?: 'sm' | 'md'; only?: string[] }) {
  const sess = useOS((s) => s.sessions.find((x) => x.id === sessionId))
  const devices = useOS((s) => s.devices)
  const busy = useOS((s) => !!s.transfer)
  if (!sess) return null
  const isMedia = !!sess.mediaId
  const allowed = TARGETS.filter((t) => {
    if (t.id === sess.deviceId) return false
    if (only && !only.includes(t.id)) return false
    if (!isMedia) return ['relic-tv', 'relic-desktop', 'relic-laptop'].includes(t.id)
    return true
  })
  return (
    <div className={`flex flex-wrap ${size === 'sm' ? 'gap-1.5' : 'gap-2'}`}>
      {allowed.map((t) => {
        const d = devices.find((x) => x.id === t.id)
        const label = !isMedia && t.id === 'relic-desktop' ? 'MOVE SESSION TO DESKTOP' : t.label
        return (
          <button
            key={t.id}
            disabled={busy}
            onClick={() => void relicRuntime.continuity.transfer(sessionId, t.id)}
            className={`btn ${size === 'sm' ? 'h-6 px-2 text-[8px]' : ''}`}
            title={d?.status !== 'online' ? `${d?.name} is asleep — will wake over the mesh` : undefined}
          >
            <t.Icon size={size === 'sm' ? 10 : 12} strokeWidth={1.25} />
            {size === 'sm' ? t.short : label}
          </button>
        )
      })}
    </div>
  )
}

/** “WATCHING · Episode III · 43:21” summary for a media session. */
export function NowWatching({ sessionId }: { sessionId: string }) {
  const sess = useOS((s) => s.sessions.find((x) => x.id === sessionId))
  const device = useOS((s) => s.devices.find((d) => d.id === sess?.deviceId))
  const m = getMedia(sess?.mediaId)
  if (!sess || !m) return null
  return (
    <div>
      <div className="label-sm text-red">{sess.state.playing ? (m.kind === 'track' ? 'LISTENING' : 'WATCHING') : 'PAUSED'} · {device?.name.toUpperCase()}</div>
      <div className="mt-1.5 text-[20px] font-light tracking-[0.08em] text-bone">{m.title}</div>
      <div className="mt-1 flex items-center gap-3">
        <span className="num text-[12px] tracking-[0.12em] text-bone">{fmtTime(sess.position ?? 0)}</span>
        <span className="label-sm">/ {fmtTime(m.duration)}</span>
      </div>
      <div className="bar mt-2.5">
        <i style={{ width: `${((sess.position ?? 0) / m.duration) * 100}%` }} />
      </div>
    </div>
  )
}
