import type { z } from '../deps.ts'

/** Kind of work; decides which model is used (see models.ts). */
export type AiTask = 'dialogue' | 'explanation' | 'exercise' | 'correction'

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface StructuredRequest<T> {
  task: AiTask
  /** Stable instructions: cached across calls. Must not contain per-request data. */
  system: string
  /** Per-request learner context, sent after the cached prefix. */
  context: string
  messages: ChatTurn[]
  schema: z.ZodType<T>
  maxTokens?: number
}

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  cacheCreationInputTokens: number
  cacheReadInputTokens: number
}

export interface StructuredResult<T> {
  data: T
  model: string
  /** Summed over all attempts (a retry costs tokens too). */
  usage: TokenUsage
}

export interface AiProvider {
  generateStructured<T>(request: StructuredRequest<T>): Promise<StructuredResult<T>>
}

export type AiErrorCode = 'invalid_output' | 'refused' | 'unavailable'

export class AiError extends Error {
  constructor(
    readonly code: AiErrorCode,
    message: string,
    readonly usage?: TokenUsage,
    readonly model?: string,
  ) {
    super(message)
  }
}
