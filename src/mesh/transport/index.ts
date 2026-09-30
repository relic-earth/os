import { getOS, sleep } from '../../os/runtime/store'

/**
 * Mesh transport — encrypted point-to-point channel between devices
 * (QUIC over LAN / relay in a real build). SIMULATED: latency only.
 */
export const meshTransport = {
  async send(deviceId: string, _payload: unknown): Promise<{ ok: boolean; latencyMs: number }> {
    const d = getOS().devices.find((x) => x.id === deviceId)
    const latencyMs = d?.network.latencyMs ?? 50
    await sleep(300 + latencyMs * 4)
    return { ok: !!d && d.status === 'online', latencyMs }
  },
}
