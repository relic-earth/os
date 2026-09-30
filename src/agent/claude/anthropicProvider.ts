import type { ClaudeProvider, GatewayRequest, GatewayResponse } from './gateway'

/**
 * Anthropic provider — the production path.
 *
 * The browser never holds an API key. It posts the gateway request to the Relic
 * proxy (`/api/claude`, see server/claude-proxy.example.ts), which calls the
 * Anthropic Messages API with the official SDK and returns the assistant turn.
 * Enable with VITE_CLAUDE_PROVIDER=anthropic (or Settings → Claude).
 */
const ENDPOINT = (import.meta.env.VITE_CLAUDE_PROXY_URL as string | undefined) ?? '/api/claude'

export const anthropicProvider: ClaudeProvider = {
  id: 'anthropic',
  label: 'ANTHROPIC API',
  async complete(req: GatewayRequest): Promise<GatewayResponse> {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        system: `${req.system}\n\n<system_state>\n${JSON.stringify(req.context)}\n</system_state>`,
        messages: req.messages,
        tools: req.tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema })),
      }),
    })
    if (!res.ok) throw new Error(`Claude proxy ${res.status}`)
    const msg = (await res.json()) as { content: GatewayResponse['content']; stop_reason: GatewayResponse['stop_reason'] }
    return { content: msg.content, stop_reason: msg.stop_reason, provider: 'anthropic' }
  },
}
