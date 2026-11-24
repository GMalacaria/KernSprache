import { GeminiApiError, GoogleGenAI } from '../deps.ts'
import { requireEnv } from '../env.ts'
import { toTokenUsage } from './gemini.ts'
import { AiError, type TokenUsage } from './types.ts'

/** Gemini returns raw 16-bit mono PCM at 24 kHz. */
export const TTS_SAMPLE_RATE = 24_000
export const DEFAULT_VOICE = 'Kore'

export interface Speech {
  /** WAV file bytes. */
  wav: Uint8Array
  model: string
  usage: TokenUsage
}

export interface Speaker {
  speak(text: string): Promise<Speech>
}

/** Wraps raw PCM in a minimal WAV container so every browser can play it. */
export function pcmToWav(pcm: Uint8Array, sampleRate = TTS_SAMPLE_RATE): Uint8Array {
  const header = new DataView(new ArrayBuffer(44))
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) header.setUint8(offset + i, text.charCodeAt(i))
  }
  write(0, 'RIFF')
  header.setUint32(4, 36 + pcm.length, true)
  write(8, 'WAVE')
  write(12, 'fmt ')
  header.setUint32(16, 16, true) // fmt chunk size
  header.setUint16(20, 1, true) // PCM
  header.setUint16(22, 1, true) // mono
  header.setUint32(24, sampleRate, true)
  header.setUint32(28, sampleRate * 2, true) // byte rate
  header.setUint16(32, 2, true) // block align
  header.setUint16(34, 16, true) // bits per sample
  write(36, 'data')
  header.setUint32(40, pcm.length, true)
  const wav = new Uint8Array(44 + pcm.length)
  wav.set(new Uint8Array(header.buffer), 0)
  wav.set(pcm, 44)
  return wav
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Cache key: the same voice and sentence always map to the same audio file. */
export async function ttsKey(voice: string, text: string): Promise<string> {
  const data = new TextEncoder().encode(`${voice}\n${text}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Text-to-speech with Gemini. Independent of AI_PROVIDER, like transcription. */
export class GeminiSpeaker implements Speaker {
  // Speech settings (voice) exist only on the beta API: the SDK default (v1) rejects them.
  constructor(
    private readonly client: GoogleGenAI = new GoogleGenAI({
      apiKey: requireEnv('GEMINI_API_KEY'),
      httpOptions: { apiVersion: 'v1beta' },
    }),
  ) {}

  async speak(text: string): Promise<Speech> {
    const model = requireEnv('AI_MODEL_TTS')
    const voiceName = Deno.env.get('AI_TTS_VOICE') || DEFAULT_VOICE
    let response
    try {
      response = await this.client.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
        },
      })
    } catch (err) {
      if (err instanceof GeminiApiError) {
        console.error(`Gemini API error ${err.status}: ${err.message}`)
        throw new AiError('unavailable', 'Speech unavailable')
      }
      throw err
    }

    const usage = toTokenUsage(response.usageMetadata)
    if (response.promptFeedback?.blockReason) {
      throw new AiError('refused', `Blocked (${response.promptFeedback.blockReason})`, usage, model)
    }
    const data = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData?.data
    if (!data) throw new AiError('invalid_output', 'No audio returned', usage, model)
    return { wav: pcmToWav(base64ToBytes(data)), model: response.modelVersion ?? model, usage }
  }
}

let speaker: Speaker | undefined

export function getSpeaker(): Speaker {
  speaker ??= new GeminiSpeaker()
  return speaker
}
