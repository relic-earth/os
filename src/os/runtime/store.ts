import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import type {
  AgentMessage,
  AppPermission,
  Automation,
  ConfirmRequest,
  PermissionState,
  RelicDevice,
  RelicFile,
  RelicNotification,
  RelicSession,
  RelicWindow,
} from '../../sdk/types'
import { seedDevices, THIS_DEVICE_ID } from '../devices/registry.mock'
import { seedFiles } from '../files/fs.mock'
import { appRegistry } from '../apps/registry'

/**
 * RELIC KERNEL STATE
 *
 * The single source of truth for the prototype. UI components read it through
 * `useOS(selector)` and mutate it only through `relicRuntime.*` services, never
 * directly. In a real Relic OS this state is owned by system daemons and
 * mirrored to the shell over the Relic Runtime IPC bus.
 */

export type Section = 'home' | 'tv' | 'movies' | 'games'
export type Skin = 'sith' | 'earth' | 'savile'
/** Each skin is a whole visual language: palette, three faces, and how the artwork is lit. */
export const SKINS: { id: Skin; name: string; note: string; swatch: string[]; fonts: [string, string, string]; bg: string }[] = [
  { id: 'sith', name: 'SITH', note: 'Black and red · Michroma, Oxanium, JetBrains Mono', swatch: ['#000', '#f5f0eb', '#ff3a40', '#7d0f14', '#b08a52'], fonts: ['Michroma', 'Oxanium', 'JetBrains Mono'], bg: 'linear-gradient(135deg,#000 0%,#1a0204 60%,#3a0609 100%)' },
  { id: 'earth', name: 'EARTH', note: 'After KOTOR · black, white, terminal green, Republic blue · Sackers Gothic, Meta, OCR A', swatch: ['#000', '#ffffff', '#6effa0', '#1e78dc', '#0c3878'], fonts: ['Copperplate', 'Fira Sans', 'Share Tech Mono'], bg: 'linear-gradient(135deg,#000 0%,#031a10 55%,#04162e 100%)' },
  { id: 'savile', name: 'SAVILE', note: 'After Kingsman · bottle green, jade, brass, ivory · Cormorant SC, Josefin Sans, IBM Plex Mono', swatch: ['#020805', '#f4f0e2', '#46dc96', '#145c3a', '#c9a85c'], fonts: ['Cormorant SC', 'Josefin Sans', 'IBM Plex Mono'], bg: 'linear-gradient(135deg,#010402 0%,#06180e 60%,#123020 100%)' },
]
export type Profile = 'relic-laptop' | 'relic-desktop' | 'relic-tv' | 'relic-phone' | 'relic-car' | 'relic-thermostat'

export interface LaunchState {
  appId: string
  runtimeLabel: string
  platform: string
  stages: { key: string; label: string; state: 'pending' | 'running' | 'done' }[]
  message: string
}

export interface TransferState {
  kind: 'app' | 'media'
  title: string
  subject: string
  from: string
  to: string
  stages: { label: string; state: 'pending' | 'running' | 'done' }[]
  done: boolean
}

export interface CompatInstance {
  appId: string
  mode: 'wine' | 'vm' | 'remote'
  status: 'ready' | 'launching' | 'running' | 'error'
  gpu: 'ACCELERATED' | 'SOFTWARE'
  prefix: string
  translation: string
  startedAt: number
  deviceId: string
}

export interface ComputerUseState {
  windowId: string
  appId: string
  phase: 'connecting' | 'active' | 'done'
  cursor: { x: number; y: number }
  target?: { x: number; y: number; w: number; h: number; label: string }
  log: string[]
  task: string
}

export interface SystemEvent {
  at: number
  kind: string
  text: string
}

export interface MemoryState {
  recentApps: { id: string; at: number }[]
  recentFiles: { id: string; at: number }[]
  deviceRelationships: { a: string; b: string; relation: string }[]
  preferences: Record<string, string>
  conversations: { id: string; title: string; at: number; turns: number }[]
}

export interface KernelState {
  booted: boolean
  profile: Profile
  section: Section
  devices: RelicDevice[]
  installed: Record<string, boolean>
  appPermissions: Record<string, Partial<Record<AppPermission, PermissionState>>>
  claudeGrants: { id: string; label: string; scope: string }[]
  windows: RelicWindow[]
  zTop: number
  files: RelicFile[]
  filesView: { folder: string; selectedId?: string; query: string; previewId?: string }
  sessions: RelicSession[]
  thermostat: {
    target: number
    indoor: number
    humidity: number
    mode: 'HEAT' | 'COOL' | 'AUTO' | 'OFF'
    fan: 'AUTO' | 'ON'
    changedAt?: number
    changedFrom?: number
    changedBy?: string
  }
  volume: number
  theme: 'relic' | 'dim'
  /** visual skin: SITH (red deck) or EARTH (KOTOR: blue, green, white) */
  skin: Skin
  /** interface scale for computer-sized screens (phones always render at 1) */
  uiScale: number
  background: 'wave' | 'chancellor' | 'horizon' | 'volcanic' | 'topographic' | 'architecture'
  notifications: RelicNotification[]
  toasts: string[]
  notificationCenterOpen: boolean
  commandOpen: boolean
  switcher: { open: boolean; index: number }
  messages: AgentMessage[]
  agentBusy: boolean
  confirm: ConfirmRequest | null
  launch: LaunchState | null
  transfer: TransferState | null
  computerUse: ComputerUseState | null
  compat: Record<string, CompatInstance>
  windowsMode: 'wine' | 'vm' | 'remote'
  cloud: { status: 'connected' | 'disconnected'; lastSync: number; pending: number }
  network: { ssid: string; online: boolean }
  automations: Automation[]
  events: SystemEvent[]
  memory: MemoryState
  claudeProvider: 'mock' | 'anthropic'
  workArea: { width: number; height: number }
}

const now = Date.now()

export const initialKernelState = (): KernelState => ({
  booted: false,
  profile: THIS_DEVICE_ID as Profile,
  section: 'home',
  devices: structuredClone(seedDevices),
  installed: Object.fromEntries(appRegistry.map((a) => [a.id, a.installed])),
  appPermissions: {
    photoshop: { files: 'allowed', gpu: 'allowed', network: 'allowed', camera: 'denied', microphone: 'denied' },
    autocad: { files: 'allowed', gpu: 'allowed', network: 'allowed', camera: 'denied', microphone: 'denied' },
    excel: { files: 'allowed', network: 'allowed', camera: 'denied', microphone: 'denied' },
    chrome: { network: 'allowed', files: 'ask', camera: 'ask', microphone: 'ask', location: 'denied' },
    blender: { files: 'allowed', gpu: 'allowed', network: 'denied' },
    vscode: { files: 'allowed', network: 'allowed' },
    spotify: { network: 'allowed', media: 'allowed', microphone: 'denied' },
    steam: { network: 'allowed', gpu: 'allowed', files: 'allowed', microphone: 'ask' },
    'relic-build': { files: 'allowed', devices: 'allowed', network: 'allowed' },
    claude: { files: 'allowed', devices: 'allowed', media: 'allowed', network: 'allowed', camera: 'denied', microphone: 'ask' },
  },
  claudeGrants: [
    { id: 'g-files', label: 'READ FILES', scope: 'HOME DIRECTORY' },
    { id: 'g-media', label: 'MEDIA CONTROL', scope: 'ALL DEVICES' },
    { id: 'g-home', label: 'HOME COMFORT', scope: 'THERMOSTAT · LIGHTING' },
  ],
  windows: [],
  zTop: 10,
  files: structuredClone(seedFiles),
  filesView: { folder: 'projects', query: '' },
  sessions: [
    {
      id: 'sess-ep3',
      mediaId: 'episode-iii',
      appId: 'player',
      position: 43 * 60 + 21,
      deviceId: 'relic-laptop',
      state: { playing: false },
      updatedAt: now,
      history: [{ deviceId: 'relic-laptop', at: now - 3600_000 }],
    },
    {
      id: 'sess-duel',
      mediaId: 'duel-of-the-fates',
      appId: 'spotify',
      position: 71,
      deviceId: 'relic-car',
      state: { playing: true },
      updatedAt: now,
      history: [{ deviceId: 'relic-car', at: now - 600_000 }],
    },
  ],
  thermostat: { target: 68, indoor: 68, humidity: 41, mode: 'HEAT', fan: 'AUTO' },
  volume: 62,
  theme: 'relic',
  uiScale: (() => {
    try {
      const v = Number(localStorage.getItem('relic.scale'))
      return v >= 1 && v <= 1.6 ? v : 1.2
    } catch {
      return 1.2
    }
  })(),
  skin: (() => {
    try {
      const v = localStorage.getItem('relic.skin')
      return v === 'earth' || v === 'savile' ? v : 'sith'
    } catch {
      return 'sith'
    }
  })() as Skin,
  background: 'wave',
  notifications: [],
  toasts: [],
  notificationCenterOpen: false,
  commandOpen: false,
  switcher: { open: false, index: 0 },
  messages: [],
  agentBusy: false,
  confirm: null,
  launch: null,
  transfer: null,
  computerUse: null,
  compat: {},
  windowsMode: 'wine',
  cloud: { status: 'connected', lastSync: now, pending: 0 },
  network: { ssid: 'RELIC-MESH', online: true },
  automations: [
    { id: 'auto-1', name: 'Arrive Home', trigger: 'RELIC CAR · ENTERS GARAGE', action: 'LIGHTS 60% · THERMOSTAT 70°', enabled: true, createdBy: 'user' },
    { id: 'auto-2', name: 'Cinema', trigger: 'RELIC TV · PLAYBACK STARTS', action: 'LIGHTS 10% · DO NOT DISTURB', enabled: true, createdBy: 'claude' },
    { id: 'auto-3', name: 'Night', trigger: '23:00 DAILY', action: 'LOCK DOORS · THERMOSTAT 66°', enabled: false, createdBy: 'user' },
  ],
  events: [],
  memory: {
    recentApps: [
      { id: 'files', at: now - 3 * 3600_000 },
      { id: 'excel', at: now - 26 * 3600_000 },
    ],
    recentFiles: [
      { id: 'arch-pdf', at: now - 8 * 3600_000 },
      { id: 'fin-model', at: now - 26 * 3600_000 },
    ],
    deviceRelationships: [
      { a: 'relic-laptop', b: 'relic-tv', relation: 'PREFERRED DISPLAY' },
      { a: 'relic-phone', b: 'relic-car', relation: 'DRIVER PROFILE' },
      { a: 'relic-home', b: 'relic-thermostat', relation: 'CLIMATE ZONE' },
    ],
    preferences: { units: 'FAHRENHEIT', comfort: '68–70°', 'preferred display': 'RELIC TV' },
    conversations: [
      { id: 'c-1', title: 'Permit set revisions', at: now - 2 * 86400_000, turns: 8 },
      { id: 'c-2', title: 'Iceland trip', at: now - 9 * 86400_000, turns: 14 },
    ],
  },
  claudeProvider: 'mock',
  workArea: { width: 1200, height: 700 },
})

export const useOS = create<KernelState>()(() => initialKernelState())

/** Selector hook for derived lists/objects — shallow-compared so a fresh array doesn't re-render forever. */
export const useOSShallow = <T,>(selector: (s: KernelState) => T) => useOS(useShallow(selector))

export const getOS = () => useOS.getState()
export const setOS = (patch: Partial<KernelState> | ((s: KernelState) => Partial<KernelState>)) =>
  useOS.setState(patch as never)

export const uid = (p = 'id') => `${p}-${Math.random().toString(36).slice(2, 9)}`
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
