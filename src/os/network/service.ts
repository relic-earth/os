import { getOS } from '../runtime/store'
import { cloudSync } from '../../cloud'

/** Network service — local link + mesh + cloud reachability. */
export const network = {
  status() {
    const s = getOS()
    const online = s.devices.filter((d) => d.status === 'online').length
    return {
      local: 'READY' as const,
      link: s.network.online ? 'CONNECTED' : 'OFFLINE',
      ssid: s.network.ssid,
      cloud: s.cloud.status === 'connected' ? 'CONNECTED' : 'DISCONNECTED',
      mesh: { devices: s.devices.length, online },
    }
  },
  setCloud: (connected: boolean) => cloudSync.setConnected(connected),
}
