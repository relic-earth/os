import { useOS } from '../runtime/store'
import { Art } from '../../ui/Art'

/** Atmospheric layer. Never louder than the interface above it. */
export function Background({ variant }: { variant?: string }) {
  const bg = useOS((s) => s.background)
  const v = variant ?? bg
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-void">
      {v === 'horizon' && (
        <>
          <Art variant="horizon" seed={4} className="absolute inset-0 h-full w-full opacity-80" />
          <Art variant="topo" seed={9} className="absolute inset-0 h-full w-full opacity-40 mix-blend-screen" />
        </>
      )}
      {v === 'volcanic' && <Art variant="volcano" seed={2} className="absolute inset-0 h-full w-full opacity-70" />}
      {v === 'topographic' && <Art variant="topo" seed={5} className="absolute inset-0 h-full w-full opacity-90" />}
      {v === 'architecture' && <Art variant="spire" seed={6} className="absolute inset-0 h-full w-full opacity-60" />}
      {/* vignette + grain */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,transparent_0%,rgba(3,3,3,0.55)_60%,rgba(3,3,3,0.92)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-void to-transparent" />
      <div className="grain" />
    </div>
  )
}
