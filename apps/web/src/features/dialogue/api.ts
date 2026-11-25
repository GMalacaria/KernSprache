import { i18n } from '../../i18n'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { blobToBase64 } from '../../lib/audio'
import { supabase } from '../../lib/supabase'
import type { Pronunciation, TutorChatRequest, TutorChatResponse } from './types'

const fallbackError = () => i18n.t('errors.tutorNoReply')

/** Reads the Italian message the function puts in `{ error: { message } }`. */
export async function errorMessage(error: unknown, fallback = fallbackError()): Promise<string> {
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
  return fallback
}

export async function sendTutorTurn(request: TutorChatRequest): Promise<TutorChatResponse> {
  const { data, error } = await supabase.functions.invoke<TutorChatResponse>('tutor-chat', { body: request })
  if (error) throw new Error(await errorMessage(error))
  if (!data) throw new Error(fallbackError())
  return data
}

/** Sends a recording to the transcribe function and returns the learner's words. */
export async function transcribeAudio(audio: Blob): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ text: string }>('transcribe', {
    body: { audio_base64: await blobToBase64(audio), mime_type: audio.type },
  })
  if (error) throw new Error(await errorMessage(error))
  if (!data?.text) throw new Error(fallbackError())
  return data.text
}

/** Like `transcribeAudio`, plus a pronunciation assessment (null when there was too little to judge). */
export async function transcribeWithPronunciation(
  audio: Blob,
  /** The sentence the learner was reading aloud: the pronunciation is judged against it. */
  expectedText?: string,
  /** Store the mispronounced words as review cards (dialogue and exercises, not the review itself). */
  saveMistakes = false,
): Promise<{ text: string; pronunciation: Pronunciation | null }> {
  const { data, error } = await supabase.functions.invoke<{ text: string; pronunciation: Pronunciation | null }>(
    'transcribe',
    {
      body: {
        audio_base64: await blobToBase64(audio),
        mime_type: audio.type,
        assess: true,
        ...(expectedText ? { expected_text: expectedText } : {}),
        save_mistakes: saveMistakes,
      },
    },
  )
  if (error) throw new Error(await errorMessage(error))
  if (!data?.text) throw new Error(fallbackError())
  return { text: data.text, pronunciation: data.pronunciation ?? null }
}

export async function endSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', sessionId)
  if (error) throw error
}
