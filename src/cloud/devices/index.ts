import { getOS } from '../../os/runtime/store'
import { cloudCall } from '../api'

/** cloud.devices — remote access to mesh nodes outside the local network (MOCK). */
export const cloudDevices = {
  registry: () => cloudCall(() => getOS().devices.map((d) => ({ id: d.id, fingerprint: d.identity.fingerprint }))),
  remoteReachable: (id: string) => cloudCall(() => getOS().devices.some((d) => d.id === id && d.status === 'online')),
}
