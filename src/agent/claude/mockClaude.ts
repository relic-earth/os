import type { SystemContext } from '../../sdk/types'
import type { ClaudeProvider, ContentBlock, GatewayMessage, GatewayRequest, GatewayResponse } from './gateway'
import { classify, type Intent } from '../intent'
import { appRegistry } from '../../os/apps/registry'
import { capabilityLabels } from '../../os/devices/registry.mock'
import { mediaLibrary } from '../../os/media/library'
import { sleep, uid } from '../../os/runtime/store'

/**
 * MOCK CLAUDE — deterministic stand-in for the model.
 *
 * It behaves like a tool-using model: it reads the conversation, emits
 * `tool_use` blocks, and after `tool_result` blocks come back it writes the
 * final answer from those results and the system context. Nothing here is
 * hard-wired into the UI; swapping to the Anthropic provider changes only the
 * gateway's provider selection.
 */

interface TurnState {
  intent: Intent
  rounds: { name: string; input: Record<string, unknown>; ok: boolean; content: string }[]
}

const tool = (name: string, input: Record<string, unknown>): ContentBlock => ({ type: 'tool_use', id: uid('toolu'), name, input })
const text = (t: string): ContentBlock => ({ type: 'text', text: t })
const appName = (id: string) => appRegistry.find((a) => a.id === id)?.name ?? id
const idsFrom = (content: string) => [...content.matchAll(/^([\w-]+): (.+?) \((.+?), (.+?)\) \[folder:([\w-]+)\]$/gm)].map((m) => ({ id: m[1], name: m[2], path: m[3], ago: m[4], folder: m[5] }))
const clock = (ts?: number) => (ts ? new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '')

function lastUserText(messages: GatewayMessage[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role !== 'user') continue
    const t = m.content.find((b) => b.type === 'text') as { text: string } | undefined
    if (t) return { text: t.text, index: i }
  }
  return { text: '', index: 0 }
}

function turnState(messages: GatewayMessage[]): TurnState {
  const { text: userText, index } = lastUserText(messages)
  const rounds: TurnState['rounds'] = []
  const uses = new Map<string, { name: string; input: Record<string, unknown> }>()
  for (const m of messages.slice(index + 1)) {
    for (const b of m.content) {
      if (b.type === 'tool_use') uses.set(b.id as string, { name: b.name as string, input: b.input as Record<string, unknown> })
      if (b.type === 'tool_result') {
        const u = uses.get(b.tool_use_id as string)
        if (u) rounds.push({ ...u, ok: !b.is_error, content: String(b.content) })
      }
    }
  }
  return { intent: classify(userText).intent, rounds }
}

type Plan = { activity?: string; tools?: ContentBlock[]; say?: string }

function plan(st: TurnState, ctx: SystemContext, offline: boolean): Plan {
  const { intent, rounds } = st
  const last = rounds[rounds.length - 1]
  const failed = rounds.find((r) => !r.ok)
  if (failed) return { say: `I couldn't complete that: ${failed.content}.` }

  switch (intent.kind) {
    case 'temp_query': {
      const th = ctx.thermostat
      const change =
        th.changedAt && th.changedFrom != null && th.changedFrom !== th.target
          ? ` It was changed from ${th.changedFrom}° at ${clock(th.changedAt)}.`
          : ''
      const trend = th.indoor < th.target ? ` Indoor is ${th.indoor}° and heating.` : th.indoor > th.target ? ` Indoor is ${th.indoor}° and cooling.` : ` Indoor is ${th.indoor}°.`
      return { say: `The thermostat is set to ${th.target}°.${trend}${change}` }
    }
    case 'set_temp': {
      if (!rounds.length) {
        const cur = ctx.thermostat.target
        const target = intent.target > 20 ? intent.target : cur + intent.target
        if (target === cur) return { say: `The thermostat is already set to ${cur}°.` }
        return { activity: `Adjusting the house temperature…`, tools: [tool('set_temperature', { target })] }
      }
      return { say: `Done — the thermostat is now set to ${String(last.input.target)}°. Indoor is ${ctx.thermostat.indoor}°.` }
    }
    case 'vehicle':
      if (!rounds.length) return { activity: 'Preparing a vehicle action…', tools: [tool('vehicle_control', { setting: intent.setting, value: intent.value })] }
      return { say: intent.setting === 'climate' ? `Relic Car is preconditioning the cabin to ${intent.value}°.` : `Relic Car is ${intent.value === 'unlock' ? 'unlocked' : 'locked'}.` }
    case 'computer_use':
      if (!rounds.length) return { activity: 'Photoshop has no native Relic API — requesting computer use…', tools: [tool('computer_use', { app_id: intent.appId, task: intent.task })] }
      return { say: 'Exposure on House Render.psd is raised by +0.60. I operated Photoshop through screen, mouse and keyboard, then verified the result.' }
    case 'install': {
      if (!rounds.length) {
        const app = appRegistry.find((a) => a.id === intent.appId)
        if (app && ctx.installedApps.includes(app.id)) return { say: `${app.name} is already installed.` }
        return { activity: `Preparing to install ${appName(intent.appId)}…`, tools: [tool('install_app', { app_id: intent.appId })] }
      }
      const app = appRegistry.find((a) => a.id === intent.appId)
      return { say: `${app?.name} is installed${app?.runtime === 'windows' ? ' as a Windows application — it will run through the Wine compatibility layer' : ''}. Say “open ${app?.name}” when you're ready.` }
    }
    case 'send': {
      const target = ctx.devices.find((d) => d.id === intent.deviceId)
      if (!rounds.length) {
        const sess = intent.mediaId ? ctx.sessions.find((s) => s.mediaId === intent.mediaId) : undefined
        const active = ctx.activeSession
        if (!sess && !active) return { say: 'There is nothing active to send.' }
        const what = sess || active?.kind === 'media' ? 'playback' : active?.title.split(' · ')[0]
        return {
          activity: `Moving ${what} to ${target?.name}…`,
          tools: [tool('send_to_device', { device_id: intent.deviceId, ...(sess ? { session_id: sess.id } : {}) })],
        }
      }
      const m = last.content.match(/moved to (.+)$/i)
      return { say: `${m ? m[1] : target?.name} has it — same state, picked up exactly where you left off.` }
    }
    case 'devices': {
      if (!rounds.length) return { activity: 'Querying the device mesh…', tools: [tool('list_devices', { ...(intent.capability ? { capability: intent.capability } : {}), ...(intent.status ? { status: intent.status } : {}) })] }
      const lines = last.content.split('\n').filter(Boolean)
      if (intent.capability) return { say: `Devices with ${capabilityLabels[intent.capability]?.toLowerCase() ?? intent.capability}:\n${lines.map((l) => '· ' + l.split(':')[0].toUpperCase()).join('\n')}` }
      const on = lines.filter((l) => /online/.test(l))
      return { say: `${on.length} of ${lines.length} devices are online:\n${lines.map((l) => '· ' + l.toUpperCase().replace(':', ' —')).join('\n')}` }
    }
    case 'settings':
      if (!rounds.length) return { tools: [tool('open_settings', { section: intent.section })] }
      return { say: `Settings → ${intent.section === 'architecture' ? 'System → Architecture' : intent.section[0].toUpperCase() + intent.section.slice(1)} is open.` }
    case 'setting':
      if (!rounds.length) return { tools: [tool('change_setting', { key: intent.key, value: intent.value })] }
      return { say: `${intent.key === 'theme' ? 'Display theme' : 'Background'} set to ${intent.value}.` }
    case 'volume':
      if (!rounds.length) return { tools: [tool('set_volume', { level: intent.level })] }
      return { say: `Volume is ${intent.level}.` }
    case 'pause':
      if (!rounds.length) return { tools: [tool('pause_media', {})] }
      return { say: 'Paused.' }
    case 'play':
      if (!rounds.length) return { activity: 'Starting playback…', tools: [tool('play_media', { media_id: intent.mediaId, ...(intent.deviceId ? { device_id: intent.deviceId } : {}) })] }
      return { say: `Playing ${mediaLibrary.find((m) => m.id === intent.mediaId)?.title}.` }
    case 'url':
      if (!rounds.length) return { tools: [tool('open_url', { url: intent.url })] }
      return { say: `Opened ${intent.url} in Relic Browser.` }
    case 'recent_files': {
      if (!rounds.length) return { activity: 'Reading your recent files…', tools: [tool('search_files', { recent: true })] }
      const list = idsFrom(last.content)
      return { say: `Your recent files:\n${list.map((f) => `· ${f.name} — ${f.ago.toLowerCase()}`).join('\n')}` }
    }
    case 'latest_project': {
      if (!rounds.length) return { activity: 'Finding your latest project…', tools: [tool('search_files', { query: 'projects' })] }
      if (rounds.length === 1) {
        const top = idsFrom(last.content)[0]
        if (!top) return { say: 'I could not find a project.' }
        return { tools: [tool('open_file', { file_id: top.folder })] }
      }
      return { say: 'Your latest project, Relic House, is open in Files. The permit set (Rev C) was updated 3 hours ago.' }
    }
    case 'open_app': {
      if (!rounds.length) {
        const app = appRegistry.find((a) => a.id === intent.appId)
        return {
          activity: app?.runtime === 'windows' ? `Launching ${app.name} through the compatibility layer…` : `Opening ${app?.name}…`,
          tools: [tool(app?.runtime === 'windows' ? 'launch_windows_app' : 'open_app', { app_id: intent.appId })],
        }
      }
      const app = appRegistry.find((a) => a.id === intent.appId)
      return { say: app?.runtime === 'windows' ? `${app.name} is running as a Windows application through Relic Runtime (Wine). GPU acceleration and your files are available to it.` : `${app?.name} is open.` }
    }
    case 'close_app':
      if (!rounds.length) return { tools: [tool('close_app', { app_id: intent.appId })] }
      return { say: last.content === 'closed' ? `${appName(intent.appId)} is closed.` : `${appName(intent.appId)} wasn't open.` }
    case 'find_file': {
      const q = intent.query || 'recent'
      if (!rounds.length) {
        const pretty = /permit/.test(q) ? 'your permit plans' : `“${q}”`
        return { activity: `Finding ${pretty}…`, tools: [tool('search_files', /\bthat\b/.test(q) || q === 'recent' ? { recent: true } : { query: q })] }
      }
      if (rounds.length === 1) {
        const top = idsFrom(last.content)[0]
        if (!top) return { say: `Nothing matches “${q}”.` }
        if (!intent.open) return { say: `Found ${top.name} in ${top.path}.` }
        return { tools: [tool('open_file', { file_id: top.id })] }
      }
      const found = idsFrom(rounds[0].content)
      const top = found[0]
      const older = found.length > 1 ? ` There ${found.length - 1 === 1 ? 'is' : 'are'} ${found.length - 1} older version${found.length > 2 ? 's' : ''}; I opened the latest.` : ''
      return { say: `Opened ${top.name} — updated ${top.ago.toLowerCase()}, in ${top.path}.${older}` }
    }
    case 'summarize': {
      if (offline) return { say: 'Summaries need Relic Cloud. Native actions — files, apps, devices — continue on-device.' }
      if (!rounds.length) {
        const q = intent.query && intent.query.length > 2 ? intent.query : ''
        if (!q) return { activity: 'Reading the focused document…', tools: [tool('read_file', { file_id: 'arch-pdf' })] }
        return { activity: `Finding ${q}…`, tools: [tool('search_files', { query: q })] }
      }
      if (last.name === 'search_files') {
        const top = idsFrom(last.content)[0]
        if (!top) return { say: 'I could not find that document.' }
        return { tools: [tool('read_file', { file_id: top.id })] }
      }
      return {
        say:
          'Relic OS Architecture (22 pp.) — summary:\n· Relic is Linux-based; Relic owns the shell, runtime, AI layer, compatibility and mesh.\n· Claude is the system agent, acting only through permissioned tools.\n· Windows apps run via Wine first, with VM and remote fallbacks.\n· Every device is a node; sessions move between nodes.\n· Cloud is optional — the local OS keeps working offline.',
      }
    }
    case 'trip':
      if (offline) return { say: 'Trip planning needs Relic Cloud. I can still open your Iceland itinerary locally.' }
      if (!rounds.length) return { activity: 'Reading your itinerary…', tools: [tool('read_file', { file_id: 'trip' })] }
      return {
        say:
          'From Iceland Itinerary.md — 6 days:\n· Day 1 Reykjavík · arrive 06:40, Hallgrímskirkja\n· Day 2 Golden Circle · Þingvellir, Geysir, Gullfoss\n· Day 3–4 South Coast · Vík, Reynisfjara, Skógafoss\n· Day 5 Jökulsárlón glacier lagoon\n· Day 6 Blue Lagoon → KEF 16:10\nI can send the route to Relic Car or your phone.',
      }
    case 'delete_file': {
      if (!rounds.length) return { activity: 'Finding the file…', tools: [tool('search_files', { query: intent.query })] }
      if (rounds.length === 1) {
        const top = idsFrom(last.content)[0]
        return top ? { tools: [tool('delete_file', { file_id: top.id })] } : { say: 'No file matched.' }
      }
      return { say: 'Moved to Trash. It can be restored from Files → Trash.' }
    }
    case 'move_file': {
      if (!rounds.length) return { activity: 'Finding the file…', tools: [tool('search_files', { query: intent.query })] }
      if (rounds.length === 1) {
        const top = idsFrom(last.content)[0]
        return top ? { tools: [tool(intent.copy ? 'copy_file' : 'move_file', { file_id: top.id, folder: intent.folder })] } : { say: 'No file matched.' }
      }
      return { say: `${intent.copy ? 'Copied' : 'Moved'} to ${intent.folder[0].toUpperCase() + intent.folder.slice(1)}.` }
    }
    case 'automation':
      if (!rounds.length) return { activity: 'Drafting an automation…', tools: [tool('create_automation', { name: intent.name, trigger: intent.trigger, action: intent.action })] }
      return { say: `Automation “${intent.name}” is active. You can review it in Settings → Claude.` }
    case 'help':
      return {
        say: 'I run Relic. Try:\n· “Find my latest Relic House permit plans”\n· “Open Photoshop”\n· “Send this to the TV”\n· “What devices have a large display?”\n· “Set the thermostat to 70”\n· “Open settings architecture”',
      }
    case 'chat':
      if (offline) return { say: 'Relic Cloud is unavailable, so I’m routing on-device. I can still open apps, find files, and control devices on the local mesh.' }
      return {
        say: `I can act on anything in Relic — ${ctx.devices.filter((d) => d.status === 'online').length} devices online, your files, apps and sessions. Ask me to open, find, send, play or change something.`,
      }
  }
}

function createMockProvider(id: 'mock' | 'on-device', label: string, offline: boolean): ClaudeProvider {
  return {
    id,
    label,
    async complete(req: GatewayRequest): Promise<GatewayResponse> {
      await sleep(offline ? 220 : 520)
      const st = turnState(req.messages)
      const p = plan(st, req.context, offline)
      const content: ContentBlock[] = []
      if (p.say) content.push(text(p.say))
      if (p.tools) content.push(...p.tools)
      return { content, stop_reason: p.tools?.length ? 'tool_use' : 'end_turn', activity: p.activity, provider: id }
    },
  }
}

export const mockClaudeProvider = createMockProvider('mock', 'MOCK CLAUDE', false)
/** On-device routing used when Relic Cloud is unreachable. */
export const onDeviceProvider = createMockProvider('on-device', 'ON-DEVICE ROUTER', true)
