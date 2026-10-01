import { apps } from '../apps/service'
import { files } from '../files/service'
import { devices, home } from '../devices/service'
import { media } from '../media/service'
import { network } from '../network/service'
import { notifications } from '../notifications/service'
import { permissions } from '../permissions/service'
import { automations } from '../automations/service'
import { settings } from '../settings/service'
import { windows } from '../compositor/windows'
import { continuity } from '../../mesh/sync'
import { meshDiscovery } from '../../mesh/discovery'
import { cloud } from '../../cloud'
import { relicAgent } from '../../agent/relicAgent'
import { memory } from '../../agent/memory'
import { getOS, setOS, type Profile, type Section, type Skin } from './store'

/**
 * RELIC RUNTIME — the operating system's nervous system.
 *
 *   RELIC EXPERIENCE (shell, modes)
 *        ↓
 *   CLAUDE SYSTEM AGENT        relicRuntime.ai
 *        ↓
 *   RELIC RUNTIME              ← this object
 *        ↓
 *   APPLICATION RUNTIMES       relicRuntime.apps → compatibility/*
 *        ↓
 *   RELIC DEVICE MESH          relicRuntime.devices / .continuity → mesh/*
 *        ↓
 *   RELIC BASE SYSTEM          (Linux · Wayland · systemd — simulated by mocks)
 *        ↓
 *   HARDWARE
 *
 * The UI talks to this facade only. Every member is an interface with a MOCK
 * implementation; a real Relic OS swaps implementations behind the same shape.
 */
export const relicRuntime = {
  apps,
  files,
  devices,
  home,
  media,
  network,
  notifications,
  permissions,
  automations,
  settings,
  windows,
  continuity,
  mesh: { wake: meshDiscovery.wake, scan: meshDiscovery.scan },
  cloud,
  memory,
  ai: relicAgent,
  shell: {
    profile: () => getOS().profile,
    /** Switch which device node this screen renders (the device-profile simulation). */
    setProfile(profile: Profile) {
      const d = devices.get(profile)
      if (d && d.status !== 'online') void meshDiscovery.wake(profile)
      setOS({ profile, commandOpen: false, notificationCenterOpen: false })
    },
    setSection: (section: Section) => setOS({ section }),
    setSkin: (skin: Skin) => {
      setOS({ skin })
      try {
        localStorage.setItem('relic.skin', skin)
      } catch {
        /* private mode */
      }
    },
    openCommand: (open = true) => setOS({ commandOpen: open }),
    boot: () => setOS({ booted: true }),
    restart() {
      try {
        localStorage.removeItem('relic.booted')
      } catch {
        /* ignore */
      }
      setOS({ booted: false, windows: [], commandOpen: false })
    },
  },
}

export type RelicRuntime = typeof relicRuntime
