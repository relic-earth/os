import { useEffect, useState, type ReactNode } from 'react'
import type { RelicWindow, AppPermission, PermissionState } from '../../sdk/types'
import { useOS } from '../../os/runtime/store'
import { relicRuntime } from '../../os/runtime/relicRuntime'
import { appRegistry, getApp } from '../../os/apps/registry'
import { permissionLabels } from '../../os/permissions/service'
import { windowsModes } from '../../compatibility/windows/manager'
import { riskMeta } from '../../agent/policies'
import { toolDefinitions } from '../../agent/tools/definitions'
import { claudeGateway } from '../../agent/relicAgent'
import { cloud } from '../../cloud'
import { fmtAgo } from '../../os/files/service'
import { Art } from '../../ui/Art'
import { Icon, deviceIcon } from '../../ui/Icon'
import { Bar, Range, statusText, Toggle, useMesh } from '../../ui/primitives'
import { ArchitectureDiagram } from './Architecture'
import { Developer } from './Developer'

type SectionId = 'general' | 'display' | 'network' | 'devices' | 'claude' | 'security' | 'compatibility' | 'developer' | 'system' | 'about'

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'general', label: 'GENERAL' },
  { id: 'display', label: 'DISPLAY & SOUND' },
  { id: 'network', label: 'NETWORK & CLOUD' },
  { id: 'devices', label: 'DEVICES' },
  { id: 'claude', label: 'CLAUDE' },
  { id: 'security', label: 'SECURITY' },
  { id: 'compatibility', label: 'COMPATIBILITY' },
  { id: 'developer', label: 'DEVELOPER' },
  { id: 'system', label: 'SYSTEM' },
  { id: 'about', label: 'ABOUT RELIC' },
]

/** deep-link aliases → [section, sub-tab] */
const ALIAS: Record<string, [SectionId, string?]> = {
  architecture: ['system', 'architecture'],
  roadmap: ['about', 'roadmap'],
  sdk: ['developer'],
  sound: ['display'],
}

function resolve(section?: unknown): [SectionId, string?] {
  const s = String(section ?? 'general')
  if (ALIAS[s]) return ALIAS[s]
  return SECTIONS.some((x) => x.id === s) ? [s as SectionId] : ['general']
}

export function Settings({ win }: { win: RelicWindow }) {
  const [initial, initialSub] = resolve(win.props?.section)
  const [section, setSection] = useState<SectionId>(initial)
  const [sub, setSub] = useState<string | undefined>(initialSub)
  const nonce = win.props?.nonce
  useEffect(() => {
    const [s, t] = resolve(win.props?.section)
    setSection(s)
    setSub(t)
  }, [nonce, win.props?.section])

  return (
    <div className="flex h-full">
      <nav className="w-[190px] shrink-0 border-r hair bg-void/50 py-4">
        {SECTIONS.map((s) => (
          <button key={s.id} onClick={() => { setSection(s.id); setSub(undefined) }} className={`relative flex h-9 w-full items-center px-5 text-left text-[11px] tracking-[0.14em] font-semibold ${section === s.id ? 'lit text-bone' : 'text-ash hover:bg-burgundy/40 hover:text-bone'}`}>
            {s.label}
          </button>
        ))}
      </nav>
      <div className="min-w-0 flex-1 overflow-y-auto px-8 py-6">
        {section === 'general' && <General />}
        {section === 'display' && <Display />}
        {section === 'network' && <Network />}
        {section === 'devices' && <Devices />}
        {section === 'claude' && <ClaudeSettings />}
        {section === 'security' && <Security />}
        {section === 'compatibility' && <Compatibility />}
        {section === 'developer' && <Developer />}
        {section === 'system' && <SystemSection sub={sub ?? 'overview'} setSub={setSub} />}
        {section === 'about' && <About sub={sub ?? 'relic'} setSub={setSub} />}
      </div>
    </div>
  )
}

function H({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-6">
      <div className="text-[18px] tracking-[0.16em] font-semibold text-bone">{children}</div>
      {sub && <div className="mt-1.5 text-[11px] text-ash">{sub}</div>}
    </div>
  )
}

function Row({ k, v, hot, children }: { k: string; v?: ReactNode; hot?: boolean; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b hair-faint py-3">
      <span className="label">{k}</span>
      {children ?? <span className={`text-[11px] tracking-[0.12em] font-semibold ${hot ? 'text-signal' : 'text-bone'}`}>{v}</span>}
    </div>
  )
}

function Tabs({ items, value, onChange }: { items: [string, string][]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mb-6 flex gap-1 border-b hair">
      {items.map(([id, label]) => (
        <button key={id} onClick={() => onChange(id)} className={`relative px-4 py-2.5 text-[11px] tracking-[0.14em] font-semibold ${value === id ? 'text-bone' : 'text-smoke hover:text-ash'}`}>
          {label}
          {value === id && <span className="absolute inset-x-3 bottom-0 h-[2px] bg-signal shadow-[0_0_8px_rgba(232,36,43,0.8)]" />}
        </button>
      ))}
    </div>
  )
}

function StatusGrid({ items }: { items: [string, string, boolean?][] }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border hair bg-[var(--line-faint)] md:grid-cols-4">
      {items.map(([k, v, warn]) => (
        <div key={k} className="bg-ink px-4 py-4">
          <div className="label-sm">{k}</div>
          <div className={`mt-2 flex items-center gap-2 text-[11px] tracking-[0.12em] font-semibold ${warn ? 'text-signal' : 'text-bone'}`}>
            <span className={`dot ${warn ? 'pulse' : ''}`} /> {v}
          </div>
        </div>
      ))}
    </div>
  )
}

function General() {
  const { online } = useMesh()
  const c = useOS((s) => s.cloud.status)
  const profile = useOS((s) => s.profile)
  const d = useOS((s) => s.devices.find((x) => x.id === s.profile))
  return (
    <div>
      <H sub="Relic continues locally when the cloud is unavailable.">RELIC SYSTEM</H>
      <StatusGrid items={[['LOCAL', 'READY'], ['CLOUD', c === 'connected' ? 'CONNECTED' : 'OFFLINE', c !== 'connected'], ['CLAUDE', c === 'connected' ? 'CONNECTED' : 'ON-DEVICE'], ['DEVICE MESH', `${online} DEVICES`]]} />
      <div className="mt-8">
        <Row k="THIS SCREEN" v={d?.name.toUpperCase()} />
        <Row k="DEVICE ID" v={profile} />
        <Row k="IDENTITY" v={d?.identity.fingerprint} />
        <Row k="HARDWARE" v={d?.hardware} />
        <Row k="RELIC OS" v="0.1 · PROTOTYPE" />
      </div>
    </div>
  )
}

function Display() {
  const theme = useOS((s) => s.theme)
  const bg = useOS((s) => s.background)
  const volume = useOS((s) => s.volume)
  return (
    <div>
      <H>DISPLAY & SOUND</H>
      <div className="label-sm mb-3">BACKGROUND</div>
      <div className="grid grid-cols-4 gap-3">
        {(['horizon', 'volcanic', 'topographic', 'architecture'] as const).map((b) => (
          <button key={b} onClick={() => relicRuntime.settings.set('background', b)} className={`border ${bg === b ? 'border-red shadow-[var(--glow)]' : 'hair'}`}>
            <div className="aspect-video">
              <Art variant={b === 'volcanic' ? 'volcano' : b === 'topographic' ? 'topo' : b === 'architecture' ? 'spire' : 'horizon'} className="h-full w-full" />
            </div>
            <div className={`py-2 text-[10px] tracking-[0.13em] font-semibold ${bg === b ? 'text-bone' : 'text-ash'}`}>{b.toUpperCase()}</div>
          </button>
        ))}
      </div>
      <div className="mt-6">
        <Row k="ILLUMINATION">
          <div className="flex gap-2">
            {(['relic', 'dim'] as const).map((t) => (
              <button key={t} className={`btn h-7 ${theme === t ? 'btn-primary' : 'btn-ghost'}`} onClick={() => relicRuntime.settings.set('theme', t)}>
                {t === 'relic' ? 'STANDARD' : 'DIM'}
              </button>
            ))}
          </div>
        </Row>
        <Row k="VOLUME">
          <div className="flex items-center gap-3">
            <Range value={volume} onChange={(v) => relicRuntime.media.setVolume(v)} className="w-48" label="Volume" />
            <span className="num w-8 text-right text-[11px] text-bone">{volume}</span>
          </div>
        </Row>
        <Row k="TYPEFACE" v="GILL SANS · SYSTEM" />
      </div>
    </div>
  )
}

function Network() {
  const c = useOS((s) => s.cloud)
  const net = useOS((s) => s.network)
  const st = cloud.storage.usage()
  const connected = c.status === 'connected'
  return (
    <div>
      <H sub="Local-first: files, apps, windows and the device mesh never depend on the cloud.">NETWORK & CLOUD</H>
      <StatusGrid items={[['LOCAL', 'READY'], ['NETWORK', net.online ? `${net.ssid}` : 'OFFLINE'], ['RELIC CLOUD', connected ? 'CONNECTED' : 'DISCONNECTED', !connected], ['SYNC', c.pending ? `${c.pending} QUEUED` : 'COMPLETE']]} />
      <div className="mt-6">
        <Row k="RELIC CLOUD">
          <Toggle on={connected} onChange={(v) => relicRuntime.network.setCloud(v)} label={connected ? 'CONNECTED' : 'SIMULATED OUTAGE'} />
        </Row>
        <Row k="LAST SYNC" v={fmtAgo(c.lastSync)} />
        <Row k="STORAGE" v={`${st.usedTB} / ${st.totalTB} TB · ${st.encryption}`} />
        <Row k="AI REGION" v={cloud.ai.region()} />
        <Row k="ACCOUNT" v={`${cloud.identity.account().name} · ${cloud.identity.account().plan}`} />
      </div>
      <button className="btn mt-5" disabled={!connected} onClick={() => void cloud.sync.syncNow()}>SYNC NOW</button>
      <div className="label-sm mt-8 mb-3">RELIC CLOUD SERVICES</div>
      <div className="grid grid-cols-4 gap-px overflow-hidden rounded-[12px] border hair bg-[var(--line-faint)]">
        {cloud.services.map((s) => (
          <div key={s} className="bg-ink px-3 py-3">
            <div className="text-[10px] tracking-[0.11em] font-semibold text-bone">{s}</div>
            <div className={`label-sm mt-1 ${connected ? '' : 'text-signal'}`}>{connected ? 'AVAILABLE' : 'QUEUED'}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Devices() {
  const { devices } = useMesh()
  const rel = useOS((s) => s.memory.deviceRelationships)
  return (
    <div>
      <H sub="Every device is a node of one computer.">DEVICE MESH</H>
      {devices.map((d) => (
        <div key={d.id} className="flex items-center gap-4 border-b hair-faint py-3">
          <Icon name={deviceIcon[d.type]} size={15} className={d.status === 'online' ? 'text-red' : 'text-soot'} />
          <span className="w-44 text-[11px] tracking-[0.12em] font-semibold text-bone">{d.name.toUpperCase()}</span>
          <span className="label-sm w-28">{statusText(d)}</span>
          <span className="label-sm flex-1 truncate">{d.capabilities.slice(0, 5).join(' · ').toUpperCase()}</span>
          <span className="label-sm">{d.identity.trust.toUpperCase()}</span>
        </div>
      ))}
      <div className="label-sm mt-8 mb-2">RELATIONSHIPS · RELIC MEMORY</div>
      {rel.map((r) => (
        <Row key={r.a + r.b} k={`${r.a.replace('relic-', '').toUpperCase()} ↔ ${r.b.replace('relic-', '').toUpperCase()}`} v={r.relation} />
      ))}
    </div>
  )
}

function ClaudeSettings() {
  const grants = useOS((s) => s.claudeGrants)
  const autos = useOS((s) => s.automations)
  const mem = useOS((s) => s.memory)
  const provider = useOS((s) => s.claudeProvider)
  const levels = ['read', 'low', 'sensitive', 'system'] as const
  return (
    <div>
      <H sub="Claude acts only through typed tools. Sensitive and system actions always ask.">CLAUDE</H>
      <Row k="GATEWAY PROVIDER">
        <div className="flex gap-2">
          {(['mock', 'anthropic'] as const).map((p) => (
            <button key={p} className={`btn h-7 ${provider === p ? 'btn-primary' : 'btn-ghost'}`} onClick={() => relicRuntime.settings.set('claudeProvider', p)}>
              {p === 'mock' ? 'MOCK CLAUDE' : 'ANTHROPIC API'}
            </button>
          ))}
        </div>
      </Row>
      <Row k="ACTIVE ROUTE" v={claudeGateway.active().label} />
      <div className="label-sm mt-8 mb-3">PERMISSION MODEL</div>
      <div className="grid grid-cols-4 gap-px overflow-hidden rounded-[12px] border hair bg-[var(--line-faint)]">
        {levels.map((l) => (
          <div key={l} className="bg-ink p-4">
            <div className={`text-[11px] tracking-[0.14em] font-semibold ${l === 'system' ? 'text-signal' : l === 'sensitive' ? 'text-red' : 'text-bone'}`}>{riskMeta[l].label}</div>
            <div className="label-sm mt-1">{l === 'read' || l === 'low' ? 'RUNS · LOGGED' : 'REQUIRES CONFIRMATION'}</div>
            <div className="mt-3 space-y-1">
              {toolDefinitions.filter((t) => t.risk === l).map((t) => (
                <div key={t.name} className="mono text-[11px] text-ash">{t.name}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="label-sm mt-8 mb-2">STANDING GRANTS · {grants.length} ACTIVE</div>
      {grants.map((g) => (
        <Row key={g.id} k={g.label}>
          <div className="flex items-center gap-4">
            <span className="label-sm">{g.scope}</span>
            <button className="label-sm hover:text-signal" onClick={() => relicRuntime.permissions.revokeClaudeGrant(g.id)}>REVOKE</button>
          </div>
        </Row>
      ))}
      <div className="label-sm mt-8 mb-2">AUTOMATIONS</div>
      {autos.map((a) => (
        <Row key={a.id} k={a.name.toUpperCase()}>
          <div className="flex items-center gap-4">
            <span className="label-sm hidden truncate lg:block">{a.trigger} → {a.action}</span>
            <span className="label-sm">{a.createdBy.toUpperCase()}</span>
            <Toggle on={a.enabled} onChange={() => relicRuntime.automations.toggle(a.id)} />
          </div>
        </Row>
      ))}
      <div className="label-sm mt-8 mb-2">RELIC MEMORY · LOCAL BACKEND</div>
      <Row k="RECENT APPS" v={mem.recentApps.slice(0, 4).map((x) => getApp(x.id)?.name ?? x.id).join(' · ').toUpperCase() || '—'} />
      <Row k="RECENT FILES" v={`${mem.recentFiles.length} TRACKED`} />
      <Row k="CONVERSATIONS" v={`${mem.conversations.length}`} />
      <Row k="PREFERENCES" v={Object.entries(mem.preferences).map(([k, v]) => `${k}: ${v}`).join(' · ').toUpperCase()} />
      <button className="btn btn-ghost mt-4" onClick={() => relicRuntime.memory.forget()}>CLEAR MEMORY</button>
    </div>
  )
}

function Security() {
  const grants = useOS((s) => s.claudeGrants.length)
  const perms = useOS((s) => s.appPermissions)
  const installed = useOS((s) => s.installed)
  const [app, setApp] = useState('photoshop')
  const list = appRegistry.filter((a) => !a.system && installed[a.id])
  const p = perms[app] ?? {}
  const cycle: Record<PermissionState, PermissionState> = { allowed: 'denied', denied: 'ask', ask: 'allowed' }
  return (
    <div>
      <H sub="Every application runs sandboxed. Every device proves its identity.">SECURITY CENTER</H>
      <div className="grid grid-cols-5 gap-px overflow-hidden rounded-[12px] border hair bg-[var(--line-faint)]">
        {[['DEVICE IDENTITY', 'SECURE'], ['ENCRYPTION', 'ACTIVE'], ['APPLICATION SANDBOX', 'ACTIVE'], ['CLAUDE PERMISSIONS', `${grants} ACTIVE`], ['NETWORK', 'SECURE']].map(([k, v]) => (
          <div key={k} className="bg-ink px-4 py-4">
            <div className="label-sm">{k}</div>
            <div className="mt-2 flex items-center gap-2 text-[11px] tracking-[0.12em] font-semibold text-bone"><span className="dot" />{v}</div>
          </div>
        ))}
      </div>
      <div className="mt-8 flex gap-6">
        <div className="w-[200px] shrink-0">
          <div className="label-sm mb-2">APPLICATIONS</div>
          {list.map((a) => (
            <button key={a.id} onClick={() => setApp(a.id)} className={`relative flex h-8 w-full items-center gap-2 px-3 text-left text-[11px] tracking-[0.12em] font-semibold ${app === a.id ? 'lit text-bone' : 'text-ash hover:text-bone'}`}>
              <Icon name={a.icon} size={12} /> {a.name.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex-1">
          <div className="text-[14px] tracking-[0.15em] font-semibold text-bone">{getApp(app)?.name.toUpperCase()}</div>
          <div className="label-sm mt-1">{getApp(app)?.runtime === 'windows' ? 'WINDOWS · WINE PREFIX SANDBOX' : 'SANDBOXED'} · CLICK A STATE TO CHANGE</div>
          <div className="mt-4">
            {(['files', 'gpu', 'network', 'camera', 'microphone', 'location'] as AppPermission[]).map((k) => {
              const v = p[k] ?? 'denied'
              return (
                <div key={k} className="flex items-center justify-between border-b hair-faint py-2.5">
                  <span className="label">{permissionLabels[k]}</span>
                  <button onClick={() => relicRuntime.permissions.set(app, k, cycle[v])} className={`w-24 border px-2 py-1 text-center text-[10px] tracking-[0.13em] font-semibold ${v === 'allowed' ? 'border-red/70 text-bone' : v === 'ask' ? 'hair text-ash' : 'hair-faint text-smoke'}`}>
                    {v.toUpperCase()}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function Compatibility() {
  const mode = useOS((s) => s.windowsMode)
  const compat = useOS((s) => s.compat)
  const running = Object.entries(compat)
  return (
    <div>
      <H sub="Run Windows applications on Relic. Nothing in this prototype executes Windows binaries; backends are simulated.">WINDOWS COMPATIBILITY</H>
      <div className="grid grid-cols-3 gap-3">
        {windowsModes.map((m) => (
          <button key={m.mode} onClick={() => relicRuntime.settings.set('windowsMode', m.mode)} className={`border p-4 text-left transition-colors ${mode === m.mode ? 'border-red bg-burgundy/40 shadow-[var(--glow)]' : 'hair hover:border-[var(--line)]'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] tracking-[0.14em] font-semibold text-bone">{m.label}</span>
              <span className={`dot ${mode === m.mode ? '' : 'dot-off'}`} />
            </div>
            <div className="mt-2 text-[11px] leading-snug text-ash">{m.detail}</div>
            <div className="label-sm mt-3">{mode === m.mode ? 'DEFAULT · READY' : 'READY'}</div>
          </button>
        ))}
      </div>
      <div className="label-sm mt-8 mb-2">RUNNING THROUGH COMPATIBILITY</div>
      {running.length === 0 && <div className="label-sm text-soot">NONE</div>}
      {running.map(([id, c]) => (
        <Row key={id} k={getApp(c.appId)?.name.toUpperCase() ?? c.appId}>
          <span className="text-[11px] tracking-[0.11em] font-semibold text-bone">{c.mode.toUpperCase()} · {c.gpu} · {c.status.toUpperCase()} · {c.deviceId.replace('relic-', '').toUpperCase()}</span>
        </Row>
      ))}
    </div>
  )
}

function SystemSection({ sub, setSub }: { sub: string; setSub: (s: string) => void }) {
  const laptop = useOS((s) => s.devices.find((d) => d.id === 'relic-laptop'))
  return (
    <div className="flex h-full flex-col">
      <H>SYSTEM</H>
      <Tabs items={[['overview', 'MVP BOUNDARY'], ['architecture', 'ARCHITECTURE']]} value={sub} onChange={setSub} />
      {sub === 'architecture' ? (
        <ArchitectureDiagram />
      ) : (
        <div className="grid grid-cols-[1fr_280px] gap-6">
          <div className="panel-solid ticks p-6">
            <div className="label text-red">RELIC OS MVP</div>
            <div className="mt-5 grid grid-cols-2 gap-x-10">
              {[
                ['TARGET', 'x86-64 LAPTOP / DESKTOP'],
                ['BASE', 'LINUX'],
                ['GRAPHICS', 'WAYLAND'],
                ['SHELL', 'RELIC'],
                ['RUNTIME', 'RELIC RUNTIME'],
                ['AI', 'CLAUDE'],
                ['WINDOWS', 'WINE / COMPATIBILITY LAYER'],
                ['DEVICE MESH', 'SUPPORTED'],
                ['CLOUD', 'OPTIONAL'],
                ['KERNEL', 'UPSTREAM LINUX · NO NEW KERNEL'],
              ].map(([k, v]) => (
                <div key={k} className="border-b hair-faint py-3">
                  <div className="label-sm">{k}</div>
                  <div className="mt-1 text-[11px] tracking-[0.12em] font-semibold text-bone">{v}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 text-[11px] leading-relaxed text-ash">
              Relic owns the shell, runtime, AI layer, compatibility system, device mesh and cloud. The base is Linux. This web prototype simulates every layer behind the same interfaces a bootable build would implement.
            </div>
          </div>
          <div className="space-y-3">
            {[['CPU', Number(laptop?.state.cpu ?? 0)], ['MEMORY', Number(laptop?.state.memory ?? 0)], ['STORAGE', 0.6]].map(([k, v]) => (
              <div key={k as string} className="panel-solid p-4">
                <div className="flex justify-between"><span className="label-sm">{k as string}</span><span className="num text-[11px] text-bone">{Math.round((v as number) * 100)}%</span></div>
                <Bar value={v as number} className="mt-2" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const ROADMAP: [string, boolean][] = [
  ['DESKTOP', true],
  ['WINDOWS COMPATIBILITY', true],
  ['DEVICE MESH', true],
  ['TV', false],
  ['PHONE', false],
  ['CAR', false],
  ['HOME', false],
  ['RELIC HARDWARE', false],
]

function About({ sub, setSub }: { sub: string; setSub: (s: string) => void }) {
  return (
    <div>
      <H>ABOUT RELIC</H>
      <Tabs items={[['relic', 'RELIC OS'], ['roadmap', 'ROADMAP']]} value={sub} onChange={setSub} />
      {sub === 'roadmap' ? (
        <div className="panel-solid ticks relative overflow-hidden p-8">
          <div className="label text-red">RELIC OS · ROADMAP</div>
          <div className="relative mt-8 grid grid-cols-8">
            <div className="absolute left-[6%] right-[6%] top-[30px] h-px bg-[var(--line)]" />
            <div className="absolute left-[6%] top-[30px] h-px w-[37%] bg-signal shadow-[0_0_10px_rgba(232,36,43,0.8)]" />
            {ROADMAP.map(([label, done], i) => (
              <div key={label} className="relative flex flex-col items-center text-center">
                <span className="num text-[11px] text-smoke">{String(i + 1).padStart(2, '0')}</span>
                <span className={`relative mt-3 h-[14px] w-[14px] rounded-full border ${done ? 'border-signal bg-signal shadow-[0_0_12px_rgba(232,36,43,0.9)]' : 'border-soot bg-void'}`} />
                <span className={`mt-4 px-1 text-[10px] leading-relaxed tracking-[0.12em] font-semibold ${done ? 'text-bone' : 'text-smoke'}`}>{label}</span>
                <span className={`label-sm mt-1 ${done ? 'text-red' : 'text-soot'}`}>{done ? (i === 2 ? 'CURRENT' : 'BUILT') : 'NEXT'}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_260px] gap-6">
          <div>
            <div className="wordmark text-[26px] font-light text-bone">RELIC</div>
            <div className="mt-6 text-[22px] font-light leading-snug tracking-[0.06em] text-bone">One computer. Every device.</div>
            <div className="mt-4 max-w-[480px] text-[12px] leading-relaxed text-ash">
              Relic is a universal computing environment. Your laptop, desktop, TV, phone, car and home are nodes of one computer — with Claude as the system intelligence that understands applications, files, devices, media and settings.
            </div>
            <div className="mt-6">
              <Row k="VERSION" v="RELIC OS 0.1 · PROTOTYPE" />
              <Row k="BUILD" v="2026.09 · WEB SIMULATION" />
              <Row k="BASE" v="LINUX (PLANNED)" />
            </div>
          </div>
          <div className="border hair">
            <Art variant="horizon" className="aspect-[3/4] w-full" />
          </div>
        </div>
      )}
    </div>
  )
}
