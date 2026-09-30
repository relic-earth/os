import { relicRuntime } from '../../os/runtime/relicRuntime'

/**
 * RELIC SDK — the stable surface third-party Relic apps build against.
 * A thin, versioned projection of the Relic Runtime.
 */
export const relic = {
  version: '0.1.0',
  devices: {
    list: () => relicRuntime.devices.list(),
    find: (idOrName: string) => relicRuntime.devices.find(idOrName),
    withCapability: relicRuntime.devices.withCapability,
  },
  media: {
    play: (mediaId: string, deviceId?: string) => relicRuntime.media.play(mediaId, deviceId),
    pause: () => relicRuntime.media.pause(),
    sendTo: relicRuntime.media.sendTo,
  },
  files: {
    search: (q: string) => relicRuntime.files.search(q).map((f) => ({ id: f.id, name: f.name, path: relicRuntime.files.path(f.id) })),
    open: (id: string) => relicRuntime.files.open(id),
  },
  home: {
    thermostat: {
      get: () => relicRuntime.home.thermostat.get(),
      setTemperature: (t: number) => relicRuntime.home.thermostat.setTemperature(t, 'SDK'),
    },
  },
  windows: {
    open: (appId: string) => relicRuntime.apps.launch(appId),
    list: () => relicRuntime.windows.onDevice(relicRuntime.shell.profile()),
  },
  claude: {
    ask: (text: string) => relicRuntime.ai.ask(text),
  },
  notify: (title: string, body?: string) => relicRuntime.notifications.push({ source: 'RELIC SDK', title, body }),
}

export type RelicSDK = typeof relic
