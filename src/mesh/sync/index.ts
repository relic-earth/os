import type { RelicSession } from '../../sdk/types'
import { getOS, setOS, sleep } from '../../os/runtime/store'
import { devices } from '../../os/devices/service'
import { getApp } from '../../os/apps/registry'
import { fmtTime, getMedia } from '../../os/media/library'
import { logEvent, notifications } from '../../os/notifications/service'
import { meshDiscovery } from '../discovery'
import { meshIdentity } from '../identity'
import { meshTransport } from '../transport'

/**
 * Continuity / session sync. A RelicSession is the portable state of what the
 * user is doing (an app document, a media position). Moving it re-homes the
 * session on another device node; the UI of that node picks it up.
 */
export interface ContinuityService {
  list(): RelicSession[]
  get(id: string): RelicSession | undefined
  onDevice(deviceId: string): RelicSession[]
  describe(s: RelicSession): string
  transfer(sessionId: string, deviceId: string, opts?: { quiet?: boolean; onStep?: (label: string) => void }): Promise<boolean>
}

const verb = (type?: string) => (type === 'tv' ? 'CONTINUING PLAYBACK' : 'SESSION CONTINUED')

export const continuity: ContinuityService = {
  list: () => getOS().sessions,
  get: (id) => getOS().sessions.find((s) => s.id === id),
  onDevice: (deviceId) => getOS().sessions.filter((s) => s.deviceId === deviceId),
  describe(s) {
    if (s.mediaId) return getMedia(s.mediaId)?.title ?? 'Media'
    const app = getApp(s.appId ?? '')
    const doc = s.state.fileName as string | undefined
    return doc ? `${app?.name ?? 'App'} · ${doc}` : app?.name ?? 'Session'
  },
  async transfer(sessionId, deviceId, opts = {}) {
    const sess = continuity.get(sessionId)
    const target = devices.get(deviceId)
    if (!sess || !target) return false
    if (sess.deviceId === deviceId) return true
    const from = devices.get(sess.deviceId)
    const isMedia = !!sess.mediaId
    const title = continuity.describe(sess)
    const labels = [
      `Locating ${target.name}`,
      target.status !== 'online' ? `Waking ${target.name}` : 'Device located',
      'Device authenticated',
      isMedia ? 'Transferring playback state' : 'Transferring session state',
      `${target.name.replace('Relic ', '')} connected`,
    ]
    const step = (i: number, state: 'running' | 'done') => {
      if (state === 'done') opts.onStep?.(labels[i])
      if (!opts.quiet)
        setOS((s) => ({
          transfer: s.transfer && { ...s.transfer, stages: s.transfer.stages.map((x, j) => (j === i ? { ...x, state } : x)) },
        }))
    }
    if (!opts.quiet) {
      setOS({
        transfer: {
          kind: isMedia ? 'media' : 'app',
          title: isMedia ? 'TRANSFERRING PLAYBACK' : 'TRANSFERRING SESSION',
          subject: title,
          from: from?.name ?? '',
          to: target.name,
          stages: labels.map((label) => ({ label, state: 'pending' })),
          done: false,
        },
      })
    }
    step(0, 'running')
    await meshDiscovery.locate(deviceId)
    step(0, 'done')
    step(1, 'running')
    if (target.status !== 'online') await meshDiscovery.wake(deviceId)
    else await sleep(200)
    step(1, 'done')
    step(2, 'running')
    const ok = await meshIdentity.authenticate(deviceId)
    if (!ok) return false
    step(2, 'done')
    step(3, 'running')
    await meshTransport.send(deviceId, sess)
    const at = Date.now()
    setOS((s) => ({
      sessions: s.sessions.map((x) =>
        x.id === sessionId
          ? { ...x, deviceId, updatedAt: at, state: { ...x.state, playing: isMedia ? true : x.state.playing }, history: [...x.history, { deviceId, at }] }
          : x,
      ),
      // app sessions carry their window with them to the new node
      windows: s.windows.map((w) => (w.sessionId === sessionId && w.appId !== 'player' ? { ...w, deviceId, focused: true, minimized: false, maximized: target.type === 'tv' ? true : w.maximized, z: s.zTop + 1 } : w)),
      zTop: s.zTop + 1,
    }))
    step(3, 'done')
    step(4, 'running')
    await sleep(260)
    step(4, 'done')
    if (!opts.quiet) setOS((s) => ({ transfer: s.transfer && { ...s.transfer, done: true } }))
    notifications.push({
      source: target.name.toUpperCase(),
      title: isMedia ? verb(target.type) : `${(getApp(sess.appId ?? '')?.name ?? 'SESSION').toUpperCase()} SESSION READY`,
      body: isMedia ? `${title} · ${fmtTime(sess.position ?? 0)}` : `${title} · from ${from?.name ?? 'mesh'}`,
      level: 'active',
      icon: target.type,
    })
    logEvent('mesh', `Moved ${title} from ${from?.name} to ${target.name}`)
    if (!opts.quiet) setTimeout(() => setOS({ transfer: null }), 1300)
    return true
  },
}

