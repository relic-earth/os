import { useEffect, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, Minus, Plus, Search, Signal, Wifi, BatteryMedium, Play, Pause } from 'lucide-react'
import { useOS } from '../os/runtime/store'
import { relicRuntime } from '../os/runtime/relicRuntime'
import { getApp, appRegistry, runtimeLabel } from '../os/apps/registry'
import { getMedia, fmtTime } from '../os/media/library'
import { fmtAgo } from '../os/files/service'
import { Icon, deviceIcon } from '../ui/Icon'
import { Art } from '../ui/Art'
import { fmtClock, statusText, useNow, Wordmark } from '../ui/primitives'
import { Background } from '../os/shell/Background'
import { DeviceSwitcher } from '../os/shell/TopBar'
import { ClaudeTranscript, Suggestions } from '../apps/claude/ClaudePanel'
import { DeviceControl } from '../apps/devices/DeviceManager'
import { DocPreview } from '../apps/viewer/DocPreview'
import { AppSurface } from '../apps'
import type { RelicFile } from '../sdk/types'
import { AppIcon } from '../ui/AppIcon'

type Tab = 'home' | 'claude' | 'apps' | 'files' | 'devices'
type Sheet = { kind: 'file'; file: RelicFile } | { kind: 'remote'; windowId: string } | { kind: 'device'; id: string } | null

const PHONE = 'relic-phone'
const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'claude', label: 'Claude' },
  { id: 'apps', label: 'Apps' },
  { id: 'files', label: 'Files' },
  { id: 'devices', label: 'Devices' },
]

/** RELIC PHONE — mobile shell. Same environment, different body. */
export function PhoneMode({ framed }: { framed: boolean }) {
  const screen = <PhoneShell framed={framed} />
  if (!framed) return <div className="relative h-full w-full overflow-clip bg-void">{screen}</div>
  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-clip">
      <Background />
      <div className="absolute left-8 top-6 z-10 flex items-center gap-6">
        <Wordmark />
        <span className="label">DEVICE PROFILE · RELIC PHONE</span>
      </div>
      <div className="absolute right-8 top-6 z-20"><DeviceSwitcher /></div>
      <div className="absolute bottom-8 left-8 z-10 max-w-[280px]">
        <div className="label text-red">ONE COMPUTER</div>
        <div className="mt-2 text-[12px] leading-relaxed text-ash">The phone is another node of the same Relic computer: same sessions, same files, same Claude conversation.</div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
        className="relative z-10 rounded-[46px] border border-[#2a2020] bg-[#050404] p-[10px] shadow-[0_40px_120px_rgba(0,0,0,0.9),0_0_0_1px_rgba(179,20,27,0.25),0_0_60px_rgba(125,15,20,0.2)]"
        style={{ height: 'min(844px, 92vh)', aspectRatio: '390 / 844' }}
      >
        <div className="relative h-full w-full overflow-hidden rounded-[37px] bg-void">
          <div className="absolute left-1/2 top-2 z-50 h-[26px] w-[96px] -translate-x-1/2 rounded-full bg-black" />
          {screen}
        </div>
      </motion.div>
    </div>
  )
}

/** On a real phone (unframed) the OS status bar is the device's own; content sits inside the safe area. */
function PhoneShell({ framed }: { framed: boolean }) {
  const [tab, setTab] = useState<Tab>('home')
  const [sheet, setSheet] = useState<Sheet>(null)
  const now = useNow(15_000)
  const battery = useOS((s) => s.devices.find((d) => d.id === PHONE)?.battery ?? 0.7)
  const here = useOS((s) => s.sessions.find((x) => x.deviceId === PHONE && x.mediaId))
  return (
    <div className="relative flex h-full flex-col">
      <Art variant="topo" className="pointer-events-none absolute inset-0 h-full w-full opacity-40" />
      {!framed && <div className="shrink-0" style={{ height: 'max(12px, env(safe-area-inset-top))' }} />}
      {framed && <div className="relative z-40 flex h-11 shrink-0 items-center justify-between px-7 pt-2">
        <span className="num text-[13px] text-bone">{fmtClock(now).replace(/ (AM|PM)/, '')}</span>
        <span className="flex items-center gap-1.5 text-bone">
          <Signal size={13} strokeWidth={1.5} />
          <Wifi size={13} strokeWidth={1.5} />
          <BatteryMedium size={16} strokeWidth={1.25} />
          <span className="num text-[11px]">{Math.round(battery * 100)}</span>
        </span>
      </div>}
      <div className="relative min-h-0 flex-1 overflow-y-auto px-5 pb-4">
        {tab === 'home' && <PhoneHome setSheet={setSheet} setTab={setTab} />}
        {tab === 'claude' && <PhoneClaude />}
        {tab === 'apps' && <PhoneApps setSheet={setSheet} />}
        {tab === 'files' && <PhoneFiles setSheet={setSheet} />}
        {tab === 'devices' && <PhoneDevices setSheet={setSheet} />}
      </div>
      {here && <MiniPlayer sessionId={here.id} />}
      {/* iOS-familiar: small text tabs, then a full-width Ask Claude field */}
      <div className="relative z-40 shrink-0 border-t border-[rgba(245,240,235,0.08)] bg-[rgba(10,8,8,0.82)] px-4 pt-2 backdrop-blur-xl" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <nav className="flex items-center justify-between">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setSheet(null) }}
              className={`h-7 rounded-full px-2.5 text-[13px] font-semibold transition-colors ${tab === t.id ? 'bg-red text-white shadow-[0_0_14px_rgba(232,36,43,0.55)]' : 'text-ash'}`}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <PhoneAsk onAsk={() => { setTab('claude'); setSheet(null) }} />
      </div>
      <AnimatePresence>{sheet && <PhoneSheet sheet={sheet} close={() => setSheet(null)} />}</AnimatePresence>
    </div>
  )
}

/** The Ask Claude field: a real input; sending shows the conversation. */
function PhoneAsk({ onAsk }: { onAsk: () => void }) {
  const [text, setText] = useState('')
  const busy = useOS((s) => s.agentBusy)
  const send = () => {
    if (!text.trim() || busy) return
    void relicRuntime.ai.ask(text)
    setText('')
    onAsk()
  }
  return (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && send()}
      enterKeyHint="send"
      placeholder={busy ? 'Working…' : 'Ask Claude'}
      aria-label="Ask Claude"
      className="mt-2 h-11 w-full rounded-[12px] bg-[rgba(118,110,110,0.2)] px-4 text-[17px] text-bone caret-[#e8242b] outline-none placeholder:text-smoke focus:shadow-[0_0_0_1px_rgba(232,36,43,0.5),0_0_20px_rgba(232,36,43,0.25)]"
    />
  )
}

function Card({ children, className = '', onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  const C = onClick ? 'button' : 'div'
  return (
    <C onClick={onClick} className={`panel block w-full p-4 text-left ${className}`}>
      {children}
    </C>
  )
}

function PhoneHome({ setSheet, setTab }: { setSheet: (s: Sheet) => void; setTab: (t: Tab) => void }) {
  const sessions = useOS((s) => s.sessions)
  const devices = useOS((s) => s.devices)
  const windows = useOS((s) => s.windows)
  const thermo = useOS((s) => s.thermostat)
  const transferring = useOS((s) => !!s.transfer)
  const recent = relicRuntime.files.recent(3)
  const others = sessions.filter((s) => s.deviceId !== PHONE)
  return (
    <div className="space-y-3 pt-3">
      <div className="px-1">
        <Wordmark size={12} />
        <div className="mt-3 text-[22px] font-light text-bone">Everything, here.</div>
        <div className="label-sm mt-1">{devices.filter((d) => d.status === 'online').length} DEVICES · ONE RELIC</div>
      </div>

      <button onClick={() => setTab('claude')} className="flex h-11 w-full items-center gap-3 rounded-[12px] border border-[var(--line-soft)] bg-white/[0.06] px-4 text-left">
        <span className="dot" />
        <span className="text-[10px] tracking-[0.14em] font-semibold text-ash">ASK CLAUDE…</span>
      </button>

      <div className="label-sm px-1 pt-2 text-red">ACTIVE ACROSS RELIC</div>
      {others.map((s) => {
        const d = devices.find((x) => x.id === s.deviceId)
        const m = getMedia(s.mediaId)
        const w = windows.find((x) => x.sessionId === s.id)
        return (
          <Card key={s.id}>
            <div className="flex gap-3">
              <div className="h-14 w-20 shrink-0 overflow-hidden border hair">
                <Art variant={m?.art ?? 'render'} className="h-full w-full" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="label-sm flex items-center gap-1.5"><Icon name={deviceIcon[d?.type ?? 'laptop']} size={10} /> {d?.name.toUpperCase()}</div>
                <div className="mt-1 truncate text-[13px] text-bone">{relicRuntime.continuity.describe(s)}</div>
                {m && <div className="num mt-0.5 text-[11px] text-ash">{s.state.playing ? 'PLAYING' : 'PAUSED'} · {fmtTime(s.position ?? 0)}</div>}
                {!m && <div className="label-sm mt-0.5">{runtimeLabel[getApp(s.appId ?? '')?.runtime ?? 'relic']} · RUNNING</div>}
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              {m ? (
                <button disabled={transferring} className="btn h-7 flex-1 text-[10px]" onClick={() => void relicRuntime.continuity.transfer(s.id, PHONE)}>CONTINUE HERE</button>
              ) : (
                w && <button className="btn h-7 flex-1 text-[10px]" onClick={() => setSheet({ kind: 'remote', windowId: w.id })}>VIEW REMOTELY</button>
              )}
              {m && <button className="btn btn-ghost h-7 px-3 text-[10px]" onClick={() => relicRuntime.media.toggle(s.id)}>{s.state.playing ? 'PAUSE' : 'PLAY'}</button>}
            </div>
          </Card>
        )
      })}

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <div className="label-sm">HOME · THERMOSTAT</div>
            <div className="num mt-1 text-[30px] font-light text-bone">{thermo.target}°</div>
            <div className="label-sm">INDOOR {thermo.indoor}°</div>
          </div>
          <div className="flex gap-2">
            <button className="btn h-9 w-9 px-0" onClick={() => relicRuntime.home.thermostat.nudge(-1, 'RELIC PHONE')} aria-label="Cooler"><Minus size={14} /></button>
            <button className="btn h-9 w-9 px-0" onClick={() => relicRuntime.home.thermostat.nudge(1, 'RELIC PHONE')} aria-label="Warmer"><Plus size={14} /></button>
          </div>
        </div>
      </Card>

      <div className="label-sm px-1 pt-2">RECENT FILES</div>
      <div className="panel">
        {recent.map((f) => (
          <button key={f.id} onClick={() => setSheet({ kind: 'file', file: f })} className="flex w-full items-center justify-between gap-3 border-b hair-faint px-4 py-3 text-left last:border-0">
            <span className="truncate text-[12px] text-bone">{f.name}</span>
            <span className="label-sm shrink-0">{fmtAgo(f.modified)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function PhoneClaude() {
  const count = useOS((s) => s.messages.length)
  return (
    <div className="flex min-h-full flex-col pt-3">
      <div className="label text-red">CLAUDE</div>
      <div className="label-sm mt-1">SAME CONVERSATION ON EVERY DEVICE</div>
      <div className="mt-4 flex-1">
        {count ? <ClaudeTranscript compact /> : <div className="mt-6 border hair"><Suggestions items={['What devices are online?', 'Set the thermostat to 70', 'Show me recent files', 'Send this to the TV']} /></div>}
      </div>
    </div>
  )
}

function PhoneApps({ setSheet }: { setSheet: (s: Sheet) => void }) {
  const installed = useOS((s) => s.installed)
  const list = appRegistry.filter((a) => installed[a.id] && !['apps', 'viewer', 'player', 'claude'].includes(a.id))
  const open = async (id: string) => {
    const app = getApp(id)!
    // phone-native apps run here; desktop-class apps stream from the laptop node
    const local = app.supportedDevices.includes('phone')
    const winId = await relicRuntime.apps.launch(id, { deviceId: local ? PHONE : 'relic-laptop' })
    if (winId) setSheet({ kind: 'remote', windowId: winId })
  }
  return (
    <div className="pt-3">
      <div className="label text-red">APPS</div>
      <div className="label-sm mt-1">DESKTOP APPS STREAM FROM RELIC LAPTOP</div>
      <div className="mt-5 grid grid-cols-4 gap-x-2 gap-y-5">
        {list.map((a) => (
          <button key={a.id} onClick={() => void open(a.id)} className="group flex flex-col items-center gap-2 p-1">
            <AppIcon id={a.id} size={62} />
            <span className="w-full truncate text-center text-[12px] font-semibold text-bone">{a.name.replace('Relic ', '')}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function PhoneFiles({ setSheet }: { setSheet: (s: Sheet) => void }) {
  const [q, setQ] = useState('')
  useOS((s) => s.files)
  const list = q.trim() ? relicRuntime.files.search(q) : relicRuntime.files.recent(10)
  return (
    <div className="pt-3">
      <div className="label text-red">FILES</div>
      <div className="relative mt-4">
        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-smoke" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="SEARCH FILES" className="field h-10 w-full pl-9" aria-label="Search files" />
      </div>
      <div className="label-sm mt-4 mb-2">{q ? `${list.length} RESULTS` : 'RECENT'}</div>
      <div className="panel">
        {list.map((f) => (
          <button key={f.id} onClick={() => setSheet({ kind: 'file', file: f })} className="flex w-full items-center gap-3 border-b hair-faint px-4 py-3 text-left last:border-0">
            <div className="h-9 w-12 shrink-0 overflow-hidden border hair"><DocPreview file={f} /></div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] text-bone">{f.name}</div>
              <div className="label-sm mt-0.5 truncate">{relicRuntime.files.path(f.parent ?? 'root')}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function PhoneDevices({ setSheet }: { setSheet: (s: Sheet) => void }) {
  const devices = useOS((s) => s.devices)
  return (
    <div className="pt-3">
      <div className="label text-red">DEVICE MESH</div>
      <div className="label-sm mt-1">{devices.length} DEVICES · {devices.filter((d) => d.status === 'online').length} ONLINE</div>
      <div className="mt-4 space-y-2">
        {devices.map((d) => (
          <button key={d.id} onClick={() => setSheet({ kind: 'device', id: d.id })} className={`panel flex w-full items-center gap-4 px-4 py-3.5 text-left ${d.id === PHONE ? 'border-red/70' : ''}`}>
            <Icon name={deviceIcon[d.type]} size={18} className={d.status === 'online' ? 'text-bone' : 'text-soot'} />
            <div className="flex-1">
              <div className="text-[11px] tracking-[0.12em] font-semibold text-bone">{d.id === PHONE ? 'THIS PHONE' : d.name.toUpperCase()}</div>
              <div className="label-sm mt-0.5">{d.location.toUpperCase()}</div>
            </div>
            <span className={`label-sm ${d.status === 'online' ? 'text-red' : ''}`}>{statusText(d)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function MiniPlayer({ sessionId }: { sessionId: string }) {
  const s = useOS((st) => st.sessions.find((x) => x.id === sessionId))
  const m = getMedia(s?.mediaId)
  if (!s || !m) return null
  return (
    <div className="relative z-30 mx-3 mb-2 flex items-center gap-3 border border-[var(--line)] bg-ink/95 px-3 py-2">
      <div className="h-9 w-14 overflow-hidden border hair"><Art variant={m.art} className="h-full w-full" /></div>
      <div className="min-w-0 flex-1">
        <div className="label-sm text-red">PLAYING ON THIS PHONE</div>
        <div className="truncate text-[12px] text-bone">{m.title} · <span className="num text-ash">{fmtTime(s.position ?? 0)}</span></div>
      </div>
      <button onClick={() => relicRuntime.media.toggle(s.id)} className="text-bone" aria-label="Play or pause">{s.state.playing ? <Pause size={16} /> : <Play size={16} />}</button>
      <div className="absolute inset-x-0 bottom-0 h-px bg-graphite"><div className="h-full bg-signal" style={{ width: `${((s.position ?? 0) / m.duration) * 100}%` }} /></div>
    </div>
  )
}

function PhoneSheet({ sheet, close }: { sheet: NonNullable<Sheet>; close: () => void }) {
  const win = useOS((s) => (sheet.kind === 'remote' ? s.windows.find((w) => w.id === sheet.windowId) : undefined))
  const device = useOS((s) => (sheet.kind === 'device' ? s.devices.find((d) => d.id === sheet.id) : undefined))
  const host = useOS((s) => s.devices.find((d) => d.id === win?.deviceId))
  useEffect(() => {
    if (sheet.kind === 'remote' && !win) close()
  }, [sheet.kind, win, close])
  return (
    <motion.div className="absolute inset-0 z-[60] flex flex-col bg-void" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}>
      <div className="flex h-12 shrink-0 items-center gap-3 border-b hair px-4 pt-6">
        <button onClick={close} className="text-ash" aria-label="Back"><ChevronLeft size={18} /></button>
        <span className="truncate text-[11px] tracking-[0.14em] font-semibold text-bone">
          {sheet.kind === 'file' ? sheet.file.name.toUpperCase() : sheet.kind === 'remote' ? getApp(win?.appId ?? '')?.name.toUpperCase() : device?.name.toUpperCase()}
        </span>
      </div>
      {sheet.kind === 'file' && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="border hair"><div className="aspect-[700/440]"><DocPreview file={sheet.file} /></div></div>
          <div className="label-sm mt-3">{relicRuntime.files.path(sheet.file.parent ?? 'root')}</div>
          <button className="btn mt-4 w-full" onClick={() => { void relicRuntime.files.open(sheet.file.id, { deviceId: 'relic-tv' }) }}>OPEN ON RELIC TV</button>
        </div>
      )}
      {sheet.kind === 'remote' && win && (
        <div className="flex min-h-0 flex-1 flex-col">
          {win.deviceId !== PHONE && (
            <div className="label-sm flex items-center gap-2 border-b hair px-4 py-2 text-red"><span className="dot pulse" /> STREAMED FROM {host?.name.toUpperCase()} · {getApp(win.appId)?.runtime === 'windows' ? 'WINDOWS APP' : 'REMOTE'}</div>
          )}
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <div className="absolute left-0 top-0 origin-top-left" style={{ width: '250%', height: '250%', transform: 'scale(0.4)' }}>
              <AppSurface win={win} />
            </div>
          </div>
        </div>
      )}
      {sheet.kind === 'device' && device && (
        <div className="flex min-h-0 flex-1 [&>aside]:w-full [&>aside]:border-l-0">
          <DeviceControl d={device} />
        </div>
      )}
    </motion.div>
  )
}
