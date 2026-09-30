import { useEffect } from 'react'
import { getOS, setOS } from '../runtime/store'
import { relicRuntime } from '../runtime/relicRuntime'

const typing = (el: EventTarget | null) => {
  const t = el as HTMLElement | null
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
}

/**
 * Global shortcuts
 *   Ctrl/Cmd + Space   Claude / global command
 *   Ctrl/Cmd + Tab     switch applications (also Ctrl + `, since browsers reserve Ctrl+Tab)
 *   Ctrl/Cmd + W       close window (also Alt + W, since browsers reserve Ctrl+W)
 *   Esc                close overlays
 *   T                  toggle TV mode
 * Arrow keys in TV mode are handled by TVMode itself.
 */
export function useGlobalShortcuts() {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const s = getOS()
      if (!s.booted) return
      const mod = e.ctrlKey || e.metaKey

      if (mod && e.code === 'Space') {
        e.preventDefault()
        relicRuntime.shell.openCommand(!s.commandOpen)
        return
      }
      if ((mod && e.key === 'Tab') || (e.ctrlKey && e.key === '`')) {
        e.preventDefault()
        const count = s.windows.filter((w) => w.deviceId === s.profile).length
        if (count < 2) return
        setOS({ switcher: { open: true, index: s.switcher.open ? s.switcher.index + (e.shiftKey ? count - 1 : 1) : 1 } })
        return
      }
      if ((mod && e.key.toLowerCase() === 'w') || (e.altKey && e.code === 'KeyW')) {
        e.preventDefault()
        relicRuntime.windows.closeFocused(s.profile)
        return
      }
      if (e.key === 'Escape') {
        if (s.confirm) return s.confirm.resolve(false)
        if (s.commandOpen) return relicRuntime.shell.openCommand(false)
        if (s.notificationCenterOpen) return relicRuntime.notifications.toggleCenter(false)
        if (s.switcher.open) return setOS({ switcher: { open: false, index: 0 } })
        if (s.profile === 'relic-tv') return // TV mode uses Esc as “back”
        return
      }
      if (!mod && !e.altKey && e.key.toLowerCase() === 't' && !typing(e.target) && !s.commandOpen) {
        relicRuntime.shell.setProfile(s.profile === 'relic-tv' ? 'relic-laptop' : 'relic-tv')
      }
    }
    const up = (e: KeyboardEvent) => {
      const s = getOS()
      if (s.switcher.open && (e.key === 'Control' || e.key === 'Meta')) {
        const list = s.windows.filter((w) => w.deviceId === s.profile).sort((a, b) => b.z - a.z)
        const target = list[s.switcher.index % list.length]
        setOS({ switcher: { open: false, index: 0 } })
        if (target) relicRuntime.windows.focus(target.id)
      }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])
}
