import type { RelicFile } from '../../sdk/types'
import { Art } from '../../ui/Art'
import { PlanSheet } from './PlanSheet'

/** Thumbnail / preview renderer for any file kind. */
export function DocPreview({ file, page = 0 }: { file: RelicFile; page?: number }) {
  const ext = file.ext ?? ''
  if (ext === 'pdf' && /permit|plans|house/i.test(file.name)) return <PlanSheet index={page} rev={String(file.meta?.revision ?? 'C')} />
  if (ext === 'pdf') return <DocPage title={file.name.replace('.pdf', '')} page={page} />
  if (ext === 'psd' || ext === 'rvt') return <Art variant="render" seed={7} className="h-full w-full" />
  if (ext === 'jpg' || ext === 'png') return <Art variant={/foundation/i.test(file.name) ? 'volcano' : 'horizon'} seed={file.name.length} className="h-full w-full" />
  if (ext === 'dwg') return <PlanSheet index={1} />
  if (ext === 'mp4') return <Art variant={/episode/i.test(file.name) ? 'duel' : 'render'} className="h-full w-full" />
  if (ext === 'flac') return <Art variant="eclipse" className="h-full w-full" />
  if (ext === 'xlsx' || ext === 'csv')
    return (
      <div className="grid h-full w-full grid-cols-5 grid-rows-8 gap-px bg-[var(--line-soft)] p-px">
        {Array.from({ length: 40 }).map((_, i) => (
          <div key={i} className={`bg-ink ${i < 5 ? 'bg-oxblood/40' : ''} ${i % 5 === 4 && i > 5 ? 'bg-burgundy/40' : ''}`} />
        ))}
      </div>
    )
  return <DocPage title={file.name} page={page} />
}

function DocPage({ title, page }: { title: string; page: number }) {
  return (
    <svg viewBox="0 0 700 440" className="h-full w-full">
      <rect width="700" height="440" fill="#0b0909" />
      <text x="60" y="80" fill="#ebe5df" fontSize="22" letterSpacing="8">{title.toUpperCase()}</text>
      <line x1="60" y1="98" x2="640" y2="98" stroke="#e8242b" strokeWidth="0.8" />
      {Array.from({ length: 14 }).map((_, i) => (
        <rect key={i} x="60" y={124 + i * 18} width={i % 5 === 4 ? 260 : 560 - ((i * 37) % 90)} height="4" fill="#3b3634" />
      ))}
      <rect x="440" y="130" width="200" height="120" fill="none" stroke="#7d0f14" />
      <path d="M440 250 L500 190 L540 220 L600 160 L640 200" stroke="#e8242b" fill="none" strokeWidth="1" />
      <text x="620" y="420" fill="#6d6561" fontSize="10">{page + 1}</text>
    </svg>
  )
}
