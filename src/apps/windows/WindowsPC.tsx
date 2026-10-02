import { useEffect, useRef, useState } from 'react'
import { V86 } from 'v86'
import { decompress } from 'fzstd'
import type { RelicWindow } from '../../sdk/types'

/**
 * WINDOWS — a real Windows-compatible PC in a Relic window.
 *
 * v86 (an x86 emulator compiled to WebAssembly) boots the ReactOS 0.4.15
 * Live CD: an open-source operating system that runs Windows programs
 * (.exe) natively. Nothing here is simulated: the BIOS posts, ReactOS boots,
 * and Notepad, WordPad, Paint, the command prompt and Windows freeware run.
 *
 * The CD is served as 1 MiB zstd parts (scripts/reactos.mjs); v86 fetches
 * only the sectors ReactOS reads. Keyboard and mouse go to the guest only
 * while this window is focused.
 */
type Phase = 'checking' | 'missing' | 'restoring' | 'loading' | 'running' | 'error'

/**
 * A snapshot of this exact machine (v86 0.5.469 · 256 MB · ReactOS 0.4.15 Live CD)
 * taken at the desktop. Restoring it skips the 2–4 minute boot; it only fits
 * this emulator build, which is why v86 is pinned in package.json.
 */
const SNAPSHOT = 'windows/reactos-0.4.15-desktop.state.zst'
type Manifest = { version: string; file: string; size: number; chunk: number; packed: number }

// Ctrl+Alt+Del as PS/2 scancodes: press ctrl, alt, del; release del, alt, ctrl
const CTRL_ALT_DEL = [0x1d, 0x38, 0xe0, 0x53, 0xe0, 0xd3, 0xb8, 0x9d]
// Win+R (the Run dialog): press LWin, R; release R, LWin
const WIN_R = [0xe0, 0x5b, 0x13, 0x93, 0xe0, 0xdb]

/** One-click launchers: real ReactOS programs, started through Run. */
const PROGRAMS: [string, string][] = [
  ['Notepad', 'notepad'],
  ['Command Prompt', 'cmd'],
  ['Paint', 'mspaint'],
  ['Explorer', 'explorer'],
  ['WordPad', 'wordpad'],
  ['Minesweeper', 'winmine'],
]

export function WindowsPC({ win }: { win: RelicWindow }) {
  const screen = useRef<HTMLDivElement>(null)
  const emu = useRef<V86 | null>(null)
  const [phase, setPhase] = useState<Phase>('checking')
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [fetched, setFetched] = useState(0)
  const [res, setRes] = useState<[number, number] | null>(null)
  const [error, setError] = useState('')

  // 1 · is the CD image deployed?
  useEffect(() => {
    let live = true
    fetch('reactos/manifest.json')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((m: Manifest) => live && (setManifest(m), setPhase('restoring')))
      .catch(() => live && setPhase('missing'))
    return () => {
      live = false
    }
  }, [])

  // 2 · fetch the desktop snapshot (falls back to a cold boot)
  const state = useRef<ArrayBuffer | null>(null)
  useEffect(() => {
    if (phase !== 'restoring') return
    let live = true
    ;(async () => {
      try {
        const r = await fetch(SNAPSHOT)
        if (!r.ok || !r.body) throw new Error(`HTTP ${r.status}`)
        const total = Number(r.headers.get('content-length')) || 22_600_000
        const reader = r.body.getReader()
        const chunks: Uint8Array[] = []
        let got = 0
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          chunks.push(value)
          got += value.length
          if (live) setFetched(got / total)
        }
        const packed = new Uint8Array(got)
        let o = 0
        for (const c of chunks) (packed.set(c, o), (o += c.length))
        const raw = decompress(packed)
        state.current = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength) as ArrayBuffer
      } catch {
        state.current = null // no snapshot here: boot from the CD
      }
      if (live) setPhase('loading')
    })()
    return () => {
      live = false
    }
  }, [phase])

  // 3 · power on
  useEffect(() => {
    if (phase !== 'loading' || !manifest || !screen.current || emu.current) return
    try {
      const e = new V86({
        wasm_path: 'v86/v86.wasm',
        bios: { url: 'v86/seabios.bin' },
        vga_bios: { url: 'v86/vgabios.bin' },
        memory_size: 256 * 1024 * 1024,
        vga_memory_size: 16 * 1024 * 1024,
        screen_container: screen.current,
        cdrom: { url: `reactos/${manifest.file}`, async: true, size: manifest.size, use_parts: true, fixed_chunk_size: manifest.chunk },
        acpi: false,
        autostart: true,
        ...(state.current ? { initial_state: { buffer: state.current } } : {}),
      })
      emu.current = e
      // automation hook (tests, snapshot tooling): the live emulator for this window
      ;(window as unknown as { __relicPC?: V86 }).__relicPC = e
      e.add_listener('emulator-started', () => setPhase('running'))
      e.add_listener('screen-set-size', ([w, h]) => setRes([w, h]))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setPhase('error')
    }
  }, [phase, manifest])

  // 4 · the guest owns the keyboard and mouse only while this window has focus
  useEffect(() => {
    const e = emu.current
    if (!e || phase !== 'running') return
    e.keyboard_set_enabled(win.focused)
    e.mouse_set_enabled(win.focused)
  }, [win.focused, phase])

  // 5 · power off when the window closes
  useEffect(
    () => () => {
      const e = emu.current
      emu.current = null
      void e?.destroy()
    },
    [],
  )

  const restart = () => emu.current?.restart()
  const cad = () => emu.current?.keyboard_send_scancodes(CTRL_ALT_DEL)
  const lock = () => emu.current?.lock_mouse()
  const run = (exe: string) => {
    const e = emu.current
    if (!e) return
    e.keyboard_send_scancodes(WIN_R)
    // give the Run dialog a moment to take focus before typing into it
    setTimeout(() => emu.current?.keyboard_send_text(`${exe}\n`), 1500)
  }

  return (
    <div className="flex h-full flex-col bg-black" data-capture-keys={phase === 'running' ? 'true' : undefined}>
      {/* the PC's front panel */}
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-[rgb(var(--acc)/0.2)] bg-[rgb(var(--ink-1)/0.9)] px-3 font-mono text-[10px] tracking-[0.08em]">
        <span className={`h-1.5 w-1.5 rotate-45 ${phase === 'running' ? 'bg-signal shadow-[0_0_6px_rgb(var(--acc))]' : 'bg-soot'}`} />
        <span className="text-white">REACTOS {manifest?.version ?? ''}</span>
        <span className="text-smoke">· x86 · 256 MB · v86</span>
        {res && <span className="text-smoke">· {res[0]}×{res[1]}</span>}
        <span className="ml-3 hidden gap-1 lg:flex">
          {PROGRAMS.map(([label, exe]) => (
            <button key={exe} className="btn h-6 px-2 text-[10px]" onClick={() => run(exe)} disabled={phase !== 'running'} title={`Run ${exe}.exe`}>
              {label}
            </button>
          ))}
        </span>
        <span className="ml-auto flex gap-1.5">
          <button className="btn h-6 px-2.5 text-[10px]" onClick={lock} disabled={phase !== 'running'} title="Capture the mouse (Esc releases it)">
            Capture mouse
          </button>
          <button className="btn h-6 px-2.5 text-[10px]" onClick={cad} disabled={phase !== 'running'}>
            Ctrl·Alt·Del
          </button>
          <button className="btn h-6 px-2.5 text-[10px]" onClick={restart} disabled={phase !== 'running'}>
            Reset
          </button>
        </span>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden" onMouseDown={() => phase === 'running' && win.focused && lock()}>
        {/* v86 renders text mode into the div and graphics into the canvas */}
        <div ref={screen} className="v86-screen absolute inset-0 flex items-center justify-center">
          <div className="whitespace-pre font-mono text-[14px] leading-[14px] text-[#c0c0c0]" />
          <canvas className="hidden" />
        </div>

        {phase !== 'running' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/85 p-8 text-center">
            {phase === 'checking' && <div className="label">Checking for the ReactOS disc…</div>}
            {(phase === 'restoring' || phase === 'loading') && (
              <>
                <div className="t-section">{phase === 'restoring' ? 'Restoring the desktop' : 'Powering on'}</div>
                <div className="font-mono text-[12px] text-ash">ReactOS {manifest?.version} · 256 MB · v86</div>
                <div className="bar w-64">
                  <i style={{ width: `${Math.round(fetched * 100)}%` }} />
                </div>
              </>
            )}
            {phase === 'missing' && (
              <>
                <div className="t-section">The ReactOS disc isn't installed here</div>
                <div className="max-w-[460px] text-[13px] leading-relaxed text-ash">
                  On this computer, run <span className="font-mono text-white">npm run reactos</span> once in the Relic folder (downloads the official 85 MB ReactOS Live CD), then reopen Windows.
                </div>
              </>
            )}
            {phase === 'error' && (
              <>
                <div className="t-section text-signal">The PC failed to start</div>
                <div className="font-mono text-[12px] text-ash">{error}</div>
              </>
            )}
          </div>
        )}
        {phase === 'running' && !win.focused && (
          <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 font-mono text-[10px] text-smoke">CLICK TO USE · ESC RELEASES THE MOUSE</div>
        )}
      </div>
    </div>
  )
}

