import type { ConfirmRequest, RiskLevel, ToolCall } from '../../sdk/types'
import { toolByName } from '../tools/definitions'
import { getApp } from '../../os/apps/registry'
import { permissionLabels } from '../../os/permissions/service'
import { getOS, setOS, uid } from '../../os/runtime/store'
import { notifications } from '../../os/notifications/service'

/**
 * CLAUDE PERMISSION MODEL
 *
 *   READ       read files, device status, settings          → runs
 *   LOW RISK   open apps, play media, volume, move files    → runs, logged
 *   SENSITIVE  install, delete, automations, computer use   → user confirms
 *   SYSTEM     vehicle, firmware, disk, security, root      → user confirms (system dialog)
 *
 * Claude never holds unrestricted access: every tool call passes through
 * `authorize` before the executor sees it.
 */
export const riskMeta: Record<RiskLevel, { label: string; examples: string[] }> = {
  read: { label: 'READ', examples: ['Read files', 'Read device status', 'Read settings'] },
  low: { label: 'LOW RISK', examples: ['Open applications', 'Play media', 'Change volume', 'Move files'] },
  sensitive: { label: 'SENSITIVE', examples: ['Send email', 'Install applications', 'Purchases', 'Change security settings'] },
  system: { label: 'SYSTEM', examples: ['Firmware', 'Disk operations', 'Vehicle controls', 'Security controls', 'Root / system changes'] },
}

export const requiresConfirmation = (risk: RiskLevel) => risk === 'sensitive' || risk === 'system'

function describe(call: ToolCall): Omit<ConfirmRequest, 'id' | 'resolve' | 'risk' | 'tool'> {
  const i = call.input
  switch (call.name) {
    case 'install_app': {
      const app = getApp(String(i.app_id))
      return { title: 'I want to install:', subject: (app?.name ?? String(i.app_id)).toUpperCase(), detail: 'This application requests:', permissions: (app?.permissions ?? []).map((p) => permissionLabels[p]) }
    }
    case 'delete_file': {
      const f = getOS().files.find((x) => x.id === i.file_id)
      return { title: 'I want to move to Trash:', subject: f?.name ?? String(i.file_id), detail: 'The file can be restored from Trash for 30 days.' }
    }
    case 'create_automation':
      return { title: 'I want to create an automation:', subject: String(i.name).toUpperCase(), detail: `WHEN ${String(i.trigger)}\nTHEN ${String(i.action)}` }
    case 'computer_use':
      return { title: 'I want to operate an application directly:', subject: (getApp(String(i.app_id))?.name ?? String(i.app_id)).toUpperCase(), detail: String(i.task), permissions: ['SCREEN', 'MOUSE', 'KEYBOARD'] }
    case 'vehicle_control':
      return { title: 'Claude wants to modify:', subject: 'VEHICLE SETTINGS', detail: `${String(i.setting).toUpperCase()} → ${String(i.value).toUpperCase()} · RELIC CAR` }
    default:
      return { title: 'Claude wants to run:', subject: call.name.toUpperCase() }
  }
}

/** Ask the user through the shell's confirmation dialog. Resolves true on ALLOW / CONFIRM. */
export function authorize(call: ToolCall): Promise<boolean> {
  const def = toolByName(call.name)
  if (!def) return Promise.resolve(false)
  if (!requiresConfirmation(def.risk)) return Promise.resolve(true)
  notifications.push({ source: 'CLAUDE', title: 'CLAUDE NEEDS PERMISSION', body: `${riskMeta[def.risk].label} · ${call.name}`, level: 'warning', icon: 'shield' })
  return new Promise((resolve) => {
    setOS({
      confirm: {
        id: uid('cfm'),
        risk: def.risk,
        tool: call.name,
        ...describe(call),
        resolve: (ok) => {
          setOS({ confirm: null })
          resolve(ok)
        },
      },
    })
  })
}
