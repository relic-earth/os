import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Loader, X } from 'lucide-react'
import { AppIcon } from '../../ui/AppIcon'
import { getOS, useOS } from '../runtime/store'
import { relicRuntime } from '../runtime/relicRuntime'
import { classify, routeLabel } from '../../agent/intent'
import { windowsOwnsKeyboard } from '../../apps/windows/keyboard'

/**
 * TYPE ANYWHERE
 *
 * Start typing on any screen and the prompt appears with what you typed.
 * One second after you stop, it runs. Hold the spacebar to keep it waiting;
 * release to start the second again. Enter runs at once, Esc dismisses.
 */
const IDLE_MS = 1000
/** time to read the answer before the prompt fades: grows with its length */
const lingerFor = (text: string) => Math.min(12000, 2600 + text.length * 35)

const isTypingTarget = (t: EventTarget | null) => {
  const el = t as HTMLElement | null
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
}

export function CommandBar() {
  const open = useOS((s) => s.commandOpen)
  const [seed, setSeed] = useState('')

  // global listener: a printable key anywhere opens the prompt with that key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = getOS()
      if (!s.booted || s.commandOpen || s.confirm || s.launch) return
      if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return
      if (e.key.length !== 1 || e.key === ' ') return
      if (isTypingTarget(e.target)) return
      if (windowsOwnsKeyboard()) return
      e.preventDefault()
      setSeed(e.key)
      relicRuntime.shell.openCommand(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <AnimatePresence onExitComplete={() => setSeed('')}>
      {open && <Prompt key="prompt" seed={seed} />}
    </AnimatePresence>
  )
}

function Prompt({ seed }: { seed: string }) {
  const [text, setText] = useState(seed)
  const [held, setHeld] = useState(false)
  const heldRef = useRef(false) // read synchronously: the space's own input event fires before state settles
  const [armed, setArmed] = useState(0) // bumps to restart the drain line
  const [turnId, setTurnId] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const busy = useOS((s) => s.agentBusy)
  const messages = useOS((s) => s.messages)
  const reply = turnId ? messages[messages.findIndex((m) => m.id === turnId) + 1] : undefined
  const close = () => relicRuntime.shell.openCommand(false)

  const run = useCallback((value: string) => {
    const q = value.trim()
    if (!q) return
    if (getOS().agentBusy) {
      timer.current = setTimeout(() => run(value), 300)
      return
    }
    void relicRuntime.ai.ask(q)
    const mine = getOS().messages.filter((m) => m.role === 'user' && m.text === q).at(-1)
    setTurnId(mine?.id ?? null)
    setText('')
    setArmed(0)
  }, [])

  const arm = useCallback(
    (value: string) => {
      clearTimeout(timer.current)
      if (!value.trim()) return setArmed(0)
      setArmed((n) => n + 1)
      timer.current = setTimeout(() => run(value), IDLE_MS)
    },
    [run],
  )

  useEffect(() => {
    input.current?.focus({ preventScroll: true })
    const v = input.current?.value ?? ''
    input.current?.setSelectionRange(v.length, v.length)
    if (seed) arm(seed)
    return () => clearTimeout(timer.current)
  }, [seed, arm])

  // fade away once the answer has had time to be read; typing again keeps it open
  useEffect(() => {
    if (!reply || reply.streaming || busy || text) return
    const t = setTimeout(close, lingerFor(reply.text))
    return () => clearTimeout(t)
  }, [reply, busy, text])

  const route = text.trim().length > 2 ? classify(text) : null

  return (
    <motion.div
      className="fixed inset-0 z-[9000] flex flex-col items-center bg-[radial-gradient(ellipse_at_50%_35%,rgb(var(--acc-3)/0.3),rgba(0,0,0,0.72))] pt-[24vh] backdrop-blur-[3px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3, delay: 0.12 } }}
      transition={{ duration: 0.18 }}
      onMouseDown={close}
    >
      <div className="relative w-[min(800px,92vw)]" onMouseDown={(e) => e.stopPropagation()}>
        {/* 1 · the blade ignites across the centre */}
        <motion.div
          className="saber pointer-events-none absolute inset-x-0 top-8 z-10 origin-center"
          initial={{ scaleX: 0, opacity: 1 }}
          animate={{ scaleX: [0, 1, 1], opacity: [1, 1, 0] }}
          exit={{ scaleX: [1, 1, 0], opacity: [0, 1, 1], transition: { duration: 0.32, times: [0, 0.3, 1] } }}
          transition={{ duration: 0.55, times: [0, 0.4, 1], ease: [0.3, 0, 0, 1] }}
        />
        {/* 2 · the panel unfolds out of the blade */}
        <motion.div
          initial={{ clipPath: 'inset(48% 0% 48% 0%)', opacity: 0.6 }}
          animate={{ clipPath: 'inset(0% 0% 0% 0%)', opacity: 1 }}
          exit={{ clipPath: 'inset(48% 0% 48% 0%)', opacity: 0, transition: { duration: 0.22, ease: [0.6, 0, 1, 1] } }}
          transition={{ delay: 0.16, duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
          className="hud-frame holo relative flex flex-col overflow-hidden rounded-[2px] bg-[linear-gradient(180deg,rgb(var(--ink-2)/0.92),rgb(var(--ink-1)/0.94))] shadow-[0_40px_120px_rgba(0,0,0,0.85),0_0_90px_rgb(var(--acc-1)/0.3)] backdrop-blur-2xl"
        >
          <span className="hud-orbit" />
          <span className="hud-corner tl" />
          <span className="hud-corner tr" />
          <span className="hud-corner bl" />
          <span className="hud-corner br" />
          <div className="relative flex h-16 shrink-0 items-center gap-4 pl-3 pr-5">
            <AppIcon id="claude" size={42} live />
            <input
              ref={input}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                if (!heldRef.current) arm(e.target.value)
              }}
              onKeyDown={(e) => {
                if (e.key === ' ') {
                  if (e.repeat) e.preventDefault()
                  else {
                    heldRef.current = true
                    setHeld(true)
                    clearTimeout(timer.current)
                  }
                }
                if (e.key === 'Enter') {
                  clearTimeout(timer.current)
                  run(text)
                }
                if (e.key === 'Escape') close()
              }}
              onKeyUp={(e) => {
                if (e.key === ' ') {
                  heldRef.current = false
                  setHeld(false)
                  arm(e.currentTarget.value)
                }
              }}
              placeholder={busy ? 'WORKING…' : 'COMMAND RELIC'}
              spellCheck={false}
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-[24px] font-semibold tracking-[0.02em] text-bone caret-[rgb(var(--acc))] outline-none placeholder:tracking-[0.24em] placeholder:text-[rgb(var(--gold)/0.55)]"
              aria-label="Ask Claude"
            />
            <span className="hud-chip shrink-0">
              {held ? <span className="text-signal">HOLD</span> : armed > 0 ? 'ARMED' : busy ? <span className="glitch-text" data-text="WORKING">WORKING</span> : 'ENTER ⏎'}
            </span>
            {/* the second: a blade that drains while Relic waits for you to finish */}
            <div className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden">
              {held ? (
                <span className="pulse absolute inset-0 bg-signal/70" />
              ) : armed > 0 ? (
                <span key={armed} className="saber absolute inset-0 origin-left !h-[2px]" style={{ animation: `drain ${IDLE_MS}ms linear forwards` }} />
              ) : busy ? (
                <span className="sweep" />
              ) : null}
            </div>
          </div>

          {(route || held) && !reply && (
            <div className="flex items-center gap-3 border-t border-[rgb(var(--gold)/0.18)] px-5 py-3 text-[11px] font-semibold tracking-[0.2em] text-[rgb(var(--gold-2)/0.8)]">
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-signal" />
              <span className="typewriter" key={held ? 'h' : route!.preview}>{held ? 'RELEASE SPACE TO SEND' : `${routeLabel[route!.route]} · ${route!.preview}`.toUpperCase()}</span>
            </div>
          )}

          <AnimatePresence>
            {reply && (
              <motion.div key={reply.id} initial={{ opacity: 0, filter: 'blur(6px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }} className="max-h-[50vh] overflow-y-auto border-t border-[rgb(var(--gold)/0.18)] px-6 py-5">
                {(!!reply.activity || !!reply.steps?.length) && (
                  <div className="mb-4 space-y-1.5">
                    {reply.activity && <div className="text-[11px] font-semibold tracking-[0.2em] text-signal">{reply.activity.toUpperCase()}</div>}
                    {reply.steps?.map((s, i) => (
                      <motion.div key={s.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="flex items-center gap-2.5 text-[13px] text-ash">
                        <span className="flex w-4 justify-center">
                          {s.state === 'done' && <Check size={13} className="text-signal" strokeWidth={2.5} />}
                          {s.state === 'running' && <Loader size={13} className="animate-spin text-signal" />}
                          {s.state === 'waiting' && <span className="dot pulse" />}
                          {s.state === 'failed' && <X size={13} strokeWidth={2.5} />}
                        </span>
                        {s.label}
                      </motion.div>
                    ))}
                  </div>
                )}
                {reply.text && (
                  <div className="whitespace-pre-wrap text-[17px] leading-[1.6] text-bone">
                    {reply.text}
                    {reply.streaming && <span className="caret" />}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-4 text-[10px] font-semibold tracking-[0.3em] text-[rgb(var(--gold)/0.7)]" onMouseDown={(e) => e.stopPropagation()}>
        RUNS 1s AFTER YOU STOP · HOLD SPACE TO WAIT · ESC TO CLOSE
      </motion.div>
    </motion.div>
  )
}
