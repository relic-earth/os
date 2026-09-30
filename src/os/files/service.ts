import type { RelicFile } from '../../sdk/types'
import { appForExtension } from '../apps/registry'
import { getOS, setOS, uid } from '../runtime/store'
import { logEvent, notifications } from '../notifications/service'
import { memory } from '../../agent/memory'
import { apps } from '../apps/service'

/**
 * Relic file service. MOCK backend over the seeded tree in fs.mock.ts.
 * Real build: POSIX home directory + Relic indexer (content + metadata search).
 */
export interface FileService {
  get(id: string): RelicFile | undefined
  children(folderId: string): RelicFile[]
  path(id: string): string
  search(query: string, opts?: { limit?: number }): RelicFile[]
  latest(query: string): RelicFile | undefined
  recent(n?: number): RelicFile[]
  resolveFolder(name: string): RelicFile | undefined
  open(id: string, opts?: { deviceId?: string }): Promise<void>
  reveal(id: string): void
  rename(id: string, name: string): void
  move(id: string, folderId: string): void
  copy(id: string, folderId: string): RelicFile | undefined
  remove(id: string): void
  setView(patch: Partial<ReturnType<typeof getOS>['filesView']>): void
  describe(id: string): string
}

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9. ]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !['my', 'the', 'a', 'an', 'find', 'open', 'show', 'me', 'latest', 'file', 'files', 'newest', 'recent', 'please', 'of', 'for', 'our'].includes(w))

function score(f: RelicFile, terms: string[], path: string) {
  const hay = `${f.name} ${path} ${(f.tags ?? []).join(' ')}`.toLowerCase()
  let sc = 0
  for (const t of terms) {
    const stem = t.replace(/s$/, '')
    if (hay.includes(stem)) sc += f.name.toLowerCase().includes(stem) ? 2 : 1
    else return 0
  }
  return sc
}

export const files: FileService = {
  get: (id) => getOS().files.find((f) => f.id === id),
  children(folderId) {
    return getOS()
      .files.filter((f) => f.parent === folderId)
      .sort((a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'folder' ? -1 : 1))
  },
  path(id) {
    const parts: string[] = []
    let cur = files.get(id)
    while (cur && cur.parent) {
      parts.unshift(cur.name)
      cur = files.get(cur.parent)
    }
    return '/' + parts.join('/')
  },
  search(query, opts = {}) {
    const terms = words(query)
    if (!terms.length) return []
    return getOS()
      .files.filter((f) => f.kind === 'file' && f.parent !== 'trash')
      .map((f) => ({ f, s: score(f, terms, files.path(f.id)) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || b.f.modified - a.f.modified)
      .slice(0, opts.limit ?? 30)
      .map((x) => x.f)
  },
  latest(query) {
    return files.search(query).sort((a, b) => b.modified - a.modified)[0]
  },
  recent(n = 8) {
    const ids = memory.recentFiles(n)
    const fromMemory = ids.map((id) => files.get(id)).filter(Boolean) as RelicFile[]
    const fill = getOS()
      .files.filter((f) => f.kind === 'file' && f.parent !== 'trash' && !ids.includes(f.id))
      .sort((a, b) => b.modified - a.modified)
    return [...fromMemory, ...fill].slice(0, n)
  },
  resolveFolder(name) {
    const q = name.toLowerCase().trim()
    return getOS().files.find((f) => f.kind === 'folder' && f.name.toLowerCase() === q)
  },
  async open(id, opts = {}) {
    const f = files.get(id)
    if (!f) return
    if (f.kind === 'folder') {
      files.setView({ folder: id, selectedId: undefined, query: '' })
      await apps.launch('files', { deviceId: opts.deviceId })
      return
    }
    memory.recordFile(id)
    logEvent('file', `Opened ${f.name}`)
    if (f.meta?.mediaId) {
      await apps.launch('player', { props: { mediaId: String(f.meta.mediaId) }, title: f.name, deviceId: opts.deviceId })
      return
    }
    const appId = appForExtension(f.ext) ?? 'viewer'
    await apps.launch(appId, { props: { fileId: id }, title: appId === 'viewer' || appId === 'player' ? f.name : undefined, deviceId: opts.deviceId })
  },
  reveal(id) {
    const f = files.get(id)
    if (!f) return
    files.setView({ folder: f.parent ?? 'root', selectedId: id, previewId: id, query: '' })
  },
  rename(id, name) {
    const f = files.get(id)
    if (!f || !name.trim()) return
    const ext = f.kind === 'file' && !name.includes('.') && f.ext ? `${name}.${f.ext}` : name
    setOS((s) => ({ files: s.files.map((x) => (x.id === id ? { ...x, name: ext, ext: ext.split('.').pop()?.toLowerCase(), modified: Date.now() } : x)) }))
    logEvent('file', `Renamed ${f.name} → ${ext}`)
  },
  move(id, folderId) {
    const f = files.get(id)
    if (!f || f.id === folderId) return
    setOS((s) => ({ files: s.files.map((x) => (x.id === id ? { ...x, parent: folderId, modified: Date.now() } : x)) }))
    logEvent('file', `Moved ${f.name} → ${files.path(folderId)}`)
  },
  copy(id, folderId) {
    const f = files.get(id)
    if (!f || f.kind === 'folder') return
    const sameFolder = f.parent === folderId
    const name = sameFolder ? f.name.replace(/(\.[^.]+)$/, ' copy$1') : f.name
    const c: RelicFile = { ...f, id: uid('f'), parent: folderId, name, created: Date.now(), modified: Date.now() }
    setOS((s) => ({ files: [...s.files, c] }))
    logEvent('file', `Copied ${f.name} → ${files.path(folderId)}`)
    return c
  },
  remove(id) {
    const f = files.get(id)
    if (!f) return
    if (f.parent === 'trash') {
      setOS((s) => ({ files: s.files.filter((x) => x.id !== id) }))
    } else {
      setOS((s) => ({ files: s.files.map((x) => (x.id === id ? { ...x, parent: 'trash', meta: { ...x.meta, restoreTo: x.parent ?? 'root' } } : x)) }))
    }
    notifications.push({ source: 'RELIC FILES', title: 'MOVED TO TRASH', body: f.name })
    logEvent('file', `Deleted ${f.name}`)
  },
  setView(patch) {
    setOS((s) => ({ filesView: { ...s.filesView, ...patch } }))
  },
  describe(id) {
    const f = files.get(id)
    if (!f) return ''
    return `${f.name} · ${files.path(f.parent ?? 'root')}`
  },
}

export function fmtSize(bytes?: number) {
  if (bytes == null) return '—'
  const u = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let n = bytes
  while (n >= 1000 && i < u.length - 1) {
    n /= 1000
    i++
  }
  return `${n < 10 && i ? n.toFixed(1) : Math.round(n)} ${u[i]}`
}

export function fmtAgo(ts: number) {
  const d = (Date.now() - ts) / 1000
  if (d < 60) return 'JUST NOW'
  if (d < 3600) return `${Math.floor(d / 60)} MIN AGO`
  if (d < 86400) return `${Math.floor(d / 3600)} HR AGO`
  if (d < 86400 * 7) return Math.floor(d / 86400) === 1 ? "YESTERDAY" : `${Math.floor(d / 86400)} DAYS AGO`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
}
