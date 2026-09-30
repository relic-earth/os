import type { RelicFile } from '../../sdk/types'

/**
 * MOCK — seed file system. A real build mounts the user's home directory
 * (btrfs subvolume, encrypted) and indexes it with the Relic file indexer.
 */
const H = 3600_000
const D = 24 * H
const t = Date.now()

const dir = (id: string, name: string, parent: string | null, modified = t - 2 * D): RelicFile => ({
  id,
  name,
  kind: 'folder',
  parent,
  modified,
  created: t - 400 * D,
})

const f = (
  id: string,
  name: string,
  parent: string,
  size: number,
  ageMs: number,
  meta?: RelicFile['meta'],
  tags?: string[],
): RelicFile => ({
  id,
  name,
  kind: 'file',
  parent,
  ext: name.split('.').pop()?.toLowerCase(),
  size,
  modified: t - ageMs,
  created: t - ageMs - 20 * D,
  owner: 'H',
  meta,
  tags,
})

export const ROOT_FOLDERS = ['desktop', 'documents', 'downloads', 'projects', 'photos', 'movies', 'music', 'relic'] as const

export const seedFiles: RelicFile[] = [
  dir('root', 'Home', null),
  dir('desktop', 'Desktop', 'root'),
  dir('documents', 'Documents', 'root'),
  dir('downloads', 'Downloads', 'root'),
  dir('projects', 'Projects', 'root', t - 3 * H),
  dir('photos', 'Photos', 'root'),
  dir('movies', 'Movies', 'root'),
  dir('music', 'Music', 'root'),
  dir('relic', 'Relic', 'root'),
  dir('trash', 'Trash', 'root'),
  dir('proj-house', 'Relic House', 'projects', t - 3 * H),
  dir('proj-os', 'Relic OS', 'projects', t - 1 * D),

  // Relic House project
  f('permit-latest', 'Relic House Permit Plans.pdf', 'proj-house', 18_400_000, 3 * H, { pages: 14, revision: 'C', sheets: 'A0.0 – A6.2', issued: 'PERMIT SET' }, ['permit', 'plans', 'house']),
  f('permit-revb', 'Relic House Permit Plans — Rev B.pdf', 'proj-house', 17_900_000, 19 * D, { pages: 13, revision: 'B', sheets: 'A0.0 – A6.1', issued: 'SUPERSEDED' }, ['permit', 'plans', 'house']),
  f('house-render', 'House Render.psd', 'proj-house', 412_000_000, 2 * D, { dimensions: '8000 × 4500', layers: 38, colour: '16-BIT RGB' }, ['render']),
  f('house-model', 'Relic House.rvt', 'proj-house', 188_000_000, 4 * D, { levels: 3, views: 62 }, ['model']),
  f('house-dwg', 'Site Plan.dwg', 'proj-house', 9_800_000, 6 * D, { units: 'FEET', layouts: 4 }, ['site']),
  f('fin-model', 'Financial Model.xlsx', 'proj-house', 2_300_000, 26 * H, { sheets: 5, rows: 1240 }, ['finance']),

  // Documents
  f('relic-house-pdf', 'Relic House.pdf', 'documents', 24_100_000, 5 * D, { pages: 32, type: 'BROCHURE' }, ['house']),
  f('permit-plans', 'Permit Plans.pdf', 'documents', 11_200_000, 41 * D, { pages: 9, revision: 'A', issued: 'SCHEMATIC' }, ['permit']),
  f('arch-pdf', 'Relic OS Architecture.pdf', 'documents', 6_700_000, 8 * H, { pages: 22, classification: 'INTERNAL' }, ['relic', 'os']),
  f('trip', 'Iceland Itinerary.md', 'documents', 14_000, 9 * D, { words: 1480 }),
  f('contract', 'Builder Agreement.pdf', 'documents', 1_900_000, 12 * D, { pages: 18 }),

  // Relic OS project
  f('os-roadmap', 'Roadmap 2027.md', 'proj-os', 22_000, 1 * D, { words: 2210 }),
  f('os-shell', 'shell.tsx', 'proj-os', 48_000, 5 * H, { lines: 1320 }),
  f('os-deck', 'Relic OS Architecture.pdf', 'proj-os', 6_700_000, 8 * H, { pages: 22 }),

  // Desktop
  f('desk-shot', 'Screenshot 19.02.png', 'desktop', 3_400_000, 5 * H, { dimensions: '3024 × 1964' }),
  f('desk-notes', 'Notes.md', 'desktop', 3_000, 2 * H, { words: 210 }),

  // Downloads
  f('dl-installer', 'RevitSetup.exe', 'downloads', 1_200_000_000, 3 * D, { platform: 'WINDOWS x64' }),
  f('dl-font', 'GillSansNova.zip', 'downloads', 8_100_000, 20 * D),
  f('dl-csv', 'Utility Usage.csv', 'downloads', 190_000, 6 * D, { rows: 4380 }),

  // Photos
  f('ph-1', 'Site Visit 01.jpg', 'photos', 6_100_000, 15 * D, { camera: 'RELIC PHONE', dimensions: '6048 × 4024' }),
  f('ph-2', 'Site Visit 02.jpg', 'photos', 5_900_000, 15 * D, { camera: 'RELIC PHONE', dimensions: '6048 × 4024' }),
  f('ph-3', 'Foundation Pour.jpg', 'photos', 7_300_000, 11 * D, { camera: 'RELIC PHONE', dimensions: '6048 × 4024' }),

  // Movies
  f('mv-ep3', 'Episode III.mp4', 'movies', 38_400_000_000, 60 * D, { duration: '2:20:04', resolution: '4K HDR', mediaId: 'episode-iii' }),
  f('mv-walk', 'House Walkthrough.mp4', 'movies', 2_100_000_000, 3 * D, { duration: '4:12', resolution: '4K' }),

  // Music
  f('mu-duel', 'Duel of the Fates.flac', 'music', 64_000_000, 90 * D, { artist: 'John Williams', length: '4:14', mediaId: 'duel-of-the-fates' }),
  f('mu-battle', 'Battle of the Heroes.flac', 'music', 58_000_000, 90 * D, { artist: 'John Williams', length: '3:42', mediaId: 'battle-heroes' }),

  // Relic
  f('relic-manifest', 'relic.manifest.json', 'relic', 4_000, 1 * D, { schema: 'v1' }),
  f('relic-keys', 'Device Identity.key', 'relic', 1_000, 30 * D, { algorithm: 'ED25519' }),
]
