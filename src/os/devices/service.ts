import type { Capability, RelicDevice } from '../../sdk/types'
import { getOS, setOS } from '../runtime/store'
import { logEvent, notifications } from '../notifications/service'
import { THIS_DEVICE_ID } from './registry.mock'

/** Device registry service — backed by the mesh (see src/mesh). */
export interface DeviceService {
  thisDevice(): RelicDevice
  list(): RelicDevice[]
  get(id: string): RelicDevice | undefined
  find(query: string): RelicDevice | undefined
  withCapability(cap: Capability): RelicDevice[]
  online(): RelicDevice[]
  setState(id: string, patch: Record<string, unknown>): void
  setStatus(id: string, status: RelicDevice['status'], presence?: RelicDevice['presence']): void
}

const aliases: [RegExp, string][] = [
  [/\b(tv|television|living room|big screen)\b/, 'relic-tv'],
  [/\b(phone|mobile|iphone)\b/, 'relic-phone'],
  [/\b(car|drive|vehicle)\b/, 'relic-car'],
  [/\b(laptop|this computer|here)\b/, 'relic-laptop'],
  [/\b(desktop|office|workstation)\b/, 'relic-desktop'],
  [/\b(thermostat)\b/, 'relic-thermostat'],
  [/\b(home|house|hub)\b/, 'relic-home'],
]

export const devices: DeviceService = {
  thisDevice: () => devices.get(THIS_DEVICE_ID)!,
  list: () => getOS().devices,
  get: (id) => getOS().devices.find((d) => d.id === id),
  find(query) {
    const q = query.toLowerCase()
    const direct = getOS().devices.find((d) => d.id === q || d.name.toLowerCase() === q)
    if (direct) return direct
    for (const [re, id] of aliases) if (re.test(q)) return devices.get(id)
    return undefined
  },
  withCapability: (cap) => getOS().devices.filter((d) => d.capabilities.includes(cap)),
  online: () => getOS().devices.filter((d) => d.status === 'online'),
  setState(id, patch) {
    setOS((s) => ({ devices: s.devices.map((d) => (d.id === id ? { ...d, state: { ...d.state, ...patch }, lastSeen: Date.now() } : d)) }))
  },
  setStatus(id, status, presence) {
    setOS((s) => ({
      devices: s.devices.map((d) => (d.id === id ? { ...d, status, presence: presence ?? d.presence, lastSeen: Date.now() } : d)),
    }))
  },
}

/** Home service — thermostat + home hub. MOCK: no real HVAC is controlled. */
export interface HomeService {
  thermostat: {
    get(): ReturnType<typeof getOS>['thermostat']
    setTemperature(target: number, by?: string): number
    nudge(delta: number, by?: string): number
    setFan(fan: 'AUTO' | 'ON'): void
    setMode(mode: 'HEAT' | 'COOL' | 'AUTO' | 'OFF'): void
  }
  setLights(level: number): void
}

let tempNotifyTimer: ReturnType<typeof setTimeout> | undefined

export const home: HomeService = {
  thermostat: {
    get: () => getOS().thermostat,
    setTemperature(target, by = 'THERMOSTAT') {
      const t = Math.max(50, Math.min(90, Math.round(target)))
      const prev = getOS().thermostat
      if (t === prev.target) return t
      const changedFrom = prev.changedAt && Date.now() - prev.changedAt < 8000 && prev.changedFrom != null ? prev.changedFrom : prev.target
      setOS((s) => ({ thermostat: { ...s.thermostat, target: t, changedAt: Date.now(), changedFrom, changedBy: by } }))
      devices.setState('relic-thermostat', { target: t })
      // debounce notifications while the user is spinning the dial
      clearTimeout(tempNotifyTimer)
      tempNotifyTimer = setTimeout(() => {
        const th = getOS().thermostat
        notifications.push({ source: 'RELIC THERMOSTAT', title: `THERMOSTAT CHANGED TO ${th.target}°`, body: `From ${th.changedFrom}° · ${th.changedBy}`, icon: 'thermometer' })
        logEvent('home', `Thermostat changed from ${th.changedFrom}° to ${th.target}° via ${th.changedBy}`)
      }, 900)
      return t
    },
    nudge(delta, by) {
      return home.thermostat.setTemperature(getOS().thermostat.target + delta, by)
    },
    setFan(fan) {
      setOS((s) => ({ thermostat: { ...s.thermostat, fan } }))
      logEvent('home', `Thermostat fan ${fan}`)
    },
    setMode(mode) {
      setOS((s) => ({ thermostat: { ...s.thermostat, mode } }))
      logEvent('home', `Thermostat mode ${mode}`)
    },
  },
  setLights(level) {
    devices.setState('relic-home', { lights: Math.max(0, Math.min(1, level)) })
  },
}
