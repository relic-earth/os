import { useOS } from '../../os/runtime/store'
import { relicRuntime } from '../../os/runtime/relicRuntime'
import { claudeGateway } from '../../agent/relicAgent'
import { ClaudeInput, ClaudeTranscript, OfflineBadge, Suggestions } from './ClaudePanel'

/** CLAUDE — the system agent as an application. */
export function ClaudeApp() {
  const count = useOS((s) => s.messages.length)
  useOS((s) => s.cloud.status)
  const providerLabel = claudeGateway.active().label
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b hair px-5 py-2.5">
        <div className="flex items-center gap-3">
          <span className="label text-bone">CLAUDE</span>
          <span className="label-sm">SYSTEM AGENT</span>
        </div>
        <div className="flex items-center gap-4">
          <OfflineBadge />
          <span className="label-sm">{providerLabel}</span>
          {count > 0 && (
            <button className="label-sm hover:text-bone" onClick={() => relicRuntime.ai.reset()}>
              NEW
            </button>
          )}
        </div>
      </div>
      <div className="relative flex-1 overflow-y-auto px-6 py-6">
        {count === 0 ? (
          <div className="mx-auto flex h-full max-w-[520px] flex-col justify-center">
            <div className="label text-red">CLAUDE</div>
            <div className="t-title mt-4">How can I help?</div>
            <div className="mt-3 text-[14px] leading-relaxed text-smoke">
              I operate Relic through permissioned tools — files, applications, devices, media and settings.
            </div>
            <div className="mt-7 border hair">
              <Suggestions />
            </div>
          </div>
        ) : (
          <ClaudeTranscript />
        )}
      </div>
      <div className="border-t hair px-5 pb-2 pt-4">
        <ClaudeInput autoFocus />
      </div>
    </div>
  )
}
