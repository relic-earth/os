import type { Capability, IntentRoute } from '../sdk/types'
import { appRegistry } from '../os/apps/registry'
import { devices } from '../os/devices/service'
import { media } from '../os/media/service'

/**
 * Universal command routing.
 *
 * Decides, for any natural-language command, whether Relic should
 *   1. perform a native Relic action      (native)
 *   2. open an application                (app)
 *   3. search files                       (files)
 *   4. communicate with a device          (device)
 *   5. ask Claude                         (claude)
 *   6. request confirmation               (confirm)
 *
 * Used live by the command bar (preview while typing) and by the mock Claude
 * provider to plan tool calls. A real deployment keeps this as the on-device
 * fast path and lets the model handle everything it can't classify.
 */
export type Intent =
  | { kind: 'temp_query' }
  | { kind: 'set_temp'; target: number }
  | { kind: 'vehicle'; setting: 'climate' | 'locks'; value: string }
  | { kind: 'computer_use'; appId: string; task: string }
  | { kind: 'install'; appId: string }
  | { kind: 'send'; deviceId: string; mediaId?: string }
  | { kind: 'devices'; capability?: Capability; status?: 'online' }
  | { kind: 'settings'; section: string }
  | { kind: 'setting'; key: 'theme' | 'background'; value: string }
  | { kind: 'volume'; level: number }
  | { kind: 'pause' }
  | { kind: 'play'; mediaId: string; deviceId?: string }
  | { kind: 'url'; url: string }
  | { kind: 'recent_files' }
  | { kind: 'latest_project' }
  | { kind: 'open_app'; appId: string; windows: boolean }
  | { kind: 'close_app'; appId: string }
  | { kind: 'find_file'; query: string; open: boolean }
  | { kind: 'summarize'; query?: string }
  | { kind: 'delete_file'; query: string }
  | { kind: 'move_file'; query: string; folder: string; copy: boolean }
  | { kind: 'automation'; name: string; trigger: string; action: string }
  | { kind: 'trip' }
  | { kind: 'help' }
  | { kind: 'chat' }

export interface Classified {
  intent: Intent
  route: IntentRoute
  /** one-line preview for the command bar */
  preview: string
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const appAliases: [string, string][] = [
  ['windows', 'windows'],
  ['reactos', 'windows'],
  ['windows pc', 'windows'],
  ['photoshop', 'photoshop'],
  ['autocad', 'autocad'],
  ['excel', 'excel'],
  ['revit', 'revit'],
  ['chrome', 'chrome'],
  ['blender', 'blender'],
  ['vs code', 'vscode'],
  ['vscode', 'vscode'],
  ['visual studio code', 'vscode'],
  ['spotify', 'spotify'],
  ['steam', 'steam'],
  ['relic build', 'relic-build'],
  ['claude', 'claude'],
  ['files', 'files'],
  ['file manager', 'files'],
  ['browser', 'web'],
  ['relic browser', 'web'],
  ['web', 'web'],
  ['settings', 'settings'],
  ['devices', 'devices'],
  ['device manager', 'devices'],
  ['applications', 'apps'],
  ['apps', 'apps'],
]

export function matchApp(text: string): string | undefined {
  const t = text.toLowerCase()
  for (const [alias, id] of appAliases) if (new RegExp(`\\b${escape(alias)}\\b`).test(t)) return id
  return appRegistry.find((a) => new RegExp(`\\b${escape(a.name.toLowerCase())}\\b`).test(t))?.id
}

const capWords: [RegExp, Capability][] = [
  [/large display|big screen|large screen|biggest screen/, 'large-display'],
  [/\bgps|location/, 'gps'],
  [/camera/, 'camera'],
  [/climate|heating|cooling/, 'climate'],
  [/speaker|audio|sound/, 'audio'],
  [/microphone|\bmic\b/, 'microphone'],
  [/navigation/, 'navigation'],
  [/cellular|lte|5g/, 'cellular'],
  [/\bgpu\b|graphics/, 'gpu'],
  [/windows (apps?|runtime)/, 'windows-runtime'],
  [/\bdisplay|screen/, 'display'],
]

const fileHint = /\b(pdf|plans?|permit|file|files|document|doc|render|psd|xlsx|model|spreadsheet|drawing|photo|photos|architecture|notes|itinerary|contract|agreement|deck)\b/

export function classify(raw: string): Classified {
  const text = raw.trim().toLowerCase().replace(/[’']/g, "'")
  const num = text.match(/(\d{2,3})\s*(°|degrees|deg)?/)
  const isQuestion = /^(what|what's|whats|how|is|are|which|where|who)\b|\?$/.test(text)

  // home climate
  if (/\b(temp|temperature|thermostat|warm|cold|hot|heat)\b/.test(text) && isQuestion && !/\bset\b/.test(text) && !/\b(car|vehicle)\b/.test(text))
    return c({ kind: 'temp_query' }, 'device', 'RELIC THERMOSTAT · READ STATE')
  if (/\b(car|vehicle)\b/.test(text) && /\b(climate|precondition|warm|cool|heat|unlock|lock)\b/.test(text)) {
    const locks = /\block|unlock\b/.test(text)
    return c({ kind: 'vehicle', setting: locks ? 'locks' : 'climate', value: locks ? (/unlock/.test(text) ? 'unlock' : 'lock') : num?.[1] ?? '72' }, 'confirm', 'RELIC CAR · SYSTEM ACTION · CONFIRMATION REQUIRED')
  }
  if (/\b(thermostat|temperature|temp|house|home|heat)\b/.test(text) && /\b(set|make|change|turn|adjust|raise|lower|warmer|cooler|up|down)\b/.test(text)) {
    let target = num ? Number(num[1]) : NaN
    if (Number.isNaN(target)) target = /cool|lower|down|colder/.test(text) ? -2 : /warm|raise|up|hotter/.test(text) ? 2 : 70
    return c({ kind: 'set_temp', target }, 'device', `RELIC THERMOSTAT · SET ${target > 20 ? target + '°' : (target > 0 ? '+' : '') + target + '°'}`)
  }

  if (/computer use|brighten|exposure|lighten the render|adjust the render/.test(text))
    return c({ kind: 'computer_use', appId: 'photoshop', task: 'Raise exposure +0.60 on House Render.psd' }, 'confirm', 'COMPUTER USE · PHOTOSHOP · CONFIRMATION REQUIRED')

  if (/\binstall\b/.test(text)) {
    const appId = matchApp(text) ?? (/windows/.test(text) ? 'revit' : undefined)
    if (appId) return c({ kind: 'install', appId }, 'confirm', `INSTALL ${name(appId)} · CONFIRMATION REQUIRED`)
  }

  // continuity
  const sendM = text.match(/\b(send|move|continue|cast|transfer|put|throw|hand ?off|play)\b.*\b(to|on)\b (the |my )?(tv|television|phone|car|laptop|desktop|living room)/)
  if (sendM || /\b(continue on|send to|move to)\b/.test(text)) {
    const d = devices.find(sendM?.[4] ?? text)
    const m = media.find(text)
    if (d) return c({ kind: 'send', deviceId: d.id, mediaId: m?.id }, 'device', `RELIC MESH · MOVE SESSION → ${d.name.toUpperCase()}`)
  }

  if (/\b(devices?|mesh)\b/.test(text) && (isQuestion || /\b(list|show)\b/.test(text))) {
    const cap = capWords.find(([re]) => re.test(text))?.[1]
    return c({ kind: 'devices', capability: cap, status: /online|connected/.test(text) ? 'online' : undefined }, 'device', cap ? `DEVICE MESH · CAPABILITY ${cap.toUpperCase()}` : 'DEVICE MESH · STATUS')
  }

  const secM = text.match(/\b(architecture|roadmap|security|developer|sdk|compatibility|network|display|about)\b/)
  if (/\bsettings?\b/.test(text) || (secM && /\b(open|show|go to)\b/.test(text) && !fileHint.test(text.replace('architecture', '')))) {
    const map: Record<string, string> = { sdk: 'developer' }
    const section = secM ? map[secM[1]] ?? secM[1] : 'general'
    return c({ kind: 'settings', section }, 'native', `SETTINGS → ${section.toUpperCase()}`)
  }
  if (/\b(dim|theme|background|wallpaper)\b/.test(text) && /\b(set|change|switch|make|use)\b/.test(text)) {
    if (/background|wallpaper/.test(text)) {
      const v = ['volcanic', 'topographic', 'architecture', 'horizon'].find((b) => text.includes(b)) ?? 'volcanic'
      return c({ kind: 'setting', key: 'background', value: v }, 'native', `BACKGROUND → ${v.toUpperCase()}`)
    }
    return c({ kind: 'setting', key: 'theme', value: /dim/.test(text) ? 'dim' : 'relic' }, 'native', 'DISPLAY THEME')
  }
  if (/\bvolume\b|\b(louder|quieter|mute)\b/.test(text)) {
    const level = num ? Number(num[1]) : /mute/.test(text) ? 0 : /louder|up/.test(text) ? 80 : 40
    return c({ kind: 'volume', level }, 'native', `VOLUME → ${level}`)
  }
  if (/^(pause|stop)\b/.test(text)) return c({ kind: 'pause' }, 'native', 'PAUSE PLAYBACK')
  if (/^play\b/.test(text)) {
    const m = media.find(text)
    if (m) return c({ kind: 'play', mediaId: m.id, deviceId: devices.find(text.replace(m.title.toLowerCase(), ''))?.id }, 'native', `PLAY ${m.title.toUpperCase()}`)
  }

  const url = text.match(/\b((https?:\/\/)?[a-z0-9-]+\.(com|earth|org|io|dev|net|world|cloud)(\/\S*)?)\b/)
  if (url || /\b(search the web|google|look up)\b/.test(text)) {
    const u = url?.[1] ?? raw.replace(/^(search the web for|google|look up)\s*/i, '')
    return c({ kind: 'url', url: u }, 'app', `RELIC BROWSER · ${u.toUpperCase()}`)
  }

  if (/\brecent (files|documents)\b|recently opened/.test(text)) return c({ kind: 'recent_files' }, 'files', 'FILES · RECENT')
  if (/\b(latest|last|current) project\b|\bmy project\b/.test(text)) return c({ kind: 'latest_project' }, 'files', 'FILES · LATEST PROJECT')

  const closeM = text.match(/^(close|quit|exit|kill)\s+(.*)$/)
  if (closeM) {
    const id = matchApp(closeM[2])
    if (id) return c({ kind: 'close_app', appId: id }, 'app', `CLOSE ${name(id)}`)
  }

  if (/\b(summari[sz]e|tl;?dr|brief me)\b/.test(text)) return c({ kind: 'summarize', query: text.replace(/.*\b(summari[sz]e|tl;?dr|brief me on)\b/, '').trim() || undefined }, 'claude', 'CLAUDE · READ + SUMMARIZE')
  if (/\b(plan|book)\b.*\btrip\b|\bitinerary\b/.test(text)) return c({ kind: 'trip' }, 'claude', 'CLAUDE · PLAN TRIP')

  const delM = text.match(/^(delete|trash|remove)\s+(.*)$/)
  if (delM) return c({ kind: 'delete_file', query: delM[2] }, 'confirm', 'DELETE FILE · CONFIRMATION REQUIRED')
  const mvM = text.match(/^(move|copy)\s+(.*)\s+to\s+(the\s+)?(\w+)(\s+folder)?$/)
  if (mvM) return c({ kind: 'move_file', query: mvM[2], folder: mvM[4], copy: mvM[1] === 'copy' }, 'files', `${mvM[1].toUpperCase()} FILE → ${mvM[4].toUpperCase()}`)

  if (/^(when|whenever|every)\b|automation|automate/.test(text)) {
    const m = raw.match(/^(?:when|whenever|every)\s+(.*?),?\s+(?:then\s+)?((?:turn|set|lock|play|open|dim|start).*)$/i)
    return c(
      { kind: 'automation', name: m ? 'Custom Rule' : 'Leave Home', trigger: m?.[1] ?? 'RELIC PHONE · LEAVES HOME', action: m?.[2] ?? 'LOCK DOORS · THERMOSTAT 64° · LIGHTS OFF' },
      'confirm',
      'AUTOMATION · CONFIRMATION REQUIRED',
    )
  }

  const openM = text.match(/^(open|launch|start|run|show|bring up|find|where is|where's|get)\s+(.*)$/)
  const appId = matchApp(text)
  if (openM && appId && !fileHint.test(openM[2])) {
    const app = appRegistry.find((a) => a.id === appId)!
    return c({ kind: 'open_app', appId, windows: app.runtime === 'windows' }, 'app', app.runtime === 'windows' ? `LAUNCH ${name(appId)} · WINDOWS APP · COMPATIBILITY LAYER` : `OPEN ${name(appId)}`)
  }
  if ((openM || /\b(find|search|where)\b/.test(text)) && (fileHint.test(text) || /\bthat\b/.test(text))) {
    const q = (openM?.[2] ?? text).replace(/\b(for|me|my|the|latest|newest|that|please)\b/g, ' ').trim()
    const open = /\b(open|show|find|get)\b/.test(text)
    return c({ kind: 'find_file', query: q, open }, 'files', `FILES · SEARCH “${q.toUpperCase()}”`)
  }
  if (appId && openM) return c({ kind: 'open_app', appId, windows: false }, 'app', `OPEN ${name(appId)}`)
  if (/^(help|what can you do)/.test(text)) return c({ kind: 'help' }, 'claude', 'CLAUDE')
  return c({ kind: 'chat' }, 'claude', 'ASK CLAUDE')
}

const name = (id: string) => (appRegistry.find((a) => a.id === id)?.name ?? id).toUpperCase()
const c = (intent: Intent, route: IntentRoute, preview: string): Classified => ({ intent, route, preview })

export const routeLabel: Record<IntentRoute, string> = {
  native: 'NATIVE ACTION',
  app: 'APPLICATION',
  files: 'FILE SEARCH',
  device: 'DEVICE',
  claude: 'CLAUDE',
  confirm: 'CONFIRMATION',
}
