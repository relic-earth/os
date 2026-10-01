import { useState } from 'react'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'
import type { RelicWindow } from '../../sdk/types'
import { useOS } from '../../os/runtime/store'
import { fmtSize } from '../../os/files/service'
import { DocPreview } from './DocPreview'
import { ContinuityActions } from '../../os/shell/Continuity'

/** RELIC VIEWER — documents and images. */
export function Viewer({ win, tv }: { win: RelicWindow; tv?: boolean }) {
  const file = useOS((s) => s.files.find((f) => f.id === win.props?.fileId))
  const [page, setPage] = useState(0)
  const [zoom, setZoom] = useState(1)
  if (!file) return <div className="label-sm p-8">FILE NOT FOUND</div>
  const pages = Number(file.meta?.pages ?? 1)
  const shown = Math.min(pages, 6)
  return (
    <div className="flex h-full flex-col">
      {!tv && (
        <div className="flex items-center gap-3 border-b hair px-4 py-1.5">
          <span className="label-sm">{(file.ext ?? '').toUpperCase()} · {fmtSize(file.size)}</span>
          {file.meta?.revision && <span className="label-sm text-red">REV {String(file.meta.revision)} · {String(file.meta.issued ?? '')}</span>}
          <div className="ml-auto flex items-center gap-1">
            <button className="p-1 text-ash hover:text-bone" onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))} aria-label="Zoom out"><ZoomOut size={13} strokeWidth={1.25} /></button>
            <span className="num w-10 text-center text-[11px] text-ash">{Math.round(zoom * 100)}%</span>
            <button className="p-1 text-ash hover:text-bone" onClick={() => setZoom((z) => Math.min(2, z + 0.2))} aria-label="Zoom in"><ZoomIn size={13} strokeWidth={1.25} /></button>
          </div>
          {win.sessionId && <ContinuityActions sessionId={win.sessionId} size="sm" />}
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        {pages > 1 && !tv && (
          <div className="w-[120px] shrink-0 space-y-2 overflow-y-auto border-r hair p-2">
            {Array.from({ length: shown }).map((_, i) => (
              <button key={i} onClick={() => setPage(i)} className={`block w-full border ${i === page ? 'border-red shadow-[var(--glow)]' : 'hair-faint'}`}>
                <div className="aspect-[700/440]">
                  <DocPreview file={file} page={i} />
                </div>
                <div className="label-sm py-0.5">{i + 1}</div>
              </button>
            ))}
          </div>
        )}
        <div className="relative flex flex-1 items-center justify-center overflow-auto bg-void p-6">
          <div className="border hair shadow-[0_20px_60px_rgba(0,0,0,0.7)]" style={{ width: `${88 * zoom}%`, maxWidth: 1400 }}>
            <div className="aspect-[700/440]">
              <DocPreview file={file} page={page} />
            </div>
          </div>
          {pages > 1 && (
            <div className="panel absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 px-3 py-1">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} className="text-ash hover:text-bone" aria-label="Previous page"><ChevronLeft size={14} /></button>
              <span className="num text-[11px] tracking-[0.09em] font-semibold text-bone">{page + 1} / {pages}</span>
              <button onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} className="text-ash hover:text-bone" aria-label="Next page"><ChevronRight size={14} /></button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
