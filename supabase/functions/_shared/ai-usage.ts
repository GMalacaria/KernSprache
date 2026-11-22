import type { TokenUsage } from './ai/index.ts'
import { adminClient } from './supabase.ts'

/** Records token usage. Never throws: cost tracking must not break the user flow. */
export async function logAiUsage(entry: {
  userId: string
  functionName: string
  promptVersion: string
  model: string
  usage: TokenUsage
}): Promise<void> {
  const { error } = await adminClient().from('ai_usage').insert({
    user_id: entry.userId,
    function_name: entry.functionName,
    prompt_version: entry.promptVersion,
    model: entry.model,
    input_tokens: entry.usage.inputTokens,
    output_tokens: entry.usage.outputTokens,
    cache_creation_input_tokens: entry.usage.cacheCreationInputTokens,
    cache_read_input_tokens: entry.usage.cacheReadInputTokens,
  })
  if (error) console.error('Failed to log AI usage', error)
}
