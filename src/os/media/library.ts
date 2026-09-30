import type { MediaItem } from '../../sdk/types'

/** Media library (MOCK catalogue — a real build indexes local + licensed media). */
export const mediaLibrary: MediaItem[] = [
  { id: 'episode-iii', title: 'Episode III', subtitle: 'Revenge of the Sith', kind: 'film', duration: 8404, art: 'duel', year: 2005 },
  { id: 'duel-of-the-fates', title: 'Duel of the Fates', subtitle: 'John Williams', kind: 'track', duration: 254, art: 'eclipse' },
  { id: 'battle-heroes', title: 'Battle of the Heroes', subtitle: 'John Williams', kind: 'track', duration: 222, art: 'volcano' },
  { id: 'imperial-march', title: 'The Imperial March', subtitle: 'John Williams', kind: 'track', duration: 181, art: 'spire' },
  { id: 'mustafar', title: 'Mustafar', subtitle: 'Documentary · 2026', kind: 'film', duration: 5820, art: 'volcano', year: 2026 },
  { id: 'the-architect', title: 'The Architect', subtitle: 'Drama · 2025', kind: 'film', duration: 7020, art: 'spire', year: 2025 },
  { id: 'black-horizon', title: 'Black Horizon', subtitle: 'Sci-Fi · 2026', kind: 'film', duration: 7560, art: 'horizon', year: 2026 },
  { id: 'the-signal', title: 'The Signal', subtitle: 'Thriller · 2024', kind: 'film', duration: 6480, art: 'grid', year: 2024 },
  { id: 'coruscant-nights', title: 'Coruscant Nights', subtitle: 'Series · S2', kind: 'series', duration: 3180, art: 'city', year: 2026 },
  { id: 'meridian', title: 'Meridian', subtitle: 'Series · S1', kind: 'series', duration: 2940, art: 'eclipse', year: 2025 },
  { id: 'relic-news', title: 'Relic News', subtitle: 'Live', kind: 'channel', duration: 0, art: 'grid' },
  { id: 'orbital', title: 'Orbital', subtitle: 'Live · Launch Coverage', kind: 'channel', duration: 0, art: 'horizon' },
  { id: 'formula', title: 'Grand Prix', subtitle: 'Live · Qualifying', kind: 'channel', duration: 0, art: 'corridor' },
  { id: 'cinema-noir', title: 'Noir 24', subtitle: 'Live · Classics', kind: 'channel', duration: 0, art: 'city' },
  { id: 'g-ashfall', title: 'Ashfall', subtitle: 'Steam · Proton', kind: 'game', duration: 0, art: 'volcano' },
  { id: 'g-vanguard', title: 'Vanguard', subtitle: 'Relic Native', kind: 'game', duration: 0, art: 'corridor' },
  { id: 'g-obsidian', title: 'Obsidian Protocol', subtitle: 'Steam · Proton', kind: 'game', duration: 0, art: 'spire' },
  { id: 'g-drift', title: 'Drift Theory', subtitle: 'Windows · Wine', kind: 'game', duration: 0, art: 'horizon' },
  { id: 'g-citadel', title: 'Citadel', subtitle: 'Steam · Linux', kind: 'game', duration: 0, art: 'city' },
]

export const getMedia = (id?: string) => mediaLibrary.find((m) => m.id === id)

export function fmtTime(s: number) {
  s = Math.max(0, Math.floor(s))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = h ? String(m).padStart(2, '0') : String(m)
  return (h ? `${h}:` : '') + `${mm}:${String(sec).padStart(2, '0')}`
}
