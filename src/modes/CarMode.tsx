import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Play, Pause, SkipBack, SkipForward, Phone, Navigation, Lock, Unlock, Wind, Snowflake, Flame, Fan, Minus, Plus } from 'lucide-react'
import { useOS } from '../os/runtime/store'
import { relicRuntime } from '../os/runtime/relicRuntime'
import { getMedia, fmtTime, mediaLibrary } from '../os/media/library'
import { appRegistry } from '../os/apps/registry'
import { Art } from '../ui/Art'
import { Icon } from '../ui/Icon'
import { fmtClock, useNow, Wordmark } from '../ui/primitives'
import { DeviceSwitcher } from '../os/shell/TopBar'
import { ClaudeInput, ClaudeTranscript, Suggestions } from '../apps/claude/ClaudePanel'

type Pane = 'drive' | 'maps' | 'media' | 'calls' | 'apps' | 'vehicle' | 'claude'
const RAIL: Pane[] = ['drive', 'maps', 'media', 'calls', 'apps', 'vehicle', 'claude']
const CAR = 'relic-car'
const ROUTE = 'M120 520 L120 420 C120 380 150 360 190 360 L420 360 C460 360 480 340 480 300 L480 180 C480 150 500 130 530 130 L760 130'

/** RELIC DRIVE — the car profile. Simulation only: no vehicle is controlled. */
export function CarMode() {
  const [pane, setPane] = useState<Pane>('drive')
  const now = useNow(15_000)
  const car = useOS((s) => s.devices.find((d) => d.id === CAR)!)
  const st = car.state as Record<string, number | boolean>
  return (
    <div className="relative flex h-full w-full overflow-hidden bg-void text-bone">
      <div className="grain" />
      {/* rail */}
      <nav className="relative z-10 flex w-[150px] shrink-0 flex-col border-r hair bg-void/80">
        <div className="px-6 pb-8 pt-7"><Wordmark size={12} /><div className="label-sm mt-2 text-red">DRIVE</div></div>
        {RAIL.map((p) => (
          <button key={p} onClick={() => setPane(p)} className={`relative flex h-12 items-center px-6 text-left text-[11px] tracking-[0.34em] ${pane === p ? 'lit text-bone' : 'text-ash hover:text-bone'}`}>
            {p.toUpperCase()}
          </button>
        ))}
        <div className="mt-auto p-4"><DeviceSwitcher align="left" compact /></div>
      </nav>

      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* top strip */}
        <div className="flex h-14 shrink-0 items-center gap-8 border-b hair px-8">
          <span className="num text-[26px] font-light">38</span>
          <span className="label-sm -ml-6">MPH</span>
          <span className="text-[13px] tracking-[0.3em] text-signal">D</span>
          <span className="label-sm">RANGE <span className="num text-bone">{String(st.range)} MI</span></span>
          <span className="label-sm">CHARGE <span className="num text-bone">{Math.round((car.battery ?? 0) * 100)}%</span></span>
          <span className="label-sm ml-auto flex items-center gap-2"><span className="dot" /> RELIC CAR · CONNECTED</span>
          <span className="num text-[15px] tracking-[0.1em]">{fmtClock(now)}</span>
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="relative min-w-0 flex-1">
            <AnimatePresence mode="wait">
              <motion.div key={pane} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {(pane === 'drive' || pane === 'maps') && <MapPane detailed={pane === 'maps'} />}
                {pane === 'media' && <MediaPane />}
                {pane === 'calls' && <CallsPane />}
                {pane === 'apps' && <AppsPane />}
                {pane === 'vehicle' && <VehiclePane />}
                {pane === 'claude' && <ClaudePane />}
              </motion.div>
            </AnimatePresence>
          </div>
          <NowPlaying />
        </div>

        <ClimateBar />
      </div>
    </div>
  )
}

function MapPane({ detailed }: { detailed: boolean }) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <svg viewBox="0 0 900 600" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
        <rect width="900" height="600" fill="#060505" />
        {Array.from({ length: 16 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 60 + (i % 3) * 7} y1="0" x2={i * 60 - 30} y2="600" stroke="#1d1818" strokeWidth={i % 4 === 0 ? 3 : 1} />
        ))}
        {Array.from({ length: 11 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 60 + (i % 2) * 9} x2="900" y2={i * 60 + 20} stroke="#1d1818" strokeWidth={i % 3 === 0 ? 3 : 1} />
        ))}
        <path d="M0 250 C 200 230, 300 290, 520 250 S 800 200, 900 230" stroke="#241c1c" strokeWidth="10" fill="none" />
        <path d="M600 600 C 620 420, 700 350, 900 330" stroke="#140f0f" strokeWidth="40" fill="none" />
        <path d={ROUTE} stroke="#7d0f14" strokeWidth="9" fill="none" strokeLinecap="round" />
        <path d={ROUTE} stroke="#e8242b" strokeWidth="3" fill="none" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 6px rgba(232,36,43,0.9))' }} />
        <circle cx="760" cy="130" r="9" fill="none" stroke="#ebe5df" strokeWidth="1.5" />
        <circle cx="760" cy="130" r="3" fill="#ebe5df" />
        <g>
          <circle r="11" fill="#e8242b" opacity="0.25">
            <animateMotion dur="40s" repeatCount="indefinite" path={ROUTE} />
          </circle>
          <circle r="5" fill="#ebe5df">
            <animateMotion dur="40s" repeatCount="indefinite" path={ROUTE} />
          </circle>
        </g>
        {detailed && ['RIDGE RD', 'CANYON AVE', 'OBSIDIAN WAY'].map((t, i) => (
          <text key={t} x={150 + i * 220} y={345 - i * 110} fill="#6d6561" fontSize="10" letterSpacing="3">{t}</text>
        ))}
      </svg>
      <div className="panel ticks absolute left-6 top-6 flex items-center gap-5 px-5 py-4">
        <Navigation size={26} strokeWidth={1.25} className="-rotate-45 text-signal" />
        <div>
          <div className="num text-[24px] font-light">0.4 MI</div>
          <div className="label mt-0.5 text-bone">TURN LEFT · RIDGE RD</div>
        </div>
      </div>
      <div className="panel absolute bottom-6 left-6 flex gap-8 px-5 py-3">
        <div><div className="label-sm">ARRIVAL</div><div className="num mt-1 text-[15px]">7:52</div></div>
        <div><div className="label-sm">REMAINING</div><div className="num mt-1 text-[15px]">14 MIN</div></div>
        <div><div className="label-sm">DESTINATION</div><div className="mt-1 text-[11px] tracking-[0.24em]">RELIC HOUSE</div></div>
      </div>
    </div>
  )
}

function NowPlaying() {
  const audio = useOS((s) => s.sessions.find((x) => x.deviceId === CAR && x.mediaId && getMedia(x.mediaId)?.kind === 'track'))
  const video = useOS((s) => s.sessions.find((x) => x.mediaId === 'episode-iii'))
  const m = getMedia(audio?.mediaId)
  return (
    <aside className="flex w-[300px] shrink-0 flex-col border-l hair bg-void/60 p-6">
      <div className="label text-red">NOW PLAYING</div>
      {audio && m ? (
        <>
          <div className="mt-5 aspect-square w-full overflow-hidden border hair"><Art variant={m.art} className="h-full w-full" /></div>
          <div className="mt-5 text-[20px] font-light tracking-[0.06em]">{m.title}</div>
          <div className="mt-1 text-[12px] tracking-[0.14em] text-ash">{m.subtitle}</div>
          <div className="bar mt-5"><i style={{ width: `${((audio.position ?? 0) / m.duration) * 100}%` }} /></div>
          <div className="mt-2 flex justify-between"><span className="num text-[10px] text-ash">{fmtTime(audio.position ?? 0)}</span><span className="num text-[10px] text-smoke">{fmtTime(m.duration)}</span></div>
          <div className="mt-5 flex items-center justify-center gap-8">
            <button onClick={() => relicRuntime.media.seek(audio.id, 0)} aria-label="Restart"><SkipBack size={18} strokeWidth={1.25} className="text-ash" /></button>
            <button onClick={() => relicRuntime.media.toggle(audio.id)} className="flex h-12 w-12 items-center justify-center border border-red/70 hover:shadow-[var(--glow)]" aria-label="Play or pause">
              {audio.state.playing ? <Pause size={18} strokeWidth={1.5} /> : <Play size={18} strokeWidth={1.5} />}
            </button>
            <button onClick={() => relicRuntime.media.play('battle-heroes', CAR)} aria-label="Next"><SkipForward size={18} strokeWidth={1.25} className="text-ash" /></button>
          </div>
        </>
      ) : (
        <button className="btn mt-5" onClick={() => relicRuntime.media.play('duel-of-the-fates', CAR)}>PLAY DUEL OF THE FATES</button>
      )}
      {video && (
        <div className="mt-auto border-t hair pt-4">
          <div className="label-sm">EPISODE III · {fmtTime(video.position ?? 0)}</div>
          <div className="label-sm mt-1 text-soot">VIDEO AVAILABLE WHEN PARKED · ON {video.deviceId.replace('relic-', 'RELIC ').toUpperCase()}</div>
        </div>
      )}
    </aside>
  )
}

function ClimateBar() {
  const car = useOS((s) => s.devices.find((d) => d.id === CAR)!)
  const st = car.state as Record<string, number | boolean>
  const set = (p: Record<string, unknown>) => relicRuntime.devices.setState(CAR, p)
  const btn = (label: string, on: boolean, onClick: () => void, IconC: typeof Wind) => (
    <button onClick={onClick} className={`flex h-full flex-1 flex-col items-center justify-center gap-1.5 border-l hair ${on ? 'bg-burgundy/60 text-bone' : 'text-ash hover:text-bone'}`}>
      <IconC size={17} strokeWidth={1.25} className={on ? 'text-signal' : ''} />
      <span className="text-[9px] tracking-[0.32em]">{label}</span>
    </button>
  )
  return (
    <div className="flex h-[84px] shrink-0 items-stretch border-t hair bg-void/90">
      <div className="flex w-[260px] items-center justify-center gap-5">
        <button className="btn h-9 w-9 px-0" onClick={() => set({ cabin: Number(st.cabin) - 1 })} aria-label="Cooler"><Minus size={14} /></button>
        <div className="text-center">
          <div className="num text-[30px] font-light leading-none">{String(st.cabin)}°</div>
          <div className="label-sm mt-1">CABIN</div>
        </div>
        <button className="btn h-9 w-9 px-0" onClick={() => set({ cabin: Number(st.cabin) + 1 })} aria-label="Warmer"><Plus size={14} /></button>
      </div>
      {btn('SEAT', Number(st.seatHeat) > 0, () => set({ seatHeat: (Number(st.seatHeat) + 1) % 4 }), Flame)}
      {btn('DEFROST', !!st.defrost, () => set({ defrost: !st.defrost }), Snowflake)}
      {btn(`FAN ${String(st.fan)}`, Number(st.fan) > 0, () => set({ fan: (Number(st.fan) + 1) % 6 }), Fan)}
      {btn('CLIMATE', true, () => void relicRuntime.ai.ask('Precondition the car climate to 70'), Wind)}
    </div>
  )
}

function MediaPane() {
  const tracks = mediaLibrary.filter((m) => m.kind === 'track')
  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="label text-red">MEDIA · RELIC CAR</div>
      <div className="mt-6 space-y-2">
        {tracks.map((t) => (
          <button key={t.id} onClick={() => relicRuntime.media.play(t.id, CAR)} className="panel flex w-full items-center gap-5 px-5 py-4 text-left hover:border-[var(--line)]">
            <div className="h-12 w-12 overflow-hidden border hair"><Art variant={t.art} className="h-full w-full" /></div>
            <div className="flex-1"><div className="text-[15px]">{t.title}</div><div className="label-sm mt-1">{t.subtitle}</div></div>
            <span className="num text-[11px] text-ash">{fmtTime(t.duration)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function CallsPane() {
  const calls = [['Studio', 'RELIC PHONE · 2 MIN AGO'], ['Builder · Site Lead', 'YESTERDAY'], ['Home', 'YESTERDAY']]
  return (
    <div className="h-full p-8">
      <div className="label text-red">CALLS · VIA RELIC PHONE</div>
      <div className="mt-6 space-y-2">
        {calls.map(([n, t]) => (
          <div key={n} className="panel flex items-center gap-5 px-5 py-4">
            <Phone size={16} strokeWidth={1.25} className="text-red" />
            <div className="flex-1"><div className="text-[15px]">{n}</div><div className="label-sm mt-1">{t}</div></div>
            <button className="btn">CALL</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function AppsPane() {
  const list = appRegistry.filter((a) => a.supportedDevices.includes('car') && !['apps', 'viewer', 'player'].includes(a.id))
  return (
    <div className="h-full p-8">
      <div className="label text-red">APPS · DRIVE-SAFE</div>
      <div className="mt-6 grid grid-cols-3 gap-3">
        {list.map((a) => (
          <div key={a.id} className="panel flex aspect-[4/3] flex-col items-center justify-center gap-3">
            <Icon name={a.icon} size={24} />
            <span className="text-[10px] tracking-[0.3em]">{a.name.replace('Relic ', '').toUpperCase()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function VehiclePane() {
  const car = useOS((s) => s.devices.find((d) => d.id === CAR)!)
  const st = car.state as Record<string, number | boolean>
  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="label text-red">VEHICLE</div>
      <div className="mt-6 grid grid-cols-3 gap-px border hair bg-[var(--line-faint)]">
        {[['CHARGE', `${Math.round((car.battery ?? 0) * 100)}%`], ['RANGE', `${st.range} MI`], ['CABIN', `${st.cabin}°`], ['TIRES', '42 · 42 · 41 · 42 PSI'], ['ODOMETER', '8,214 MI'], ['SOFTWARE', 'RELIC DRIVE 0.1']].map(([k, v]) => (
          <div key={k} className="bg-ink px-5 py-5"><div className="label-sm">{k}</div><div className="num mt-2 text-[16px] font-light">{v}</div></div>
        ))}
      </div>
      <div className="mt-6 flex gap-3">
        <button className="btn" onClick={() => void relicRuntime.ai.ask(st.locked ? 'Unlock the car' : 'Lock the car')}>
          {st.locked ? <Lock size={12} /> : <Unlock size={12} />} {st.locked ? 'LOCKED' : 'UNLOCKED'} · VIA CLAUDE
        </button>
      </div>
      <div className="label-sm mt-4 text-soot">VEHICLE CONTROLS ARE SYSTEM-LEVEL · CLAUDE REQUIRES CONFIRMATION · SIMULATION ONLY</div>
    </div>
  )
}

function ClaudePane() {
  const count = useOS((s) => s.messages.length)
  return (
    <div className="flex h-full flex-col p-8">
      <div className="label text-red">CLAUDE</div>
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        {count ? <ClaudeTranscript compact /> : <div className="border hair"><Suggestions items={['Set the thermostat to 70', 'Precondition the car climate to 70', 'What devices are online?', 'Play Duel of the Fates in the car']} /></div>}
      </div>
      <div className="pt-4"><ClaudeInput /></div>
    </div>
  )
}
