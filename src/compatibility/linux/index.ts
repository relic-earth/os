import type { RuntimeBackend } from '../types'

/** SIMULATED Linux application sandbox (Flatpak / OCI with portals in a real build). */
export const linuxBackend: RuntimeBackend = {
  id: 'linux',
  label: 'LINUX SANDBOX',
  platform: 'LINUX',
  describe: (app) => ({ prefix: `sandbox://${app.id}`, translation: 'NATIVE · WAYLAND', gpu: 'ACCELERATED' }),
  stages: () => [
    { key: 'sandbox', label: 'SANDBOX', ms: 380 },
    { key: 'display', label: 'DISPLAY', ms: 320 },
  ],
}
