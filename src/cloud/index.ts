import { getOS, setOS, sleep } from '../os/runtime/store'
import { logEvent, notifications } from '../os/notifications/service'
import { cloudIdentity } from './identity'
import { cloudDevices } from './devices'
import { cloudStorage } from './storage'
import { cloudAi } from './ai'

/**
 * RELIC CLOUD (MOCK)
 * Identity · Devices · AI · Storage · Synchronization · App Store · Remote Access · Automations
 * The local OS keeps working when this is disconnected; sync queues until it returns.
 */
export const cloudSync = {
  status: () => getOS().cloud,
  async syncNow() {
    if (getOS().cloud.status !== 'connected') return false
    await sleep(900)
    setOS((s) => ({ cloud: { ...s.cloud, lastSync: Date.now(), pending: 0 } }))
    notifications.push({ source: 'RELIC CLOUD', title: 'CLOUD SYNC COMPLETE', body: `${getOS().devices.length} devices · sessions · settings`, icon: 'cloud' })
    return true
  },
  setConnected(connected: boolean) {
    setOS((s) => ({ cloud: { ...s.cloud, status: connected ? 'connected' : 'disconnected' } }))
    logEvent('cloud', connected ? 'Relic Cloud reconnected' : 'Relic Cloud disconnected — running local')
    notifications.push({
      source: 'RELIC CLOUD',
      title: connected ? 'CLOUD CONNECTED' : 'CLOUD UNAVAILABLE',
      body: connected ? 'Queued changes synchronizing' : 'Relic continues locally · Claude on-device routing',
      level: connected ? 'info' : 'warning',
      icon: 'cloud',
    })
    if (connected) void cloudSync.syncNow()
  },
  queue() {
    if (getOS().cloud.status !== 'connected') setOS((s) => ({ cloud: { ...s.cloud, pending: s.cloud.pending + 1 } }))
  },
}

export const cloud = {
  identity: cloudIdentity,
  devices: cloudDevices,
  ai: cloudAi,
  storage: cloudStorage,
  sync: cloudSync,
  services: ['IDENTITY', 'DEVICES', 'AI', 'STORAGE', 'SYNCHRONIZATION', 'APP STORE', 'REMOTE ACCESS', 'AUTOMATIONS'],
}
