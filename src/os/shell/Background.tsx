import { useEffect, useRef, useState } from 'react'
import { useOS } from '../runtime/store'
import { Art } from '../../ui/Art'
import { CoruscantWindow } from '../../ui/CoruscantWindow'

/**
 * A theme's own wallpaper, if one has been dropped in: public/wallpaper/<theme>.mp4
 * (preferred) or .jpg. Probed once per theme; a dev server answers missing files
 * with index.html, so only a real video/image counts.
 */
const themeArt = new Map<string, Promise<{ src: string; kind: 'video' | 'image' } | null>>()
function findThemeArt(skin: string) {
  if (!themeArt.has(skin))
    themeArt.set(
      skin,
      (async () => {
        for (const [ext, kind] of [['mp4', 'video'], ['jpg', 'image']] as const) {
          try {
            const r = await fetch(`wallpaper/${skin}.${ext}`, { method: 'HEAD' })
            const type = r.headers.get('content-type') ?? ''
            if (r.ok && type.startsWith(kind === 'video' ? 'video/' : 'image/')) return { src: `wallpaper/${skin}.${ext}`, kind }
          } catch {
            /* offline: fall back to the wave */
          }
        }
        return null
      })(),
    )
  return themeArt.get(skin)!
}

/** Atmospheric layer. Never louder than the interface above it. */
export function Background({ variant }: { variant?: string }) {
  const bg = useOS((s) => s.background)
  const v = variant ?? bg
  const skin = useOS((s) => s.skin)
  const [own, setOwn] = useState<{ src: string; kind: 'video' | 'image' } | null>(null)
  useEffect(() => {
    let live = true
    setOwn(null)
    void findThemeArt(skin).then((a) => live && setOwn(a))
    return () => {
      live = false
    }
  }, [skin])
  const video = useRef<HTMLVideoElement>(null)
  // Rams 9 — environmentally friendly: no decoding frames nobody sees
  useEffect(() => {
    const on = () => {
      const el = video.current
      if (!el) return
      if (document.hidden) el.pause()
      else void el.play().catch(() => {})
    }
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [])
  return (
    <div className="pointer-events-none absolute inset-0 overflow-clip bg-void">
      {v === 'wave' && own?.kind === 'video' && (
        // this theme's own wallpaper, already in its colours
        <video ref={video} key={own.src} className="native absolute inset-0 h-full w-full object-cover opacity-85" src={own.src} autoPlay muted loop playsInline preload="auto" />
      )}
      {v === 'wave' && own?.kind === 'image' && <img key={own.src} src={own.src} alt="" className="native absolute inset-0 h-full w-full object-cover opacity-85" />}
      {v === 'wave' && !own && (
        // the Great Wave in red ASCII — a ping-pong loop, re-lit per theme
        <video ref={video} className="absolute inset-0 h-full w-full object-cover opacity-80" src="wallpaper/wave.mp4" poster="wallpaper/wave-poster.jpg" autoPlay muted loop playsInline preload="auto" />
      )}
      {v === 'chancellor' && <CoruscantWindow className="absolute inset-0 h-full w-full opacity-[0.78]" />}
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
      <div className="vignette absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,transparent_0%,rgba(3,3,3,0.55)_60%,rgba(3,3,3,0.92)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-void to-transparent" />
    </div>
  )
}
