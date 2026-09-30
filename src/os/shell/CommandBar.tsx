import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, ArrowUpRight } from 'lucide-react'
import { useOS } from '../runtime/store'
import { relicRuntime } from '../runtime/relicRuntime'
import { classify, routeLabel } from '../../agent/intent'
import { ClaudeTranscript, Suggestions } from '../../apps/claude/ClaudePanel'
import { runtimeLabel } from '../apps/registry'
import { Icon } from '../../ui/Icon'

/**
 * Universal command bar — ASK CLAUDE…
 * One field for everything: native actions, apps, files, devices, questions.
 * Live results come from the runtime (apps + file index); Enter hands the
 * command to the Relic Agent, which routes it.
 */
export function CommandBar() {
  const open = useOS((s) => s.commandOpen)
  return <AnimatePresence>{open && <CommandSurface />}</AnimatePresence>
}

function CommandSurface() {
  const [text, setText] = useState('')
  const busy = useOS((s) => s.agentBusy)
  const messages = useOS((s) => s.messages)
  const close = () => relicRuntime.shell.openCommand(false)
  const q = text.trim()
  const route = q.length > 1 ? classify(q) : null

  const results = useMemo(() => {
    if (q.length < 2) return { apps: [], files: [] }
    const term = q.toLowerCase().replace(/^(open|launch|start|run|find|show|search( for)?)\s+/, '').trim()
    if (term.length < 2) return { apps: [], files: [] }
    return {
      apps: relicRuntime.apps.list().filter((a) => !['viewer', 'player'].includes(a.id) && (a.name.toLowerCase().includes(term) || term.includes(a.name.toLowerCase()))).slice(0, 4),
      files: relicRuntime.files.search(term, { limit: 4 }),
    }
  }, [q])

  const submit = () => {
    if (!q || busy) return
    void relicRuntime.ai.ask(q)
    setText('')
  }

  return (
    <motion.div className="fixed inset-0 z-[9000] flex justify-center bg-void/60 pt-[9vh] backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={close}>
      <motion.div
        initial={{ y: -12, opacity: 0, scale: 0.985 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -8, opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
        className="panel ticks flex max-h-[78vh] w-[min(720px,92vw)] flex-col shadow-[0_40px_120px_rgba(0,0,0,0.8)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b hair-strong px-5">
          <Search size={15} strokeWidth={1.25} className="text-red" />
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
              if (e.key === 'Escape') close()
            }}
            placeholder="ASK CLAUDE…"
            className="h-14 flex-1 bg-transparent text-[16px] tracking-[0.02em] text-bone outline-none placeholder:text-[11px] placeholder:tracking-[0.36em] placeholder:text-smoke"
            aria-label="Ask Claude"
          />
          <span className={`dot ${busy ? 'pulse' : ''}`} />
        </div>
        {route && (
          <div className="flex items-center gap-3 border-b hair px-5 py-2">
            <span className="label-sm text-red">ROUTE · {routeLabel[route.route]}</span>
            <span className="label-sm truncate text-ash">{route.preview}</span>
            <span className="label-sm ml-auto text-smoke">ENTER</span>
          </div>
        )}

        <div className="min-h-0 overflow-y-auto">
          {(results.apps.length > 0 || results.files.length > 0) && (
            <div className="grid grid-cols-2 gap-px border-b hair bg-[var(--line-faint)]">
              <div className="bg-ink p-3">
                <div className="label-sm mb-2 px-2">APPLICATIONS</div>
                {results.apps.map((a) => (
                  <button key={a.id} onClick={() => { void relicRuntime.apps.launch(a.id); close() }} className="flex w-full items-center gap-3 px-2 py-1.5 text-left hover:bg-burgundy/60">
                    <Icon name={a.icon} size={14} className="text-ash" />
                    <span className="flex-1 text-[12px] tracking-[0.06em] text-bone">{a.name}</span>
                    <span className="label-sm">{runtimeLabel[a.runtime]}</span>
                  </button>
                ))}
                {!results.apps.length && <div className="label-sm px-2 py-1 text-soot">NONE</div>}
              </div>
              <div className="bg-ink p-3">
                <div className="label-sm mb-2 px-2">FILES</div>
                {results.files.map((f) => (
                  <button key={f.id} onClick={() => { relicRuntime.files.reveal(f.id); void relicRuntime.files.open(f.id); close() }} className="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-burgundy/60">
                    <span className="flex-1 truncate text-[12px] text-bone">{f.name}</span>
                    <ArrowUpRight size={12} className="text-smoke" />
                  </button>
                ))}
                {!results.files.length && <div className="label-sm px-2 py-1 text-soot">NONE</div>}
              </div>
            </div>
          )}

          {messages.length > 0 && (
            <div className="px-5 py-4">
              <ClaudeTranscript compact limit={4} />
            </div>
          )}
          {messages.length === 0 && q.length < 2 && <Suggestions />}
        </div>
        <div className="flex items-center justify-between border-t hair px-5 py-2">
          <span className="label-sm">CLAUDE · SYSTEM AGENT</span>
          <span className="flex items-center gap-4">
            <button className="label-sm hover:text-bone" onClick={() => { void relicRuntime.apps.launch('claude'); close() }}>
              OPEN CLAUDE
            </button>
            <span className="label-sm text-smoke">ESC</span>
          </span>
        </div>
      </motion.div>
    </motion.div>
  )
}
