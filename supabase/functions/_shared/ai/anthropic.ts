import { Anthropic, betaZodOutputFormat } from '../deps.ts'
import { modelForTask } from './models.ts'
import { AiError, type AiProvider, type StructuredRequest, type StructuredResult, type TokenUsage } from './types.ts'

const MAX_ATTEMPTS = 2 // first try + one retry on invalid JSON

// Models that accept the server-side refusal fallback (`fallbacks: "default"`).
// Haiku has no server-side fallback, so it is sent without one.
const SERVER_FALLBACK_MODELS = /^claude-(sonnet-5-5|opus-5|fable-5)/

const emptyUsage = (): TokenUsage => ({
  inputTokens: 0,
  outputTokens: 0,
  cacheCreationInputTokens: 0,
  cacheReadInputTokens: 0,
})

function addUsage(total: TokenUsage, usage: Anthropic.Beta.BetaUsage): void {
  total.inputTokens += usage.input_tokens
  total.outputTokens += usage.output_tokens
  total.cacheCreationInputTokens += usage.cache_creation_input_tokens ?? 0
  total.cacheReadInputTokens += usage.cache_read_input_tokens ?? 0
}

export class AnthropicProvider implements AiProvider {
  constructor(private readonly client: Anthropic = new Anthropic()) {}

  async generateStructured<T>(request: StructuredRequest<T>): Promise<StructuredResult<T>> {
    const model = modelForTask(request.task)
    const usage = emptyUsage()

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let response
      try {
        response = await this.client.beta.messages.parse({
          model,
          // On a safety refusal, the API re-runs the request on a fallback model.
          ...(SERVER_FALLBACK_MODELS.test(model)
            ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }
            : {}),
          max_tokens: request.maxTokens ?? 4096,
          // Short, conversational turns: low effort keeps latency and cost down.
          output_config: { effort: 'low', format: betaZodOutputFormat(request.schema) },
          system: [
            // Stable prompt first, marked for caching; volatile context after it.
            { type: 'text', text: request.system, cache_control: { type: 'ephemeral' } },
            { type: 'text', text: request.context },
          ],
          messages: request.messages,
        })
      } catch (err) {
        if (err instanceof Anthropic.APIError) {
          console.error(`Anthropic API error ${err.status}: ${err.message}`)
          throw new AiError('unavailable', 'AI provider unavailable', usage, model)
        }
        // The SDK throws when the returned JSON does not match the schema.
        console.warn(`Structured output parse failed (attempt ${attempt}):`, err)
        continue
      }

      addUsage(usage, response.usage)

      if (response.stop_reason === 'refusal') {
        throw new AiError('refused', 'The model declined to answer', usage, model)
      }

      const parsed = request.schema.safeParse(response.parsed_output)
      // response.model is the model that actually answered (it differs after a fallback).
      if (parsed.success) return { data: parsed.data, model: response.model, usage }
      console.warn(`Invalid structured output (attempt ${attempt}, stop_reason=${response.stop_reason})`)
    }

    throw new AiError('invalid_output', 'The model returned invalid JSON twice', usage, model)
  }
}
