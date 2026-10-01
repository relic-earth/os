import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Loader, X } from 'lucide-react'
import { AppIcon } from '../../ui/AppIcon'
import { getOS, useOS } from '../runtime/store'
import { relicRuntime } from '../runtime/relicRuntime'
import { classify, routeLabel } from '../../agent/intent'

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
      className="fixed inset-0 z-[9000] flex flex-col items-center bg-black/40 pt-[20vh] backdrop-blur-[2px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.35 } }}
      transition={{ duration: 0.15 }}
      onMouseDown={close}
    >
      <motion.div
        initial={{ y: -8, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
        className="w-[min(680px,92vw)] overflow-hidden rounded-[24px] border border-[rgba(232,36,43,0.35)] bg-[rgba(22,17,17,0.85)] shadow-[0_30px_90px_rgba(0,0,0,0.75),0_0_70px_rgba(232,36,43,0.25)] backdrop-blur-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="relative flex h-16 items-center gap-3 pl-3 pr-5">
          <AppIcon id="claude" size={40} live />
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
            placeholder={busy ? 'Working…' : 'Ask Claude'}
            spellCheck={false}
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-[22px] font-semibold text-bone caret-[#e8242b] outline-none placeholder:font-semibold placeholder:text-smoke"
            aria-label="Ask Claude"
          />
          <span className="shrink-0 text-[11px] font-semibold tracking-[0.12em] text-smoke">
            {held ? <span className="text-signal">HOLDING</span> : armed > 0 ? 'SENDING' : busy ? 'WORKING' : 'ENTER'}
          </span>
          {/* the second: a line that drains while Relic waits for you to finish typing */}
          <div className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden">
            {held ? (
              <span className="pulse absolute inset-0 bg-signal/70" />
            ) : armed > 0 ? (
              <span key={armed} className="absolute inset-0 origin-left bg-signal" style={{ animation: `drain ${IDLE_MS}ms linear forwards` }} />
            ) : busy ? (
              <span className="sweep" />
            ) : null}
          </div>
        </div>

        {(route || held) && !reply && (
          <div className="border-t border-[var(--line-soft)] px-4 py-2.5 text-[11px] font-semibold tracking-[0.12em] text-smoke">
            {held ? 'RELEASE SPACE TO SEND' : `${routeLabel[route!.route]} · ${route!.preview}`}
          </div>
        )}

        <AnimatePresence>
          {reply && (
            <motion.div key={reply.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="max-h-[50vh] overflow-y-auto border-t border-[var(--line-soft)] px-5 py-4">
              {(!!reply.activity || !!reply.steps?.length) && (
                <div className="mb-3 space-y-1">
                  {reply.activity && <div className="text-[11px] font-semibold tracking-[0.12em] text-signal">{reply.activity.toUpperCase()}</div>}
                  {reply.steps?.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 text-[13px] text-ash">
                      <span className="flex w-3.5 justify-center">
                        {s.state === 'done' && <Check size={12} className="text-signal" strokeWidth={2.5} />}
                        {s.state === 'running' && <Loader size={12} className="animate-spin" />}
                        {s.state === 'waiting' && <span className="dot pulse" />}
                        {s.state === 'failed' && <X size={12} strokeWidth={2.5} />}
                      </span>
                      {s.label}
                    </div>
                  ))}
                </div>
              )}
              {reply.text && (
                <div className="whitespace-pre-wrap text-[16px] leading-[1.6] text-bone">
                  {reply.text}
                  {reply.streaming && <span className="caret" />}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <div className="mt-3 text-[11px] font-semibold tracking-[0.12em] text-smoke/80" onMouseDown={(e) => e.stopPropagation()}>
        RUNS 1 SECOND AFTER YOU STOP · HOLD SPACE TO WAIT · ESC TO CLOSE
      </div>
    </motion.div>
  )
}
