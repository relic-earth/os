import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, Folder, FileText, ChevronRight, Trash2, Clock } from 'lucide-react'
import { useOS } from '../../os/runtime/store'
import { relicRuntime } from '../../os/runtime/relicRuntime'
import { fmtAgo, fmtSize } from '../../os/files/service'
import { appForExtension, getApp } from '../../os/apps/registry'
import { ROOT_FOLDERS } from '../../os/files/fs.mock'
import type { RelicFile } from '../../sdk/types'
import { DocPreview } from '../viewer/DocPreview'

const kindLabel = (f: RelicFile) => (f.kind === 'folder' ? 'FOLDER' : (f.ext ?? '').toUpperCase())

/** RELIC FILES — file manager over relicRuntime.files. */
export function FileManager({ compact }: { compact?: boolean }) {
  const view = useOS((s) => s.filesView)
  const all = useOS((s) => s.files)
  const recentIds = useOS((s) => s.memory.recentFiles)
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [dest, setDest] = useState<{ id: string; op: 'move' | 'copy' } | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const folder = relicRuntime.files.get(view.folder)
  const list = useMemo(() => {
    if (view.query.trim()) return relicRuntime.files.search(view.query)
    if (view.folder === 'recent') return relicRuntime.files.recent(12)
    return relicRuntime.files.children(view.folder)
  }, [view.folder, view.query, all, recentIds])

  const selected = view.selectedId ? relicRuntime.files.get(view.selectedId) : undefined
  const preview = selected && selected.kind === 'file' ? selected : undefined

  const crumbs: RelicFile[] = []
  let cur = folder
  while (cur && cur.parent) {
    crumbs.unshift(cur)
    cur = relicRuntime.files.get(cur.parent)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!rootRef.current?.contains(document.activeElement) && document.activeElement !== document.body) return
      if (!view.selectedId || renaming) return
      if (e.key === 'F2') setRenaming(view.selectedId)
      if (e.key === 'Delete' || (e.key === 'Backspace' && e.metaKey)) relicRuntime.files.remove(view.selectedId)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view.selectedId, renaming])

  const open = (f: RelicFile) => void relicRuntime.files.open(f.id)

  return (
    <div ref={rootRef} className="relative flex h-full" onClick={() => setMenu(null)}>
      {/* places */}
      {!compact && (
        <aside className="well w-[190px] shrink-0 space-y-0.5 border-r hair px-2 py-3">
          <div className="label-sm px-3 pb-2 pt-1">PLACES</div>
          {[{ id: 'recent', name: 'Recent' }, ...ROOT_FOLDERS.map((id) => ({ id, name: relicRuntime.files.get(id)!.name }))].map((p) => {
            const active = view.folder === p.id && !view.query
            return (
              <button
                key={p.id}
                onClick={() => relicRuntime.files.setView({ folder: p.id, query: '', selectedId: undefined })}
                onDragOver={(e) => p.id !== 'recent' && e.preventDefault()}
                onDrop={(e) => {
                  const id = e.dataTransfer.getData('text/relic-file')
                  if (id && p.id !== 'recent') relicRuntime.files.move(id, p.id)
                }}
                className={`hud-target scan-hover flex h-8 w-full items-center gap-2.5 rounded-[2px] px-3 text-left ${active ? 'lit is-active' : 'hover:bg-white/[0.05]'}`}
              >
                {p.id === 'recent' ? <Clock size={12} strokeWidth={1.25} className={active ? 'text-signal' : 'text-smoke'} /> : <Folder size={12} strokeWidth={1.25} className={active ? 'text-signal' : 'text-smoke'} />}
                <span className={`text-[11px] tracking-[0.15em] font-semibold ${active ? 'text-white' : 'text-smoke'}`}>{p.name.toUpperCase()}</span>
              </button>
            )
          })}
          <button
            onClick={() => relicRuntime.files.setView({ folder: 'trash', query: '', selectedId: undefined })}
            className={`relative !mt-3 flex h-8 w-full items-center gap-2.5 rounded-[2px] px-3 text-left ${view.folder === 'trash' ? 'lit' : 'hover:bg-white/[0.05]'}`}
          >
            <Trash2 size={12} strokeWidth={1.25} className="text-smoke" />
            <span className="text-[11px] tracking-[0.13em] font-semibold text-ash">TRASH</span>
          </button>
          <div className="mx-4 mt-4 border-t hair pt-3">
            <div className="label-sm">STORAGE</div>
            <div className="bar mt-2"><i style={{ width: '60%' }} /></div>
            <div className="label-sm mt-1.5 text-soot">1.21 / 2 TB · ENCRYPTED</div>
          </div>
        </aside>
      )}

      {/* listing */}
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b hair px-4 py-2">
          <div className="flex min-w-0 flex-1 items-center gap-1 text-[11px] tracking-[0.11em] font-semibold text-ash">
            {view.query ? (
              <span className="text-bone">SEARCH · “{view.query.toUpperCase()}”</span>
            ) : view.folder === 'recent' ? (
              <span className="text-bone">RECENT</span>
            ) : (
              crumbs.map((c, i) => (
                <span key={c.id} className="flex items-center gap-1 truncate">
                  {i > 0 && <ChevronRight size={11} className="text-soot" />}
                  <button className={i === crumbs.length - 1 ? 'text-[20px] tracking-[0.12em] text-bone' : 'hover:text-bone'} onClick={() => relicRuntime.files.setView({ folder: c.id, selectedId: undefined })}>
                    {c.name.toUpperCase()}
                  </button>
                </span>
              ))
            )}
          </div>
          <div className="relative w-[220px]">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-smoke" />
            <input
              value={view.query}
              onChange={(e) => relicRuntime.files.setView({ query: e.target.value })}
              placeholder="SEARCH FILES"
              className="field h-7 w-full pl-8"
              aria-label="Search files"
            />
          </div>
        </div>
        <div className="grid grid-cols-[1fr_90px_80px_110px] gap-3 border-b hair-faint px-4 py-1.5">
          {['NAME', 'KIND', 'SIZE', 'MODIFIED'].map((h) => (
            <span key={h} className="label-sm">{h}</span>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          {list.length === 0 && <div className="label-sm py-10 text-center text-soot">{view.query ? 'NO MATCHES' : 'EMPTY'}</div>}
          {list.map((f) => {
            const sel = f.id === view.selectedId
            return (
              <div
                key={f.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/relic-file', f.id)}
                onClick={(e) => {
                  e.stopPropagation()
                  relicRuntime.files.setView({ selectedId: f.id })
                }}
                onDoubleClick={() => open(f)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  relicRuntime.files.setView({ selectedId: f.id })
                  const r = rootRef.current!.getBoundingClientRect()
                  setMenu({ id: f.id, x: e.clientX - r.left, y: e.clientY - r.top })
                }}
                className={`relative grid cursor-default grid-cols-[1fr_90px_80px_110px] items-center gap-3 px-4 py-[7px] ${sel ? 'lit' : 'hover:bg-burgundy/30'}`}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  {f.kind === 'folder' ? <Folder size={13} strokeWidth={1.25} className="shrink-0 text-red" /> : <FileText size={13} strokeWidth={1.25} className="shrink-0 text-smoke" />}
                  {renaming === f.id ? (
                    <input
                      autoFocus
                      defaultValue={f.name}
                      className="field h-6 flex-1"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          relicRuntime.files.rename(f.id, (e.target as HTMLInputElement).value)
                          setRenaming(null)
                        }
                        if (e.key === 'Escape') setRenaming(null)
                      }}
                      onBlur={(e) => {
                        relicRuntime.files.rename(f.id, e.target.value)
                        setRenaming(null)
                      }}
                    />
                  ) : (
                    <span className={`truncate text-[12px] tracking-[0.02em] ${sel ? 'text-bone' : 'text-bone/85'}`}>{f.name}</span>
                  )}
                  {view.query && <span className="label-sm truncate text-soot">{relicRuntime.files.path(f.parent ?? 'root')}</span>}
                </span>
                <span className="label-sm">{kindLabel(f)}</span>
                <span className="num text-[11px] text-smoke">{f.kind === 'folder' ? `${relicRuntime.files.children(f.id).length} ITEMS` : fmtSize(f.size)}</span>
                <span className="label-sm">{fmtAgo(f.modified)}</span>
              </div>
            )
          })}
        </div>
        <div className="flex items-center justify-between gap-4 border-t hair px-4 py-1.5">
          <span className="label-sm shrink-0 whitespace-nowrap">{list.length} ITEMS</span>
          <span className="label-sm truncate text-soot">DOUBLE-CLICK OPEN · F2 RENAME · DEL TRASH · RIGHT-CLICK MORE</span>
        </div>
      </section>

      {/* preview / metadata */}
      {!compact && (
        <aside className="w-[260px] shrink-0 overflow-y-auto border-l hair bg-void/40">
          {preview ? (
            <div>
              <div className="relative aspect-[4/3] border-b hair bg-ink">
                <DocPreview file={preview} />
              </div>
              <div className="p-4">
                <div className="text-[13px] leading-snug text-bone">{preview.name}</div>
                <div className="label-sm mt-1">{kindLabel(preview)} · {fmtSize(preview.size)}</div>
                <div className="mt-4 space-y-2">
                  {[
                    ['LOCATION', relicRuntime.files.path(preview.parent ?? 'root')],
                    ['MODIFIED', fmtAgo(preview.modified)],
                    ['OPENS WITH', (getApp(appForExtension(preview.ext) ?? 'viewer')?.name ?? 'Relic Viewer').toUpperCase()],
                    ...Object.entries(preview.meta ?? {})
                      .filter(([k]) => !['mediaId', 'restoreTo'].includes(k))
                      .map(([k, v]) => [k.toUpperCase(), String(v).toUpperCase()]),
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 border-b hair-faint pb-1.5">
                      <span className="label-sm">{k}</span>
                      <span className="truncate text-right text-[10px] tracking-[0.08em] font-semibold text-bone">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <button className="btn btn-primary flex-1" onClick={() => open(preview)}>OPEN</button>
                  <button className="btn flex-1" onClick={() => setDest({ id: preview.id, op: 'move' })}>MOVE</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
              <Folder size={22} strokeWidth={1} className="text-red/60" />
              <div className="label-sm">{folder?.name.toUpperCase() ?? 'FILES'}</div>
              <div className="label-sm text-soot">SELECT A FILE FOR METADATA</div>
            </div>
          )}
        </aside>
      )}

      {menu && (
        <div className="panel ticks absolute z-30 w-[170px] py-1.5" style={{ left: menu.x, top: menu.y }} onClick={(e) => e.stopPropagation()}>
          {[
            ['OPEN', () => open(relicRuntime.files.get(menu.id)!)],
            ['RENAME', () => setRenaming(menu.id)],
            ['COPY TO…', () => setDest({ id: menu.id, op: 'copy' })],
            ['MOVE TO…', () => setDest({ id: menu.id, op: 'move' })],
            ['GET INFO', () => relicRuntime.files.setView({ selectedId: menu.id })],
            [view.folder === 'trash' ? 'DELETE FOREVER' : 'MOVE TO TRASH', () => relicRuntime.files.remove(menu.id)],
          ].map(([l, fn]) => (
            <button
              key={l as string}
              onClick={() => {
                ;(fn as () => void)()
                setMenu(null)
              }}
              className="block w-full px-3 py-1.5 text-left text-[11px] tracking-[0.11em] font-semibold text-ash hover:bg-burgundy/60 hover:text-bone"
            >
              {l as string}
            </button>
          ))}
        </div>
      )}

      {dest && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-void/70" onClick={() => setDest(null)}>
          <div className="panel ticks w-[280px] p-4" onClick={(e) => e.stopPropagation()}>
            <div className="label text-red">{dest.op === 'move' ? 'MOVE TO' : 'COPY TO'}</div>
            <div className="mt-1 truncate text-[12px] text-bone">{relicRuntime.files.get(dest.id)?.name}</div>
            <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-[2px] border hair bg-[var(--line-faint)]">
              {ROOT_FOLDERS.map((id) => (
                <button
                  key={id}
                  onClick={() => {
                    if (dest.op === 'move') relicRuntime.files.move(dest.id, id)
                    else relicRuntime.files.copy(dest.id, id)
                    setDest(null)
                  }}
                  className="bg-ink px-3 py-2 text-left text-[11px] tracking-[0.11em] font-semibold text-ash hover:bg-burgundy hover:text-bone"
                >
                  {relicRuntime.files.get(id)?.name.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
