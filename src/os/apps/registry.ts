import type { RelicApplication } from '../../sdk/types'

/**
 * Application registry. In Relic OS this is backed by the package database
 * (Relic packages, Flatpak/OCI for Linux, Wine prefixes / VM images for Windows).
 */
const everywhere = ['laptop', 'desktop', 'phone', 'tv', 'car'] as RelicApplication['supportedDevices']
const computers = ['laptop', 'desktop'] as RelicApplication['supportedDevices']

export const appRegistry: RelicApplication[] = [
  { id: 'claude', name: 'Claude', icon: 'sparkle', runtime: 'relic', version: '1.0', publisher: 'Anthropic · Relic', permissions: ['files', 'devices', 'media', 'network'], supportedDevices: [...everywhere, 'thermostat'], installed: true, system: true, category: 'system', sizeMB: 0, defaultSize: { width: 620, height: 640 } },
  { id: 'files', name: 'Relic Files', icon: 'folder', runtime: 'relic', version: '1.0', publisher: 'Relic', permissions: ['files'], supportedDevices: ['laptop', 'desktop', 'phone'], installed: true, system: true, category: 'system', sizeMB: 0, defaultSize: { width: 940, height: 580 } },
  { id: 'web', name: 'Relic Browser', icon: 'globe', runtime: 'relic', version: '1.0', publisher: 'Relic', permissions: ['network', 'files'], supportedDevices: ['laptop', 'desktop', 'phone', 'tv'], installed: true, system: true, category: 'system', sizeMB: 0, defaultSize: { width: 980, height: 620 } },
  { id: 'settings', name: 'Relic Settings', icon: 'settings', runtime: 'relic', version: '1.0', publisher: 'Relic', permissions: ['system'], supportedDevices: everywhere, installed: true, system: true, category: 'system', sizeMB: 0, defaultSize: { width: 1100, height: 700 } },
  { id: 'devices', name: 'Relic Devices', icon: 'devices', runtime: 'relic', version: '1.0', publisher: 'Relic', permissions: ['devices'], supportedDevices: everywhere, installed: true, system: true, category: 'system', sizeMB: 0, defaultSize: { width: 1000, height: 620 } },
  { id: 'apps', name: 'Applications', icon: 'grid', runtime: 'relic', version: '1.0', publisher: 'Relic', permissions: [], supportedDevices: everywhere, installed: true, system: true, category: 'system', sizeMB: 0, defaultSize: { width: 900, height: 600 } },
  { id: 'viewer', name: 'Relic Viewer', icon: 'file', runtime: 'relic', version: '1.0', publisher: 'Relic', permissions: ['files'], supportedDevices: everywhere, installed: true, system: true, category: 'system', sizeMB: 0, defaultSize: { width: 760, height: 620 }, opens: ['pdf', 'jpg', 'png', 'md', 'txt'] },
  { id: 'player', name: 'Relic Player', icon: 'play', runtime: 'relic', version: '1.0', publisher: 'Relic', permissions: ['media', 'devices'], supportedDevices: everywhere, installed: true, system: true, category: 'media', sizeMB: 0, defaultSize: { width: 820, height: 520 }, opens: ['mp4', 'mov', 'mp3'] },

  { id: 'windows', name: 'Windows', icon: 'windows', runtime: 'vm', version: 'ReactOS 0.4.15', publisher: 'ReactOS Project (GPL)', permissions: ['files', 'network'], supportedDevices: computers, installed: true, category: 'system', sizeMB: 78, defaultSize: { width: 1040, height: 760 } },
  { id: 'photoshop', name: 'Photoshop', icon: 'image', runtime: 'windows', version: '26.4', publisher: 'Adobe', permissions: ['files', 'gpu', 'network'], supportedDevices: computers, installed: true, category: 'creative', sizeMB: 4200, defaultSize: { width: 1040, height: 640 }, opens: ['psd'] },
  { id: 'autocad', name: 'AutoCAD', icon: 'compass', runtime: 'windows', version: '2027', publisher: 'Autodesk', permissions: ['files', 'gpu', 'network'], supportedDevices: computers, installed: true, category: 'engineering', sizeMB: 6800, defaultSize: { width: 1000, height: 620 }, opens: ['dwg'] },
  { id: 'excel', name: 'Excel', icon: 'table', runtime: 'windows', version: '16.9', publisher: 'Microsoft', permissions: ['files', 'network'], supportedDevices: computers, installed: true, category: 'productivity', sizeMB: 2100, defaultSize: { width: 980, height: 600 }, opens: ['xlsx', 'csv'] },
  { id: 'revit', name: 'Revit', icon: 'box', runtime: 'windows', version: '2027', publisher: 'Autodesk', permissions: ['files', 'gpu', 'network'], supportedDevices: computers, installed: false, category: 'engineering', sizeMB: 11400, defaultSize: { width: 1040, height: 640 }, opens: ['rvt'] },
  { id: 'chrome', name: 'Chrome', icon: 'chrome', runtime: 'linux', version: '141', publisher: 'Google', permissions: ['network', 'files', 'camera', 'microphone'], supportedDevices: computers, installed: true, category: 'productivity', sizeMB: 380, defaultSize: { width: 980, height: 620 } },
  { id: 'blender', name: 'Blender', icon: 'cube', runtime: 'linux', version: '5.1', publisher: 'Blender Foundation', permissions: ['files', 'gpu'], supportedDevices: computers, installed: true, category: 'creative', sizeMB: 960, defaultSize: { width: 1000, height: 620 }, opens: ['blend', 'obj'] },
  { id: 'vscode', name: 'VS Code', icon: 'code', runtime: 'linux', version: '1.104', publisher: 'Microsoft', permissions: ['files', 'network'], supportedDevices: computers, installed: true, category: 'developer', sizeMB: 420, defaultSize: { width: 980, height: 620 }, opens: ['ts', 'tsx', 'json'] },
  { id: 'spotify', name: 'Spotify', icon: 'music', runtime: 'linux', version: '1.2', publisher: 'Spotify', permissions: ['network', 'media'], supportedDevices: everywhere, installed: true, category: 'media', sizeMB: 310, defaultSize: { width: 900, height: 580 } },
  { id: 'steam', name: 'Steam', icon: 'gamepad', runtime: 'linux', version: '2026.09', publisher: 'Valve', permissions: ['network', 'gpu', 'files'], supportedDevices: ['laptop', 'desktop', 'tv'], installed: true, category: 'games', sizeMB: 1200, defaultSize: { width: 980, height: 600 } },
  { id: 'relic-build', name: 'Relic Build', icon: 'hammer', runtime: 'relic', version: '0.9', publisher: 'Relic', permissions: ['files', 'devices', 'network'], supportedDevices: computers, installed: true, category: 'developer', sizeMB: 180, defaultSize: { width: 980, height: 620 } },
]

export const runtimeLabel: Record<RelicApplication['runtime'], string> = {
  relic: 'RELIC',
  linux: 'LINUX',
  windows: 'WINDOWS APP',
  web: 'WEB',
  vm: 'VIRTUAL MACHINE',
}

export const getApp = (id: string) => appRegistry.find((a) => a.id === id)

export function appForExtension(ext?: string): string | undefined {
  if (!ext) return undefined
  return appRegistry.find((a) => a.opens?.includes(ext.toLowerCase()))?.id
}
