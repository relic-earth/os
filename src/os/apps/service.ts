import type { RelicApplication } from '../../sdk/types'
import { appRegistry, getApp, runtimeLabel } from './registry'
import { backendFor } from '../../compatibility/windows/manager'
import { windows } from '../compositor/windows'
import { notifications, logEvent } from '../notifications/service'
import { getOS, setOS, sleep, uid } from '../runtime/store'
import { memory } from '../../agent/memory'
import { media } from '../media/service'

/** Application service: registry, install state, launch through runtime backends. */
export interface AppService {
  list(): (RelicApplication & { installed: boolean })[]
  get(id: string): RelicApplication | undefined
  find(query: string): RelicApplication | undefined
  isInstalled(id: string): boolean
  launch(id: string, opts?: { props?: Record<string, unknown>; title?: string; deviceId?: string }): Promise<string | null>
  close(id: string): boolean
  install(id: string): Promise<void>
}

const aliases: Record<string, string> = {
  ps: 'photoshop',
  'photo shop': 'photoshop',
  cad: 'autocad',
  code: 'vscode',
  'visual studio code': 'vscode',
  browser: 'web',
  files: 'files',
  'file manager': 'files',
  finder: 'files',
  build: 'relic-build',
  settings: 'settings',
  devices: 'devices',
  music: 'spotify',
}

/** Default documents for creative/engineering apps opened without a file. */
const defaultDocs: Record<string, string> = { photoshop: 'house-render', excel: 'fin-model', autocad: 'house-dwg', revit: 'house-model' }

function docState(appId: string, props?: Record<string, unknown>) {
  const fileId = (props?.fileId as string | undefined) ?? defaultDocs[appId]
  const f = fileId ? getOS().files.find((x) => x.id === fileId) : undefined
  return f ? { ...(props ?? {}), fileId: f.id, fileName: f.name } : { ...(props ?? {}) }
}

export const apps: AppService = {
  list() {
    const inst = getOS().installed
    return appRegistry.map((a) => ({ ...a, installed: !!inst[a.id] }))
  },
  get: getApp,
  find(query) {
    const q = query.toLowerCase().trim()
    if (aliases[q]) return getApp(aliases[q])
    return (
      appRegistry.find((a) => a.id === q || a.name.toLowerCase() === q) ??
      appRegistry.find((a) => q.includes(a.name.toLowerCase()) || q.includes(a.id)) ??
      Object.entries(aliases).map(([k, v]) => (q.includes(k) ? getApp(v) : undefined)).find(Boolean)
    )
  },
  isInstalled: (id) => !!getOS().installed[id],

  async launch(id, opts = {}) {
    const app = getApp(id)
    if (!app) return null
    const s = getOS()
    const deviceId = opts.deviceId ?? s.profile
    if (!s.installed[id]) {
      notifications.push({ source: 'RELIC', title: `${app.name.toUpperCase()} IS NOT INSTALLED`, body: 'Install it from Applications or ask Claude.', level: 'warning' })
      return null
    }
    const existing = s.windows.find((w) => w.appId === id && w.deviceId === deviceId && !['viewer', 'player'].includes(id))
    if (existing) {
      windows.open(id, { ...opts, deviceId })
      return existing.id
    }

    const backend = backendFor(app, s.windowsMode)
    let compatDesc: ReturnType<NonNullable<typeof backend>['describe']> | null = null
    if (backend) {
      compatDesc = backend.describe(app)
      const stages = backend.stages(app)
      setOS({
        launch: {
          appId: id,
          runtimeLabel: backend.label,
          platform: app.runtime === 'windows' ? 'WINDOWS APPLICATION' : 'LINUX APPLICATION',
          message: 'INITIALIZING',
          stages: stages.map((st) => ({ key: st.key, label: st.label, state: 'pending' })),
        },
      })
      await sleep(app.runtime === 'windows' ? 700 : 250)
      for (let i = 0; i < stages.length; i++) {
        setOS((st) => ({
          launch: st.launch && { ...st.launch, stages: st.launch.stages.map((x, j) => (j === i ? { ...x, state: 'running' } : x)) },
        }))
        await sleep(stages[i].ms)
        setOS((st) => ({
          launch: st.launch && { ...st.launch, stages: st.launch.stages.map((x, j) => (j === i ? { ...x, state: 'done' } : x)) },
        }))
      }
      setOS((st) => ({ launch: st.launch && { ...st.launch, message: 'READY' } }))
      await sleep(450)
    }

    const mediaSession = id === 'player' && opts.props?.mediaId ? media.ensureSession(String(opts.props.mediaId)).id : undefined
    const sessionId = mediaSession ?? (app.system && id !== 'viewer' ? undefined : uid('sess'))
    const win = windows.open(id, { ...opts, props: { ...docState(id, opts.props), ...opts.props }, deviceId, sessionId })
    if (sessionId && !mediaSession) {
      setOS((st) => ({
        sessions: [
          ...st.sessions,
          {
            id: sessionId,
            appId: id,
            deviceId,
            state: { ...docState(id, opts.props), title: opts.title ?? app.name },
            updatedAt: Date.now(),
            history: [{ deviceId, at: Date.now() }],
          },
        ],
      }))
    }
    if (backend && compatDesc) {
      setOS((st) => ({
        launch: null,
        compat: {
          ...st.compat,
          [win.id]: {
            appId: id,
            mode: app.runtime === 'windows' ? st.windowsMode : 'wine',
            status: 'running',
            gpu: compatDesc!.gpu,
            prefix: compatDesc!.prefix,
            translation: compatDesc!.translation,
            startedAt: Date.now(),
            deviceId,
          },
        },
      }))
      if (app.runtime === 'windows') {
        notifications.push({ source: 'RELIC COMPATIBILITY', title: 'WINDOWS APPLICATION READY', body: `${app.name} · ${backend.label}`, icon: app.icon })
      }
    }
    memory.recordApp(id)
    logEvent('app', `Launched ${app.name} (${runtimeLabel[app.runtime]}) on ${deviceId}`)
    return win.id
  },

  close(id) {
    const s = getOS()
    const targets = s.windows.filter((w) => w.appId === id && w.deviceId === s.profile)
    targets.forEach((w) => windows.close(w.id))
    if (targets.length) logEvent('app', `Closed ${getApp(id)?.name ?? id}`)
    return targets.length > 0
  },

  async install(id) {
    const app = getApp(id)
    if (!app) return
    await sleep(1400)
    setOS((s) => ({
      installed: { ...s.installed, [id]: true },
      appPermissions: {
        ...s.appPermissions,
        [id]: Object.fromEntries(app.permissions.map((p) => [p, 'allowed'])),
      },
    }))
    notifications.push({ source: 'RELIC', title: `${app.name.toUpperCase()} INSTALLED`, body: `${runtimeLabel[app.runtime]} · ${(app.sizeMB / 1000).toFixed(1)} GB`, icon: app.icon })
    logEvent('app', `Installed ${app.name}`)
  },
}
