import { cloudCall } from '../api'

/** cloud.identity — Relic ID account + device enrollment (MOCK). */
export const cloudIdentity = {
  account: () => ({ id: 'relic-id:h', name: 'H', plan: 'RELIC ONE', enrolledDevices: 7 }),
  refresh: () => cloudCall(() => ({ token: 'mock-session-token', expiresIn: 3600 })),
}
