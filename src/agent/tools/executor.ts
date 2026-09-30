import type { ToolCall, ToolResult } from '../../sdk/types'
import { apps } from '../../os/apps/service'
import { files, fmtSize, fmtAgo } from '../../os/files/service'
import { devices, home } from '../../os/devices/service'
import { media } from '../../os/media/service'
import { settings } from '../../os/settings/service'
import { automations } from '../../os/automations/service'
import { windows } from '../../os/compositor/windows'
import { continuity } from '../../mesh/sync'
import { capabilityLabels } from '../../os/devices/registry.mock'
import { getApp } from '../../os/apps/registry'
import { getOS, sleep } from '../../os/runtime/store'
import { runComputerUseTask } from './computerUse'
import type { Capability } from '../../sdk/types'

/**
 * Tool executor — runs an authorized tool call against the Relic Runtime.
 * `step(label)` reports progress lines to the execution panel.
 */
export type StepFn = (label: string) => void

const ok = (call: ToolCall, content: string, data?: unknown): ToolResult => ({ tool_use_id: call.id, ok: true, content, data })
const fail = (call: ToolCall, content: string): ToolResult => ({ tool_use_id: call.id, ok: false, content })

export async function executeTool(call: ToolCall, step: StepFn): Promise<ToolResult> {
  const i = call.input
  switch (call.name) {
    case 'search_files': {
      await sleep(450)
      const list = i.recent ? files.recent(6) : files.search(String(i.query ?? ''))
      if (!list.length) return fail(call, `No files match “${String(i.query)}”`)
      const top = [...list].sort((a, b) => b.modified - a.modified)
      step(i.recent ? `${list.length} recent files` : `Found “${top[0].name}”`)
      return ok(
        call,
        top.map((f) => `${f.id}: ${f.name} (${files.path(f.parent ?? 'root')}, ${fmtAgo(f.modified)}) [folder:${f.parent}]`).join('\n'),
        top.map((f) => ({ id: f.id, name: f.name, folder: files.path(f.parent ?? 'root'), modified: f.modified })),
      )
    }
    case 'read_file': {
      const f = files.get(String(i.file_id))
      if (!f) return fail(call, 'File not found')
      await sleep(600)
      step(`Read ${f.name}`)
      return ok(call, `${f.name} · ${fmtSize(f.size)} · ${JSON.stringify(f.meta ?? {})}`, f)
    }
    case 'open_file': {
      const f = files.get(String(i.file_id))
      if (!f) return fail(call, 'File not found')
      files.reveal(f.id)
      await apps.launch('files')
      await sleep(300)
      step(`Revealed in Files · ${files.path(f.parent ?? 'root')}`)
      const appId = f.ext === 'pdf' ? 'PDF' : f.ext?.toUpperCase()
      await files.open(f.id)
      step(`Opening ${appId}`)
      return ok(call, `Opened ${f.name}`, f)
    }
    case 'list_devices': {
      await sleep(500)
      let list = devices.list()
      if (i.capability) list = list.filter((d) => d.capabilities.includes(String(i.capability) as Capability))
      if (i.status) list = list.filter((d) => d.status === i.status)
      step(`${list.length} devices match${i.capability ? ` · ${capabilityLabels[String(i.capability)] ?? i.capability}` : ''}`)
      return ok(call, list.map((d) => `${d.name}: ${d.status}`).join('\n'), list)
    }
    case 'open_app':
    case 'launch_windows_app': {
      const app = apps.find(String(i.app_id))
      if (!app) return fail(call, `Unknown application ${String(i.app_id)}`)
      if (!apps.isInstalled(app.id)) return fail(call, `${app.name} is not installed`)
      if (call.name === 'launch_windows_app' && i.mode) settings.set('windowsMode', i.mode as 'wine')
      if (app.runtime === 'windows') step('Windows application · Relic compatibility layer')
      await apps.launch(app.id)
      step(`${app.name} running`)
      return ok(call, `${app.name} opened`, app)
    }
    case 'close_app': {
      const app = apps.find(String(i.app_id))
      if (!app) return fail(call, 'Unknown application')
      const closed = apps.close(app.id)
      step(closed ? `${app.name} closed` : `${app.name} was not open`)
      return ok(call, closed ? 'closed' : 'not open')
    }
    case 'move_file':
    case 'copy_file': {
      const f = files.get(String(i.file_id))
      const folder = files.resolveFolder(String(i.folder))
      if (!f || !folder) return fail(call, 'File or folder not found')
      await sleep(400)
      if (call.name === 'move_file') files.move(f.id, folder.id)
      else files.copy(f.id, folder.id)
      step(`${call.name === 'move_file' ? 'Moved' : 'Copied'} to ${folder.name}`)
      return ok(call, 'done')
    }
    case 'delete_file': {
      const f = files.get(String(i.file_id))
      if (!f) return fail(call, 'File not found')
      files.remove(f.id)
      step('Moved to Trash')
      return ok(call, 'deleted')
    }
    case 'send_to_device': {
      const target = devices.find(String(i.device_id))
      if (!target) return fail(call, 'Device not found')
      const sessionId = (i.session_id as string | undefined) ?? focusedSessionId()
      if (!sessionId) return fail(call, 'Nothing to send')
      const good = await continuity.transfer(sessionId, target.id, { onStep: step })
      if (!good) return fail(call, 'Transfer failed')
      return ok(call, `Session moved to ${target.name}`, { device: target.name, session: continuity.describe(continuity.get(sessionId)!) })
    }
    case 'play_media': {
      const item = media.find(String(i.media_id)) ?? media.library.find((m) => m.id === i.media_id)
      if (!item) return fail(call, 'Media not found')
      const dev = i.device_id ? devices.find(String(i.device_id))?.id : undefined
      media.play(item.id, dev)
      await sleep(400)
      step(`Playing ${item.title}`)
      return ok(call, `Playing ${item.title}`, item)
    }
    case 'pause_media': {
      media.pause(i.session_id as string | undefined)
      step('Paused')
      return ok(call, 'paused')
    }
    case 'set_volume': {
      media.setVolume(Number(i.level))
      step(`Volume ${getOS().volume}`)
      return ok(call, `volume ${getOS().volume}`)
    }
    case 'set_temperature': {
      step('Relic Thermostat · authenticated')
      await sleep(500)
      const from = getOS().thermostat.target
      const t = home.thermostat.setTemperature(Number(i.target), 'CLAUDE')
      step(`Target ${from}° → ${t}°`)
      return ok(call, `Thermostat set to ${t}°`, { from, to: t })
    }
    case 'open_url': {
      await apps.launch('web', { props: { url: String(i.url), nonce: Date.now() } })
      step('Page loaded')
      return ok(call, 'opened')
    }
    case 'open_settings': {
      const winId = await apps.launch('settings', { props: { section: String(i.section ?? 'general'), nonce: Date.now() } })
      const w = getOS().windows.find((x) => x.id === winId)
      if (w && !w.maximized && ['architecture', 'system'].includes(String(i.section))) windows.toggleMaximize(w.id)
      step('Settings open')
      return ok(call, 'opened')
    }
    case 'change_setting': {
      const key = String(i.key) as 'theme'
      settings.set(key, i.value as never)
      step(`${key.toUpperCase()} → ${String(i.value).toUpperCase()}`)
      return ok(call, 'changed')
    }
    case 'install_app': {
      const app = getApp(String(i.app_id))
      if (!app) return fail(call, 'Unknown app')
      step(`Downloading ${app.name} · ${(app.sizeMB / 1000).toFixed(1)} GB`)
      await apps.install(app.id)
      step(app.runtime === 'windows' ? 'Wine prefix created' : 'Sandbox created')
      step(`${app.name} installed`)
      return ok(call, 'installed', app)
    }
    case 'create_automation': {
      const a = automations.create({ name: String(i.name), trigger: String(i.trigger).toUpperCase(), action: String(i.action).toUpperCase(), createdBy: 'claude' })
      step('Automation active')
      return ok(call, 'created', a)
    }
    case 'computer_use': {
      const app = apps.find(String(i.app_id))
      if (!app) return fail(call, 'Unknown application')
      let win = getOS().windows.find((w) => w.appId === app.id && w.deviceId === getOS().profile)
      if (!win) {
        await apps.launch(app.id)
        win = getOS().windows.find((w) => w.appId === app.id && w.deviceId === getOS().profile)
      }
      if (!win) return fail(call, 'Could not open application')
      windows.focus(win.id)
      step('Screen connected · mouse connected · keyboard connected')
      await runComputerUseTask(win.id, String(i.task))
      step('Task verified')
      return ok(call, 'done')
    }
    case 'vehicle_control': {
      step('Relic Car · authenticated')
      await sleep(700)
      const setting = String(i.setting)
      if (setting === 'climate') devices.setState('relic-car', { cabin: Number(i.value) || 72, precondition: true })
      if (setting === 'locks') devices.setState('relic-car', { locked: /lock/.test(String(i.value)) && !/unlock/.test(String(i.value)) })
      step(`${setting.toUpperCase()} updated`)
      return ok(call, 'vehicle updated')
    }
  }
  return fail(call, `Unknown tool ${call.name}`)
}

/** “this” = the session behind the focused window, else the active media session. */
export function focusedSessionId() {
  const s = getOS()
  const f = s.windows.filter((w) => w.deviceId === s.profile && !w.minimized).sort((a, b) => b.z - a.z)
  const withSession = f.find((w) => w.sessionId && w.appId !== 'claude')
  if (withSession?.sessionId) return withSession.sessionId
  return media.current('video')?.id
}

