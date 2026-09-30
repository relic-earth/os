import type { RelicDevice } from '../../sdk/types'
import { getOS, sleep } from '../../os/runtime/store'
import { devices } from '../../os/devices/service'
import { notifications } from '../../os/notifications/service'

/**
 * Mesh discovery — mDNS / BLE / Thread beacons in a real build.
 * SIMULATED: resolves against the device registry with realistic latency.
 */
export const meshDiscovery = {
  async locate(deviceId: string): Promise<RelicDevice | undefined> {
    await sleep(420)
    return getOS().devices.find((d) => d.id === deviceId)
  },
  /** Wake-on-mesh for sleeping devices. */
  async wake(deviceId: string): Promise<boolean> {
    const d = devices.get(deviceId)
    if (!d) return false
    if (d.status === 'online') return true
    devices.setStatus(deviceId, 'connecting')
    await sleep(1300)
    devices.setStatus(deviceId, 'online', d.type === 'desktop' ? 'connected' : d.presence)
    notifications.push({ source: 'RELIC MESH', title: `${d.name.toUpperCase()} CONNECTED`, body: 'Woken over the mesh · identity verified', icon: 'link' })
    return true
  },
  async scan(): Promise<number> {
    await sleep(900)
    return getOS().devices.length
  },
}
