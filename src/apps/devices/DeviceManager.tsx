import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Minus, Plus, Power, Lock, Unlock, RefreshCw } from 'lucide-react'
import type { RelicDevice } from '../../sdk/types'
import { useOS, useOSShallow, type Profile } from '../../os/runtime/store'
import { relicRuntime } from '../../os/runtime/relicRuntime'
import { capabilityLabels } from '../../os/devices/registry.mock'
import { fmtAgo } from '../../os/files/service'
import { Icon, deviceIcon } from '../../ui/Icon'
import { Bar, Range, statusText, useMesh } from '../../ui/primitives'
import { ContinuityActions } from '../../os/shell/Continuity'
import { getApp } from '../../os/apps/registry'

export function DeviceCard({ d, active, onClick }: { d: RelicDevice; active?: boolean; onClick?: () => void }) {
  const on = d.status === 'online'
  const thermo = useOS((s) => s.thermostat)
  const line2 = d.type === 'thermostat' ? `${thermo.target}°` : d.location.toUpperCase()
  return (
    <button
      onClick={onClick}
      className={`group relative flex h-[150px] flex-col justify-between overflow-hidden rounded-[2px] border p-4 text-left transition-all duration-300 ${
        active ? 'border-red/80 bg-[#22090b]' : on ? 'border-[var(--line-soft)] bg-white/[0.04] hover:bg-white/[0.07]' : 'border-[var(--line-faint)] bg-white/[0.02] hover:bg-white/[0.05]'
      }`}
    >
      {active && <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-signal to-transparent" />}
      <div className="flex items-start justify-between">
        <Icon name={deviceIcon[d.type]} size={20} strokeWidth={1} className={on ? 'text-bone' : 'text-soot'} />
        <span className={`dot ${on ? '' : 'dot-off'} ${d.status === 'connecting' ? 'pulse' : ''}`} />
      </div>
      <div>
        <div className={`text-[11px] tracking-[0.14em] font-semibold ${on ? 'text-bone' : 'text-ash'}`}>{d.id === 'relic-laptop' ? 'THIS COMPUTER' : d.name.toUpperCase()}</div>
        <div className={`mt-1.5 ${d.type === 'thermostat' ? 'num text-[16px] tracking-[0.1em] text-bone' : 'label-sm'}`}>{line2}</div>
        <div className={`label-sm mt-1 ${on ? 'text-red' : 'text-soot'}`}>{statusText(d)}</div>
      </div>
    </button>
  )
}

/** RELIC DEVICES — the device mesh as an application. */
export function DeviceManager({ win }: { win?: { props?: Record<string, unknown> } }) {
  const { devices, online, total } = useMesh()
  const cloud = useOS((s) => s.cloud)
  const [sel, setSel] = useState<string>(String(win?.props?.deviceId ?? 'relic-tv'))
  const d = devices.find((x) => x.id === sel)
  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-end gap-10 border-b hair px-6 py-4">
          <div>
            <div className="label text-red">DEVICE MESH</div>
            <div className="mt-2 flex items-baseline gap-5">
              <span className="text-[22px] tracking-[0.08em] font-semibold text-bone">{total} DEVICES</span>
              <span className="text-[13px] tracking-[0.11em] font-semibold text-ash">{online} ONLINE</span>
            </div>
          </div>
          <div className="ml-auto flex gap-8">
            <div>
              <div className="label-sm">LOCAL</div>
              <div className="mt-1 text-[11px] tracking-[0.11em] font-semibold text-bone">READY</div>
            </div>
            <div>
              <div className="label-sm">CLOUD</div>
              <div className={`mt-1 text-[11px] tracking-[0.11em] font-semibold ${cloud.status === 'connected' ? 'text-bone' : 'text-signal'}`}>{cloud.status === 'connected' ? 'CONNECTED' : 'OFFLINE'}</div>
            </div>
            <div>
              <div className="label-sm">SYNC</div>
              <div className="mt-1 text-[11px] tracking-[0.11em] font-semibold text-bone">{cloud.pending ? `${cloud.pending} QUEUED` : 'COMPLETE'}</div>
            </div>
          </div>
        </div>
        <div className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(150px,1fr))] content-start gap-3 overflow-y-auto p-6">
          {devices.map((x) => (
            <DeviceCard key={x.id} d={x} active={x.id === sel} onClick={() => setSel(x.id)} />
          ))}
        </div>
      </div>
      <AnimatePresence mode="wait">{d && <DeviceControl key={d.id} d={d} />}</AnimatePresence>
    </div>
  )
}

const PROFILE_FOR: Record<string, Profile | undefined> = {
  'relic-tv': 'relic-tv',
  'relic-phone': 'relic-phone',
  'relic-car': 'relic-car',
  'relic-thermostat': 'relic-thermostat',
  'relic-desktop': 'relic-desktop',
  'relic-laptop': 'relic-laptop',
}

/** Per-device control panel. Every control goes through relicRuntime. */
export function DeviceControl({ d }: { d: RelicDevice }) {
  const [linking, setLinking] = useState(true)
  const sessions = useOSShallow((s) => s.sessions.filter((x) => x.deviceId === d.id))
  const here = useOS((s) => s.profile)
  const hereSessions = useOSShallow((s) => s.sessions.filter((x) => x.deviceId === s.profile && x.deviceId !== d.id))
  const thermo = useOS((s) => s.thermostat)
  const transferring = useOS((s) => !!s.transfer)
  useEffect(() => {
    const t = setTimeout(() => setLinking(false), 650)
    return () => clearTimeout(t)
  }, [])
  const st = d.state as Record<string, number | string | boolean>
  const profile = PROFILE_FOR[d.id]
  const on = d.status === 'online'

  return (
    <motion.aside
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
      className="relative flex w-[330px] shrink-0 flex-col border-l hair-strong bg-void/60"
    >
      {linking && <div className="scanline" />}
      <div className="border-b hair px-5 py-4">
        <div className="flex items-center gap-3">
          <Icon name={deviceIcon[d.type]} size={18} className="text-red" />
          <span className="text-[13px] tracking-[0.15em] font-semibold text-bone">{d.name.toUpperCase()}</span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <span className={`dot ${on ? '' : 'dot-off'}`} />
          <span className="label-sm">{linking ? 'ESTABLISHING LINK…' : `${statusText(d)} · ${d.location.toUpperCase()}`}</span>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        {/* identity + network */}
        <div className="grid grid-cols-2 gap-y-3">
          {[
            ['IDENTITY', d.identity.trust === 'verified' ? 'VERIFIED' : 'PENDING'],
            ['FINGERPRINT', d.identity.fingerprint],
            ['NETWORK', d.network.transport.toUpperCase()],
            ['LATENCY', on ? `${d.network.latencyMs} MS` : '—'],
            ['HARDWARE', d.hardware],
            ['LAST SEEN', on ? 'NOW' : fmtAgo(d.lastSeen)],
          ].map(([k, v]) => (
            <div key={k}>
              <div className="label-sm">{k}</div>
              <div className="mt-1 truncate pr-2 text-[10px] tracking-[0.08em] font-semibold text-bone">{v}</div>
            </div>
          ))}
        </div>

        <div>
          <div className="label-sm mb-2 text-ash">CAPABILITIES</div>
          <div className="flex flex-wrap gap-1.5">
            {d.capabilities.map((c) => (
              <span key={c} className="rounded-md border hair px-2 py-1 text-[10px] tracking-[0.11em] font-semibold text-bone/85">{capabilityLabels[c]}</span>
            ))}
          </div>
        </div>

        {/* device specific */}
        {d.type === 'tv' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="label-sm">POWER</span>
              <button className="btn h-6 px-2" onClick={() => relicRuntime.devices.setState(d.id, { power: !st.power })}><Power size={11} /> {st.power ? 'ON' : 'STANDBY'}</button>
            </div>
            <div>
              <div className="flex justify-between"><span className="label-sm">VOLUME</span><span className="num text-[11px] text-bone">{String(st.volume)}</span></div>
              <Range value={Number(st.volume)} onChange={(v) => relicRuntime.devices.setState(d.id, { volume: v })} className="mt-2 w-full" label="TV volume" />
            </div>
          </div>
        )}
        {(d.type === 'laptop' || d.type === 'desktop') && on && (
          <div className="space-y-3">
            {[['CPU', Number(st.cpu)], ['MEMORY', Number(st.memory)], ['STORAGE', Number(st.storageUsed) / Number(st.storageTotal)]].map(([k, v]) => (
              <div key={k as string}>
                <div className="flex justify-between"><span className="label-sm">{k as string}</span><span className="num text-[11px] text-bone">{Math.round((v as number) * 100)}%</span></div>
                <Bar value={v as number} className="mt-1.5" />
              </div>
            ))}
          </div>
        )}
        {d.type === 'car' && (
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[2px] border hair bg-[var(--line-faint)]">
            {[['CHARGE', `${Math.round((d.battery ?? 0) * 100)}%`], ['RANGE', `${st.range} MI`], ['CABIN', `${st.cabin}°`]].map(([k, v]) => (
              <div key={k} className="bg-ink px-3 py-2.5"><div className="label-sm">{k}</div><div className="num mt-1 text-[13px] text-bone">{v}</div></div>
            ))}
            <button className="col-span-3 flex items-center justify-center gap-2 bg-ink py-2 text-[10px] tracking-[0.12em] font-semibold text-ash hover:bg-burgundy hover:text-bone" onClick={() => void relicRuntime.ai.ask(st.locked ? 'Unlock the car' : 'Lock the car')}>
              {st.locked ? <Lock size={11} /> : <Unlock size={11} />} {st.locked ? 'LOCKED · ASK CLAUDE TO UNLOCK' : 'UNLOCKED'}
            </button>
          </div>
        )}
        {d.type === 'thermostat' && (
          <div className="flex items-center justify-between border hair px-4 py-3">
            <button className="btn h-8 w-8 px-0" onClick={() => relicRuntime.home.thermostat.nudge(-1, 'RELIC DEVICES')} aria-label="Cooler"><Minus size={13} /></button>
            <div className="text-center">
              <div className="num text-[30px] font-light text-bone">{thermo.target}°</div>
              <div className="label-sm">INDOOR {thermo.indoor}° · {thermo.mode}</div>
            </div>
            <button className="btn h-8 w-8 px-0" onClick={() => relicRuntime.home.thermostat.nudge(1, 'RELIC DEVICES')} aria-label="Warmer"><Plus size={13} /></button>
          </div>
        )}
        {d.type === 'home' && (
          <div className="space-y-2">
            {[['SCENE', String(st.scene)], ['FRONT DOOR', String(st.frontDoor)], ['SECURITY', String(st.security)]].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b hair-faint pb-1.5"><span className="label-sm">{k}</span><span className="text-[10px] tracking-[0.1em] font-semibold text-bone">{v}</span></div>
            ))}
            <div className="flex justify-between"><span className="label-sm">LIGHTS</span><span className="num text-[11px] text-bone">{Math.round(Number(st.lights) * 100)}%</span></div>
            <Range value={Math.round(Number(st.lights) * 100)} onChange={(v) => relicRuntime.home.setLights(v / 100)} className="w-full" label="Lights" />
          </div>
        )}

        {/* sessions on this device */}
        <div>
          <div className="label-sm mb-2 text-ash">SESSIONS ON THIS DEVICE</div>
          {sessions.length === 0 && <div className="label-sm text-soot">NONE</div>}
          {sessions.map((s) => (
            <div key={s.id} className="mb-2 border hair px-3 py-2">
              <div className="text-[11px] tracking-[0.1em] font-semibold text-bone">{relicRuntime.continuity.describe(s).toUpperCase()}</div>
              <div className="label-sm mt-1">{s.mediaId ? (s.state.playing ? 'PLAYING' : 'PAUSED') : 'RUNNING'} · {getApp(s.appId ?? '')?.name.toUpperCase()}</div>
              <div className="mt-2"><ContinuityActions sessionId={s.id} size="sm" /></div>
            </div>
          ))}
        </div>

        {/* send sessions from here to this device */}
        {hereSessions.length > 0 && d.id !== here && (d.capabilities.includes('display') || d.capabilities.includes('audio')) && !['thermostat'].includes(d.type) && (
          <div>
            <div className="label-sm mb-2 text-ash">SEND TO {d.name.toUpperCase()}</div>
            {hereSessions
              .filter((s) => s.mediaId || ['tv', 'desktop', 'laptop'].includes(d.type))
              .map((s) => (
                <button key={s.id} disabled={transferring} onClick={() => void relicRuntime.continuity.transfer(s.id, d.id)} className="btn mb-1.5 w-full justify-between">
                  <span className="truncate">{relicRuntime.continuity.describe(s).toUpperCase()}</span>
                  <span className="text-red">→</span>
                </button>
              ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 border-t hair p-4">
        {!on && d.status !== 'connecting' && (
          <button className="btn flex-1" onClick={() => void relicRuntime.mesh.wake(d.id)}>
            <RefreshCw size={11} /> WAKE
          </button>
        )}
        {profile && profile !== here && (
          <button className="btn btn-primary flex-1" onClick={() => relicRuntime.shell.setProfile(profile)}>
            {d.type === 'tv' ? 'ENTER TV MODE' : d.type === 'car' ? 'ENTER RELIC DRIVE' : d.type === 'phone' ? 'SWITCH TO PHONE' : d.type === 'thermostat' ? 'OPEN THERMOSTAT' : `USE ${d.name.toUpperCase()}`}
          </button>
        )}
      </div>
    </motion.aside>
  )
}
