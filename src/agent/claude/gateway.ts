import type { SystemContext, ToolDefinition } from '../../sdk/types'

/**
 * CLAUDE GATEWAY
 *
 *   UI → Relic Agent → Claude Gateway → provider (Mock Claude today, Anthropic API later)
 *
 * The gateway speaks the Anthropic Messages content-block shape so that a real
 * provider is a transport swap, not a rewrite. The agent owns the tool loop and
 * the permission policy; providers only turn a conversation into the next
 * assistant turn.
 */

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }
  /** opaque blocks (e.g. thinking) must be passed back unchanged */
  | { type: 'thinking' | 'redacted_thinking'; [k: string]: unknown }

export interface GatewayMessage {
  role: 'user' | 'assistant'
  content: ContentBlock[]
}

export interface GatewayRequest {
  system: string
  messages: GatewayMessage[]
  tools: ToolDefinition<never>[]
  context: SystemContext
}

export interface GatewayResponse {
  content: ContentBlock[]
  stop_reason: 'end_turn' | 'tool_use' | 'refusal' | 'max_tokens'
  /** short present-tense status for the execution panel ("Finding your permit plans…") */
  activity?: string
  provider: string
}

export interface ClaudeProvider {
  id: 'mock' | 'anthropic' | 'on-device'
  label: string
  complete(req: GatewayRequest): Promise<GatewayResponse>
}

export class ClaudeGateway {
  private providers = new Map<string, ClaudeProvider>()
  constructor(
    providers: ClaudeProvider[],
    private select: () => { provider: string; cloudAvailable: boolean },
  ) {
    providers.forEach((p) => this.providers.set(p.id, p))
  }

  /** Which provider will serve the next turn. Cloud outage → on-device routing. */
  active(): ClaudeProvider {
    const { provider, cloudAvailable } = this.select()
    if (!cloudAvailable) return this.providers.get('on-device')!
    return this.providers.get(provider) ?? this.providers.get('mock')!
  }

  complete(req: GatewayRequest) {
    return this.active().complete(req)
  }
}

export const SYSTEM_PROMPT = `You are Claude, the system agent of Relic OS — one computer spanning every device the user owns.
You act through the provided tools only. Prefer native Relic tools over computer use.
Never assume a device, file or app exists: use search_files / list_devices first when unsure.
Sensitive and system-level tools will be confirmed by the user; request them plainly.
Be brief. State what you did and the resulting system state.`
