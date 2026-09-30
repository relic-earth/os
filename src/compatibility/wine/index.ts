import type { RuntimeBackend } from '../types'

/** SIMULATED Wine compatibility layer backend. */
export const wineBackend: RuntimeBackend = {
  id: 'wine',
  label: 'WINE COMPATIBILITY LAYER',
  platform: 'WINDOWS',
  describe: (app) => ({
    prefix: `~/.relic/prefixes/${app.id}`,
    translation: 'DIRECTX 12 → VULKAN (VKD3D)',
    gpu: 'ACCELERATED',
  }),
  stages: () => [
    { key: 'prefix', label: 'PREFIX', ms: 520 },
    { key: 'gpu', label: 'GPU', ms: 620 },
    { key: 'files', label: 'FILES', ms: 420 },
    { key: 'display', label: 'DISPLAY', ms: 480 },
  ],
}
