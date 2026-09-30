import { getOS, setOS, type MemoryState } from '../../os/runtime/store'

/**
 * RELIC MEMORY
 *
 * What the system remembers across sessions: recent apps and files, device
 * relationships, active sessions, conversations, preferences and automations.
 *
 * The interface is storage-agnostic. The prototype keeps it in kernel state and
 * persists to localStorage through `LocalStorageBackend`. A production build
 * swaps in a backend over Postgres (structured), object storage (blobs) and a
 * vector index (semantic recall) without changing callers.
 */
export interface MemoryBackend {
  load(): Partial<MemoryState> | null
  save(state: MemoryState): void
}

export interface RelicMemory {
  recordApp(appId: string): void
  recordFile(fileId: string): void
  recordConversation(title: string): void
  setPreference(key: string, value: string): void
  recentApps(n?: number): string[]
  recentFiles(n?: number): string[]
  snapshot(): MemoryState
  forget(): void
}

const KEY = 'relic.memory.v1'

export const LocalStorageBackend: MemoryBackend = {
  load() {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? (JSON.parse(raw) as Partial<MemoryState>) : null
    } catch {
      return null
    }
  },
  save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* storage unavailable — memory stays in-process */
    }
  },
}

function createMemory(backend: MemoryBackend): RelicMemory {
  const persisted = backend.load()
  if (persisted) setOS((s) => ({ memory: { ...s.memory, ...persisted } }))

  const write = (fn: (m: MemoryState) => MemoryState) => {
    const next = fn(getOS().memory)
    setOS({ memory: next })
    backend.save(next)
  }
  const bump = (list: { id: string; at: number }[], id: string) =>
    [{ id, at: Date.now() }, ...list.filter((x) => x.id !== id)].slice(0, 20)

  return {
    recordApp: (id) => write((m) => ({ ...m, recentApps: bump(m.recentApps, id) })),
    recordFile: (id) => write((m) => ({ ...m, recentFiles: bump(m.recentFiles, id) })),
    recordConversation: (title) =>
      write((m) => {
        const today = m.conversations[0]
        if (today && Date.now() - today.at < 30 * 60_000) {
          return { ...m, conversations: [{ ...today, at: Date.now(), turns: today.turns + 1 }, ...m.conversations.slice(1)] }
        }
        return { ...m, conversations: [{ id: `c-${Date.now()}`, title, at: Date.now(), turns: 1 }, ...m.conversations].slice(0, 30) }
      }),
    setPreference: (key, value) => write((m) => ({ ...m, preferences: { ...m.preferences, [key]: value } })),
    recentApps: (n = 6) => getOS().memory.recentApps.slice(0, n).map((x) => x.id),
    recentFiles: (n = 6) => getOS().memory.recentFiles.slice(0, n).map((x) => x.id),
    snapshot: () => getOS().memory,
    forget: () =>
      write((m) => ({ ...m, recentApps: [], recentFiles: [], conversations: [] })),
  }
}

export const memory = createMemory(LocalStorageBackend)
