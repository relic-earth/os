/**
 * RELIC SDK — public types.
 *
 * These are the contracts between the Relic Experience (UI), the Claude system
 * agent and the Relic Runtime. Every service in the prototype implements one of
 * these interfaces with a mock; a real Relic OS build swaps the implementation
 * (systemd services, Wayland compositor, Wine/VM backends, mesh daemon) without
 * touching the UI.
 */

/* ── Devices / mesh ─────────────────────────────────────────────────────── */

export type DeviceType = 'desktop' | 'laptop' | 'phone' | 'tv' | 'car' | 'thermostat' | 'home'
export type DeviceStatus = 'online' | 'offline' | 'connecting'
export type Presence = 'local' | 'nearby' | 'connected' | 'remote' | 'sleeping'

export type Capability =
  | 'display'
  | 'large-display'
  | 'audio'
  | 'video'
  | 'remote-input'
  | 'keyboard'
  | 'touch'
  | 'camera'
  | 'gps'
  | 'microphone'
  | 'cellular'
  | 'climate'
  | 'navigation'
  | 'temperature'
  | 'fan'
  | 'compute'
  | 'gpu'
  | 'storage'
  | 'windows-runtime'
  | 'lighting'
  | 'locks'
  | 'security'

export interface DeviceIdentity {
  /** stable mesh identity (would be an Ed25519 public key fingerprint) */
  fingerprint: string
  trust: 'verified' | 'pending' | 'revoked'
  enrolled: string
}

export interface DeviceNetwork {
  transport: 'wifi' | 'ethernet' | 'cellular' | 'thread' | 'lte'
  address: string
  latencyMs: number
  signal: number // 0-1
}

export interface RelicDevice {
  id: string
  name: string
  type: DeviceType
  status: DeviceStatus
  presence: Presence
  location: string
  identity: DeviceIdentity
  capabilities: Capability[]
  network: DeviceNetwork
  lastSeen: number
  hardware: string
  battery?: number
  /** free-form per-device state (volume, power, charge, locks...) */
  state: Record<string, unknown>
}

/* ── Applications ──────────────────────────────────────────────────────── */

export type AppRuntime = 'relic' | 'linux' | 'windows' | 'web' | 'vm'
export type AppPermission =
  | 'files'
  | 'gpu'
  | 'network'
  | 'camera'
  | 'microphone'
  | 'devices'
  | 'media'
  | 'location'
  | 'system'

export interface RelicApplication {
  id: string
  name: string
  /** lucide icon key, resolved by the shell */
  icon: string
  runtime: AppRuntime
  version: string
  publisher: string
  permissions: AppPermission[]
  supportedDevices: DeviceType[]
  installed: boolean
  /** shell-owned apps that are part of the base system */
  system?: boolean
  category: 'system' | 'creative' | 'productivity' | 'engineering' | 'media' | 'games' | 'developer'
  sizeMB: number
  defaultSize?: { width: number; height: number }
  opens?: string[] // file extensions
}

export type PermissionState = 'allowed' | 'denied' | 'ask'

/* ── Compositor ────────────────────────────────────────────────────────── */

export interface RelicWindow {
  id: string
  appId: string
  title: string
  deviceId: string
  x: number
  y: number
  width: number
  height: number
  z: number
  minimized: boolean
  maximized: boolean
  focused: boolean
  sessionId?: string
  props?: Record<string, unknown>
}

/* ── Files ─────────────────────────────────────────────────────────────── */

export interface RelicFile {
  id: string
  name: string
  kind: 'folder' | 'file'
  parent: string | null
  ext?: string
  size?: number
  modified: number
  created: number
  owner?: string
  tags?: string[]
  /** simulated content / preview meta */
  meta?: Record<string, string | number>
}

/* ── Media ─────────────────────────────────────────────────────────────── */

export interface MediaItem {
  id: string
  title: string
  subtitle: string
  kind: 'film' | 'series' | 'track' | 'channel' | 'game'
  duration: number
  art: string
  year?: number
}

/* ── Sessions / continuity ─────────────────────────────────────────────── */

export interface RelicSession {
  id: string
  appId?: string
  mediaId?: string
  position?: number
  deviceId: string
  state: Record<string, unknown>
  updatedAt: number
  history: { deviceId: string; at: number }[]
}

/* ── Notifications ─────────────────────────────────────────────────────── */

export interface RelicNotification {
  id: string
  source: string
  title: string
  body?: string
  level: 'info' | 'active' | 'warning'
  at: number
  read: boolean
  icon?: string
}

/* ── Automations ───────────────────────────────────────────────────────── */

export interface Automation {
  id: string
  name: string
  trigger: string
  action: string
  enabled: boolean
  createdBy: 'user' | 'claude'
}

/* ── Agent ─────────────────────────────────────────────────────────────── */

export type RiskLevel = 'read' | 'low' | 'sensitive' | 'system'

export interface ToolDefinition<I = Record<string, unknown>> {
  name: string
  description: string
  risk: RiskLevel
  input_schema: {
    type: 'object'
    properties: Record<string, { type: string; description?: string; enum?: string[] }>
    required?: string[]
  }
  /** human label used by the execution panel */
  label: (input: I) => string
}

export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResult {
  tool_use_id: string
  ok: boolean
  content: string
  data?: unknown
}

export interface ExecutionStep {
  id: string
  label: string
  state: 'running' | 'done' | 'failed' | 'waiting'
}

export type ChatRole = 'user' | 'assistant'

export interface AgentMessage {
  id: string
  role: ChatRole
  text: string
  at: number
  /** steps shown in the tool-execution panel for this turn */
  steps?: ExecutionStep[]
  /** short status line for the execution panel ("Finding your permit plans…") */
  activity?: string
  route?: IntentRoute
  streaming?: boolean
  offline?: boolean
}

export type IntentRoute = 'native' | 'app' | 'files' | 'device' | 'claude' | 'confirm'

export interface ConfirmRequest {
  id: string
  risk: RiskLevel
  tool: string
  title: string
  subject: string
  detail?: string
  permissions?: string[]
  resolve: (ok: boolean) => void
}

/* ── System context handed to the model ────────────────────────────────── */

export interface SystemContext {
  now: number
  thisDevice: string
  focused?: { appId: string; title: string; sessionId?: string }
  /** what “this” refers to: the top-most window with a session, else the current video */
  activeSession?: { id: string; title: string; kind: 'app' | 'media' }
  devices: Pick<RelicDevice, 'id' | 'name' | 'type' | 'status' | 'capabilities' | 'state' | 'location'>[]
  sessions: RelicSession[]
  thermostat: { target: number; indoor: number; mode: string; changedAt?: number; changedFrom?: number }
  recentFiles: string[]
  recentApps: string[]
  installedApps: string[]
  cloud: 'connected' | 'disconnected'
}
