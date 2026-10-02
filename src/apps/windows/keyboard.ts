import { getOS } from '../../os/runtime/store'

/** True when keystrokes belong to the Windows guest rather than to Relic. */
export function windowsOwnsKeyboard() {
  const s = getOS()
  return s.windows.some((w) => w.appId === 'windows' && w.deviceId === s.profile && w.focused && !w.minimized)
}
