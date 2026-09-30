import type { Automation } from '../../sdk/types'
import { getOS, setOS, uid } from '../runtime/store'
import { logEvent, notifications } from '../notifications/service'

/** Automation engine (MOCK — rules are stored, not evaluated against real sensors). */
export interface AutomationService {
  list(): Automation[]
  create(a: Omit<Automation, 'id' | 'enabled'>): Automation
  toggle(id: string): void
  remove(id: string): void
}

export const automations: AutomationService = {
  list: () => getOS().automations,
  create(a) {
    const item: Automation = { ...a, id: uid('auto'), enabled: true }
    setOS((s) => ({ automations: [item, ...s.automations] }))
    notifications.push({ source: 'RELIC AUTOMATIONS', title: 'AUTOMATION CREATED', body: `${item.name} · ${item.trigger}`, icon: 'zap' })
    logEvent('automation', `Created automation ${item.name}`)
    return item
  },
  toggle(id) {
    setOS((s) => ({ automations: s.automations.map((x) => (x.id === id ? { ...x, enabled: !x.enabled } : x)) }))
  },
  remove(id) {
    setOS((s) => ({ automations: s.automations.filter((x) => x.id !== id) }))
  },
}
