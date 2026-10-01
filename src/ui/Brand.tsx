/**
 * RELIC brand — the scarab mark and the striped wordmark, exactly as on
 * relic.earth (paths and mask copied from relic-earth/relic: Logo.tsx,
 * public/relic-wordmark-mask.png). Both paint in currentColor.
 */

const MARK_PATHS = [
  // right wing bracket
  'M 200 231.25 L 200 193.75 C 200 183.394531 192.496094 175 183.242188 175 C 176.972656 175 186.882812 188.351562 193.933594 193.75 L 181.25 193.75 L 181.25 231.25 L 193.933594 231.25 C 186.882812 236.648438 176.972656 250 183.242188 250 C 192.496094 250 200 241.605469 200 231.25',
  // left wing bracket
  'M 100 193.75 L 100 231.25 C 100 241.605469 107.503906 250 116.757812 250 C 123.027344 250 113.117188 236.648438 106.066406 231.25 L 118.75 231.25 L 118.75 193.75 L 106.066406 193.75 C 113.117188 188.351562 123.027344 175 116.757812 175 C 107.503906 175 100 183.394531 100 193.75',
  // body
  'M 171.875 193.75 C 171.875 183.394531 162.082031 175 150 175 C 137.917969 175 128.125 183.394531 128.125 193.75 L 128.125 231.25 C 128.125 241.605469 137.917969 250 150 250 C 162.082031 250 171.875 241.605469 171.875 231.25 Z',
  // head
  'M 200 96.875 C 200 124.488281 177.613281 146.875 150 146.875 C 122.386719 146.875 100 124.488281 100 96.875 C 100 69.261719 122.386719 46.875 150 46.875 C 177.613281 46.875 200 69.261719 200 96.875',
]

/** The scarab. Cropped to the mark's own bounds so it sizes like a glyph. */
export function ScarabMark({ className = '', size = 18, glow }: { className?: string; size?: number; glow?: boolean }) {
  return (
    <svg
      viewBox="96 42 108 212"
      height={size}
      width={(size * 108) / 212}
      fill="currentColor"
      fillRule="evenodd"
      className={className}
      style={glow ? { filter: 'drop-shadow(0 0 6px rgba(232,36,43,0.75))' } : undefined}
      role="img"
      aria-label="Relic"
    >
      {MARK_PATHS.map((d) => (
        <path key={d.slice(0, 24)} d={d} />
      ))}
    </svg>
  )
}

/** The striped RELIC letterforms (raster mask over currentColor, never redrawn). */
export function RelicWordmark({ height = 14, className = '', glow }: { height?: number; className?: string; glow?: boolean }) {
  return (
    <span
      role="img"
      aria-label="Relic"
      className={`inline-block bg-current ${className}`}
      style={{
        height,
        aspectRatio: '1317 / 149',
        WebkitMaskImage: 'url(brand/relic-wordmark-mask.png)',
        maskImage: 'url(brand/relic-wordmark-mask.png)',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        filter: glow ? 'drop-shadow(0 0 8px rgba(232,36,43,0.8))' : undefined,
      }}
    />
  )
}

/** Mark above wordmark — the full lockup, for boot and about screens. */
export function RelicLockup({ height = 140, glow }: { height?: number; glow?: boolean }) {
  return (
    <div className="flex flex-col items-center" style={{ gap: height * 0.16 }}>
      <ScarabMark size={height * 0.52} glow={glow} />
      <RelicWordmark height={height * 0.18} glow={glow} />
    </div>
  )
}
