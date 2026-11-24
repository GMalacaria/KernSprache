import { GeminiApiError, GoogleGenAI, ThinkingLevel } from '../deps.ts'
import { requireEnv } from '../env.ts'
import { PRONUNCIATION_PROMPT } from '../prompts/pronunciation.v1.ts'
import { NO_SPEECH_MARKER, TRANSCRIBE_PROMPT } from '../prompts/transcribe.v1.ts'
import { assessedTranscriptSchema, type Pronunciation } from '../schemas/pronunciation.ts'
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

export interface AssessedTranscript extends Transcript {
  /** Null when the model could not judge (too little speech, or an unusable answer). */
  pronunciation: Pronunciation | null
}

export interface Transcriber {
  transcribe(audio: AudioInput): Promise<Transcript>
  /** Transcript and pronunciation assessment from the same recording, in one model call. */
  assess(audio: AudioInput): Promise<AssessedTranscript>
}

/**
 * Speech-to-text with Gemini (audio understanding). Independent of AI_PROVIDER:
 * Anthropic models do not accept audio input.
 */
export class GeminiTranscriber implements Transcriber {
  constructor(
    private readonly client: GoogleGenAI = new GoogleGenAI({
      apiKey: requireEnv('GEMINI_API_KEY'),
    }),
  ) {}

  async transcribe(audio: AudioInput): Promise<Transcript> {
    const model = requireEnv('AI_MODEL_TRANSCRIBE')
    let response
    try {
      response = await this.client.models.generateContent({
        model,
        contents: [{
          role: 'user',
          parts: [{
            inlineData: { mimeType: audio.mimeType, data: audio.data },
          }, { text: TRANSCRIBE_PROMPT }],
        }],
        config: {
          maxOutputTokens: 1024,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
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
      throw new AiError(
        'refused',
        `Blocked (${response.promptFeedback.blockReason})`,
        usage,
        model,
      )
    }
    return {
      text: cleanTranscript(response.text),
      model: response.modelVersion ?? model,
      usage,
    }
  }

  async assess(audio: AudioInput): Promise<AssessedTranscript> {
    const model = requireEnv('AI_MODEL_TRANSCRIBE')
    let response
    try {
      response = await this.client.models.generateContent({
        model,
        contents: [{
          role: 'user',
          parts: [{
            inlineData: { mimeType: audio.mimeType, data: audio.data },
          }, { text: PRONUNCIATION_PROMPT }],
        }],
        config: {
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
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
      throw new AiError(
        'refused',
        `Blocked (${response.promptFeedback.blockReason})`,
        usage,
        model,
      )
    }
    const parsed = parseAssessment(response.text)
    if (parsed) {
      return { ...parsed, model: response.modelVersion ?? model, usage }
    }

    // Unusable JSON: the learner still gets the transcript, just without a pronunciation score.
    console.error(
      'Unusable pronunciation assessment, falling back to a plain transcript',
    )
    const plain = await this.transcribe(audio)
    return {
      ...plain,
      pronunciation: null,
      usage: addUsage(usage, plain.usage),
    }
  }
}

function addUsage(a: TokenUsage, b: TokenUsage): TokenUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheCreationInputTokens: a.cacheCreationInputTokens +
      b.cacheCreationInputTokens,
    cacheReadInputTokens: a.cacheReadInputTokens + b.cacheReadInputTokens,
  }
}

/** Parses the model's JSON; null when it is not valid. An empty transcript never keeps a score. */
export function parseAssessment(
  raw: string | undefined,
): { text: string; pronunciation: Pronunciation | null } | null {
  let json: unknown
  try {
    json = JSON.parse(
      (raw ?? '').trim().replace(/^```(?:json)?\s*|\s*```$/g, ''),
    )
  } catch {
    return null
  }
  const result = assessedTranscriptSchema.safeParse(json)
  if (!result.success) return null
  const text = cleanTranscript(result.data.transcript)
  return { text, pronunciation: text ? result.data.pronunciation : null }
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
