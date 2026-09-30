import { getOS, sleep } from '../../os/runtime/store'

/**
 * Mesh identity — every Relic device holds a hardware-bound key pair; peers
 * authenticate with a signed challenge before any state crosses the mesh.
 * SIMULATED: verification is a delay plus a trust-state check.
 */
export const meshIdentity = {
  async authenticate(deviceId: string): Promise<boolean> {
    await sleep(380)
    const d = getOS().devices.find((x) => x.id === deviceId)
    return !!d && d.identity.trust === 'verified'
  },
  fingerprint(deviceId: string) {
    return getOS().devices.find((x) => x.id === deviceId)?.identity.fingerprint ?? '—'
  },
}
