import type { ComponentType } from 'react'
import type { RelicWindow } from '../sdk/types'
import { ClaudeApp } from './claude/ClaudeApp'
import { FileManager } from './files/FileManager'
import { Browser } from './Browser'
import { Settings } from './settings/Settings'
import { DeviceManager } from './devices/DeviceManager'
import { AppLauncher } from './AppLauncher'
import { Viewer } from './viewer/Viewer'
import { Player } from './Player'
import { Photoshop } from './sim/Photoshop'
import { Excel } from './sim/Excel'
import { AutoCAD, Blender, Revit, Steam, VSCode } from './sim/Engineering'
import { Spotify } from './sim/Spotify'
import { RelicBuild } from './sim/RelicBuild'

export type SurfaceProps = { win: RelicWindow; tv?: boolean }

/**
 * Application surfaces, keyed by application id. In Relic OS a surface is a
 * Wayland toplevel from a real process; here each is a React component.
 */
const surfaces: Record<string, ComponentType<SurfaceProps>> = {
  claude: ClaudeApp,
  files: () => <FileManager />,
  web: ({ win }) => <Browser win={win} />,
  chrome: ({ win }) => <Browser win={win} chrome />,
  settings: Settings,
  devices: DeviceManager,
  apps: () => <AppLauncher />,
  viewer: Viewer,
  player: Player,
  photoshop: Photoshop,
  excel: Excel,
  autocad: AutoCAD,
  revit: Revit,
  blender: Blender,
  vscode: VSCode,
  spotify: Spotify,
  steam: Steam,
  'relic-build': RelicBuild,
}

export function AppSurface({ win, tv }: SurfaceProps) {
  const C = surfaces[win.appId]
  if (!C) return <div className="label-sm p-8">NO SURFACE FOR {win.appId.toUpperCase()}</div>
  return <C win={win} tv={tv} />
}
