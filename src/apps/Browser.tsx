import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, RotateCw, Lock, Plus, X, Search } from 'lucide-react'
import type { RelicWindow } from '../sdk/types'
import { relicRuntime } from '../os/runtime/relicRuntime'
import { Art } from '../ui/Art'

type Tab = { id: number; history: string[]; index: number }

const normalize = (input: string) => {
  const t = input.trim()
  if (!t) return 'relic://start'
  if (/^relic:\/\//.test(t)) return t
  if (/^https?:\/\//.test(t)) return t
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(t)) return `https://${t}`
  return `relic://search?q=${encodeURIComponent(t)}`
}
const host = (u: string) => u.replace(/^https?:\/\//, '').split('/')[0]
const title = (u: string) => (u === 'relic://start' ? 'NEW TAB' : u.startsWith('relic://search') ? 'SEARCH' : host(u).toUpperCase())

/** Sites that permit framing get an iframe; everything else a simulated page. */
const FRAMEABLE = /(^|\.)wikipedia\.org$|(^|\.)example\.com$/

let nextTab = 1

/** RELIC BROWSER — also serves the Chrome (Linux) surface. */
export function Browser({ win, chrome }: { win: RelicWindow; chrome?: boolean }) {
  const initial = normalize(String(win.props?.url ?? 'relic://start'))
  const [tabs, setTabs] = useState<Tab[]>([{ id: 0, history: [initial], index: 0 }])
  const [active, setActive] = useState(0)
  const tab = tabs.find((t) => t.id === active) ?? tabs[0]
  const url = tab.history[tab.index]
  const [addr, setAddr] = useState(url)
  const [loading, setLoading] = useState(false)

  const nonce = win.props?.nonce
  useEffect(() => {
    if (win.props?.url) go(normalize(String(win.props.url)))
    // navigate whenever Claude sends a new URL
  }, [nonce])
  useEffect(() => setAddr(url === 'relic://start' ? '' : url), [url])

  function go(u: string) {
    setLoading(true)
    setTimeout(() => setLoading(false), 450)
    setTabs((ts) => ts.map((t) => (t.id === tab.id ? { ...t, history: [...t.history.slice(0, t.index + 1), u], index: t.index + 1 } : t)))
  }
  const nav = (d: number) => setTabs((ts) => ts.map((t) => (t.id === tab.id ? { ...t, index: Math.max(0, Math.min(t.history.length - 1, t.index + d)) } : t)))
  const newTab = () => {
    const id = nextTab++
    setTabs((ts) => [...ts, { id, history: ['relic://start'], index: 0 }])
    setActive(id)
  }
  const closeTab = (id: number) => {
    const rest = tabs.filter((t) => t.id !== id)
    if (!rest.length) return
    setTabs(rest)
    if (id === active) setActive(rest[rest.length - 1].id)
  }

  return (
    <div className="flex h-full flex-col bg-void">
      <div className="flex h-8 items-end gap-px border-b hair bg-ink px-2 pt-1">
        {tabs.map((t) => {
          const u = t.history[t.index]
          const on = t.id === tab.id
          return (
            <div key={t.id} onClick={() => setActive(t.id)} className={`group relative flex h-full w-[180px] items-center gap-2 px-3 ${on ? 'bg-coal' : 'hover:bg-coal/60'}`}>
              {on && <span className="absolute inset-x-0 top-0 h-px bg-red" />}
              <span className={`flex-1 truncate text-[10px] tracking-[0.12em] font-semibold ${on ? 'text-bone' : 'text-smoke'}`}>{title(u)}</span>
              {tabs.length > 1 && (
                <button onClick={(e) => { e.stopPropagation(); closeTab(t.id) }} className="text-smoke opacity-0 hover:text-bone group-hover:opacity-100" aria-label="Close tab">
                  <X size={10} />
                </button>
              )}
            </div>
          )
        })}
        <button onClick={newTab} className="mb-1 ml-1 p-1 text-smoke hover:text-bone" aria-label="New tab"><Plus size={12} /></button>
      </div>
      <div className="flex items-center gap-2 border-b hair bg-coal px-3 py-1.5">
        <button onClick={() => nav(-1)} className="text-ash hover:text-bone" aria-label="Back"><ChevronLeft size={15} strokeWidth={1.25} /></button>
        <button onClick={() => nav(1)} className="text-ash hover:text-bone" aria-label="Forward"><ChevronRight size={15} strokeWidth={1.25} /></button>
        <button onClick={() => go(url)} className="text-ash hover:text-bone" aria-label="Reload"><RotateCw size={12} strokeWidth={1.25} /></button>
        <div className="relative flex-1">
          {url.startsWith('https') ? <Lock size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-red" /> : <Search size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-smoke" />}
          <input
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && go(normalize(addr))}
            onFocus={(e) => e.target.select()}
            placeholder="SEARCH OR ENTER ADDRESS"
            className="field h-7 w-full pl-7"
            aria-label="Address"
          />
        </div>
        {chrome && <span className="label-sm">CHROME · LINUX</span>}
      </div>
      <div className="relative h-px">{loading && <div className="sweep" />}</div>
      <div className="relative min-h-0 flex-1 overflow-y-auto">
        <Page url={url} go={go} />
      </div>
    </div>
  )
}

function Page({ url, go }: { url: string; go: (u: string) => void }) {
  if (url === 'relic://start')
    return (
      <div className="relative flex h-full flex-col items-center justify-center">
        <Art variant="topo" className="absolute inset-0 h-full w-full opacity-60" />
        <div className="relative w-[min(520px,90%)]">
          <div className="wordmark text-center text-[22px] text-bone">RELIC</div>
          <input
            autoFocus
            placeholder="SEARCH OR ENTER ADDRESS"
            className="field mt-8 h-10 w-full"
            onKeyDown={(e) => e.key === 'Enter' && go(normalize((e.target as HTMLInputElement).value))}
          />
          <div className="mt-6 grid grid-cols-4 gap-px overflow-hidden rounded-[12px] border hair bg-[var(--line-faint)]">
            {['relic.earth', 'en.wikipedia.org/wiki/Operating_system', 'anthropic.com', 'github.com'].map((s) => (
              <button key={s} onClick={() => go(normalize(s))} className="bg-ink px-3 py-4 text-[10px] tracking-[0.11em] font-semibold text-ash hover:bg-burgundy hover:text-bone">
                {host('https://' + s).replace('en.', '').toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
    )

  if (url.startsWith('relic://search')) {
    const q = decodeURIComponent(url.split('q=')[1] ?? '')
    const local = relicRuntime.files.search(q, { limit: 3 })
    return (
      <div className="mx-auto max-w-[680px] px-6 py-8">
        <div className="label-sm">RESULTS FOR</div>
        <div className="mt-1 text-[20px] font-light text-bone">{q}</div>
        {local.length > 0 && (
          <div className="mt-6 border hair p-4">
            <div className="label-sm text-red">ON THIS COMPUTER</div>
            {local.map((f) => (
              <button key={f.id} onClick={() => void relicRuntime.files.open(f.id)} className="mt-2 block text-left text-[13px] text-bone hover:text-signal">{f.name}</button>
            ))}
          </div>
        )}
        {[
          ['relic.earth', 'Relic — One computer. Every device.', 'Relic is a universal computing environment that runs on laptops, TVs, phones, cars and the home.'],
          ['en.wikipedia.org/wiki/' + encodeURIComponent(q.replace(/ /g, '_')), `${q} — Wikipedia`, `Encyclopedia article about ${q}.`],
          ['anthropic.com', 'Anthropic — Claude', 'Claude is a next-generation AI assistant built by Anthropic.'],
        ].map(([u, t, d]) => (
          <button key={u} onClick={() => go(normalize(u))} className="mt-6 block text-left">
            <div className="label-sm">{host('https://' + u).toUpperCase()}</div>
            <div className="mt-1 text-[15px] text-bone hover:text-signal">{t}</div>
            <div className="mt-1 text-[12px] text-ash">{d}</div>
          </button>
        ))}
      </div>
    )
  }

  const h = host(url)
  if (FRAMEABLE.test(h)) return <iframe title={h} src={url} className="h-full w-full border-0 bg-white" sandbox="allow-scripts allow-same-origin allow-popups" />

  if (/relic\.earth$/.test(h))
    return (
      <div className="relative min-h-full">
        <Art variant="horizon" className="absolute inset-0 h-full w-full opacity-70" />
        <div className="relative px-14 py-16">
          <div className="wordmark text-[14px] text-bone">RELIC</div>
          <div className="mt-24 max-w-[520px] text-[40px] font-light leading-tight tracking-[0.04em] text-bone">One computer.<br />Every device.</div>
          <div className="mt-5 max-w-[420px] text-[13px] leading-relaxed text-ash">Relic is the operating environment for your laptop, TV, phone, car and home — with Claude built in.</div>
          <div className="mt-8 flex gap-3">
            <button className="btn btn-primary">RESERVE</button>
            <button className="btn">ARCHITECTURE</button>
          </div>
        </div>
      </div>
    )

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-10 text-center">
      <div className="label text-red">{h.toUpperCase()}</div>
      <div className="max-w-[420px] text-[12px] leading-relaxed text-ash">This site does not allow embedding inside another page. In a real Relic build the browser engine renders it natively.</div>
      <a className="btn" href={url} target="_blank" rel="noreferrer">OPEN IN HOST BROWSER</a>
    </div>
  )
}
