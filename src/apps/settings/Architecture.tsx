import { useState } from 'react'
import { useOS } from '../../os/runtime/store'
import { useMesh } from '../../ui/primitives'

type Node = { id: string; label: string; x: number; y: number; w?: number; module: string; impl: string; now: string }

const NODES: Node[] = [
  { id: 'claude', label: 'CLAUDE', x: 400, y: 40, module: 'agent/claude', impl: 'Claude Gateway → Anthropic API (via Relic proxy)', now: 'MOCK PROVIDER' },
  { id: 'agent', label: 'RELIC AGENT', x: 400, y: 110, module: 'agent/relicAgent.ts', impl: 'Intent · tools · permissions · memory · execution loop', now: 'LIVE' },
  { id: 'runtime', label: 'RELIC RUNTIME', x: 400, y: 180, w: 190, module: 'os/runtime/relicRuntime.ts', impl: 'IPC facade over system daemons', now: 'MOCK SERVICES' },
  { id: 'relic', label: 'RELIC APPS', x: 220, y: 260, module: 'os/apps · sdk/api', impl: 'Native Relic packages on the Relic SDK', now: 'SIMULATED' },
  { id: 'linux', label: 'LINUX APPS', x: 400, y: 260, module: 'compatibility/linux', impl: 'Flatpak / OCI sandbox + portals', now: 'SIMULATED' },
  { id: 'windows', label: 'WINDOWS APPS', x: 580, y: 260, module: 'compatibility/windows · wine · vm', impl: 'Wine prefix · Windows VM · Remote Windows', now: 'SIMULATED' },
  { id: 'mesh', label: 'DEVICE MESH', x: 400, y: 340, w: 190, module: 'mesh/identity · discovery · transport · sync', impl: 'Ed25519 identity · mDNS/BLE/Thread · QUIC · session sync', now: 'SIMULATED' },
  { id: 'tv', label: 'TV', x: 160, y: 420, module: 'modes/TVMode', impl: '10-foot profile', now: 'PROFILE' },
  { id: 'phone', label: 'PHONE', x: 280, y: 420, module: 'modes/PhoneMode', impl: 'Mobile profile', now: 'PROFILE' },
  { id: 'laptop', label: 'LAPTOP', x: 400, y: 420, module: 'os/shell', impl: 'Desktop shell · Wayland compositor', now: 'PROFILE' },
  { id: 'car', label: 'CAR', x: 520, y: 420, module: 'modes/CarMode', impl: 'Relic Drive profile', now: 'PROFILE' },
  { id: 'home', label: 'HOME', x: 640, y: 420, module: 'modes/ThermostatMode · os/devices', impl: 'Thermostat + home hub', now: 'PROFILE' },
]

const EDGES: [string, string][] = [
  ['claude', 'agent'],
  ['agent', 'runtime'],
  ['runtime', 'relic'],
  ['runtime', 'linux'],
  ['runtime', 'windows'],
  ['relic', 'mesh'],
  ['linux', 'mesh'],
  ['windows', 'mesh'],
  ['mesh', 'tv'],
  ['mesh', 'phone'],
  ['mesh', 'laptop'],
  ['mesh', 'car'],
  ['mesh', 'home'],
]

const LAYERS = [
  ['RELIC EXPERIENCE', 'os/shell · modes'],
  ['CLAUDE SYSTEM AGENT', 'agent/*'],
  ['RELIC RUNTIME', 'os/runtime'],
  ['APPLICATION RUNTIMES', 'compatibility/*'],
  ['RELIC DEVICE MESH', 'mesh/*'],
  ['RELIC BASE SYSTEM', 'LINUX · WAYLAND · SYSTEMD'],
  ['HARDWARE', 'x86-64 · ARM64'],
]

const byId = (id: string) => NODES.find((n) => n.id === id)!

/** SETTINGS → SYSTEM → ARCHITECTURE — live engineering console. */
export function ArchitectureDiagram() {
  const [hover, setHover] = useState<string>('runtime')
  const { online, total } = useMesh()
  const windowsMode = useOS((s) => s.windowsMode)
  const cloud = useOS((s) => s.cloud.status)
  const running = useOS((s) => s.windows.length)
  const n = byId(hover)
  const live: Record<string, string> = {
    claude: cloud === 'connected' ? 'CONNECTED' : 'ON-DEVICE',
    agent: 'READY',
    runtime: `${running} SURFACES`,
    windows: windowsMode.toUpperCase(),
    mesh: `${online}/${total} ONLINE`,
  }
  const lit = new Set<string>([hover, ...EDGES.filter(([a, b]) => a === hover || b === hover).flat()])

  return (
    <div className="space-y-4">
      <div className="panel-solid ticks relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgb(var(--acc-2)/0.05)_1px,transparent_1px),linear-gradient(90deg,rgb(var(--acc-2)/0.05)_1px,transparent_1px)] bg-[size:20px_20px]" />
        <div className="label-sm absolute left-4 top-3 text-red">RELIC OS · SYSTEM ARCHITECTURE</div>
        <div className="label-sm absolute right-4 top-3">REV 0.1 · LIVE</div>
        <svg viewBox="0 0 800 470" className="relative block w-full">
          <style>{`@keyframes flow{to{stroke-dashoffset:-24}} .flow{animation:flow 1.2s linear infinite}`}</style>
          {EDGES.map(([a, b]) => {
            const A = byId(a)
            const B = byId(b)
            const mid = (A.y + B.y) / 2
            const d = `M${A.x} ${A.y + 14} C ${A.x} ${mid}, ${B.x} ${mid}, ${B.x} ${B.y - 14}`
            const on = lit.has(a) && lit.has(b)
            return (
              <g key={a + b}>
                <path d={d} fill="none" stroke="#7d0f14" strokeOpacity={on ? 0.9 : 0.45} strokeWidth="1" />
                <path d={d} fill="none" stroke="#e8242b" strokeWidth="1.2" strokeDasharray="3 9" className="flow" opacity={on ? 1 : 0.25} />
              </g>
            )
          })}
          {NODES.map((node) => {
            const w = node.w ?? (node.y === 420 ? 92 : 150)
            const on = node.id === hover
            return (
              <g key={node.id} onMouseEnter={() => setHover(node.id)} onClick={() => setHover(node.id)} style={{ cursor: 'pointer' }}>
                <rect x={node.x - w / 2} y={node.y - 14} width={w} height="28" rx="6" style={{ fill: on ? 'rgb(var(--acc-3) / 0.35)' : '#0a0808', stroke: on ? 'rgb(var(--acc-1))' : 'rgb(var(--acc-2))' }} strokeOpacity={on ? 1 : 0.5} strokeWidth="1" />
                {on && <rect x={node.x - w / 2} y={node.y - 14} width="2" height="28" fill="#e8242b" />}
                <text x={node.x} y={node.y + 3.5} textAnchor="middle" fill={on ? '#ebe5df' : '#a39b96'} fontSize="10" fontWeight="600" letterSpacing="1.6">
                  {node.label}
                </text>
                {live[node.id] && (
                  <text x={node.x + w / 2 + 8} y={node.y + 3} fill="#e8242b" fontSize="7.5" fontWeight="600" letterSpacing="0.8">
                    {live[node.id]}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      <div className="grid grid-cols-[1fr_1.4fr] gap-4">
        <div className="panel-solid ticks p-4">
          <div className="label-sm text-red">SELECTED</div>
          <div className="mt-2 text-[13px] tracking-[0.14em] font-semibold text-bone">{n.label}</div>
          <div className="mt-3 space-y-2">
            <div><div className="label-sm">MODULE</div><div className="mono mt-0.5 text-[11px] text-ash">src/{n.module}</div></div>
            <div><div className="label-sm">PRODUCTION</div><div className="mt-0.5 text-[11px] leading-snug text-bone/85">{n.impl}</div></div>
            <div><div className="label-sm">PROTOTYPE</div><div className="mt-0.5 text-[11px] tracking-[0.1em] font-semibold text-signal">{n.now}</div></div>
          </div>
        </div>
        <div className="panel-solid p-4">
          <div className="label-sm mb-3 text-red">LAYER STACK</div>
          <div className="grid grid-cols-2 gap-x-6">
          {LAYERS.map(([k, v]) => (
            <div key={k} className="relative border-l hair-strong py-1.5 pl-3">
              <span className="absolute -left-[3px] top-3 h-[5px] w-[5px] bg-red" />
              <div className="text-[10px] tracking-[0.11em] font-semibold text-bone">{k}</div>
              <div className="label-sm mt-0.5 text-soot">{v}</div>
            </div>
          ))}
          </div>
        </div>
      </div>
    </div>
  )
}
