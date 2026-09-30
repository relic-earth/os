import type { RelicApplication } from '../sdk/types'

/**
 * Application runtime backends. Each backend prepares an execution environment
 * for an application and reports stages to the shell. In the prototype every
 * backend is a SIMULATION: nothing is executed; the shell renders a simulated
 * application surface once the stages complete.
 *
 * Real implementations:
 *   wine    → Wine/Proton prefix per app, DXVK/VKD3D translation, Wayland output
 *   vm      → KVM/QEMU Windows guest, virtio-gpu, RDP/SPICE surface per window
 *   remote  → Remote Windows host streamed per-window (RemoteApp-style)
 *   linux   → Flatpak/OCI sandbox with portals
 */
export interface LaunchStage {
  key: string
  label: string
  /** simulated duration in ms */
  ms: number
}

export interface RuntimeBackend {
  id: string
  label: string
  platform: 'WINDOWS' | 'LINUX' | 'RELIC'
  describe(app: RelicApplication): { prefix: string; translation: string; gpu: 'ACCELERATED' | 'SOFTWARE' }
  stages(app: RelicApplication): LaunchStage[]
}

export interface WindowsRuntime {
  mode: 'wine' | 'vm' | 'remote'
  status: 'ready' | 'launching' | 'running' | 'error'
}
