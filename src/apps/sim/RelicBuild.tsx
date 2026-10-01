import { useState } from 'react'
import { Check, Loader } from 'lucide-react'
import { useOSShallow, sleep } from '../../os/runtime/store'
import { relicRuntime } from '../../os/runtime/relicRuntime'
import { Icon, deviceIcon } from '../../ui/Icon'

const STAGES = ['RESOLVE MANIFEST', 'TYPECHECK', 'BUNDLE · WASM + NATIVE', 'SIGN · DEVICE IDENTITY', 'DEPLOY OVER MESH']

/** RELIC BUILD — native Relic developer tool: one app, built for every node. */
export function RelicBuild() {
  const devices = useOSShallow((s) => s.devices.filter((d) => ['laptop', 'desktop', 'tv', 'phone', 'car'].includes(d.type)))
  const [targets, setTargets] = useState<string[]>(['relic-laptop', 'relic-tv', 'relic-phone'])
  const [stage, setStage] = useState(-1)
  const [log, setLog] = useState<string[]>([])
  const running = stage >= 0 && stage < STAGES.length

  const build = async () => {
    setLog([])
    for (let i = 0; i < STAGES.length; i++) {
      setStage(i)
      setLog((l) => [...l, `› ${STAGES[i].toLowerCase()}`])
      await sleep(620)
    }
    setStage(STAGES.length)
    setLog((l) => [...l, `✓ relic-house@0.4.2 deployed to ${targets.length} nodes`])
    relicRuntime.notifications.push({ source: 'RELIC BUILD', title: 'DEPLOYED TO MESH', body: `relic-house@0.4.2 · ${targets.length} devices`, icon: 'hammer' })
  }

  return (
    <div className="flex h-full">
      <div className="flex w-[300px] flex-col border-r hair p-5">
        <div className="label text-red">RELIC BUILD</div>
        <div className="mt-2 text-[20px] font-light tracking-[0.12em] text-bone">relic-house</div>
        <div className="label-sm mt-1">RELIC APP · SDK 0.1 · TYPESCRIPT</div>
        <div className="label-sm mt-6 mb-2 text-ash">TARGET NODES</div>
        <div className="space-y-px">
          {devices.map((d) => {
            const on = targets.includes(d.id)
            return (
              <button key={d.id} onClick={() => setTargets((t) => (on ? t.filter((x) => x !== d.id) : [...t, d.id]))} className={`relative flex w-full items-center gap-3 px-3 py-2 text-left ${on ? 'lit' : 'hover:bg-burgundy/30'}`}>
                <Icon name={deviceIcon[d.type]} size={13} className={on ? 'text-signal' : 'text-smoke'} />
                <span className="flex-1 text-[11px] tracking-[0.11em] font-semibold text-bone">{d.name.toUpperCase()}</span>
                <span className="label-sm">{d.type === 'tv' ? '10-FT' : d.type === 'phone' ? 'MOBILE' : d.type === 'car' ? 'DRIVE' : 'DESKTOP'}</span>
              </button>
            )
          })}
        </div>
        <button className="btn btn-primary mt-auto" onClick={build} disabled={running || !targets.length}>
          {running ? 'BUILDING…' : 'BUILD & DEPLOY'}
        </button>
      </div>
      <div className="flex flex-1 flex-col">
        <div className="grid grid-cols-5 gap-px border-b hair bg-[var(--line-faint)]">
          {STAGES.map((s, i) => (
            <div key={s} className="bg-ink px-3 py-3">
              <div className="flex items-center gap-2">
                {i < stage || stage === STAGES.length ? <Check size={11} className="text-signal" /> : i === stage ? <Loader size={11} className="animate-spin text-ash" /> : <span className="dot dot-off" />}
                <span className="label-sm">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <div className={`mt-2 text-[10px] tracking-[0.1em] font-semibold ${i <= stage ? 'text-bone' : 'text-smoke'}`}>{s}</div>
            </div>
          ))}
        </div>
        <div className="mono flex-1 overflow-y-auto bg-void p-5 text-[11px] leading-6 text-ash">
          <div className="text-smoke">$ relic build --targets {targets.map((t) => t.replace('relic-', '')).join(',')}</div>
          {log.map((l, i) => (
            <div key={i} className={l.startsWith('✓') ? 'text-signal' : ''}>{l}</div>
          ))}
          {stage < 0 && <div className="text-soot">Ready. Select target nodes and build.</div>}
        </div>
      </div>
    </div>
  )
}
