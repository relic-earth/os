import type { AgentMessage, ExecutionStep, SystemContext, ToolCall } from '../sdk/types'
import { ClaudeGateway, SYSTEM_PROMPT, type ContentBlock, type GatewayMessage } from './claude/gateway'
import { mockClaudeProvider, onDeviceProvider } from './claude/mockClaude'
import { anthropicProvider } from './claude/anthropicProvider'
import { toolByName, toolDefinitions } from './tools/definitions'
import { executeTool, focusedSessionId } from './tools/executor'
import { continuity } from '../mesh/sync'
import { authorize, requiresConfirmation } from './policies'
import { classify } from './intent'
import { memory } from './memory'
import { getOS, setOS, sleep, uid } from '../os/runtime/store'
import { getApp } from '../os/apps/registry'
import { notifications } from '../os/notifications/service'
import { cloudAi } from '../cloud/ai'

/**
 * RELIC AGENT — Claude as the system-level intelligence layer.
 *
 *   intent      → ./intent.ts            (route + live preview)
 *   tools       → ./tools/definitions.ts (typed contracts) + executor.ts
 *   permissions → ./policies             (READ / LOW / SENSITIVE / SYSTEM)
 *   memory      → ./memory               (RelicMemory)
 *   execution   → the loop below: gateway turn → authorize → execute → tool_result → …
 */

const provider = (import.meta.env.VITE_CLAUDE_PROVIDER as string | undefined) === 'anthropic' ? 'anthropic' : 'mock'
if (provider === 'anthropic') setOS({ claudeProvider: 'anthropic' })

export const claudeGateway = new ClaudeGateway([mockClaudeProvider, onDeviceProvider, anthropicProvider], () => ({
  provider: getOS().claudeProvider,
  cloudAvailable: cloudAi.available(),
}))

/** Conversation in Messages-API shape, kept alongside the UI transcript. */
let transcript: GatewayMessage[] = []
const MAX_STEPS = 6
/** Tools that put something on screen: when run from the command overlay, get out of the way. */
const SURFACING = new Set(['open_app', 'launch_windows_app', 'open_file', 'open_url', 'open_settings', 'computer_use'])

export function systemContext(): SystemContext {
  const s = getOS()
  const focused = s.windows.filter((w) => w.deviceId === s.profile && !w.minimized && w.appId !== 'claude').sort((a, b) => b.z - a.z)[0]
  const active = focusedSessionId()
  const activeSess = active ? continuity.get(active) : undefined
  return {
    now: Date.now(),
    activeSession: activeSess ? { id: activeSess.id, title: continuity.describe(activeSess), kind: activeSess.mediaId ? 'media' : 'app' } : undefined,
    thisDevice: s.profile,
    focused: focused ? { appId: focused.appId, title: focused.title, sessionId: focused.sessionId } : undefined,
    devices: s.devices.map(({ id, name, type, status, capabilities, state, location }) => ({ id, name, type, status, capabilities, state, location })),
    sessions: s.sessions,
    thermostat: { ...s.thermostat },
    recentFiles: memory.recentFiles(),
    recentApps: memory.recentApps(),
    installedApps: Object.keys(s.installed).filter((k) => s.installed[k]),
    cloud: s.cloud.status,
  }
}

const patch = (id: string, p: Partial<AgentMessage> | ((m: AgentMessage) => Partial<AgentMessage>)) =>
  setOS((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, ...(typeof p === 'function' ? p(m) : p) } : m)) }))

async function typeOut(id: string, full: string) {
  const base = getOS().messages.find((m) => m.id === id)?.text ?? ''
  const sep = base ? '\n\n' : ''
  for (let i = 0; i <= full.length; i += 3) {
    patch(id, { text: base + sep + full.slice(0, i) })
    await sleep(12)
  }
  patch(id, { text: base + sep + full })
}

export interface RelicAgent {
  ask(text: string): Promise<void>
  reset(): void
  busy(): boolean
}

export const relicAgent: RelicAgent = {
  busy: () => getOS().agentBusy,
  reset() {
    transcript = []
    setOS({ messages: [] })
  },
  async ask(input) {
    const text = input.trim()
    if (!text || getOS().agentBusy) return
    const routed = classify(text)
    const offline = !cloudAi.available()
    const userMsg: AgentMessage = { id: uid('m'), role: 'user', text, at: Date.now(), route: routed.route }
    const reply: AgentMessage = { id: uid('m'), role: 'assistant', text: '', at: Date.now(), steps: [], streaming: true, offline }
    setOS((s) => ({ agentBusy: true, messages: [...s.messages, userMsg, reply] }))
    transcript.push({ role: 'user', content: [{ type: 'text', text }] })
    memory.recordConversation(text.length > 42 ? text.slice(0, 40) + '…' : text)

    let surfaced = false
    try {
      for (let step = 0; step < MAX_STEPS; step++) {
        const res = await claudeGateway.complete({ system: SYSTEM_PROMPT, messages: transcript, tools: toolDefinitions as never, context: systemContext() })
        transcript.push({ role: 'assistant', content: res.content })
        if (res.activity) patch(reply.id, { activity: res.activity })

        const said = res.content.filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text').map((b) => b.text).join('\n')
        if (said) await typeOut(reply.id, said)

        const calls = res.content.filter((b): b is Extract<ContentBlock, { type: 'tool_use' }> => b.type === 'tool_use') as ToolCall[]
        if (res.stop_reason !== 'tool_use' || !calls.length) break

        const results: ContentBlock[] = []
        for (const call of calls) {
          if (SURFACING.has(call.name)) surfaced = true
          const def = toolByName(call.name)
          const stepId = uid('st')
          const addStep = (label: string, state: ExecutionStep['state']) =>
            patch(reply.id, (m) => ({ steps: [...(m.steps ?? []), { id: uid('st'), label, state }] }))
          patch(reply.id, (m) => ({ steps: [...(m.steps ?? []), { id: stepId, label: def?.label(call.input) ?? call.name, state: def && requiresConfirmation(def.risk) ? 'waiting' : 'running' }] }))

          const allowed = await authorize(call)
          if (!allowed) {
            patch(reply.id, (m) => ({ steps: m.steps?.map((x) => (x.id === stepId ? { ...x, state: 'failed', label: `${x.label} · denied` } : x)) }))
            results.push({ type: 'tool_result', tool_use_id: call.id, content: 'The user denied this action.', is_error: true })
            continue
          }
          patch(reply.id, (m) => ({ steps: m.steps?.map((x) => (x.id === stepId ? { ...x, state: 'running' } : x)) }))
          const result = await executeTool(call, (label) => addStep(label, 'done'))
          patch(reply.id, (m) => ({ steps: m.steps?.map((x) => (x.id === stepId ? { ...x, state: result.ok ? 'done' : 'failed' } : x)) }))
          results.push({ type: 'tool_result', tool_use_id: call.id, content: result.content, ...(result.ok ? {} : { is_error: true }) })
        }
        transcript.push({ role: 'user', content: results })
      }
    } catch (err) {
      await typeOut(reply.id, `Claude is unavailable (${(err as Error).message}). Relic continues locally.`)
    } finally {
      patch(reply.id, { streaming: false })
      setOS({ agentBusy: false })
      if (surfaced && getOS().commandOpen) {
        const final = getOS().messages.find((m) => m.id === reply.id)?.text ?? ''
        setOS({ commandOpen: false })
        notifications.push({ source: 'CLAUDE', title: 'DONE', body: final.split('\n')[0], icon: 'sparkle', level: 'active' })
      }
    }
  },
}

/** Friendly name for a focused app, used in UI hints. */
export const focusName = () => {
  const f = systemContext().focused
  return f ? getApp(f.appId)?.name ?? f.title : undefined
}
