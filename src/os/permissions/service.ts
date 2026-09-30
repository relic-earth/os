import type { AppPermission, PermissionState } from '../../sdk/types'
import { getOS, setOS } from '../runtime/store'
import { logEvent } from '../notifications/service'

/** Application permission broker (xdg-desktop-portal + sandbox policy in a real build). */
export interface PermissionService {
  forApp(appId: string): Partial<Record<AppPermission, PermissionState>>
  set(appId: string, perm: AppPermission, state: PermissionState): void
  claudeGrants(): { id: string; label: string; scope: string }[]
  revokeClaudeGrant(id: string): void
}

export const permissions: PermissionService = {
  forApp: (appId) => getOS().appPermissions[appId] ?? {},
  set(appId, perm, state) {
    setOS((s) => ({ appPermissions: { ...s.appPermissions, [appId]: { ...s.appPermissions[appId], [perm]: state } } }))
    logEvent('security', `${appId} ${perm} → ${state}`)
  },
  claudeGrants: () => getOS().claudeGrants,
  revokeClaudeGrant(id) {
    setOS((s) => ({ claudeGrants: s.claudeGrants.filter((g) => g.id !== id) }))
  },
}

export const permissionLabels: Record<AppPermission, string> = {
  files: 'FILES',
  gpu: 'GPU',
  network: 'NETWORK',
  camera: 'CAMERA',
  microphone: 'MICROPHONE',
  devices: 'DEVICES',
  media: 'MEDIA',
  location: 'LOCATION',
  system: 'SYSTEM',
}
