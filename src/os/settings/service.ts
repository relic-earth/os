import { getOS, setOS, type KernelState } from '../runtime/store'
import { logEvent } from '../notifications/service'

/** System settings (dconf / relic-settingsd in a real build). */
export type SettingKey = 'theme' | 'background' | 'volume' | 'windowsMode' | 'claudeProvider'

export interface SettingsService {
  get<K extends SettingKey>(key: K): KernelState[K]
  set<K extends SettingKey>(key: K, value: KernelState[K]): void
  keys: SettingKey[]
}

export const settings: SettingsService = {
  keys: ['theme', 'background', 'volume', 'windowsMode', 'claudeProvider'],
  get: (key) => getOS()[key],
  set(key, value) {
    setOS({ [key]: value } as Partial<KernelState>)
    if (key === 'theme') document.documentElement.dataset.theme = String(value)
    logEvent('settings', `${key} → ${String(value)}`)
  },
}
