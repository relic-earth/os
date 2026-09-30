/**
 * Relic Claude proxy — reference server for the production gateway path.
 * NOT used by the prototype (which runs the mock provider). Deploy as a
 * serverless function at /api/claude with ANTHROPIC_API_KEY in its environment.
 *
 *   npm i @anthropic-ai/sdk
 *
 * The Relic Agent in the browser owns the tool loop and permission checks; this
 * endpoint performs exactly one Messages API call per agent step.
 */
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(request: Request): Promise<Response> {
  const { system, messages, tools } = await request.json()
  const response = await client.beta.messages.create({
    model: 'claude-opus-5-5',
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'medium' },
    // server-side fallback on refusal (enabled by default; remove if not wanted)
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system,
    tools,
    messages,
  } as never)
  // content is returned verbatim (including thinking blocks) so the agent can
  // pass it back unchanged on the next step.
  return Response.json({ content: response.content, stop_reason: response.stop_reason })
}
