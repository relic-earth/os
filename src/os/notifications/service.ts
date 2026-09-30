import type { RelicNotification } from '../../sdk/types'
import { getOS, setOS, uid } from '../runtime/store'

/** Unified notification service (MOCK transport — real build: D-Bus org.freedesktop.Notifications + mesh fan-out). */
export interface NotificationService {
  push(n: Omit<RelicNotification, 'id' | 'at' | 'read' | 'level'> & { level?: RelicNotification['level'] }): string
  dismissToast(id: string): void
  markAllRead(): void
  clear(): void
  toggleCenter(open?: boolean): void
  unread(): number
}

const TOAST_MS = 5200

export const notifications: NotificationService = {
  push(n) {
    const id = uid('n')
    const item: RelicNotification = { level: 'info', ...n, id, at: Date.now(), read: false }
    setOS((s) => ({
      notifications: [item, ...s.notifications].slice(0, 60),
      toasts: [id, ...s.toasts].slice(0, 4),
    }))
    setTimeout(() => notifications.dismissToast(id), TOAST_MS)
    return id
  },
  dismissToast(id) {
    setOS((s) => ({ toasts: s.toasts.filter((t) => t !== id) }))
  },
  markAllRead() {
    setOS((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) }))
  },
  clear() {
    setOS({ notifications: [], toasts: [] })
  },
  toggleCenter(open) {
    const next = open ?? !getOS().notificationCenterOpen
    setOS({ notificationCenterOpen: next })
    if (next) notifications.markAllRead()
  },
  unread() {
    return getOS().notifications.filter((n) => !n.read).length
  },
}

/** System event log — the short-term record Claude reads as context. */
export function logEvent(kind: string, text: string) {
  setOS((s) => ({ events: [{ at: Date.now(), kind, text }, ...s.events].slice(0, 80) }))
}
