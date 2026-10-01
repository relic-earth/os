import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { ScarabMark } from '../../ui/Brand'

/** The address a phone should open: the LAN dev server when running locally, otherwise this page. */
function defaultUrl() {
  if (__SHARE_URL__) return __SHARE_URL__
  const local = /^(localhost|127\.|\[?::1)/.test(location.hostname)
  if (local && __LAN_URL__) return __LAN_URL__
  return location.href.split('#')[0]
}

/**
 * OPEN ON IPHONE — a QR code for this build. Narrow screens get Relic's phone
 * shell automatically; "Add to Home Screen" runs it full-screen, no browser chrome.
 */
export function OpenOnIPhone() {
  const [url, setUrl] = useState(defaultUrl)
  const [svg, setSvg] = useState('')
  const local = !__SHARE_URL__ && /^(localhost|127\.)/.test(location.hostname)

  useEffect(() => {
    let live = true
    QRCode.toString(url || ' ', { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#f5f0eb', light: '#00000000' } })
      .then((s) => live && setSvg(s))
      .catch(() => live && setSvg(''))
    return () => {
      live = false
    }
  }, [url])

  return (
    <div>
      <div className="mb-6">
        <div className="text-[22px] font-semibold tracking-[0.14em] text-bone">OPEN ON IPHONE</div>
        <div className="mt-2 text-[14px] text-ash">Point the iPhone camera at the code. Relic opens in its phone shell.</div>
      </div>
      <div className="grid grid-cols-[auto_1fr] items-start gap-10">
        <div className="relative rounded-[28px] border border-[rgba(245,240,235,0.12)] bg-[radial-gradient(circle_at_50%_0%,rgba(232,36,43,0.18),transparent_70%),#0b0909] p-7 shadow-[0_0_50px_rgba(232,36,43,0.22)]">
          <div className="relative h-[220px] w-[220px] [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} aria-label={`QR code for ${url}`} role="img" />
          <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[14px] bg-[#0b0909] shadow-[0_0_0_4px_#0b0909]">
            <ScarabMark size={30} glow className="text-signal" />
          </span>
        </div>
        <div className="max-w-[420px] space-y-5">
          <label className="block">
            <span className="label">ADDRESS</span>
            <input className="field mt-2 w-full font-mono text-[13px]" value={url} onChange={(e) => setUrl(e.target.value)} spellCheck={false} />
          </label>
          {local && !__LAN_URL__ && <div className="text-[13px] text-signal">No network address found — run the dev server on a machine on your Wi-Fi.</div>}
          <ol className="space-y-3 text-[14px] leading-relaxed text-bone">
            <Step n={1}>{local ? 'Put the iPhone on the same Wi-Fi as this computer.' : 'Scan the code with the iPhone camera.'}</Step>
            <Step n={2}>{local ? 'Scan the code with the camera and tap the link.' : 'Tap the link — Safari opens Relic in its phone shell.'}</Step>
            <Step n={3}>In Safari, tap Share → Add to Home Screen. The scarab lands on your home screen and Relic runs full-screen.</Step>
          </ol>
          <div className="text-[12px] leading-relaxed text-smoke">Any screen narrower than 700 points renders the phone shell. On a computer, Devices → Relic Phone shows it in a frame.</div>
        </div>
      </div>
    </div>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-red text-[12px] font-bold text-white shadow-[0_0_14px_rgba(232,36,43,0.6)]">{n}</span>
      <span>{children}</span>
    </li>
  )
}
