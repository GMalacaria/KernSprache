import { GeminiApiError, type GeminiContent, GoogleGenAI, ThinkingLevel, z } from '../deps.ts'
import { requireEnv } from '../env.ts'
import { modelForTask } from './models.ts'
import { AiError, type AiProvider, type StructuredRequest, type StructuredResult, type TokenUsage } from './types.ts'

const MAX_ATTEMPTS = 2 // first try + one retry on invalid JSON

// Finish reasons meaning the model or a safety filter declined to answer.
const BLOCKED_FINISH_REASONS = new Set(['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'RECITATION'])

interface GeminiUsage {
  promptTokenCount?: number
  candidatesTokenCount?: number
  thoughtsTokenCount?: number
  cachedContentTokenCount?: number
}

/**
 * Maps Gemini usage onto the shared shape. Gemini counts cached tokens inside
 * promptTokenCount, so they are subtracted to match "uncached input" semantics;
 * thinking tokens are billed as output.
 */
export function toTokenUsage(usage: GeminiUsage | undefined): TokenUsage {
  const prompt = usage?.promptTokenCount ?? 0
  const cached = usage?.cachedContentTokenCount ?? 0
  return {
    inputTokens: Math.max(prompt - cached, 0),
    outputTokens: (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0),
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: cached,
  }
}

function addUsage(total: TokenUsage, usage: TokenUsage): void {
  total.inputTokens += usage.inputTokens
  total.outputTokens += usage.outputTokens
  total.cacheReadInputTokens += usage.cacheReadInputTokens
}

/** JSON Schema for Gemini's responseJsonSchema (drops the `$schema` meta key). */
export function toResponseSchema(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _ignored, ...jsonSchema } = z.toJSONSchema(schema) as Record<string, unknown>
  return jsonSchema
}

export class GeminiProvider implements AiProvider {
  constructor(private readonly client: GoogleGenAI = new GoogleGenAI({ apiKey: requireEnv('GEMINI_API_KEY') })) {}

  async generateStructured<T>(request: StructuredRequest<T>): Promise<StructuredResult<T>> {
    const model = modelForTask(request.task)
    const usage: TokenUsage = { inputTokens: 0, outputTokens: 0, cacheCreationInputTokens: 0, cacheReadInputTokens: 0 }
    const contents: GeminiContent[] = request.messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))
    const responseJsonSchema = toResponseSchema(request.schema)

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let response
      try {
        response = await this.client.models.generateContent({
          model,
          contents,
          config: {
            // Stable prompt first so Gemini's implicit caching can reuse the prefix.
            systemInstruction: { parts: [{ text: request.system }, { text: request.context }] },
            responseMimeType: 'application/json',
            responseJsonSchema,
            maxOutputTokens: request.maxTokens ?? 4096,
            // Short conversational turns: little reasoning keeps latency and cost down.
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        })
      } catch (err) {
        if (err instanceof GeminiApiError) {
          console.error(`Gemini API error ${err.status}: ${err.message}`)
          throw new AiError('unavailable', 'AI provider unavailable', usage, model)
        }
        throw err
      }

      addUsage(usage, toTokenUsage(response.usageMetadata))

      const finishReason = response.candidates?.[0]?.finishReason
      if (response.promptFeedback?.blockReason || (finishReason && BLOCKED_FINISH_REASONS.has(finishReason))) {
        throw new AiError('refused', `Blocked (${response.promptFeedback?.blockReason ?? finishReason})`, usage, model)
      }

      const parsed = request.schema.safeParse(parseJson(response.text))
      if (parsed.success) return { data: parsed.data, model: response.modelVersion ?? model, usage }
      console.warn(`Invalid structured output (attempt ${attempt}, finishReason=${finishReason})`)
    }

    throw new AiError('invalid_output', 'The model returned invalid JSON twice', usage, model)
  }
}

function parseJson(text: string | undefined): unknown {
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}
