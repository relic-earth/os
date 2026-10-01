import { useState } from 'react'
import { Play } from 'lucide-react'
import { relic } from '../../sdk/api'

const SAMPLES: { code: string; run: () => unknown }[] = [
  { code: `relic.devices.find("relic-tv")`, run: () => { const d = relic.devices.find('relic-tv'); return d && { id: d.id, name: d.name, status: d.status, capabilities: d.capabilities } } },
  { code: `relic.devices.withCapability("large-display")`, run: () => relic.devices.withCapability('large-display').map((d) => d.name) },
  { code: `relic.media.play("episode-iii")`, run: () => { const s = relic.media.play('episode-iii'); return { session: s.id, device: s.deviceId, playing: true } } },
  { code: `relic.files.search("permit plans")`, run: () => relic.files.search('permit plans') },
  { code: `relic.home.thermostat.setTemperature(70)`, run: () => ({ target: relic.home.thermostat.setTemperature(70) }) },
  { code: `relic.windows.list()`, run: () => relic.windows.list().map((w) => ({ app: w.appId, title: w.title })) },
]

const READY = ['APPLICATION RUNTIME', 'DEVICE API', 'CLAUDE TOOLS', 'WINDOW API', 'DEVICE MESH API']

/** SETTINGS → DEVELOPER — the Relic SDK as a live console. */
export function Developer() {
  const [out, setOut] = useState<{ code: string; result: string }[]>([])
  return (
    <div className="space-y-6">
      <div>
        <div className="label text-red">RELIC SDK</div>
        <div className="mt-1 text-[11px] text-ash">@relic/sdk {relic.version} · the stable API every Relic application builds against.</div>
        <div className="mt-4 grid grid-cols-5 gap-px overflow-hidden rounded-[2px] border hair bg-[var(--line-faint)]">
          {READY.map((k) => (
            <div key={k} className="bg-ink px-3 py-3">
              <div className="label-sm">{k}</div>
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] tracking-[0.11em] font-semibold text-bone"><span className="dot" /> READY</div>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-5">
        <div>
          <div className="label-sm mb-2 text-ash">EXAMPLE APIS · CLICK TO RUN AGAINST THIS SYSTEM</div>
          <div className="space-y-px overflow-hidden rounded-[2px] border hair bg-[var(--line-faint)]">
            {SAMPLES.map((s) => (
              <button
                key={s.code}
                onClick={() => {
                  let result: string
                  try {
                    result = JSON.stringify(s.run(), null, 2)
                  } catch (e) {
                    result = String(e)
                  }
                  setOut((o) => [{ code: s.code, result }, ...o].slice(0, 6))
                }}
                className="group flex w-full items-center gap-3 bg-ink px-3 py-2.5 text-left hover:bg-burgundy/50"
              >
                <Play size={10} className="text-red opacity-60 group-hover:opacity-100" />
                <span className="mono text-[11px] text-bone/90">{s.code}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="label-sm mb-2 text-ash">CONSOLE</div>
          <div className="mono h-[300px] overflow-y-auto border hair bg-void p-3 text-[11px] leading-5">
            {out.length === 0 && <div className="text-soot">› waiting for a call</div>}
            {out.map((o, i) => (
              <div key={i} className="mb-3">
                <div className="text-red">› {o.code}</div>
                <pre className="whitespace-pre-wrap text-ash">{o.result}</pre>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
