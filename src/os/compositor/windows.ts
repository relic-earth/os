import type { RelicWindow } from '../../sdk/types'
import { getApp } from '../apps/registry'
import { getOS, setOS, uid } from '../runtime/store'

/**
 * Compositor window service. In Relic OS this is the shell side of the Wayland
 * compositor (xdg-shell toplevels); here it manages simulated surfaces.
 */
export interface WindowService {
  open(appId: string, opts?: { title?: string; props?: Record<string, unknown>; deviceId?: string; sessionId?: string; singleton?: boolean }): RelicWindow
  focus(id: string): void
  close(id: string): void
  minimize(id: string): void
  toggleMaximize(id: string): void
  move(id: string, x: number, y: number): void
  resize(id: string, rect: Partial<Pick<RelicWindow, 'x' | 'y' | 'width' | 'height'>>): void
  update(id: string, patch: Partial<RelicWindow>): void
  onDevice(deviceId: string): RelicWindow[]
  focused(deviceId?: string): RelicWindow | undefined
  cycle(deviceId: string, dir?: 1 | -1): void
  closeFocused(deviceId: string): void
  blur(deviceId: string): void
}

let cascade = 0

export const windows: WindowService = {
  open(appId, opts = {}) {
    const s = getOS()
    const deviceId = opts.deviceId ?? s.profile
    const singleton = opts.singleton ?? !['viewer', 'player'].includes(appId)
    const existing = singleton
      ? s.windows.find((w) => w.appId === appId && w.deviceId === deviceId)
      : s.windows.find(
          (w) =>
            w.appId === appId &&
            w.deviceId === deviceId &&
            ((opts.props?.fileId && w.props?.fileId === opts.props.fileId) || (opts.props?.mediaId && w.props?.mediaId === opts.props.mediaId)),
        )
    if (existing) {
      windows.update(existing.id, { minimized: false, props: { ...existing.props, ...opts.props }, ...(opts.title ? { title: opts.title } : {}) })
      windows.focus(existing.id)
      return getOS().windows.find((w) => w.id === existing.id)!
    }
    const app = getApp(appId)
    const area = s.workArea
    const size = app?.defaultSize ?? { width: 820, height: 560 }
    const width = Math.min(size.width, area.width - 24)
    const height = Math.min(size.height, area.height - 24)
    const step = (cascade++ % 6) * 28
    const x = Math.max(12, Math.round((area.width - width) / 2) - 70 + step)
    const y = Math.max(10, Math.round((area.height - height) / 2) - 40 + step * 0.7)
    const z = s.zTop + 1
    const win: RelicWindow = {
      id: uid('w'),
      appId,
      title: opts.title ?? app?.name ?? appId,
      deviceId,
      x,
      y,
      width,
      height,
      z,
      minimized: false,
      maximized: false,
      focused: true,
      sessionId: opts.sessionId,
      props: opts.props,
    }
    setOS((st) => ({
      zTop: z,
      windows: [...st.windows.map((w) => (w.deviceId === deviceId ? { ...w, focused: false } : w)), win],
    }))
    return win
  },
  focus(id) {
    setOS((s) => {
      const target = s.windows.find((w) => w.id === id)
      if (!target) return {}
      const z = s.zTop + 1
      return {
        zTop: z,
        windows: s.windows.map((w) =>
          w.id === id ? { ...w, focused: true, minimized: false, z } : w.deviceId === target.deviceId ? { ...w, focused: false } : w,
        ),
      }
    })
  },
  close(id) {
    setOS((s) => {
      const target = s.windows.find((w) => w.id === id)
      const rest = s.windows.filter((w) => w.id !== id)
      const compat = { ...s.compat }
      if (target) delete compat[target.id]
      const sessions = target?.sessionId && target.appId !== 'player' ? s.sessions.filter((x) => x.id !== target.sessionId) : s.sessions
      // hand focus to the top-most remaining window on that device
      const same = rest.filter((w) => w.deviceId === target?.deviceId && !w.minimized).sort((a, b) => b.z - a.z)
      return {
        compat,
        sessions,
        computerUse: s.computerUse?.windowId === id ? null : s.computerUse,
        windows: rest.map((w) => (same[0] && w.id === same[0].id ? { ...w, focused: true } : w)),
      }
    })
  },
  minimize(id) {
    setOS((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, minimized: true, focused: false } : w)) }))
  },
  toggleMaximize(id) {
    setOS((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, maximized: !w.maximized } : w)) }))
    windows.focus(id)
  },
  move(id, x, y) {
    setOS((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, x, y } : w)) }))
  },
  resize(id, rect) {
    setOS((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, ...rect } : w)) }))
  },
  update(id, patch) {
    setOS((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, ...patch } : w)) }))
  },
  onDevice(deviceId) {
    return getOS().windows.filter((w) => w.deviceId === deviceId)
  },
  focused(deviceId) {
    const d = deviceId ?? getOS().profile
    return getOS().windows.find((w) => w.deviceId === d && w.focused && !w.minimized)
  },
  cycle(deviceId, dir = 1) {
    const list = windows.onDevice(deviceId).sort((a, b) => b.z - a.z)
    if (list.length < 2) {
      if (list[0]) windows.focus(list[0].id)
      return
    }
    const next = dir === 1 ? list[1] : list[list.length - 1]
    windows.focus(next.id)
  },
  blur(deviceId) {
    setOS((s) => ({ windows: s.windows.map((w) => (w.deviceId === deviceId ? { ...w, focused: false } : w)) }))
  },
  closeFocused(deviceId) {
    const f = windows.focused(deviceId)
    if (f) windows.close(f.id)
  },
}
