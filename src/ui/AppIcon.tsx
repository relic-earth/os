import type { Icon } from '@phosphor-icons/react'
import {
  AppWindow, Car, Cube, Desktop, DeviceMobile, Devices, FilmSlate, FileText, Files, GameController, GearSix,
  GlobeHemisphereWest, House, Laptop, PlayCircle, Sparkle, SquaresFour, Television, Thermometer, Waveform,
} from '@phosphor-icons/react'

/**
 * RELIC ICONS — Phosphor, Light weight: drawn at one stroke, with the
 * restraint of an instrument engraving rather than a toolbar. The active
 * item switches to Duotone, so state reads as light filling the glyph.
 * Third-party apps keep a monogram in the display face.
 */
const glyphs: Record<string, Icon> = {
  claude: Sparkle,
  files: Files,
  web: GlobeHemisphereWest,
  apps: SquaresFour,
  devices: Devices,
  settings: GearSix,
  tv: Television,
  movies: FilmSlate,
  games: GameController,
  music: Waveform,
  player: PlayCircle,
  viewer: FileText,
  windows: AppWindow,
  'relic-build': Cube,
  home: House,
  laptop: Laptop,
  desktop: Desktop,
  phone: DeviceMobile,
  car: Car,
  thermostat: Thermometer,
}

/** Monogram tiles for third-party applications — the app's initials, Relic-lit. */
const monograms: Record<string, string> = {
  photoshop: 'Ps',
  autocad: 'Ac',
  excel: 'Xl',
  revit: 'Rv',
  chrome: 'Ch',
  blender: 'Bl',
  vscode: '{ }',
  spotify: 'Sp',
  steam: 'St',
}

export function Glyph({ id, size = 24, className = '', active }: { id: string; size?: number; className?: string; active?: boolean }) {
  const G = glyphs[id]
  if (G) return <G size={size} weight={active ? 'duotone' : 'light'} className={`ph ${className}`} aria-hidden />
  const m = monograms[id] ?? id.slice(0, 2)
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} className={`ph ${className}`} aria-hidden>
      <text x="24" y="30" textAnchor="middle" fontSize={m.length > 2 ? 14 : 18} fontWeight="300" letterSpacing="1" fill="currentColor" style={{ fontFamily: 'var(--font-display)' }}>
        {m}
      </text>
    </svg>
  )
}

/** App icon tile — a lens of smoked glass with the glyph lit inside. */
export function AppIcon({ id, size = 48, live, active, className = '' }: { id: string; size?: number; live?: boolean; active?: boolean; className?: string }) {
  return (
    <span className={`app-icon ${live ? 'ai-live' : ''} ${active ? 'app-icon-active' : ''} ${className}`} style={{ width: size, height: size, borderRadius: size * 0.3 }}>
      <Glyph id={id} size={size * 0.54} active={active || live} />
    </span>
  )
}
