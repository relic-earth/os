import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Loader, X } from 'lucide-react'
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
      className="fixed inset-0 z-[9000] flex flex-col items-center bg-void/90 pt-[30vh] backdrop-blur-[8px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
      transition={{ duration: 0.18 }}
      onMouseDown={close}
    >
      <div className="w-[min(680px,88vw)]" onMouseDown={(e) => e.stopPropagation()}>
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
          placeholder={busy ? '' : 'Ask anything'}
          spellCheck={false}
          autoComplete="off"
          className="w-full bg-transparent text-center text-[clamp(20px,2.4vw,30px)] font-light tracking-[0.02em] text-bone caret-[#e8242b] outline-none placeholder:text-soot"
          aria-label="Ask Claude"
        />

        {/* the second: a hairline that drains while Relic waits for you to finish */}
        <div className="relative mx-auto mt-4 h-px w-full overflow-hidden bg-[var(--line-faint)]">
          {held ? (
            <span className="pulse absolute inset-0 bg-red/70" />
          ) : armed > 0 ? (
            <span key={armed} className="absolute inset-0 origin-center bg-signal shadow-[0_0_10px_rgba(232,36,43,0.8)]" style={{ animation: `drain ${IDLE_MS}ms linear forwards` }} />
          ) : busy ? (
            <span className="sweep" />
          ) : null}
        </div>
        <div className="mt-2 flex h-4 items-center justify-center gap-3">
          {held ? (
            <span className="label-sm text-red">HOLDING · RELEASE TO SEND</span>
          ) : route ? (
            <span className="label-sm text-smoke">{routeLabel[route.route]} · {route.preview}</span>
          ) : null}
        </div>

        <AnimatePresence>
          {reply && (
            <motion.div key={reply.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mx-auto mt-8 max-w-[560px] text-center">
              {(!!reply.activity || !!reply.steps?.length) && (
                <div className="mb-4 inline-flex flex-col items-start gap-1 text-left">
                  {reply.activity && <div className="label-sm mb-1 text-red">{reply.activity}</div>}
                  {reply.steps?.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 text-[11px] tracking-[0.04em] text-ash">
                      <span className="flex w-3 justify-center">
                        {s.state === 'done' && <Check size={10} className="text-signal" strokeWidth={2} />}
                        {s.state === 'running' && <Loader size={10} className="animate-spin" />}
                        {s.state === 'waiting' && <span className="dot pulse" />}
                        {s.state === 'failed' && <X size={10} strokeWidth={2} />}
                      </span>
                      {s.label}
                    </div>
                  ))}
                </div>
              )}
              {reply.text && (
                <div className="whitespace-pre-wrap text-[14px] leading-[1.7] text-bone/85">
                  {reply.text}
                  {reply.streaming && <span className="caret" />}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
