import { AnthropicProvider } from './anthropic.ts'
import type { AiProvider } from './types.ts'

export * from './types.ts'

let provider: AiProvider | undefined

/** Single entry point; swap the implementation here to change provider. */
export function getAiProvider(): AiProvider {
  provider ??= new AnthropicProvider()
  return provider
}
