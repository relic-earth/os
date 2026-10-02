import {
  Box,
  Car,
  Cloud,
  Code,
  Compass,
  Cuboid,
  File,
  Folder,
  Gamepad2,
  Globe,
  Hammer,
  Image,
  Laptop,
  LayoutGrid,
  Link,
  Monitor,
  MonitorSmartphone,
  MousePointer2,
  Music,
  Play,
  Settings,
  Shield,
  Smartphone,
  Sparkle,
  Table,
  Thermometer,
  Tv,
  House,
  Zap,
  Aperture,
  type LucideIcon,
} from 'lucide-react'

import { Glyph } from './AppIcon'

/**
 * Names that have a drawn Relic glyph (AppIcon.tsx) render that instead of lucide;
 * lucide remains only for small utility marks (link, shield, cloud…).
 */
const relicGlyph: Record<string, string> = {
  sparkle: 'claude',
  folder: 'files',
  globe: 'web',
  grid: 'apps',
  devices: 'devices',
  settings: 'settings',
  file: 'viewer',
  play: 'player',
  music: 'music',
  gamepad: 'games',
  hammer: 'relic-build',
  windows: 'windows',
  image: 'photoshop',
  compass: 'autocad',
  table: 'excel',
  box: 'revit',
  chrome: 'chrome',
  cube: 'blender',
  code: 'vscode',
  tv: 'tv',
  phone: 'phone',
  car: 'car',
  thermostat: 'thermostat',
  thermometer: 'thermostat',
  home: 'home',
  laptop: 'laptop',
  desktop: 'desktop',
}

/** Lucide fallback map. */
const map: Record<string, LucideIcon> = {
  sparkle: Sparkle,
  folder: Folder,
  globe: Globe,
  settings: Settings,
  devices: MonitorSmartphone,
  grid: LayoutGrid,
  file: File,
  play: Play,
  image: Image,
  compass: Compass,
  table: Table,
  box: Box,
  chrome: Aperture,
  cube: Cuboid,
  code: Code,
  music: Music,
  gamepad: Gamepad2,
  hammer: Hammer,
  tv: Tv,
  phone: Smartphone,
  car: Car,
  thermostat: Thermometer,
  thermometer: Thermometer,
  home: House,
  laptop: Laptop,
  desktop: Monitor,
  cloud: Cloud,
  shield: Shield,
  link: Link,
  zap: Zap,
  mouse: MousePointer2,
}

export function Icon({ name, size = 16, className, strokeWidth = 1.25 }: { name?: string; size?: number; className?: string; strokeWidth?: number }) {
  if (name && relicGlyph[name]) return <Glyph id={relicGlyph[name]} size={Math.round(size * 1.25)} className={className} />
  const C = (name && map[name]) || Box
  return <C size={size} strokeWidth={strokeWidth} className={className} />
}

export const deviceIcon: Record<string, string> = {
  laptop: 'laptop',
  desktop: 'desktop',
  tv: 'tv',
  phone: 'phone',
  car: 'car',
  thermostat: 'thermostat',
  home: 'home',
}
