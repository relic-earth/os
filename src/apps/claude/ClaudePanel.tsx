import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, CornerDownLeft, Loader, X, CloudOff } from 'lucide-react'
import { useOS } from '../../os/runtime/store'
import { relicRuntime } from '../../os/runtime/relicRuntime'
import { classify, routeLabel } from '../../agent/intent'
import type { AgentMessage } from '../../sdk/types'

export const SUGGESTIONS = [
  'Find my latest Relic House permit plans',
  'Open Photoshop',
  'Send this to the TV',
  'What devices have a large display?',
  'Set the thermostat to 70',
  'Install a Windows app',
  'Plan my trip',
  'Summarize this document',
]

/** Tool-execution panel: the visible trace of Claude operating the OS. */
export function ExecutionPanel({ m, compact }: { m: AgentMessage; compact?: boolean }) {
  if (!m.activity && !m.steps?.length) return null
  return (
    <div className={`panel-solid ${compact ? 'mt-2 px-3 py-2' : 'mt-3 px-4 py-3'} border-l-2 border-l-red/70`}>
      <div className="flex items-center gap-2">
        <span className="label-sm text-red">CLAUDE</span>
        {m.offline && <span className="label-sm text-ash">· ON-DEVICE</span>}
        {m.streaming && <span className="relative ml-auto h-px w-16 overflow-hidden bg-graphite"><span className="sweep" /></span>}
      </div>
      {m.activity && <div className="mt-1.5 text-[12px] tracking-[0.04em] text-bone/90">{m.activity}</div>}
      <div className="mt-2 space-y-1">
        {m.steps?.map((s) => (
          <motion.div key={s.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-[11px] tracking-[0.06em]">
            <span className="flex w-3 justify-center">
              {s.state === 'done' && <Check size={11} className="text-signal" strokeWidth={2} />}
              {s.state === 'running' && <Loader size={11} className="animate-spin text-ash" strokeWidth={1.5} />}
              {s.state === 'waiting' && <span className="dot pulse" />}
              {s.state === 'failed' && <X size={11} className="text-ash" strokeWidth={2} />}
            </span>
            <span className={s.state === 'failed' ? 'text-smoke line-through' : s.state === 'done' ? 'text-bone/85' : 'text-ash'}>{s.label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function Bubble({ m, compact }: { m: AgentMessage; compact?: boolean }) {
  if (m.role === 'user')
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%]">
          {m.route && <div className="label-sm mb-1 text-right text-smoke">{routeLabel[m.route]}</div>}
          <div className="border border-[var(--line-soft)] bg-oxblood/25 px-3 py-2 text-[13px] leading-relaxed text-bone">{m.text}</div>
        </div>
      </div>
    )
  return (
    <div className="max-w-[92%]">
      <ExecutionPanel m={m} compact={compact} />
      {(m.text || (m.streaming && !m.steps?.length && !m.activity)) && (
        <div className={`${m.steps?.length || m.activity ? 'mt-3' : ''} whitespace-pre-wrap text-[13px] leading-[1.65] tracking-[0.01em] text-bone/90`}>
          {m.text}
          {m.streaming && <span className="caret" />}
        </div>
      )}
    </div>
  )
}

export function ClaudeInput({ autoFocus, onSubmitted, placeholder = 'ASK CLAUDE…', size = 'md' }: { autoFocus?: boolean; onSubmitted?: () => void; placeholder?: string; size?: 'md' | 'lg' }) {
  const [text, setText] = useState('')
  const busy = useOS((s) => s.agentBusy)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (autoFocus) ref.current?.focus({ preventScroll: true })
  }, [autoFocus])
  const preview = text.trim().length > 2 ? classify(text) : null
  const submit = () => {
    if (!text.trim() || busy) return
    void relicRuntime.ai.ask(text)
    setText('')
    onSubmitted?.()
  }
  return (
    <div>
      <div className={`flex items-center gap-3 border bg-void/80 transition-colors ${busy ? 'border-[var(--line-soft)]' : 'border-[var(--line)] focus-within:border-red focus-within:shadow-[var(--glow)]'} ${size === 'lg' ? 'h-12 px-4' : 'h-10 px-3'}`}>
        <span className={`dot ${busy ? 'pulse' : ''}`} />
        <input
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
          }}
          placeholder={placeholder}
          className={`min-w-0 flex-1 bg-transparent text-bone outline-none placeholder:text-smoke placeholder:tracking-[0.3em] ${size === 'lg' ? 'text-[15px]' : 'text-[13px]'} tracking-[0.02em] placeholder:text-[10px]`}
          aria-label="Ask Claude"
        />
        <button onClick={submit} className="text-ash hover:text-bone" aria-label="Send">
          <CornerDownLeft size={14} strokeWidth={1.25} />
        </button>
      </div>
      <div className="mt-1.5 flex h-4 items-center gap-2">
        {preview && (
          <>
            <span className="label-sm text-red">{routeLabel[preview.route]}</span>
            <span className="label-sm truncate text-ash">{preview.preview}</span>
          </>
        )}
      </div>
    </div>
  )
}

export function ClaudeTranscript({ compact, limit }: { compact?: boolean; limit?: number }) {
  const messages = useOS((s) => s.messages)
  const end = useRef<HTMLDivElement>(null)
  const last = messages[messages.length - 1]
  useEffect(() => {
    // scroll only the nearest scrolling ancestor — never the document
    let el = end.current?.parentElement ?? null
    while (el && !(el.scrollHeight > el.clientHeight && /(auto|scroll)/.test(getComputedStyle(el).overflowY))) el = el.parentElement
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, last?.text, last?.steps?.length])
  const list = limit ? messages.slice(-limit) : messages
  return (
    <div className="space-y-4">
      {list.map((m) => (
        <Bubble key={m.id} m={m} compact={compact} />
      ))}
      <div ref={end} />
    </div>
  )
}

export function Suggestions({ onPick, items = SUGGESTIONS }: { onPick?: () => void; items?: string[] }) {
  const busy = useOS((s) => s.agentBusy)
  return (
    <div className="grid grid-cols-1 gap-px bg-[var(--line-faint)] sm:grid-cols-2">
      {items.map((s) => (
        <button
          key={s}
          disabled={busy}
          onClick={() => {
            void relicRuntime.ai.ask(s)
            onPick?.()
          }}
          className="group flex items-center justify-between bg-ink px-4 py-3 text-left transition-colors hover:bg-burgundy disabled:opacity-40"
        >
          <span className="text-[10px] uppercase tracking-[0.26em] text-ash group-hover:text-bone">{s}</span>
          <span className="h-px w-4 bg-red/40 transition-all group-hover:w-6 group-hover:bg-signal" />
        </button>
      ))}
    </div>
  )
}

export function OfflineBadge() {
  const cloud = useOS((s) => s.cloud.status)
  if (cloud === 'connected') return null
  return (
    <span className="label-sm flex items-center gap-1.5 text-ash">
      <CloudOff size={11} strokeWidth={1.25} /> ON-DEVICE ROUTING
    </span>
  )
}
