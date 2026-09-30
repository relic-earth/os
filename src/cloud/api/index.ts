import { getOS, sleep } from '../../os/runtime/store'

/**
 * Relic Cloud API client. MOCK — every call resolves locally with latency.
 * The OS never depends on it: all calls are optional and fail soft when the
 * cloud is unreachable (offline-first).
 */
export class CloudUnavailable extends Error {
  constructor() {
    super('RELIC CLOUD UNAVAILABLE')
  }
}

export async function cloudCall<T>(fn: () => T, latency = 180): Promise<T> {
  await sleep(latency)
  if (getOS().cloud.status !== 'connected') throw new CloudUnavailable()
  return fn()
}

export const cloudAvailable = () => getOS().cloud.status === 'connected'
