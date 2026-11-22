import { AnthropicProvider } from './anthropic.ts'
import { GeminiProvider } from './gemini.ts'
import { requireEnv } from '../env.ts'
import type { AiProvider } from './types.ts'

export * from './types.ts'

let provider: AiProvider | undefined

/** Single entry point; AI_PROVIDER (gemini | anthropic) picks the implementation. */
export function getAiProvider(): AiProvider {
  if (provider) return provider
  const name = requireEnv('AI_PROVIDER')
  switch (name) {
    case 'gemini':
      provider = new GeminiProvider()
      break
    case 'anthropic':
      provider = new AnthropicProvider()
      break
    default:
      throw new Error(`Unknown AI_PROVIDER "${name}" (expected gemini or anthropic)`)
  }
  return provider
}
