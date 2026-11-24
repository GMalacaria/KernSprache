import { FunctionsHttpError } from '@supabase/supabase-js'
import { blobToBase64 } from '../../lib/audio'
import { supabase } from '../../lib/supabase'
import type { Pronunciation, TutorChatRequest, TutorChatResponse } from './types'

const FALLBACK_ERROR = 'Il tutor non ha risposto. Riprova tra poco.'

/** Reads the Italian message the function puts in `{ error: { message } }`. */
async function errorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body: unknown = await (error.context as Response).json()
      if (
        body && typeof body === 'object' && 'error' in body && body.error && typeof body.error === 'object' &&
        'message' in body.error && typeof body.error.message === 'string'
      ) {
        return body.error.message
      }
    } catch {
      // Not JSON: fall through.
    }
  }
  return FALLBACK_ERROR
}

export async function sendTutorTurn(request: TutorChatRequest): Promise<TutorChatResponse> {
  const { data, error } = await supabase.functions.invoke<TutorChatResponse>('tutor-chat', { body: request })
  if (error) throw new Error(await errorMessage(error))
  if (!data) throw new Error(FALLBACK_ERROR)
  return data
}

/** Sends a recording to the transcribe function and returns the learner's words. */
export async function transcribeAudio(audio: Blob): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ text: string }>('transcribe', {
    body: { audio_base64: await blobToBase64(audio), mime_type: audio.type },
  })
  if (error) throw new Error(await errorMessage(error))
  if (!data?.text) throw new Error(FALLBACK_ERROR)
  return data.text
}

/** Like `transcribeAudio`, plus a pronunciation assessment (null when there was too little to judge). */
export async function transcribeWithPronunciation(
  audio: Blob,
): Promise<{ text: string; pronunciation: Pronunciation | null }> {
  const { data, error } = await supabase.functions.invoke<{ text: string; pronunciation: Pronunciation | null }>(
    'transcribe',
    { body: { audio_base64: await blobToBase64(audio), mime_type: audio.type, assess: true } },
  )
  if (error) throw new Error(await errorMessage(error))
  if (!data?.text) throw new Error(FALLBACK_ERROR)
  return { text: data.text, pronunciation: data.pronunciation ?? null }
}

export async function endSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', sessionId)
  if (error) throw error
}
