import { i18n } from '../../i18n'
import { blobToBase64 } from '../../lib/audio'
import { functionErrorMessage } from '../../lib/functionError'
import { supabase } from '../../lib/supabase'
import type { Pronunciation, TutorChatRequest, TutorChatResponse } from './types'

/** Where a judged recording comes from (`pronunciation_results.source`). */
export type PronunciationSource = 'dialogue' | 'repeat' | 'review' | 'test'

const tutorError = () => i18n.t('errors.tutorNoReply')
const transcribeError = () => i18n.t('errors.transcribe')

export async function sendTutorTurn(request: TutorChatRequest): Promise<TutorChatResponse> {
  const { data, error } = await supabase.functions.invoke<TutorChatResponse>('tutor-chat', { body: request })
  if (error) throw new Error(await functionErrorMessage(error, tutorError()))
  if (!data) throw new Error(tutorError())
  return data
}

/** Sends a recording to the transcribe function and returns the learner's words. */
export async function transcribeAudio(audio: Blob): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ text: string }>('transcribe', {
    body: { audio_base64: await blobToBase64(audio), mime_type: audio.type },
  })
  if (error) throw new Error(await functionErrorMessage(error, transcribeError()))
  if (!data?.text) throw new Error(transcribeError())
  return data.text
}

/** Like `transcribeAudio`, plus a pronunciation assessment (null when there was too little to judge). */
export async function transcribeWithPronunciation(
  audio: Blob,
  /** The sentence the learner was reading aloud: the pronunciation is judged against it. */
  expectedText?: string,
  /** Store the mispronounced words as review cards (dialogue and exercises, not the review itself). */
  saveMistakes = false,
  /** Where the recording comes from, saved with the pronunciation result. */
  source?: PronunciationSource,
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
        ...(source ? { source } : {}),
      },
    },
  )
  if (error) throw new Error(await functionErrorMessage(error, transcribeError()))
  if (!data?.text) throw new Error(transcribeError())
  return { text: data.text, pronunciation: data.pronunciation ?? null }
}

export async function endSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .update({ ended_at: new Date().toISOString() })
    .eq('id', sessionId)
  if (error) throw error
}
