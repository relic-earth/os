import type { RelicApplication } from '../../sdk/types'
import type { RuntimeBackend, WindowsRuntime } from '../types'
import { wineBackend } from '../wine'
import { remoteWindowsBackend, windowsVmBackend } from '../vm'
import { linuxBackend } from '../linux'

/**
 * Windows Compatibility subsystem — chooses a backend per application.
 * The mode is a user setting (Settings → Compatibility) and can be overridden
 * per app. Nothing here executes Windows binaries; see ../types.ts.
 */
export const windowsBackends: Record<WindowsRuntime['mode'], RuntimeBackend> = {
  wine: wineBackend,
  vm: windowsVmBackend,
  remote: remoteWindowsBackend,
}

export function backendFor(app: RelicApplication, windowsMode: WindowsRuntime['mode']): RuntimeBackend | null {
  if (app.runtime === 'windows') return windowsBackends[windowsMode]
  if (app.runtime === 'linux') return linuxBackend
  return null // Relic-native apps launch directly
}

export const windowsModes: { mode: WindowsRuntime['mode']; label: string; detail: string }[] = [
  { mode: 'wine', label: 'WINE', detail: 'Per-app prefix · DirectX → Vulkan · lowest overhead' },
  { mode: 'vm', label: 'WINDOWS VM', detail: 'Full Windows guest · per-window surfaces · highest compatibility' },
  { mode: 'remote', label: 'REMOTE WINDOWS', detail: 'Streamed from a Relic Cloud host · no local install' },
]
