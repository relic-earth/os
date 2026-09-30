import type { RelicSession } from '../../sdk/types'
import { getOS, setOS, uid } from '../runtime/store'
import { getMedia, mediaLibrary } from './library'
import { continuity } from '../../mesh/sync'
import { logEvent } from '../notifications/service'

/** Media service — playback sessions that can live on any device node. MOCK: no real decoding. */
export interface MediaService {
  library: typeof mediaLibrary
  find(query: string): (typeof mediaLibrary)[number] | undefined
  sessions(): RelicSession[]
  current(kind?: 'video' | 'audio'): RelicSession | undefined
  onDevice(deviceId: string): RelicSession | undefined
  play(mediaId: string, deviceId?: string): RelicSession
  ensureSession(mediaId: string): RelicSession
  pause(sessionId?: string): void
  resume(sessionId?: string): void
  toggle(sessionId: string): void
  seek(sessionId: string, position: number): void
  sendTo(sessionId: string, deviceId: string): Promise<boolean>
  setVolume(v: number): void
  tick(dtSec: number): void
}

const isAudio = (s: RelicSession) => getMedia(s.mediaId)?.kind === 'track'

export const media: MediaService = {
  library: mediaLibrary,
  find(query) {
    const q = query.toLowerCase()
    return (
      mediaLibrary.find((m) => q.includes(m.title.toLowerCase())) ??
      (/(episode|ep\.?) ?(iii|3)|revenge|sith/.test(q) ? getMedia('episode-iii') : undefined) ??
      (/duel|fates/.test(q) ? getMedia('duel-of-the-fates') : undefined)
    )
  },
  sessions: () => getOS().sessions.filter((s) => s.mediaId),
  current(kind = 'video') {
    const list = media.sessions().filter((s) => (kind === 'audio' ? isAudio(s) : !isAudio(s)))
    return list.sort((a, b) => Number(b.state.playing) - Number(a.state.playing) || b.updatedAt - a.updatedAt)[0]
  },
  onDevice: (deviceId) => media.sessions().find((s) => s.deviceId === deviceId && s.state.playing) ?? media.sessions().find((s) => s.deviceId === deviceId),
  play(mediaId, deviceId) {
    const item = getMedia(mediaId)
    const target = deviceId ?? getOS().profile
    const existing = media.sessions().find((s) => s.mediaId === mediaId)
    if (existing) {
      setOS((s) => ({
        sessions: s.sessions.map((x) =>
          x.id === existing.id ? { ...x, deviceId: target, updatedAt: Date.now(), state: { ...x.state, playing: true } } : x,
        ),
      }))
      logEvent('media', `Playing ${item?.title} on ${target}`)
      return { ...existing, deviceId: target }
    }
    const sess: RelicSession = {
      id: uid('sess'),
      mediaId,
      appId: item?.kind === 'track' ? 'spotify' : 'player',
      position: 0,
      deviceId: target,
      state: { playing: true },
      updatedAt: Date.now(),
      history: [{ deviceId: target, at: Date.now() }],
    }
    setOS((s) => ({ sessions: [...s.sessions, sess] }))
    logEvent('media', `Playing ${item?.title} on ${target}`)
    return sess
  },
  ensureSession(mediaId) {
    const existing = media.sessions().find((s) => s.mediaId === mediaId)
    if (existing) return existing
    const item = getMedia(mediaId)
    const sess: RelicSession = {
      id: uid('sess'),
      mediaId,
      appId: item?.kind === 'track' ? 'spotify' : 'player',
      position: 0,
      deviceId: getOS().profile,
      state: { playing: false },
      updatedAt: Date.now(),
      history: [{ deviceId: getOS().profile, at: Date.now() }],
    }
    setOS((s) => ({ sessions: [...s.sessions, sess] }))
    return sess
  },
  pause(sessionId) {
    const id = sessionId ?? media.sessions().find((s) => s.state.playing)?.id
    if (!id) return
    setOS((s) => ({ sessions: s.sessions.map((x) => (x.id === id ? { ...x, state: { ...x.state, playing: false }, updatedAt: Date.now() } : x)) }))
  },
  resume(sessionId) {
    const id = sessionId ?? media.current()?.id
    if (!id) return
    setOS((s) => ({ sessions: s.sessions.map((x) => (x.id === id ? { ...x, state: { ...x.state, playing: true }, updatedAt: Date.now() } : x)) }))
  },
  toggle(sessionId) {
    const s = getOS().sessions.find((x) => x.id === sessionId)
    if (s?.state.playing) media.pause(sessionId)
    else media.resume(sessionId)
  },
  seek(sessionId, position) {
    setOS((s) => ({ sessions: s.sessions.map((x) => (x.id === sessionId ? { ...x, position: Math.max(0, position) } : x)) }))
  },
  sendTo: (sessionId, deviceId) => continuity.transfer(sessionId, deviceId),
  setVolume(v) {
    setOS({ volume: Math.max(0, Math.min(100, Math.round(v))) })
  },
  tick(dt) {
    setOS((s) => ({
      sessions: s.sessions.map((x) => {
        if (!x.mediaId || !x.state.playing) return x
        const dur = getMedia(x.mediaId)?.duration ?? 0
        const next = (x.position ?? 0) + dt
        return { ...x, position: dur ? (next >= dur ? 0 : next) : next }
      }),
    }))
  },
}
