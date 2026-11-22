import { GeminiApiError, GoogleGenAI, ThinkingLevel } from '../deps.ts'
import { requireEnv } from '../env.ts'
import { NO_SPEECH_MARKER, TRANSCRIBE_PROMPT } from '../prompts/transcribe.v1.ts'
import { toTokenUsage } from './gemini.ts'
import { AiError, type TokenUsage } from './types.ts'

export interface AudioInput {
  /** Base64-encoded audio bytes. */
  data: string
  mimeType: string
}

export interface Transcript {
  /** Empty when the recording contains no intelligible speech. */
  text: string
  model: string
  usage: TokenUsage
}

export interface Transcriber {
  transcribe(audio: AudioInput): Promise<Transcript>
}

/**
 * Speech-to-text with Gemini (audio understanding). Independent of AI_PROVIDER:
 * Anthropic models do not accept audio input.
 */
export class GeminiTranscriber implements Transcriber {
  constructor(private readonly client: GoogleGenAI = new GoogleGenAI({ apiKey: requireEnv('GEMINI_API_KEY') })) {}

  async transcribe(audio: AudioInput): Promise<Transcript> {
    const model = requireEnv('AI_MODEL_TRANSCRIBE')
    let response
    try {
      response = await this.client.models.generateContent({
        model,
        contents: [{
          role: 'user',
          parts: [{ inlineData: { mimeType: audio.mimeType, data: audio.data } }, { text: TRANSCRIBE_PROMPT }],
        }],
        config: { maxOutputTokens: 1024, thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } },
      })
    } catch (err) {
      if (err instanceof GeminiApiError) {
        console.error(`Gemini API error ${err.status}: ${err.message}`)
        throw new AiError('unavailable', 'Transcription unavailable')
      }
      throw err
    }

    const usage = toTokenUsage(response.usageMetadata)
    if (response.promptFeedback?.blockReason) {
      throw new AiError('refused', `Blocked (${response.promptFeedback.blockReason})`, usage, model)
    }
    return { text: cleanTranscript(response.text), model: response.modelVersion ?? model, usage }
  }
}

/** Trims the model output and maps the "no speech" marker to an empty transcript. */
export function cleanTranscript(raw: string | undefined): string {
  const text = (raw ?? '').trim().replace(/^"(.*)"$/s, '$1').trim()
  return text.toLowerCase() === NO_SPEECH_MARKER ? '' : text
}

let transcriber: Transcriber | undefined

export function getTranscriber(): Transcriber {
  transcriber ??= new GeminiTranscriber()
  return transcriber
}
